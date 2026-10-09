import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MySqlDescuentoRepository } from "@/core/descuentos/infrastructure/MySqlDescuentoRepository";
import { GetMarketplaceUseCase } from "@/core/productos/application/ConsultasProducto";
import { MAXIMO_DE_CARACTERES_DE_DESCRIPCION } from "@/shared/domain/BusquedaSimilar";
import { ErrorValidacion } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import type { NuevoProducto } from "../domain/Producto";
import { MySqlProductoRepository } from "./MySqlProductoRepository";

const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlProductoRepository(cliente);
const descuentos = new MySqlDescuentoRepository(cliente);
const prefijo = `prod-${randomUUID().slice(0, 8)}`;
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
const enMin = (minutos: number) => new Date(T0.getTime() + minutos * 60_000);
const enDias = (dias: number) => new Date(T0.getTime() + dias * 86_400_000);

const nuevo = (parches: Partial<NuevoProducto> = {}): NuevoProducto => ({
  perfilId: ids.perfilA,
  nombre: `${prefijo} Producto`,
  descripcion: null,
  precio: 100,
  mostrarPrecio: true,
  imagenKey: "productos/p.webp",
  ahora: T0,
  ...parches,
});

// Crea un descuento del perfil A y lo asigna a los productos indicados.
async function descuento(porcentaje: number, fechaInicio: Date | null, fechaFin: Date | null, productoIds: string[], perfilId = ids.perfilA) {
  const creado = await descuentos.crear({ perfilId, porcentaje, fechaInicio, fechaFin, descripcion: null, ahora: T0 });
  await descuentos.asignar(creado.id, productoIds);
  return creado;
}

async function nuevoProducto(nombre: string, parches: Partial<NuevoProducto> = {}) {
  return repositorio.crear(nuevo({ nombre: `${prefijo} ${nombre}`, ...parches }));
}

beforeAll(async () => {
  await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [ids.rol, `${prefijo}-rol`]);
  for (const [id, nombre] of [[ids.ciudadA, "A"], [ids.ciudadB, "B"]]) await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [id, `${prefijo} Ciudad ${nombre}`]);
  for (const [id, nombre] of [[ids.rubroA, "A"], [ids.rubroB, "B"]]) await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [id, `${prefijo} Rubro ${nombre}`]);
  for (const [clave, activo] of [["usuarioA", 1], ["usuarioB", 1], ["usuarioInactivo", 0]] as const) {
    await cliente.ejecutar(
      "INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id, activo) VALUES (?, ?, 'María', 'Flores', 'hash', ?, ?)",
      [ids[clave], `${prefijo}-${clave}@prueba.test`, ids.rol, activo],
    );
  }
  const perfiles: [string, string, string, string, string][] = [
    [ids.perfilA, ids.usuarioA, "Negocio A", ids.ciudadA, ids.rubroA],
    [ids.perfilB, ids.usuarioB, "Negocio B", ids.ciudadB, ids.rubroB],
    [ids.perfilInactivo, ids.usuarioInactivo, "Negocio Inactivo", ids.ciudadA, ids.rubroA],
  ];
  for (const [id, usuarioId, nombre, ciudadId, rubroId] of perfiles) {
    await cliente.ejecutar(
      `INSERT INTO perfiles_emprendedores (id, usuario_id, nombre_negocio, descripcion, whatsapp, ciudad_id, rubro_id, foto_perfil_key, logo_key)
       VALUES (?, ?, ?, 'd', '59171234567', ?, ?, 'perfiles/f.webp', 'logos/l.webp')`,
      [id, usuarioId, `${prefijo} ${nombre}`, ciudadId, rubroId],
    );
  }
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

describe("MySqlProductoRepository: datos", () => {
  it("crear guarda el producto y lo devuelve con su perfil, ciudad, rubro y DECIMAL como número", async () => {
    const producto = await repositorio.crear(nuevo({ nombre: `${prefijo} Base`, descripcion: "Rica", precio: 25.5 }));

    expect(producto).toMatchObject({
      perfilId: ids.perfilA,
      nombre: `${prefijo} Base`,
      descripcion: "Rica",
      precio: 25.5,
      mostrarPrecio: true,
      imagenKey: "productos/p.webp",
      activo: true,
      creadoEn: T0,
      actualizadoEn: T0,
      porcentajeVigente: null,
      precioConDescuento: null,
      perfil: {
        id: ids.perfilA,
        usuarioId: ids.usuarioA,
        usuarioActivo: true,
        nombreNegocio: `${prefijo} Negocio A`,
        whatsapp: "59171234567",
        ciudad: { id: ids.ciudadA, nombre: `${prefijo} Ciudad A` },
        rubro: { id: ids.rubroA, nombre: `${prefijo} Rubro A` },
        logoKey: "logos/l.webp",
      },
    });
    expect(producto.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("el precio es opcional (NULL) y 0 se distingue de NULL", async () => {
    expect((await nuevoProducto("Sin precio", { precio: null })).precio).toBeNull();
    expect((await nuevoProducto("Gratis", { precio: 0 })).precio).toBe(0);
  });

  it("guarda el precio con exactitud de 2 decimales y hasta 99.999.999,99", async () => {
    expect((await nuevoProducto("Centavos", { precio: 19.99 })).precio).toBe(19.99);
    expect((await nuevoProducto("Máximo", { precio: 99_999_999.99 })).precio).toBe(99_999_999.99);
  });

  it("un perfil inexistente da error de validación con el campo", async () => {
    await expect(repositorio.crear(nuevo({ perfilId: randomUUID() }))).rejects.toMatchObject({ detalles: [{ campo: "perfil_id" }] });
    await expect(repositorio.crear(nuevo({ perfilId: randomUUID() }))).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("buscarPorId encuentra el producto o devuelve null; también uno inactivo", async () => {
    const creado = await nuevoProducto("Buscable");
    await repositorio.actualizar(creado.id, { activo: false }, enMin(1));

    expect((await repositorio.buscarPorId(creado.id, T0))?.activo).toBe(false);
    expect(await repositorio.buscarPorId(randomUUID(), T0)).toBeNull();
  });

  it("actualizar cambia solo los campos indicados y la fecha; null limpia precio y descripción", async () => {
    const creado = await nuevoProducto("Editable", { descripcion: "Original", precio: 50 });

    await repositorio.actualizar(creado.id, { nombre: `${prefijo} Renombrado`, mostrarPrecio: false, imagenKey: "productos/nueva.webp" }, enMin(30));
    const editado = (await repositorio.buscarPorId(creado.id, T0))!;
    expect(editado).toMatchObject({
      nombre: `${prefijo} Renombrado`,
      mostrarPrecio: false,
      imagenKey: "productos/nueva.webp",
      descripcion: "Original",
      precio: 50,
      creadoEn: T0,
      actualizadoEn: enMin(30),
    });

    await repositorio.actualizar(creado.id, { precio: null, descripcion: null }, enMin(31));
    expect(await repositorio.buscarPorId(creado.id, T0)).toMatchObject({ precio: null, descripcion: null });
  });

  it("actualizar sin cambios no hace nada", async () => {
    const creado = await nuevoProducto("Quieto");

    await expect(repositorio.actualizar(creado.id, {}, enMin(60))).resolves.toBeUndefined();

    expect((await repositorio.buscarPorId(creado.id, T0))?.actualizadoEn).toEqual(T0);
  });
});

describe("MySqlProductoRepository: descuento vigente en el feed (regla 8)", () => {
  const descuentoDe = async (nombre: string, ahora: Date, parches: Partial<NuevoProducto> = {}) => {
    const producto = await nuevoProducto(nombre, parches);
    return { producto, consultar: async () => (await repositorio.buscarPorId(producto.id, ahora))! };
  };

  it("sin descuentos: sin porcentaje ni precio con descuento", async () => {
    const { consultar } = await descuentoDe("Sin descuento", T0);

    expect(await consultar()).toMatchObject({ porcentajeVigente: null, precioConDescuento: null });
  });

  it("descuento permanente (sin fechas): siempre vigente, con el precio con descuento calculado", async () => {
    const { producto, consultar } = await descuentoDe("Permanente", T0, { precio: 200 });
    await descuento(15, null, null, [producto.id]);

    expect(await consultar()).toMatchObject({ porcentajeVigente: 15, precioConDescuento: 170 });
  });

  it("descuento programado (aún no empieza): no se aplica, y se activa solo al llegar la fecha", async () => {
    const producto = await nuevoProducto("Programado");
    await descuento(30, enDias(10), enDias(40), [producto.id]);

    expect((await repositorio.buscarPorId(producto.id, T0))?.porcentajeVigente).toBeNull();
    expect((await repositorio.buscarPorId(producto.id, enDias(10)))?.porcentajeVigente).toBe(30);
    expect((await repositorio.buscarPorId(producto.id, enDias(20)))?.precioConDescuento).toBe(70);
  });

  it("descuento vencido (ya caducó): no se aplica", async () => {
    const producto = await nuevoProducto("Vencido");
    await descuento(30, enDias(-40), enDias(-10), [producto.id]);

    expect((await repositorio.buscarPorId(producto.id, T0))?.porcentajeVigente).toBeNull();
  });

  it("los extremos cuentan: en el instante exacto de inicio y de fin todavía es vigente; un milisegundo fuera, no", async () => {
    const producto = await nuevoProducto("Bordes");
    await descuento(10, enMin(0), enMin(60), [producto.id]);
    const en = async (ahora: Date) => (await repositorio.buscarPorId(producto.id, ahora))?.porcentajeVigente;

    expect(await en(new Date(enMin(0).getTime() - 1))).toBeNull();
    expect(await en(enMin(0))).toBe(10);
    expect(await en(enMin(60))).toBe(10);
    expect(await en(new Date(enMin(60).getTime() + 1))).toBeNull();
  });

  it("solo fecha_inicio pasada o solo fecha_fin futura: vigente", async () => {
    const soloInicio = await nuevoProducto("Solo inicio");
    const soloFin = await nuevoProducto("Solo fin");
    await descuento(10, enDias(-1), null, [soloInicio.id]);
    await descuento(20, null, enDias(1), [soloFin.id]);

    expect((await repositorio.buscarPorId(soloInicio.id, T0))?.porcentajeVigente).toBe(10);
    expect((await repositorio.buscarPorId(soloFin.id, T0))?.porcentajeVigente).toBe(20);
  });

  it("varios descuentos vigentes a la vez: gana el de mayor porcentaje, no se acumulan, y hay una sola fila por producto", async () => {
    const producto = await nuevoProducto("Simultáneos", { precio: 100 });
    await descuento(10, null, null, [producto.id]);
    await descuento(25, null, null, [producto.id]);
    await descuento(15, enDias(-1), enDias(1), [producto.id]);
    await descuento(90, enDias(5), enDias(9), [producto.id]); // programado: no cuenta
    await descuento(80, enDias(-9), enDias(-5), [producto.id]); // vencido: no cuenta

    const filas = (await repositorio.listarPorPerfil(ids.perfilA, T0, { pagina: 1, limite: 50 })).datos.filter((p) => p.id === producto.id);

    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ porcentajeVigente: 25, precioConDescuento: 75 });
  });

  it("redondea el precio con descuento a 2 decimales", async () => {
    const producto = await nuevoProducto("Redondeo", { precio: 10 });
    await descuento(33.33, null, null, [producto.id]);

    expect((await repositorio.buscarPorId(producto.id, T0))?.precioConDescuento).toBe(6.67);
  });

  it("producto sin precio con descuento vigente: hay porcentaje pero no precio con descuento", async () => {
    const producto = await nuevoProducto("Sin precio con descuento", { precio: null });
    await descuento(20, null, null, [producto.id]);

    expect(await repositorio.buscarPorId(producto.id, T0)).toMatchObject({ precio: null, porcentajeVigente: 20, precioConDescuento: null });
  });

  it("mostrar_precio en falso: la base conserva el precio real y el descuento (la API pública los oculta)", async () => {
    const producto = await nuevoProducto("Oculto", { precio: 100, mostrarPrecio: false });
    await descuento(10, null, null, [producto.id]);

    expect(await repositorio.buscarPorId(producto.id, T0)).toMatchObject({ precio: 100, mostrarPrecio: false, porcentajeVigente: 10, precioConDescuento: 90 });
  });

  it("un descuento asignado a otro producto no afecta a este", async () => {
    const con = await nuevoProducto("Con");
    const sin = await nuevoProducto("Sin");
    await descuento(40, null, null, [con.id]);

    expect((await repositorio.buscarPorId(sin.id, T0))?.porcentajeVigente).toBeNull();
  });
});

describe("MySqlProductoRepository: listados", () => {
  beforeAll(async () => {
    // Un conjunto propio para los listados, con nombres distintivos y fechas separadas.
    await nuevoProducto("Lista torta", { ahora: enMin(100), descripcion: "de chocolate" });
    await nuevoProducto("Lista 100% natural", { ahora: enMin(101), perfilId: ids.perfilB });
    const inactivo = await nuevoProducto("Lista inactivo", { ahora: enMin(102) });
    await repositorio.actualizar(inactivo.id, { activo: false }, enMin(103));
    await nuevoProducto("Lista de cuenta desactivada", { ahora: enMin(104), perfilId: ids.perfilInactivo });
  });

  const feed = (filtros: Parameters<typeof repositorio.listarMarketplace>[1], pagina = { pagina: 1, limite: 50 }) =>
    repositorio.listarMarketplace(T0, { q: "Lista", ...filtros }, pagina);

  it("el feed solo trae productos activos de cuentas activas, los más recientes primero", async () => {
    const { datos, total } = await feed({});

    expect(datos.map((p) => p.nombre)).toEqual([`${prefijo} Lista 100% natural`, `${prefijo} Lista torta`]);
    expect(total).toBe(2);
  });

  it("filtra por perfil, ciudad y rubro", async () => {
    expect((await feed({ perfilId: ids.perfilB })).datos).toHaveLength(1);
    expect((await feed({ ciudadId: ids.ciudadA })).datos.map((p) => p.perfilId)).toEqual([ids.perfilA]);
    expect((await feed({ rubroId: ids.rubroB })).datos.map((p) => p.perfilId)).toEqual([ids.perfilB]);
    expect((await feed({ ciudadId: ids.ciudadA, rubroId: ids.rubroB })).datos).toEqual([]);
  });

  it("busca por texto en el nombre y en la descripción, sin distinguir mayúsculas", async () => {
    expect((await feed({ q: "CHOCOLATE" })).datos.map((p) => p.nombre)).toEqual([`${prefijo} Lista torta`]);
  });

  it("un % o _ escrito por el usuario se busca tal cual, no como comodín", async () => {
    expect((await feed({ q: "100%" })).datos).toHaveLength(1);
    expect((await feed({ q: "1_0%" })).datos).toEqual([]);
  });

  it("pagina con un total estable", async () => {
    const pagina1 = await feed({}, { pagina: 1, limite: 1 });
    const pagina2 = await feed({}, { pagina: 2, limite: 1 });

    expect(pagina1.total).toBe(2);
    expect(pagina2.total).toBe(2);
    expect(pagina1.datos[0].id).not.toBe(pagina2.datos[0].id);
  });

  it("listarPorPerfil incluye los productos inactivos (\"mis productos\") y no los de otros perfiles", async () => {
    const { datos } = await repositorio.listarPorPerfil(ids.perfilA, T0, { pagina: 1, limite: 50 });

    expect(datos.some((p) => p.nombre.endsWith("Lista inactivo"))).toBe(true);
    expect(datos.every((p) => p.perfilId === ids.perfilA)).toBe(true);
  });

  it("el feed trae el descuento vigente de cada producto listado", async () => {
    const { datos } = await feed({ perfilId: ids.perfilA });
    await descuento(20, null, null, [datos[0].id]);

    const { datos: despues } = await feed({ perfilId: ids.perfilA });

    expect(despues[0]).toMatchObject({ porcentajeVigente: 20, precioConDescuento: 80 });
  });
});

describe("MySqlProductoRepository: solo con descuento (regla 21)", () => {
  const conDescuento = (pagina = { pagina: 1, limite: 100 }) => repositorio.listarMarketplace(T0, { perfilId: ids.perfilA, conDescuento: true }, pagina);

  it("solo trae los productos con un descuento vigente ahora (también con el precio oculto o ausente), y el total cuenta lo mismo", async () => {
    const vigente = await nuevoProducto("Dto vigente", { precio: 100 });
    const programado = await nuevoProducto("Dto programado");
    const vencido = await nuevoProducto("Dto vencido");
    const sinPrecio = await nuevoProducto("Dto sin precio", { precio: null });
    const precioOculto = await nuevoProducto("Dto precio oculto", { mostrarPrecio: false });
    const inactivo = await nuevoProducto("Dto inactivo");
    await repositorio.actualizar(inactivo.id, { activo: false }, T0);
    const sinDescuento = await nuevoProducto("Sin descuento");
    await descuento(10, null, null, [vigente.id, sinPrecio.id, precioOculto.id, inactivo.id]);
    await descuento(20, enDias(10), enDias(20), [programado.id]);
    await descuento(30, enDias(-20), enDias(-10), [vencido.id]);

    const { datos, total } = await conDescuento();
    const idsDevueltos = datos.map((p) => p.id);

    for (const dentro of [vigente, sinPrecio, precioOculto]) expect(idsDevueltos).toContain(dentro.id);
    for (const fuera of [programado, vencido, inactivo, sinDescuento]) expect(idsDevueltos).not.toContain(fuera.id);
    expect(datos.every((p) => p.porcentajeVigente !== null)).toBe(true);
    expect(total).toBe(datos.length);
  });

  it("al llegar la fecha de inicio, el producto programado entra solo; al pasar la de fin, sale", async () => {
    const programado = await nuevoProducto("Dto entra y sale");
    await descuento(25, enDias(5), enDias(6), [programado.id]);
    const en = async (ahora: Date) =>
      (await repositorio.listarMarketplace(ahora, { perfilId: ids.perfilA, conDescuento: true }, { pagina: 1, limite: 100 })).datos.map((p) => p.id);

    expect(await en(enDias(1))).not.toContain(programado.id);
    expect(await en(enDias(5))).toContain(programado.id);
    expect(await en(enDias(7))).not.toContain(programado.id);
  });

  it("pagina con un total estable, igual al de todos los que cumplen", async () => {
    const todos = await conDescuento();
    const pagina1 = await conDescuento({ pagina: 1, limite: 1 });
    const pagina2 = await conDescuento({ pagina: 2, limite: 1 });

    expect(pagina1.total).toBe(todos.total);
    expect(pagina2.total).toBe(todos.total);
    expect(pagina1.datos).toHaveLength(1);
    expect(pagina1.datos[0].id).not.toBe(pagina2.datos[0].id);
  });

  it("se combina con la ciudad y el rubro con AND", async () => {
    expect((await repositorio.listarMarketplace(T0, { perfilId: ids.perfilA, ciudadId: ids.ciudadB, conDescuento: true }, { pagina: 1, limite: 10 })).total).toBe(0);
  });
});

describe("MySqlProductoRepository: búsqueda de productos (regla 21)", () => {
  const usecase = new GetMarketplaceUseCase(repositorio, new FakeClock(T0));
  const ids2: Record<string, string> = {};

  beforeAll(async () => {
    ids2.zumo = (await nuevoProducto("Zumo de maracuyá", { ahora: enMin(200), descripcion: "Jugo natural prensado en frío" })).id;
    ids2.mermelada = (await nuevoProducto("Mermelada de frutilla", { ahora: enMin(201), perfilId: ids.perfilB, descripcion: "x".repeat(MAXIMO_DE_CARACTERES_DE_DESCRIPCION + 100) })).id;
    // El negocio B se renombra con una palabra que solo él tiene: "Negocio B" no sirve para distinguirlo, porque una
    // letra suelta también está en el prefijo aleatorio de la prueba.
    await cliente.ejecutar("UPDATE perfiles_emprendedores SET nombre_negocio = ? WHERE id = ?", [`${prefijo} Frutería Chacaltaya`, ids.perfilB]);
    const escondido = await nuevoProducto("Zumo escondido", { ahora: enMin(202) });
    await repositorio.actualizar(escondido.id, { activo: false }, enMin(203));
    await nuevoProducto("Zumo de cuenta desactivada", { ahora: enMin(204), perfilId: ids.perfilInactivo });
  });

  const buscar = async (q: string, filtros: { ciudadId?: string; rubroId?: string; perfilId?: string } = {}) => {
    const resultado = await usecase.ejecutar({ ...filtros, q }, { pagina: 1, limite: 50 });
    return { nombres: resultado.datos.map((p) => p.nombre.replace(`${prefijo} `, "")), similares: resultado.similares, total: resultado.total };
  };

  it("busca también en el nombre del negocio al que pertenece el producto", async () => {
    expect(await buscar(`${prefijo} chacaltaya mermelada`)).toEqual({ nombres: ["Mermelada de frutilla"], similares: false, total: 1 });
    expect(await buscar(`${prefijo} chacaltaya zumo`)).toEqual({ nombres: [], similares: false, total: 0 });
  });

  it("no busca en el nombre de la emprendedora", async () => {
    expect(await buscar(`${prefijo} flores`)).toEqual({ nombres: [], similares: false, total: 0 });
  });

  it("con una coincidencia exacta no muestra parecidos, y no distingue acentos", async () => {
    expect(await buscar(`${prefijo} maracuya`)).toEqual({ nombres: ["Zumo de maracuyá"], similares: false, total: 1 });
  });

  it("sin coincidencia exacta devuelve el producto parecido y lo marca", async () => {
    expect(await buscar(`${prefijo} maracuia`)).toEqual({ nombres: ["Zumo de maracuyá"], similares: true, total: 1 });
    expect(await buscar(`${prefijo} chacaltaya frutila`)).toEqual({ nombres: ["Mermelada de frutilla"], similares: true, total: 1 });
    expect(await buscar(`${prefijo} chacalaya mermelada`)).toEqual({ nombres: ["Mermelada de frutilla"], similares: true, total: 1 });
  });

  it("un producto oculto o de una cuenta desactivada no aparece, ni como parecido", async () => {
    expect((await buscar(`${prefijo} escondidoo`)).nombres).toEqual([]);
    expect((await buscar(`${prefijo} desactivda`)).nombres).toEqual([]);
  });

  it("los parecidos también se combinan con la ciudad, el rubro y el perfil con AND", async () => {
    expect((await buscar(`${prefijo} maracuia`, { ciudadId: ids.ciudadA })).similares).toBe(true);
    expect(await buscar(`${prefijo} maracuia`, { ciudadId: ids.ciudadB })).toEqual({ nombres: [], similares: false, total: 0 });
    expect((await buscar(`${prefijo} maracuia`, { rubroId: ids.rubroB })).nombres).toEqual([]);
    expect((await buscar(`${prefijo} maracuia`, { perfilId: ids.perfilB })).nombres).toEqual([]);
  });

  it("los parecidos llevan el descuento vigente y el precio con descuento", async () => {
    await descuento(20, null, null, [ids2.zumo]);

    const { datos, similares } = await usecase.ejecutar({ q: `${prefijo} maracuia` }, { pagina: 1, limite: 50 });

    expect(similares).toBe(true);
    expect(datos[0]).toMatchObject({ porcentajeVigente: 20, precioConDescuento: 80 });
  });

  it("textosBuscables entrega los productos activos de cuentas activas con el nombre de su negocio y solo el comienzo de la descripción", async () => {
    const textos = (await repositorio.textosBuscables({})).filter((t) => t.nombre.startsWith(prefijo));

    expect(textos.find((t) => t.productoId === ids2.zumo)).toMatchObject({ nombreNegocio: `${prefijo} Negocio A`, descripcion: "Jugo natural prensado en frío" });
    expect(textos.find((t) => t.productoId === ids2.mermelada)?.descripcion).toHaveLength(MAXIMO_DE_CARACTERES_DE_DESCRIPCION);
    expect(textos.some((t) => t.nombre.endsWith("Zumo escondido") || t.nombre.endsWith("cuenta desactivada"))).toBe(false);
  });

  it("textosBuscables respeta el perfil, la ciudad y el rubro", async () => {
    const mios = async (filtros: Parameters<typeof repositorio.textosBuscables>[0]) =>
      (await repositorio.textosBuscables(filtros)).filter((t) => t.nombre.startsWith(prefijo)).map((t) => t.productoId);

    expect(await mios({ perfilId: ids.perfilB })).toContain(ids2.mermelada);
    expect(await mios({ perfilId: ids.perfilB })).not.toContain(ids2.zumo);
    expect(await mios({ ciudadId: ids.ciudadB })).not.toContain(ids2.zumo);
    expect(await mios({ rubroId: ids.rubroA })).toContain(ids2.zumo);
    expect(await mios({ ciudadId: ids.ciudadB, rubroId: ids.rubroA })).toEqual([]);
  });

  it("listarMarketplacePorIds respeta el orden dado y omite los inactivos, las cuentas desactivadas y los ids que no existen", async () => {
    const oculto = (await repositorio.listarPorPerfil(ids.perfilA, T0, { pagina: 1, limite: 100 })).datos.find((p) => p.nombre.endsWith("Zumo escondido"))!;

    const lista = await repositorio.listarMarketplacePorIds(T0, [ids2.mermelada, oculto.id, randomUUID(), ids2.zumo]);

    expect(lista.map((p) => p.id)).toEqual([ids2.mermelada, ids2.zumo]);
    expect(await repositorio.listarMarketplacePorIds(T0, [])).toEqual([]);
  });
});
