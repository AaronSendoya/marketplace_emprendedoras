# Entorno local del backend

Guía para desarrollar el backend en tu computador: MySQL local administrado con DBeaver, y Cloudflare R2 (real) para las imágenes. Hostinger (producción) queda para más adelante.

## Qué usa cada parte en esta fase

| Parte | Dónde vive | Estado |
|---|---|---|
| Base de datos | MySQL local (servicio de Windows, puerto 3306) | Local, con DBeaver como gestor |
| Bases de este proyecto | `catalogo_dev` (desarrollo) y `catalogo_test` (pruebas automáticas) | Se crean en el paso 2 |
| Imágenes | Cloudflare R2, un bucket de desarrollo | Real desde el principio |
| Backend | `pnpm dev` en `http://localhost:3001` | Local |
| Frontend | `http://localhost:3000` | Local |
| Hostinger | Bases, hosting y correo de producción | Aún no se usa; ver "Más adelante" |

Los scripts de este proyecto solo tocan las bases `catalogo_dev` y `catalogo_test`. Otras bases de tu servidor (por ejemplo las de otros proyectos) no se modifican.

## Requisitos

*   El servicio de MySQL en ejecución. En Windows: `Servicios` y buscar el de MySQL (en tu equipo se llama `MySQL94`, versión 9.4), o desde PowerShell `Get-Service MySQL94`.
*   Un usuario administrador de ese MySQL (normalmente `root`), el mismo que ya usas en DBeaver.
*   Node.js y pnpm, con las dependencias instaladas (`pnpm install`).

## Paso 1. Comprobar la conexión de DBeaver

1.  Abre DBeaver. En el panel izquierdo (`Conexiones` o `Proyectos`) debe aparecer tu conexión `localhost`.
2.  Haz doble clic en ella. Si conecta, ya tienes acceso de administrador y puedes seguir.
3.  Si pide contraseña, es la del usuario administrador de tu MySQL. Si DBeaver muestra `Public Key Retrieval is not allowed`, ve a la pestaña de propiedades del driver de esa conexión y pon `allowPublicKeyRetrieval` en `true` (solo es seguro porque es local).

## Paso 2. Crear las bases y el usuario

1.  Selecciona la conexión `localhost` y abre un script nuevo: menú `Editor SQL` y `Nuevo script` (o `Ctrl+]`). La barra superior debe indicar `localhost`.
2.  Abre el archivo [entorno-local.sql](entorno-local.sql), copia todo su contenido y pégalo en el script de DBeaver.
3.  Cambia las 4 apariciones de `CAMBIA_ESTA_CLAVE` por una clave que elijas. Anótala: la usarás en el paso 4.
4.  Ejecuta el script completo con `Alt+X` (`Ejecutar script`). `Ctrl+Enter` ejecuta solo una sentencia y dejaría el resto sin hacer.
5.  Al final, la pestaña de resultados debe mostrar `catalogo_dev` y `catalogo_test`.
6.  Pulsa `F5` sobre la conexión para refrescar el árbol y comprobar que ambas bases aparecen.

Qué crea: dos bases vacías con `utf8mb4` y el usuario `catalogo`, con permisos solo sobre esas dos bases. Es seguro repetirlo: usa `IF NOT EXISTS`.

## Paso 3. Conectar DBeaver con la base del proyecto (recomendado)

Sirve para mirar las tablas con el mismo usuario que usará el backend.

1.  Menú `Base de datos`, `Nueva conexión de base de datos`, elige `MySQL` y `Siguiente`.
2.  Rellena: `Host` = `localhost`, `Puerto` = `3306`, `Base de datos` = `catalogo_dev`, `Usuario` = `catalogo`, `Contraseña` = la del paso 2.
3.  Pulsa `Probar conexión`. Si DBeaver ofrece descargar el driver, acepta.
4.  En la pestaña `General`, ponle de nombre `catalogo_dev` y finaliza.
5.  Repite con `Base de datos` = `catalogo_test` y nombre `catalogo_test` si quieres ver también la de pruebas.

## Paso 4. Configurar `.env.local`

En la carpeta del backend, abre `.env.local` (no se sube a git) y deja estas dos líneas con tu clave:

```text
DATABASE_URL=mysql://catalogo:TU_CLAVE@127.0.0.1:3306/catalogo_dev
DATABASE_URL_TEST=mysql://catalogo:TU_CLAVE@127.0.0.1:3306/catalogo_test
```

*   Si la clave tiene caracteres especiales (`@ : / # ? %` o espacios), hay que codificarla. En una terminal: `node -e "console.log(encodeURIComponent('tu clave'))"` y pegas el resultado. Lo más simple es elegir una clave solo con letras y números.
*   `DATABASE_URL_TEST` debe apuntar a una base cuyo nombre contenga `test` y que no sea la de `DATABASE_URL`; si no, las pruebas se niegan a correr.
*   Las líneas de Neon que había antes quedaron comentadas y se pueden borrar.

## Paso 5. Crear las tablas y cargar los datos de prueba

En una terminal, dentro de la carpeta del backend:

```bash
pnpm db:migrate
pnpm db:seed:dev
```

La primera debe mostrar `aplicada: 0001_esquema_inicial.sql`, `aplicada: 0002_indices.sql` y `2 migración(es) aplicada(s).`. La segunda, `Totales: { roles: 2, ciudades: 10, rubros: 10, usuarios: 11 }`. Ambas se pueden repetir sin duplicar nada.

Para verlo en DBeaver: en la conexión `catalogo_dev`, pulsa `F5` sobre `Tablas`. Deben aparecer 10 tablas (`_migraciones`, `ciudades`, `descuentos`, `otp_codigos`, `perfiles_emprendedores`, `producto_descuentos`, `productos`, `roles`, `rubros`, `usuarios`). Prueba la consulta:

```sql
SELECT u.email, u.nombres, r.nombre AS rol
FROM usuarios u JOIN roles r ON r.id = u.rol_id
ORDER BY r.nombre, u.email;
```

Deben salir 11 filas: 1 `Admin` (`admin@gmail.com`) y 10 `Emprendedor`. La contraseña de desarrollo de todas está en `docs/seed.dev.sql` (archivo local, ignorado por git) y nunca se usa en producción.

## Paso 6. Ejecutar las pruebas de integración

```bash
pnpm test:integration
```

Aplican las migraciones a `catalogo_test` por su cuenta y usan solo esa base. Deben pasar las 70 pruebas. Si el resultado es distinto, mira la tabla de problemas al final.

## Paso 7. Arrancar el backend

```bash
pnpm dev
```

*   `http://localhost:3001/api/v1/health` debe responder `{"estado":"ok","base_de_datos":"ok"}`.
*   `http://localhost:3001/docs` abre Swagger (con `SWAGGER_ENABLED=true` en `.env.local`).
*   Si el puerto 3001 ya está en uso por un servidor anterior, ciérralo antes: seguía con la configuración vieja.

## Cloudflare R2 (imágenes)

R2 es lo único que se conecta al servicio real desde el principio. Conviene un bucket **solo de desarrollo**, para que las imágenes de prueba no se mezclen con las de producción. Los nombres de los menús son los de la documentación de Cloudflare a septiembre de 2026 y pueden cambiar.

1.  **Crear el bucket.** En el panel de Cloudflare, `R2 object storage`, `Create bucket`. Nombre sugerido: `catalogo-dev`.
2.  **URL pública de desarrollo.** Abre el bucket, `Settings`, sección `Public Development URL`, `Enable`, escribe `allow` y confirma. Copia la URL que muestra (`https://pub-...r2.dev`). Esa URL tiene límite de peticiones y es solo para desarrollo, no para producción.
3.  **Credenciales.** En la página `R2 object storage`, sección `Account Details`, junto a `API Tokens` pulsa `Manage`. Crea un token (`Create Account API token` o `Create User API token`) con el permiso `Object Read & Write` y limitado al bucket `catalogo-dev`. Al terminar copia el `Access Key ID` y el `Secret Access Key`: **el secreto se muestra una sola vez**. La página también muestra el endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`; el `ACCOUNT_ID` es el tramo del medio.
4.  **`.env.local`.** Completa las cinco variables:

    ```text
    R2_ACCOUNT_ID=el_id_de_tu_cuenta
    R2_ACCESS_KEY_ID=el_access_key_id
    R2_SECRET_ACCESS_KEY=el_secreto
    R2_BUCKET=catalogo-dev
    R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
    ```

    `R2_PUBLIC_URL` va sin barra final. Las cinco van juntas: con solo algunas, el backend no arranca y avisa cuáles faltan. Con las cinco vacías, R2 queda sin configurar (permitido en desarrollo).

Estado: el código que sube y sirve imágenes llega en el paso 10b del plan. Hasta entonces el backend solo valida estas variables; no envía nada a R2. Nunca subas el secreto a git: `.env.local` está ignorado.

## Más adelante: producción en Hostinger

Nada de esto se usa todavía. En `.env.example` y `.env.local` hay líneas comentadas listas para cuando exista la base de Hostinger.

*   **App desplegada.** La base y el backend comparten servidor: `DATABASE_URL` usa el host `localhost` y las variables se cargan en el panel de la app Node.js de Hostinger, no en un archivo. También `APP_ENV=production`, `SWAGGER_ENABLED=false` y un bucket de R2 propio de producción con dominio propio.
*   **Migrar desde tu computador.** En hPanel se activa el acceso remoto a MySQL con tu IP y se ejecuta una sola vez, pasando la URL por la terminal para que no quede escrita en ningún archivo (`?ssl=true` si el servidor lo ofrece):

    ```bash
    DATABASE_URL="mysql://USUARIO:CLAVE@HOST_REMOTO:3306/BASE" pnpm db:migrate
    ```

    Después se cierra el acceso remoto. **No pegues la URL de producción como línea activa en `.env.local`**: con ella `pnpm dev` y las pruebas trabajarían sobre datos reales. El seed (`db:seed:dev`) se niega a correr salvo con `APP_ENV=development`, pero no debe ni intentarse en producción.
*   El primer Admin de producción se crea con la plantilla de la directriz 10 de `docs/schema.reference.sql`.

## Reiniciar la base de desarrollo

Para empezar de cero (borra todos los datos de `catalogo_dev`; **nunca** lo ejecutes contra otra base):

```sql
DROP DATABASE catalogo_dev;
CREATE DATABASE catalogo_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Luego repite `pnpm db:migrate` y `pnpm db:seed:dev`. Como el usuario `catalogo` ya tiene permisos sobre `catalogo_dev.*`, no hace falta volver a otorgarlos.

## Problemas frecuentes

| Mensaje o síntoma | Causa probable | Qué hacer |
|---|---|---|
| `La base de datos rechazó el usuario o la contraseña` | Clave mal copiada, o con caracteres especiales sin codificar | Revisa `DATABASE_URL`; usa una clave simple o codifícala (paso 4) |
| `No se pudo conectar a la base de datos` | El servicio de MySQL está apagado, o el puerto no es el 3306 | Inicia el servicio en `Servicios`; confirma el puerto en la conexión de DBeaver |
| `La base de datos de la cadena de conexión no existe` | Falta ejecutar el paso 2, o el nombre está mal escrito | Repite el paso 2 y compara el nombre en la URL |
| `El usuario no tiene permisos sobre esa base` | El usuario se creó sin los `GRANT` | Repite el paso 2 completo con `Alt+X` |
| `DATABASE_URL_TEST apunta a la misma base que DATABASE_URL` | Las dos URL nombran la misma base | Usa `catalogo_test` en la de pruebas |
| `El nombre de la base de pruebas ... debe contener "test"` | La base de pruebas tiene otro nombre | Renómbrala o crea una que contenga `test` |
| `Configuración de entorno inválida` al arrancar | Falta o está mal una variable de `.env.local` | El mensaje dice cuál; compárala con `.env.example` |
| `Faltan tablas` al ejecutar el seed | No se aplicaron las migraciones | Ejecuta `pnpm db:migrate` primero |
| `EADDRINUSE ... 3001` | Otro servidor ocupa el puerto | Cierra el servidor anterior de `pnpm dev` |
| DBeaver: `Public Key Retrieval is not allowed` | MySQL 8 o superior con el usuario nuevo | Propiedad `allowPublicKeyRetrieval=true` en el driver (solo local) |
| Una migración falla a la mitad | MySQL no revierte el DDL | El mensaje lo indica: revisa el esquema y corrige antes de reintentar |
