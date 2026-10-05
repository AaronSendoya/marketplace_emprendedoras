# Revisión de seguridad (regla 17)

Estado: paso 15 del plan, 2026-09-23. Nivel "medio-alto" según la regla 17: controles concretos y verificables, sin WAF ni auditoría externa. Cada control indica dónde vive y qué prueba automática lo vigila; las pruebas de `tests/seguridad/` leen el código y **fallan si un cambio futuro lo rompe** (se comprobó rompiendo el código a propósito: 9 de 9 mutaciones detectadas).

Ejecutar todo: `pnpm test` (unitarias y de caja blanca), `pnpm test:integration` (base real), `pnpm audit`.

## OWASP API Security Top 10 (2023)

| # | Riesgo | Control | Vigilado por |
|---|---|---|---|
| API1 | Autorización a nivel de objeto (BOLA) | Todo caso de uso que toca algo con dueño recibe al `Actor` y comprueba `puedeGestionar…` (dueña o Admin); los ids son UUID validados | `tests/seguridad/rutas.test.ts` (la identidad llega al caso de uso) y las pruebas de cada caso de uso (403) |
| API2 | Autenticación rota | JWT HS256 fijado; `alg: none` y otros algoritmos rechazados; el usuario, su estado y `token_version` se leen de la base en cada petición; freno de login (429) y de OTP; mismo error para correo inexistente, contraseña incorrecta y cuenta inactiva | `tests/seguridad/jwt.test.ts`, `LoginUseCase.test.ts` |
| API3 | Autorización a nivel de propiedad (asignación masiva y exposición excesiva) | Cuerpos `.strict()`; el rol nunca viene en la petición; respuestas con lista blanca de campos (sin hash, sin correo público, sin ids de cuenta, sin claves de imagen) | `tests/seguridad/entradas.test.ts`, `tests/seguridad/exposicion.test.ts` |
| API4 | Consumo irrestricto de recursos | Cuerpo JSON máximo 100 KB y formularios 11 MB (se cuentan los bytes leídos, no el `Content-Length`); imágenes máximo 5 MB y 50 megapíxeles; longitud máxima en todo texto y rango en todo número; `limite` ≤ 50 y página ≤ 100.000; pool de 5 conexiones | `tests/seguridad/robustez.test.ts`, `entradas.test.ts`, `tests/integration/rendimiento.integration.test.ts` |
| API5 | Autorización a nivel de función | `requireAuth` en toda ruta no pública y `requireAdmin` en `/admin/*`; la lista de rutas públicas es explícita | `tests/seguridad/rutas.test.ts` |
| API6 | Acceso irrestricto a flujos de negocio sensibles | Alta de cuentas solo por Admin con OTP; sin registro público; los Admin solo se crean por SQL | `CreateUsuarioUseCase.test.ts`, `rutas.test.ts` |
| API7 | Falsificación de peticiones del lado del servidor (SSRF) | No hay ninguna ruta que descargue una URL indicada por el usuario (la migración de Drive es un script local, paso 14) | Revisión de código |
| API8 | Configuración de seguridad incorrecta | Cabeceras de seguridad en toda respuesta; sin `X-Powered-By`; CORS estricto; errores sin detalles internos; **Swagger solo en desarrollo** (no arranca ni responde en producción); el servidor se detiene si la configuración de producción es inválida; TLS obligatorio hacia la base fuera del computador | `proxy.test.ts`, `tests/seguridad/swagger.test.ts`, `instrumentation.test.ts`, `opcionesMySql.test.ts` |
| API9 | Gestión inadecuada del inventario | Toda ruta está en OpenAPI y toda operación documentada existe; la seguridad documentada coincide con la del código | `tests/seguridad/rutas.test.ts` |
| API10 | Consumo inseguro de APIs | Solo se consume R2 y el proveedor de correo (SMTP, paso 8b), con credenciales de entorno; las imágenes se reprocesan siempre (sharp) antes de guardarse | `ImageProcessorService.test.ts`, `robustez.test.ts` |

## Otros controles de la regla 17

| Control | Dónde vive | Vigilado por |
|---|---|---|
| Inyección SQL | Todos los valores viajan como parámetros `?`; el SQL solo interpola constantes y una lista blanca de columnas; sin `SELECT *`; `%` y `_` del usuario se escapan en los `LIKE` | `tests/seguridad/sql.test.ts` (analiza el árbol del código) |
| Secretos fuera del repositorio | Variables de entorno validadas en `env.ts`; `.env*` ignorado; `.env.example` sin valores reales | `tests/seguridad/secretos.test.ts` |
| Datos personales en los registros | `ConsoleLogger` redacta por nombre de campo y por contenido; ninguna llamada al logger entrega datos personales | `tests/seguridad/registros.test.ts`, `exposicion.test.ts` |
| Auditoría | Eventos `login_exitoso`, `login_fallido`, `login_bloqueado`, `cuenta_creada`, `cuenta_estado_cambiado`, `password_restablecida`, `otp_solicitado`, `email_cambiado` | `registros.test.ts`, pruebas de cada caso de uso |
| Contraseñas | bcrypt coste 12; política de 8 caracteres y 72 bytes; los OTP solo como hash | `BcryptPasswordHasher.test.ts`, `Password.test.ts` |
| Arquitectura hexagonal | El dominio y los casos de uso no importan base, red ni framework; solo la capa de composición une ambos lados | `tests/seguridad/arquitectura.test.ts` |
| ReDoS y entradas hostiles | Las expresiones regulares y los esquemas se prueban con entradas de 100 KB | `tests/seguridad/robustez.test.ts` |
| Rendimiento y concurrencia | Índices para cada filtro del catálogo; 200 consultas simultáneas y escrituras concurrentes sobre un pool de 5 conexiones | `tests/integration/rendimiento.integration.test.ts` |
| Dependencias | `pnpm audit` sin vulnerabilidades conocidas (2026-09-23) | Repetir antes de cada despliegue |

## Riesgos aceptados y pendientes

- **Límite de peticiones a rutas públicas:** solo se frenan el login y los OTP. El resto (feed, catálogos) queda a cargo de Cloudflare (plan gratuito, reglas de límite de tasa) al desplegar; el backend no tiene un contador general porque en Hostinger no hay memoria compartida entre reinicios.
- **Cifrado en reposo de MySQL:** no verificable en hosting compartido (regla 17). Se compensa con hashes, respaldos cifrados en un bucket privado y un usuario de base sin privilegios globales (paso 16).
- **Envío de correo real (paso 8b):** hasta que exista, `EMAIL_DRIVER=smtp` falla al enviar; en producción no se admite el adaptador de consola.
- **Imágenes en R2 (paso 10b):** el adaptador está probado con un cliente falso; falta verificarlo contra un bucket real.
- **Pruebas de penetración externas:** fuera del alcance del presupuesto. Las pruebas de este repositorio no las reemplazan.
