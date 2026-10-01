"use client";

import Link from "next/link";
import { useEffect } from "react";
import { clasesBoton } from "@/components/atoms/Button";

interface PropsError {
  error: Error & { digest?: string };
  retry: () => void;
}

// Red de seguridad de toda la app (Next 16.3: el boundary usa `retry`, no `reset`, ver
// node_modules/next/dist/docs/.../file-conventions/error.md). Cubre cualquier error no esperado
// al renderizar una página, típicamente el backend caído o una respuesta inesperada de la API:
// en vez de la pantalla en blanco de React, esto ofrece reintentar sin perder la navegación.
// Nunca muestra error.message (regla 17 backend: nada de detalles internos al usuario); solo va
// a la consola para depurar.
export default function ErrorGlobal({ error, retry }: PropsError) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-titulo text-xl font-bold text-texto">Algo salió mal</h1>
      <p className="max-w-sm font-cuerpo text-sm text-texto-secundario">
        No pudimos cargar esta página. Puede ser un problema temporal de conexión con el servidor.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => retry()} className={clasesBoton("primario")}>
          Reintentar
        </button>
        <Link href="/" className={clasesBoton("secundario")}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
