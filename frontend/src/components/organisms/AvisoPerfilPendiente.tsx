import { Info } from "lucide-react";

// Aviso del detalle de un emprendimiento cuya cuenta todavía no tiene perfil: explica por qué la
// pantalla es solo un formulario y qué se habilita al crearlo (las pestañas Productos y Descuentos,
// que existen pero están bloqueadas). Es informativo y fijo, no una alerta: no lleva `role="alert"`.
export function AvisoPerfilPendiente() {
  return (
    <div role="note" className="flex gap-3 rounded-lg border border-secundario/25 bg-secundario-suave p-4">
      <Info size={20} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-secundario" />
      <div className="space-y-1 font-cuerpo text-sm text-texto">
        <p className="font-semibold">Perfil pendiente</p>
        <p className="text-texto-secundario">
          Mientras no tenga perfil, esta emprendedora no aparece en el catálogo público y no se le pueden agregar productos ni descuentos. Crea su
          perfil con el formulario de abajo y se habilitarán las pestañas Productos y Descuentos.
        </p>
      </div>
    </div>
  );
}
