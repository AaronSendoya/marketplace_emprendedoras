"use client";

import { ChevronDown, CircleAlert, Download, Info, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { descargarPlantillaAction } from "@/lib/admin/importacion-acciones";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";
import { bytesDeBase64, descargarArchivo } from "@/lib/importacion/descarga";
import { TIPO_XLSX } from "@/lib/importacion/validarArchivo";
import { ID_GUIA_DEL_EXCEL } from "./AlertaDeArchivo";

// Las columnas que el Excel debe traer, en el orden del formulario (el orden real no importa). `obligatoria` marca las que no
// pueden faltar; las demás, solo Instagram, se importan sin ese dato si faltan (regla 22, backend).
const COLUMNAS = [
  { encabezado: "Correo", ejemplo: "ana.perez@ejemplo.com", obligatoria: true },
  { encabezado: "Nombre completo", ejemplo: "Ana María Pérez Rojas", obligatoria: true },
  { encabezado: "Número de WhatsApp", ejemplo: "71234567", obligatoria: true },
  { encabezado: "Ciudad", ejemplo: "La Paz", obligatoria: true },
  { encabezado: "Nombre de tu emprendimiento", ejemplo: "Dulces de Ana", obligatoria: true },
  { encabezado: "Breve descripción", ejemplo: "Postres caseros y tortas por encargo.", obligatoria: true },
  { encabezado: "Rubro", ejemplo: "Alimentos y bebidas", obligatoria: true },
  { encabezado: "Instagram", ejemplo: "@dulcesdeana", obligatoria: false },
];

const CONSEJOS = [
  "Escribe el nombre y los apellidos juntos: «Ana María Pérez Rojas».",
  "El WhatsApp de Bolivia tiene 8 dígitos y empieza con 6 o 7.",
  "Una cuenta con un correo que ya existe se omite: no se cambia nada de lo que ya tiene.",
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
          Usa el mismo archivo que descargas de Google Forms. Los encabezados van en la <b className="font-semibold text-texto">fila 1</b> y el orden de las columnas no importa.
        </p>

        <div className="relative overflow-x-auto rounded-md border border-borde" role="region" aria-label="Ejemplo de columnas" tabIndex={0}>
          <table className="min-w-[640px] border-collapse text-left font-cuerpo text-xs">
            <thead>
              <tr>
                {COLUMNAS.map(({ encabezado, obligatoria }) => (
                  <th key={encabezado} scope="col" className={`px-2.5 py-2 font-semibold whitespace-nowrap ${obligatoria ? "bg-secundario text-white" : "bg-secundario-suave text-secundario"}`}>
                    {encabezado}
                    {obligatoria && <span aria-hidden="true"> *</span>}
                    {obligatoria && <span className="sr-only"> (obligatoria)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {COLUMNAS.map(({ encabezado, ejemplo }) => (
                  <td key={encabezado} className="border-t border-borde px-2.5 py-2 whitespace-nowrap text-texto">
                    {ejemplo}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-1 font-cuerpo text-xs text-texto-secundario">
          <li>
            <b className="font-semibold text-texto">*</b> Obligatoria
          </li>
          <li>Con fondo claro: opcional</li>
          <li>Se ignoran: marca temporal, fotos, logo y beneficio</li>
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
