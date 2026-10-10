"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { CampoPassword } from "@/components/molecules/CampoPassword";
import { iniciarSesionAction, type EstadoLogin } from "@/lib/auth/acciones";
import { useEnvioSinReinicio } from "@/lib/hooks/useEnvioSinReinicio";

const ESTADO_INICIAL: EstadoLogin = {};

// El error nunca usa un color nuevo: CLAUDE.md sección 6 regla 2 permite un solo acento. Se
// distingue con un ícono (CircleAlert) y role="alert" (que además lo anuncia a lectores de
// pantalla), el mismo criterio que ya usa app/error.tsx.
export function FormularioIniciarSesion() {
  const { estado, alEnviar, pendiente } = useEnvioSinReinicio(iniciarSesionAction, ESTADO_INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  // Tras un intento fallido se conserva el correo (la persona suele equivocarse solo en la contraseña) y se vacía la contraseña
  // para volver a escribirla, con el foco ahí.
  useEffect(() => {
    if (!estado.error) return;
    const campo = formulario.current?.elements.namedItem("password");
    if (campo instanceof HTMLInputElement) {
      campo.value = "";
      campo.focus();
    }
  }, [estado]);

  return (
    <form ref={formulario} onSubmit={alEnviar} className="w-full space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="font-cuerpo text-sm font-medium text-texto">
          Correo
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required disabled={pendiente} />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="font-cuerpo text-sm font-medium text-texto">
          Contraseña
        </label>
        <CampoPassword id="password" name="password" autoComplete="current-password" required disabled={pendiente} />
      </div>

      {estado.error && (
        <p role="alert" className="flex items-center gap-2 font-cuerpo text-sm text-texto">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
          {estado.error}
        </p>
      )}

      <Button type="submit" disabled={pendiente} className="w-full">
        {pendiente ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
