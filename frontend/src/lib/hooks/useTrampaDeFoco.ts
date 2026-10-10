"use client";

import { useEffect, type RefObject } from "react";

// Elementos a los que se llega con la tecla Tab.
const FOCALIZABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function focalizables(contenedor: HTMLElement): HTMLElement[] {
  // Solo los que se ven: un campo oculto con `display: none` no recibe el foco y dejaría la trampa sin salida.
  return Array.from(contenedor.querySelectorAll<HTMLElement>(FOCALIZABLES)).filter((elemento) => elemento.getClientRects().length > 0);
}

// Un modal es la capa de arriba si es el último `aria-modal` del documento (con un modal sobre otro, p. ej. «¿Descartar los cambios?»
// sobre un formulario, solo el de arriba atrapa el foco).
function esLaCapaDeArriba(contenedor: HTMLElement): boolean {
  const modales = document.querySelectorAll('[aria-modal="true"]');
  return modales[modales.length - 1] === contenedor;
}

// Accesibilidad de un modal (WCAG 2.1.2 y 2.4.3): mientras está abierto, la tecla Tab (y Mayús+Tab) recorre solo sus controles y
// vuelve al primero, en lugar de salir a la página que queda detrás; si el foco llega a quedar fuera, lo devuelve; y al cerrarse
// el foco vuelve al elemento que lo abrió. Escape, el bloqueo del desplazamiento y el foco inicial los resuelve cada modal.
//
// Debe llamarse ANTES que el efecto que mueve el foco al abrir (los efectos corren en el orden en que se declaran): así recuerda
// el elemento que tenía el foco antes de abrir el modal. El contenedor lleva `tabIndex={-1}` para poder recibir el foco si no tiene
// ningún control.
export function useTrampaDeFoco(contenedor: RefObject<HTMLElement | null>, activo: boolean): void {
  useEffect(() => {
    if (!activo) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Si el modal no movió el foco adentro (p. ej. se abrió desde un menú), se lleva al primer campo, o al primer control.
    const inicial = window.requestAnimationFrame(() => {
      const modal = contenedor.current;
      if (!modal || modal.contains(document.activeElement)) return;
      (modal.querySelector<HTMLElement>("input:not([disabled]):not([type=hidden]), textarea:not([disabled])") ?? focalizables(modal)[0] ?? modal).focus();
    });

    function alTabular(evento: KeyboardEvent) {
      if (evento.key !== "Tab") return;
      const modal = contenedor.current;
      if (!modal || !esLaCapaDeArriba(modal)) return;
      const controles = focalizables(modal);
      if (controles.length === 0) {
        evento.preventDefault();
        modal.focus();
        return;
      }
      const primero = controles[0];
      const ultimo = controles[controles.length - 1];
      const enfocado = document.activeElement;
      if (!modal.contains(enfocado)) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primero).focus();
      } else if (evento.shiftKey && enfocado === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && enfocado === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    // Un clic o un lector de pantalla pueden llevar el foco fuera sin pasar por Tab.
    function alEnfocar(evento: FocusEvent) {
      const modal = contenedor.current;
      if (!modal || !esLaCapaDeArriba(modal) || !(evento.target instanceof Node) || modal.contains(evento.target)) return;
      (focalizables(modal)[0] ?? modal).focus();
    }

    document.addEventListener("keydown", alTabular, true);
    document.addEventListener("focusin", alEnfocar);
    return () => {
      window.cancelAnimationFrame(inicial);
      document.removeEventListener("keydown", alTabular, true);
      document.removeEventListener("focusin", alEnfocar);
      if (anterior?.isConnected) anterior.focus();
    };
  }, [activo, contenedor]);
}
