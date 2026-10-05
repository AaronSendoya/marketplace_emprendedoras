import type { ReactNode } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { EmprendedoraCard } from "@/components/molecules/EmprendedoraCard";
import { PriceTag } from "@/components/molecules/PriceTag";
import { ProductoCard } from "@/components/molecules/ProductoCard";
import { SocialLinks } from "@/components/molecules/SocialLinks";
import { TarjetaEsqueleto } from "@/components/molecules/TarjetaEsqueleto";
import type { Perfil, ProductoPublico } from "@/lib/api/tipos";

const PERFIL_EJEMPLO: Perfil = {
  id: "00000000-0000-0000-0000-000000000000",
  nombre_negocio: "Dulces de Ana",
  descripcion:
    "Repostería artesanal boliviana: tortas, alfajores y bocaditos para eventos, hechos con ingredientes locales y sin conservantes.",
  whatsapp: "59171234567",
  instagram_username: "dulcesdeana",
  otra_red_social: "TikTok: @dulcesdeana",
  ciudad: { id: "1", nombre: "La Paz" },
  rubro: { id: "1", nombre: "Alimentos y bebidas" },
  emprendedora: "Ana Quispe",
  foto_perfil_url: "memoria://desarrollo-sin-r2",
  logo_url: "memoria://desarrollo-sin-r2",
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
  imagen_url: "memoria://desarrollo-sin-r2",
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
        <Button variante="primario" disabled>
          Deshabilitado
        </Button>
      </Seccion>

      <Seccion titulo="Badge">
        <Badge variante="neutro">La Paz</Badge>
        <Badge variante="neutro">Alimentos y bebidas</Badge>
        <Badge variante="acento">-20%</Badge>
      </Seccion>

      <Seccion titulo="Input">
        <Input aria-label="Buscar" placeholder="Buscar emprendedoras..." className="max-w-xs" />
        <Input aria-label="Campo deshabilitado" placeholder="Deshabilitado" disabled className="max-w-xs" />
      </Seccion>

      <Seccion titulo="Select">
        <Select aria-label="Ciudad" className="max-w-xs" defaultValue="">
          <option value="" disabled>
            Ciudad
          </option>
          <option value="la-paz">La Paz</option>
          <option value="cochabamba">Cochabamba</option>
        </Select>
      </Seccion>

      <Seccion titulo="SocialLinks — completo">
        <SocialLinks perfilId="dev-perfil" whatsapp="59171234567" instagramUsername="dulcesdeana" otraRedSocial="TikTok: @dulcesdeana" />
      </Seccion>

      <Seccion titulo="SocialLinks — solo WhatsApp">
        <SocialLinks perfilId="dev-perfil" whatsapp="59171234567" instagramUsername={null} otraRedSocial={null} />
      </Seccion>

      <Seccion titulo="PriceTag — precio normal">
        <PriceTag perfilId="dev-perfil" precio={120} porcentaje={null} precioConDescuento={null} consultarPrecio={false} whatsapp="59171234567" />
      </Seccion>

      <Seccion titulo="PriceTag — con descuento vigente">
        <PriceTag perfilId="dev-perfil" precio={120} porcentaje={20} precioConDescuento={96} consultarPrecio={false} whatsapp="59171234567" />
      </Seccion>

      <Seccion titulo="PriceTag — consultar precio">
        <PriceTag
          perfilId="dev-perfil"
          precio={null}
          porcentaje={null}
          precioConDescuento={null}
          consultarPrecio
          whatsapp="59171234567"
        />
      </Seccion>

      <Seccion titulo="EmprendedoraCard">
        <div className="max-w-sm">
          <EmprendedoraCard perfil={PERFIL_EJEMPLO} />
        </div>
      </Seccion>

      <Seccion titulo="ProductoCard — los tres estados de precio">
        <div className="max-w-sm">
          <ProductoCard producto={PRODUCTO_NORMAL} />
        </div>
        <div className="max-w-sm">
          <ProductoCard producto={PRODUCTO_CON_DESCUENTO} />
        </div>
        <div className="max-w-sm">
          <ProductoCard producto={PRODUCTO_CONSULTAR_PRECIO} />
        </div>
      </Seccion>

      <Seccion titulo="TarjetaEsqueleto (paso 9, estado de carga)">
        <div className="max-w-sm">
          <TarjetaEsqueleto />
        </div>
      </Seccion>
    </main>
  );
}
