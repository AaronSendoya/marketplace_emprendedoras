import { CircleX, Info, TriangleAlert } from "lucide-react";
import type { AvisoImportacion } from "@/lib/api/tipos";

const ICONO = {
  error: <CircleX size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-error" />,
  revisar: <TriangleAlert size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-aviso" />,
  info: <Info size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-texto-secundario" />,
};

const FONDO = {
  error: "bg-error-suave text-texto",
  revisar: "bg-aviso-suave text-texto",
  info: "bg-fondo text-texto-secundario",
};

const NOMBRE = { error: "Error", revisar: "Para revisar", info: "Información" };

// Las advertencias de una fila, con el mensaje que arma el backend tal cual (regla 22): qué pasó, con el dato afectado, y qué
// hacer. El icono y el texto oculto de la gravedad hacen que no dependa solo del color.
export function AvisosDeFila({ avisos, id }: { avisos: AvisoImportacion[]; id?: string }) {
  if (avisos.length === 0) return null;
  return (
    <ul id={id} className="space-y-1.5">
      {avisos.map((aviso, i) => (
        <li key={`${aviso.codigo}-${i}`} className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 font-cuerpo text-xs ${FONDO[aviso.severidad]}`}>
          {ICONO[aviso.severidad]}
          <span>
            <span className="sr-only">{NOMBRE[aviso.severidad]}: </span>
            {aviso.mensaje}
          </span>
        </li>
      ))}
    </ul>
  );
}
