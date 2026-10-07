import { Badge } from "@/components/atoms/Badge";
import { formatearPrecio } from "@/lib/formato/precio";

interface PropsPrecioProducto {
  precio: number | null;
  porcentaje: number | null;
  precioConDescuento: number | null;
  // "tarjeta": el descuento va como etiqueta sobre la foto (lo dibuja la tarjeta). "detalle": precio grande y,
  // junto a él, la etiqueta del descuento.
  tamano?: "tarjeta" | "detalle";
  className?: string;
}

// Presenta los estados de precio que ya resuelve el backend (reglas 7 y 8): nunca decide cuándo mostrar
// "Consultar precio" ni calcula el precio con descuento, solo elige qué mostrar según los campos que ya llegan
// resueltos en ProductoPublico. Con el precio oculto (`consultar_precio`) no hay nada que mostrar aquí: lo cubre
// `BotonConsultarPrecio`. Es un componente de servidor: no tiene estado ni eventos. El precio y la cifra van en
// la tipografía de títulos (CLAUDE.md sección 6, regla 3).
export function PrecioProducto({ precio, porcentaje, precioConDescuento, tamano = "tarjeta", className = "" }: PropsPrecioProducto) {
  const claseCifra = tamano === "detalle" ? "text-4xl" : "text-2xl";
  const claseAnterior = tamano === "detalle" ? "text-lg" : "text-sm";

  if (precio !== null && porcentaje !== null && precioConDescuento !== null && tamano === "tarjeta") {
    // Pie de la ficha comercial (regla 14, punto b): el precio anterior tachado encima del actual cuando la tarjeta es lo
    // bastante ancha (container query) y los dos en una línea cuando el pie los lleva solos.
    return (
      <div className={`flex flex-row items-baseline gap-2.5 leading-none @min-[24rem]:flex-col-reverse @min-[24rem]:items-start @min-[24rem]:gap-1 ${className}`.trim()}>
        <span className="font-titulo text-[1.6rem] leading-none font-extrabold tracking-tight text-texto tabular-nums">{formatearPrecio(precioConDescuento)}</span>
        <span className="font-cuerpo text-[0.8125rem] leading-none text-texto-secundario tabular-nums line-through">{formatearPrecio(precio)}</span>
      </div>
    );
  }

  if (precio !== null && porcentaje !== null && precioConDescuento !== null) {
    return (
      <div className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 ${className}`.trim()}>
        <span className={`font-titulo ${claseCifra} leading-none font-extrabold tracking-tight text-texto`}>{formatearPrecio(precioConDescuento)}</span>
        <span className={`font-cuerpo ${claseAnterior} text-texto-secundario line-through`}>{formatearPrecio(precio)}</span>
        {tamano === "detalle" && <Badge variante="acento" className="self-center">-{porcentaje}%</Badge>}
      </div>
    );
  }

  if (precio !== null) {
    return <span className={`font-titulo ${tamano === "tarjeta" ? "text-[1.6rem]" : claseCifra} leading-none font-extrabold tracking-tight text-texto tabular-nums ${className}`.trim()}>{formatearPrecio(precio)}</span>;
  }

  return null;
}
