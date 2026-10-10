import { Check, Info, Minus, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { CAMPOS_DE_IMAGEN, estadoDeImagen, type CampoDeImagen, type EstadoDeImagen, type FilaEditable } from "@/lib/importacion/filas";

const TAMANO_ICONO = 13;

// Una insignia por imagen (regla 22): icono, color y texto, nunca solo color (regla 13, punto i). El mensaje completo de un
// problema está en las advertencias de la fila, debajo.
const ESTADOS: Record<EstadoDeImagen, { texto: string; clases: string; icono: ReactNode }> = {
  ok: {
    texto: "se cargará de Drive",
    clases: "border-salvia/25 bg-salvia-suave text-salvia",
    icono: <Check size={TAMANO_ICONO} strokeWidth={2.4} aria-hidden="true" />,
  },
  problema: {
    texto: "con problema, queda la predeterminada",
    clases: "border-aviso-borde bg-aviso-suave text-aviso",
    icono: <TriangleAlert size={TAMANO_ICONO} strokeWidth={2} aria-hidden="true" />,
  },
  sin_comprobar: {
    texto: "con enlace, sin comprobar",
    clases: "border-borde-fuerte bg-fondo text-texto-secundario",
    icono: <Info size={TAMANO_ICONO} strokeWidth={2} aria-hidden="true" />,
  },
  sin_imagen: {
    texto: "sin enlace, queda la predeterminada",
    clases: "border-borde-fuerte bg-fondo text-texto-secundario",
    icono: <Minus size={TAMANO_ICONO} strokeWidth={2} aria-hidden="true" />,
  },
};

const NOMBRE: Record<CampoDeImagen, string> = { foto: "Foto", logo: "Logo" };

// El estado de la foto y del logo de una fila de la vista previa. Una fila que se omite (ya tiene cuenta o repite un correo) no
// carga imágenes: no muestra nada.
export function EstadoDeImagenes({ fila }: { fila: FilaEditable }) {
  if (fila.estado === "ya_existe" || fila.estado === "repetida") return null;
  return (
    <ul aria-label={`Imágenes de la fila ${fila.fila}`} className="flex flex-wrap gap-1.5">
      {CAMPOS_DE_IMAGEN.map((campo) => {
        const { texto, clases, icono } = ESTADOS[estadoDeImagen(fila, campo)];
        return (
          <li key={campo} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-cuerpo text-xs font-medium ${clases}`}>
            {icono}
            <span>
              {NOMBRE[campo]}: {texto}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
