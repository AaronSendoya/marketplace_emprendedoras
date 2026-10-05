import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { CampoImagen } from "@/components/organisms/CampoImagen";
import { IdentidadNegocio } from "@/components/organisms/negocio/IdentidadNegocio";
import { PerfilNegocioVista } from "@/components/organisms/negocio/PerfilNegocioVista";
import { PerfilFormulario } from "@/components/organisms/PerfilFormulario";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { CLASES_TARJETA_NEGOCIO } from "@/lib/estilos";
import { ACCIONES_PERFIL_NEGOCIO } from "@/lib/negocio/acciones-formularios";
import { cargarPerfil } from "@/lib/negocio/datos";
import { parametroActivo } from "@/lib/negocio/parametros";
import { PARAMETROS_NEGOCIO, RUTAS_NEGOCIO, rutaEditarPerfil } from "@/lib/negocio/rutas";
import { reemplazarFotoNegocioAction, reemplazarLogoNegocioAction } from "@/lib/negocio/perfil-acciones";

export const metadata: Metadata = {
  title: "Mi perfil — Mi negocio",
};

function Titulo({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div>
      <h1 className="font-titulo text-2xl font-extrabold tracking-tight text-texto sm:text-3xl">{titulo}</h1>
      <p className="mt-1 max-w-xl font-cuerpo text-sm text-texto-secundario">{descripcion}</p>
    </div>
  );
}

// Tres estados en la misma ruta: sin perfil (crearlo), con perfil (verlo) y `?editar=1` (cambiarlo).
// Editar no es otra ruta para que "Editar perfil" del inicio y el de aquí lleven al mismo lugar.
export default async function PaginaPerfilNegocio({ searchParams }: PageProps<"/mi-negocio/perfil">) {
  const [perfil, parametros] = await Promise.all([cargarPerfil(), searchParams]);
  const editando = parametroActivo(parametros[PARAMETROS_NEGOCIO.editarPerfil]);
  const guardado = parametroActivo(parametros[PARAMETROS_NEGOCIO.perfilGuardado]);

  if (!perfil || editando) {
    const [ciudades, rubros] = await Promise.all([listarCiudades(), listarRubros()]);

    return (
      <div className="space-y-6">
        {perfil ? (
          <Titulo titulo="Editar perfil" descripcion="Cambia los datos de tu negocio. Las fotos se guardan por separado, más abajo." />
        ) : (
          <Titulo
            titulo="Crea el perfil de tu negocio"
            descripcion="Es lo primero que ven tus clientes. Podrás cambiar todo esto cuando quieras."
          />
        )}

        <div className={`p-5 sm:p-8 ${CLASES_TARJETA_NEGOCIO}`}>
          <PerfilFormulario
            perfil={perfil}
            ciudades={ciudades}
            rubros={rubros}
            acciones={ACCIONES_PERFIL_NEGOCIO}
            cancelarHref={perfil ? RUTAS_NEGOCIO.perfil : undefined}
          />
        </div>

        {perfil && (
          <section aria-labelledby="titulo-fotos" className={`p-5 sm:p-8 ${CLASES_TARJETA_NEGOCIO}`}>
            <h2 id="titulo-fotos" className="font-titulo text-lg font-bold text-texto">
              Fotos
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <CampoImagen
                titulo="Foto de perfil"
                urlActual={perfil.foto_perfil_url}
                alt={perfil.nombre_negocio}
                accion={reemplazarFotoNegocioAction.bind(null, perfil.id)}
                textoPredeterminada="Usar la foto predeterminada"
              />
              <CampoImagen
                titulo="Logo"
                urlActual={perfil.logo_url}
                alt={`Logo de ${perfil.nombre_negocio}`}
                accion={reemplazarLogoNegocioAction.bind(null, perfil.id)}
                textoPredeterminada="Usar el logo predeterminado"
              />
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Titulo titulo="Mi perfil" descripcion="Así ven tu negocio tus clientes en el catálogo." />
        <Link href={rutaEditarPerfil} className={`${clasesBoton("primario")} min-h-11 shrink-0 sm:px-5`}>
          Editar perfil
        </Link>
      </div>

      {guardado && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-salvia-suave px-4 py-3 font-cuerpo text-sm font-medium text-salvia">
          <CircleCheck size={18} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
          Guardamos los cambios de tu perfil.
        </p>
      )}

      <IdentidadNegocio perfil={perfil} nivelTitulo="h2" />
      <PerfilNegocioVista perfil={perfil} />
    </div>
  );
}
