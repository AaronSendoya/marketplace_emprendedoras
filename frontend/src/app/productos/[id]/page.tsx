import { MapPin } from "lucide-react";
import { ImagenR2 } from "@/components/atoms/ImagenR2";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { BotonConsultarPrecio } from "@/components/molecules/BotonConsultarPrecio";
import { Migas } from "@/components/molecules/Migas";
import { PrecioProducto } from "@/components/molecules/PrecioProducto";
import { ErrorApi } from "@/lib/api/cliente";
import { obtenerProducto } from "@/lib/api/productos";
import { CLASES_FOCO_ENLACE, CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

// Detalle de un producto (CLAUDE.md sección 6, regla 14): migas de pan, la foto (proporción 4:3, con la etiqueta de
// descuento encima) y un panel con las etiquetas, el nombre, quién lo vende, el precio grande y los botones. El
// precio ya llega resuelto del backend (reglas 7 y 8): cuando se consulta no se muestra y el botón naranja pasa
// a llamarse "Consultar precio". La foto y el panel de texto son lo que más pesa en la pintura (el LCP): la foto lleva
// `priority` y ninguno de los dos se anima, porque una entrada con desvanecimiento retrasa ese texto unos 270 ms (medido,
// regla 6).
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
  const logoUsable = esUrlDeImagenUsable(producto.perfil.logo_url);

  return (
    <main className={`mx-auto w-full ${CONTENEDOR_PUBLICO} flex-1 px-4 pb-16 sm:px-6 lg:px-8`}>
      <Migas items={[{ etiqueta: "Productos", href: "/productos" }, { etiqueta: producto.nombre }]} />

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
        <div className="relative aspect-[4/3] overflow-hidden rounded-superficie border border-borde bg-borde shadow-tarjeta">
          {imagenUsable ? (
            <ImagenR2
              src={producto.imagen_url}
              alt={producto.nombre}
              fill
              sizes="(min-width: 1344px) 640px, (min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <MarcadorImagen etiqueta={producto.nombre} className="h-full w-full" />
          )}

          {producto.porcentaje !== null && (
            <span className="absolute top-4 left-4 rounded-lg bg-secundario px-3 py-2 font-titulo text-base leading-none font-extrabold text-white">
              -{producto.porcentaje}%
            </span>
          )}
        </div>

        <div className="space-y-5 rounded-superficie border border-borde bg-superficie p-6 shadow-tarjeta sm:p-7">
          <div className="flex flex-wrap gap-2">
            <Badge variante="ciudad" icono={<MapPin size={13} strokeWidth={1.75} />}>
              {producto.perfil.ciudad.nombre}
            </Badge>
            <Badge variante="rubro">{producto.perfil.rubro.nombre}</Badge>
          </div>

          <h1 className="font-titulo text-2xl leading-tight font-extrabold tracking-tight break-words text-texto sm:text-[2rem]">{producto.nombre}</h1>

          <div className="flex items-center gap-2.5 font-cuerpo text-sm text-texto-secundario">
            {logoUsable ? (
              <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-borde-fuerte">
                <ImagenR2 src={producto.perfil.logo_url} alt="" fill sizes="28px" className="object-cover" />
              </span>
            ) : (
              <Avatar nombreCompleto={producto.perfil.nombre_negocio} tamano="xs" />
            )}
            <span className="min-w-0 truncate">
              Vendido por{" "}
              <Link
                href={`/emprendedoras/${producto.perfil.id}`}
                className={`font-medium text-acento hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE}`}
              >
                {producto.perfil.nombre_negocio}
              </Link>
            </span>
          </div>

          <div className="border-t border-borde pt-5">
            {producto.consultar_precio ? (
              <p className="font-titulo text-xl font-bold text-texto">Precio a consultar</p>
            ) : (
              <PrecioProducto
                precio={producto.precio}
                porcentaje={producto.porcentaje}
                precioConDescuento={producto.precio_con_descuento}
                tamano="detalle"
              />
            )}
          </div>

          {producto.descripcion && (
            <p className="font-cuerpo text-[0.9375rem] leading-relaxed whitespace-pre-line text-texto-secundario">{producto.descripcion}</p>
          )}

          <div className="grid gap-2.5 pt-1">
            <BotonConsultarPrecio
              perfilId={producto.perfil.id}
              whatsapp={producto.perfil.whatsapp}
              etiqueta={producto.consultar_precio ? "Consultar precio" : "Consultar por WhatsApp"}
              tamano="grande"
              className="w-full"
            />
            <Link href={`/emprendedoras/${producto.perfil.id}`} className={clasesBoton("contorno", "w-full", "grande")}>
              Ver perfil de la emprendedora
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
