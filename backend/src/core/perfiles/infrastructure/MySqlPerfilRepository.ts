import { randomUUID } from "node:crypto";
import { nombreCompleto } from "@/core/auth/domain/Usuario";
import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import { MAXIMO_DE_CARACTERES_DE_DESCRIPCION } from "@/shared/domain/BusquedaSimilar";
import { terminosDeBusqueda } from "@/shared/domain/BusquedaTexto";
import { MAXIMO_DE_PERFILES_COMPARADOS, MAXIMO_DE_PRODUCTOS_COMPARADOS, type PerfilBuscable } from "../domain/BusquedaSimilar";
import type { CambiosPerfil, FiltrosPerfiles, NuevoPerfil, Perfil } from "../domain/Perfil";
import type { IPerfilRepository } from "../domain/IPerfilRepository";

interface FilaPerfil {
  id: string;
  usuario_id: string;
  usuario_activo: number | boolean;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  nombre_negocio: string;
  descripcion: string;
  whatsapp: string;
  instagram_username: string | null;
  otra_red_social: string | null;
  ciudad_id: string;
  ciudad_nombre: string;
  rubro_id: string;
  rubro_nombre: string;
  foto_perfil_key: string;
  logo_key: string;
  creado_en: Date | string;
  actualizado_en: Date | string;
}

interface FilaBuscable {
  id: string;
  nombre_negocio: string;
  descripcion: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
}

interface FilaProductoBuscable {
  perfil_id: string;
  nombre: string;
  descripcion: string | null;
}

const DESDE = `
  FROM perfiles_emprendedores p
  JOIN usuarios u ON u.id = p.usuario_id
  JOIN ciudades c ON c.id = p.ciudad_id
  JOIN rubros r ON r.id = p.rubro_id
`;

const SELECT_PERFIL = `
  SELECT p.id, p.usuario_id, u.activo AS usuario_activo, u.nombres, u.apellido_paterno, u.apellido_materno,
         p.nombre_negocio, p.descripcion, p.whatsapp, p.instagram_username, p.otra_red_social,
         p.ciudad_id, c.nombre AS ciudad_nombre, p.rubro_id, r.nombre AS rubro_nombre,
         p.foto_perfil_key, p.logo_key, p.creado_en, p.actualizado_en
  ${DESDE}
`;

// Solo las columnas de esta lista se pueden actualizar: el SET se arma con ella, nunca con claves de la entrada.
const COLUMNAS_EDITABLES: Record<keyof CambiosPerfil, string> = {
  nombreNegocio: "nombre_negocio",
  descripcion: "descripcion",
  whatsapp: "whatsapp",
  instagramUsername: "instagram_username",
  otraRedSocial: "otra_red_social",
  ciudadId: "ciudad_id",
  rubroId: "rubro_id",
  fotoPerfilKey: "foto_perfil_key",
  logoKey: "logo_key",
};

const mapear = (fila: FilaPerfil): Perfil => ({
  id: fila.id,
  usuarioId: fila.usuario_id,
  usuarioActivo: Boolean(fila.usuario_activo),
  nombreEmprendedora: nombreCompleto({
    nombres: fila.nombres,
    apellidoPaterno: fila.apellido_paterno,
    apellidoMaterno: fila.apellido_materno,
  }),
  nombreNegocio: fila.nombre_negocio,
  descripcion: fila.descripcion,
  whatsapp: fila.whatsapp,
  instagramUsername: fila.instagram_username,
  otraRedSocial: fila.otra_red_social,
  ciudad: { id: fila.ciudad_id, nombre: fila.ciudad_nombre },
  rubro: { id: fila.rubro_id, nombre: fila.rubro_nombre },
  fotoPerfilKey: fila.foto_perfil_key,
  logoKey: fila.logo_key,
  creadoEn: new Date(fila.creado_en),
  actualizadoEn: new Date(fila.actualizado_en),
});

// Un `%` o `_` escrito por el usuario se busca tal cual, no como comodín.
const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, "\\$&");

export class MySqlPerfilRepository implements IPerfilRepository {
  constructor(private readonly db: EjecutorSql) {}

  async crear(datos: NuevoPerfil): Promise<Perfil> {
    const id = randomUUID();
    await this.db.ejecutar(
      `INSERT INTO perfiles_emprendedores
         (id, usuario_id, nombre_negocio, descripcion, whatsapp, instagram_username, otra_red_social, ciudad_id, rubro_id,
          foto_perfil_key, logo_key, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        datos.usuarioId,
        datos.nombreNegocio,
        datos.descripcion,
        datos.whatsapp,
        datos.instagramUsername,
        datos.otraRedSocial,
        datos.ciudadId,
        datos.rubroId,
        datos.fotoPerfilKey,
        datos.logoKey,
        datos.ahora,
        datos.ahora,
      ],
    );
    const perfil = await this.buscarPorId(id);
    if (!perfil) throw new Error("El perfil recién creado no se encontró.");
    return perfil;
  }

  async buscarPorId(id: string): Promise<Perfil | null> {
    const filas = await this.db.consultar<FilaPerfil>(`${SELECT_PERFIL} WHERE p.id = ?`, [id]);
    return filas[0] ? mapear(filas[0]) : null;
  }

  async buscarPorUsuarioId(usuarioId: string): Promise<Perfil | null> {
    const filas = await this.db.consultar<FilaPerfil>(`${SELECT_PERFIL} WHERE p.usuario_id = ?`, [usuarioId]);
    return filas[0] ? mapear(filas[0]) : null;
  }

  async actualizar(id: string, cambios: CambiosPerfil, ahora: Date): Promise<void> {
    const columnas = (Object.keys(COLUMNAS_EDITABLES) as (keyof CambiosPerfil)[]).filter((clave) => cambios[clave] !== undefined);
    if (columnas.length === 0) return;
    await this.db.ejecutar(
      `UPDATE perfiles_emprendedores SET ${columnas.map((clave) => `${COLUMNAS_EDITABLES[clave]} = ?`).join(", ")}, actualizado_en = ? WHERE id = ?`,
      [...columnas.map((clave) => cambios[clave]), ahora, id],
    );
  }

  async listar(filtros: FiltrosPerfiles, pagina: ParametrosPagina): Promise<Pagina<Perfil>> {
    const condiciones = ["u.activo = 1"];
    const valores: unknown[] = [];
    if (filtros.ciudadId) {
      condiciones.push("p.ciudad_id = ?");
      valores.push(filtros.ciudadId);
    }
    if (filtros.rubroId) {
      condiciones.push("p.rubro_id = ?");
      valores.push(filtros.rubroId);
    }
    // Regla 20: cada palabra del texto debe aparecer en alguno de esos campos (AND entre palabras, OR entre
    // campos). No distingue mayúsculas ni acentos: lo resuelve la colación utf8mb4_unicode_ci. Un producto oculto
    // nunca hace aparecer a su dueña (regla 18). Cinco parámetros por palabra, el mismo patrón en cada uno: la
    // condición es texto fijo y va como literal (tests/seguridad/sql.test.ts lo exige).
    for (const termino of terminosDeBusqueda(filtros.q ?? "")) {
      const patron = `%${escaparLike(termino)}%`;
      condiciones.push(`(
        p.nombre_negocio LIKE ?
        OR p.descripcion LIKE ?
        OR CONCAT_WS(' ', u.nombres, u.apellido_paterno, u.apellido_materno) LIKE ?
        OR EXISTS (
          SELECT 1 FROM productos pr
          WHERE pr.perfil_id = p.id AND pr.activo = 1 AND (pr.nombre LIKE ? OR pr.descripcion LIKE ?)
        )
      )`);
      valores.push(patron, patron, patron, patron, patron);
    }
    const donde = `WHERE ${condiciones.join(" AND ")}`;

    const [filas, totales] = await Promise.all([
      this.db.consultar<FilaPerfil>(`${SELECT_PERFIL} ${donde} ORDER BY p.creado_en DESC, p.id LIMIT ? OFFSET ?`, [
        ...valores,
        pagina.limite,
        desplazamiento(pagina),
      ]),
      this.db.consultar<{ total: number }>(`SELECT COUNT(*) AS total ${DESDE} ${donde}`, valores),
    ]);
    return { datos: filas.map(mapear), total: Number(totales[0]?.total ?? 0) };
  }

  async textosBuscables(filtros: Pick<FiltrosPerfiles, "ciudadId" | "rubroId">): Promise<PerfilBuscable[]> {
    const condiciones = ["u.activo = 1"];
    const valores: unknown[] = [];
    if (filtros.ciudadId) {
      condiciones.push("p.ciudad_id = ?");
      valores.push(filtros.ciudadId);
    }
    if (filtros.rubroId) {
      condiciones.push("p.rubro_id = ?");
      valores.push(filtros.rubroId);
    }
    const donde = `WHERE ${condiciones.join(" AND ")}`;

    const perfiles = await this.db.consultar<FilaBuscable>(
      `SELECT p.id, p.nombre_negocio, p.descripcion, u.nombres, u.apellido_paterno, u.apellido_materno
       ${DESDE} ${donde} ORDER BY p.creado_en DESC, p.id LIMIT ?`,
      [...valores, MAXIMO_DE_PERFILES_COMPARADOS],
    );
    if (perfiles.length === 0) return [];

    // Solo los productos activos (regla 18) y de cada descripción su comienzo: el resto no cambia el parecido.
    const productos = await this.db.consultar<FilaProductoBuscable>(
      `SELECT perfil_id, nombre, LEFT(descripcion, ?) AS descripcion
       FROM productos
       WHERE activo = 1 AND perfil_id IN (?)
       ORDER BY creado_en DESC, id LIMIT ?`,
      [MAXIMO_DE_CARACTERES_DE_DESCRIPCION, perfiles.map((perfil) => perfil.id), MAXIMO_DE_PRODUCTOS_COMPARADOS],
    );
    const productosPorPerfil = new Map<string, PerfilBuscable["productos"]>();
    for (const producto of productos) {
      const lista = productosPorPerfil.get(producto.perfil_id) ?? [];
      lista.push({ nombre: producto.nombre, descripcion: producto.descripcion });
      productosPorPerfil.set(producto.perfil_id, lista);
    }

    return perfiles.map((fila) => ({
      perfilId: fila.id,
      nombreNegocio: fila.nombre_negocio,
      nombreEmprendedora: nombreCompleto({
        nombres: fila.nombres,
        apellidoPaterno: fila.apellido_paterno,
        apellidoMaterno: fila.apellido_materno,
      }),
      descripcion: fila.descripcion,
      productos: productosPorPerfil.get(fila.id) ?? [],
    }));
  }

  async listarPorIds(ids: string[]): Promise<Perfil[]> {
    // `IN ()` vacío no es SQL válido.
    if (ids.length === 0) return [];
    const filas = await this.db.consultar<FilaPerfil>(`${SELECT_PERFIL} WHERE u.activo = 1 AND p.id IN (?)`, [ids]);
    const porId = new Map(filas.map((fila) => [fila.id, mapear(fila)]));
    return ids.flatMap((id) => porId.get(id) ?? []);
  }
}
