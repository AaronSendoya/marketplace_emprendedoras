"use client";

import { CircleX, Upload } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import { MENSAJES_ARCHIVO } from "@/lib/importacion/mensajes";
import {
  ACEPTA,
  mensajeDeEnlaceSoltado,
  pareceCompatibleAlArrastrar,
  revisarArchivo,
  revisarCandidatos,
  type ArchivoCandidato,
} from "@/lib/importacion/validarArchivo";

export const ID_ENTRADA_DE_EXCEL = "entrada-de-excel";

interface PropsZona {
  // Solo se llama con un archivo que ya pasó la revisión del navegador: uno incompatible nunca llega aquí.
  onArchivo: (archivo: File) => void;
  onRechazo: (mensaje: string) => void;
  deshabilitada?: boolean;
}

type Arrastre = "ninguno" | "compatible" | "incompatible";

const ESTILO: Record<Arrastre, string> = {
  ninguno: "border-borde-fuerte bg-superficie",
  compatible: "border-marca bg-enfasis-suave",
  incompatible: "border-error bg-error-suave",
};

// La zona de arrastre del paso 1 (regla 22): también es un selector de archivos con teclado (el campo real está dentro de la
// etiqueta, oculto a la vista pero enfocable). Mientras se arrastra se pinta de naranja (compatible) o de rojo (incompatible);
// al soltar o elegir, el navegador revisa el archivo y, si no sirve, lo descarta y avisa por qué.
export function ZonaDeArchivo({ onArchivo, onRechazo, deshabilitada = false }: PropsZona) {
  const [arrastre, setArrastre] = useState<Arrastre>("ninguno");

  // Un archivo soltado fuera de la zona haría que el navegador lo abra y se pierda la pantalla.
  useEffect(() => {
    function evitar(evento: Event) {
      if ((evento as unknown as globalThis.DragEvent).dataTransfer?.types.includes("Files")) evento.preventDefault();
    }
    window.addEventListener("dragover", evitar);
    window.addEventListener("drop", evitar);
    return () => {
      window.removeEventListener("dragover", evitar);
      window.removeEventListener("drop", evitar);
    };
  }, []);

  async function procesar(archivos: File[], carpetas: boolean[]) {
    const candidatos: ArchivoCandidato[] = archivos.map((archivo, i) => ({ nombre: archivo.name, tamano: archivo.size, esCarpeta: carpetas[i] ?? false }));
    const previo = revisarCandidatos(candidatos);
    if (!previo.ok) return onRechazo(previo.mensaje);

    const completo = await revisarArchivo(archivos[0]);
    if (!completo.ok) return onRechazo(completo.mensaje);
    onArchivo(archivos[0]);
  }

  function alArrastrar(evento: DragEvent<HTMLLabelElement>) {
    if (deshabilitada) return;
    evento.preventDefault();
    // Siempre se deja soltar: un archivo incompatible se explica al soltarlo, en vez de un cursor prohibido que no dice por qué.
    evento.dataTransfer.dropEffect = "copy";
    const elementos = Array.from(evento.dataTransfer.items ?? []).map((item) => ({ kind: item.kind, type: item.type }));
    setArrastre(pareceCompatibleAlArrastrar(elementos) ? "compatible" : "incompatible");
  }

  function alSalir(evento: DragEvent<HTMLLabelElement>) {
    // Pasar sobre un hijo también dispara `dragleave`: solo cuenta si de verdad salió de la zona.
    if (evento.currentTarget.contains(evento.relatedTarget as Node | null)) return;
    setArrastre("ninguno");
  }

  function alSoltar(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    setArrastre("ninguno");
    if (deshabilitada) return;

    // Todo lo del `DataTransfer` se lee antes del primer `await`: después, el navegador lo vacía.
    const transferencia = evento.dataTransfer;
    const carpetas = Array.from(transferencia.items ?? []).map((item) => (item.kind === "file" ? (item.webkitGetAsEntry?.()?.isDirectory ?? false) : false));
    const archivos = Array.from(transferencia.files);
    const tipos = Array.from(transferencia.types);

    if (archivos.length === 0) return onRechazo(mensajeDeEnlaceSoltado(tipos) ?? MENSAJES_ARCHIVO.noSePudoLeer);
    void procesar(archivos, carpetas);
  }

  function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? []);
    // Se vacía para poder elegir otra vez el mismo archivo (por ejemplo, tras corregirlo en Excel).
    evento.target.value = "";
    if (archivos.length === 0) return;
    void procesar(archivos, []);
  }

  const titulo =
    arrastre === "compatible" ? "Suéltalo aquí" : arrastre === "incompatible" ? "Este archivo no es compatible" : "Arrastra aquí tu archivo Excel";
  const detalle =
    arrastre === "compatible" ? (
      "Se leerá y verás una vista previa antes de crear nada."
    ) : arrastre === "incompatible" ? (
      <>
        Solo se admiten archivos Excel <b className="font-semibold">.xlsx</b>. Suéltalo igual y te explicamos qué hacer.
      </>
    ) : (
      <>
        o haz clic para elegirlo. Solo archivos <b className="font-semibold">.xlsx</b>, de hasta 2 MB.
      </>
    );

  return (
    <label
      htmlFor={ID_ENTRADA_DE_EXCEL}
      onDragEnter={alArrastrar}
      onDragOver={alArrastrar}
      onDragLeave={alSalir}
      onDrop={alSoltar}
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-5 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-foco focus-within:ring-offset-2 ${ESTILO[arrastre]} ${
        deshabilitada ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <input id={ID_ENTRADA_DE_EXCEL} type="file" accept={ACEPTA} onChange={alElegir} disabled={deshabilitada} className="sr-only" />
      <span
        aria-hidden="true"
        className={`flex size-14 items-center justify-center rounded-full ${
          arrastre === "compatible" ? "bg-enfasis-borde text-enfasis" : arrastre === "incompatible" ? "bg-error-borde text-error" : "bg-fondo text-texto-secundario"
        }`}
      >
        {arrastre === "incompatible" ? <CircleX size={26} strokeWidth={1.75} /> : <Upload size={26} strokeWidth={1.75} />}
      </span>
      <span className="font-titulo text-xl font-bold text-texto">{titulo}</span>
      <span className="max-w-md font-cuerpo text-sm text-texto-secundario">{detalle}</span>
      <span className="inline-flex min-h-11 items-center rounded-md border border-borde-fuerte bg-superficie px-4 font-cuerpo text-sm font-medium text-texto">
        Elegir archivo
      </span>
    </label>
  );
}
