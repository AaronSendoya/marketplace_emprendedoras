import type { Actor } from "@/shared/domain/Actor";
import { ErrorValidacion } from "@/shared/domain/errors";

interface Referencia {
  id: string;
  nombre: string;
}

// El negocio dueño del producto: lo que el feed público necesita para mostrarlo y contactar.
export interface PerfilDeProducto {
  id: string;
  usuarioId: string;
  usuarioActivo: boolean;
  nombreNegocio: string;
  whatsapp: string;
  ciudad: Referencia;
  rubro: Referencia;
  logoKey: string;
}

export interface Producto {
  id: string;
  perfilId: string;
  nombre: string;
  descripcion: string | null;
  // El precio real, aunque esté oculto: la API pública decide qué muestra (regla 7).
  precio: number | null;
  mostrarPrecio: boolean;
  imagenKey: string;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
  // Mayor descuento vigente al momento de la consulta (regla 8); nulo si no hay.
  porcentajeVigente: number | null;
  precioConDescuento: number | null;
  perfil: PerfilDeProducto;
}

export interface NuevoProducto {
  perfilId: string;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  mostrarPrecio: boolean;
  imagenKey: string;
  ahora: Date;
}

export interface CambiosProducto {
  nombre?: string;
  descripcion?: string | null;
  precio?: number | null;
  mostrarPrecio?: boolean;
  imagenKey?: string;
  activo?: boolean;
}

export interface FiltrosMarketplace {
  perfilId?: string;
  ciudadId?: string;
  rubroId?: string;
  // Texto libre (regla 21): se busca en el nombre del producto, en su descripción y en el nombre de su negocio.
  q?: string;
}

// Regla 7: DECIMAL(10,2).
export const PRECIO_MAXIMO = 99_999_999.99;

export function esPrecioValido(precio: number): boolean {
  const centavos = precio * 100;
  return Number.isFinite(precio) && precio >= 0 && precio <= PRECIO_MAXIMO && Math.abs(centavos - Math.round(centavos)) < 1e-6;
}

export function validarPrecio(precio: number | null | undefined): void {
  if (precio === null || precio === undefined || esPrecioValido(precio)) return;
  const mensaje = "El precio debe ser 0 o más, con hasta 2 decimales.";
  throw new ErrorValidacion(mensaje, [{ campo: "precio", mensaje }]);
}

// Regla 7 y regla 18: el precio (y con él el descuento) solo se ve si existe y no está oculto.
export const precioVisible = (producto: Pick<Producto, "precio" | "mostrarPrecio">) =>
  producto.precio !== null && producto.mostrarPrecio;

// Regla 18: la dueña gestiona sus productos; el Admin, los de cualquiera.
export const puedeGestionarProducto = (actor: Actor, producto: Pick<Producto, "perfil">) =>
  actor.rol === "Admin" || producto.perfil.usuarioId === actor.id;
