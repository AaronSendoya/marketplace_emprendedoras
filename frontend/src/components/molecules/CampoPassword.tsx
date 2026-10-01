"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentPropsWithoutRef } from "react";
import { Input } from "@/components/atoms/Input";

type PropsCampoPassword = Omit<ComponentPropsWithoutRef<"input">, "type">;

// Alterna entre ocultar y mostrar la contraseña con un ícono, en vez de dejarla siempre oculta:
// quien la escribe puede revisarla antes de enviar el formulario. El campo real sigue siendo
// type="password" salvo mientras se muestra.
export function CampoPassword({ className = "", ...props }: PropsCampoPassword) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={`pr-10 ${className}`.trim()} {...props} />
      <button
        type="button"
        onClick={() => setVisible((valor) => !valor)}
        aria-label={visible ? "Ocultar la contraseña" : "Mostrar la contraseña"}
        aria-pressed={visible}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-texto-secundario transition-colors hover:text-acento"
      >
        {visible ? <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={16} strokeWidth={1.5} aria-hidden="true" />}
      </button>
    </div>
  );
}
