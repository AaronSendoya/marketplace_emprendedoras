import { randomUUID } from "node:crypto";
import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import type { NombreRol } from "../domain/Rol";
import type { CambiosUsuario, FiltrosUsuarios, NuevoUsuario, Usuario, UsuarioAutenticado } from "../domain/Usuario";

// Igual patrón que CambiosPerfil (MySqlPerfilRepository): solo se arman las columnas presentes.
const COLUMNAS_EDITABLES: Record<keyof CambiosUsuario, string> = {
  nombres: "nombres",
  apellidoPaterno: "apellido_paterno",
  apellidoMaterno: "apellido_materno",
  email: "email",
  emailVerificadoEn: "email_verificado_en",
};

// Un `%` o `_` escrito por el usuario se busca tal cual, no como comodín (igual que en perfiles y productos).
const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, "\\$&");

interface FilaUsuario {
  id: string;
  email: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  password_hash: string;
  rol: string;
  activo: number | boolean;
  email_verificado_en: Date | string | null;
  token_version: number;
  creado_en: Date | string;
}

type FilaSinHash = Omit<FilaUsuario, "password_hash">;

const COLUMNAS_SIN_HASH = `u.id, u.email, u.nombres, u.apellido_paterno, u.apellido_materno,
         r.nombre AS rol, u.activo, u.email_verificado_en, u.token_version, u.creado_en`;

const SELECT_USUARIO = `
  SELECT ${COLUMNAS_SIN_HASH}, u.password_hash
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
`;

function mapearSinHash(fila: FilaSinHash): UsuarioAutenticado {
  return {
    id: fila.id,
    email: fila.email,
    nombres: fila.nombres,
    apellidoPaterno: fila.apellido_paterno,
    apellidoMaterno: fila.apellido_materno,
    rol: fila.rol as NombreRol,
    activo: Boolean(fila.activo),
    emailVerificadoEn: fila.email_verificado_en ? new Date(fila.email_verificado_en) : null,
    tokenVersion: fila.token_version,
    creadoEn: new Date(fila.creado_en),
  };
}

const mapear = (fila: FilaUsuario): Usuario => ({ ...mapearSinHash(fila), passwordHash: fila.password_hash });

export class MySqlUsuarioRepository implements IUsuarioRepository {
  constructor(private readonly db: EjecutorSql) {}

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const filas = await this.db.consultar<FilaUsuario>(`${SELECT_USUARIO} WHERE u.email = ?`, [email]);
    return filas[0] ? mapear(filas[0]) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const filas = await this.db.consultar<FilaUsuario>(`${SELECT_USUARIO} WHERE u.id = ?`, [id]);
    return filas[0] ? mapear(filas[0]) : null;
  }

  async crear(datos: NuevoUsuario): Promise<Usuario> {
    const id = randomUUID();
    const { filasAfectadas } = await this.db.ejecutar(
      `INSERT INTO usuarios (id, email, nombres, apellido_paterno, apellido_materno, password_hash, rol_id, email_verificado_en, creado_en)
       SELECT ?, ?, ?, ?, ?, ?, r.id, ?, ? FROM roles r WHERE r.nombre = ?`,
      [
        id,
        datos.email,
        datos.nombres,
        datos.apellidoPaterno,
        datos.apellidoMaterno,
        datos.passwordHash,
        datos.emailVerificadoEn,
        datos.creadoEn,
        datos.rol,
      ],
    );
    // Sin la fila del rol el SELECT no devuelve nada: falta sembrar los roles (regla 14), no es un error del usuario.
    if (filasAfectadas !== 1) throw new Error(`El rol "${datos.rol}" no existe en la base de datos.`);

    const usuario = await this.buscarPorId(id);
    if (!usuario) throw new Error("La cuenta recién creada no se encontró.");
    return usuario;
  }

  async listar(filtros: FiltrosUsuarios, pagina: ParametrosPagina): Promise<Pagina<UsuarioAutenticado>> {
    const condiciones: string[] = [];
    const valores: unknown[] = [];
    if (filtros.q) {
      const patron = `%${escaparLike(filtros.q)}%`;
      condiciones.push("(u.nombres LIKE ? OR u.apellido_paterno LIKE ? OR u.apellido_materno LIKE ? OR u.email LIKE ?)");
      valores.push(patron, patron, patron, patron);
    }
    if (filtros.activo !== undefined) {
      condiciones.push("u.activo = ?");
      valores.push(filtros.activo);
    }
    const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [filas, totales] = await Promise.all([
      this.db.consultar<FilaSinHash>(
        `SELECT ${COLUMNAS_SIN_HASH}
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
         ${donde}
         ORDER BY u.creado_en DESC, u.id
         LIMIT ? OFFSET ?`,
        [...valores, pagina.limite, desplazamiento(pagina)],
      ),
      this.db.consultar<{ total: number }>(`SELECT COUNT(*) AS total FROM usuarios u ${donde}`, valores),
    ]);
    return { datos: filas.map(mapearSinHash), total: Number(totales[0]?.total ?? 0) };
  }

  async cambiarEstado(id: string, activo: boolean): Promise<void> {
    await this.db.ejecutar("UPDATE usuarios SET activo = ? WHERE id = ?", [activo, id]);
  }

  async actualizar(id: string, cambios: CambiosUsuario): Promise<void> {
    const columnas = (Object.keys(cambios) as (keyof CambiosUsuario)[]).filter((clave) => cambios[clave] !== undefined);
    if (columnas.length === 0) return;
    await this.db.ejecutar(
      `UPDATE usuarios SET ${columnas.map((clave) => `${COLUMNAS_EDITABLES[clave]} = ?`).join(", ")} WHERE id = ?`,
      [...columnas.map((clave) => cambios[clave]), id],
    );
  }

  async restablecerPassword(id: string, passwordHash: string, ahora: Date): Promise<void> {
    await this.db.ejecutar(
      `UPDATE usuarios
       SET password_hash = ?, token_version = token_version + 1,
           email_verificado_en = COALESCE(email_verificado_en, ?)
       WHERE id = ?`,
      [passwordHash, ahora, id],
    );
  }

  async cambiarPasswordAdmin(id: string, passwordHash: string): Promise<void> {
    await this.db.ejecutar("UPDATE usuarios SET password_hash = ?, token_version = token_version + 1 WHERE id = ?", [passwordHash, id]);
  }

  async cambiarEmail(id: string, email: string, ahora: Date): Promise<void> {
    await this.db.ejecutar("UPDATE usuarios SET email = ?, email_verificado_en = ? WHERE id = ?", [email, ahora, id]);
  }
}
