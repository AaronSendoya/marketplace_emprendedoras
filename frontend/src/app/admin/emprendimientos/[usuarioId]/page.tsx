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
import { CLASES_FOCO_ENLACE, CLASES_PANEL_ADMIN } from "@/lib/estilos";
import { reemplazarFotoPerfilAction, reemplazarLogoAction } from "@/lib/admin/perfiles-acciones";
import { CampoImagen } from "@/components/organisms/CampoImagen";
import { PerfilFormulario } from "@/components/organisms/PerfilFormulario";
import { NavegacionEmprendimiento, VISTAS_EMPRENDIMIENTO, type VistaEmprendimiento } from "@/components/organisms/NavegacionEmprendimiento";
import { ProductosPerfilGrid } from "@/components/organisms/ProductosPerfilGrid";
import { DescuentosPerfilGrid } from "@/components/organisms/DescuentosPerfilGrid";
import { AvisoPerfilPendiente } from "@/components/organisms/AvisoPerfilPendiente";
import { EncabezadoPaginaAdmin } from "@/components/organisms/EncabezadoPaginaAdmin";
import { estadoDeLaUrl, FiltroEstadoDescuento } from "@/components/organisms/FiltroEstadoDescuento";

export const metadata: Metadata = {
  title: "Administrar perfil — Panel del Admin",
};

function primerValor(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export default async function PaginaEmprendimientoDetalle({ params, searchParams }: PageProps<"/admin/emprendimientos/[usuarioId]">) {
  if (!(await haySesion())) redirect("/iniciar-sesion");

  const { usuarioId } = await params;
  const parametrosUrl = await searchParams;
  const vistaParametro = primerValor(parametrosUrl.vista);
  // Sin `estado` en la URL se ven los vigentes; `estado=todos` los muestra todos; un valor desconocido
  // se trata como el de por defecto y no llega al backend.
  const estadoDescuento = estadoDeLaUrl(primerValor(parametrosUrl.estado));
  const vista: VistaEmprendimiento = VISTAS_EMPRENDIMIENTO.includes(vistaParametro as VistaEmprendimiento)
    ? (vistaParametro as VistaEmprendimiento)
    : "perfil";

  let usuario: Awaited<ReturnType<typeof obtenerUsuario>>;
  try {
    usuario = await obtenerUsuario(usuarioId);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401) redirect("/iniciar-sesion");
    // 404: no existe; 400: el id de la dirección no tiene forma de UUID (escrito a mano o enlace roto). Para quien lo ve es lo mismo.
    if (error instanceof ErrorApi && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }

  // Este módulo es solo de perfiles de Emprendedora activas (ver pedido original): un Admin no
  // tiene perfil y una cuenta suspendida queda fuera de alcance, igual que si el id no existiera.
  if (usuario.rol !== "Emprendedor" || !usuario.activo) notFound();

  const [perfil, ciudades, rubros] = await Promise.all([obtenerPerfilDeUsuario(usuarioId), listarCiudades(), listarRubros()]);

  const [productos, descuentos] = perfil
    ? await Promise.all([
        listarProductosDeUsuario(usuarioId, { limite: 100 }).then((pagina) => pagina.datos),
        listarDescuentosDeUsuario(usuarioId, { limite: 100, estado: estadoDescuento ?? undefined }).then((pagina) => pagina.datos),
      ])
    : [[], []];

  // Con un filtro activo (por defecto, "vigentes") una lista vacía no dice si el emprendimiento no tiene
  // ningún descuento o solo ninguno en ese estado: se pregunta, con una consulta mínima, solo cuando hace falta.
  let hayDescuentos = descuentos.length > 0;
  if (perfil && !hayDescuentos && estadoDescuento) {
    hayDescuentos = (await listarDescuentosDeUsuario(usuarioId, { limite: 1 })).paginacion.total > 0;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/emprendimientos"
        className={`flex min-h-11 w-fit items-center gap-2 font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento lg:min-h-0 ${CLASES_FOCO_ENLACE}`}
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Volver a Emprendimientos
      </Link>

      <EncabezadoPaginaAdmin titulo={usuario.nombre_completo} descripcion={usuario.email} />

      {/* Las tres pestañas se ven siempre; sin perfil, Productos y Descuentos quedan bloqueadas. */}
      <NavegacionEmprendimiento vistaActiva={perfil ? vista : "perfil"} perfilCreado={perfil !== null} />

      {!perfil && <AvisoPerfilPendiente />}

      {(vista === "perfil" || !perfil) && (
        <div className={`${CLASES_PANEL_ADMIN} p-5 sm:p-7`}>
          {perfil ? (
            <h2 className="mb-5 font-titulo text-seccion font-bold tracking-tight text-texto">Datos del perfil</h2>
          ) : (
            <div className="mb-5">
              <h2 className="font-titulo text-seccion font-bold tracking-tight text-texto">Aún no tiene perfil</h2>
              <p className="mt-1 font-cuerpo text-sm text-texto-secundario">Completa los datos de su negocio para crearlo.</p>
            </div>
          )}
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
      )}

      {perfil && vista === "productos" && <ProductosPerfilGrid perfilId={perfil.id} usuarioId={usuarioId} productos={productos} />}
      {perfil && vista === "descuentos" && (
        <DescuentosPerfilGrid
          perfilId={perfil.id}
          usuarioId={usuarioId}
          descuentos={descuentos}
          productos={productos}
          estadoFiltro={estadoDescuento}
          hayDescuentos={hayDescuentos}
          filtros={<FiltroEstadoDescuento estadoActivo={estadoDescuento} />}
        />
      )}
    </div>
  );
}
