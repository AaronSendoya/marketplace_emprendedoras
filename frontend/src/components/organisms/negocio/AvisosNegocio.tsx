import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { CLASES_FOCO_ENLACE, CLASES_TARJETA_NEGOCIO } from "@/lib/estilos";
import type { AvisoNegocio, TonoAviso } from "@/lib/negocio/avisos";

interface PropsAvisosNegocio {
  avisos: AvisoNegocio[];
}

// Un punto de color por tono; el texto siempre dice lo mismo que el color, que solo ayuda a barrer
// la lista con la vista (nada depende de distinguirlo).
const PUNTO_POR_TONO: Record<TonoAviso, string> = {
  atencion: "bg-enfasis",
  promocion: "bg-secundario",
  programada: "bg-secundario/40",
  info: "bg-texto-secundario/50",
};

// Orientación breve (qué conviene revisar), no un centro de notificaciones ni indicadores de
// rendimiento: lo calcula calcularAvisos() solo con los productos y promociones de la emprendedora.
export function AvisosNegocio({ avisos }: PropsAvisosNegocio) {
  return (
    <section aria-labelledby="titulo-avisos" className="space-y-3">
      <h2 id="titulo-avisos" className="font-titulo text-lg font-bold text-texto">
        Avisos
      </h2>

      {avisos.length === 0 ? (
        <div className={`flex items-center gap-3 px-5 py-4 ${CLASES_TARJETA_NEGOCIO}`}>
          <CircleCheck size={20} strokeWidth={1.6} aria-hidden="true" className="shrink-0 text-salvia" />
          <p className="font-cuerpo text-sm text-texto-secundario">Todo en orden. Cuando haya algo que revisar, lo verás aquí.</p>
        </div>
      ) : (
        <ul className={`divide-y divide-borde ${CLASES_TARJETA_NEGOCIO}`}>
          {avisos.map((aviso) => (
            <li key={aviso.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="flex items-start gap-3 font-cuerpo text-sm text-texto">
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PUNTO_POR_TONO[aviso.tono]}`} />
                {aviso.texto}
              </p>
              {aviso.accion && (
                <Link
                  href={aviso.accion.href}
                  className={`flex min-h-9 shrink-0 items-center pl-5 font-cuerpo text-sm font-medium text-acento hover:underline sm:pl-0 ${CLASES_FOCO_ENLACE}`}
                >
                  {aviso.accion.etiqueta}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
