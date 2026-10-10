"use client";

import { useEffect } from "react";
import { PantallaDeError } from "@/components/molecules/PantallaDeError";
import { reportarError } from "@/lib/errores/reportar";

interface PropsError {
  error: Error & { digest?: string };
  retry: () => void;
}

// El error crítico de una pantalla del panel del Admin: ocupa el lugar del contenido y deja en pie el menú lateral (este archivo
// vive dentro del layout de /admin), así que la persona puede ir a otra sección sin recargar. Un error del propio layout (por
// ejemplo, no poder leer la sesión) sube a `app/error.tsx`.
export default function ErrorDelPanelDelAdmin({ error, retry }: PropsError) {
  useEffect(() => {
    console.error(error);
    reportarError("panel", error, "app/admin/error");
  }, [error]);

  return (
    <PantallaDeError
      variante="panel"
      que="esta sección"
      referencia={error.digest}
      onReintentar={() => retry()}
      salida={{ href: "/admin/dashboard", etiqueta: "Ir al Dashboard" }}
    />
  );
}
