import { randomUUID } from "node:crypto";
import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import type { IProductoRepository } from "../domain/IProductoRepository";
import type { CambiosProducto, FiltrosMarketplace, NuevoProducto, Producto } from "../domain/Producto";

interface FilaProducto {
  id: string;
  perfil_id: string;
  nombre: string;
  descripcion: string | null;
  precio: string | null;
  mostrar_precio: number | boolean;
  imagen_key: string;
  activo: number | boolean;
  creado_en: Date | string;
  actualizado_en: Date | string;
  porcentaje: string | null;
  precio_con_descuento: string | null;
  usuario_id: string;
  usuario_activo: number | boolean;
  nombre_negocio: string;
  whatsapp: string;
  logo_key: string;
  ciudad_id: string;
  ciudad_nombre: string;
  rubro_id: string;
  rubro_nombre: string;
}

// Regla 8: la consulta del feed. El descuento vigente es el mayor de los que ya empezaron y aún no
// caducaron (MAX con GROUP BY: MariaDB no tiene LATERAL); devuelve una sola fila por producto. Lleva
// dos `?` (ahora) antes de cualquier otro parámetro.
const SELECT_PRODUCTO = `
  SELECT p.id, p.perfil_id, p.nombre, p.descripcion, p.precio, p.mostrar_precio, p.imagen_key, p.activo,
         p.creado_en, p.actualizado_en,
         dv.porcentaje,
         ROUND(p.precio * (1 - dv.porcentaje / 100), 2) AS precio_con_descuento,
         pe.usuario_id, u.activo AS usuario_activo, pe.nombre_negocio, pe.whatsapp, pe.logo_key,
         pe.ciudad_id, c.nombre AS ciudad_nombre, pe.rubro_id, r.nombre AS rubro_nombre
  FROM productos p
  JOIN perfiles_emprendedores pe ON pe.id = p.perfil_id
  JOIN usuarios u ON u.id = pe.usuario_id
  JOIN ciudades c ON c.id = pe.ciudad_id
  JOIN rubros r ON r.id = pe.rubro_id
  LEFT JOIN (
    SELECT pd.producto_id, MAX(d.porcentaje) AS porcentaje
    FROM producto_descuentos pd
    JOIN descuentos d ON d.id = pd.descuento_id
    WHERE (d.fecha_inicio IS NULL OR d.fecha_inicio <= ?)
      AND (d.fecha_fin IS NULL OR d.fecha_fin >= ?)
    GROUP BY pd.producto_id
  ) dv ON dv.producto_id = p.id
`;

const DESDE_CONTEO = `
  FROM productos p
  JOIN perfiles_emprendedores pe ON pe.id = p.perfil_id
  JOIN usuarios u ON u.id = pe.usuario_id
`;

// Solo estas columnas se pueden actualizar: el SET se arma con esta lista, nunca con claves de la entrada.
const COLUMNAS_EDITABLES: Record<keyof CambiosProducto, string> = {
  nombre: "nombre",
  descripcion: "descripcion",
  precio: "precio",
  mostrarPrecio: "mostrar_precio",
  imagenKey: "imagen_key",
  activo: "activo",
};

// Los DECIMAL llegan como texto (sin perder precisión); se convierten aquí para el dominio.
const aNumero = (valor: string | null) => (valor === null ? null : Number(valor));

const mapear = (fila: FilaProducto): Producto => ({
  id: fila.id,
  perfilId: fila.perfil_id,
  nombre: fila.nombre,
  descripcion: fila.descripcion,
  precio: aNumero(fila.precio),
  mostrarPrecio: Boolean(fila.mostrar_precio),
  imagenKey: fila.imagen_key,
  activo: Boolean(fila.activo),
  creadoEn: new Date(fila.creado_en),
  actualizadoEn: new Date(fila.actualizado_en),
  porcentajeVigente: aNumero(fila.porcentaje),
  precioConDescuento: aNumero(fila.precio_con_descuento),
  perfil: {
    id: fila.perfil_id,
    usuarioId: fila.usuario_id,
    usuarioActivo: Boolean(fila.usuario_activo),
    nombreNegocio: fila.nombre_negocio,
    whatsapp: fila.whatsapp,
    ciudad: { id: fila.ciudad_id, nombre: fila.ciudad_nombre },
    rubro: { id: fila.rubro_id, nombre: fila.rubro_nombre },
    logoKey: fila.logo_key,
  },
});

// Un `%` o `_` escrito por el usuario se busca tal cual, no como comodín.
const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, "\\$&");

export class MySqlProductoRepository implements IProductoRepository {
  constructor(private readonly db: EjecutorSql) {}

  async crear(datos: NuevoProducto): Promise<Producto> {
    const id = randomUUID();
    await this.db.ejecutar(
      `INSERT INTO productos (id, perfil_id, nombre, descripcion, precio, mostrar_precio, imagen_key, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, datos.perfilId, datos.nombre, datos.descripcion, datos.precio, datos.mostrarPrecio, datos.imagenKey, datos.ahora, datos.ahora],
    );
    const producto = await this.buscarPorId(id, datos.ahora);
    if (!producto) throw new Error("El producto recién creado no se encontró.");
    return producto;
  }

  async buscarPorId(id: string, ahora: Date): Promise<Producto | null> {
    const filas = await this.db.consultar<FilaProducto>(`${SELECT_PRODUCTO} WHERE p.id = ?`, [ahora, ahora, id]);
    return filas[0] ? mapear(filas[0]) : null;
  }

  async actualizar(id: string, cambios: CambiosProducto, ahora: Date): Promise<void> {
    const columnas = (Object.keys(COLUMNAS_EDITABLES) as (keyof CambiosProducto)[]).filter((clave) => cambios[clave] !== undefined);
    if (columnas.length === 0) return;
    await this.db.ejecutar(
      `UPDATE productos SET ${columnas.map((clave) => `${COLUMNAS_EDITABLES[clave]} = ?`).join(", ")}, actualizado_en = ? WHERE id = ?`,
      [...columnas.map((clave) => cambios[clave]), ahora, id],
    );
  }

  async listarMarketplace(ahora: Date, filtros: FiltrosMarketplace, pagina: ParametrosPagina): Promise<Pagina<Producto>> {
    const condiciones = ["p.activo = 1", "u.activo = 1"];
    const valores: unknown[] = [];
    if (filtros.perfilId) {
      condiciones.push("p.perfil_id = ?");
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
    if (filtros.q) {
      const patron = `%${escaparLike(filtros.q)}%`;
      condiciones.push("(p.nombre LIKE ? OR p.descripcion LIKE ?)");
      valores.push(patron, patron);
    }
    return this.listar(ahora, `WHERE ${condiciones.join(" AND ")}`, valores, pagina);
  }

  listarPorPerfil(perfilId: string, ahora: Date, pagina: ParametrosPagina): Promise<Pagina<Producto>> {
    return this.listar(ahora, "WHERE p.perfil_id = ?", [perfilId], pagina);
  }

  private async listar(ahora: Date, donde: string, valores: unknown[], pagina: ParametrosPagina): Promise<Pagina<Producto>> {
    const [filas, totales] = await Promise.all([
      this.db.consultar<FilaProducto>(`${SELECT_PRODUCTO} ${donde} ORDER BY p.creado_en DESC, p.id LIMIT ? OFFSET ?`, [
        ahora,
        ahora,
        ...valores,
        pagina.limite,
        desplazamiento(pagina),
      ]),
      this.db.consultar<{ total: number }>(`SELECT COUNT(*) AS total ${DESDE_CONTEO} ${donde}`, valores),
    ]);
    return { datos: filas.map(mapear), total: Number(totales[0]?.total ?? 0) };
  }
}
