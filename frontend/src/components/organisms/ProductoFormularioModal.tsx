"use client";

import { CircleAlert } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Button, clasesBoton } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { CampoImagen } from "@/components/organisms/CampoImagen";
import { crearProductoAction, editarProductoAction, reemplazarImagenProductoAction, type EstadoFormularioProducto } from "@/lib/admin/productos-acciones";
import type { ProductoPropio } from "@/lib/api/tipos";

interface PropsProductoFormularioModal {
  perfilId: string;
  usuarioId: string;
  producto: ProductoPropio | null;
  abierto: boolean;
  onCerrar: () => void;
}

const CLASES_LABEL = "font-cuerpo text-sm font-medium text-texto";
const ESTADO_INICIAL: EstadoFormularioProducto = {};

// Un solo modal para alta y edición: la diferencia es `perfil_id` + imagen obligatoria (alta,
// multipart) contra solo los campos de texto por PATCH (edición) más, aparte, el reemplazo de
// imagen (CampoImagen, su propia ruta PUT .../imagen).
export function ProductoFormularioModal({ perfilId, usuarioId, producto, abierto, onCerrar }: PropsProductoFormularioModal) {
  const accionCrear = crearProductoAction.bind(null, usuarioId);
  const accionEditar = editarProductoAction.bind(null, producto?.id ?? "", usuarioId);
  const [estado, accion, pendiente] = useActionState(producto ? accionEditar : accionCrear, ESTADO_INICIAL);
  const accionImagen = reemplazarImagenProductoAction.bind(null, producto?.id ?? "", usuarioId);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (estado.guardado) onCerrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.guardado]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="producto-formulario-titulo"
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[calc(100vh-2rem)] w-full max-w-md space-y-5 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
      >
        <h2 id="producto-formulario-titulo" className="font-titulo text-lg font-bold text-texto">
          {producto ? "Editar producto" : "Agregar producto"}
        </h2>

        <form action={accion} className="space-y-4">
          {!producto && <input type="hidden" name="perfil_id" value={perfilId} />}

          <div className="space-y-1">
            <label htmlFor="nombre" className={CLASES_LABEL}>
              Nombre
            </label>
            <Input id="nombre" name="nombre" defaultValue={producto?.nombre} required disabled={pendiente} />
          </div>

          <div className="space-y-1">
            <label htmlFor="descripcion" className={CLASES_LABEL}>
              Descripción (opcional)
            </label>
            <Textarea id="descripcion" name="descripcion" rows={2} defaultValue={producto?.descripcion ?? ""} disabled={pendiente} />
          </div>

          <div className="space-y-1">
            <label htmlFor="precio" className={CLASES_LABEL}>
              Precio (opcional)
            </label>
            <Input
              id="precio"
              name="precio"
              type="number"
              min={0}
              step="0.01"
              defaultValue={producto?.precio ?? ""}
              disabled={pendiente}
            />
          </div>

          <label className="flex items-center gap-2 font-cuerpo text-sm text-texto">
            <input type="checkbox" name="mostrar_precio" value="true" defaultChecked={producto?.mostrar_precio ?? true} disabled={pendiente} />
            Mostrar el precio en el catálogo
          </label>

          {!producto && (
            <div className="space-y-1">
              <label htmlFor="imagen" className={CLASES_LABEL}>
                Imagen
              </label>
              <input
                type="file"
                id="imagen"
                name="imagen"
                accept="image/jpeg,image/png,image/webp"
                required
                disabled={pendiente}
                className="block w-full font-cuerpo text-sm text-texto-secundario file:mr-3 file:rounded-md file:border file:border-borde file:bg-superficie file:px-3 file:py-1.5 file:font-cuerpo file:text-sm file:font-medium file:text-texto hover:file:border-acento"
              />
            </div>
          )}

          {estado.error && (
            <p role="alert" className="flex items-center gap-2 font-cuerpo text-sm text-texto">
              <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
              {estado.error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button ref={cerrarRef} type="button" onClick={onCerrar} disabled={pendiente} className={clasesBoton("secundario")}>
              Cancelar
            </button>
            <Button type="submit" disabled={pendiente}>
              {pendiente ? "Guardando…" : producto ? "Guardar los cambios" : "Agregar producto"}
            </Button>
          </div>
        </form>

        {producto && (
          <div className="border-t border-borde pt-4">
            <CampoImagen titulo="Imagen del producto" urlActual={producto.imagen_url} alt={producto.nombre} accion={accionImagen} />
          </div>
        )}
      </div>
    </div>
  );
}
