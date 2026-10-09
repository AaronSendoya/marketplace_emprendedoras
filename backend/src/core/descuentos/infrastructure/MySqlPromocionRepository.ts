import { terminosDeBusqueda } from "@/shared/domain/BusquedaTexto";
import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import type { IPromocionRepository } from "../domain/IPromocionRepository";
import { MAXIMO_EN_MUESTRA, type FiltrosPromociones, type PromocionPublica } from "../domain/Promocion";

interface FilaPromocion {
  id: string;
  porcentaje: string;
  fecha_inicio: Date | string | null;
  fecha_fin: Date | string | null;
  descripcion: string | null;
  creado_en: Date | string;
  perfil_id: string;
  nombre_negocio: string;
  whatsapp: string;
  logo_key: string;
  ciudad_id: string;
  ciudad_nombre: string;
  rubro_id: string;
  rubro_nombre: string;
  productos_total: number | string;
}

interface FilaImagen {
  descuento_id: string;
  imagen_key: string;
}

// Regla 23: cuántos productos activos lleva cada descuento va en la misma consulta, como subconsulta.
const SELECT_PROMOCION = `
  SELECT d.id, d.porcentaje, d.fecha_inicio, d.fecha_fin, d.descripcion, d.creado_en,
         pe.id AS perfil_id, pe.nombre_negocio, pe.whatsapp, pe.logo_key,
         pe.ciudad_id, c.nombre AS ciudad_nombre, pe.rubro_id, r.nombre AS rubro_nombre,
         (SELECT COUNT(*) FROM producto_descuentos pd2
            JOIN productos p2 ON p2.id = pd2.producto_id
            WHERE pd2.descuento_id = d.id AND p2.activo = 1) AS productos_total
  FROM descuentos d
  JOIN perfiles_emprendedores pe ON pe.id = d.perfil_id
  JOIN usuarios u ON u.id = pe.usuario_id
  JOIN ciudades c ON c.id = pe.ciudad_id
  JOIN rubros r ON r.id = pe.rubro_id
`;

const DESDE_CONTEO = `
  FROM descuentos d
  JOIN perfiles_emprendedores pe ON pe.id = d.perfil_id
  JOIN usuarios u ON u.id = pe.usuario_id
`;

// Los cuatro órdenes (regla 23). Texto fijo: el orden pedido elige uno, nunca se arma con datos. `MD5(CONCAT(id, semilla))` da un
// orden que parece al azar pero es el mismo mientras la semilla sea la misma, así que la paginación no repite ni salta.
const ORDEN_RECIENTES = "ORDER BY d.creado_en DESC, d.id";
const ORDEN_ALEATORIO = "ORDER BY MD5(CONCAT(d.id, ?)), d.id";
const ORDEN_MAYOR_DESCUENTO = "ORDER BY d.porcentaje DESC, d.creado_en DESC, d.id";
const ORDEN_TERMINA_PRONTO = "ORDER BY (d.fecha_fin IS NULL), d.fecha_fin, d.id";

// Un `%` o `_` escrito por el usuario se busca tal cual, no como comodín.
const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, "\\$&");

const aFecha = (valor: Date | string | null) => (valor === null ? null : new Date(valor));

const mapear = (fila: FilaPromocion, muestra: string[]): PromocionPublica => ({
  id: fila.id,
  porcentaje: Number(fila.porcentaje),
  descripcion: fila.descripcion,
  fechaInicio: aFecha(fila.fecha_inicio),
  fechaFin: aFecha(fila.fecha_fin),
  creadoEn: new Date(fila.creado_en),
  productosTotal: Number(fila.productos_total),
  productosMuestra: muestra,
  perfil: {
    id: fila.perfil_id,
    nombreNegocio: fila.nombre_negocio,
    whatsapp: fila.whatsapp,
    ciudad: { id: fila.ciudad_id, nombre: fila.ciudad_nombre },
    rubro: { id: fila.rubro_id, nombre: fila.rubro_nombre },
    logoKey: fila.logo_key,
  },
});

export class MySqlPromocionRepository implements IPromocionRepository {
  constructor(private readonly db: EjecutorSql) {}

  async listarPublicas(ahora: Date, filtros: FiltrosPromociones, pagina: ParametrosPagina): Promise<Pagina<PromocionPublica>> {
    const { condiciones, valores } = condicionesPublicas(ahora);
    if (filtros.perfilId) {
      condiciones.push("pe.id = ?");
      valores.push(filtros.perfilId);
    }
    if (filtros.ciudadId) {
      condiciones.push("pe.ciudad_id = ?");
      valores.push(filtros.ciudadId);
    }
    if (filtros.rubroId) {
      condiciones.push("pe.rubro_id = ?");
      valores.push(filtros.rubroId);
    }
    // Cada palabra del texto debe aparecer en el nombre del negocio o en el texto del descuento (AND entre palabras, OR entre
    // campos). Sin distinguir mayúsculas ni acentos: lo resuelve la colación utf8mb4_unicode_ci.
    for (const termino of terminosDeBusqueda(filtros.q ?? "")) {
      const patron = `%${escaparLike(termino)}%`;
      condiciones.push("(pe.nombre_negocio LIKE ? OR d.descripcion LIKE ?)");
      valores.push(patron, patron);
    }
    const donde = `WHERE ${condiciones.join(" AND ")}`;

    const alAzar = filtros.orden === "aleatorio";
    const ORDEN =
      filtros.orden === "aleatorio"
        ? ORDEN_ALEATORIO
        : filtros.orden === "mayor_descuento"
          ? ORDEN_MAYOR_DESCUENTO
          : filtros.orden === "termina_pronto"
            ? ORDEN_TERMINA_PRONTO
            : ORDEN_RECIENTES;

    const [filas, totales] = await Promise.all([
      this.db.consultar<FilaPromocion>(`${SELECT_PROMOCION} ${donde} ${ORDEN} LIMIT ? OFFSET ?`, [
        ...valores,
        ...(alAzar ? [filtros.semilla ?? ""] : []),
        pagina.limite,
        desplazamiento(pagina),
      ]),
      this.db.consultar<{ total: number }>(`SELECT COUNT(*) AS total ${DESDE_CONTEO} ${donde}`, valores),
    ]);

    const muestras = await this.muestrasDe(filas.map((fila) => fila.id));
    return { datos: filas.map((fila) => mapear(fila, muestras.get(fila.id) ?? [])), total: Number(totales[0]?.total ?? 0) };
  }

  async buscarPublicaPorId(ahora: Date, id: string): Promise<PromocionPublica | null> {
    const { condiciones, valores } = condicionesPublicas(ahora);
    condiciones.push("d.id = ?");
    valores.push(id);
    const filas = await this.db.consultar<FilaPromocion>(`${SELECT_PROMOCION} WHERE ${condiciones.join(" AND ")}`, valores);
    if (!filas[0]) return null;
    const muestras = await this.muestrasDe([filas[0].id]);
    return mapear(filas[0], muestras.get(filas[0].id) ?? []);
  }

  // Hasta MAXIMO_EN_MUESTRA imágenes de productos activos por descuento, los más recientes primero.
  private async muestrasDe(ids: string[]): Promise<Map<string, string[]>> {
    const muestras = new Map<string, string[]>();
    // `IN ()` vacío no es SQL válido.
    if (ids.length === 0) return muestras;
    const filas = await this.db.consultar<FilaImagen>(
      `SELECT pd.descuento_id, p.imagen_key
       FROM producto_descuentos pd
       JOIN productos p ON p.id = pd.producto_id
       WHERE pd.descuento_id IN (?) AND p.activo = 1
       ORDER BY p.creado_en DESC, p.id`,
      [ids],
    );
    for (const fila of filas) {
      const lista = muestras.get(fila.descuento_id) ?? [];
      if (lista.length < MAXIMO_EN_MUESTRA) lista.push(fila.imagen_key);
      muestras.set(fila.descuento_id, lista);
    }
    return muestras;
  }
}

// Lo que hace pública a una promoción (regla 23): rige ahora, es de una cuenta activa y tiene al menos un producto activo asignado.
// Cada elemento de `condiciones` es un literal; los valores (dos `ahora`) viajan aparte, en el mismo orden.
function condicionesPublicas(ahora: Date): { condiciones: string[]; valores: unknown[] } {
  return {
    condiciones: [
      "u.activo = 1",
      "(d.fecha_inicio IS NULL OR d.fecha_inicio <= ?)",
      "(d.fecha_fin IS NULL OR d.fecha_fin >= ?)",
      "EXISTS (SELECT 1 FROM producto_descuentos pd JOIN productos p ON p.id = pd.producto_id WHERE pd.descuento_id = d.id AND p.activo = 1)",
    ],
    valores: [ahora, ahora],
  };
}
