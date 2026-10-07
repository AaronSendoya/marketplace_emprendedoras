"use client";

import { useTransition } from "react";
import { clasesBoton, type TamanoBoton, type VarianteBoton } from "@/components/atoms/Button";
import { IconoWhatsApp } from "@/components/atoms/IconosRedes";
import { esWhatsappValido } from "@/lib/formato/redes";
import { enlaceWhatsapp } from "@/lib/formato/whatsapp";
import { registrarClicAction } from "@/lib/metricas/acciones";

interface PropsBotonConsultarPrecio {
  perfilId: string;
  whatsapp: string;
  // Lo que dice el botón: "Consultar precio" cuando el precio no se muestra, "Consultar por WhatsApp" si ya se ve.
  etiqueta?: string;
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  className?: string;
}

// Abre el WhatsApp del negocio y registra el clic (regla 19 del backend). Es el botón verde de WhatsApp (regla 14,
// punto g). Sin un número válido no existe: nunca un botón sin destino. Sigue siendo `target="_blank"`, así que la
// pestaña actual no se recarga y el registro fire-and-forget no retrasa la apertura. Es el único tramo con JavaScript
// de la tarjeta de producto y de su detalle: el precio y el resto son de servidor.
export function BotonConsultarPrecio({
  perfilId,
  whatsapp,
  etiqueta = "Consultar precio",
  variante = "whatsapp",
  tamano = "tarjeta",
  className = "",
}: PropsBotonConsultarPrecio) {
  const [, iniciarTransicion] = useTransition();
  if (!esWhatsappValido(whatsapp)) return null;

  return (
    <a
      href={enlaceWhatsapp(whatsapp)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => iniciarTransicion(() => registrarClicAction(perfilId, "whatsapp"))}
      className={clasesBoton(variante, className, tamano)}
    >
      <IconoWhatsApp className={tamano === "grande" ? "h-5 w-5 shrink-0" : "h-[18px] w-[18px] shrink-0"} />
      <span className="truncate">{etiqueta}</span>
    </a>
  );
}
