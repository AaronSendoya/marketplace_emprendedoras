import type { IUsuarioRepository } from "@/core/auth/domain/IUsuarioRepository";
import type { CreateUsuarioUseCase } from "@/core/auth/application/CreateUsuarioUseCase";
import type { ICatalogoRepository } from "@/core/catalogos/domain/ICatalogoRepository";
import type { CreatePerfilUseCase } from "@/core/perfiles/application/CreatePerfilUseCase";
import type { Actor } from "@/shared/domain/Actor";
import { ErrorArchivoMuyGrande, ErrorConflicto, ErrorDeDominio, ErrorValidacion } from "@/shared/domain/errors";
import type { IImageProcessor } from "@/shared/domain/IImageProcessor";
import type { ILogger } from "@/shared/domain/ILogger";
import { TAMANO_MAX_IMAGEN_DRIVE_BYTES, type ImagenEntrante } from "@/shared/domain/imagenes";
import { AVISOS, type Aviso, type CampoDeImagen } from "../domain/Avisos";
import { aMegabytes } from "../domain/EvaluarArchivoDrive";
import { estadoDeAvisos, normalizarCorreo, validarDatosFila, type DatosFila } from "../domain/FilaImportacion";
import { ErrorArchivoDrive, ErrorConexionGoogle, type IArchivosDrive } from "../domain/IArchivosDrive";
import type { EstadoFila } from "../domain/ResultadoAnalisis";

// Regla 22: cuántas filas admite una sola petición. El navegador importa por tandas (el hosting corta las peticiones largas).
export const MAXIMO_DE_FILAS_POR_TANDA = 10;
// Con imágenes de Drive cada fila tarda varios segundos (dos descargas, su proceso y la subida a R2): la tanda es la mitad de grande.
export const MAXIMO_DE_FILAS_POR_TANDA_CON_IMAGENES = 5;

export interface FilaAImportar {
  // Número de fila en el Excel, solo para que el resultado se pueda relacionar con la vista previa.
  fila: number;
  datos: DatosFila;
}

export interface ValidacionDeFila {
  fila: number;
  estado: EstadoFila;
  avisos: Aviso[];
  yaExiste: boolean;
}

// Regla 22: vuelve a revisar filas que el Admin corrigió en la vista previa, sin escribir nada.
export class ValidarFilasEmprendedorasUseCase {
  constructor(
    private readonly usuarios: Pick<IUsuarioRepository, "buscarPorEmail">,
    private readonly catalogos: ICatalogoRepository,
  ) {}

  async ejecutar(filas: FilaAImportar[]): Promise<ValidacionDeFila[]> {
    const [ciudades, rubros] = await Promise.all([this.catalogos.listarCiudades(), this.catalogos.listarRubros()]);
    const resultados: ValidacionDeFila[] = [];
    for (const { fila, datos } of filas) {
      const avisos = validarDatosFila(datos, { ciudades, rubros });
      const correoValido = !avisos.some((aviso) => aviso.campo === "correo");
      const yaExiste = correoValido && (await this.usuarios.buscarPorEmail(normalizarCorreo(datos.correo))) !== null;
      if (yaExiste) avisos.push(AVISOS.correoExistente());
      resultados.push({ fila, estado: yaExiste ? "ya_existe" : estadoDeAvisos(avisos), avisos, yaExiste });
    }
    return resultados;
  }
}

export type EstadoDeImportacion = "creada" | "omitida" | "error";

export interface ResultadoDeFila {
  fila: number;
  correo: string;
  estado: EstadoDeImportacion;
  cuentaCreada: boolean;
  perfilCreado: boolean;
  // Si la foto y el logo salieron de Drive (si no, el perfil tiene la imagen predeterminada de esa posición, regla 11).
  fotoCargada: boolean;
  logoCargado: boolean;
  // Solo cuando se creó la cuenta, y solo en esta respuesta: nunca se guarda en claro (regla 5).
  passwordTemporal: string | null;
  avisos: Aviso[];
  mensaje: string | null;
}

// Del error solo se registra su tipo, nunca el mensaje: puede traer un correo o un teléfono.
const tipoDeError = (error: unknown) => (error instanceof Error ? error.constructor.name : typeof error);

export const MENSAJES_IMPORTACION = {
  correoRegistradoMientras: "Este correo se registró hace un momento. Se omitió.",
  cuentaSinPerfil: "Se creó la cuenta pero no el perfil. Complétalo desde Emprendimientos > Crear perfil.",
  errorDelServidor: "No pudimos crear esta fila por un error del servidor. Puedes reintentarla: si la cuenta ya se creó, se omitirá.",
};

interface ImagenTraida {
  imagen: ImagenEntrante;
  aviso: Aviso | null;
  cargada: boolean;
}

// Regla 22: crea las cuentas y los perfiles de las filas, una por una y sin que una que falla detenga a las demás. Si el Admin conectó
// una cuenta de Google, descarga de Drive la foto y el logo de cada fila (regla 22, «Imágenes desde Drive»); una imagen que no se puede
// traer deja la predeterminada (regla 11) y un aviso, nunca detiene la fila. No crea descuentos. Reutiliza los casos de uso que ya validan
// y escriben, así que las reglas 2, 3, 5, 10, 11 y 16 se cumplen igual que al crear una cuenta o un perfil a mano.
export class ImportarEmprendedorasUseCase {
  constructor(
    private readonly usuarios: Pick<IUsuarioRepository, "buscarPorEmail">,
    private readonly catalogos: ICatalogoRepository,
    private readonly crearUsuario: Pick<CreateUsuarioUseCase, "ejecutar">,
    private readonly crearPerfil: Pick<CreatePerfilUseCase, "ejecutar">,
    private readonly logger: ILogger,
    // Sin ellos (o sin token) la importación deja todas las imágenes predeterminadas, como antes.
    private readonly drive: IArchivosDrive | null = null,
    private readonly procesador: IImageProcessor | null = null,
  ) {}

  // `tokenGoogle`: el de la cuenta que conectó el Admin; nunca se guarda ni se registra (regla 17).
  async ejecutar(admin: Actor, filas: FilaAImportar[], tokenGoogle: string | null = null): Promise<ResultadoDeFila[]> {
    const hayImagenes = filas.some(({ datos }) => datos.fotoDriveId || datos.logoDriveId);
    if (tokenGoogle && hayImagenes && filas.length > MAXIMO_DE_FILAS_POR_TANDA_CON_IMAGENES) {
      const mensaje = `Con imágenes de Drive se importan hasta ${MAXIMO_DE_FILAS_POR_TANDA_CON_IMAGENES} filas por petición.`;
      throw new ErrorValidacion(mensaje, [{ campo: "filas", mensaje }]);
    }
    // Si la conexión ya no vale, se avisa antes de crear nada: así la tanda se reanuda entera después de volver a conectar, en vez de
    // crear cuentas con imágenes que ya no se podían traer.
    if (tokenGoogle && hayImagenes && this.drive) {
      try {
        await this.drive.cuenta(tokenGoogle);
      } catch (error) {
        if (error instanceof ErrorArchivoDrive && error.motivo === "conexion_vencida") throw new ErrorConexionGoogle();
      }
    }

    const [ciudades, rubros] = await Promise.all([this.catalogos.listarCiudades(), this.catalogos.listarRubros()]);
    const resultados: ResultadoDeFila[] = [];
    for (const fila of filas) resultados.push(await this.importarFila(admin, fila, { ciudades, rubros }, tokenGoogle));

    this.logger.info("importacion_emprendedoras", {
      adminId: admin.id,
      filas: resultados.length,
      creadas: resultados.filter((r) => r.estado === "creada").length,
      omitidas: resultados.filter((r) => r.estado === "omitida").length,
      conError: resultados.filter((r) => r.estado === "error").length,
      fotosCargadas: resultados.filter((r) => r.fotoCargada).length,
      logosCargados: resultados.filter((r) => r.logoCargado).length,
    });
    return resultados;
  }

  // Trae una imagen de Drive y la procesa (regla 16). Nunca lanza: una imagen que no sirve es un aviso, no un error de la fila.
  private async traerImagen(admin: Actor, fila: number, campo: CampoDeImagen, id: string, token: string | null): Promise<ImagenTraida> {
    const predeterminada = (aviso: Aviso | null): ImagenTraida => ({ imagen: "predeterminada", aviso, cargada: false });
    if (!id) return predeterminada(null);
    if (!token || !this.drive || !this.procesador) return predeterminada(AVISOS.imagenSinConexion(campo));

    const maximoEnMegabytes = TAMANO_MAX_IMAGEN_DRIVE_BYTES / (1024 * 1024);
    let bytes = 0;
    try {
      const original = await this.drive.descargar(id, token, TAMANO_MAX_IMAGEN_DRIVE_BYTES);
      bytes = original.length;
      const webp = await this.procesador.procesar(original, campo === "foto" ? "perfil" : "logo", { tamanoMaxBytes: TAMANO_MAX_IMAGEN_DRIVE_BYTES });
      return { imagen: { yaProcesada: webp }, aviso: null, cargada: true };
    } catch (error) {
      if (error instanceof ErrorArchivoDrive) {
        if (error.motivo === "sin_acceso") return predeterminada(AVISOS.imagenSinAcceso(campo, null));
        if (error.motivo === "conexion_vencida") return predeterminada(AVISOS.imagenConexionVencida(campo));
        if (error.motivo === "muy_grande") return predeterminada(AVISOS.imagenMuyGrande(campo, null, maximoEnMegabytes));
      } else if (error instanceof ErrorArchivoMuyGrande) {
        return predeterminada(AVISOS.imagenMuyGrande(campo, aMegabytes(bytes), maximoEnMegabytes));
      } else if (error instanceof ErrorValidacion) {
        return predeterminada(AVISOS.imagenNoEsImagen(campo, null));
      }
      // Del error solo se registra su tipo: nunca el id del archivo ni su contenido.
      this.logger.warn("importacion_imagen_fallida", { adminId: admin.id, fila, campo, tipo: tipoDeError(error) });
      return predeterminada(AVISOS.imagenNoSeDescargo(campo));
    }
  }

  private async importarFila(
    admin: Actor,
    { fila, datos }: FilaAImportar,
    catalogos: Parameters<typeof validarDatosFila>[1],
    tokenGoogle: string | null,
  ): Promise<ResultadoDeFila> {
    const correo = normalizarCorreo(datos.correo);
    const base = { fila, correo, cuentaCreada: false, perfilCreado: false, fotoCargada: false, logoCargado: false, passwordTemporal: null };

    const errores = validarDatosFila(datos, catalogos);
    if (errores.length > 0) return { ...base, estado: "error", avisos: errores, mensaje: errores[0].mensaje };

    try {
      if (await this.usuarios.buscarPorEmail(correo)) {
        const aviso = AVISOS.correoExistente();
        return { ...base, estado: "omitida", avisos: [aviso], mensaje: aviso.mensaje };
      }

      // Las imágenes se traen antes de crear la cuenta: si el correo se registró en medio y la fila se omite, no se subió nada a R2 (lo
      // que se sube lo sube el alta del perfil, después). Foto y logo van a la vez: son las dos descargas simultáneas del tope.
      const [foto, logo] = await Promise.all([
        this.traerImagen(admin, fila, "foto", datos.fotoDriveId, tokenGoogle),
        this.traerImagen(admin, fila, "logo", datos.logoDriveId, tokenGoogle),
      ]);
      const avisosDeImagen = [foto.aviso, logo.aviso].filter((a): a is Aviso => a !== null);

      let cuenta;
      try {
        cuenta = await this.crearUsuario.ejecutar(admin.id, {
          email: correo,
          nombres: datos.nombres.trim(),
          apellidoPaterno: datos.apellidoPaterno.trim(),
          apellidoMaterno: datos.apellidoMaterno.trim() || null,
        });
      } catch (error) {
        // Otra petición creó la cuenta en medio.
        if (error instanceof ErrorConflicto) return { ...base, estado: "omitida", avisos: [], mensaje: MENSAJES_IMPORTACION.correoRegistradoMientras };
        throw error;
      }
      const conCuenta = { ...base, cuentaCreada: true, passwordTemporal: cuenta.passwordTemporal };

      try {
        await this.crearPerfil.ejecutar(admin, {
          usuarioId: cuenta.usuario.id,
          nombreNegocio: datos.nombreNegocio.trim(),
          descripcion: datos.descripcion.trim(),
          whatsapp: datos.whatsapp.trim(),
          instagram: datos.instagram.trim() || null,
          otraRedSocial: datos.otraRedSocial.trim() || null,
          ciudadId: datos.ciudadId,
          rubroId: datos.rubroId,
          foto: foto.imagen,
          logo: logo.imagen,
        });
      } catch (error) {
        this.logger.error("importacion_perfil_fallido", { adminId: admin.id, fila, tipo: tipoDeError(error) });
        return { ...conCuenta, estado: "error", avisos: [], mensaje: MENSAJES_IMPORTACION.cuentaSinPerfil };
      }

      return { ...conCuenta, estado: "creada", perfilCreado: true, fotoCargada: foto.cargada, logoCargado: logo.cargada, avisos: avisosDeImagen, mensaje: null };
    } catch (error) {
      this.logger.error("importacion_fila_fallida", { adminId: admin.id, fila, tipo: tipoDeError(error) });
      const mensajeDelDominio = error instanceof ErrorDeDominio ? error.message : MENSAJES_IMPORTACION.errorDelServidor;
      return { ...base, estado: "error", avisos: [], mensaje: mensajeDelDominio };
    }
  }
}
