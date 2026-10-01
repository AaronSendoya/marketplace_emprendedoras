import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obtenerUsuario } from "@/lib/api/admin";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { ErrorApi } from "@/lib/api/cliente";
import { obtenerPerfilDeUsuario } from "@/lib/api/perfiles";
import { listarProductosDeUsuario } from "@/lib/api/productos";
import { listarDescuentosDeUsuario } from "@/lib/api/descuentos";
import { haySesion } from "@/lib/auth/sesion";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { reemplazarFotoPerfilAction, reemplazarLogoAction } from "@/lib/admin/perfiles-acciones";
import { CampoImagen } from "@/components/organisms/CampoImagen";
import { PerfilFormulario } from "@/components/organisms/PerfilFormulario";
import { ProductosPerfilTabla } from "@/components/organisms/ProductosPerfilTabla";
import { DescuentosPerfilTabla } from "@/components/organisms/DescuentosPerfilTabla";

export const metadata: Metadata = {
  title: "Administrar perfil — Panel del Admin",
};

export default async function PaginaEmprendimientoDetalle({ params }: PageProps<"/admin/emprendimientos/[usuarioId]">) {
  if (!(await haySesion())) redirect("/iniciar-sesion");

  const { usuarioId } = await params;

  let usuario: Awaited<ReturnType<typeof obtenerUsuario>>;
  try {
    usuario = await obtenerUsuario(usuarioId);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401) redirect("/iniciar-sesion");
    if (error instanceof ErrorApi && error.status === 404) notFound();
    throw error;
  }

  // Este módulo es solo de perfiles de Emprendedora activas (ver pedido original): un Admin no
  // tiene perfil y una cuenta suspendida queda fuera de alcance, igual que si el id no existiera.
  if (usuario.rol !== "Emprendedor" || !usuario.activo) notFound();

  const [perfil, ciudades, rubros] = await Promise.all([obtenerPerfilDeUsuario(usuarioId), listarCiudades(), listarRubros()]);

  const [productos, descuentos] = perfil
    ? await Promise.all([
        listarProductosDeUsuario(usuarioId, { limite: 100 }).then((pagina) => pagina.datos),
        listarDescuentosDeUsuario(usuarioId, { limite: 100 }).then((pagina) => pagina.datos),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/emprendimientos"
        className={`flex w-fit items-center gap-2 font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`}
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Volver a Emprendimientos
      </Link>

      <div>
        <h1 className="font-titulo text-2xl font-extrabold text-texto">{usuario.nombre_completo}</h1>
        <p className="mt-1 font-cuerpo text-sm text-texto-secundario">{usuario.email}</p>
      </div>

      <div className="rounded-lg border border-borde bg-superficie p-6">
        <h2 className="mb-4 font-titulo text-base font-bold text-texto">{perfil ? "Datos del perfil" : "Crear el perfil"}</h2>
        <PerfilFormulario usuarioId={usuarioId} perfil={perfil} ciudades={ciudades} rubros={rubros} />

        {perfil && (
          <div className="mt-6 grid gap-4 border-t border-borde pt-6 sm:grid-cols-2">
            <CampoImagen
              titulo="Foto de perfil"
              urlActual={perfil.foto_perfil_url}
              alt={perfil.nombre_negocio}
              accion={reemplazarFotoPerfilAction.bind(null, perfil.id, usuarioId)}
              textoPredeterminada="Usar la foto predeterminada"
            />
            <CampoImagen
              titulo="Logo"
              urlActual={perfil.logo_url}
              alt={`Logo de ${perfil.nombre_negocio}`}
              accion={reemplazarLogoAction.bind(null, perfil.id, usuarioId)}
              textoPredeterminada="Usar el logo predeterminado"
            />
          </div>
        )}
      </div>

      {perfil && (
        <>
          <ProductosPerfilTabla perfilId={perfil.id} usuarioId={usuarioId} productos={productos} />
          <DescuentosPerfilTabla perfilId={perfil.id} usuarioId={usuarioId} descuentos={descuentos} productos={productos} />
        </>
      )}
    </div>
  );
}
