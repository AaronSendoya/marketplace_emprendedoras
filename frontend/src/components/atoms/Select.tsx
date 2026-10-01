import type { ComponentPropsWithoutRef } from "react";

// Átomo genérico (recibe <option> como children): no conoce ciudades ni rubros. La molécula
// FilterSelect (paso 5 del plan) es la que traduce un catálogo del backend a opciones.
export function Select({ className = "", children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={`w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm font-cuerpo text-texto transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  );
}
