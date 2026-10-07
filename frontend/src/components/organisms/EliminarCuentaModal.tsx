"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { eliminarCuentaAction } from "@/lib/admin/acciones";
import type { Usuario } from "@/lib/api/tipos";

interface PropsEliminarCuentaModal {
  usuario: Usuario;
  abierto: boolean;
  onCerrar: () => void;
  // La lista tal como está ahora (página, búsqueda y filtro), a la que se vuelve al terminar con el aviso de lo eliminado.
  volverA: string;
}

// Eliminar una cuenta por completo (CLAUDE.md regla 5; interfaz en la sección 5 del frontend). Es irreversible, así que no basta
// con un «¿Seguro?»: dice con claridad qué se borra y pide escribir el correo de la cuenta; el botón rojo no se activa hasta que
// coincide. El backend vuelve a comprobarlo. Se monta solo mientras está abierto: cada vez empieza con el campo vacío.
export function EliminarCuentaModal({ usuario, abierto, onCerrar, volverA }: PropsEliminarCuentaModal) {
  if (!abierto) return null;
  return <ContenidoEliminarCuenta usuario={usuario} onCerrar={onCerrar} volverA={volverA} />;
}

function ContenidoEliminarCuenta({ usuario, onCerrar, volverA }: Omit<PropsEliminarCuentaModal, "abierto">) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const coincide = texto.trim().toLowerCase() === usuario.email.toLowerCase();

  useEffect(() => {
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, []);

  useEffect(() => {
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !pendiente) onCerrar();
    }
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [onCerrar, pendiente]);

  function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (!coincide || pendiente) return;
    setError(null);
    // Si sale bien, la acción redirige a la lista con el aviso; si no, vuelve con el motivo.
    iniciarTransicion(async () => {
      const resultado = await eliminarCuentaAction(usuario.id, texto.trim(), volverA);
      if (resultado?.error) setError(resultado.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={() => !pendiente && onCerrar()}>
      <form
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="eliminar-titulo"
        aria-describedby="eliminar-descripcion"
        onSubmit={confirmar}
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-acento-suave text-acento">
            <TriangleAlert size={20} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 id="eliminar-titulo" className="font-titulo text-lg leading-tight font-bold break-words text-texto">
              Eliminar la cuenta de {usuario.nombre_completo}
            </h2>
            <p className="mt-1 font-cuerpo text-sm font-medium text-acento">Esta acción no se puede deshacer.</p>
          </div>
        </div>

        <div id="eliminar-descripcion" className="space-y-2 font-cuerpo text-sm text-texto-secundario">
          <p>Se eliminará para siempre:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>La cuenta y su acceso al sistema.</li>
            <li>Su perfil, con su foto y su logo.</li>
            <li>Todos sus productos, con sus imágenes.</li>
            <li>Todos sus descuentos.</li>
            <li>Sus clics de contacto: dejará de contar en los totales y rankings del Dashboard.</li>
          </ul>
          <p>Si solo quieres que deje de aparecer en el catálogo, usa «Suspender cuenta»: eso sí se puede deshacer.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="eliminar-confirmacion" className="block font-cuerpo text-sm text-texto">
            Para confirmar, escribe el correo de la cuenta: <strong className="font-semibold [overflow-wrap:anywhere]">{usuario.email}</strong>
          </label>
          <Input
            autoFocus
            id="eliminar-confirmacion"
            type="text"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            disabled={pendiente}
            invalido={error !== null}
            aria-describedby={error ? "eliminar-error" : undefined}
            placeholder={usuario.email}
          />
          {error && (
            <p id="eliminar-error" role="alert" className="font-cuerpo text-sm text-acento">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCerrar} disabled={pendiente} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
            Cancelar
          </button>
          <button type="submit" disabled={!coincide || pendiente} className={clasesBoton("peligro", "min-h-11 lg:min-h-0")}>
            {pendiente ? "Eliminando…" : "Eliminar para siempre"}
          </button>
        </div>
      </form>
    </div>
  );
}
