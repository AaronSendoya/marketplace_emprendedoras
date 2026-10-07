"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Regla 22: avisa antes de irse de una pantalla con trabajo sin terminar (cambios sin importar, una importación en curso,
// credenciales sin descargar). Cubre dos salidas: cerrar o recargar la pestaña (el aviso nativo del navegador, que no admite un
// texto propio) y pulsar cualquier enlace interno (menú lateral, "Volver", etc.), que se detiene y pregunta con un modal.
// No cubre el botón "atrás" del navegador: Next no permite interceptarlo de forma fiable.
export function useAvisoAlSalir(activo: boolean) {
  const router = useRouter();
  const [destinoPendiente, setDestinoPendiente] = useState<string | null>(null);
  // Tras confirmar, la navegación pasa sin volver a preguntar.
  const permitido = useRef(false);

  useEffect(() => {
    if (!activo) return;

    function antesDeCerrar(evento: BeforeUnloadEvent) {
      if (permitido.current) return;
      evento.preventDefault();
      // Algunos navegadores antiguos exigen asignarlo para mostrar el aviso.
      evento.returnValue = "";
    }

    function alPulsarEnlace(evento: MouseEvent) {
      if (permitido.current || evento.defaultPrevented || evento.button !== 0) return;
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const enlace = (evento.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!enlace || enlace.target === "_blank" || enlace.hasAttribute("download")) return;

      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin) return;
      // Un enlace a la misma página (un ancla) no se va a ninguna parte.
      if (destino.pathname === window.location.pathname && destino.search === window.location.search) return;

      evento.preventDefault();
      evento.stopPropagation();
      setDestinoPendiente(`${destino.pathname}${destino.search}${destino.hash}`);
    }

    window.addEventListener("beforeunload", antesDeCerrar);
    // En captura: se adelanta al `Link` de Next, que también escucha el clic.
    document.addEventListener("click", alPulsarEnlace, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeCerrar);
      document.removeEventListener("click", alPulsarEnlace, true);
    };
  }, [activo]);

  const cancelar = useCallback(() => setDestinoPendiente(null), []);

  const confirmar = useCallback(async () => {
    const destino = destinoPendiente;
    if (!destino) return;
    permitido.current = true;
    router.push(destino);
  }, [destinoPendiente, router]);

  return { destinoPendiente, cancelar, confirmar };
}
