"use client";

import { ChevronDown, CircleAlert, Download, Info, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { descargarPlantillaAction } from "@/lib/admin/importacion-acciones";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";
import { bytesDeBase64, descargarArchivo } from "@/lib/importacion/descarga";
import { TIPO_XLSX } from "@/lib/importacion/validarArchivo";
import { ID_GUIA_DEL_EXCEL } from "./AlertaDeArchivo";

type Condicion = "obligatoria" | "opcional" | "ignorada";

// Los 14 encabezados del Excel de Google Forms, tal como salen y en su orden (el último termina en un espacio, como en el
// formulario real; el orden real no importa al importar). Es lo mismo que lleva la fila 1 de la plantilla descargable
// (`ENCABEZADOS_DEL_FORMULARIO`, backend). Las obligatorias no pueden faltar en cada fila; las opcionales se importan sin ese dato
// si faltan; las ignoradas se leen y no se guardan (regla 22). En el ejemplo, una persona inventada.
const COLUMNAS: readonly { encabezado: string; condicion: Condicion; ejemplo: string }[] = [
  { encabezado: "Marca temporal", condicion: "ignorada", ejemplo: "07/10/2026 14:32:10" },
  { encabezado: "Dirección de correo electrónico", condicion: "obligatoria", ejemplo: "ana.perez@ejemplo.com" },
  { encabezado: "Nombre Completo", condicion: "obligatoria", ejemplo: "Ana María Pérez Rojas" },
  { encabezado: "Número de WhatsApp", condicion: "obligatoria", ejemplo: "71234567" },
  { encabezado: "Ciudad", condicion: "obligatoria", ejemplo: "La Paz" },
  { encabezado: "Sube tu foto", condicion: "ignorada", ejemplo: "" },
  { encabezado: "Nombre de tu emprendimiento", condicion: "obligatoria", ejemplo: "Dulces de Ana" },
  { encabezado: "Breve descripción", condicion: "obligatoria", ejemplo: "Postres caseros y tortas por encargo." },
  { encabezado: "Sube el logo de tu emprendimiento", condicion: "ignorada", ejemplo: "" },
  { encabezado: "Rubro", condicion: "obligatoria", ejemplo: "Alimentos y bebidas" },
  { encabezado: "Instagram de tu emprendimiento", condicion: "opcional", ejemplo: "@dulcesdeana" },
  { encabezado: "Otra red social", condicion: "opcional", ejemplo: "https://www.facebook.com/dulcesdeana" },
  { encabezado: "¿Te gustaría ofrecer algo especial a las emprendedoras del Track de Mujeres 2026?", condicion: "ignorada", ejemplo: "" },
  { encabezado: "Cuéntanos sobre tu beneficio ", condicion: "ignorada", ejemplo: "" },
];

// Cada condición se dice con texto en el propio encabezado y además con color: el color solo no alcanza.
const CONDICIONES: Record<Condicion, { etiqueta: string; fondo: string; muestra: string }> = {
  obligatoria: { etiqueta: "Obligatoria", fondo: "bg-secundario text-white", muestra: "border-secundario bg-secundario" },
  opcional: { etiqueta: "Opcional", fondo: "bg-secundario-suave text-secundario", muestra: "border-secundario bg-secundario-suave" },
  ignorada: { etiqueta: "Se ignora", fondo: "bg-fondo text-texto-secundario", muestra: "border-borde-fuerte bg-fondo" },
};

const CONSEJOS = [
  "Escribe el nombre y los apellidos juntos: «Ana María Pérez Rojas».",
  "El WhatsApp de Bolivia tiene 8 dígitos y empieza con 6 o 7.",
  "Una cuenta con un correo que ya existe se omite: no se cambia nada de lo que ya tiene.",
  "Si al archivo le falta una columna o trae otras que no conocemos, igual se lee: en el paso siguiente te decimos cuáles son y completas lo que falte ahí.",
];

// La guía corta del paso 1 (regla 22): siempre disponible, abierta por defecto. Muestra el formato recomendado con una tabla de
// ejemplo (datos inventados) y ofrece la plantilla en `.xlsx`.
export function GuiaDelExcel() {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargarPlantilla() {
    setDescargando(true);
    setError(null);
    try {
      const respuesta = await descargarPlantillaAction();
      if (!respuesta.ok) return setError(respuesta.error);
      descargarArchivo("plantilla-emprendedoras.xlsx", bytesDeBase64(respuesta.base64), TIPO_XLSX);
    } catch {
      setError("No pudimos descargar la plantilla. Revisa tu conexión y vuelve a intentarlo.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <details id={ID_GUIA_DEL_EXCEL} open className={`${CLASES_PANEL_ADMIN} group`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-4 font-titulo text-lg font-bold text-texto focus-visible:ring-2 focus-visible:ring-foco focus-visible:outline-none sm:p-5 [&::-webkit-details-marker]:hidden">
        ¿Cómo debe verse mi Excel?
        <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-texto-secundario transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>

      <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <p className="font-cuerpo text-sm text-texto-secundario">
          Usa el mismo archivo que descargas de Google Forms. Los encabezados van en la <b className="font-semibold text-texto">fila 1</b>; el orden de las
          columnas no importa y se perdonan mayúsculas, tildes y erratas pequeñas.
        </p>

        <div className="relative overflow-x-auto rounded-md border border-borde" role="region" aria-label="Ejemplo de columnas" tabIndex={0}>
          <table className="min-w-max border-collapse text-left font-cuerpo text-xs">
            <thead>
              <tr>
                {COLUMNAS.map(({ encabezado, condicion }, indice) => (
                  <th key={indice} scope="col" className={`max-w-56 min-w-36 px-2.5 py-2 align-top font-semibold ${CONDICIONES[condicion].fondo}`}>
                    <span className="block">{encabezado}</span>
                    <span className="mt-0.5 block font-normal">{CONDICIONES[condicion].etiqueta}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {COLUMNAS.map(({ ejemplo }, indice) => (
                  <td key={indice} className="border-t border-borde px-2.5 py-2 whitespace-nowrap text-texto">
                    {ejemplo || (
                      <span aria-hidden="true" className="text-texto-secundario">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-1 font-cuerpo text-xs text-texto-secundario">
          {(Object.keys(CONDICIONES) as Condicion[]).map((condicion) => (
            <li key={condicion} className="flex items-start gap-1.5">
              <span aria-hidden="true" className={`mt-0.5 size-3 shrink-0 rounded-sm border ${CONDICIONES[condicion].muestra}`} />
              <span>
                <b className="font-semibold text-texto">{CONDICIONES[condicion].etiqueta}:</b>{" "}
                {condicion === "obligatoria" && "no puede faltar en ninguna fila"}
                {condicion === "opcional" && "si falta, la fila se importa sin ese dato"}
                {condicion === "ignorada" && "se lee pero no se guarda (marca temporal, fotos, logo y beneficio)"}
              </span>
            </li>
          ))}
        </ul>

        <ul className="list-disc space-y-1 pl-5 font-cuerpo text-sm text-texto marker:text-texto-secundario">
          {CONSEJOS.map((consejo) => (
            <li key={consejo}>{consejo}</li>
          ))}
        </ul>

        <p className="flex items-start gap-2.5 rounded-md border border-aviso-borde bg-aviso-suave px-3 py-2.5 font-cuerpo text-sm text-aviso">
          <Info size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
          Las fotos y los logos no se cargan aquí. Cada perfil usa la imagen predeterminada hasta que subas la suya desde su emprendimiento.
        </p>

        <button type="button" onClick={descargarPlantilla} disabled={descargando} className={clasesBoton("secundario", "min-h-11 w-full sm:w-auto lg:min-h-0")}>
          {descargando ? <LoaderCircle size={16} strokeWidth={2} aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Download size={16} strokeWidth={1.75} aria-hidden="true" />}
          {descargando ? "Preparando…" : "Descargar plantilla de ejemplo (.xlsx)"}
        </button>
        {error && (
          <p role="alert" className="flex items-start gap-2 font-cuerpo text-sm text-texto">
            <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0 text-error" />
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
