import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { ProductoCard } from "@/components/molecules/ProductoCard";
import { PromocionCard } from "@/components/molecules/PromocionCard";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { cargarProductos, cargarPromociones, MAXIMO_EN_CARRUSEL, MINIMO_PARA_CARRUSEL, MINIMO_PARA_PRODUCTOS } from "@/lib/inicio/datos";
import { muestraAleatoria } from "@/lib/inicio/muestra";
import { CarruselTarjetas } from "./CarruselTarjetas";
import { EncabezadoSeccion } from "./EncabezadoSeccion";

// «¿Qué tiene descuento?» (CLAUDE.md sección 6, regla 14, puntos k y l). Las promociones vigentes de todas las emprendedoras (regla 23 del backend: un
// descuento que rige, con productos), todas en el sorteo, al azar en cada visita y hasta 24, con las mismas tarjetas que la vista de Promociones.
// En una banda de lila tenue y con el indicador del carrusel en púrpura: el color de los descuentos. Un ritmo algo más vivo que el de las
// emprendedoras (4,5 s): una promoción se lee de un vistazo. Sin ninguna promoción, y con 3 o más productos, pasa a «Productos para descubrir» con
// tarjetas de producto y los colores de Productos (naranja); con menos, no se dibuja: nunca se inventa una promoción.
export async function SeccionPromociones() {
  const promociones = await cargarPromociones();
  if (promociones.elementos.length > 0) {
    const muestra = muestraAleatoria(promociones.elementos, MAXIMO_EN_CARRUSEL);
    const tarjetas = muestra.map((promocion) => <PromocionCard key={promocion.id} promocion={promocion} />);
    const total = promociones.total;

    return (
      <section aria-labelledby="inicio-promociones" className="border-y border-secundario-borde bg-secundario-suave py-16 sm:py-20">
        <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} px-4 sm:px-6 lg:px-8`}>
          <EncabezadoSeccion
            id="inicio-promociones"
            eyebrow="Promociones"
            titulo="Descuentos vigentes ahora mismo"
            bajada="Cada tarjeta es el descuento de una emprendedora: ábrela para ver los productos que incluye."
            tono="secundario"
            accion={
              <Link href="/promociones" className={clasesBoton("descuento", "", "compacto")}>
                {total >= 2 ? `Ver las ${total} promociones` : "Ver todas las promociones"}
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            }
          />

          {muestra.length >= MINIMO_PARA_CARRUSEL ? (
            <CarruselTarjetas etiqueta="Promociones" ritmoMs={4500} tono="secundario">
              {tarjetas}
            </CarruselTarjetas>
          ) : (
            <div className="entrada-escalonada grid grid-cols-1 gap-6 md:grid-cols-2 rejilla:grid-cols-3">{tarjetas}</div>
          )}
        </div>
      </section>
    );
  }

  const productos = await cargarProductos();
  if (productos.elementos.length < MINIMO_PARA_PRODUCTOS) return null;
  const muestra = muestraAleatoria(productos.elementos, MAXIMO_EN_CARRUSEL);

  return (
    <section aria-labelledby="inicio-productos" className="border-y border-enfasis-borde bg-enfasis-suave py-16 sm:py-20">
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} px-4 sm:px-6 lg:px-8`}>
        <EncabezadoSeccion
          id="inicio-productos"
          eyebrow="Productos"
          titulo="Productos para descubrir"
          bajada="Una muestra al azar de lo que ofrecen las emprendedoras."
          tono="enfasis"
          accion={
            <Link href="/productos" className={clasesBoton("contorno", "", "compacto")}>
              {`Ver los ${productos.total} productos`}
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          }
        />

        {muestra.length >= MINIMO_PARA_CARRUSEL ? (
          <CarruselTarjetas etiqueta="Productos" ritmoMs={4500} tono="enfasis">
            {muestra.map((producto) => (
              <ProductoCard key={producto.id} producto={producto} />
            ))}
          </CarruselTarjetas>
        ) : null}
      </div>
    </section>
  );
}
