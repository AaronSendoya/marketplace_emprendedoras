import { Check, CircleX, Minus, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { EstadoFilaImportacion } from "@/lib/api/tipos";

const TAMANO_ICONO = 14;

// Una insignia por fila de la vista previa (regla 22): icono, color y texto, nunca solo color (regla 13, punto i).
const ESTADOS: Record<EstadoFilaImportacion, { etiqueta: string; clases: string; icono: ReactNode }> = {
  lista: {
    etiqueta: "Lista",
    clases: "border-salvia/25 bg-salvia-suave text-salvia",
    icono: <Check size={TAMANO_ICONO} strokeWidth={2.4} aria-hidden="true" />,
  },
  revisar: {
    etiqueta: "Para revisar",
    clases: "border-aviso-borde bg-aviso-suave text-aviso",
    icono: <TriangleAlert size={TAMANO_ICONO} strokeWidth={2} aria-hidden="true" />,
  },
  error: {
    etiqueta: "Con error",
    clases: "border-error-borde bg-error-suave text-error",
    icono: <CircleX size={TAMANO_ICONO} strokeWidth={2.2} aria-hidden="true" />,
  },
  ya_existe: {
    etiqueta: "Ya existe",
    clases: "border-borde-fuerte bg-fondo text-texto-secundario",
    icono: <Minus size={TAMANO_ICONO} strokeWidth={2} aria-hidden="true" />,
  },
  repetida: {
    etiqueta: "Repetida",
    clases: "border-borde-fuerte bg-fondo text-texto-secundario",
    icono: <Minus size={TAMANO_ICONO} strokeWidth={2} aria-hidden="true" />,
  },
};

export const ETIQUETA_ESTADO = Object.fromEntries(Object.entries(ESTADOS).map(([estado, { etiqueta }]) => [estado, etiqueta])) as Record<EstadoFilaImportacion, string>;

export function InsigniaDeEstado({ estado }: { estado: EstadoFilaImportacion }) {
  const { etiqueta, clases, icono } = ESTADOS[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-cuerpo text-xs font-medium whitespace-nowrap ${clases}`}>
      {icono}
      {etiqueta}
    </span>
  );
}
