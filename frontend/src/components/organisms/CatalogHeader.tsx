import { FondoFotografico } from "@/components/atoms/FondoFotografico";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

interface PropsCatalogHeader {
  titulo: string;
  descripcion: string;
  imagen: string;
}

// Cabecera de las páginas de catálogo: la foto de portada del cliente, sin filtro (CLAUDE.md sección 6, regla
// 10), con el título y la descripción. `pb-14` deja libres los 32 px que la barra de filtros se superpone al
// borde inferior (regla 14) y 24 px de aire por encima. El texto entra con un ascenso corto; la imagen no se
// anima: es lo más grande de la página y retrasar su pintado retrasaría el LCP (regla 6).
//
// El mockup del cliente le da a cada catálogo (Emprendedoras, Promociones) su propia franja con foto, no solo a la
// Landing. Se adopta la idea con nuestro propio tratamiento (FondoFotografico, sin el duotono ni la marca PISTA8 del
// mockup): más baja que el Hero y sin CTA, porque el buscador ya es la acción principal de estas páginas. Cada página
// pasa su propia foto ("Portada 1.png" para Emprendedoras, "Portada 2.png" para Promociones, pedido del cliente,
// 2026-09-28). Ambas miden 2732x590 px, así que desde lg: (1024px) el contenedor usa esa proporción exacta
// (aspect-[2732/590]) para mostrar la foto completa, sin cortes en los bordes laterales.
export function CatalogHeader({ titulo, descripcion, imagen }: PropsCatalogHeader) {
  return (
    <section className="relative flex aspect-[16/9] w-full items-end overflow-hidden sm:aspect-[3/1] lg:aspect-[2732/590]">
      <FondoFotografico src={imagen} priority />

      <div className={`relative mx-auto w-full ${CONTENEDOR_PUBLICO} animate-entrada space-y-1 px-4 pt-6 pb-14 sm:px-6 lg:px-8`}>
        <h1 className="font-titulo text-[1.75rem] leading-tight font-extrabold text-white sm:text-4xl">{titulo}</h1>
        <p className="max-w-xl font-cuerpo text-sm text-white/90 sm:text-base">{descripcion}</p>
      </div>
    </section>
  );
}
