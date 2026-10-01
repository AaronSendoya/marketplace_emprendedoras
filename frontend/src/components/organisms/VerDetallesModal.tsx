"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { formatearFecha } from "@/lib/formato/fecha";
import type { Usuario } from "@/lib/api/tipos";

interface PropsVerDetallesModal {
  usuario: Usuario;
  abierto: boolean;
  onCerrar: () => void;
}

interface PropsFila {
  etiqueta: string;
  children: React.ReactNode;
}

function Fila({ etiqueta, children }: PropsFila) {
  return (
    <div>
      <dt className="font-cuerpo text-xs font-medium text-texto-secundario">{etiqueta}</dt>
      <dd className="font-cuerpo text-sm text-texto">{children}</dd>
    </div>
  );
}

// Vista de solo lectura con todos los datos de la cuenta (no solo lo que cabe en la fila de la
// tabla): apellido materno, verificación del correo y fecha de alta, que hoy no se ven en ningún
// otro lado. Mismo patrón de accesibilidad que los demás modales del panel.
export function VerDetallesModal({ usuario, abierto, onCerrar }: PropsVerDetallesModal) {
  const cerrarRef = useRef<HTMLButtonElement>(null);

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
        aria-labelledby="detalles-cuenta-titulo"
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[calc(100vh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
      >
        <h2 id="detalles-cuenta-titulo" className="font-titulo text-lg font-bold text-texto">
          Datos de la cuenta
        </h2>

        <dl className="space-y-3">
          <Fila etiqueta="Nombres">{usuario.nombres}</Fila>
          <Fila etiqueta="Apellido paterno">{usuario.apellido_paterno}</Fila>
          <Fila etiqueta="Apellido materno">{usuario.apellido_materno ?? "No indicado"}</Fila>
          <Fila etiqueta="Correo electrónico">{usuario.email}</Fila>
          <Fila etiqueta="Correo verificado">
            {usuario.email_verificado_en ? `Sí, el ${formatearFecha(usuario.email_verificado_en)}` : "Todavía no"}
          </Fila>
          <Fila etiqueta="Rol">
            <Badge variante={usuario.rol === "Admin" ? "secundario" : "neutro"}>{usuario.rol}</Badge>
          </Fila>
          <Fila etiqueta="Estado">
            <Badge variante={usuario.activo ? "neutro" : "acento"}>{usuario.activo ? "Activa" : "Suspendida"}</Badge>
          </Fila>
          <Fila etiqueta="Cuenta creada">{formatearFecha(usuario.creado_en)}</Fila>
        </dl>

        <div className="flex justify-end pt-2">
          <button ref={cerrarRef} type="button" onClick={onCerrar} className={clasesBoton("secundario")}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
