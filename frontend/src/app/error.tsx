"use client";

import { useEffect } from "react";
import { PantallaDeError } from "@/components/molecules/PantallaDeError";
import { reportarError } from "@/lib/errores/reportar";

interface PropsError {
  error: Error & { digest?: string };
  retry: () => void;
}

// Red de seguridad de toda la app (Next 16.3: el boundary usa `retry`, no `reset`, ver
// node_modules/next/dist/docs/.../file-conventions/error.md). Cubre cualquier error no esperado
// al renderizar una página, típicamente el backend caído o una respuesta inesperada de la API:
// en vez de la pantalla en blanco de React, esto ofrece reintentar sin perder la navegación.
// Nunca muestra error.message (regla 17 backend: nada de detalles internos al usuario); solo el
// código de referencia (`digest`), que permite cruzarlo con el registro del servidor, y el
// reporte al servidor (`/api/errores`), que lo deja en su registro sin datos personales.
//
// Es la pantalla de respaldo de los errores CRÍTICOS (ver `lib/errores/clasificar.ts`). Los paneles
// tienen la suya (`app/admin/error.tsx`, `app/mi-negocio/error.tsx`) para conservar su menú.
export default function ErrorGlobal({ error, retry }: PropsError) {
  useEffect(() => {
    console.error(error);
    reportarError("pagina", error, "app/error");
  }, [error]);

  return <PantallaDeError variante="pagina" referencia={error.digest} onReintentar={() => retry()} salida={{ href: "/", etiqueta: "Volver al inicio" }} />;
}
