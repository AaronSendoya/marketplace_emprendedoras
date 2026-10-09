import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MySqlProductoRepository } from "@/core/productos/infrastructure/MySqlProductoRepository";
import { ErrorValidacion } from "@/shared/domain/errors";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { GetPromocionesUseCase } from "../application/ConsultasPromocion";
import { MySqlDescuentoRepository } from "./MySqlDescuentoRepository";
import { MySqlPromocionRepository } from "./MySqlPromocionRepository";

// Regla 23, contra la base de pruebas real: qué promociones son públicas, sus filtros, sus cuatro órdenes (el aleatorio con
// semilla) y los productos de una promoción.
const cliente = new MySqlClient(urlDePruebas());
const promociones = new MySqlPromocionRepository(cliente);
const descuentos = new MySqlDescuentoRepository(cliente);
const productos = new MySqlProductoRepository(cliente);
const prefijo = `promo-${randomUUID().slice(0, 8)}`;
const ids = {
  rol: randomUUID(),
  ciudadA: randomUUID(),
  ciudadB: randomUUID(),
  rubroA: randomUUID(),
  rubroB: randomUUID(),
  usuarioA: randomUUID(),
  usuarioB: randomUUID(),
  usuarioInactivo: randomUUID(),
  perfilA: randomUUID(),
  perfilB: randomUUID(),
  perfilInactivo: randomUUID(),
};
const T0 = new Date("2026-09-23T12:00:00.000Z");
const enDias = (dias: number) => new Date(T0.getTime() + dias * 86_400_000);
const PAGINA = { pagina: 1, limite: 100 };

const nuevoProducto = (nombre: string, perfilId: string, parches: Partial<Parameters<typeof productos.crear>[0]> = {}) =>
  productos.crear({ perfilId, nombre: `${prefijo} ${nombre}`, descripcion: null, precio: 10, mostrarPrecio: true, imagenKey: `productos/${nombre}.webp`, ahora: T0, ...parches });

async function descuento(perfilId: string, porcentaje: number, fechaInicio: Date | null, fechaFin: Date | null, productoIds: string[], descripcion: string | null = null) {
  const creado = await descuentos.crear({ perfilId, porcentaje, fechaInicio, fechaFin, descripcion, ahora: T0 });
  if (productoIds.length) await descuentos.asignar(creado.id, productoIds);
  return creado;
}

// Las promociones de esta prueba en una ciudad (cada ciudad es solo de esta prueba, así que no se mezcla con otras).
const deLaCiudad = (ciudadId: string, filtros: Parameters<typeof promociones.listarPublicas>[1] = {}, pagina = PAGINA) =>
  promociones.listarPublicas(T0, { ciudadId, ...filtros }, pagina);

const fx: Record<string, string> = {};

beforeAll(async () => {
  await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [ids.rol, `${prefijo}-rol`]);
  for (const [id, nombre] of [[ids.ciudadA, "A"], [ids.ciudadB, "B"]]) await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [id, `${prefijo} Ciudad ${nombre}`]);
  for (const [id, nombre] of [[ids.rubroA, "A"], [ids.rubroB, "B"]]) await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [id, `${prefijo} Rubro ${nombre}`]);
  for (const [clave, activo] of [["usuarioA", 1], ["usuarioB", 1], ["usuarioInactivo", 0]] as const) {
    await cliente.ejecutar("INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id, activo) VALUES (?, ?, 'María', 'Flores', 'hash', ?, ?)", [
      ids[clave],
      `${prefijo}-${clave}@prueba.test`,
      ids.rol,
      activo,
    ]);
  }
  const perfiles: [string, string, string, string, string][] = [
    [ids.perfilA, ids.usuarioA, "Dulces Wayra", ids.ciudadA, ids.rubroA],
    [ids.perfilB, ids.usuarioB, "Café Ilímani", ids.ciudadB, ids.rubroB],
    [ids.perfilInactivo, ids.usuarioInactivo, "Negocio Inactivo", ids.ciudadA, ids.rubroA],
  ];
  for (const [id, usuarioId, nombre, ciudadId, rubroId] of perfiles) {
    await cliente.ejecutar(
      `INSERT INTO perfiles_emprendedores (id, usuario_id, nombre_negocio, descripcion, whatsapp, ciudad_id, rubro_id, foto_perfil_key, logo_key)
       VALUES (?, ?, ?, 'd', '59171234567', ?, ?, 'perfiles/f.webp', 'logos/l.webp')`,
      [id, usuarioId, `${prefijo} ${nombre}`, ciudadId, rubroId],
    );
  }

  // Ciudad A, perfil A: una vigente permanente con cuatro productos (uno sin precio y otro con el precio oculto), una programada, una
  // vencida, una sin productos y una cuyo único producto está inactivo. Ciudad B, perfil B: una temporal que termina pronto.
  const p1 = await nuevoProducto("p1", ids.perfilA);
  const p2 = await nuevoProducto("p2", ids.perfilA, { precio: null });
  const p3 = await nuevoProducto("p3", ids.perfilA, { mostrarPrecio: false });
  const p4 = await nuevoProducto("p4", ids.perfilA);
  const inactivo = await nuevoProducto("inactivo", ids.perfilA);
  await productos.actualizar(inactivo.id, { activo: false }, T0);
  const pb = await nuevoProducto("pb", ids.perfilB);
  const pInactiva = await nuevoProducto("pi", ids.perfilInactivo);
  fx.p1 = p1.id;
  fx.p4 = p4.id;
  fx.inactivo = inactivo.id;

  fx.vigente = (await descuento(ids.perfilA, 10, null, null, [p1.id, p2.id, p3.id, p4.id], "Descuento por el día del estudiante")).id;
  fx.programada = (await descuento(ids.perfilA, 20, enDias(10), enDias(20), [p1.id])).id;
  fx.vencida = (await descuento(ids.perfilA, 30, enDias(-20), enDias(-10), [p1.id])).id;
  fx.sinProductos = (await descuento(ids.perfilA, 40, null, null, [])).id;
  fx.soloInactivo = (await descuento(ids.perfilA, 50, null, null, [inactivo.id])).id;
  fx.deCuentaInactiva = (await descuento(ids.perfilInactivo, 60, null, null, [pInactiva.id])).id;
  fx.pronto = (await descuento(ids.perfilB, 25, enDias(-1), enDias(3), [pb.id], "Liquidación de invierno")).id;
  fx.tardio = (await descuento(ids.perfilB, 5, null, enDias(30), [pb.id])).id;
});

afterAll(async () => {
  // Los productos y descuentos se borran en cascada con el perfil.
  await cliente.ejecutar("DELETE FROM perfiles_emprendedores WHERE nombre_negocio LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM usuarios WHERE email LIKE ?", [`${prefijo}-%`]);
  await cliente.ejecutar("DELETE FROM ciudades WHERE nombre LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM rubros WHERE nombre LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [ids.rol]);
  await cliente.cerrar();
});

describe("MySqlPromocionRepository: qué es una promoción pública (regla 23)", () => {
  it("solo las que rigen ahora, de cuentas activas y con al menos un producto activo", async () => {
    const { datos, total } = await deLaCiudad(ids.ciudadA);

    expect(datos.map((p) => p.id)).toEqual([fx.vigente]);
    expect(total).toBe(1);
    for (const fuera of [fx.programada, fx.vencida, fx.sinProductos, fx.soloInactivo, fx.deCuentaInactiva]) expect(datos.map((p) => p.id)).not.toContain(fuera);
  });

  it("se muestra aunque sus productos no tengan precio o lo tengan oculto, y cuenta solo los productos activos", async () => {
    const [promocion] = (await deLaCiudad(ids.ciudadA)).datos;

    expect(promocion.productosTotal).toBe(4);
    expect(promocion).toMatchObject({ porcentaje: 10, descripcion: "Descuento por el día del estudiante", fechaInicio: null, fechaFin: null });
  });

  it("trae el negocio con su ciudad y su rubro, y hasta tres imágenes de productos activos (nunca las del inactivo)", async () => {
    const [promocion] = (await deLaCiudad(ids.ciudadA)).datos;

    expect(promocion.perfil).toMatchObject({ id: ids.perfilA, nombreNegocio: `${prefijo} Dulces Wayra`, whatsapp: "59171234567", logoKey: "logos/l.webp" });
    expect(promocion.perfil.ciudad.id).toBe(ids.ciudadA);
    expect(promocion.perfil.rubro.id).toBe(ids.rubroA);
    expect(promocion.productosMuestra).toHaveLength(3);
    expect(promocion.productosMuestra.every((clave) => clave.startsWith("productos/") && !clave.includes("inactivo"))).toBe(true);
  });

  it("vigencia en los extremos: la programada entra al llegar su inicio y la que termina sale al pasar su fin", async () => {
    const en = async (ahora: Date) => (await promociones.listarPublicas(ahora, { ciudadId: ids.ciudadA }, PAGINA)).datos.map((p) => p.id);

    expect(await en(enDias(9))).not.toContain(fx.programada);
    expect(await en(enDias(10))).toContain(fx.programada);
    expect(await en(enDias(21))).toEqual([fx.vigente]);
  });

  it("buscarPublicaPorId: la pública aparece; la programada, la vencida, la sin productos y la de cuenta desactivada, no", async () => {
    expect((await promociones.buscarPublicaPorId(T0, fx.vigente))?.productosTotal).toBe(4);
    for (const id of [fx.programada, fx.vencida, fx.sinProductos, fx.soloInactivo, fx.deCuentaInactiva, randomUUID()]) {
      expect(await promociones.buscarPublicaPorId(T0, id), id).toBeNull();
    }
  });
});

describe("MySqlPromocionRepository: filtros y orden", () => {
  it("filtra por ciudad, rubro y perfil, y los combina con AND", async () => {
    const delRubroB = await promociones.listarPublicas(T0, { rubroId: ids.rubroB }, PAGINA);

    expect(new Set(delRubroB.datos.map((p) => p.id))).toEqual(new Set([fx.pronto, fx.tardio]));
    expect((await promociones.listarPublicas(T0, { perfilId: ids.perfilA }, PAGINA)).datos.map((p) => p.id)).toEqual([fx.vigente]);
    expect((await promociones.listarPublicas(T0, { ciudadId: ids.ciudadA, rubroId: ids.rubroB }, PAGINA)).total).toBe(0);
  });

  it("el texto se busca en el nombre del negocio y en el del descuento, sin distinguir mayúsculas ni acentos, con todas las palabras", async () => {
    const buscar = async (q: string) => (await deLaCiudad(ids.ciudadB, { q })).datos.map((p) => p.id);

    expect(await buscar("ilimani")).toEqual(expect.arrayContaining([fx.pronto, fx.tardio]));
    expect(await buscar("liquidacion INVIERNO")).toEqual([fx.pronto]);
    expect(await buscar("liquidacion zzz")).toEqual([]);
    expect((await deLaCiudad(ids.ciudadA, { q: "ESTUDIANTE" })).datos.map((p) => p.id)).toEqual([fx.vigente]);
  });

  it("un % o _ escrito por quien busca se busca tal cual, no como comodín", async () => {
    expect((await deLaCiudad(ids.ciudadB, { q: "%" })).datos).toEqual([]);
    expect((await deLaCiudad(ids.ciudadB, { q: "Liquid_ción" })).datos).toEqual([]);
  });

  it("orden mayor_descuento: de más a menos porcentaje", async () => {
    const { datos } = await deLaCiudad(ids.ciudadB, { orden: "mayor_descuento" });

    expect(datos.map((p) => p.porcentaje)).toEqual([25, 5]);
  });

  it("orden termina_pronto: los que terminan antes primero y los que no tienen fecha de fin, al final", async () => {
    const { datos } = await promociones.listarPublicas(T0, { perfilId: ids.perfilB, orden: "termina_pronto" }, PAGINA);
    const sinFin = await descuento(ids.perfilB, 99, null, null, [(await nuevoProducto("sin-fin", ids.perfilB)).id]);

    const conSinFin = await promociones.listarPublicas(T0, { perfilId: ids.perfilB, orden: "termina_pronto" }, PAGINA);

    expect(datos.map((p) => p.id)).toEqual([fx.pronto, fx.tardio]);
    expect(conSinFin.datos.map((p) => p.id)).toEqual([fx.pronto, fx.tardio, sinFin.id]);
  });

  it("orden recientes por defecto: los más recientes primero", async () => {
    const { datos } = await promociones.listarPublicas(T0, { perfilId: ids.perfilB }, PAGINA);

    expect(datos.map((p) => p.creadoEn.getTime())).toEqual([...datos.map((p) => p.creadoEn.getTime())].sort((a, b) => b - a));
  });

  it("orden aleatorio: la misma semilla da el mismo orden (y el mismo total), otra semilla puede dar otro, y las páginas no repiten ni saltan", async () => {
    // Un conjunto propio y grande, para que dos semillas distintas casi seguro den órdenes distintos.
    const productoIds = await Promise.all(Array.from({ length: 8 }, async (_, i) => (await nuevoProducto(`azar${i}`, ids.perfilB)).id));
    for (const [i, productoId] of productoIds.entries()) await descuento(ids.perfilB, 11 + i, null, null, [productoId]);
    const orden = async (semilla: string, pagina = PAGINA) => (await promociones.listarPublicas(T0, { perfilId: ids.perfilB, orden: "aleatorio", semilla }, pagina)).datos.map((p) => p.id);

    const a1 = await orden("semilla-a");
    const a2 = await orden("semilla-a");
    const b = await orden("semilla-b");
    expect(a1).toEqual(a2);
    expect(new Set(b)).toEqual(new Set(a1));
    expect(b).not.toEqual(a1);

    const paginas = [...(await orden("semilla-a", { pagina: 1, limite: 4 })), ...(await orden("semilla-a", { pagina: 2, limite: 4 })), ...(await orden("semilla-a", { pagina: 3, limite: 4 }))];
    expect(paginas).toEqual(a1);
    expect(new Set(paginas).size).toBe(paginas.length);
  });

  it("pagina con un total estable", async () => {
    const pagina1 = await promociones.listarPublicas(T0, { perfilId: ids.perfilB }, { pagina: 1, limite: 1 });
    const pagina2 = await promociones.listarPublicas(T0, { perfilId: ids.perfilB }, { pagina: 2, limite: 1 });

    expect(pagina1.total).toBe(pagina2.total);
    expect(pagina1.datos[0].id).not.toBe(pagina2.datos[0].id);
  });

  it("el caso de uso rechaza el orden aleatorio sin semilla", async () => {
    const caso = new GetPromocionesUseCase(promociones, { ahora: () => T0 });

    await expect(caso.ejecutar({ orden: "aleatorio" }, PAGINA)).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

describe("MySqlProductoRepository: los productos de una promoción (descuento_id, regla 23)", () => {
  const de = (descuentoId: string, parches: Partial<Parameters<typeof productos.listarMarketplace>[1]> = {}, ahora = T0, pagina = PAGINA) =>
    productos.listarMarketplace(ahora, { descuentoId, ...parches }, pagina);

  it("solo los productos activos asignados a ese descuento, también los de precio oculto o ausente", async () => {
    const { datos, total } = await de(fx.vigente);

    expect(datos.map((p) => p.nombre.replace(`${prefijo} `, "")).sort()).toEqual(["p1", "p2", "p3", "p4"]);
    expect(total).toBe(4);
    expect(datos.every((p) => p.porcentajeVigente !== null)).toBe(true);
  });

  it("un descuento que aún no rige o ya terminó no devuelve productos", async () => {
    expect((await de(fx.programada)).total).toBe(0);
    expect((await de(fx.vencida)).total).toBe(0);
    expect((await de(fx.programada, {}, enDias(10))).total).toBe(1);
  });

  it("se combina con la ciudad con AND", async () => {
    expect((await de(fx.vigente, { ciudadId: ids.ciudadB })).total).toBe(0);
    expect((await de(fx.vigente, { ciudadId: ids.ciudadA })).total).toBe(4);
  });

  it("orden aleatorio con semilla: mismo orden con la misma semilla y páginas sin repetidos ni saltos", async () => {
    const todo = (await de(fx.vigente, { orden: "aleatorio", semilla: "uno" })).datos.map((p) => p.id);
    const otra = (await de(fx.vigente, { orden: "aleatorio", semilla: "uno" })).datos.map((p) => p.id);
    const porPaginas = [
      ...(await de(fx.vigente, { orden: "aleatorio", semilla: "uno" }, T0, { pagina: 1, limite: 3 })).datos,
      ...(await de(fx.vigente, { orden: "aleatorio", semilla: "uno" }, T0, { pagina: 2, limite: 3 })).datos,
    ].map((p) => p.id);

    expect(todo).toEqual(otra);
    expect(porPaginas).toEqual(todo);
    expect(new Set(todo).size).toBe(4);
  });

  it("el orden por defecto sigue siendo el más reciente primero", async () => {
    const { datos } = await de(fx.vigente);

    expect(datos.map((p) => p.creadoEn.getTime())).toEqual([...datos.map((p) => p.creadoEn.getTime())].sort((a, b) => b - a));
  });
});
