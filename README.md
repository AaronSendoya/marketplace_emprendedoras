# Catálogo "Track de Mujeres 2026"

Repositorio único del proyecto. Reúne, una junto a la otra, las dos aplicaciones del catálogo: la API (`backend/`) y la aplicación web (`frontend/`). **Siguen siendo independientes**: no usan espacios de trabajo de pnpm, cada una tiene su propio `package.json` y `pnpm-lock.yaml`, se instala, se ejecuta y se prueba dentro de su carpeta, y se despliega como una app aparte.

## Estructura

```text
market_Pista8/
  .gitignore           único para todo el repositorio (backend/ y frontend/)
  README.md            este mapa
  CLAUDE.md            instrucciones para Claude en esta carpeta (importa este README)
  backend/             API (Next.js 16 solo rutas, arquitectura hexagonal, MySQL, R2)
  frontend/            aplicación Next.js 16 (React 19, Tailwind v4)
```

| Carpeta | Aplicación | Puerto local | Empezar por |
|---|---|---|---|
| [backend/](backend/) | API | 3001 | [backend/README.md](backend/README.md) y [backend/CLAUDE.md](backend/CLAUDE.md) |
| [frontend/](frontend/) | Next.js | 3000 | [frontend/README.md](frontend/README.md) y [frontend/CLAUDE.md](frontend/CLAUDE.md) |

Cada aplicación tiene su propio `package.json`, `pnpm-lock.yaml`, `README.md`, `CLAUDE.md` y `AGENTS.md`. Los comandos de pnpm, pruebas y scripts se ejecutan **dentro** de la carpeta de la aplicación; git se ejecuta en la raíz.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Reglas de negocio, infraestructura y modelo de datos (secciones 1 a 4) | `backend/CLAUDE.md` y `frontend/CLAUDE.md`, idénticas: son el contrato compartido |
| Estructura de directorios del backend (arquitectura hexagonal) | `backend/CLAUDE.md`, sección 4 (rutas relativas a `backend/`) |
| Lineamientos de diseño de la interfaz | `frontend/CLAUDE.md`, sección 6 |
| Contrato de la API para el frontend | `backend/docs/openapi.json` y `backend/docs/MATRIZ_PERMISOS.md` |
| Esquema de base de datos versionado | `backend/db/migrations/` |
| Referencia del esquema y seed de desarrollo (locales, ignorados por git) | `backend/docs/schema.reference.sql` y `backend/docs/seed.dev.sql` |
| Plan de implementación, seguridad y entorno local | `backend/docs/` |
| Variables de entorno | `backend/.env.example` (las reales, en `backend/.env.local`, no se versionan) |

Una regla de negocio nueva o modificada se documenta primero en el `CLAUDE.md` de ambas carpetas y después se implementa (regla de mantenimiento al inicio de cada `CLAUDE.md`).

## Trabajar en local

Las dos aplicaciones se levantan en paralelo, con puertos distintos para no chocar:

```bash
# Backend: necesita MySQL local con catalogo_dev y catalogo_test (ver backend/docs/ENTORNO_LOCAL.md)
cd backend
pnpm install
pnpm dev             # http://localhost:3001

# Frontend
cd frontend
pnpm install
pnpm dev             # http://localhost:3000
```

## Git

Hay un único `.gitignore`, el de esta raíz, y no se crean otros dentro de `backend/` ni `frontend/`. Un patrón sin `/` inicial vale en cualquier carpeta (por ejemplo `node_modules/`, `.next/`, `.env*`); uno con `/` inicial es relativo a la raíz: `/*/build/` es `backend/build/` y `frontend/build/`, y `/backend/docs/seed.dev.sql` solo afecta al backend. Lo específico de una aplicación va en el bloque final del `.gitignore`.

Las variables de entorno (`.env*`) nunca se versionan; solo `.env.example`.

## Despliegue

Sin cambios respecto a lo documentado: dos apps Node.js separadas en Hostinger, dominios distintos, MySQL del mismo plan y Cloudflare (DNS, CDN y R2). Cada app se despliega desde su subcarpeta (`backend/` o `frontend/`); comprobar en hPanel que lo permite está anotado como pendiente en la sección 1 de cualquiera de los `CLAUDE.md`.
