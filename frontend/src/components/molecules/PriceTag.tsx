"use client";

import { useTransition } from "react";
import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { registrarClicAction } from "@/lib/metricas/acciones";
import { formatearPrecio } from "@/lib/formato/precio";
import { enlaceWhatsapp } from "@/lib/formato/whatsapp";

export interface PropsPriceTag {
  perfilId: string;
  precio: number | null;
  porcentaje: number | null;
  precioConDescuento: number | null;
  consultarPrecio: boolean;
  whatsapp: string;
  className?: string;
}

// Presenta los tres estados que ya resuelve el backend (reglas 7 y 8): nunca decide cuándo
// mostrar "Consultar Precio" ni calcula el precio con descuento, solo elige qué mostrar según
// los campos que ya llegan resueltos en ProductoPublico.
//
// "use client" (regla 19): "Consultar precio" también registra un clic de WhatsApp. Sigue siendo
// `target="_blank"`, así que la pestaña actual no se recarga y el registro fire-and-forget no
// retrasa la apertura.
export function PriceTag({
  perfilId,
  precio,
  porcentaje,
  precioConDescuento,
  consultarPrecio,
  whatsapp,
  className = "",
}: PropsPriceTag) {
  const [, iniciarTransicion] = useTransition();

  if (consultarPrecio) {
    return (
      <a
        href={enlaceWhatsapp(whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => iniciarTransicion(() => registrarClicAction(perfilId, "whatsapp"))}
        className={clasesBoton("primario", className)}
      >
        Consultar precio
      </a>
    );
  }

  if (precio !== null && porcentaje !== null && precioConDescuento !== null) {
    return (
      <div className={`flex flex-wrap items-baseline gap-2 ${className}`.trim()}>
        <span className="font-titulo text-lg font-bold text-texto">{formatearPrecio(precioConDescuento)}</span>
        <span className="font-cuerpo text-sm text-texto-secundario line-through">{formatearPrecio(precio)}</span>
        <Badge variante="acento">-{porcentaje}%</Badge>
      </div>
    );
  }

  if (precio !== null) {
    return (
      <span className={`font-titulo text-lg font-bold text-texto ${className}`.trim()}>{formatearPrecio(precio)}</span>
    );
  }

  return null;
}
