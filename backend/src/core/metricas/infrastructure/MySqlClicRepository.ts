import { randomUUID } from "node:crypto";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import type {
  ClicDiarioPerfil,
  ItemRankingClic,
  ItemRubroClic,
  ItemSerieClic,
  OrdenMapaCalor,
  ResumenClics,
  TipoClic,
  TotalPorPerfil,
} from "../domain/Clic";
import type { IClicRepository } from "../domain/IClicRepository";
import { diasDelRango, type RangoFechas } from "../domain/RangoFechas";

export class MySqlClicRepository implements IClicRepository {
  constructor(private readonly db: EjecutorSql) {}

  async registrar(perfilId: string, tipo: TipoClic, ahora: Date): Promise<void> {
    await this.db.ejecutar("INSERT INTO clics_contacto (id, perfil_id, tipo, creado_en) VALUES (?, ?, ?, ?)", [
      randomUUID(),
      perfilId,
      tipo,
      ahora,
    ]);
  }

  async resumen(rango: RangoFechas): Promise<ResumenClics> {
    const filas = await this.db.consultar<{ whatsapp: number | string | null; instagram: number | string | null }>(
      `SELECT
         SUM(c.tipo = 'whatsapp') AS whatsapp,
         SUM(c.tipo = 'instagram') AS instagram
       FROM clics_contacto c
       JOIN perfiles_emprendedores p ON p.id = c.perfil_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE u.activo = 1 AND c.creado_en BETWEEN ? AND ?`,
      [rango.desde, rango.hasta],
    );
    const fila = filas[0];
    return {
      whatsapp: Number(fila?.whatsapp ?? 0),
      instagram: Number(fila?.instagram ?? 0),
    };
  }

  async ranking(limite: number, rango: RangoFechas, orden: OrdenMapaCalor = "total"): Promise<ItemRankingClic[]> {
    const filas = await this.db.consultar<{
      perfil_id: string;
      nombre_negocio: string;
      whatsapp: number | string;
      instagram: number | string;
      total: number | string;
    }>(
      `SELECT p.id AS perfil_id, p.nombre_negocio,
         SUM(c.tipo = 'whatsapp') AS whatsapp,
         SUM(c.tipo = 'instagram') AS instagram,
         COUNT(*) AS total
       FROM clics_contacto c
       JOIN perfiles_emprendedores p ON p.id = c.perfil_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE u.activo = 1 AND c.creado_en BETWEEN ? AND ?
       GROUP BY p.id, p.nombre_negocio
       ORDER BY CASE ? WHEN 'whatsapp' THEN SUM(c.tipo = 'whatsapp') WHEN 'instagram' THEN SUM(c.tipo = 'instagram') ELSE COUNT(*) END DESC,
         COUNT(*) DESC, p.nombre_negocio
       LIMIT ?`,
      [rango.desde, rango.hasta, orden, limite],
    );
    return filas.map((fila) => ({
      perfilId: fila.perfil_id,
      nombreNegocio: fila.nombre_negocio,
      whatsapp: Number(fila.whatsapp),
      instagram: Number(fila.instagram),
      total: Number(fila.total),
    }));
  }

  async serieDiaria(rango: RangoFechas): Promise<ItemSerieClic[]> {
    const filas = await this.db.consultar<{ fecha: Date; whatsapp: number | string; instagram: number | string }>(
      `SELECT
         DATE(DATE_SUB(c.creado_en, INTERVAL 4 HOUR)) AS fecha,
         SUM(c.tipo = 'whatsapp') AS whatsapp,
         SUM(c.tipo = 'instagram') AS instagram
       FROM clics_contacto c
       JOIN perfiles_emprendedores p ON p.id = c.perfil_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE u.activo = 1 AND c.creado_en BETWEEN ? AND ?
       GROUP BY fecha
       ORDER BY fecha`,
      [rango.desde, rango.hasta],
    );

    const porFecha = new Map(
      filas.map((fila) => [new Date(fila.fecha).toISOString().slice(0, 10), { whatsapp: Number(fila.whatsapp), instagram: Number(fila.instagram) }]),
    );

    return diasDelRango(rango).map((fecha) => {
      const valores = porFecha.get(fecha);
      return { fecha, whatsapp: valores?.whatsapp ?? 0, instagram: valores?.instagram ?? 0 };
    });
  }

  async porRubro(rango: RangoFechas): Promise<ItemRubroClic[]> {
    const filas = await this.db.consultar<{ rubro: string; total: number | string }>(
      `SELECT r.nombre AS rubro, COUNT(*) AS total
       FROM clics_contacto c
       JOIN perfiles_emprendedores p ON p.id = c.perfil_id
       JOIN usuarios u ON u.id = p.usuario_id
       JOIN rubros r ON r.id = p.rubro_id
       WHERE u.activo = 1 AND c.creado_en BETWEEN ? AND ?
       GROUP BY r.id, r.nombre
       ORDER BY total DESC`,
      [rango.desde, rango.hasta],
    );
    return filas.map((fila) => ({ rubro: fila.rubro, total: Number(fila.total) }));
  }

  async clicsDiariosPorPerfil(perfilIds: string[], rango: RangoFechas): Promise<ClicDiarioPerfil[]> {
    // `IN ()` vacío no es SQL válido: sin cuentas no hay nada que consultar.
    if (perfilIds.length === 0) return [];

    const filas = await this.db.consultar<{ perfil_id: string; fecha: Date; whatsapp: number | string; instagram: number | string }>(
      `SELECT c.perfil_id,
         DATE(DATE_SUB(c.creado_en, INTERVAL 4 HOUR)) AS fecha,
         SUM(c.tipo = 'whatsapp') AS whatsapp,
         SUM(c.tipo = 'instagram') AS instagram
       FROM clics_contacto c
       JOIN perfiles_emprendedores p ON p.id = c.perfil_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE u.activo = 1 AND c.perfil_id IN (?) AND c.creado_en BETWEEN ? AND ?
       GROUP BY c.perfil_id, fecha`,
      [perfilIds, rango.desde, rango.hasta],
    );
    return filas.map((fila) => ({
      perfilId: fila.perfil_id,
      fecha: new Date(fila.fecha).toISOString().slice(0, 10),
      whatsapp: Number(fila.whatsapp),
      instagram: Number(fila.instagram),
    }));
  }

  async totalesPorPerfil(perfilIds: string[], rango: RangoFechas): Promise<TotalPorPerfil[]> {
    if (perfilIds.length === 0) return [];

    const filas = await this.db.consultar<{ perfil_id: string; total: number | string }>(
      `SELECT c.perfil_id, COUNT(*) AS total
       FROM clics_contacto c
       JOIN perfiles_emprendedores p ON p.id = c.perfil_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE u.activo = 1 AND c.perfil_id IN (?) AND c.creado_en BETWEEN ? AND ?
       GROUP BY c.perfil_id`,
      [perfilIds, rango.desde, rango.hasta],
    );
    return filas.map((fila) => ({ perfilId: fila.perfil_id, total: Number(fila.total) }));
  }
}
