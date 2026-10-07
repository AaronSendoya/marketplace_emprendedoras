# Matriz de permisos y contrato para el frontend

Para el equipo del frontend. El contrato completo (esquemas, ejemplos y errores) está en [openapi.json](openapi.json); se regenera con `pnpm openapi:export`. En producción **no hay Swagger**: este archivo y `openapi.json` son la referencia. Reglas de negocio: [CLAUDE.md](../CLAUDE.md), secciones 2 y 3.

## Quién puede hacer qué

| Acción | Visitante | Emprendedor | Admin |
|---|---|---|---|
| Ver el catálogo (perfiles, productos, descuentos vigentes) y las ciudades y rubros | Sí | Sí | Sí |
| Iniciar sesión y recuperar la contraseña por OTP | Sí | Sí | Sí |
| Ver su cuenta, cambiar su correo (con OTP) | No | Sí | Sí |
| Crear, listar, activar y desactivar cuentas | No | No | Sí |
| Crear y editar un perfil | No | Solo el propio | Cualquiera |
| Crear, editar, desactivar y reactivar productos | No | Solo los propios | Cualquiera |
| Crear y editar descuentos; asignarlos a productos y quitarlos | No | Solo los propios | Cualquiera |
| Ver el perfil, los productos y los descuentos de una cuenta Emprendedor por su `usuario_id` (módulo "Emprendimientos" del panel) | No | Solo lo propio (`/mis/*`) | Cualquier cuenta |
| Registrar un clic de contacto (WhatsApp/Instagram) en un perfil | Sí (anónimo) | Sí | Sí |
| Ver las métricas de clics (totales, ranking, serie diaria y por rubro) | No | No | Sí |
| Borrar un perfil, un producto o un descuento | Nadie (no existe; los productos se desactivan y los descuentos se terminan con `fecha_fin`) | | |

Una cuenta desactivada pierde el acceso en su siguiente petición (aunque su token siga vigente) y su perfil y sus productos dejan de mostrarse.

## Rutas

Todas cuelgan de `/api/v1`. `Bearer` = cabecera `Authorization: Bearer <token>`.

| Método y ruta | Acceso | Notas |
|---|---|---|
| `GET /health` | Público | Estado del servicio y de la base |
| `GET /catalogos/ciudades`, `GET /catalogos/rubros` | Público | Sin paginar |
| `GET /perfiles`, `GET /perfiles/{id}` | Público | Filtros `ciudad_id`, `rubro_id`, `q`; solo cuentas activas |
| `GET /marketplace/productos`, `GET /marketplace/productos/{id}` | Público | Filtros `perfil_id`, `ciudad_id`, `rubro_id`, `q`; trae el descuento vigente y el precio con descuento |
| `POST /auth/login` | Público | Devuelve el `token`. 429 con `Retry-After` tras 5 fallos en 15 minutos |
| `POST /auth/password/solicitar-codigo` | Público | Misma respuesta exista o no la cuenta. Máximo 1 por minuto y 5 por hora por correo |
| `POST /auth/password/restablecer` | Público | Código de 6 dígitos (10 minutos, 5 intentos). Cierra las demás sesiones |
| `POST /perfiles/{id}/clics` | Público | Cuerpo `{"tipo": "whatsapp"\|"instagram"}`. Sin dato del visitante (regla 19). `404` si el perfil no existe o está desactivado |
| `GET /auth/me` | Bearer | La cuenta autenticada |
| `POST /auth/email/solicitar-codigo`, `PUT /auth/email` | Bearer | Cambio de correo con OTP enviado al correo nuevo |
| `GET /mis/perfil`, `GET /mis/productos`, `GET /mis/descuentos` | Bearer | Lo propio (con precio real y productos inactivos). Sin perfil: 404 o lista vacía. `GET /mis/descuentos` admite `estado` (`programado`, `vigente` o `vencido`), calculado al consultar (regla 8) |
| `GET /admin/usuarios/{id}`, `GET /admin/usuarios/{id}/perfil`, `GET /admin/usuarios/{id}/productos`, `GET /admin/usuarios/{id}/descuentos` | Admin | Mismo formato que `/mis/*`, pero de cualquier `usuario_id`. `404` si la cuenta o su perfil no existen. `GET /admin/usuarios/{id}/descuentos` admite `estado`, igual que `/mis/descuentos` |
| `POST /perfiles` | Bearer | `multipart/form-data`. Un perfil por usuario (409). Admin indica `usuario_id` |
| `PATCH /perfiles/{id}` | Dueña o Admin | JSON |
| `PUT /perfiles/{id}/foto-perfil`, `PUT /perfiles/{id}/logo` | Dueña o Admin | `multipart/form-data` |
| `POST /productos`, `PUT /productos/{id}/imagen` | Dueña o Admin | `multipart/form-data`; la imagen es obligatoria. Admin indica `perfil_id` |
| `PATCH /productos/{id}`, `DELETE /productos/{id}` | Dueña o Admin | `DELETE` desactiva (204); `PATCH {"activo": true}` reactiva |
| `POST /descuentos`, `PATCH /descuentos/{id}` | Dueña o Admin | Siempre por porcentaje. Admin indica `perfil_id` al crear |
| `POST /descuentos/{id}/productos`, `DELETE /descuentos/{id}/productos/{producto_id}` | Dueña o Admin | Solo productos del mismo perfil (403 si no). Ambas son idempotentes |
| `POST /admin/usuarios`, `GET /admin/usuarios`, `PATCH /admin/usuarios/{id}`, `PATCH /admin/usuarios/{id}/estado`, `PATCH /admin/usuarios/{id}/password` | Admin | Sin caché (`no-store`). Ninguna pide OTP (regla 15) |
| `DELETE /admin/usuarios/{id}` | Admin | Elimina una cuenta de Emprendedor **por completo** (regla 5), de forma irreversible. Solo si está **activa** (409 si está suspendida), nunca una de Admin (403) ni la propia (409). El cuerpo lleva `confirmacion_email` (400 si no coincide). Borra perfil, productos, descuentos, clics, OTP e intentos de acceso, y sus imágenes de R2. Responde 200 con los conteos |
| `POST /admin/importaciones/emprendedoras/analizar`, `POST /admin/importaciones/emprendedoras/validar`, `POST /admin/importaciones/emprendedoras`, `GET /admin/importaciones/emprendedoras/plantilla` | Admin | Regla 22. `analizar` recibe el `.xlsx` (multipart, máx. 2 MB) y `validar` no escriben nada; `POST` crea cuentas y perfiles en tandas de hasta 10 filas y devuelve las contraseñas temporales una sola vez. Sin caché (`no-store`) |
| `GET /admin/metricas/resumen`, `GET /admin/metricas/ranking`, `GET /admin/metricas/serie`, `GET /admin/metricas/por-rubro`, `GET /admin/metricas/mapa-calor` | Admin | Totales, top de cuentas activas, serie diaria (día de La Paz), distribución por rubro y mapa de calor cuenta × intervalo de tiempo (regla 19); las cinco admiten `desde`/`hasta` (`YYYY-MM-DD`, por defecto los últimos 30 días), `ranking` y `mapa-calor` además admiten `limite` (por defecto 10, máximo 20) y `mapa-calor` también `orden` (`total`, `whatsapp` o `instagram`; por defecto `total`) y trae la comparación con el período anterior |

## Convenciones

- **JSON en `snake_case`.** Fechas ISO 8601 en UTC. Las imágenes llegan como URL completa (`foto_perfil_url`, `logo_url`, `imagen_url`); nunca claves.
- **Errores:** siempre `{ "error": { "codigo", "mensaje", "detalles?" } }`. Códigos: `VALIDACION` 400, `NO_AUTENTICADO` 401, `PROHIBIDO` 403, `NO_ENCONTRADO` 404, `CONFLICTO` 409, `ARCHIVO_MUY_GRANDE` 413, `DEMASIADAS_SOLICITUDES` 429, `ERROR_INTERNO` 500.
- **Paginación:** `?pagina=1&limite=20` (máximo 50 por página, página máxima 100.000). Respuesta `{ "datos": [...], "paginacion": { "pagina", "limite", "total" } }`.
- **Precio (regla 7):** si `consultar_precio` es `true`, mostrar "Consultar Precio" hacia el `whatsapp` del negocio; con precio visible y descuento vigente vienen `precio`, `porcentaje` y `precio_con_descuento` ya calculados. El frontend no calcula precios ni vigencia. No conviene guardar el feed en caché por más tiempo del que se tolere de retraso.
- **Fechas de descuentos (regla 8):** `YYYY-MM-DD` (día completo, hora de La Paz), `YYYY-MM-DDTHH:mm[:ss]` (hora de La Paz) o ISO con zona. `null` al editar quita la fecha.
- **Imágenes (regla 16):** JPEG, PNG o WebP de hasta 5 MB; el servidor las convierte a WebP. Las predeterminadas de perfil se piden de forma explícita (`usar_foto_predeterminada`, `usar_logo_predeterminado`, `usar_predeterminada`).
- **Límites:** cuerpo JSON de hasta 100 KB y formularios de hasta 11 MB (`413` al pasarse). Los cuerpos rechazan campos no definidos (`400`).
- **Sesión (regla 5):** el navegador nunca guarda el token; el servidor del frontend lo guarda en una cookie `httpOnly` y lo reenvía en `Authorization`. El token de Emprendedor no expira; el de Admin dura 24 horas.
- **CORS:** solo el dominio del frontend; las llamadas servidor a servidor no llevan `Origin`.
