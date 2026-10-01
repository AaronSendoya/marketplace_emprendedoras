import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/atoms/Badge";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { PriceTag } from "@/components/molecules/PriceTag";
import type { ProductoPublico } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

interface PropsProductoCard {
  producto: ProductoPublico;
}

// Card del Feed 2 (sección 5.2 del plan). La lógica de precio (normal / con descuento / "Consultar
// precio") vive en PriceTag; esta card solo decide qué mostrar arriba (imagen, nombre, negocio
// dueño) y abajo (descripción, precio). A diferencia de EmprendedoraCard, aquí la imagen es una
// sola (imagen_url): el producto no tiene collage.
export function ProductoCard({ producto }: PropsProductoCard) {
  const imagenUsable = esUrlDeImagenUsable(producto.imagen_url);

  return (
    <article className="overflow-hidden rounded-lg border border-borde bg-superficie">
      <div className="relative aspect-[4/3] bg-borde">
        {imagenUsable ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <MarcadorImagen etiqueta={producto.nombre} className="h-full w-full" />
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h2 className="font-titulo text-lg font-bold text-texto">{producto.nombre}</h2>
          <Link
            href={`/emprendedoras/${producto.perfil.id}`}
            className={`font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`}
          >
            {producto.perfil.nombre_negocio}
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>{producto.perfil.ciudad.nombre}</Badge>
          <Badge>{producto.perfil.rubro.nombre}</Badge>
        </div>

        {producto.descripcion && (
          <p className="line-clamp-2 font-cuerpo text-sm text-texto-secundario">{producto.descripcion}</p>
        )}

        <PriceTag
          precio={producto.precio}
          porcentaje={producto.porcentaje}
          precioConDescuento={producto.precio_con_descuento}
          consultarPrecio={producto.consultar_precio}
          whatsapp={producto.perfil.whatsapp}
        />

        <Link
          href={`/productos/${producto.id}`}
          className={`inline-block font-cuerpo text-sm font-medium text-acento transition-colors hover:text-acento-hover ${CLASES_FOCO_ENLACE}`}
        >
          Ver producto
        </Link>
      </div>
    </article>
  );
}
