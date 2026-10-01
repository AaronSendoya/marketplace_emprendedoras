import Link from "next/link";
import { ProductoCard } from "@/components/molecules/ProductoCard";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { listarProductos } from "@/lib/api/productos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

// La API no tiene un parámetro "solo con descuento" (regla 8, backend), así que se pide un lote
// del feed general y se filtra aquí por porcentaje !== null. Nunca se inventan promociones: si
// ninguno de los productos consultados tiene un descuento vigente ahora mismo, la sección
// completa no se renderiza — nada de placeholders ni de "-20%" de ejemplo.
const LOTE_A_CONSULTAR = 20;
const LIMITE_A_MOSTRAR = 3;

export async function VitrinaPromociones() {
  const { datos: productos } = await listarProductos({ limite: LOTE_A_CONSULTAR });
  const conDescuento = productos.filter((producto) => producto.porcentaje !== null).slice(0, LIMITE_A_MOSTRAR);

  if (conDescuento.length === 0) return null;

  return (
    <section className="bg-secundario-suave">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-titulo text-2xl font-extrabold text-texto">Promociones destacadas</h2>
            <p className="font-cuerpo text-sm text-texto-secundario">Descuentos vigentes ahora mismo.</p>
          </div>
          <Link
            href="/promociones"
            className={`font-cuerpo text-sm font-medium text-acento transition-colors hover:text-acento-hover ${CLASES_FOCO_ENLACE}`}
          >
            Ver promociones →
          </Link>
        </div>

        <CatalogGrid>
          {conDescuento.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} />
          ))}
        </CatalogGrid>
      </div>
    </section>
  );
}
