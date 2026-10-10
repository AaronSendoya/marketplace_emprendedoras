import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { ImagenR2 } from "@/components/atoms/ImagenR2";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { EmprendedoraCard } from "@/components/molecules/EmprendedoraCard";
import { BotonConsultarPrecio } from "@/components/molecules/BotonConsultarPrecio";
import { PrecioProducto } from "@/components/molecules/PrecioProducto";
import { ProductoCard } from "@/components/molecules/ProductoCard";
import { SocialLinks } from "@/components/molecules/SocialLinks";
import { TarjetaEsqueleto } from "@/components/molecules/TarjetaEsqueleto";
import type { Perfil, ProductoPublico } from "@/lib/api/tipos";

// Con R2 conectado (NEXT_PUBLIC_IMAGENES_HOST) se usan las imágenes predeterminadas del bucket, que sí abren; si no, el
// marcador de siempre.
const HOST_IMAGENES = process.env.NEXT_PUBLIC_IMAGENES_HOST;
const FOTO_EJEMPLO = HOST_IMAGENES ? `https://${HOST_IMAGENES}/defaults/foto-perfil-anonima.webp` : "memoria://desarrollo-sin-r2";
const LOGO_EJEMPLO = HOST_IMAGENES ? `https://${HOST_IMAGENES}/defaults/logo-vacio.webp` : "memoria://desarrollo-sin-r2";

const PERFIL_EJEMPLO: Perfil = {
  id: "00000000-0000-0000-0000-000000000000",
  nombre_negocio: "Dulces de Ana",
  descripcion:
    "Repostería artesanal boliviana: tortas, alfajores y bocaditos para eventos, hechos con ingredientes locales y sin conservantes.",
  whatsapp: "59171234567",
  instagram_username: "dulcesdeana",
  otra_red_social: "https://www.tiktok.com/@dulcesdeana",
  ciudad: { id: "1", nombre: "La Paz" },
  rubro: { id: "1", nombre: "Alimentos y bebidas" },
  emprendedora: "Ana Quispe",
  foto_perfil_url: FOTO_EJEMPLO,
  logo_url: LOGO_EJEMPLO,
  creado_en: "2026-01-01T00:00:00.000Z",
  actualizado_en: "2026-01-01T00:00:00.000Z",
};

const PERFIL_RESUMEN_EJEMPLO = {
  id: PERFIL_EJEMPLO.id,
  nombre_negocio: PERFIL_EJEMPLO.nombre_negocio,
  whatsapp: PERFIL_EJEMPLO.whatsapp,
  ciudad: PERFIL_EJEMPLO.ciudad,
  rubro: PERFIL_EJEMPLO.rubro,
  logo_url: PERFIL_EJEMPLO.logo_url,
};

const PRODUCTO_NORMAL: ProductoPublico = {
  id: "10000000-0000-0000-0000-000000000000",
  nombre: "Torta de chocolate (18 cm)",
  descripcion: "Bizcocho húmedo de chocolate con ganache, para 12 porciones.",
  imagen_url: FOTO_EJEMPLO,
  precio: 120,
  porcentaje: null,
  precio_con_descuento: null,
  consultar_precio: false,
  creado_en: "2026-01-01T00:00:00.000Z",
  perfil: PERFIL_RESUMEN_EJEMPLO,
};

const PRODUCTO_CON_DESCUENTO: ProductoPublico = {
  ...PRODUCTO_NORMAL,
  id: "10000000-0000-0000-0000-000000000001",
  nombre: "Caja de alfajores (x12)",
  precio: 80,
  porcentaje: 20,
  precio_con_descuento: 64,
};

const PRODUCTO_CONSULTAR_PRECIO: ProductoPublico = {
  ...PRODUCTO_NORMAL,
  id: "10000000-0000-0000-0000-000000000002",
  nombre: "Torta de bodas (a medida)",
  precio: null,
  porcentaje: null,
  precio_con_descuento: null,
  consultar_precio: true,
};

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-b border-borde pb-10">
      <h2 className="font-titulo text-xl font-bold text-texto">{titulo}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

export default function PaginaComponentes() {
  return (
    <main className="mx-auto max-w-3xl space-y-10 p-8">
      <h1 className="font-titulo text-2xl font-extrabold text-texto">Vitrina de componentes (paso 2)</h1>

      <Seccion titulo="Button">
        <Button variante="primario">Primario</Button>
        <Button variante="secundario">Secundario</Button>
        <Button variante="contorno">Contorno</Button>
        <Button variante="primario" tamano="compacto">
          Compacto
        </Button>
        <Button variante="primario" tamano="grande">
          Grande
        </Button>
        <Button variante="primario" disabled>
          Deshabilitado
        </Button>
      </Seccion>

      <Seccion titulo="Badge">
        <Badge variante="neutro">La Paz</Badge>
        <Badge variante="neutro">Alimentos y bebidas</Badge>
        <Badge variante="acento">-20%</Badge>
        <Badge variante="ciudad" icono={<MapPin size={13} strokeWidth={1.75} />}>
          La Paz
        </Badge>
        <Badge variante="rubro">Alimentos y bebidas</Badge>
      </Seccion>

      <Seccion titulo="Input">
        <Input aria-label="Buscar" placeholder="Buscar emprendedoras..." className="max-w-xs" />
        <Input aria-label="Campo deshabilitado" placeholder="Deshabilitado" disabled className="max-w-xs" />
        <Input aria-label="Campo del catálogo" variante="catalogo" placeholder="Variante del catálogo" className="max-w-xs" />
      </Seccion>

      <Seccion titulo="Select">
        <Select aria-label="Ciudad" className="max-w-xs" defaultValue="">
          <option value="" disabled>
            Ciudad
          </option>
          <option value="la-paz">La Paz</option>
          <option value="cochabamba">Cochabamba</option>
        </Select>
        <Select aria-label="Ciudad (catálogo)" variante="catalogo" className="max-w-xs" defaultValue="">
          <option value="">Variante del catálogo</option>
          <option value="la-paz">La Paz</option>
        </Select>
      </Seccion>

      <Seccion titulo="SocialLinks — encabezado de un perfil">
        <SocialLinks perfilId="dev-perfil" whatsapp="59171234567" instagramUsername="dulcesdeana" otraRedSocial={null} variante="encabezado" />
      </Seccion>

      <Seccion titulo="SocialLinks — panel de contacto (con otra red)">
        <div className="w-full max-w-xs">
          <SocialLinks perfilId="dev-perfil" whatsapp="59171234567" instagramUsername="dulcesdeana" otraRedSocial="TikTok: @dulcesdeana" variante="contacto" />
        </div>
      </Seccion>

      <Seccion titulo="SocialLinks — solo WhatsApp (contacto)">
        <div className="w-full max-w-xs">
          <SocialLinks perfilId="dev-perfil" whatsapp="59171234567" instagramUsername={null} otraRedSocial={null} variante="contacto" />
        </div>
      </Seccion>

      <Seccion titulo="PrecioProducto — precio normal, con descuento y detalle">
        <PrecioProducto precio={120} porcentaje={null} precioConDescuento={null} />
        <PrecioProducto precio={120} porcentaje={20} precioConDescuento={96} />
        <PrecioProducto precio={120} porcentaje={20} precioConDescuento={96} tamano="detalle" />
      </Seccion>

      <Seccion titulo="BotonConsultarPrecio">
        <BotonConsultarPrecio perfilId="dev-perfil" whatsapp="59171234567" />
        <BotonConsultarPrecio perfilId="dev-perfil" whatsapp="59171234567" etiqueta="Consultar por WhatsApp" tamano="grande" />
      </Seccion>

      <Seccion titulo="EmprendedoraCard — WhatsApp + Instagram + TikTok, solo Instagram y sin ningún contacto">
        <div className="w-full max-w-[26rem]">
          <EmprendedoraCard perfil={PERFIL_EJEMPLO} />
        </div>
        <div className="w-full max-w-[26rem]">
          <EmprendedoraCard
            perfil={{ ...PERFIL_EJEMPLO, id: "00000000-0000-0000-0000-000000000001", nombre_negocio: "Telar Andino de las Tres Culturas", whatsapp: "", otra_red_social: null, rubro: { id: "2", nombre: "Artesanías o productos hechos a mano" } }}
          />
        </div>
        <div className="w-full max-w-[26rem]">
          <EmprendedoraCard
            perfil={{ ...PERFIL_EJEMPLO, id: "00000000-0000-0000-0000-000000000002", nombre_negocio: "Estudio Vida Sana", whatsapp: "", instagram_username: null, otra_red_social: "@sinenlace" }}
          />
        </div>
      </Seccion>

      <Seccion titulo="SocialLinks tarjeta — todas las combinaciones">
        {[
          { etiqueta: "WhatsApp + Instagram + TikTok", w: "59171234567", i: "ana", o: "https://tiktok.com/@ana" },
          { etiqueta: "WhatsApp + Facebook", w: "59171234567", i: null, o: "https://www.facebook.com/ana" },
          { etiqueta: "Instagram + sitio web", w: "", i: "ana", o: "Tapados.com.bo" },
          { etiqueta: "Solo TikTok", w: "", i: null, o: "tiktok.com/@ana" },
          { etiqueta: "Solo WhatsApp", w: "59171234567", i: null, o: null },
          { etiqueta: "Ninguno (no devuelve nada)", w: "", i: null, o: "@sinenlace" },
        ].map((caso) => (
          <div key={caso.etiqueta} className="w-72 space-y-2 rounded-lg border border-borde bg-superficie p-3">
            <p className="font-cuerpo text-xs text-texto-secundario">{caso.etiqueta}</p>
            <div className="flex min-h-11 items-center">
              <SocialLinks perfilId="dev-perfil" whatsapp={caso.w} instagramUsername={caso.i} otraRedSocial={caso.o} nombreNegocio="Dulces de Ana" variante="tarjeta" />
            </div>
          </div>
        ))}
      </Seccion>

      <Seccion titulo="ProductoCard — precio normal, con descuento, precio a consultar y sin WhatsApp">
        <div className="w-full max-w-[26rem]">
          <ProductoCard producto={PRODUCTO_NORMAL} />
        </div>
        <div className="w-full max-w-[26rem]">
          <ProductoCard producto={PRODUCTO_CON_DESCUENTO} />
        </div>
        <div className="w-full max-w-[26rem]">
          <ProductoCard producto={PRODUCTO_CONSULTAR_PRECIO} />
        </div>
        <div className="w-full max-w-[26rem]">
          <ProductoCard producto={{ ...PRODUCTO_CON_DESCUENTO, id: "10000000-0000-0000-0000-000000000003", perfil: { ...PERFIL_RESUMEN_EJEMPLO, whatsapp: "" } }} />
        </div>
        <div className="w-full max-w-[26rem]">
          <ProductoCard producto={{ ...PRODUCTO_CONSULTAR_PRECIO, id: "10000000-0000-0000-0000-000000000004", perfil: { ...PERFIL_RESUMEN_EJEMPLO, whatsapp: "" } }} />
        </div>
      </Seccion>

      <Seccion titulo="ImagenR2 — una imagen que no abre nunca deja el icono de imagen rota (control de errores)">
        {[
          { id: "abre", etiqueta: "Abre", src: "/logo/pista8-logo.png" },
          { id: "no-existe", etiqueta: "Un 404 del bucket", src: "/imagen-que-no-existe.webp" },
          { id: "memoria", etiqueta: "memoria:// (sin R2)", src: "memoria://desarrollo-sin-r2" },
          { id: "vacia", etiqueta: "Dirección vacía", src: "" },
        ].map(({ id, etiqueta, src }) => (
          <figure key={id} className="space-y-2" data-prueba-imagen={id}>
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-borde bg-superficie">
              <ImagenR2 src={src} alt={etiqueta} fill sizes="128px" className="object-contain" />
            </div>
            <figcaption className="font-cuerpo text-xs text-texto-secundario">{etiqueta}</figcaption>
          </figure>
        ))}
      </Seccion>

      <Seccion titulo="TarjetaEsqueleto (paso 9, estado de carga)">
        <div className="max-w-sm">
          <TarjetaEsqueleto />
        </div>
        <div className="max-w-sm">
          <TarjetaEsqueleto variante="producto" />
        </div>
      </Seccion>
    </main>
  );
}
