import { normalizarTexto } from "@/shared/domain/BusquedaSimilar";

// Regla 22: la ciudad y el rubro del Excel se buscan en el catálogo por nombre. El formulario de Google Forms ofrece
// exactamente los 8 rubros oficiales del catálogo (sección 3), así que el rubro no necesita equivalencias: el que no coincide
// no se resuelve y la fila queda con error. No se crean rubros nuevos (el filtro público muestra el catálogo tal cual) y el
// Admin puede cambiarlo por fila en la vista previa.

export interface Referencia {
  id: string;
  nombre: string;
}

// Sin tildes ni mayúsculas y con un solo espacio entre palabras: "  Potosí " y "potosi" son la misma ciudad.
export const claveDeComparacion = (texto: string) => normalizarTexto(texto).replace(/\s+/g, " ").trim();

const buscarPorNombre = (texto: string, lista: Referencia[]) => {
  const clave = claveDeComparacion(texto);
  return clave ? (lista.find((item) => claveDeComparacion(item.nombre) === clave) ?? null) : null;
};

export const resolverCiudad = (texto: string, ciudades: Referencia[]): Referencia | null => buscarPorNombre(texto, ciudades);

export const resolverRubro = (texto: string, rubros: Referencia[]): Referencia | null => buscarPorNombre(texto, rubros);
