"use client";

import { useSyncExternalStore } from "react";

function suscribir(alCambiar: () => void) {
  window.addEventListener("online", alCambiar);
  window.addEventListener("offline", alCambiar);
  return () => {
    window.removeEventListener("online", alCambiar);
    window.removeEventListener("offline", alCambiar);
  };
}

// ¿El navegador dice que tiene internet? Es una pista, no una garantía (estar «en línea» no significa que el servidor responda): sirve
// para explicar mejor un fallo («no hay internet») y para el aviso de la parte baja de la pantalla. En el servidor siempre «sí».
export function useEnLinea(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );
}
