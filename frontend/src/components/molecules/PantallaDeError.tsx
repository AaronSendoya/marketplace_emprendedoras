"use client";

import { RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";
import { useEnLinea } from "@/lib/errores/useEnLinea";

interface PropsPantallaDeError {
  // `pagina`: ocupa la página (sitio público); `panel`: dentro del panel del Admin o de la Emprendedora, que conserva su menú.
  variante: "pagina" | "panel";
  // Qué no se pudo cargar, en palabras de la persona («este emprendimiento», «el panel»). Entra en el título.
  que?: string;
  // El identificador que Next le pone al error: sirve para pedir ayuda y cruzarlo con el registro del servidor.
  referencia?: string;
  onReintentar: () => void;
  // A dónde puede ir en vez de reintentar.
  salida: { href: string; etiqueta: string };
}

// La pantalla de respaldo de los errores CRÍTICOS: los que impiden mostrar la página (el servidor no responde, la base de datos
// está fuera de servicio, algo se rompió al dibujar). Los fallos que no impiden seguir —una imagen que no abre, un gráfico, un
// formulario que no se pudo guardar— no llegan aquí: se resuelven en su lugar (ver `lib/errores/clasificar.ts`).
//
// Qué dice: nunca el mensaje del error (puede traer detalles internos, regla 17 del backend), solo un texto general y, si el
// navegador sabe que no hay internet, eso mismo. Qué ofrece: reintentar sin perder la navegación, y una salida a un lugar que sí
// funciona.
export function PantallaDeError({ variante, que = "esta página", referencia, onReintentar, salida }: PropsPantallaDeError) {
  const enLinea = useEnLinea();
  const Icono = enLinea ? TriangleAlert : WifiOff;
  const titulo = enLinea ? "Algo salió mal" : "Sin conexión a internet";
  const descripcion = enLinea
    ? `No pudimos cargar ${que}. Puede ser un problema temporal de conexión con el servidor; reintentar suele bastar.`
    : `No pudimos cargar ${que} porque tu dispositivo no tiene internet. Reintenta cuando vuelva la conexión.`;

  const contenido = (
    <>
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-aviso-suave text-aviso">
        <Icono size={28} strokeWidth={1.75} />
      </span>
      <h1 className="font-titulo text-xl font-bold text-texto">{titulo}</h1>
      <p className="max-w-sm font-cuerpo text-sm text-texto-secundario">{descripcion}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onReintentar} className={clasesBoton("primario", "min-h-11 lg:min-h-0")}>
          <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
          Reintentar
        </button>
        <Link href={salida.href} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
          {salida.etiqueta}
        </Link>
      </div>
      {referencia && <p className="font-cuerpo text-xs text-texto-secundario">Código de referencia: {referencia}</p>}
    </>
  );

  if (variante === "panel") {
    return (
      <section role="alert" className={`${CLASES_PANEL_ADMIN} flex flex-col items-center gap-4 px-6 py-14 text-center`}>
        {contenido}
      </section>
    );
  }
  return (
    <main role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      {contenido}
    </main>
  );
}
