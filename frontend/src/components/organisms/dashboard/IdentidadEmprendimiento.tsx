import Link from "next/link";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import type { IdentidadPerfil } from "@/lib/metricas/identidad";

interface PropsRubroCiudad {
  identidad?: IdentidadPerfil;
}

// "Alimentos y bebidas · La Paz". La ciudad no se parte entre dos líneas: si no cabe todo, baja entera.
// Sin identidad (el perfil no se encontró en la lista pública) no se muestra nada.
export function RubroCiudad({ identidad }: PropsRubroCiudad) {
  if (!identidad) return null;
  return (
    <>
      {identidad.rubro} · <span className="whitespace-nowrap">{identidad.ciudad}</span>
    </>
  );
}

interface PropsEnlaceNegocio {
  perfilId: string;
  nombre: string;
  className?: string;
}

// El nombre del negocio como enlace a su página pública en el catálogo (`/emprendedoras/[id]`). Este
// ranking es solo del panel Admin; la página a la que lleva es la que ve cualquier visitante.
export function EnlaceNegocio({ perfilId, nombre, className = "" }: PropsEnlaceNegocio) {
  return (
    <Link href={`/emprendedoras/${perfilId}`} title={nombre} className={`break-words hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE} ${className}`.trim()}>
      {nombre}
    </Link>
  );
}
