# Backend del catálogo "Track de Mujeres 2026"

API Node.js sobre Next.js 16 (solo rutas, sin frontend) con arquitectura hexagonal, MySQL/MariaDB y Cloudflare R2. La consume el frontend (`../frontend`) y se despliega en Hostinger.

**Ubicación:** esta carpeta es `market_Pista8/backend`; el frontend es su hermano `market_Pista8/frontend`. Ambas viven en un único repositorio git; el mapa del proyecto está en [../README.md](../README.md). Todos los comandos de este documento se ejecutan dentro de `backend/`.

- Reglas de negocio, modelo de datos y estructura del código: [CLAUDE.md](CLAUDE.md).
- Plan de implementación y decisiones: [docs/PLAN_IMPLEMENTACION_BACKEND.md](docs/PLAN_IMPLEMENTACION_BACKEND.md).
- Contrato y permisos para el frontend: [docs/MATRIZ_PERMISOS.md](docs/MATRIZ_PERMISOS.md) y [docs/openapi.json](docs/openapi.json).
- Revisión de seguridad: [docs/SEGURIDAD.md](docs/SEGURIDAD.md).
- Entorno local paso a paso (bases, DBeaver, R2): [docs/ENTORNO_LOCAL.md](docs/ENTORNO_LOCAL.md).

## Requisitos

Node.js 22 (Next 16 exige 20.9 o superior), pnpm y un MySQL 8.0+ o MariaDB 10.4+ local con dos bases vacías: `catalogo_dev` y `catalogo_test` (script en `docs/entorno-local.sql`).

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # completa DATABASE_URL, DATABASE_URL_TEST y JWT_SECRET (ver abajo)
pnpm db:migrate              # aplica db/migrations/ (historial en la tabla _migraciones)
pnpm db:seed:dev             # datos de desarrollo: 1 Admin y 10 Emprendedor (solo con APP_ENV=development)
pnpm dev                     # http://localhost:3001
```

El seed lo lee de `docs/seed.dev.sql`, un archivo local ignorado por git. Genera el `JWT_SECRET` (mínimo 32 caracteres) con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Variables de entorno

Todas están en [.env.example](.env.example) y se validan al arrancar (`src/shared/config/env.ts`): si falta o sobra algo, el servidor no arranca (en producción termina con un mensaje claro).

| Variable | Uso |
|---|---|
| `APP_ENV` | `development`, `test` o `production` (sin valor por defecto) |
| `DATABASE_URL`, `DATABASE_URL_TEST`, `DATABASE_POOL_MAX` | Base de datos, base de pruebas (su nombre debe contener "test") y tamaño del pool |
| `JWT_SECRET` | Firma de los tokens |
| `CORS_ALLOWED_ORIGINS` | Dominio(s) del frontend, sin comodines |
| `SWAGGER_ENABLED` | `true` solo con `APP_ENV=development`; fuera de desarrollo el servidor no arranca con `true` |
| `R2_*` | Bucket de imágenes. **Pendiente de conectar** (el cliente lo postergó): sin ellas, en desarrollo las imágenes van a memoria |
| `EMAIL_DRIVER`, `EMAIL_FROM`, `SMTP_*` | Correo de los códigos OTP. `console` solo en desarrollo; producción exige `smtp` |

## Swagger (solo desarrollo)

Con `SWAGGER_ENABLED=true` en `.env.local`, abre <http://localhost:3001/docs>. Para probar rutas protegidas: `POST /auth/login` con una cuenta del seed (`admin@gmail.com` o `aaron@gmail.com`; la contraseña de desarrollo está en el seed), copia el `token` y pégalo en **Authorize**. En desarrollo los códigos OTP aparecen en la consola del servidor. En producción no hay Swagger: el contrato es `docs/openapi.json` (`pnpm openapi:export` lo regenera).

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Servidor de desarrollo, compilación y servidor de producción (puerto 3001) |
| `pnpm typecheck` / `pnpm lint` | Tipos (genera antes los tipos de Next) y ESLint |
| `pnpm test` | Pruebas unitarias y de seguridad de caja blanca (sin base de datos) |
| `pnpm test:integration` | Pruebas contra la base `catalogo_test` (restricciones, vigencia de descuentos, índices, carga) |
| `pnpm db:migrate` | Migraciones pendientes (una ya aplicada que se edita detiene la ejecución) |
| `pnpm db:seed:dev` | Seed de desarrollo |
| `pnpm openapi:export` | Regenera `docs/openapi.json` |
| `pnpm r2:subir-defaults` | Sube las dos imágenes predeterminadas al bucket (cuando R2 esté configurado) |
| `pnpm audit` | Vulnerabilidades de las dependencias (antes de cada despliegue) |

## Antes de entregar un cambio

`pnpm typecheck && pnpm lint && pnpm test && pnpm test:integration && pnpm build`. Un cambio de reglas de negocio se documenta primero en `CLAUDE.md` de ambas carpetas (`backend/CLAUDE.md` y `../frontend/CLAUDE.md`). Una ruta nueva se registra en `src/api/openapi/documento.ts`; `tests/seguridad/` falla si queda sin autenticación o sin documentar.

## Pendientes

- Proveedor de correo real (paso 8b) y bucket de R2 (paso 10b).
- Migración desde el Excel (paso 14, necesita el archivo) y despliegue en Hostinger (paso 16).
