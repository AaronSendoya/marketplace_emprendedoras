# Plan de implementación del backend

Catálogo "Track de Mujeres 2026" - Backend (`market_Pista8/backend`)

Estado: en implementación. Fecha del plan: 2026-09-20.

Fuente de las reglas de negocio: [CLAUDE.md](../CLAUDE.md). Esquema de referencia: `docs/schema.reference.sql` (local, ignorado por git).

## Cambio de plataforma (2026-09-21)

El proyecto pasó de **Vercel + Neon (PostgreSQL) + R2** a **Hostinger Unlimited (frontend, backend y MySQL) + Cloudflare R2 + Cloudflare gratis (DNS, CDN y SSL)**. Motivo: el cliente no quiere pasar de US$20 al mes y Vercel Pro (US$20 por sí solo) más Neon lo superan. Las reglas de negocio no cambian; cambian el motor, el hosting y todo lo que dependía de ellos.

| Concepto | Antes | Ahora |
|---|---|---|
| Hosting del frontend y del backend | Vercel | Hostinger Unlimited (Node.js, 2 de las 5 apps del plan) |
| Base de datos | PostgreSQL en Neon | MySQL 8.0+ / MariaDB 10.4+ incluido en Hostinger |
| Driver | `@neondatabase/serverless` | `mysql2` con un pool de conexiones |
| Imágenes | Cloudflare R2 | Cloudflare R2 (sin cambios) |
| DNS, CDN y SSL | Vercel | Cloudflare gratis; CDN de Hostinger desactivada |
| Desarrollo y pruebas | Ramas `dev` y `test` de Neon | Bases `catalogo_dev` y `catalogo_test` en un MySQL local |

**Costo estimado** (precios de Hostinger según la captura del cliente y de R2 verificados el 2026-09-21; el dominio y el correo no están verificados):

| Concepto | Costo |
|---|---|
| Hostinger Unlimited, 48 meses pagados por adelantado | US$191.52 (equivale a US$3.99 al mes) |
| Renovación después de los 48 meses | US$16.99 al mes |
| Cloudflare R2 con las cargas previstas (menos de 10 GB) | US$0 |
| Cloudflare gratis (DNS, CDN, SSL) | US$0 |
| Dominio | Gratis el primer año; luego unos US$10.44 al año (no verificado) |

Diferencias del motor que ya se resolvieron en el esquema, el seed y el cliente de base de datos:

*   Los ids son `CHAR(36)` y los genera la aplicación (MySQL no tiene `RETURNING` ni `uuid_generate_v4()`).
*   Las fechas son `DATETIME(3)` en UTC y la aplicación pasa `ahora`; no se usa `NOW()` ni `TIMESTAMPTZ`.
*   La consulta del marketplace usa `MAX` con `GROUP BY` porque MariaDB no soporta `LATERAL`.
*   No hay índices parciales: `idx_productos_perfil_activo` es compuesto.
*   El DDL de MySQL no es transaccional: una migración que falla puede dejar el esquema a medias. El ejecutor no la registra y el mensaje de error lo indica; las migraciones nuevas deben ser reintentables (`IF NOT EXISTS`).
*   El seed no usa `pgcrypto`: lleva el hash bcrypt de la contraseña de desarrollo.
*   Los errores se traducen por número de error de MySQL (1062, 1452, 1451...) en lugar de los códigos SQLSTATE de PostgreSQL.

**Fase actual:** todo se desarrolla en local. R2 estaba previsto como lo único real desde el principio, pero el cliente lo postergó (el alta exige tarjeta): hasta conectarlo, las imágenes van a memoria. Pasos para crear las bases, conectar DBeaver, migrar, sembrar y configurar R2 en [ENTORNO_LOCAL.md](ENTORNO_LOCAL.md). El despliegue en Hostinger (paso 16) no se hace hasta que se indique.

**Pendiente antes de desplegar (verificar en hPanel):** motor y versión exactos de la base, límite de conexiones por usuario, que las apps Node.js queden siempre activas, que el build funcione con `pnpm`, el envío por SMTP y que hPanel permita desplegar cada app desde su subcarpeta (`backend/` y `frontend/`) del repositorio único.

## Progreso

| Paso | Estado | Notas |
|---|---|---|
| 0 Preparación | Hecho | Se creó un proyecto Neon que quedó descartado el 2026-09-21 (ver "Cambio de plataforma"). |
| 1 Configuración base | Hecho | Ver desviaciones. |
| 2 Base de datos | Hecho (rehecho en MySQL el 2026-09-21) | Migraciones `0001` y `0002` en MySQL, seed idempotente y 70 pruebas de integración que pasan tanto en MariaDB 10.4 como en MySQL 9.4. Falta comprobar el motor exacto de Hostinger (paso 16). |
| 3 Núcleo compartido | Hecho (`MySqlClient` desde el 2026-09-21) | Errores, `MySqlClient` (pool `mysql2`), traductor de errores por número de MySQL, validación, paginación, `IClock` y registro de eventos que tapa los valores de los errores del motor. |
| 4 Swagger y OpenAPI | Hecho; falta la prueba manual en `/docs` con tu base | `GET /api/v1/health`, `GET /api/v1/openapi.json`, `GET /docs` y `pnpm openapi:export`. Con MySQL: 191 pruebas unitarias, `typecheck`, `lint` y `build` en verde; el servidor real responde `/health` 200 con la base encendida y 500 estándar (sin filtrar la clave) con la base caída, y `/docs` 200. |
| 5 Seguridad transversal | Hecho | `src/proxy.ts` con CORS estricto y cabeceras de seguridad. Ver desviaciones. |
| 6 Catálogos | Hecho | `GET /catalogos/ciudades` y `/rubros`, públicos, sin paginar (10 y 10 en el seed). 215 pruebas unitarias y 76 de integración en verde. |
| 7 Autenticación con JWT | Hecho | `POST /auth/login`, `GET /auth/me`, `requireAuth`/`requireAdmin`, freno de login (regla 17). 248 pruebas unitarias y 82 de integración en verde; probado en un servidor real contra tu MySQL: login de Admin y Emprendedor, `/auth/me`, mismo error para correo inexistente/contraseña incorrecta/cuenta inactiva, `rol` rechazado en el cuerpo (400), y 429 con `Retry-After: 900` al sexto intento fallido (sin registrar uno nuevo). |
| 8a OTP y correo (sin proveedor) | Hecho | Cuatro endpoints de `/auth/password/*` y `/auth/email/*`. 312 pruebas unitarias y 97 de integración en verde; probado en un servidor real (ver desviaciones). |
| 8b Correo real | Bloqueado | Falta elegir proveedor y cuenta remitente. |
| 9 Cuentas del Admin | Hecho | Cuatro endpoints de `/admin/usuarios`. 354 pruebas unitarias y 104 de integración en verde; probado en un servidor real (ver desviaciones). |
| 10a Imágenes (sin R2) | Hecho | Procesador sharp, puertos, almacenamiento en memoria, lector multipart con límite. |
| 10b Imágenes con R2 | Código hecho, **pospuesto por el cliente** (el alta de R2 exige tarjeta) | `CloudflareImageService` probado con un cliente falso. **Pendiente al conectar R2 (en unos días):** cargar las variables `R2_*` (desarrollo en `.env.local`, producción en el panel de Hostinger), ejecutar `pnpm r2:subir-defaults`, subir una imagen real y abrir su URL pública. Mientras tanto las imágenes van a memoria en desarrollo. |
| 11 Perfiles (Feed 1) | Hecho | Seis rutas más `GET /mis/perfil`. 496 pruebas unitarias y 117 de integración en verde; probado en un servidor real (ver desviaciones). |
| 12 Productos y marketplace (Feed 2) | Hecho | Siete rutas más `GET /mis/productos`. Consulta de la regla 8 probada contra MySQL real. |
| 13 Descuentos | Hecho | Cinco rutas y `VigenciaDescuento`. 667 pruebas unitarias y 155 de integración en verde; probado en un servidor real (ver desviaciones). |
| 14 Migración desde el Excel | Bloqueado | Falta el archivo Excel y el acceso a los archivos de Drive. |
| 15 Endurecimiento y calidad | Hecho | Swagger solo en desarrollo, límites de tamaño, auditoría de login y pruebas de caja blanca (`tests/seguridad/`). `pnpm audit` sin vulnerabilidades. Revisión en [SEGURIDAD.md](SEGURIDAD.md). |
| 16 Despliegue en Hostinger | Pendiente | No se hace hasta que se indique. |
| 17 Cierre | Hecho | `CLAUDE.md` (sección 4 con la estructura real), `README.md`, [MATRIZ_PERMISOS.md](MATRIZ_PERMISOS.md) y `openapi.json`. 1273 pruebas unitarias y de caja blanca y 171 de integración en verde. |

Desviaciones respecto a lo escrito en este plan:

*   `sharp` funciona con `allowBuilds: sharp: false` (comprobado: JPEG a WebP). Se deniega también el script de instalación de `esbuild` (dependencia de `tsx`); `tsx` funciona sin él.
*   Se agregó `@next/env` para que los scripts fuera de Next (`migrate`, `seed`) carguen los `.env*` con el mismo orden de prioridad que Next.
*   Los scripts `db:migrate`, `db:seed:dev`, `openapi:export` y `test:integration` no se crearon en el paso 1: se agregan en el paso que crea el archivo que ejecutan (2 y 4), para no dejar scripts que apunten a archivos inexistentes.
*   El backend corre en el puerto 3001 en local (`pnpm dev`), porque el frontend usa el 3000 por defecto y ambos se ejecutan en paralelo. `CORS_ALLOWED_ORIGINS` de ejemplo es `http://localhost:3000`.
*   `env.ts` exige R2 completo solo en producción (o todo o nada en cualquier entorno) y la configuración SMTP solo con `EMAIL_DRIVER=smtp`, para poder desarrollar antes de tener bucket y proveedor de correo. `APP_ENV` no tiene valor por defecto a propósito (el seed se apoya en él). `SWAGGER_ENABLED` es `false` por defecto.
*   `typecheck` ejecuta antes `next typegen`, porque `LayoutProps` y `RouteContext` son tipos globales que Next genera.
*   Paso 2: el ejecutor de migraciones (`scripts/lib/migrador.ts`) agrega, además de lo pedido, un checksum por migración (una ya aplicada que se edita detiene la ejecución), un bloqueo para que dos ejecuciones no se pisen, y normalización de saltos de línea para que Windows y Linux calculen el mismo checksum. Los `.ts` de este paquete son CommonJS, así que los scripts usan `main()` en vez de `await` de nivel superior.
*   Paso 2: `DATABASE_URL_TEST` apunta a una base MySQL aparte (`catalogo_test`). Las pruebas de integración se niegan a correr si su nombre no contiene "test" o si es la misma base (mismo host, puerto y nombre) que `DATABASE_URL`.
*   Paso 3: `MySqlClient` (antes `NeonClient`) usa un pool de `mysql2` y una conexión dedicada dentro de `transaccion`. Cada conexión fija la sesión en UTC (`+00:00`) y con `STRICT_ALL_TABLES` y `ONLY_FULL_GROUP_BY`. Los mensajes de validación de Zod salen en español (`z.config(z.locales.es())` en `src/api/http/validacion.ts`). Un `limite` mayor a 50 se rechaza con 400 en vez de recortarse. El envoltorio `withErrorHandling` queda para el paso 5; aquí solo está `respuestaDeError`.
*   Paso 4: el envoltorio `withErrorHandling` (`src/api/middlewares/`) se adelantó del paso 5 porque las rutas de este paso ya lo necesitan; el paso 5 solo agrega el proxy. Swagger UI usa versión fija (5.33.0) con SRI, `nonce` por petición y CSP restrictiva, porque la página comparte origen con la API y `persistAuthorization` guarda el JWT en `localStorage`. Con Swagger deshabilitado, `/docs` y `/api/v1/openapi.json` responden 404 estándar. Esas dos rutas no se documentan a sí mismas: el test de contrato del paso 15 debe excluirlas. El test `documento.test.ts` ya exige `security` y una respuesta de error en toda operación, y falla si `docs/openapi.json` no coincide con el código (regenerar con `pnpm openapi:export`). Cada paso que agregue rutas suma su `registrar*()` en `src/api/openapi/documento.ts`.
*   Paso 4 (proxy, para el paso 5): Swagger llama al mismo origen; el navegador envía `Origin` en las peticiones no GET aunque sea el mismo origen, así que el proxy debe permitir el propio origen del backend además de `CORS_ALLOWED_ORIGINS`.
*   Paso 5: `src/proxy.ts` (matcher `/api/:path*`) rechaza con 403 cualquier petición con un `Origin` no permitido, no solo los preflight (regla 1 dice "solo se permite el dominio del frontend", sin acotarlo al método); sin `Origin` (llamada servidor a servidor) pasa sin tocar. El origen permitido es `CORS_ALLOWED_ORIGINS` más el propio origen del backend (calculado de la petición, `request.nextUrl.origin`), para que Swagger funcione. Cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`) y `Cache-Control: no-store` en `/api/v1/auth/*` se aplican en toda respuesta que deja pasar el proxy, incluido el 403. La lógica de CORS está separada en `manejarCors(request, origenesConfigurados)`, una función pura que no lee `getEnv()`, para poder probarla con distintos orígenes sin depender de variables de entorno; `proxy()` es el envoltorio de una línea que Next.js llama. Probado a mano contra un servidor real: preflight de origen ajeno 403, preflight y GET de origen permitido con las cabeceras CORS, sin `Origin` pasa sin ellas, y `/docs` sigue funcionando. No se pudo probar `Cache-Control: no-store` de punta a punta porque las rutas de `/api/v1/auth/*` aún no existen (llegan en los pasos 7 a 9); la regla expresión regular ya tiene su propia prueba unitaria.
*   Paso 3 (control de errores): `MySqlClient` traduce los fallos que provoca el dato del usuario (duplicado 1062, referencia inexistente 1452, borrado con dependientes 1451, tamaño, formato o rango inválidos) a errores de dominio con mensaje en español; el catálogo de mensajes por restricción está en `src/shared/infrastructure/errorMySql.ts`. NOT NULL (1048 y 1364) y CHECK (3819 en MySQL, 4025 en MariaDB) no se traducen a propósito: indican un fallo de validación previa y deben verse como 500 en los logs. Nunca se copia `sqlMessage` (lleva los valores). Los scripts muestran mensajes accionables ante fallos de conexión (`scripts/lib/ejecutar.ts`).
*   Paso 2: `@next/env` no lee `.env.local` cuando `NODE_ENV=test` (Vitest lo fija), por eso `scripts/lib/entorno.ts` fuerza el modo `development` solo durante la carga.
*   Paso 7: el mensaje "El correo o la contraseña son incorrectos." se usa también para una cuenta desactivada (no solo para correo inexistente o contraseña incorrecta): distinguirla revelaría por otra vía si un correo tiene cuenta. Para que el tiempo de respuesta tampoco lo delate, `LoginUseCase` siempre llama a `IPasswordHasher.comparar` (contra el hash real si la cuenta existe y está activa, o contra un hash fijo precalculado si no) antes de decidir, salvo cuando ya se llegó al límite de intentos, donde se corta antes de tocar el hasher (así lo exige la prueba del sexto intento). El `Retry-After` del 429 es la ventana completa en segundos (900), no el tiempo exacto hasta el intento más antiguo: una cota superior simple, ajustable si hiciera falta más precisión. `requireAuth` reconstruye el usuario campo por campo (sin `passwordHash`) en vez de desestructurar para omitirlo, y `requireAdmin` delega en `requireAuth` reutilizando las mismas dependencias (`dependenciasAuthPorDefecto()` las cablea una sola vez para todas las rutas protegidas). El controlador serializa con lista explícita de campos (nunca el objeto completo), para que un campo sensible que se agregue al dominio más adelante no se filtre por accidente.
*   Regla 17 (2026-09-22, seguridad medio-alta, adelantado desde los pasos 2, 5 y 7): `src/shared/infrastructure/opcionesMySql.ts` se niega a construir las opciones de conexión sin TLS cuando el host no es `localhost`/`127.0.0.1`/`[::1]` (protege la migración remota del paso 16 y cualquier acceso futuro); `src/proxy.ts` agrega `Strict-Transport-Security: max-age=31536000` (sin `includeSubDomains` ni `preload`) a las cabeceras de seguridad existentes; se creó la tabla `intentos_login` (migraciones `0003` y `0004`) para el freno de login del paso 7; el coste de bcrypt documentado sube de 10 a 12 (el seed regenera su hash con el nuevo coste; las filas ya sembradas en una base existente conservan el hash anterior hasta que se reinicie esa base). Probado contra MySQL 9.4 y MariaDB 10.4 reales (migración, pruebas de integración de la tabla nueva y de la restricción de TLS). 211 pruebas unitarias y 74 de integración en verde.
*   Paso 8a (decisiones que la regla 15 no fijaba, ya documentadas en ella): solo vale el último código de cada correo y propósito (no se marca nada como invalidado: `buscarUltimo` devuelve el más reciente); cada verificación suma un intento antes de comparar, también la correcta, con un `UPDATE` atómico (`intentos < 5`, sin usar y vigente), y el consumo es otro `UPDATE ... WHERE usado_en IS NULL`, así peticiones en paralelo no superan los 5 intentos ni usan el código dos veces (probado con 10 peticiones simultáneas). Los límites de 1 por minuto y 5 por hora cuentan por correo sin distinguir el propósito y devuelven `Retry-After` exacto. La solicitud se guarda siempre, exista o no la cuenta (así los límites no delatan si existe); el código solo se envía a una cuenta activa, y en `restablecer_password` el envío no se espera (su demora tampoco debe delatarla), mientras que en `verificar_email` sí, porque quien lo pide está autenticado y debe saber si falló. El código se guarda con el mismo `IPasswordHasher` (bcrypt) que las contraseñas. Contraseña nueva: mínimo 8 caracteres y máximo 72 bytes (límite de bcrypt), validada antes de consumir el código; el login no aplica esta política, para no bloquear cuentas existentes. `EMAIL_DRIVER=console` se rechaza con `APP_ENV=production` (`env.ts`) porque escribiría los códigos en los logs. `requireAuth` ahora pide solo `Pick<IUsuarioRepository, "buscarPorId">`. Se agregaron `VerificadorOtp` y `CambiarEmailUseCase`, que la sección 4 de `CLAUDE.md` no lista (se corrige en el paso 17). Sin migración: `otp_codigos` ya tenía lo necesario. El registro de eventos del login (regla 17, auditoría) sigue pendiente para el paso 15; el paso 8a registra `otp_solicitado`, `password_restablecida` y `email_cambiado`.
*   Paso 9: se aplicaron los valores por defecto de los supuestos 2 (solo Admin crea, lista y cambia el estado de cuentas) y 8 (un Admin no puede desactivarse a sí mismo, 409), ya escritos en la regla 5. Decisiones que la regla no fijaba: si el correo ya tiene cuenta, la creación responde 409 **antes** de consumir el código (el Admin no pierde el código); igual una contraseña que no cumple la política se rechaza antes de consumirlo. `POST /admin/usuarios` devuelve `{ usuario, password_temporal }` con `password_temporal` nulo si el Admin definió la contraseña; la generada tiene 12 caracteres sin los ambiguos al dictarse (0/O, 1/l/I). El Admin puede desactivar a otro Admin (solo se prohíbe a sí mismo) y el cambio de estado es idempotente (repetirlo no registra otro evento). `usuarios.listar` no trae el hash. Los ids de la ruta se validan con `z.uuid()` (acepta los v1 que genera `UUID()` en el seed y los v4 de la aplicación). `Cache-Control: no-store` se extendió a `/api/v1/admin/*` en `src/proxy.ts` porque la creación puede devolver una contraseña temporal. `serializarUsuario` pasó a `src/api/controllers/usuario.serializador.ts` para compartirlo entre los controladores. No se creó migración. El `verificacion-correo` del Admin no comprueba si el correo ya tiene cuenta (lo hace la creación); revelarlo ahí solo ahorraría un intento.
*   Pasos 10 y 11: se aplicaron los valores por defecto de los supuestos 1, 3, 4, 6 y 7 de la sección 4 (y 5, para el paso 13) y se documentaron en la regla 18. Sin `R2_*`, `crearImageStorage()` usa la memoria fuera de producción (con un aviso en el log) y falla en producción; `env.ts` ya exige R2 completo en producción. Next copia solo 10 MB del cuerpo en el proxy y recorta el resto en silencio: `next.config.ts` sube `proxyClientMaxBodySize` a 12 MB y `multipart.ts` corta antes (11 MB para dos imágenes, 6 MB para una, con 413). Decisiones que la regla no fijaba: WhatsApp acepta un celular boliviano de 8 dígitos (6 o 7) sin código y exige `+` o `00` para otros países (un número extranjero sin código es ambiguo y da 400); Instagram se guarda en minúsculas y rechaza enlaces a publicaciones, reels y explorar. La respuesta pública incluye `emprendedora` (nombre completo, regla 10) pero nunca el correo ni el id de la cuenta. El feed ordena por creación descendente y busca `q` en nombre y descripción con `LIKE` (con `%` y `_` escapados). Un Admin crea el perfil con `usuario_id` (una cuenta Emprendedor); una emprendedora que indique otro `usuario_id` recibe 403. `GET /mis/perfil` no estaba en el contrato inicial: se agregó para que la emprendedora conozca su perfil. Las imágenes predeterminadas son SVG neutros convertidos por el mismo procesador (regla 16); tienen clave fija con caché inmutable, así que si se cambian hay que purgar la caché de Cloudflare.
*   Pasos 12 y 13: cambios de contrato respecto a la sección 5. `POST /productos` y `PUT /productos/{id}/imagen` son multipart; `PATCH /productos/{id}` también reactiva (`activo: true`) y `DELETE` responde 204. `POST /descuentos/{id}/productos` recibe `{ producto_ids: [...] }` (1 a 50), es todo o nada y devuelve el descuento con sus productos; `DELETE /descuentos/{id}/productos/{producto_id}` responde 204. `GET /marketplace/productos` agrega los filtros `perfil_id`, `ciudad_id`, `rubro_id` y `q`; su respuesta trae el negocio (`perfil`: nombre, WhatsApp, ciudad, rubro y logo) y `consultar_precio` (supuesto 7: con el precio oculto o ausente se omiten `precio`, `porcentaje` y `precio_con_descuento`, en `null`). El producto no tiene imagen predeterminada (la regla 11 es del perfil): la imagen es obligatoria. Una emprendedora sin perfil que crea un producto o un descuento recibe 409 ("Primero crea tu perfil"); "mis productos" y "mis descuentos" sin perfil dan una lista vacía. Los descuentos se crean sin productos y se asignan aparte. `fecha_fin` de solo fecha queda a las 23:59:59.000 de La Paz (literal de la regla 8), por lo que los últimos 999 ms de ese día no cuentan. Editar un descuento valida el rango con lo que quedaría guardado (fecha nueva contra la que ya existía). La asignación usa `ON DUPLICATE KEY UPDATE` (no `INSERT IGNORE`, que también taparía una referencia inexistente). Los ids de las rutas se validan como UUID. Los productos y descuentos de la base de desarrollo que se crean al probar se borran en cascada al borrar el perfil.
*   Pasos 15 y 17: se agregaron a la regla 17 (ambos `CLAUDE.md`) Swagger solo en desarrollo, los límites de tamaño, las cabeceras fuera de `/api` y la verificación de caja blanca. **Swagger:** el arranque se niega con `SWAGGER_ENABLED=true` fuera de `development` (incluido `test`) y, aunque llegara a arrancar, `swaggerHabilitado()` (`env.ts`) hace que `/docs` y `/api/v1/openapi.json` respondan 404; el 404 es idéntico al de una ruta inexistente. Un servidor de producción con el entorno inválido antes quedaba en pie respondiendo 500 a todo: ahora termina con código 1 y el motivo en `stderr` (`validarEntornoAlArrancar.ts`, separado de `instrumentation.ts` para no arrastrar `process.exit` al runtime edge). **Límites:** `leerCuerpo` lee por partes con tope de 100 KB (`cuerpo.ts`, compartido con `multipart.ts`); `pagina` ≤ 100.000; el login limita correo (150) y contraseña (200); el código OTP exige exactamente 6 caracteres; el precio de un formulario, 11. **Auditoría:** `LoginUseCase` registra `login_exitoso`, `login_fallido` (con el id de la cuenta si existe, nunca el correo) y `login_bloqueado`. **Cabeceras:** `next.config.ts` aplica las mismas cabeceras del proxy fuera de `/api` y `/docs` y quita `X-Powered-By`. `health.controller.ts` dejó de importar el adaptador de la base (lo detectó la prueba de arquitectura). **Pruebas de caja blanca** (`tests/seguridad/`, dentro de `pnpm test`): leen el código con el compilador de TypeScript y fallan si una ruta nueva no exige token o no está documentada, si un cuerpo no es estricto o no acota sus campos, si el SQL interpola algo fuera de la lista revisada, si un registro lleva datos personales, si aparece un secreto, si el dominio importa infraestructura o si Swagger queda habilitado fuera de desarrollo. Se comprobó que detectan fallos rompiendo el código a propósito (9 mutaciones, 9 detectadas). **No funcionales:** ReDoS y entradas de 100 KB (todas responden en menos de 300 ms), imagen "bomba" de 60.000 x 60.000 píxeles rechazada, y contra la base real los índices de cada filtro y 200 consultas simultáneas sobre un pool de 5 conexiones. **No cubierto:** el límite general de peticiones a las rutas públicas queda a cargo de Cloudflare (ver SEGURIDAD.md). El paso 17 no copia archivos a `frontend/`; `openapi.json` y `MATRIZ_PERMISOS.md` están en `docs/` del backend.

## 1. Alcance y reglas de trabajo

*   **Solo backend.** El frontend queda fuera de este plan. La documentación Swagger es el contrato que el frontend consumirá.
*   **Antes de escribir código de Next.js**, leer la guía correspondiente en `node_modules/next/dist/docs/` (lo exige `AGENTS.md`; esta versión tiene cambios incompatibles, por ejemplo `middleware` pasó a `proxy`).
*   **Documentación primero.** Si durante la implementación aparece o cambia una regla de negocio, se documenta antes en el `CLAUDE.md` de ambas carpetas (`backend/` y `frontend/`) y en `docs/schema.reference.sql`.
*   **Definición de terminado de cada paso:**
    1.  `pnpm typecheck`, `pnpm lint` y `pnpm test` pasan.
    2.  Todo endpoint nuevo aparece en Swagger con su esquema de entrada, respuestas de error y seguridad, y se probó con "Try it out".
    3.  Los casos límite de las reglas del paso tienen pruebas automáticas.
    4.  El `CLAUDE.md` está sincronizado con lo implementado.
*   Un commit por paso, con mensaje claro. Los commits los haces tú o los hago cuando lo pidas.

## 2. Decisiones técnicas

Versiones consultadas en el registro de npm el 2026-09-20; se fijan al instalar.

| Área | Decisión | Motivo |
|---|---|---|
| Estructura | Mover `app/` a `src/app/` y cambiar el alias `@/*` a `./src/*` | Next soporta la carpeta `src` y la arquitectura hexagonal de la sección 4 de `CLAUDE.md` vive en `/src` |
| Rutas HTTP | `src/app/api/v1/**/route.ts` delgadas: validan, llaman al caso de uso y formatean la respuesta | Mantiene la lógica fuera del framework (hexagonal estricta) |
| Caché | Sin caché en las rutas | La doc indica que los Route Handlers no se cachean por defecto; la vigencia de los descuentos debe evaluarse en cada consulta |
| Base de datos | `mysql2` 3 con un pool y SQL plano en los repositorios, sin ORM | MySQL viene incluido en Hostinger; el SQL plano da control fino de 3NF y de la consulta del marketplace |
| Migraciones | Archivos `db/migrations/NNNN_nombre.sql` y un ejecutor propio (`scripts/migrate.ts`) con tabla `_migraciones` | `schema.reference.sql` es solo referencia; se necesita un historial versionado y repetible |
| Validación y OpenAPI | `zod` 4 y `@asteasolutions/zod-to-openapi` 9 | Los mismos esquemas validan la entrada y generan la especificación: una sola fuente de verdad |
| Swagger UI | Página `GET /docs` que carga `swagger-ui-dist` 5 desde jsDelivr con versión fija; la especificación sale en `GET /api/v1/openapi.json` | Sin dependencias ni archivos copiados. Activable por variable de entorno |
| JWT | `jose` 6 (HS256) | La guía de autenticación de Next lo recomienda. Sin `exp` para Emprendedor; 24 h para Admin |
| Hash de contraseñas | `bcryptjs` 3 (coste 12, regla 17) | JavaScript puro, sin compilación nativa en el hosting, y el seed lleva su hash ya calculado |
| Imágenes | `sharp` 0.35 y `@aws-sdk/client-s3` 3 contra la API S3 de R2 | Conversión a WebP y almacenamiento (regla 16) |
| Correo | Puerto `IEmailSender`. Primero un adaptador de consola; el real después | El proveedor está pendiente (regla 15) |
| Excel | `exceljs` 4, solo en el script de migración | Lectura del Excel original |
| Pruebas | `vitest` 5. Unitarias con repositorios en memoria; de integración contra una base MySQL `catalogo_test` | Sin Docker, una base local desechable basta y no toca el resto |
| Zona horaria | Desfase fijo de -04:00 (America/La_Paz) dentro del dominio, sin librerías | Bolivia no usa horario de verano |
| Proxy | `src/proxy.ts` con `matcher: '/api/:path*'` solo para CORS y cabeceras de seguridad | El proxy corre en Node.js. La autenticación (que consulta la base) va en envoltorios de las rutas, no aquí |

## 3. Convenciones de la API

*   **Base:** `/api/v1`. JSON con claves en `snake_case`, igual que la base de datos y `CLAUDE.md` (por ejemplo `precio_con_descuento`, `mostrar_precio`).
*   **Autenticación:** `Authorization: Bearer <jwt>`. En Swagger se usa el botón "Authorize".
*   **Errores:** siempre `{ "error": { "codigo": "...", "mensaje": "...", "detalles": [...] } }`.

    | HTTP | codigo |
    |---|---|
    | 400 | `VALIDACION` |
    | 401 | `NO_AUTENTICADO` |
    | 403 | `PROHIBIDO` |
    | 404 | `NO_ENCONTRADO` |
    | 409 | `CONFLICTO` |
    | 413 | `ARCHIVO_MUY_GRANDE` |
    | 429 | `DEMASIADAS_SOLICITUDES` |
    | 500 | `ERROR_INTERNO` (sin detalles internos) |
*   **Paginación:** `?pagina=1&limite=20` (máximo 50). Respuesta `{ "datos": [...], "paginacion": { "pagina", "limite", "total" } }`.
*   **Fechas:** ISO 8601 en UTC en las respuestas. En la entrada de descuentos se acepta `YYYY-MM-DD` (hora opcional), `YYYY-MM-DDTHH:mm` (se interpreta como hora de La Paz) o ISO con zona.
*   **Imágenes:** las respuestas devuelven URLs completas (`foto_perfil_url`, `logo_url`, `imagen_url`) armadas con `R2_PUBLIC_URL` y la clave guardada.
*   **Entradas estrictas:** los cuerpos usan `.strict()`; un campo desconocido (por ejemplo `rol`) devuelve 400.

## 4. Supuestos por confirmar

Ninguno está aún en `CLAUDE.md`. El plan usa el valor por defecto de la tabla; si respondes otra cosa, se documenta y se ajusta el paso indicado.

| # | Tema | Valor por defecto del plan | Afecta |
|---|---|---|---|
| 1 | Cuenta desactivada (`activo = false`) | Su perfil y sus productos dejan de mostrarse en el catálogo | Pasos 11 y 12 |
| 2 | Permisos por rol | Ver matriz abajo | Pasos 7 a 13 |
| 3 | Catálogo público | Cualquier visitante lo ve sin iniciar sesión | Pasos 6, 11 y 12 |
| 4 | Quién crea el perfil | La emprendedora crea el suyo; el Admin puede crearlo en nombre de una cuenta | Paso 11 |
| 5 | Borrado de descuentos | No hay `DELETE`; un descuento se termina editando `fecha_fin` | Paso 13 |
| 6 | Ciudades y rubros | Solo lectura por la API; se administran con SQL | Paso 6 |
| 7 | Precio oculto (`mostrar_precio = false`) | La API omite `precio`, `precio_con_descuento` y `porcentaje` para que no viajen al navegador, aunque el frontend los ocultaría igual | Paso 12 |
| 8 | Un Admin no puede desactivar su propia cuenta | Se rechaza con 409 | Paso 9 |
| 9 | Limitar intentos de login | Recomendado (ver paso 15); requiere tabla nueva y regla documentada | Paso 15 |

Matriz de permisos propuesta:

| Acción | Visitante | Emprendedor | Admin |
|---|---|---|---|
| Ver catálogo (perfiles, productos, descuentos vigentes) | Sí | Sí | Sí |
| Iniciar sesión, recuperar contraseña por OTP | Sí | Sí | Sí |
| Crear, activar y desactivar cuentas | No | No | Sí |
| Crear y editar perfil | No | Solo el propio | Cualquiera |
| Crear, editar y desactivar productos | No | Solo los propios | Cualquiera |
| Crear y editar descuentos, asignarlos a productos | No | Solo los propios | Cualquiera |

Bloqueos externos (no son decisiones de negocio): **proveedor de correo** (solo el paso 8b), **bucket y credenciales de R2** (solo el paso 10b), **Excel y acceso a los archivos de Drive** (solo el paso 14).

## 5. Contrato inicial de endpoints

Todas las rutas cuelgan de `/api/v1`, salvo `/docs`. Se afina en los pasos 4 a 13 y el resultado final queda en `docs/openapi.json`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado del servicio y de la conexión a la base |
| GET | `/openapi.json` y `/docs` | Público, solo con Swagger habilitado | Especificación y Swagger UI |
| POST | `/auth/login` | Público | Correo y contraseña; devuelve `token` y datos del usuario |
| GET | `/auth/me` | Autenticado | Usuario actual |
| POST | `/auth/password/solicitar-codigo` | Público | Envía el OTP `restablecer_password` (respuesta idéntica exista o no la cuenta) |
| POST | `/auth/password/restablecer` | Público | Código y nueva contraseña; incrementa `token_version` |
| POST | `/auth/email/solicitar-codigo` | Autenticado | Envía un OTP al correo nuevo |
| PUT | `/auth/email` | Autenticado | Confirma el cambio de correo con el código |
| POST | `/admin/usuarios/verificacion-correo` | Admin | Envía el OTP `verificar_email` al correo de la futura cuenta |
| POST | `/admin/usuarios` | Admin | Crea una cuenta Emprendedor (exige el OTP) |
| GET | `/admin/usuarios` | Admin | Lista paginada de cuentas |
| PATCH | `/admin/usuarios/{id}/estado` | Admin | Activa o desactiva una cuenta |
| GET | `/catalogos/ciudades` | Público | Ciudades |
| GET | `/catalogos/rubros` | Público | Rubros |
| GET | `/perfiles` | Público | Feed 1, con filtros `ciudad_id`, `rubro_id`, `q` y paginación |
| GET | `/perfiles/{id}` | Público | Detalle de un perfil |
| POST | `/perfiles` | Emprendedor / Admin | Crea el perfil (multipart con foto y logo) |
| PATCH | `/perfiles/{id}` | Dueño / Admin | Edita datos del perfil |
| PUT | `/perfiles/{id}/foto-perfil` | Dueño / Admin | Reemplaza la foto de perfil |
| PUT | `/perfiles/{id}/logo` | Dueño / Admin | Reemplaza el logo |
| GET | `/marketplace/productos` | Público | Feed 2, con descuento vigente y precio con descuento |
| GET | `/marketplace/productos/{id}` | Público | Detalle de un producto |
| GET | `/mis/productos` | Emprendedor | Productos propios, incluidos los inactivos |
| POST | `/productos` | Dueño / Admin | Crea un producto (multipart con imagen) |
| PATCH | `/productos/{id}` | Dueño / Admin | Edita un producto |
| PUT | `/productos/{id}/imagen` | Dueño / Admin | Reemplaza la imagen |
| DELETE | `/productos/{id}` | Dueño / Admin | Desactiva el producto (`activo = false`) |
| GET | `/mis/descuentos` | Emprendedor | Descuentos propios con estado `programado`, `vigente` o `vencido` |
| POST | `/descuentos` | Dueño / Admin | Crea un descuento |
| PATCH | `/descuentos/{id}` | Dueño / Admin | Edita porcentaje o fechas |
| POST | `/descuentos/{id}/productos` | Dueño / Admin | Asigna el descuento a productos (mismo perfil) |
| DELETE | `/descuentos/{id}/productos/{producto_id}` | Dueño / Admin | Quita la asignación |

## 6. Estructura final de carpetas

Sigue la sección 4 de `CLAUDE.md`, adaptada al diseño `src/`.

```text
db/
  migrations/                 (SQL versionado)
scripts/                      (ejecutores de línea de comandos: migrate, seed, exportación de OpenAPI)
src/
  proxy.ts                    (CORS y cabeceras de seguridad)
  app/
    layout.tsx                (raíz mínima exigida por Next)
    docs/route.ts             (Swagger UI)
    api/v1/**/route.ts        (adaptadores HTTP delgados)
  api/
    controllers/
    middlewares/              (corsValidator, requireAuth, requireAdmin, withErrorHandling)
    openapi/                  (registro y generador)
  core/
    auth/  perfiles/  productos/  descuentos/  catalogos/
      domain/  application/  infrastructure/
  shared/
    config/env.ts             (variables validadas con Zod)
    domain/                   (errores, IClock, IImageStorage, IImageProcessor, IEmailSender)
    infrastructure/           (MySqlClient, R2, sharp, adaptadores de correo)
  scripts/
    migrarDesdeExcel.ts
```

## 7. Pasos

Orden: 0 → 1 → 2 → 3 → 4 → 5 → 6 y 7 (en paralelo) → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17.

Hitos: **H1** esqueleto, base de datos, Swagger y seguridad (pasos 0 a 5). **H2** cuentas y acceso (6 a 9). **H3** contenido del catálogo (10 a 13). **H4** migración, endurecimiento y despliegue (14 a 17).

### Paso 0 - Preparación

*   Leer en `node_modules/next/dist/docs/` las guías de Route Handlers, `proxy`, variables de entorno, autenticación y `upgrading/version-16`.
*   Crear una rama de trabajo y confirmar que `pnpm lint` y `pnpm build` pasan con el scaffold.
*   Tener un servidor MySQL o MariaDB local con dos bases vacías: `catalogo_dev` y `catalogo_test`. La de producción es la que crea Hostinger y nunca se usa desde el computador salvo para migrar (paso 16).
*   Limpiar el scaffold del frontend: eliminar `page.tsx`, `globals.css`, `public/*.svg`, `postcss.config.mjs` y las dependencias de Tailwind. Conservar un `layout.tsx` mínimo, porque la doc exige un layout raíz en `app/`.

**Verificación:** `pnpm build` sigue pasando tras la limpieza.

### Paso 1 - Configuración base

*   Mover `app/` a `src/app/` y cambiar el alias en `tsconfig.json` a `"@/*": ["./src/*"]`.
*   Instalar dependencias de ejecución: `mysql2`, `zod`, `@asteasolutions/zod-to-openapi`, `jose`, `bcryptjs`, `sharp`, `@aws-sdk/client-s3`. De desarrollo: `vitest`, `tsx`. Más adelante, `exceljs` y `nodemailer`.
*   Comprobar que `sharp` funciona con `allowBuilds: sharp: false` en `pnpm-workspace.yaml` (su paquete no ejecuta script de instalación). Si falla, habilitar su compilación.
*   Crear `.env.example` con todas las variables y agregar `!.env.example` al `.gitignore` (hoy `.env*` lo ignoraría).
*   Crear `src/shared/config/env.ts`: valida las variables con Zod y falla al arrancar si falta alguna.
*   Agregar scripts: `typecheck`, `test`, `test:integration`, `db:migrate`, `db:seed:dev`, `openapi:export`.
*   Configurar Vitest con el alias `@`.

Variables: `DATABASE_URL`, `DATABASE_POOL_MAX` (opcional), `DATABASE_URL_TEST`, `JWT_SECRET` (mínimo 32 caracteres), `CORS_ALLOWED_ORIGINS` (lista separada por comas), `SWAGGER_ENABLED`, `APP_ENV`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `EMAIL_DRIVER` (`console` o `smtp`), `EMAIL_FROM`, `SMTP_*`.

**Verificación:** `pnpm typecheck && pnpm lint && pnpm test` en verde; arrancar sin `JWT_SECRET` falla con un mensaje claro.

### Paso 2 - Base de datos

*   `db/migrations/0001_esquema_inicial.sql`: tablas y restricciones de `docs/schema.reference.sql` en MySQL (ids `CHAR(36)`, fechas `DATETIME(3)`, restricciones con nombre), sin los comentarios de directrices.
*   `db/migrations/0002_indices.sql`: índices para los filtros del feed (`perfiles_emprendedores(ciudad_id)`, `(rubro_id)`, `productos(perfil_id)`, `producto_descuentos(descuento_id)`, `descuentos(perfil_id)`, índice parcial de `productos` con `activo`).
*   `scripts/migrate.ts`: usa la conexión directa, aplica en orden cada migración pendiente dentro de una transacción y las registra en `_migraciones`.
*   `scripts/seed-dev.ts`: ejecuta `docs/seed.dev.sql` y se niega a correr si `APP_ENV` no es `development`.

**Verificación:** correr las migraciones en la rama `dev`; una segunda ejecución no hace nada; pruebas de integración de las restricciones (un segundo perfil para el mismo usuario falla, `porcentaje` de 0 o 101 falla, `fecha_fin` anterior a `fecha_inicio` falla).

### Paso 3 - Núcleo compartido

*   Errores de dominio tipados (con `codigo`) y su conversión a la respuesta HTTP estándar.
*   `MySqlClient` con pool y ayudante de transacciones.
*   Ayudantes para validar cuerpo y consulta con Zod, y para respuestas paginadas.
*   `IClock` inyectable (permite probar la vigencia con un reloj falso).
*   Registro de eventos mínimo que nunca escribe correos, contraseñas, tokens ni códigos OTP.

**Verificación:** pruebas unitarias de la conversión de errores y de los ayudantes.

### Paso 4 - Swagger y OpenAPI

Se hace temprano para que todo lo siguiente nazca documentado y probable.

*   `src/api/openapi/`: registro de rutas basado en los mismos esquemas Zod que validan la entrada.
*   `GET /api/v1/openapi.json`: generado con información del proyecto, servidores, esquema de seguridad `bearerAuth` y componentes reutilizables (error, paginación).
*   `GET /docs`: Swagger UI con `persistAuthorization` activado.
*   `SWAGGER_ENABLED=false` responde 404 (producción). Activo en desarrollo y en las previsualizaciones.
*   Primer endpoint: `GET /api/v1/health` con `SELECT 1` a la base.
*   `pnpm openapi:export` escribe `docs/openapi.json` (versionado) para que el frontend genere su cliente y sus tipos.

**Verificación:** abrir `/docs`, ejecutar `/health` con "Try it out" y ver la respuesta 200.

### Paso 5 - Seguridad transversal

*   `src/proxy.ts` con CORS (regla 1): permite solo los orígenes de `CORS_ALLOWED_ORIGINS`, rechaza con 403 los preflight de otros orígenes y deja pasar las peticiones sin `Origin` (las del servidor del frontend). Añade cabeceras de seguridad y `Cache-Control: no-store` en las rutas de autenticación.
*   Envoltorio `withErrorHandling` que convierte errores de dominio, de Zod y desconocidos en la respuesta estándar sin filtrar detalles internos.

**Verificación:**
*   `curl -X OPTIONS -H "Origin: https://sitio-ajeno.com"` devuelve 403.
*   Con un origen permitido devuelve 204 con las cabeceras CORS.
*   Swagger sigue funcionando porque es del mismo origen.

### Paso 6 - Catálogos

Primer corte vertical completo: valida la arquitectura de punta a punta.

*   `Ciudad`, `Rubro`, `ICatalogoRepository`, `GetCatalogosUseCase`, `MySqlCatalogoRepository`, controlador, rutas y Swagger.

**Verificación:** en Swagger, `GET /catalogos/ciudades` y `/catalogos/rubros` devuelven las 10 ciudades y los 10 rubros del seed.

### Paso 7 - Autenticación con JWT (regla 5)

*   `Usuario`, `Rol`, `IUsuarioRepository`, `IPasswordHasher`, `ITokenService`.
*   `BcryptPasswordHasher` (bcryptjs, coste 12, regla 17) y `JwtTokenService` (jose): el token lleva `sub` y `tv` (versión); no lleva el rol. Emprendedor sin `exp`; Admin con `exp` de 24 horas.
*   `LoginUseCase`: mismo error para correo inexistente y contraseña incorrecta, rechaza cuentas inactivas. Antes de comparar la contraseña, si hay 5 o más intentos fallidos para ese correo en los últimos 15 minutos (tabla `intentos_login`, regla 17) rechaza con 429 y `Retry-After`, sin comparar la contraseña. Cada intento fallido (contraseña incorrecta, cuenta inactiva o correo inexistente) inserta una fila; uno exitoso no borra las anteriores, simplemente deja de sumar.
*   Envoltorios `requireAuth` y `requireAdmin`. En cada petición: verifican firma y vigencia, cargan el usuario de la base, exigen `activo`, comparan `token_version` y leen el rol de la base.
*   `GET /auth/me`.

**Pruebas:** token de Emprendedor sin `exp`; token de Admin con 24 h; `tv` desactualizado rechazado; usuario inactivo rechazado; firma inválida rechazada; un token de Emprendedor no pasa `requireAdmin`; el sexto intento fallido en la ventana rechaza sin tocar `IPasswordHasher` (con reloj falso: fuera de la ventana, vuelve a permitir).

**Verificación en Swagger:** `POST /auth/login` con `admin@gmail.com` del seed, copiar el token en "Authorize" y ejecutar `GET /auth/me`.

### Paso 8 - OTP y correo (regla 15)

**8a. Sin proveedor real**
*   Puertos `IEmailSender` e `IOtpRepository`, y `ConsoleEmailSender` (escribe el código en la consola; solo desarrollo).
*   Código de 6 dígitos con `crypto.randomInt`, guardado solo como hash.
*   `RequestOtpUseCase`: máximo 1 solicitud por minuto y 5 por hora por correo (se cuenta en `otp_codigos`), invalida los códigos anteriores y responde igual exista o no la cuenta.
*   Validación: vigencia de 10 minutos, 5 intentos, un solo uso.
*   `ResetPasswordUseCase`: valida el OTP, guarda el hash nuevo, incrementa `token_version` y marca `email_verificado_en` si estaba vacío.
*   Cambio de correo: el OTP va al correo nuevo.
*   Endpoints de `/auth/password/*` y `/auth/email/*`.

**8b. Con proveedor real** (bloqueado hasta elegir proveedor y cuenta remitente)
*   `EmailSenderService` real y plantilla del correo en español, sobria.
*   Variables `EMAIL_*`. Prueba de envío a un buzón propio.
*   Garantizar que en desarrollo solo se use el adaptador de consola.

**Pruebas (reloj falso):** límites por minuto y por hora, expiración, intentos, un solo uso, misma respuesta con o sin cuenta, `token_version` incrementado y tokens anteriores rechazados tras restablecer.

**Verificación en Swagger:** solicitar el código, leerlo en la consola, restablecer la contraseña y comprobar que el token anterior ya no funciona.

### Paso 9 - Gestión de cuentas por el Admin (reglas 5, 10 y 15)

*   `POST /admin/usuarios/verificacion-correo`: envía el OTP `verificar_email`.
*   `POST /admin/usuarios` (`CreateUsuarioUseCase`): valida y consume el OTP, inyecta el rol Emprendedor (el cuerpo no admite `rol`), guarda nombres y apellidos por separado, hashea la contraseña inicial y fija `email_verificado_en`. Si el Admin no indica contraseña, se genera y se devuelve una sola vez.
*   `GET /admin/usuarios` y `PATCH /admin/usuarios/{id}/estado`.

**Pruebas:** sin token 401; token de Emprendedor 403; cuerpo con `rol` o `rol_id` 400; OTP inválido o vencido 400; correo duplicado 409; desactivar una cuenta hace que su token deje de valer en la siguiente petición.

**Verificación en Swagger:** flujo completo con el Admin del seed y login con la cuenta nueva.

### Paso 10 - Imágenes (reglas 4, 11 y 16)

**10a. Sin R2**
*   Puertos `IImageStorage` e `IImageProcessor`, y un almacenamiento en memoria para pruebas y desarrollo.
*   `ImageProcessorService` (sharp): detecta el tipo real por el contenido (JPEG, PNG o WebP), aplica la orientación EXIF y luego elimina los metadatos, redimensiona sin ampliar (perfil 800 px, logo 512 px, producto 1200 px), convierte a WebP con calidad 80. Rechaza más de 5 MB antes de procesar.
*   Ayudante de subida multipart con límites.
*   Constantes de las imágenes predeterminadas: `defaults/foto-perfil-anonima.webp` y `defaults/logo-vacio.webp`.

**10b. Con R2** (bloqueado hasta tener bucket, credenciales y dominio público)
*   `CloudflareImageService` con `@aws-sdk/client-s3` (`region: 'auto'`, endpoint de la cuenta): claves únicas (`perfiles/{uuid}.webp`, `logos/{uuid}.webp`, `productos/{uuid}.webp`), `ContentType: image/webp`, `CacheControl: public, max-age=31536000, immutable`, y `urlPublica(clave)`.
*   Al reemplazar una imagen se borra la anterior para no dejar archivos huérfanos.
*   Script `pnpm r2:subir-defaults` para subir las dos imágenes predeterminadas cuando estén creadas.

**Pruebas:** un JPEG grande sale como WebP más liviano y dentro de las dimensiones; no conserva EXIF ni GPS; un `.txt` renombrado a `.jpg` se rechaza; un archivo de más de 5 MB devuelve 413.

**Verificación:** subir una imagen real y abrir su URL pública.

### Paso 11 - Perfiles, Feed 1 (reglas 2, 3, 6 y 11)

*   Objetos de valor `Whatsapp` e `Instagram`, con pruebas de tabla:
    *   WhatsApp: limpia espacios, guiones y paréntesis; si son 8 dígitos bolivianos que empiezan con 6 o 7 antepone 591; si trae otro código de país explícito (`+` o `00`) lo respeta; guarda solo dígitos.
    *   Instagram: acepta `@usuario`, `instagram.com/usuario` (con barra final o parámetros) o `usuario`; persiste solo el usuario y valida los caracteres permitidos.
*   `Perfil` y `MySqlPerfilRepository`.
*   `CreatePerfilUseCase`: relación 1:1 (409 si ya existe), imágenes procesadas y subidas, y excepción explícita `usar_foto_predeterminada` / `usar_logo_predeterminado` (regla 11). Si falla el INSERT, borra las imágenes que ya subió.
*   `UpdatePerfilUseCase` (dueño o Admin), `GetPerfilesUseCase` (filtros por ciudad, rubro y texto, paginación y orden estable) y `GetPerfilUseCase`.
*   Perfiles de cuentas inactivas excluidos del catálogo (supuesto 1).

**Verificación en Swagger:** iniciar sesión como `aaron@gmail.com`, crear el perfil con imágenes de prueba, luego uno con la excepción de imágenes predeterminadas, y ver ambos en `GET /perfiles`.

### Paso 12 - Productos y marketplace, Feed 2 (reglas 7 y 8)

*   `Producto` y `Precio` (mayor o igual a 0, dos decimales).
*   Crear, editar, reemplazar imagen y desactivar (`activo = false`), solo el dueño o el Admin.
*   `GetMarketplaceUseCase` con la consulta de la regla 8 (`MAX` con `GROUP BY`). La consulta recibe `ahora` (UTC) como parámetro en lugar de usar `NOW()`, lo que permite probarla con reloj falso; devuelve una fila por producto con el mayor descuento vigente y excluye productos inactivos y de cuentas inactivas.
*   Salida según la regla 7 y el supuesto 7: sin precio o con precio oculto no se envían precios ni descuento.

**Pruebas de integración de la consulta:** descuento programado (aún no inicia), vigente, vencido, varios simultáneos (gana el mayor), producto sin precio y producto con `mostrar_precio` en falso.

**Verificación en Swagger:** crear productos y comprobar `precio`, `porcentaje` y `precio_con_descuento` en `GET /marketplace/productos`.

### Paso 13 - Descuentos (reglas 8 y 9)

*   `VigenciaDescuento` (dominio puro):
    *   Solo fecha: inicio a las `00:00:00` y fin a las `23:59:59`, ambos en -04:00.
    *   Fecha y hora sin zona: se interpreta como hora de La Paz.
    *   Con zona: se respeta.
    *   `fecha_fin` debe ser posterior a `fecha_inicio`. Método `estado(ahora)`: `programado`, `vigente` o `vencido`.
*   `CreateDescuentoUseCase` (porcentaje mayor a 0 y hasta 100), `UpdateDescuentoUseCase`, listado propio con estado calculado.
*   `AsignarDescuentoAProductoUseCase`: exige que producto y descuento sean del mismo perfil (regla 9); es idempotente. También la operación de quitar la asignación.

**Pruebas de bordes:** el último día cuenta completo (23:59:59 vigente, un segundo después vencido); inicio exacto; zona -04:00; sin fechas siempre vigente; `fecha_fin` anterior al inicio da 400; asignar un producto de otro perfil da 403.

**Verificación en Swagger:** crear un descuento navideño del 2026-12-01 al 2026-12-31, asignarlo a un producto y comprobar que hoy figura como `programado` y no se aplica en el marketplace.

### Paso 14 - Migración desde el Excel (reglas 4, 10, 11 y 12)

Bloqueado hasta contar con el archivo Excel y con acceso a los archivos de Drive.

*   `src/scripts/migrarDesdeExcel.ts` con `--dry-run` (por defecto) y `--ejecutar`, leyendo con `exceljs`.
*   Definir el mapeo de columnas con el Excel real: nombre, correo, WhatsApp, ciudad, rubro, Instagram, descripción, "Sube tu foto", "Sube el logo" y beneficio.
*   Por cada emprendedora, dentro de una transacción:
    1.  Separar el nombre (regla 10).
    2.  Sanear WhatsApp e Instagram.
    3.  Crear la ciudad y el rubro si no existen, normalizando mayúsculas y espacios.
    4.  Descargar las imágenes de Drive con tiempo límite y reintentos con espera creciente, procesarlas y subirlas a R2.
    5.  Crear la cuenta Emprendedor con contraseña aleatoria, correo sin verificar.
    6.  Crear el perfil.
*   Si una imagen falta o el enlace está roto, se usa la predeterminada y se registra en el reporte (regla 11).
*   Idempotente: la clave es el correo; una nueva ejecución no duplica.
*   Reportes en `reports/` (ignorado por git):
    *   `credenciales-<fecha>.csv`: correo y contraseña temporal.
    *   `revision-<fecha>.csv`: nombres ambiguos, imágenes faltantes, beneficios en texto libre, WhatsApp o Instagram no interpretables y duplicados.

**Verificación:** `--dry-run` sobre el Excel completo; ejecución en la base `catalogo_dev`; conteos coherentes (filas del Excel igual a perfiles creados más filas omitidas en el reporte).

**Riesgo:** Drive puede limitar descargas masivas; ejecutar por lotes con pausas.

### Paso 15 - Endurecimiento y calidad

*   Revisar el listado OWASP de seguridad de APIs: acceso a objetos ajenos (todo endpoint con `{id}` verifica dueño), asignación masiva (`.strict()`), enumeración de cuentas, exposición de datos sensibles y límites de tamaño.
*   **Limitar intentos de login** (supuesto 9): no está en las reglas de negocio. Si se acepta, documentar primero la regla y una tabla nueva de intentos (no sirve un contador en memoria en un entorno serverless).
*   Verificar que ningún registro de eventos contenga datos personales.
*   Prueba automática que recorre los `route.ts` y falla si alguna ruta no está en OpenAPI, o si le falta `security` o respuestas de error.
*   `pnpm audit` y revisión de dependencias.

**Verificación:** todo el listado revisado; la prueba de OpenAPI verde.

### Paso 16 - Despliegue en Hostinger

*   Comprar Hostinger Unlimited **y hacer primero la prueba de concepto dentro de los 30 días de reembolso**: una app mínima de Next.js con `mysql2` y `sharp`, comprobando el motor y la versión de la base, que la app quede siempre activa, que el build funcione con `pnpm`, que se pueda desplegar desde una subcarpeta del repositorio (`backend/` y `frontend/`), el envío por SMTP y el cambio de nameservers a Cloudflare.
*   Crear las dos apps Node.js (frontend y backend) desde el mismo repositorio de GitHub, cada una con su subcarpeta (`frontend/` y `backend/`) como raíz de la app, con Node.js 22 y las variables de entorno cargadas en el panel de cada app. En producción `DATABASE_URL` usa el host `localhost` de la base creada en hPanel.
*   Migraciones **manuales** antes de cada despliegue: activar MySQL remoto en hPanel con tu IP y ejecutar `pnpm db:migrate` con la `DATABASE_URL` de producción (con `?ssl=true` si el servidor lo ofrece); no se ejecutan en el build. Como el DDL no es transaccional, cada migración debe ser pequeña y reintentable (`IF NOT EXISTS`). Cerrar el acceso remoto al terminar.
*   Cloudflare: nameservers del dominio en Cloudflare, SSL en modo Full (strict), CDN de Hostinger desactivada y caché solo para `/_next/static/*` y las imágenes (nunca `/api/*` ni páginas con sesión). Dominio propio para R2 (ej. `cdn.midominio.com`).
*   CORS: `CORS_ALLOWED_ORIGINS` con el dominio real del frontend. No hay previsualizaciones por rama: se prueba en local y con Swagger en desarrollo (regla 1 estricta).
*   `SWAGGER_ENABLED=false` (o sin definir) en producción: con `true` el servidor se niega a arrancar. Verificar tras desplegar que `/docs` y `/api/v1/openapi.json` dan 404.
*   Cargar en el panel de Hostinger las variables de producción, incluidas las `R2_*` (pendiente: R2 postergado por el cliente) y `SMTP_*`; `EMAIL_DRIVER=console` no se admite en producción.
*   Primer Admin: plantilla de la directriz 10 de `schema.reference.sql` en phpMyAdmin, con los roles ya creados. El seed de desarrollo nunca se ejecuta en producción.
*   Bucket de R2 con dominio público y subida de las imágenes predeterminadas.
*   Respaldos (regla 17): implementado como `pnpm db:backup`/`pnpm db:restaurar` (AES-256-GCM, `docs/RESPALDOS.md`), además de los que ofrezca Hostinger. Hacia un bucket de R2 **privado y separado** del de las imágenes públicas. Falta programarlo como tarea diaria en hPanel al desplegar.
*   Prueba de humo tras desplegar: `/health`, login del Admin, crear una cuenta con OTP, crear perfil, producto y descuento, y ver el marketplace.
*   Reversión: volver a desplegar el commit anterior desde GitHub y, si una migración lo requiere, restaurar el respaldo.

### Paso 17 - Cierre

*   Actualizar `CLAUDE.md` en ambas carpetas (`backend/` y `frontend/`): sección 4 con la estructura real y sección 5 con el estado.
*   Regenerar `docs/openapi.json`.
*   `README.md` del backend con: instalar, variables, migrar, sembrar, abrir Swagger y correr las pruebas.
*   Entregar al frontend `docs/openapi.json` y la matriz de permisos.

## 8. Estrategia de pruebas

| Tipo | Qué cubre | Cómo se ejecuta |
|---|---|---|
| Unitarias | Dominio (WhatsApp, Instagram, vigencia, nombres) y casos de uso con repositorios en memoria y reloj falso | `pnpm test` |
| Integración | Repositorios y consultas SQL reales, incluida la consulta del marketplace y las restricciones | `pnpm test:integration` contra la base `catalogo_test` (`DATABASE_URL_TEST`) |
| Contrato | Toda ruta documentada en OpenAPI, con su seguridad | Dentro de `pnpm test` (`tests/seguridad/rutas.test.ts`) |
| Seguridad y robustez (caja blanca) | Autenticación de cada ruta, esquemas estrictos y acotados, SQL sin datos interpolados, registros y respuestas sin datos sensibles, secretos, JWT hostiles, arquitectura hexagonal, Swagger solo en desarrollo, ReDoS y cuerpos e imágenes hostiles | Dentro de `pnpm test` (`tests/seguridad/`) |
| No funcionales sobre la base real | Índices de cada filtro y carga concurrente sobre el pool | `pnpm test:integration` (`rendimiento.integration.test.ts`) |
| Manual | Cada paso se prueba en Swagger con el seed de desarrollo | Lista de verificación de cada paso |

## 9. Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Token de Emprendedor que nunca expira | Comprobar `activo` y `token_version` en cada petición; el rol se lee de la base |
| Correos con mala entrega o marcados como spam | Elegir proveedor con dominio propio verificado; puerto `IEmailSender` permite cambiarlo |
| Límites de descarga de Drive en la migración | Lotes, pausas, reintentos y modo `--dry-run` previo |
| `sharp` en Hostinger | Probarlo en la prueba de concepto del paso 16 (memoria y arranque) y no dejarlo para el final |
| Límite de conexiones de la base compartida | Pool pequeño (`DATABASE_POOL_MAX`, 5 por defecto) y una sola instancia del backend |
| CORS estricto bloquea las previsualizaciones | Lista explícita de orígenes por entorno o pruebas desde Swagger |
| Contraseña de desarrollo compartida en el seed | Archivo ignorado por git; el seed se niega a correr fuera de `development` |
| Fuerza bruta contra el login | Espera escalonada por correo cada 5 intentos fallidos (15 s a 10 min tope), tabla `intentos_login` (regla 17, paso 7; escalonado desde 2026-09-29) |
| Base, apps y respaldos en el mismo servidor | `mysqldump` diario cifrado hacia un bucket de R2 privado (regla 17) y respaldos de Hostinger (paso 16) |
