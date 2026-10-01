import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { formatearPrecio } from "@/lib/formato/precio";
import { enlaceWhatsapp } from "@/lib/formato/whatsapp";

export interface PropsPriceTag {
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
export function PriceTag({
  precio,
  porcentaje,
  precioConDescuento,
  consultarPrecio,
  whatsapp,
  className = "",
}: PropsPriceTag) {
  if (consultarPrecio) {
    return (
      <a
        href={enlaceWhatsapp(whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
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
