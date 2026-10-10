"use client";

import { useEffect } from "react";
import { PantallaDeError } from "@/components/molecules/PantallaDeError";
import { reportarError } from "@/lib/errores/reportar";

interface PropsError {
  error: Error & { digest?: string };
  retry: () => void;
}

// El error crítico de una pantalla del panel de la Emprendedora: deja en pie su menú (riel y barra inferior) y ofrece reintentar o
// volver al resumen.
export default function ErrorDelPanelDeLaEmprendedora({ error, retry }: PropsError) {
  useEffect(() => {
    console.error(error);
    reportarError("panel", error, "app/mi-negocio/error");
  }, [error]);

  return (
    <PantallaDeError
      variante="panel"
      que="esta sección de tu negocio"
      referencia={error.digest}
      onReintentar={() => retry()}
      salida={{ href: "/mi-negocio", etiqueta: "Ir al resumen" }}
    />
  );
}
