"use client";

import { Ban, Eye, KeyRound, MoreVertical, Pencil, UserCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { EditarCuentaModal } from "@/components/organisms/EditarCuentaModal";
import { RestablecerPasswordModal } from "@/components/organisms/RestablecerPasswordModal";
import { VerDetallesModal } from "@/components/organisms/VerDetallesModal";
import { cambiarEstadoAction } from "@/lib/admin/acciones";
import type { Usuario } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface PropsMenuAccionesCuenta {
  usuario: Usuario;
  volverA: string;
}

type ModalAbierto = "detalles" | "editar" | "password" | "estado" | null;

const CLASES_ITEM =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left font-cuerpo text-sm text-texto transition-colors hover:bg-fondo focus-visible:bg-fondo focus-visible:outline-none";

// Mismo magenta que ya usan Badge ("Suspendida") y el botón "peligro" de ConfirmModal: separa
// visualmente la única acción que cambia el acceso de la cuenta, sin inventar un color nuevo.
const CLASES_ITEM_PELIGRO =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left font-cuerpo text-sm font-medium text-acento transition-colors hover:bg-acento-suave focus-visible:bg-acento-suave focus-visible:outline-none";

// Reemplaza el enlace de texto suelto en la fila (un clic accidental cambiaba el estado de la
// cuenta sin avisar): el menú de tres puntos agrupa las acciones administrativas (ver detalles,
// editar, restablecer contraseña, suspender/activar) y cada mutación exige confirmar en un modal
// antes de tocar la base. No hay "Eliminar": la cascada del esquema (perfil → productos →
// descuentos, regla 6) lo haría irreversible, así que el proyecto solo hace soft delete.
export function MenuAccionesCuenta({ usuario, volverA }: PropsMenuAccionesCuenta) {
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
        aria-label="Acciones de la cuenta"
        className={`rounded-md p-2 transition-colors ${
          menuAbierto ? "bg-fondo text-texto" : "text-texto-secundario hover:bg-fondo hover:text-texto"
        } ${CLASES_FOCO_ENLACE}`}
      >
        <MoreVertical size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {menuAbierto && (
        <div role="menu" className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-borde bg-superficie py-1 shadow-lg">
          <button role="menuitem" type="button" onClick={() => abrir("detalles")} className={CLASES_ITEM}>
            <Eye size={16} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
            Ver detalles
          </button>
          <button role="menuitem" type="button" onClick={() => abrir("editar")} className={CLASES_ITEM}>
            <Pencil size={16} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
            Editar cuenta
          </button>
          <button role="menuitem" type="button" onClick={() => abrir("password")} className={CLASES_ITEM}>
            <KeyRound size={16} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
            Restablecer contraseña
          </button>

          <div role="separator" aria-hidden="true" className="my-1 h-px bg-borde" />

          <button
            role="menuitem"
            type="button"
            onClick={() => abrir("estado")}
            className={usuario.activo ? CLASES_ITEM_PELIGRO : CLASES_ITEM}
          >
            {usuario.activo ? (
              <Ban size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <UserCheck size={16} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
            )}
            {usuario.activo ? "Suspender cuenta" : "Activar cuenta"}
          </button>
        </div>
      )}

      <VerDetallesModal usuario={usuario} abierto={modalAbierto === "detalles"} onCerrar={() => setModalAbierto(null)} />

      <EditarCuentaModal usuario={usuario} abierto={modalAbierto === "editar"} onCerrar={() => setModalAbierto(null)} />

      <RestablecerPasswordModal usuarioId={usuario.id} abierto={modalAbierto === "password"} onCerrar={() => setModalAbierto(null)} />

      <ConfirmModal
        abierto={modalAbierto === "estado"}
        onCerrar={() => setModalAbierto(null)}
        onConfirmar={() => cambiarEstadoAction(usuario.id, !usuario.activo, volverA)}
        titulo={usuario.activo ? "¿Suspender esta cuenta?" : "¿Activar esta cuenta?"}
        descripcion={
          usuario.activo
            ? "La cuenta pierde el acceso en su siguiente petición. No se borra nada: se puede reactivar cuando quieras."
            : "La cuenta vuelve a poder iniciar sesión."
        }
        textoConfirmar={usuario.activo ? "Suspender cuenta" : "Activar cuenta"}
        variante={usuario.activo ? "peligro" : "primario"}
      />
    </div>
  );
}
