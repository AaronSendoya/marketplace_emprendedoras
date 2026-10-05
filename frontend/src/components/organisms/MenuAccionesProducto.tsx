"use client";

import { Ban, MoreVertical, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { ProductoFormularioModal } from "@/components/organisms/ProductoFormularioModal";
import { cambiarEstadoProductoAction } from "@/lib/admin/productos-acciones";
import type { ProductoPropio } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface PropsMenuAccionesProducto {
  producto: ProductoPropio;
  usuarioId: string;
}

type ModalAbierto = "editar" | "estado" | null;

const CLASES_ITEM =
  "flex w-full items-center gap-2.5 px-3 py-3 text-left lg:py-2 font-cuerpo text-sm text-texto transition-colors hover:bg-fondo focus-visible:bg-fondo focus-visible:outline-none";

const CLASES_ITEM_PELIGRO =
  "flex w-full items-center gap-2.5 px-3 py-3 text-left lg:py-2 font-cuerpo text-sm font-medium text-acento transition-colors hover:bg-acento-suave focus-visible:bg-acento-suave focus-visible:outline-none";

// Mismo patrón que MenuAccionesCuenta (menú de tres puntos + confirmación antes de mutar).
export function MenuAccionesProducto({ producto, usuarioId }: PropsMenuAccionesProducto) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalAbierto, setModalAbierto] = useState<ModalAbierto>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAbierto) return;
    function alHacerClicFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) setMenuAbierto(false);
    }
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAbierto(false);
    }
    document.addEventListener("mousedown", alHacerClicFuera);
    window.addEventListener("keydown", alPresionarTecla);
    return () => {
      document.removeEventListener("mousedown", alHacerClicFuera);
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [menuAbierto]);

  function abrir(modal: ModalAbierto) {
    setMenuAbierto(false);
    setModalAbierto(modal);
  }

  return (
    <div ref={contenedorRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setMenuAbierto((valor) => !valor)}
        aria-haspopup="menu"
        aria-expanded={menuAbierto}
        aria-label="Acciones del producto"
        className={`rounded-md p-3.5 transition-colors lg:p-2 ${
          menuAbierto ? "bg-fondo text-texto" : "text-texto-secundario hover:bg-fondo hover:text-texto"
        } ${CLASES_FOCO_ENLACE}`}
      >
        <MoreVertical size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {menuAbierto && (
        <div role="menu" className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-borde bg-superficie py-1 shadow-lg">
          <button role="menuitem" type="button" onClick={() => abrir("editar")} className={CLASES_ITEM}>
            <Pencil size={16} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
            Editar producto
          </button>

          <div role="separator" aria-hidden="true" className="my-1 h-px bg-borde" />

          <button
            role="menuitem"
            type="button"
            onClick={() => abrir("estado")}
            className={producto.activo ? CLASES_ITEM_PELIGRO : CLASES_ITEM}
          >
            {producto.activo ? (
              <Ban size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
            )}
            {producto.activo ? "Desactivar" : "Activar"}
          </button>
        </div>
      )}

      <ProductoFormularioModal
        perfilId={producto.perfil_id}
        usuarioId={usuarioId}
        producto={producto}
        abierto={modalAbierto === "editar"}
        onCerrar={() => setModalAbierto(null)}
      />

      <ConfirmModal
        abierto={modalAbierto === "estado"}
        onCerrar={() => setModalAbierto(null)}
        onConfirmar={() => cambiarEstadoProductoAction(producto.id, !producto.activo, usuarioId)}
        titulo={producto.activo ? "¿Desactivar este producto?" : "¿Activar este producto?"}
        descripcion={
          producto.activo
            ? "Deja de mostrarse en el catálogo. No se borra nada: se puede reactivar cuando quieras."
            : "Vuelve a mostrarse en el catálogo."
        }
        textoConfirmar={producto.activo ? "Desactivar" : "Activar"}
        variante={producto.activo ? "peligro" : "primario"}
      />
    </div>
  );
}
