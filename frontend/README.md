# Frontend del catálogo "Track de Mujeres 2026"

Aplicación Next.js 16 (React 19, Tailwind v4, TypeScript estricto) que consume la API del backend y se despliega en Hostinger.

**Ubicación:** esta carpeta es `market_Pista8/frontend`; el backend es su hermano `market_Pista8/backend`. Ambas viven en un único repositorio git; el mapa del proyecto está en [../README.md](../README.md). Todos los comandos de este documento se ejecutan dentro de `frontend/`.

**Estado:** fase 1 (catálogo público) implementada y probada contra el backend real — ver el detalle en la sección 5 de [CLAUDE.md](CLAUDE.md).

- Reglas de negocio, modelo de datos (contrato compartido con el backend) y lineamientos de diseño: [CLAUDE.md](CLAUDE.md).
- Contrato de la API: [../backend/docs/openapi.json](../backend/docs/openapi.json). Permisos por rol: [../backend/docs/MATRIZ_PERMISOS.md](../backend/docs/MATRIZ_PERMISOS.md). Se leen del backend; no se copian aquí.
- Esta versión de Next.js tiene cambios incompatibles con lo habitual: lee [AGENTS.md](AGENTS.md) antes de escribir código.

## Requisitos

Node.js 22 (Next 16 exige 20.9 o superior) y pnpm.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # completa BACKEND_URL si no es el valor por defecto
pnpm dev      # http://localhost:3000
```

En desarrollo el backend corre en `http://localhost:3001` (ver [../backend/README.md](../backend/README.md); necesita MySQL local, con `pnpm db:migrate` y `pnpm db:seed:dev` ya corridos). Los dos se levantan en paralelo y con puertos distintos para no chocar. Sin backend corriendo, las páginas que hacen fetch muestran la pantalla de error (`app/error.tsx`), no un crash.

`.env.local` no se versiona; `.env.example` documenta cada variable (`BACKEND_URL`, `NEXT_PUBLIC_IMAGENES_HOST`). En producción `BACKEND_URL` debe ser `https://`: si no, el servidor no arranca (excepción: `localhost` y `127.0.0.1`). Mientras el backend no tenga R2 conectado, las fotos del catálogo se muestran como un marcador neutro (`MarcadorImagen`) en vez de romper `next/image`.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo (puerto 3000) |
| `pnpm build` / `pnpm start` | Compilación y servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm test` | Pruebas (`node --test`, sin dependencias): política CSP y cabeceras, destinos de retorno, validación de `BACKEND_URL`, renovación de la cookie de sesión, parámetros de la URL, mensajes de error del backend, resumen de textos y los cálculos del Dashboard (`src/lib/metricas/`) |

## Despliegue

Hostinger, como app Node.js aparte del backend (sección 1 de [CLAUDE.md](CLAUDE.md)). Que ambas carpetas vivan en un único repositorio no cambia el despliegue: son dos apps distintas.
