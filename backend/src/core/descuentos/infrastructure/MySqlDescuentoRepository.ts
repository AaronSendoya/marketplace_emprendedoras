import { randomUUID } from "node:crypto";
import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import type { CambiosDescuento, Descuento, NuevoDescuento } from "../domain/Descuento";
import type { FiltroEstadoDescuento, IDescuentoRepository } from "../domain/IDescuentoRepository";

interface FilaDescuento {
  id: string;
  perfil_id: string;
  usuario_id: string;
  porcentaje: string;
  fecha_inicio: Date | string | null;
  fecha_fin: Date | string | null;
  creado_en: Date | string;
}

const SELECT_DESCUENTO = `
  SELECT d.id, d.perfil_id, pe.usuario_id, d.porcentaje, d.fecha_inicio, d.fecha_fin, d.creado_en
  FROM descuentos d
  JOIN perfiles_emprendedores pe ON pe.id = d.perfil_id
`;

// Filtro opcional por estado (regla 8). Es la misma precedencia que `estadoDescuento`: programado si
// ya tiene inicio y es futuro; si no, vencido si tiene fin y ya pasó; si no, vigente. Va como
// parámetros (`NULL` = sin filtro): el estado nunca se interpola en el texto SQL. Placeholders, en
// orden: estado, ahora (inicio), ahora (fin), estado.
const FILTRO_ESTADO = `(? IS NULL OR CASE
    WHEN d.fecha_inicio IS NOT NULL AND d.fecha_inicio > ? THEN 'programado'
    WHEN d.fecha_fin IS NOT NULL AND d.fecha_fin < ? THEN 'vencido'
    ELSE 'vigente'
  END = ?)`;

// Solo estas columnas se pueden actualizar: el SET se arma con esta lista, nunca con claves de la entrada.
const COLUMNAS_EDITABLES: Record<keyof CambiosDescuento, string> = {
  porcentaje: "porcentaje",
  fechaInicio: "fecha_inicio",
  fechaFin: "fecha_fin",
};

const aFecha = (valor: Date | string | null) => (valor === null ? null : new Date(valor));

export class MySqlDescuentoRepository implements IDescuentoRepository {
  constructor(private readonly db: EjecutorSql) {}

  async crear(datos: NuevoDescuento): Promise<Descuento> {
    const id = randomUUID();
    await this.db.ejecutar(
      "INSERT INTO descuentos (id, perfil_id, porcentaje, fecha_inicio, fecha_fin, creado_en) VALUES (?, ?, ?, ?, ?, ?)",
      [id, datos.perfilId, datos.porcentaje, datos.fechaInicio, datos.fechaFin, datos.ahora],
    );
    const descuento = await this.buscarPorId(id);
    if (!descuento) throw new Error("El descuento recién creado no se encontró.");
    return descuento;
  }

  async buscarPorId(id: string): Promise<Descuento | null> {
    const filas = await this.db.consultar<FilaDescuento>(`${SELECT_DESCUENTO} WHERE d.id = ?`, [id]);
    if (!filas[0]) return null;
    return (await this.conProductos(filas))[0];
  }

  async actualizar(id: string, cambios: CambiosDescuento): Promise<void> {
    const columnas = (Object.keys(COLUMNAS_EDITABLES) as (keyof CambiosDescuento)[]).filter((clave) => cambios[clave] !== undefined);
    if (columnas.length === 0) return;
    await this.db.ejecutar(`UPDATE descuentos SET ${columnas.map((clave) => `${COLUMNAS_EDITABLES[clave]} = ?`).join(", ")} WHERE id = ?`, [
      ...columnas.map((clave) => cambios[clave]),
      id,
    ]);
  }

  async listarPorPerfil(perfilId: string, pagina: ParametrosPagina, filtro?: FiltroEstadoDescuento): Promise<Pagina<Descuento>> {
    const parametrosFiltro = [filtro?.estado ?? null, filtro?.ahora ?? null, filtro?.ahora ?? null, filtro?.estado ?? null];
    const [filas, totales] = await Promise.all([
      this.db.consultar<FilaDescuento>(
        `${SELECT_DESCUENTO} WHERE d.perfil_id = ? AND ${FILTRO_ESTADO} ORDER BY d.creado_en DESC, d.id LIMIT ? OFFSET ?`,
        [perfilId, ...parametrosFiltro, pagina.limite, desplazamiento(pagina)],
      ),
      this.db.consultar<{ total: number }>(`SELECT COUNT(*) AS total FROM descuentos d WHERE d.perfil_id = ? AND ${FILTRO_ESTADO}`, [
        perfilId,
        ...parametrosFiltro,
      ]),
    ]);
    return { datos: await this.conProductos(filas), total: Number(totales[0]?.total ?? 0) };
  }

  async asignar(descuentoId: string, productoIds: string[]): Promise<void> {
    for (const productoId of productoIds) {
      // ON DUPLICATE KEY solo absorbe la clave repetida: una referencia inexistente sigue fallando.
      await this.db.ejecutar(
        "INSERT INTO producto_descuentos (producto_id, descuento_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE producto_id = producto_id",
        [productoId, descuentoId],
      );
    }
  }

  async quitar(descuentoId: string, productoId: string): Promise<void> {
    await this.db.ejecutar("DELETE FROM producto_descuentos WHERE descuento_id = ? AND producto_id = ?", [descuentoId, productoId]);
  }

  // Una sola consulta para los productos de todos los descuentos de la página.
  private async conProductos(filas: FilaDescuento[]): Promise<Descuento[]> {
    const asignaciones = filas.length
      ? await this.db.consultar<{ descuento_id: string; producto_id: string }>(
          "SELECT descuento_id, producto_id FROM producto_descuentos WHERE descuento_id IN (?) ORDER BY producto_id",
          [filas.map((fila) => fila.id)],
        )
      : [];
    return filas.map((fila) => ({
      id: fila.id,
      perfilId: fila.perfil_id,
      perfilUsuarioId: fila.usuario_id,
      porcentaje: Number(fila.porcentaje),
      fechaInicio: aFecha(fila.fecha_inicio),
      fechaFin: aFecha(fila.fecha_fin),
      creadoEn: new Date(fila.creado_en),
      productoIds: asignaciones.filter((a) => a.descuento_id === fila.id).map((a) => a.producto_id),
    }));
  }
}
