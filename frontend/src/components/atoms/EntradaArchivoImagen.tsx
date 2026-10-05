"use client";

import { useEffect, useState, type ChangeEvent } from "react";

interface PropsEntradaArchivoImagen {
  id?: string;
  name: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const CLASES_INPUT =
  "block w-full font-cuerpo text-sm text-texto-secundario file:mr-3 file:rounded-md file:border file:border-borde file:bg-superficie file:px-3 file:py-1.5 file:font-cuerpo file:text-sm file:font-medium file:text-texto hover:file:border-acento";

// El input de archivo nativo no da ninguna pista visual de qué se eligió más allá del nombre del
// archivo: esto agrega un thumbnail de la imagen recién seleccionada antes de subir nada (`blob:`
// local, se libera con revokeObjectURL al cambiar o desmontar). Sigue siendo un input no
// controlado con el mismo `name`, así que el `<form action={...}>` que lo envuelve lo sigue
// leyendo igual con FormData — esto es puro feedback visual, no toca el envío.
export function EntradaArchivoImagen({ id, name, accept, required, disabled, className = "" }: PropsEntradaArchivoImagen) {
  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previsualizacion) URL.revokeObjectURL(previsualizacion);
    };
  }, [previsualizacion]);

  function alCambiar(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    setPrevisualizacion((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return archivo ? URL.createObjectURL(archivo) : null;
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {previsualizacion && (
        // eslint-disable-next-line @next/next/no-img-element -- blob: local, next/image no optimiza esto.
        <img src={previsualizacion} alt="" className="h-14 w-14 shrink-0 rounded-md border border-borde object-cover" />
      )}
      <input
        type="file"
        id={id}
        name={name}
        accept={accept}
        required={required}
        disabled={disabled}
        onChange={alCambiar}
        className={`min-w-0 flex-1 ${CLASES_INPUT} ${className}`.trim()}
      />
    </div>
  );
}
