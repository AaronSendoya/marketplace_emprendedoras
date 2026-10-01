"use client";

import { useEffect } from "react";

interface PropsGlobalError {
  error: Error & { digest?: string };
  retry: () => void;
}

// Última red de seguridad: solo se activa si falla el layout raíz mismo (error.tsx no lo cubre,
// ver docs/file-conventions/error.md, sección "Global Error"). Por eso define su propio
// <html>/<body> y usa estilos inline: este archivo reemplaza el layout entero, así que no hereda
// globals.css ni las fuentes de next/font.
export default function ErrorGlobalRaiz({ error, retry }: PropsGlobalError) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#FAFAF9",
          color: "#1C1917",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Algo salió mal</h1>
        <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#57534E", margin: 0 }}>
          Ocurrió un error inesperado. Intenta recargar la página.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            borderRadius: "0.375rem",
            border: "none",
            backgroundColor: "#9D174D",
            color: "#FFFFFF",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
