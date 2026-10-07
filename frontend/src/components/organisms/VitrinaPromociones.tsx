import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { ProductoCard } from "@/components/molecules/ProductoCard";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { listarProductos } from "@/lib/api/productos";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

// La API no tiene un parámetro "solo con descuento" (regla 8, backend), así que se pide un lote del feed general y se
// filtra aquí por porcentaje !== null. Nunca se inventan promociones: si ninguno de los productos consultados tiene un
// descuento vigente ahora mismo, la sección completa no se renderiza — nada de placeholders ni de "-20%" de ejemplo.
const LOTE_A_CONSULTAR = 20;
const LIMITE_A_MOSTRAR = 3;

// La banda de promociones va sobre el fondo profundo, entre dos bordes (CLAUDE.md sección 6, regla 2: el
// púrpura ya no se usa en el sitio público). Las tarjetas son blancas y destacan sobre ella sin más adorno.
export async function VitrinaPromociones() {
  const { datos: productos } = await listarProductos({ limite: LOTE_A_CONSULTAR });
  const conDescuento = productos.filter((producto) => producto.porcentaje !== null).slice(0, LIMITE_A_MOSTRAR);

  if (conDescuento.length === 0) return null;

  return (
    <section className="border-y border-borde bg-fondo-profundo">
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} space-y-8 px-4 py-14 sm:px-6 sm:py-16 lg:px-8`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="font-titulo text-2xl font-extrabold tracking-tight text-texto sm:text-[1.75rem]">Promociones destacadas</h2>
            <p className="font-cuerpo text-[0.9375rem] text-texto-secundario">Descuentos vigentes ahora mismo.</p>
          </div>
          <Link href="/promociones" className={clasesBoton("contorno", "", "compacto")}>
            Ver promociones
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
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
