import { listarPerfiles } from "@/lib/api/perfiles";

// Quién es cada emprendimiento del ranking, más allá de su nombre: lo que muestran el podio, la tabla
// y el movimiento del Dashboard.
export interface IdentidadPerfil {
  emprendedora: string;
  rubro: string;
  ciudad: string;
}

const PERFILES_POR_PAGINA = 100; // el máximo de `limite` de GET /perfiles
const MAXIMO_DE_PAGINAS = 10;

// Cruza los ids del ranking con la lista pública de perfiles (el mapa de calor solo trae el nombre del
// negocio). Es un `Record` simple y no un `Map` porque se pasa como prop a un Client Component.
//
// La identidad es contexto: si la lista falla, o un perfil no aparece (más de 1000 perfiles), el
// ranking se muestra igual solo con el nombre del negocio, en lugar de romper el Dashboard entero.
export async function obtenerIdentidades(ids: string[]): Promise<Record<string, IdentidadPerfil>> {
  const buscados = new Set(ids);
  const encontrados: Record<string, IdentidadPerfil> = {};
  if (buscados.size === 0) return encontrados;

  try {
    for (let pagina = 1; pagina <= MAXIMO_DE_PAGINAS; pagina++) {
      const { datos, paginacion } = await listarPerfiles({ pagina, limite: PERFILES_POR_PAGINA });
      for (const perfil of datos) {
        if (buscados.has(perfil.id)) {
          encontrados[perfil.id] = { emprendedora: perfil.emprendedora, rubro: perfil.rubro.nombre, ciudad: perfil.ciudad.nombre };
        }
      }
      if (Object.keys(encontrados).length >= buscados.size || pagina * paginacion.limite >= paginacion.total) break;
    }
  } catch {
    return encontrados;
  }
  return encontrados;
}
