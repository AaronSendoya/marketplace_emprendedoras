import type { ReactNode } from "react";

interface PropsEncabezadoSeccionAdmin {
  titulo: string;
  descripcion?: ReactNode;
  // Controles o leyenda de la sección, a la derecha del título (debajo en pantallas angostas).
  acciones?: ReactNode;
}

// Título de una sección del Admin (sección 6, regla 13, nivel 2 de la jerarquía tipográfica), con su
// descripción separada como metadata legible.
export function EncabezadoSeccionAdmin({ titulo, descripcion, acciones }: PropsEncabezadoSeccionAdmin) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h2 className="font-titulo text-seccion font-bold tracking-tight text-texto">{titulo}</h2>
        {descripcion && <p className="mt-1 font-cuerpo text-sm text-texto-secundario">{descripcion}</p>}
      </div>
      {acciones && <div className="min-w-0 sm:shrink-0">{acciones}</div>}
    </div>
  );
}
