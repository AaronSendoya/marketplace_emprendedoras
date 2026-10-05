import type { ReactNode } from "react";

interface PropsEncabezadoPaginaAdmin {
  titulo: string;
  descripcion?: ReactNode;
  // Lo que acompaña al título a la derecha (un botón, el selector de período); debajo en pantallas angostas.
  acciones?: ReactNode;
}

// Encabezado de todas las pantallas del Admin (sección 6, regla 13): título claramente dominante y
// descripción legible. Antes cada página repetía su propio `<h1>`.
export function EncabezadoPaginaAdmin({ titulo, descripcion, acciones }: PropsEncabezadoPaginaAdmin) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h1 className="font-titulo text-[1.75rem] leading-tight font-extrabold tracking-tight text-texto sm:text-pagina">{titulo}</h1>
        {descripcion && <p className="mt-1.5 font-cuerpo text-base text-texto-secundario">{descripcion}</p>}
      </div>
      {acciones && <div className="min-w-0 sm:shrink-0">{acciones}</div>}
    </header>
  );
}
