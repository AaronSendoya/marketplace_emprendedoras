import type { ReactNode } from "react";
import type { Perfil } from "@/lib/api/tipos";
import { CLASES_TARJETA_NEGOCIO } from "@/lib/estilos";
import { formatearFechaLaPaz } from "@/lib/formato/fecha";
import { formatearWhatsapp } from "@/lib/formato/whatsapp";

interface PropsPerfilNegocioVista {
  perfil: Perfil;
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-cuerpo text-xs font-semibold tracking-wider text-texto-secundario uppercase">{etiqueta}</dt>
      <dd className="mt-1 font-cuerpo text-[15px] break-words text-texto">{children}</dd>
    </div>
  );
}

// Los datos del perfil tal como están guardados. Sin enlaces de contacto (wa.me, Instagram): quien
// mira esta pantalla es la dueña, no una clienta, y el panel no registra clics ni los mide.
export function PerfilNegocioVista({ perfil }: PropsPerfilNegocioVista) {
  return (
    <section aria-labelledby="titulo-datos-perfil" className={`p-5 sm:p-8 ${CLASES_TARJETA_NEGOCIO}`}>
      <h2 id="titulo-datos-perfil" className="font-titulo text-lg font-bold text-texto">
        Datos de tu negocio
      </h2>

      <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Dato etiqueta="Descripción">
            <span className="whitespace-pre-line">{perfil.descripcion}</span>
          </Dato>
        </div>
        <Dato etiqueta="Rubro">{perfil.rubro.nombre}</Dato>
        <Dato etiqueta="Ciudad">{perfil.ciudad.nombre}</Dato>
        <Dato etiqueta="WhatsApp">{formatearWhatsapp(perfil.whatsapp)}</Dato>
        <Dato etiqueta="Instagram">{perfil.instagram_username ? `@${perfil.instagram_username}` : <span className="text-texto-secundario">No indicado</span>}</Dato>
        <Dato etiqueta="Otra red social">{perfil.otra_red_social ?? <span className="text-texto-secundario">No indicada</span>}</Dato>
        <Dato etiqueta="Última actualización">{formatearFechaLaPaz(perfil.actualizado_en, "siempre")}</Dato>
      </dl>
    </section>
  );
}
