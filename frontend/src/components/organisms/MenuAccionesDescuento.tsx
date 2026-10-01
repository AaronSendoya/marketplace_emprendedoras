"use client";

import { ListChecks, MoreVertical, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AsignarProductosModal } from "@/components/organisms/AsignarProductosModal";
import { DescuentoFormularioModal } from "@/components/organisms/DescuentoFormularioModal";
import type { Descuento, ProductoPropio } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface PropsMenuAccionesDescuento {
  descuento: Descuento;
  productos: ProductoPropio[];
  usuarioId: string;
}

type ModalAbierto = "editar" | "asignar" | null;

const CLASES_ITEM =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left font-cuerpo text-sm text-texto transition-colors hover:bg-fondo focus-visible:bg-fondo focus-visible:outline-none";

// Sin acción destructiva (regla 8: un descuento no se borra, se termina con fecha_fin desde el
// propio formulario de edición), así que este menú no necesita el tratamiento de "peligro".
export function MenuAccionesDescuento({ descuento, productos, usuarioId }: PropsMenuAccionesDescuento) {
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
        aria-label="Acciones del descuento"
        className={`rounded-md p-2 transition-colors ${
          menuAbierto ? "bg-fondo text-texto" : "text-texto-secundario hover:bg-fondo hover:text-texto"
        } ${CLASES_FOCO_ENLACE}`}
      >
        <MoreVertical size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {menuAbierto && (
        <div role="menu" className="absolute right-0 z-10 mt-1 w-52 rounded-lg border border-borde bg-superficie py-1 shadow-lg">
          <button role="menuitem" type="button" onClick={() => abrir("editar")} className={CLASES_ITEM}>
            <Pencil size={16} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
            Editar descuento
          </button>
          <button role="menuitem" type="button" onClick={() => abrir("asignar")} className={CLASES_ITEM}>
            <ListChecks size={16} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
            Asignar productos
          </button>
        </div>
      )}

      <DescuentoFormularioModal
        perfilId={descuento.perfil_id}
        usuarioId={usuarioId}
        descuento={descuento}
        abierto={modalAbierto === "editar"}
        onCerrar={() => setModalAbierto(null)}
      />

      <AsignarProductosModal
        descuento={descuento}
        productos={productos}
        usuarioId={usuarioId}
        abierto={modalAbierto === "asignar"}
        onCerrar={() => setModalAbierto(null)}
      />
    </div>
  );
}
