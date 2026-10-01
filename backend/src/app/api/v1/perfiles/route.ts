import { actorDe, crearCreatePerfil, crearGetPerfiles, urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearPerfil, listarPerfiles } from "@/api/controllers/perfiles.controller";
import { resolverImagen } from "@/api/http/imagenes";
import { leerFormulario, LIMITE_CUERPO_DOS_IMAGENES, separarFormulario } from "@/api/http/multipart";
import { leerConsulta, validarDatos } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaCrearPerfilForm, EsquemaListarPerfilesQuery } from "@/api/openapi/rutas/perfiles";

export const GET = withErrorHandling(async (request) => {
  const { pagina, limite, ciudad_id, rubro_id, q } = leerConsulta(request, EsquemaListarPerfilesQuery);
  return listarPerfiles(crearGetPerfiles(), { ciudadId: ciudad_id, rubroId: rubro_id, q }, { pagina, limite }, urlImagenPorDefecto());
});

export const POST = withErrorHandling(
  requireAuth(async (request, _contexto, usuario) => {
    const { texto, archivos } = await separarFormulario(await leerFormulario(request, LIMITE_CUERPO_DOS_IMAGENES), ["foto_perfil", "logo"]);
    const campos = validarDatos(EsquemaCrearPerfilForm, texto, "formulario");

    return crearPerfil(
      crearCreatePerfil(),
      actorDe(usuario),
      {
        usuarioId: campos.usuario_id,
        nombreNegocio: campos.nombre_negocio,
        descripcion: campos.descripcion,
        whatsapp: campos.whatsapp,
        instagram: campos.instagram,
        otraRedSocial: campos.otra_red_social,
        ciudadId: campos.ciudad_id,
        rubroId: campos.rubro_id,
        foto: resolverImagen(archivos.foto_perfil, campos.usar_foto_predeterminada, "foto_perfil", "usar_foto_predeterminada"),
        logo: resolverImagen(archivos.logo, campos.usar_logo_predeterminado, "logo", "usar_logo_predeterminado"),
      },
      urlImagenPorDefecto(),
    );
  }),
);
