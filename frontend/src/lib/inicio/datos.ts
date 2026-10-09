import { cache } from "react";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { listarPerfiles } from "@/lib/api/perfiles";
import { listarProductos } from "@/lib/api/productos";
import { listarPromociones } from "@/lib/api/promociones";
import type { Ciudad, Perfil, ProductoPublico, PromocionPublica, Rubro } from "@/lib/api/tipos";

// Qué carga el Inicio (CLAUDE.md sección 6, regla 14, punto k). Para que el orden al azar no favorezca a nadie hay que
// elegir entre TODAS las emprendedoras y TODAS las promociones, no entre las primeras: la API entrega hasta 100 por página, así
// que se recorren las páginas (cada una se guarda 30 s en la caché de Next, como el resto del catálogo). `TOPE_DE_PAGINAS`
// evita que un catálogo enorme convierta la Home en cientos de peticiones: con 10 páginas son hasta 1000 elementos, mucho más de
// lo que se espera (la importación admite 500 filas por archivo).
const POR_PAGINA = 100;
const TOPE_DE_PAGINAS = 10;

// Cuántas tarjetas lleva como máximo un carrusel. Con 24 o menos se muestran todas, y el botón del encabezado lleva al catálogo
// completo con el total real.
export const MAXIMO_EN_CARRUSEL = 24;
// Con menos emprendedoras que esto no hay carrusel: la tarjeta y un panel que invita a ver el catálogo.
export const MINIMO_PARA_CARRUSEL = 3;
// Con menos emprendimientos que esto, la cifra de la entrada al catálogo resta credibilidad en vez de sumarla.
export const MINIMO_PARA_CIFRAS = 10;
// Sin descuentos vigentes, «Productos para descubrir» necesita al menos esta cantidad de productos para tener forma de sección.
export const MINIMO_PARA_PRODUCTOS = 3;

interface Pagina<T> {
  datos: T[];
  paginacion: { total: number };
}

// Recorre las páginas de un listado hasta tenerlo completo (o hasta el tope). Devuelve los elementos y el total que dice la API.
async function recorrer<T>(pedir: (pagina: number) => Promise<Pagina<T>>): Promise<{ elementos: T[]; total: number }> {
  const primera = await pedir(1);
  const elementos = [...primera.datos];
  const total = primera.paginacion.total;
  const paginas = Math.min(Math.ceil(total / POR_PAGINA), TOPE_DE_PAGINAS);
  if (paginas > 1) {
    const resto = await Promise.all(Array.from({ length: paginas - 1 }, (_, i) => pedir(i + 2)));
    for (const pagina of resto) elementos.push(...pagina.datos);
  }
  return { elementos, total };
}

// `cache` de React: las secciones del Inicio piden lo mismo y se resuelve una sola vez por visita.
export const cargarEmprendedoras = cache(() => recorrer<Perfil>((pagina) => listarPerfiles({ pagina, limite: POR_PAGINA })));

// Las promociones vigentes (regla 23 del backend): un descuento que rige, de una cuenta activa y con productos activos.
export const cargarPromociones = cache(() => recorrer<PromocionPublica>((pagina) => listarPromociones({ pagina, limite: POR_PAGINA })));

// Los productos del catálogo, para la sección de respaldo cuando no hay promociones.
export const cargarProductos = cache(() => recorrer<ProductoPublico>((pagina) => listarProductos({ pagina, limite: POR_PAGINA })));

export const cargarCatalogos = cache(async (): Promise<{ ciudades: Ciudad[]; rubros: Rubro[] }> => {
  const [ciudades, rubros] = await Promise.all([listarCiudades(), listarRubros()]);
  return { ciudades, rubros };
});
