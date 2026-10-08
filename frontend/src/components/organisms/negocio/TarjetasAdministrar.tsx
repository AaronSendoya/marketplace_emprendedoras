import { ChevronRight, Package, Percent, Store, type LucideIcon } from "lucide-react";
import { ImagenR2 } from "@/components/atoms/ImagenR2";
import Link from "next/link";
import type { ReactNode } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import type { Descuento, Perfil, ProductoPropio } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE, CLASES_TARJETA_NEGOCIO, CLASES_TARJETA_PROMOCIONES } from "@/lib/estilos";
import { formatearFechaLaPaz } from "@/lib/formato/fecha";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";
import { formatearPorcentaje } from "@/lib/formato/precio";
import { RUTAS_NEGOCIO, rutaEditarPerfil, rutaNuevaPromocion, rutaNuevoProducto } from "@/lib/negocio/rutas";
import { ordenarPromociones, textoVigencia } from "@/lib/negocio/vigencia";

interface PropsTarjetasAdministrar {
  perfil: Perfil;
  productos: ProductoPropio[];
  descuentos: Descuento[];
}

const TOPE_MINIATURAS = 4;
const TOPE_PROMOCIONES_VISIBLES = 2;

interface PropsTarjetaAcceso {
  href: string;
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  clases: string;
  // Color del ícono: el de la sección (promociones va en púrpura suave, el resto en neutro).
  claseIcono: string;
  children: ReactNode;
  accion: ReactNode;
}

// Cada tarjeta lleva a su sección por el título (un solo enlace, con el chevron) y trae su acción
// principal abajo. La tarjeta completa no es un enlace: la acción de abajo es otro enlace y los
// enlaces anidados no son HTML válido.
function TarjetaAcceso({ href, icono: Icono, titulo, descripcion, clases, claseIcono, children, accion }: PropsTarjetaAcceso) {
  return (
    <article className={`flex flex-col gap-4 p-5 ${clases}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${claseIcono}`}>
          <Icono size={20} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-titulo text-base font-bold text-texto">
            <Link href={href} className={`group inline-flex items-center gap-1 ${CLASES_FOCO_ENLACE} hover:text-acento`}>
              {titulo}
              <ChevronRight
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
                className="text-texto-secundario transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </h3>
          <p className="mt-0.5 font-cuerpo text-sm text-texto-secundario">{descripcion}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3">{children}</div>

      <div className="[&>a]:w-full">{accion}</div>
    </article>
  );
}

function MiniaturaProducto({ producto }: { producto: ProductoPropio }) {
  return (
    <li title={producto.nombre} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-borde bg-fondo">
      {esUrlDeImagenUsable(producto.imagen_url) ? (
        <ImagenR2 src={producto.imagen_url} alt={producto.nombre} fill sizes="40px" className="object-cover" />
      ) : (
        <MarcadorImagen etiqueta={producto.nombre} className="h-full w-full" />
      )}
    </li>
  );
}

function textoProductos(publicados: number, ocultos: number): string {
  const publicadosTexto = `${publicados} ${publicados === 1 ? "producto publicado" : "productos publicados"}`;
  if (ocultos === 0) return publicadosTexto;
  return `${publicadosTexto} · ${ocultos} ${ocultos === 1 ? "oculto" : "ocultos"}`;
}

// "¿Qué quieres administrar?": las tres secciones del negocio. Los números son los conteos de lo que
// la emprendedora ya tiene (productos publicados/ocultos, promociones vigentes/programadas), en
// texto corriente: no son indicadores de rendimiento (CLAUDE.md sección 6, regla 11).
export function TarjetasAdministrar({ perfil, productos, descuentos }: PropsTarjetasAdministrar) {
  const publicados = productos.filter((producto) => producto.activo);
  const ocultos = productos.length - publicados.length;
  // Primero lo que los clientes ven; si no hay nada publicado, igual se muestran los que existen. El
  // "+N" cuenta los que faltan de esa misma lista (no los ocultos, que ya van en el texto de arriba).
  const mostrables = publicados.length > 0 ? publicados : productos;
  const miniaturas = mostrables.slice(0, TOPE_MINIATURAS);
  const restantes = mostrables.length - miniaturas.length;

  const vigentes = descuentos.filter((descuento) => descuento.estado === "vigente").length;
  const programadas = descuentos.filter((descuento) => descuento.estado === "programado").length;
  const activas = ordenarPromociones(descuentos).filter((descuento) => descuento.estado !== "vencido");

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <TarjetaAcceso
        href={RUTAS_NEGOCIO.perfil}
        icono={Store}
        titulo="Mi perfil"
        descripcion="Cómo te ven tus clientes: nombre, fotos y contacto."
        clases={CLASES_TARJETA_NEGOCIO}
        claseIcono="bg-fondo text-texto-secundario"
        accion={
          <Link href={rutaEditarPerfil} className={clasesBoton("secundario")}>
            Editar perfil
          </Link>
        }
      >
        <p className="font-cuerpo text-sm text-texto-secundario">Actualizado el {formatearFechaLaPaz(perfil.actualizado_en, "siempre")}</p>
      </TarjetaAcceso>

      <TarjetaAcceso
        href={RUTAS_NEGOCIO.productos}
        icono={Package}
        titulo="Mis productos"
        descripcion="Lo que vendes y lo que tus clientes ven en tu catálogo."
        clases={CLASES_TARJETA_NEGOCIO}
        claseIcono="bg-fondo text-texto-secundario"
        accion={
          <Link href={rutaNuevoProducto} className={clasesBoton("primario")}>
            {productos.length === 0 ? "Agregar tu primer producto" : "Agregar producto"}
          </Link>
        }
      >
        {productos.length === 0 ? (
          <p className="font-cuerpo text-sm text-texto-secundario">Todavía no tienes productos.</p>
        ) : (
          <>
            <p className="font-cuerpo text-sm font-medium text-texto">{textoProductos(publicados.length, ocultos)}</p>
            <ul aria-label="Algunos de tus productos" className="flex items-center gap-1.5">
              {miniaturas.map((producto) => (
                <MiniaturaProducto key={producto.id} producto={producto} />
              ))}
              {restantes > 0 && <li className="pl-1 font-cuerpo text-xs text-texto-secundario">+{restantes}</li>}
            </ul>
          </>
        )}
      </TarjetaAcceso>

      <TarjetaAcceso
        href={RUTAS_NEGOCIO.promociones}
        icono={Percent}
        titulo="Mis promociones"
        descripcion="Descuentos por porcentaje en los productos que elijas."
        clases={CLASES_TARJETA_PROMOCIONES}
        claseIcono="bg-secundario-suave text-secundario"
        accion={
          <Link href={rutaNuevaPromocion} className={clasesBoton("promocion")}>
            Crear promoción
          </Link>
        }
      >
        {activas.length === 0 ? (
          <p className="font-cuerpo text-sm text-texto-secundario">No tienes promociones vigentes ni programadas.</p>
        ) : (
          <>
            <p className="font-cuerpo text-sm font-medium text-texto">
              {[
                vigentes > 0 && `${vigentes} ${vigentes === 1 ? "vigente" : "vigentes"}`,
                programadas > 0 && `${programadas} ${programadas === 1 ? "programada" : "programadas"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <ul className="space-y-2">
              {activas.slice(0, TOPE_PROMOCIONES_VISIBLES).map((descuento) => (
                <li key={descuento.id} className="flex items-start gap-2.5">
                  <span className="shrink-0 rounded-full bg-secundario-suave px-2.5 py-0.5 font-titulo text-sm font-bold text-secundario">
                    {formatearPorcentaje(descuento.porcentaje)}
                  </span>
                  <span className="min-w-0 pt-1 font-cuerpo text-xs text-texto-secundario">{textoVigencia(descuento)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </TarjetaAcceso>
    </div>
  );
}
