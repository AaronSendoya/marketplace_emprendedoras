# Plan de implementación del frontend

Catálogo "Track de Mujeres 2026" - Frontend (`market_Pista8/frontend`)

Estado: planificación, sin código propio todavía. Fecha del plan: 2026-09-28.

Fuente de las reglas de negocio y el contrato de datos: [CLAUDE.md](../CLAUDE.md) (secciones 1 a 4, idénticas al backend) y sección 6 (lineamientos de diseño, solo de esta carpeta). Contrato de la API: `../backend/docs/openapi.json` y `../backend/docs/MATRIZ_PERMISOS.md`.

## 0. Punto de partida: el prompt del usuario, contrastado con lo que ya existe

El usuario trajo un prompt externo ("Frontend Architect... Marketplace Institucional") con una especificación de componentes. Se aprovecha su estructura (Navbar, Landing, CatalogLayout, EmprendedoraCard) porque coincide en lo esencial con el proyecto real, pero se corrige en cinco puntos donde chocaba con reglas ya definidas o con el contrato de la API:

| # | Lo que traía el prompt | Por qué no aplica tal cual | Ajuste |
|---|---|---|---|
| 1 | Paleta con **dos** acentos: naranja (`orange-600`) para CTA y rosa (`rose-600`) para promociones | `CLAUDE.md` sección 6, regla 2: "como máximo, un solo color de acento". Es una regla ya aprobada, anterior a este prompt | Un solo acento en todo el sitio (decisión de color pendiente de tu confirmación, sección 8) |
| 2 | Imagen única en la cabecera de `EmprendedoraCard` ("imagen del emprendimiento o logo") | Regla 11: foto de perfil y logo son **dos archivos independientes**; nunca se genera una imagen combinada en el backend. El collage es responsabilidad exclusiva del frontend, y la sección 6 ya lo marca como "Pendiente: definir la composición concreta" | La cabecera de la card es el collage foto+logo (propuesta concreta en la sección 6.4) |
| 3 | Badge "%" de promoción activa en `EmprendedoraCard` | El esquema `Perfil` de `openapi.json` (el que alimenta el feed de emprendedoras) no trae ningún campo de descuento; esa información solo existe en el feed de productos (`ProductoPublico.porcentaje`) | Se retira de la card de emprendedora en esta primera versión (detalle en sección 8) |
| 4 | CTA "Súmate a la comunidad" en la Navbar y en el Hero | Regla 5: "No existen rutas públicas de registro". Un botón que sugiere autorregistro contradice la regla | Texto cambiado a "Explorar la comunidad" (igual en Navbar y Hero), sin insinuar registro; lleva a `/emprendedoras` |
| 5 | Card muestra "Teléfono en texto plano" además del botón de WhatsApp | `whatsapp` ya se usa para el botón (`wa.me`); repetirlo como texto suelto es ruido visual que la sección 6 regla 4 ("superficies discretas") desaconseja | Se retira el texto plano; el número vive solo en el enlace del botón |

Las dos secciones del catálogo del prompt ("Emprendedoras" y "Promociones") mapean 1 a 1 con los dos feeds que ya tiene el backend:

- **"Emprendedoras"** → `GET /api/v1/perfiles` (Feed 1, perfiles).
- **"Promociones"** → `GET /api/v1/marketplace/productos` (Feed 2, productos con precio/descuento ya calculados).

## 1. Alcance de este plan (fase 1)

Cubre el **catálogo público**: Navbar, Landing, los dos catálogos (Emprendedoras y Promociones) con sus tarjetas, y el detalle de un perfil y de un producto. Todo sin sesión iniciada, tal como especifica el prompt original.

**Fuera de esta fase** (se planifica aparte cuando se indique):
- Login y sesión (cookie `httpOnly`, regla 5).
- Panel de la Emprendedora: mi perfil, mis productos, mis descuentos.
- Panel del Admin: gestión de cuentas.
- Recuperación de contraseña por OTP.

## 2. Decisiones técnicas

| Área | Decisión | Motivo |
|---|---|---|
| Renderizado | Server Components para layouts, listas y detalle (`fetch` directo al backend en el servidor) | Regla 3 del prompt (rendimiento); evita exponer la URL del backend al navegador y permite cachear con control fino |
| Interactividad | Client Components solo donde hace falta estado del navegador: buscador, selects de filtro, cualquier modal | Igual que el prompt original; todo lo demás se sirve estático desde el servidor |
| Caché del feed | `fetch(..., { next: { revalidate: 30 } })` en los dos catálogos (ajustable) | Regla 8: la vigencia de los descuentos se evalúa al consultar; no cachear más tiempo del retraso tolerable |
| Imágenes | `next/image` apuntando a la URL completa que ya entrega la API (`foto_perfil_url`, `logo_url`, `imagen_url`) | La API nunca envía claves de R2, solo URLs (convención del contrato) |
| Dominio de imágenes remotas | `images.remotePatterns` en `next.config.ts` apuntando al dominio de R2 (`R2_PUBLIC_URL`, pendiente hasta el paso 10b del backend) | Next exige declarar los dominios externos de `next/image` |
| Estilos | Tailwind v4 (ya instalado), tokens de color como variables CSS en `@theme`, sin librería de componentes de terceros | Coherente con "paleta contenida" de la sección 6; una librería traería su propio lenguaje visual |
| Iconos | `lucide-react` (una sola librería, trazo simple, sin relleno) | Sección 6 regla 5: "solo iconos de línea simples" |
| Tipografía | Una sola familia (a elegir, sección 8) cargada con `next/font`, ya sea Google Fonts o local | Sección 6 regla 3: jerarquía por tamaño y peso, no por color |
| Formularios/estado de UI | Nativo de React (`useState`, `useTransition`); sin librería de formularios para esta fase (no hay formularios de escritura todavía) | La fase 1 es de solo lectura |

## 3. Arquitectura de información (rutas)

```text
/                       Landing (bienvenida)
/emprendedoras          Catálogo de perfiles (Feed 1)
/emprendedoras/[id]     Detalle de un perfil
/promociones            Catálogo de productos con descuento vigente (Feed 2)
/productos/[id]         Detalle de un producto
/iniciar-sesion         Login (placeholder de esta fase; implementación en la fase 2)
```

`/emprendedoras` y `/promociones` comparten el mismo `CatalogLayout` (buscador + filtros + grid), cambiando solo el origen de datos, el texto de cabecera y la tarjeta que renderizan.

## 4. Estructura de carpetas

```text
/src
  /app
    layout.tsx                    (fuente tipográfica, <html>, metadatos)
    page.tsx                      (Landing)
    /emprendedoras
      page.tsx                    (Server Component: fetch + <CatalogLayout>)
      /[id]/page.tsx
    /promociones
      page.tsx
      /* estructura idéntica a emprendedoras */
    /productos/[id]/page.tsx
    /iniciar-sesion/page.tsx      (placeholder, fase 2)
  /components
    /atoms                        (Badge, Button, Input, Select, IconLink, Skeleton)
    /molecules                    (SearchBar, FilterSelect, SocialLinks, PriceTag, EmprendedoraCard, ProductoCard)
    /organisms                    (Navbar, Footer, Hero, FeatureGrid, CatalogToolbar, CatalogGrid)
    /templates                    (CatalogLayout)
  /lib
    /api
      cliente.ts                  (fetch tipado hacia el backend; base URL desde variable de entorno)
      perfiles.ts                 (listarPerfiles, obtenerPerfil)
      productos.ts                (listarProductos, obtenerProducto)
      catalogos.ts                (listarCiudades, listarRubros)
      tipos.ts                    (tipos TypeScript calcados de openapi.json: Perfil, ProductoPublico, Pagina<T>...)
    /formato
      whatsapp.ts                 (arma el enlace wa.me a partir del número ya saneado que entrega la API)
      precio.ts                   (formatea moneda; NO calcula precios, regla 7)
  /styles (si algo no cabe en globals.css con @theme)
/public
  logo/                           (variante del logo lista para fondo claro; ver sección 8)
```

Todo componente sigue el patrón átomo → molécula → organismo → plantilla del prompt original; se conserva porque no choca con nada de `CLAUDE.md`.

## 5. Contrato de datos por componente

Se cita el campo exacto de `openapi.json`, no un nombre inventado, para que la implementación no tenga que adivinar.

### 5.1 `EmprendedoraCard` ← `Perfil`
```
nombre_negocio, descripcion, emprendedora, whatsapp,
instagram_username (nullable), otra_red_social (nullable),
ciudad.nombre, rubro.nombre, foto_perfil_url, logo_url
```
Sin campo de descuento: se decidió no mostrar el badge de promoción en esta card (el dato no existe en `Perfil`); vive solo en `ProductoCard`, que es donde el backend lo calcula.

### 5.2 `ProductoCard` ← `ProductoPublico`
```
nombre, descripcion (nullable), imagen_url,
precio (nullable), porcentaje (nullable), precio_con_descuento (nullable),
consultar_precio (boolean),
perfil.nombre_negocio, perfil.whatsapp, perfil.ciudad.nombre, perfil.rubro.nombre
```
Regla 7/8: el frontend **nunca** decide cuándo mostrar "Consultar Precio" ni calcula el precio con descuento; ambos ya vienen resueltos. La lógica de la card es puramente de presentación:
- `consultar_precio === true` → botón "Consultar Precio" hacia `wa.me/{perfil.whatsapp}`.
- si no, y `porcentaje` no es `null` → mostrar precio tachado (`precio`), precio final (`precio_con_descuento`) y el badge del porcentaje.
- si no, y `porcentaje` es `null` → mostrar solo `precio`.

### 5.3 `CatalogToolbar` (buscador + filtros)
- Input de texto → parámetro `q` (perfiles y productos lo soportan igual).
- Select "Ciudad" → `ciudad_id`, opciones desde `GET /catalogos/ciudades`.
- Select "Rubro" → `rubro_id`, opciones desde `GET /catalogos/rubros`.
- El campo "Track de Mujeres" del prompt original no tiene equivalente en el modelo de datos (no existe una tabla de cohortes o ediciones). Se omite en esta fase; si tu cliente lo necesita, es una regla nueva que hay que documentar primero en ambos `CLAUDE.md` (probablemente una columna nueva en `perfiles_emprendedores`, al estilo de `otra_red_social`).
- Los tres controles actualizan la URL (`useSearchParams`/`router.push`) para que el resultado sea enlazable y el fetch del Server Component reaccione al cambiar de página.

### 5.4 Paginación
`Pagina<T>` = `{ datos: T[], paginacion: { pagina, limite, total } }`. Grid de `cols-1 md:cols-2 lg:cols-3` como pide el prompt, con un paginador simple (anterior/siguiente + número de página) debajo del grid; sin scroll infinito en esta fase (más simple de cachear y de depurar).

## 6. Identidad visual

### 6.1 Punto de partida: lo que ya usa el cliente
Las imágenes en `public/` (`Portada 1.png`, `Portada 2.png`, `TDM logo atemporal.png`) muestran el material real de "Track de Mujeres": fotografía documental de las emprendedoras en eventos, con un duotono naranja-a-morado superpuesto y tipografía blanca de trazo grueso para el nombre del programa. Es justo el tipo de "degradado llamativo y combinación multicolor" que la sección 6 de `CLAUDE.md` ya prohíbe (regla escrita antes de este prompt, y que tu propio mensaje de ahora reafirma: "0 colores muy mezclados").

La resolución no es ignorar el material del cliente ni copiarlo literal: es **extraer** lo que sí es de marca (el nombre "Track de Mujeres", la fotografía real de las emprendedoras, el tono cálido y cercano) y **expresarlo** con la disciplina de un solo acento y superficies neutras. La fotografía documental se sigue usando (por ejemplo en el Hero), pero sin el overlay de duotono: una superposición sutil de un solo tono (el acento, a baja opacidad) o ninguna, según lo que se vea mejor en la maqueta.

`TDM logo atemporal.png` se ve en blanco al abrirlo porque el logo probablemente es blanco/claro pensado para fondo oscuro; hace falta una variante para fondo claro (la Navbar es `bg-white` por la sección 6 regla 4). Ver punto pendiente en sección 8.

### 6.2 Paleta (tokens propuestos)
Neutros + un acento, como token de Tailwind v4 (`@theme` en `globals.css`), no como clase suelta, para que cambiarlo después sea un solo lugar:

```css
--color-fondo: #FAFAF9;            /* stone-50: fondo global, más cálido que un gris puro */
--color-superficie: #FFFFFF;       /* cards, navbar, modales */
--color-borde: #E7E5E4;            /* stone-200: bordes finos */
--color-texto: #1C1917;            /* stone-900 */
--color-texto-secundario: #57534E; /* stone-600 */
--color-acento: #9D174D;           /* magenta/ciruela: único acento del sitio, decidido en la sección 8 */
--color-acento-hover: #831843;     /* un tono más oscuro, para hover/active */
--color-acento-suave: #FDF2F8;     /* fondo tenue del mismo tono, para badges y resaltados sutiles */
```
`stone` en vez de `slate` porque es un neutro más cálido, más cercano a la fotografía documental cálida del cliente que un gris azulado.

### 6.3 Tipografía (decidido 2026-09-28)
Dos familias con rol fijo, cada una vía `next/font/google` (reemplaza la idea inicial de una sola familia; ver `CLAUDE.md` sección 6, regla 3):
- **Plus Jakarta Sans** — títulos (`H1`-`H3`), nombre del emprendimiento en las cards y cifras grandes (precio, porcentaje). Geométrica, peso `bold`/`extrabold`.
- **Inter** — cuerpo, badges, descripciones, botones y cualquier texto pequeño. Se prefirió sobre Geist porque el proyecto no vive en la plataforma de Vercel (despliega en Hostinger) y no hay razón para atarse a esa tipografía; Inter es el estándar más neutral y probado en tamaños chicos.
- La jerarquía sigue viniendo de tamaño y peso, nunca de color (regla 3 de la sección 6 de `CLAUDE.md`); estas dos familias no se mezclan dentro de un mismo tipo de texto (un título nunca usa Inter, un badge nunca usa Plus Jakarta Sans).

### 6.4 El collage de perfil (resuelve el "Pendiente" de la sección 6.9 de `CLAUDE.md`)
Propuesta concreta, del mismo patrón que usan la mayoría de redes profesionales (LinkedIn, Facebook) porque ya es un lenguaje visual reconocible y no requiere inventar interacción nueva:
- La **foto de perfil** ocupa todo el ancho de la cabecera de la card (`aspect-[4/3]` u similar, `object-cover`).
- El **logo** se muestra como un círculo pequeño (por ejemplo 56–64 px), con un borde blanco de 2-3 px, superpuesto en la esquina inferior izquierda de la foto, montado a caballo entre la imagen y el cuerpo de la card.
- Con la imagen predeterminada (regla 11) el collage se arma igual: no hay caso especial, porque `foto_perfil_url` y `logo_url` siempre existen (son `NOT NULL`).

## 7. Roadmap de implementación (pasos)

| Paso | Contenido | Definición de terminado |
|---|---|---|
| 1 | Base del proyecto: tokens de color en `globals.css`, fuente con `next/font`, `lucide-react` instalado, `lib/api/cliente.ts` y `lib/api/tipos.ts` | `pnpm typecheck`, `pnpm lint`; un `fetch` de prueba a `/api/v1/health` del backend funciona desde un Server Component |
| 2 | Átomos y moléculas base: `Button`, `Badge`, `Input`, `Select`, `SocialLinks`, `PriceTag` | Cada uno con una historia mínima de uso (sin Storybook: una página `/dev/componentes` temporal, o capturas) |
| 3 | `Navbar` + `Footer` | Sticky, responsive, enlaces a las rutas de la sección 3 |
| 4 | `EmprendedoraCard` (con el collage) + `CatalogToolbar` + `CatalogGrid` + paginador | Renderiza con datos reales del backend local (`pnpm dev` en `backend/` con la base sembrada) |
| 5 | Página `/emprendedoras` completa (Server Component + filtros funcionando vía URL) | Filtrar por ciudad, rubro y texto da resultados correctos; paginar funciona |
| 6 | `ProductoCard` + página `/promociones` | Los tres estados de precio (oculto, con descuento, normal) se ven distintos y correctos |
| 7 | Detalle `/emprendedoras/[id]` y `/productos/[id]` | 404 propio si el id no existe; mismos datos que la card, ampliados |
| 8 | `Hero` + `FeatureGrid` + Landing (`/`) | Sigue la especificación del prompt, con el CTA ya resuelto (sección 8) |
| 9 | Accesibilidad y pulido: foco visible, contraste, `alt` de imágenes, estados de carga (`Skeleton`) y de error (sin resultados, backend caído) | Navegable por teclado; Lighthouse accesibilidad ≥ 95 |
| 10 | Documentación: actualizar `frontend/CLAUDE.md` sección 5 con el estado real, `README.md` con cómo correr el frontend contra el backend local | Reflejan el código tal como quedó |

Cada paso: `pnpm typecheck` y `pnpm lint` en verde antes de pasar al siguiente (mismo criterio que ya usa el backend).

## 8. Decisiones de marca/producto (resueltas 2026-09-28)

No eran técnicas: eran de marca/producto, y las resolviste tú.

1.  **Acento único:** magenta/ciruela `#9D174D` (con `#831843` de hover y `#FDF2F8` de fondo tenue), tomado del lado morado de la marca actual del cliente, en un solo tono sólido, sin degradado. Aplicado en la sección 6.2.
2.  **CTA de la Navbar y el Hero:** se cambia el texto a "Explorar la comunidad" (nunca "Súmate", que insinúa autorregistro); lleva a `/emprendedoras`. Sin página de "cómo unirte" en esta fase.
3.  **Badge de promoción en `EmprendedoraCard`:** se quita en esta fase. Solo `ProductoCard` (catálogo de Promociones) muestra el descuento, que es donde el backend lo calcula. Si más adelante se pide igual en la tarjeta de emprendedora, es una regla de negocio nueva (campo `tiene_promocion_vigente` o similar en `Perfil`) que se documenta primero en ambos `CLAUDE.md` y se implementa después en el backend.
4.  **Collage de perfil:** logo circular (56–64 px, borde blanco) superpuesto sobre la esquina inferior izquierda de la foto de perfil, patrón tipo LinkedIn/Facebook. Ya detallado en la sección 6.4; esto resuelve el punto "Pendiente" que tenía `CLAUDE.md` sección 6, punto 9 (se actualiza esa sección más abajo).

## 9. Pendientes resueltos (2026-09-28)

- **Logo:** el cliente solo tiene `TDM logo atemporal.png` (blanco sobre transparente, pensado para fondo oscuro). Se generó `public/logo/TDM-logo-fondo-claro.png` (recortado al wordmark, color invertido a negro, fondo blanco sólido) como material de referencia para la Navbar (`bg-white`). Es un placeholder, no el logo final del cliente; se reemplaza si más adelante llega una versión oficial para fondo claro.
- **Tipografía:** resuelta en la sección 6.3 (Plus Jakarta Sans + Inter).
