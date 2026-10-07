import { type DocumentoBuscable, ordenarPorSimilitud as ordenarDocumentos } from "@/shared/domain/BusquedaSimilar";

// Regla 21, resultados similares de la búsqueda de productos (Promociones): los textos de un producto que se comparan.
// El motor es compartido con la búsqueda de perfiles (`@/shared/domain/BusquedaSimilar`); aquí solo se dice qué texto
// de un producto pesa cuánto.

// Cuántos productos activos se comparan como máximo. La búsqueda aproximada no puede apoyarse en un índice de la base,
// así que se lee el texto y se compara en memoria: el límite acota ese trabajo en un catálogo que crezca mucho más de
// lo previsto.
export const MAXIMO_DE_PRODUCTOS_BUSCADOS = 20000;

// Los textos de un producto activo de una cuenta activa (regla 18) que se buscan.
export interface ProductoBuscable {
  productoId: string;
  nombre: string;
  descripcion: string | null;
  // El del negocio al que pertenece: la tarjeta de un producto lo muestra.
  nombreNegocio: string;
}

// El nombre del producto es lo que más dice de una búsqueda; el del negocio, algo menos; una descripción, lo que menos.
const documentoDe = (producto: ProductoBuscable): DocumentoBuscable => ({
  id: producto.productoId,
  nombre: producto.nombre,
  campos: [
    { texto: producto.nombre, relevancia: "principal" },
    { texto: producto.nombreNegocio, relevancia: "secundario" },
    { texto: producto.descripcion, relevancia: "descripcion" },
  ],
});

// Los ids de los productos que se parecen al texto buscado, del que más al que menos.
export const ordenarPorSimilitud = (texto: string, productos: ProductoBuscable[]): string[] => ordenarDocumentos(texto, productos.map(documentoDe));
