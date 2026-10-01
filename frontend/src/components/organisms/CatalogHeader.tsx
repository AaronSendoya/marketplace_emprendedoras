import { FondoFotografico } from "@/components/atoms/FondoFotografico";

interface PropsCatalogHeader {
  titulo: string;
  descripcion: string;
  imagen: string;
}

// El mockup del cliente le da a cada catálogo (Emprendedoras, Promociones) su propia franja con
// foto, no solo a la Landing. Se adopta la idea con nuestro propio tratamiento (FondoFotografico,
// sin el duotono ni la marca PISTA8 del mockup): más baja que el Hero y sin CTA, porque el
// buscador ya es la acción principal de estas páginas. Cada página pasa su propia foto
// ("Portada 1.png" para Emprendedoras, "Portada 2.png" para Promociones, pedido del cliente,
// 2026-09-28) en vez de tenerla fija aquí.
// Ambas portadas miden 2732x590 px, así que desde lg: (1024px) el contenedor usa esa proporción
// exacta (aspect-[2732/590]) para mostrar la foto completa, sin cortes en los bordes laterales.
export function CatalogHeader({ titulo, descripcion, imagen }: PropsCatalogHeader) {
  return (
    <section className="relative flex aspect-[16/9] w-full items-end overflow-hidden sm:aspect-[3/1] lg:aspect-[2732/590]">
      <FondoFotografico src={imagen} priority />

      <div className="relative mx-auto w-full max-w-6xl space-y-1 px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="font-titulo text-2xl font-extrabold text-white sm:text-3xl">{titulo}</h1>
        <p className="max-w-xl font-cuerpo text-sm text-white/90">{descripcion}</p>
      </div>
    </section>
  );
}
