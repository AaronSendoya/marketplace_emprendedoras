"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { validarArchivoDeImagen } from "@/lib/imagenes/validarImagen";

interface PropsEntradaArchivoImagen {
  id?: string;
  // El nombre accesible del campo cuando no hay un `<label>` visible (por ejemplo, «Foto de perfil» sobre el formulario de reemplazo).
  etiqueta?: string;
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
// leyendo igual con FormData.
//
// Revisa la imagen al elegirla (regla 16: JPEG, PNG o WebP de hasta 5 MB): si no sirve, la quita del campo y lo dice ahí mismo, en vez
// de dejar que se suba para enterarse después. Un archivo inválido nunca queda adjunto, igual que en el importador del Excel.
export function EntradaArchivoImagen({ id, etiqueta, name, accept, required, disabled, className = "" }: PropsEntradaArchivoImagen) {
  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const idDelAviso = useId();

  // Al reiniciar el formulario (p. ej. tras guardar la imagen) el campo queda vacío: la miniatura de lo que se había elegido
  // también debe irse. El reinicio nativo no dispara `change`.
  useEffect(() => {
    const formulario = entrada.current?.form;
    if (!formulario) return;
    const alReiniciar = () => {
      setPrevisualizacion(null);
      setProblema(null);
    };
    formulario.addEventListener("reset", alReiniciar);
    return () => formulario.removeEventListener("reset", alReiniciar);
  }, []);

  useEffect(() => {
    return () => {
      if (previsualizacion) URL.revokeObjectURL(previsualizacion);
    };
  }, [previsualizacion]);

  async function alCambiar(evento: ChangeEvent<HTMLInputElement>) {
    const campo = evento.target;
    const archivo = campo.files?.[0];
    if (!archivo) {
      setProblema(null);
      setPrevisualizacion((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior);
        return null;
      });
      return;
    }

    const resultado = await validarArchivoDeImagen(archivo);
    if (!resultado.ok) {
      campo.value = "";
      setProblema(resultado.mensaje);
      setPrevisualizacion((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior);
        return null;
      });
      return;
    }
    setProblema(null);
    setPrevisualizacion((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(archivo);
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-3">
        {previsualizacion && (
          // eslint-disable-next-line @next/next/no-img-element -- blob: local, next/image no optimiza esto.
          <img src={previsualizacion} alt="" className="h-14 w-14 shrink-0 rounded-md border border-borde object-cover" />
        )}
        <input
          ref={entrada}
          type="file"
          id={id}
          aria-label={etiqueta}
          aria-invalid={problema !== null}
          aria-describedby={problema ? idDelAviso : undefined}
          name={name}
          accept={accept}
          required={required}
          disabled={disabled}
          onChange={alCambiar}
          className={`min-w-0 flex-1 ${CLASES_INPUT} ${className}`.trim()}
        />
      </div>
      {problema && (
        <p id={idDelAviso} role="alert" className="font-cuerpo text-sm text-error">
          {problema}
        </p>
      )}
    </div>
  );
}
