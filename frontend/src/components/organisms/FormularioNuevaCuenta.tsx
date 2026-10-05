"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button, clasesBoton } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { CampoPassword } from "@/components/molecules/CampoPassword";
import { crearCuentaAction, type EstadoCrearCuenta } from "@/lib/admin/acciones";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";

const ESTADO_INICIAL: EstadoCrearCuenta = {};

const CLASES_LABEL = "font-cuerpo text-sm font-medium text-texto";

function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <p role="alert" className="flex items-center gap-2 font-cuerpo text-sm text-texto">
      <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
      {mensaje}
    </p>
  );
}

// Alta en un solo paso (regla 15, backend): el alta ya no pide OTP, así que no hace falta el
// primer paso de pedir un código al correo de la emprendedora. El correo queda sin verificar hasta
// el primer OTP que esa cuenta complete (regla 15).
export function FormularioNuevaCuenta() {
  const [estado, accion, pendiente] = useActionState(crearCuentaAction, ESTADO_INICIAL);

  if (estado.creada) {
    return (
      <div className={`${CLASES_PANEL_ADMIN} max-w-lg space-y-4 p-5 sm:p-7`}>
        <div className="flex items-center gap-2">
          <CircleCheck size={20} strokeWidth={1.5} className="text-enfasis" aria-hidden="true" />
          <h2 className="font-titulo text-lg font-bold text-texto">Cuenta creada</h2>
        </div>
        <p className="font-cuerpo text-sm text-texto-secundario">
          {estado.creada.nombreCompleto} ({estado.creada.email}) ya puede iniciar sesión.
        </p>

        {estado.creada.passwordTemporal && (
          <div className="space-y-1 rounded-md bg-enfasis-suave p-3">
            <p className="font-cuerpo text-xs font-medium text-enfasis">
              Contraseña temporal — se muestra una sola vez, cópiala ahora:
            </p>
            <p className="font-titulo text-base font-bold text-texto select-all">{estado.creada.passwordTemporal}</p>
          </div>
        )}

        <Link href="/admin" className={clasesBoton("secundario", "w-full min-h-11 lg:min-h-0")}>
          Volver a cuentas
        </Link>
      </div>
    );
  }

  return (
    <form action={accion} className={`${CLASES_PANEL_ADMIN} max-w-lg space-y-5 p-5 sm:p-7`}>
      <div className="space-y-1">
        <label htmlFor="email" className={CLASES_LABEL}>
          Correo de la emprendedora
        </label>
        <Input id="email" name="email" type="email" autoComplete="off" required disabled={pendiente} />
      </div>

      <div className="space-y-1">
        <label htmlFor="nombres" className={CLASES_LABEL}>
          Nombres
        </label>
        <Input id="nombres" name="nombres" required disabled={pendiente} />
      </div>

      <div className="space-y-1">
        <label htmlFor="apellido_paterno" className={CLASES_LABEL}>
          Apellido paterno
        </label>
        <Input id="apellido_paterno" name="apellido_paterno" required disabled={pendiente} />
      </div>

      <div className="space-y-1">
        <label htmlFor="apellido_materno" className={CLASES_LABEL}>
          Apellido materno (opcional)
        </label>
        <Input id="apellido_materno" name="apellido_materno" disabled={pendiente} />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className={CLASES_LABEL}>
          Contraseña inicial (opcional)
        </label>
        <CampoPassword id="password" name="password" minLength={8} disabled={pendiente} />
        <p className="font-cuerpo text-xs text-texto-secundario">Si la dejas vacía, el sistema genera una temporal.</p>
      </div>

      {estado.error && <MensajeError mensaje={estado.error} />}

      <Button type="submit" disabled={pendiente} className="w-full min-h-11 lg:min-h-0">
        {pendiente ? "Creando..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
