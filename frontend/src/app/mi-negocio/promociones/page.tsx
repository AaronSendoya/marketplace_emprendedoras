import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PromocionesNegocio } from "@/components/organisms/negocio/PromocionesNegocio";
import { cargarDescuentos, cargarPerfil, cargarProductos } from "@/lib/negocio/datos";
import { parametroActivo } from "@/lib/negocio/parametros";
import { PARAMETROS_NEGOCIO, RUTAS_NEGOCIO } from "@/lib/negocio/rutas";

export const metadata: Metadata = {
  title: "Mis promociones — Mi negocio",
};

export default async function PaginaPromocionesNegocio({ searchParams }: PageProps<"/mi-negocio/promociones">) {
  const perfil = await cargarPerfil();
  if (!perfil) redirect(RUTAS_NEGOCIO.inicio);

  const [descuentos, productos, parametros] = await Promise.all([cargarDescuentos(), cargarProductos(), searchParams]);

  return (
    <PromocionesNegocio
      perfilId={perfil.id}
      descuentos={descuentos}
      productos={productos}
      abrirCrear={parametroActivo(parametros[PARAMETROS_NEGOCIO.nuevaPromocion])}
    />
  );
}
