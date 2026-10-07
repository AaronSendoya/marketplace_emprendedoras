import { esImagenPredeterminada } from "@/shared/domain/imagenes";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import type { IImageStorage } from "@/shared/domain/IImageStorage";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IEliminacionCuentaRepository } from "../domain/IEliminacionCuentaRepository";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";

// Lo que se le dice al Admin al terminar: cuánto se eliminó junto con la cuenta.
export interface ResultadoEliminacion {
  perfiles: number;
  productos: number;
  descuentos: number;
  clics: number;
  imagenes: number;
}

const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();

// Regla 5: eliminar una cuenta de Emprendedor por completo. Es una operación distinta de suspender y no la sustituye: solo
// se elimina una cuenta activa (una suspendida se activa primero, a propósito), nunca una de Admin ni la propia, y solo si el
// Admin escribe el correo de la cuenta. Es irreversible: se borra todo lo que depende de ella (perfil, productos, descuentos,
// clics, OTP e intentos de acceso) en una transacción y, ya confirmada, sus imágenes de R2. Que una imagen no se pueda borrar
// no deshace nada: la cuenta ya no existe y se registra para limpiarla a mano.
export class EliminarCuentaUseCase {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly eliminacion: IEliminacionCuentaRepository,
    private readonly almacenamiento: IImageStorage,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(adminId: string, usuarioId: string, confirmacionEmail: string): Promise<ResultadoEliminacion> {
    if (usuarioId === adminId) throw new ErrorConflicto("No puedes eliminar tu propia cuenta.");

    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new ErrorNoEncontrado("La cuenta no existe.");
    if (usuario.rol !== "Emprendedor") throw new ErrorProhibido("Una cuenta de Admin no se elimina desde la API.");
    if (!usuario.activo) throw new ErrorConflicto("Activa la cuenta para poder eliminarla: una cuenta suspendida no se elimina.");
    if (normalizarCorreo(confirmacionEmail) !== normalizarCorreo(usuario.email)) {
      throw new ErrorValidacion("El correo escrito no coincide con el de la cuenta.", [
        { campo: "confirmacion_email", mensaje: "Escribe el correo de la cuenta tal como aparece." },
      ]);
    }

    const resumen = await this.eliminacion.eliminar(usuarioId);

    // Ya confirmada la transacción: las imágenes propias (nunca las predeterminadas, regla 11) y sin repetir claves.
    const claves = [...new Set(resumen.clavesImagenes)].filter((clave) => !esImagenPredeterminada(clave));
    const resultados = await Promise.allSettled(claves.map((clave) => this.almacenamiento.borrar(clave)));
    const noBorradas = claves.filter((_clave, i) => resultados[i].status === "rejected");
    for (const clave of noBorradas) this.logger.warn("imagen_cuenta_no_borrada", { usuarioId, clave });

    const imagenes = claves.length - noBorradas.length;
    this.logger.info("cuenta_eliminada", {
      usuarioId,
      adminId,
      perfiles: resumen.perfiles,
      productos: resumen.productos,
      descuentos: resumen.descuentos,
      clics: resumen.clics,
      imagenes,
      imagenesNoBorradas: noBorradas.length,
    });

    return { perfiles: resumen.perfiles, productos: resumen.productos, descuentos: resumen.descuentos, clics: resumen.clics, imagenes };
  }
}
