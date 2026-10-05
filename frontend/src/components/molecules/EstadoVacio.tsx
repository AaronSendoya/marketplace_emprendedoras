import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button, clasesBoton } from "@/components/atoms/Button";

// Una navega (ej. "Crear una cuenta nueva" en /admin/nueva); la otra abre un modal ya montado en la
// misma página (ej. "Agregar producto"). Las dos se ven igual, solo cambia el elemento HTML.
type PropsAccion = { etiqueta: string } & ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

interface PropsEstadoVacio {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: PropsAccion;
  className?: string;
}

// Reemplaza el texto suelto que usaban las secciones sin datos (Cuentas, Emprendimientos,
// Productos, Descuentos, el Dashboard): borde punteado en vez de sólido para distinguirlo de una
// tarjeta con datos, mismos tokens de siempre (sin colores nuevos). `accion` solo tiene sentido
// cuando la sección está vacía porque todavía no existe nada que crear ahí (Productos,
// Descuentos); una lista vacía por un filtro de búsqueda no la necesita.
export function EstadoVacio({ icono: Icono, titulo, descripcion, accion, className = "" }: PropsEstadoVacio) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-borde px-4 py-12 text-center ${className}`.trim()}
    >
      <Icono size={32} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
      <p className="font-cuerpo text-sm font-medium text-texto">{titulo}</p>
      <p className="max-w-sm font-cuerpo text-sm text-texto-secundario">{descripcion}</p>
      {accion?.href && (
        <Link href={accion.href} className={`${clasesBoton("primario")} mt-2 min-h-11 lg:min-h-0`}>
          {accion.etiqueta}
        </Link>
      )}
      {accion?.onClick && (
        <Button onClick={accion.onClick} className="mt-2 min-h-11 lg:min-h-0">
          {accion.etiqueta}
        </Button>
      )}
    </div>
  );
}
