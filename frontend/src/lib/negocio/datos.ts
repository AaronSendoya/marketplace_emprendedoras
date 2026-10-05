import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { listarMisDescuentos } from "@/lib/api/descuentos";
import { obtenerMiPerfil } from "@/lib/api/perfiles";
import { listarMisProductos } from "@/lib/api/productos";
import { ErrorApi } from "@/lib/api/cliente";
import type { Descuento, ProductoPropio } from "@/lib/api/tipos";

// Lo que el panel de la Emprendedora muestra sale solo de /mis/perfil, /mis/productos y
// /mis/descuentos (nada del Admin). `cache()` de React memoiza por petición: el layout y la página
// piden lo mismo por separado (Next los renderiza en paralelo) sin repetir el viaje al backend.
// 100 es el máximo por página del backend; un catálogo de este tamaño no necesita más.

// Un 401 a mitad de la pantalla (el token dejó de valer después del guard del layout) lleva a
// iniciar sesión, igual que el guard, en vez de caer en la pantalla de error.
async function conSesion<T>(cargar: () => Promise<T>): Promise<T> {
  try {
    return await cargar();
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401) redirect("/iniciar-sesion");
    throw error;
  }
}

export const cargarPerfil = cache(() => conSesion(() => obtenerMiPerfil()));

export const cargarProductos = cache((): Promise<ProductoPropio[]> => conSesion(async () => (await listarMisProductos({ limite: 100 })).datos));

export const cargarDescuentos = cache((): Promise<Descuento[]> => conSesion(async () => (await listarMisDescuentos({ limite: 100 })).datos));
