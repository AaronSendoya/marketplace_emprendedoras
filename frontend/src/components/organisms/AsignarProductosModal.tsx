"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { asignarDescuentoAction, quitarDescuentoAction } from "@/lib/admin/descuentos-acciones";
import type { Descuento, ProductoPropio } from "@/lib/api/tipos";
import { mensajeDeFallo, type ResultadoDeAccion } from "@/lib/errores/clasificar";
import { useTrampaDeFoco } from "@/lib/hooks/useTrampaDeFoco";

// Asignar y quitar un producto de un descuento. Por defecto son las acciones del Admin; el panel de
// la Emprendedora pasa las suyas (otra ruta a revalidar) y sus propios textos.
export interface AccionesAsignacion {
  asignar: (descuentoId: string, productoId: string) => Promise<void | ResultadoDeAccion>;
  quitar: (descuentoId: string, productoId: string) => Promise<void | ResultadoDeAccion>;
}

interface PropsAsignarProductosModal {
  descuento: Descuento;
  productos: ProductoPropio[];
  usuarioId?: string;
  abierto: boolean;
  onCerrar: () => void;
  acciones?: AccionesAsignacion;
  titulo?: string;
  textoSinProductos?: string;
}

// Checklist contra producto_ids del descuento: el backend no tiene un "reemplazar todo", solo
// asignar (regla 9: 403 si el producto es de otro perfil, por eso esta lista ya viene acotada al
// mismo perfil del descuento) y quitar, uno por uno.
export function AsignarProductosModal({
  descuento,
  productos,
  usuarioId = "",
  abierto,
  onCerrar,
  acciones,
  titulo = "Productos con este descuento",
  textoSinProductos = "Todavía no hay productos en este perfil.",
}: PropsAsignarProductosModal) {
  const asignar = acciones?.asignar ?? ((descuentoId: string, productoId: string) => asignarDescuentoAction(descuentoId, productoId, usuarioId));
  const quitar = acciones?.quitar ?? ((descuentoId: string, productoId: string) => quitarDescuentoAction(descuentoId, productoId, usuarioId));
  const [, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  // Cerrar limpia el aviso: al volver a abrir no queda el de la vez anterior.
  const cerrar = () => {
    setError(null);
    onCerrar();
  };

  const dialogoRef = useRef<HTMLDivElement>(null);
  useTrampaDeFoco(dialogoRef, abierto);

  useEffect(() => {
    if (!abierto) return;
    cerrarRef.current?.focus();
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  function alCambiar(productoId: string, asignado: boolean) {
    iniciarTransicion(async () => {
      setError(null);
      try {
        const resultado = asignado ? await quitar(descuento.id, productoId) : await asignar(descuento.id, productoId);
        // La casilla sigue el estado del servidor (`producto_ids`): si falló, no cambia y aquí se dice por qué.
        if (resultado && typeof resultado === "object" && resultado.error) setError(resultado.error);
      } catch (fallo) {
        setError(mensajeDeFallo(fallo));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        ref={dialogoRef}
        tabIndex={-1}
        aria-labelledby="asignar-productos-titulo"
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
      >
        <h2 id="asignar-productos-titulo" className="font-titulo text-lg font-bold text-texto">
          {titulo}
        </h2>

        {productos.length === 0 ? (
          <p className="font-cuerpo text-sm text-texto-secundario">{textoSinProductos}</p>
        ) : (
          <ul className="space-y-1">
            {productos.map((producto) => {
              const asignado = descuento.producto_ids.includes(producto.id);
              return (
                <li key={producto.id}>
                  <label className="flex items-center gap-3 rounded-md px-2 py-2 font-cuerpo text-sm text-texto hover:bg-fondo">
                    <input type="checkbox" checked={asignado} onChange={() => alCambiar(producto.id, asignado)} />
                    {producto.nombre}
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-error-borde bg-error-suave px-3 py-2 font-cuerpo text-sm text-texto">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button ref={cerrarRef} type="button" onClick={cerrar} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
