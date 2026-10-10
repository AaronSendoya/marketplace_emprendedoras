import Link from "next/link";
import { clasesChip } from "@/lib/estilos";

// Qué cuentas de la lista de Emprendimientos se muestran según tengan o no su perfil creado.
export type FiltroPerfil = "todas" | "con" | "sin";

export const FILTROS_PERFIL: FiltroPerfil[] = ["todas", "con", "sin"];

// Interpreta el parámetro `perfil` de la URL: ausente o desconocido es "todas".
export function filtroPerfilDeLaUrl(parametro: string): FiltroPerfil {
  return parametro === "con" || parametro === "sin" ? parametro : "todas";
}

export const ETIQUETA_FILTRO_PERFIL: Record<FiltroPerfil, string> = {
  todas: "Todas",
  con: "Con perfil",
  sin: "Sin perfil",
};

interface OpcionFiltroPerfil {
  filtro: FiltroPerfil;
  cantidad: number;
  // Ya armado por la página, con la búsqueda y la cantidad por página, y sin `pagina`: cambiar de
  // filtro vuelve a la primera.
  href: string;
}

interface PropsFiltroPerfilEmprendimiento {
  activo: FiltroPerfil;
  opciones: OpcionFiltroPerfil[];
}

// Filtro de la lista de Emprendimientos por tener o no perfil. Mismo patrón que el resto de los
// filtros del panel (URL como estado, <Link> sin JS de cliente). Las cantidades salen de la lista ya
// buscada, antes de filtrar y de paginar, así que no cambian al cambiar de filtro.
export function FiltroPerfilEmprendimiento({ activo, opciones }: PropsFiltroPerfilEmprendimiento) {
  return (
    <nav aria-label="Filtrar las emprendedoras por perfil" className="flex flex-wrap gap-2">
      {opciones.map(({ filtro, cantidad, href }) => {
        const activa = filtro === activo;
        return (
          <Link
            key={filtro}
            href={href}
            aria-current={activa ? "true" : undefined}
            className={clasesChip(activa)}
          >
            {ETIQUETA_FILTRO_PERFIL[filtro]}
            <span className={`tabular-nums ${activa ? "text-white/90" : "text-texto-secundario/80"}`}>({cantidad})</span>
          </Link>
        );
      })}
    </nav>
  );
}
