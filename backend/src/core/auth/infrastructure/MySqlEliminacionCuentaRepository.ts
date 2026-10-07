import { ErrorConflicto, ErrorNoEncontrado } from "@/shared/domain/errors";
import type { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import type { IEliminacionCuentaRepository, ResumenEliminacion } from "../domain/IEliminacionCuentaRepository";

interface FilaCuenta {
  id: string;
  email: string;
  rol: string;
  activo: number | boolean;
}

interface FilaPerfil {
  id: string;
  foto_perfil_key: string;
  logo_key: string;
}

const contar = (filas: { n: number | string }[]) => Number(filas[0]?.n ?? 0);

// Regla 5: eliminar una cuenta por completo. Todo en una transacción y de forma explícita, de lo más dependiente a lo menos:
// no se apoya en `ON DELETE CASCADE` porque TiDB solo aplica las claves foráneas desde la v8.5.0 (regla 3). `FOR UPDATE` sobre
// la cuenta serializa la operación con cualquier otro cambio de la misma cuenta (por ejemplo, que la suspendan justo ahora).
// Todo va con parámetros: ningún dato se arma dentro del texto SQL (regla 17).
export class MySqlEliminacionCuentaRepository implements IEliminacionCuentaRepository {
  constructor(private readonly db: Pick<MySqlClient, "transaccion">) {}

  eliminar(usuarioId: string): Promise<ResumenEliminacion> {
    return this.db.transaccion(async (tx) => {
      const cuentas = await tx.consultar<FilaCuenta>(
        `SELECT u.id, u.email, r.nombre AS rol, u.activo
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
         WHERE u.id = ?
         FOR UPDATE`,
        [usuarioId],
      );
      const cuenta = cuentas[0];
      if (!cuenta) throw new ErrorNoEncontrado("La cuenta no existe.");
      // Ya bajo el bloqueo: lo que comprobó el caso de uso pudo haber cambiado.
      if (cuenta.rol !== "Emprendedor" || !cuenta.activo) throw new ErrorConflicto("La cuenta cambió mientras se eliminaba. Revísala y vuelve a intentarlo.");

      const resumen: ResumenEliminacion = { perfiles: 0, productos: 0, descuentos: 0, clics: 0, clavesImagenes: [] };

      const perfiles = await tx.consultar<FilaPerfil>("SELECT id, foto_perfil_key, logo_key FROM perfiles_emprendedores WHERE usuario_id = ?", [usuarioId]);
      for (const perfil of perfiles) {
        const imagenes = await tx.consultar<{ imagen_key: string }>("SELECT imagen_key FROM productos WHERE perfil_id = ?", [perfil.id]);
        const descuentos = await tx.consultar<{ n: number }>("SELECT COUNT(*) AS n FROM descuentos WHERE perfil_id = ?", [perfil.id]);
        const clics = await tx.consultar<{ n: number }>("SELECT COUNT(*) AS n FROM clics_contacto WHERE perfil_id = ?", [perfil.id]);

        await tx.ejecutar("DELETE FROM clics_contacto WHERE perfil_id = ?", [perfil.id]);
        await tx.ejecutar("DELETE FROM producto_descuentos WHERE producto_id IN (SELECT id FROM productos WHERE perfil_id = ?)", [perfil.id]);
        await tx.ejecutar("DELETE FROM producto_descuentos WHERE descuento_id IN (SELECT id FROM descuentos WHERE perfil_id = ?)", [perfil.id]);
        await tx.ejecutar("DELETE FROM descuentos WHERE perfil_id = ?", [perfil.id]);
        await tx.ejecutar("DELETE FROM productos WHERE perfil_id = ?", [perfil.id]);
        await tx.ejecutar("DELETE FROM perfiles_emprendedores WHERE id = ?", [perfil.id]);

        resumen.perfiles += 1;
        resumen.productos += imagenes.length;
        resumen.descuentos += contar(descuentos);
        resumen.clics += contar(clics);
        resumen.clavesImagenes.push(perfil.foto_perfil_key, perfil.logo_key, ...imagenes.map((fila) => fila.imagen_key));
      }

      // No referencian a `usuarios` (son del correo): sin esto quedarían códigos e intentos de una cuenta que ya no existe.
      await tx.ejecutar("DELETE FROM otp_codigos WHERE email = ?", [cuenta.email]);
      await tx.ejecutar("DELETE FROM intentos_login WHERE email = ?", [cuenta.email]);

      const borrada = await tx.ejecutar("DELETE FROM usuarios WHERE id = ?", [usuarioId]);
      if (borrada.filasAfectadas !== 1) throw new ErrorNoEncontrado("La cuenta no existe.");

      return resumen;
    });
  }
}
