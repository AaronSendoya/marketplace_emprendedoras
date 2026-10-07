import { type DocumentoBuscable, ordenarPorSimilitud as ordenarDocumentos } from "@/shared/domain/BusquedaSimilar";

// Regla 20, resultados similares: los textos de un perfil que se comparan. El motor es compartido con la búsqueda de
// productos (`@/shared/domain/BusquedaSimilar`); aquí solo se dice qué texto de un perfil pesa cuánto.

// Cuántos perfiles activos se comparan como máximo y cuántos productos activos se leen de ellos. La búsqueda
// aproximada no puede apoyarse en un índice de la base, así que se lee el texto y se compara en memoria: los límites
// acotan ese trabajo en un catálogo que crezca mucho más de lo previsto.
export const MAXIMO_DE_PERFILES_COMPARADOS = 2000;
export const MAXIMO_DE_PRODUCTOS_COMPARADOS = 20000;

// Los textos de un perfil que se buscan. Los productos son solo los activos (regla 18).
export interface PerfilBuscable {
  perfilId: string;
  nombreNegocio: string;
  nombreEmprendedora: string;
  descripcion: string;
  productos: { nombre: string; descripcion: string | null }[];
}

// El nombre de la emprendedora y del negocio es lo que más dice de una búsqueda por nombre; el de un producto, algo
// menos; una descripción, lo que menos.
const documentoDe = (perfil: PerfilBuscable): DocumentoBuscable => ({
  id: perfil.perfilId,
  nombre: perfil.nombreNegocio,
  campos: [
    { texto: perfil.nombreNegocio, relevancia: "principal" },
    { texto: perfil.nombreEmprendedora, relevancia: "principal" },
    { texto: perfil.descripcion, relevancia: "descripcion" },
    ...perfil.productos.flatMap((producto) => [
      { texto: producto.nombre, relevancia: "secundario" as const },
      { texto: producto.descripcion, relevancia: "descripcion" as const },
    ]),
  ],
});

// Los ids de los perfiles que se parecen al texto buscado, del que más al que menos.
export const ordenarPorSimilitud = (texto: string, perfiles: PerfilBuscable[]): string[] => ordenarDocumentos(texto, perfiles.map(documentoDe));
