import { Maximize2 } from "lucide-react";

// La etiqueta «Ampliar» sobre una foto que abre el visor (CLAUDE.md sección 6, regla 14, punto h). Aparece al pasar el
// cursor por la tarjeta o al enfocar la foto con el teclado; en pantallas táctiles, donde no hay cursor, se ve siempre
// y solo con el icono. Es decorativa: el botón que la contiene lleva su propio texto accesible. `group` es la tarjeta y
// `group/foto` el botón de la foto.
export function ChipAmpliar() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-2.5 bottom-2.5 inline-flex translate-y-1 items-center gap-1.5 rounded-full bg-texto/75 px-2.5 py-1.5 font-cuerpo text-xs font-semibold text-white opacity-0 transition-[opacity,translate] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible/foto:translate-y-0 group-focus-visible/foto:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:px-2 pointer-coarse:opacity-100 motion-reduce:transition-none"
    >
      <Maximize2 size={14} strokeWidth={2} />
      <span className="pointer-coarse:hidden">Ampliar</span>
    </span>
  );
}
