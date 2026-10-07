"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { ID_ENTRADA_DE_EXCEL } from "./ZonaDeArchivo";

export const ID_GUIA_DEL_EXCEL = "guia-del-excel";

interface PropsAlerta {
  titulo: string;
  mensaje: string;
  // El archivo se rechazó por su contenido o su formato: ayuda ver cómo debe verse. Si el problema es la sesión o la conexión,
  // no.
  conGuia?: boolean;
  // Elegir otro archivo no tiene sentido si la sesión venció: ahí se ofrece volver a iniciar sesión.
  enlaceDeSesion?: boolean;
}

// El aviso de un archivo rechazado, en el paso 1 (regla 22): dice qué pasó y qué hacer, con el mensaje situacional tal cual, y
// ofrece el siguiente paso en un clic. `role="alert"` para que un lector de pantalla lo anuncie.
export function AlertaDeArchivo({ titulo, mensaje, conGuia = false, enlaceDeSesion = false }: PropsAlerta) {
  function elegirOtro() {
    document.getElementById(ID_ENTRADA_DE_EXCEL)?.click();
  }

  function verGuia() {
    const guia = document.getElementById(ID_GUIA_DEL_EXCEL) as HTMLDetailsElement | null;
    if (!guia) return;
    guia.open = true;
    guia.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-error-borde bg-error-suave p-4">
      <CircleAlert size={22} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-error" />
      <div className="min-w-0 space-y-1">
        <p className="font-cuerpo text-base font-semibold text-error">{titulo}</p>
        <p className="font-cuerpo text-sm text-texto">{mensaje}</p>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          {enlaceDeSesion ? (
            <Link href="/iniciar-sesion" className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
              Iniciar sesión
            </Link>
          ) : (
            <button type="button" onClick={elegirOtro} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
              Elegir otro archivo
            </button>
          )}
          {conGuia && (
            <button type="button" onClick={verGuia} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
              Ver formato esperado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
