import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProductosNegocio } from "@/components/organisms/negocio/ProductosNegocio";
import { cargarPerfil, cargarProductos } from "@/lib/negocio/datos";
import { parametroActivo } from "@/lib/negocio/parametros";
import { PARAMETROS_NEGOCIO, RUTAS_NEGOCIO } from "@/lib/negocio/rutas";

export const metadata: Metadata = {
  title: "Mis productos — Mi negocio",
};

export default async function PaginaProductosNegocio({ searchParams }: PageProps<"/mi-negocio/productos">) {
  // Sin perfil no hay a qué asignarle productos: el inicio explica el primer paso.
  if (!(await cargarPerfil())) redirect(RUTAS_NEGOCIO.inicio);

  const [productos, parametros] = await Promise.all([cargarProductos(), searchParams]);

  return <ProductosNegocio productos={productos} abrirCrear={parametroActivo(parametros[PARAMETROS_NEGOCIO.nuevoProducto])} />;
}
