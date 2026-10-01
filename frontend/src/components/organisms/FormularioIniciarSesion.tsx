"use client";

import { CircleAlert } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { CampoPassword } from "@/components/molecules/CampoPassword";
import { iniciarSesionAction, type EstadoLogin } from "@/lib/auth/acciones";

const ESTADO_INICIAL: EstadoLogin = {};

// El error nunca usa un color nuevo: CLAUDE.md sección 6 regla 2 permite un solo acento. Se
// distingue con un ícono (CircleAlert) y role="alert" (que además lo anuncia a lectores de
// pantalla), el mismo criterio que ya usa app/error.tsx.
export function FormularioIniciarSesion() {
  const [estado, accion, pendiente] = useActionState(iniciarSesionAction, ESTADO_INICIAL);

  return (
    <form action={accion} className="w-full space-y-4">
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
