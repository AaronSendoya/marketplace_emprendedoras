import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/Badge";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { PriceTag } from "@/components/molecules/PriceTag";
import { ErrorApi } from "@/lib/api/cliente";
import { obtenerProducto } from "@/lib/api/productos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

export default async function PaginaDetalleProducto({ params }: PageProps<"/productos/[id]">) {
  const { id } = await params;

  let producto;
  try {
    producto = await obtenerProducto(id);
  } catch (error) {
    // Formato de id inválido (400, regla 17 backend) o producto inexistente (404): mismo
    // not-found.tsx de esta ruta. Cualquier otro error (backend caído, 500...) sigue de largo
    // hacia error.tsx en vez de mostrarse como "no encontrado".
    if (error instanceof ErrorApi && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const imagenUsable = esUrlDeImagenUsable(producto.imagen_url);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/promociones"
        className={`font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`}
      >
        ← Volver a promociones
      </Link>

      <article className="overflow-hidden rounded-lg border border-borde bg-superficie">
        <div className="relative aspect-[16/9] bg-borde">
          {imagenUsable ? (
            <Image
              src={producto.imagen_url}
              alt={producto.nombre}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <MarcadorImagen etiqueta={producto.nombre} className="h-full w-full" />
          )}
        </div>

        <div className="space-y-4 p-6">
          <div>
            <h1 className="font-titulo text-2xl font-extrabold text-texto">{producto.nombre}</h1>
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
            <p className="font-cuerpo text-sm whitespace-pre-line text-texto-secundario">{producto.descripcion}</p>
          )}

          <PriceTag
            precio={producto.precio}
            porcentaje={producto.porcentaje}
            precioConDescuento={producto.precio_con_descuento}
            consultarPrecio={producto.consultar_precio}
            whatsapp={producto.perfil.whatsapp}
          />
        </div>
      </article>
    </main>
  );
}
