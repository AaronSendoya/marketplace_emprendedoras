import { Clock, MapPin, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { Migas } from "@/components/molecules/Migas";
import { Paginador } from "@/components/molecules/Paginador";
import { ProductoCard } from "@/components/molecules/ProductoCard";
import { SocialLinks } from "@/components/molecules/SocialLinks";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { ErrorApi } from "@/lib/api/cliente";
import { listarProductos } from "@/lib/api/productos";
import { obtenerPromocion } from "@/lib/api/promociones";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { formatearPorcentaje } from "@/lib/formato/precio";
import { describirVigencia } from "@/lib/formato/vigencia";
import { paginaDeParametro, ultimaPagina } from "@/lib/parametros";

const LIMITE = 12;

async function cargarPromocion(id: string) {
  try {
    return await obtenerPromocion(id);
  } catch (error) {
    // Formato de id inválido (400) o promoción que no existe, ya no rige o no tiene productos (404): el mismo not-found.tsx. Cualquier otro
    // error (backend caído, 500...) sigue de largo hacia error.tsx en vez de mostrarse como «no encontrada».
    if (error instanceof ErrorApi && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps<"/promociones/[id]">): Promise<Metadata> {
  const { id } = await params;
  const promocion = await cargarPromocion(id);
  return { title: `${formatearPorcentaje(promocion.porcentaje)} de descuento en ${promocion.perfil.nombre_negocio} — Promociones` };
}

// Detalle de una promoción (CLAUDE.md sección 6, regla 14, punto l; regla 23 del backend): arriba el descuento (el porcentaje grande, en púrpura; el
// negocio; el texto; hasta cuándo rige; y enlaces a su perfil y a su WhatsApp) y debajo los productos que lo llevan, con la tarjeta de siempre.
// Un producto sin precio o con el precio oculto aparece igual, con su etiqueta «-10%» y «Consultar precio» (regla 8). `404` si la promoción ya no rige.
export default async function PaginaPromocion({ params, searchParams }: PageProps<"/promociones/[id]">) {
  const { id } = await params;
  const parametros = await searchParams;
  const pagina = paginaDeParametro((Array.isArray(parametros.pagina) ? parametros.pagina[0] : parametros.pagina) ?? "");

  const promocion = await cargarPromocion(id);
  const { datos: productos, paginacion } = await listarProductos({ descuento_id: id, pagina, limite: LIMITE });
  // Una página que ya no existe lleva a la última, no a una lista vacía.
  const ultima = ultimaPagina(paginacion.total, LIMITE);
  if (pagina > ultima) redirect(`/promociones/${id}?pagina=${ultima}`);

  const porcentaje = formatearPorcentaje(promocion.porcentaje);
  const vigencia = describirVigencia(promocion.fecha_fin);
  const cuantos = promocion.productos_total === 1 ? "1 producto" : `${promocion.productos_total} productos`;
  const negocio = promocion.perfil.nombre_negocio;

  return (
    <main className={`mx-auto w-full ${CONTENEDOR_PUBLICO} flex-1 px-4 pb-16 sm:px-6 lg:px-8`}>
      <Migas items={[{ etiqueta: "Promociones", href: "/promociones" }, { etiqueta: `${negocio} · ${porcentaje}` }]} />

      <section className="grid items-center gap-6 rounded-superficie border border-secundario-borde bg-secundario-suave p-6 shadow-tarjeta sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8">
        <div aria-hidden="true" className="grid size-28 place-content-center rounded-[1.375rem] bg-secundario text-center text-white shadow-[0_6px_18px_rgb(124_58_237/0.3)] sm:size-[8.25rem]">
          <span className="font-titulo text-[2.625rem] leading-none font-extrabold tracking-tight tabular-nums sm:text-[3.375rem]">{porcentaje}</span>
          <span className="mt-1.5 font-cuerpo text-[0.6875rem] leading-none font-bold tracking-[0.1em] uppercase opacity-90">de descuento</span>
        </div>

        <div className="min-w-0">
          <p className="font-cuerpo text-xs font-semibold tracking-[0.12em] text-secundario uppercase">Promoción</p>
          <h1 className="mt-2 font-titulo text-[1.625rem] leading-tight font-extrabold tracking-tight text-balance text-texto sm:text-[2rem]">
            {negocio} da {porcentaje} de descuento en {cuantos}
          </h1>
          {promocion.descripcion && <p className="mt-3 max-w-2xl font-cuerpo text-base text-pretty whitespace-pre-line text-texto-secundario">{promocion.descripcion}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-cuerpo text-xs font-semibold ${
                vigencia.urgente ? "border-secundario bg-superficie text-secundario" : "border-borde bg-superficie text-texto-secundario"
              }`}
            >
              <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
              {vigencia.aviso ? `${vigencia.texto} · ${vigencia.aviso}` : vigencia.texto}
            </span>
            <Badge variante="ciudad" icono={<MapPin size={13} strokeWidth={1.75} />}>
              {promocion.perfil.ciudad.nombre}
            </Badge>
            <Badge variante="neutro">{promocion.perfil.rubro.nombre}</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 md:col-span-2 lg:col-span-1 lg:w-64">
          <Link href={`/emprendedoras/${promocion.perfil.id}`} className={clasesBoton("contorno", "w-full", "tarjeta")}>
            <Store size={17} strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate">Ver el perfil del negocio</span>
          </Link>
          <SocialLinks perfilId={promocion.perfil.id} whatsapp={promocion.perfil.whatsapp} instagramUsername={null} otraRedSocial={null} variante="contacto" nombreNegocio={negocio} />
        </div>
      </section>

      <div className="mt-10 mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 sm:mt-12">
        <h2 className="font-titulo text-[1.375rem] font-extrabold tracking-tight text-texto">
          Productos con este descuento <span className="tabular-nums">({promocion.productos_total})</span>
        </h2>
        <p className="font-cuerpo text-sm text-texto-secundario">Los productos que llevan este descuento ahora mismo.</p>
      </div>

      <div className="space-y-6">
        <CatalogGrid>
          {productos.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} />
          ))}
        </CatalogGrid>
        <Paginador paginacion={paginacion} crearHref={(nuevaPagina) => `/promociones/${id}?pagina=${nuevaPagina}`} superficie />
      </div>
    </main>
  );
}
