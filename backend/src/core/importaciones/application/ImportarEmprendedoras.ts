import type { IUsuarioRepository } from "@/core/auth/domain/IUsuarioRepository";
import type { CreateUsuarioUseCase } from "@/core/auth/application/CreateUsuarioUseCase";
import type { ICatalogoRepository } from "@/core/catalogos/domain/ICatalogoRepository";
import type { CreatePerfilUseCase } from "@/core/perfiles/application/CreatePerfilUseCase";
import type { Actor } from "@/shared/domain/Actor";
import { ErrorConflicto, ErrorDeDominio } from "@/shared/domain/errors";
import type { ILogger } from "@/shared/domain/ILogger";
import { AVISOS, type Aviso } from "../domain/Avisos";
import { estadoDeAvisos, normalizarCorreo, validarDatosFila, type DatosFila } from "../domain/FilaImportacion";
import type { EstadoFila } from "../domain/ResultadoAnalisis";

// Regla 22: cuántas filas admite una sola petición. El navegador importa por tandas (el hosting corta las peticiones largas).
export const MAXIMO_DE_FILAS_POR_TANDA = 10;

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

// Regla 22: crea las cuentas y los perfiles de las filas, una por una y sin que una que falla detenga a las demás. No carga
// imágenes (todo perfil queda con las predeterminadas, regla 11) ni crea descuentos. Reutiliza los casos de uso que ya validan y
// escriben, así que las reglas 2, 3, 5, 10 y 11 se cumplen igual que al crear una cuenta o un perfil a mano.
export class ImportarEmprendedorasUseCase {
  constructor(
    private readonly usuarios: Pick<IUsuarioRepository, "buscarPorEmail">,
    private readonly catalogos: ICatalogoRepository,
    private readonly crearUsuario: Pick<CreateUsuarioUseCase, "ejecutar">,
    private readonly crearPerfil: Pick<CreatePerfilUseCase, "ejecutar">,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(admin: Actor, filas: FilaAImportar[]): Promise<ResultadoDeFila[]> {
    const [ciudades, rubros] = await Promise.all([this.catalogos.listarCiudades(), this.catalogos.listarRubros()]);
    const resultados: ResultadoDeFila[] = [];
    for (const fila of filas) resultados.push(await this.importarFila(admin, fila, { ciudades, rubros }));

    this.logger.info("importacion_emprendedoras", {
      adminId: admin.id,
      filas: resultados.length,
      creadas: resultados.filter((r) => r.estado === "creada").length,
      omitidas: resultados.filter((r) => r.estado === "omitida").length,
      conError: resultados.filter((r) => r.estado === "error").length,
    });
    return resultados;
  }

  private async importarFila(admin: Actor, { fila, datos }: FilaAImportar, catalogos: Parameters<typeof validarDatosFila>[1]): Promise<ResultadoDeFila> {
    const correo = normalizarCorreo(datos.correo);
    const base = { fila, correo, cuentaCreada: false, perfilCreado: false, passwordTemporal: null };

    const errores = validarDatosFila(datos, catalogos);
    if (errores.length > 0) return { ...base, estado: "error", avisos: errores, mensaje: errores[0].mensaje };

    try {
      if (await this.usuarios.buscarPorEmail(correo)) {
        const aviso = AVISOS.correoExistente();
        return { ...base, estado: "omitida", avisos: [aviso], mensaje: aviso.mensaje };
      }

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
          foto: "predeterminada",
          logo: "predeterminada",
        });
      } catch (error) {
        this.logger.error("importacion_perfil_fallido", { adminId: admin.id, fila, tipo: tipoDeError(error) });
        return { ...conCuenta, estado: "error", avisos: [], mensaje: MENSAJES_IMPORTACION.cuentaSinPerfil };
      }

      return { ...conCuenta, estado: "creada", perfilCreado: true, avisos: [], mensaje: null };
    } catch (error) {
      this.logger.error("importacion_fila_fallida", { adminId: admin.id, fila, tipo: tipoDeError(error) });
      const mensajeDelDominio = error instanceof ErrorDeDominio ? error.message : MENSAJES_IMPORTACION.errorDelServidor;
      return { ...base, estado: "error", avisos: [], mensaje: mensajeDelDominio };
    }
  }
}
