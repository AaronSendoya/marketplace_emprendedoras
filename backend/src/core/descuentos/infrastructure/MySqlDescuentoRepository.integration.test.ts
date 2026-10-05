import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MySqlProductoRepository } from "@/core/productos/infrastructure/MySqlProductoRepository";
import { ErrorValidacion } from "@/shared/domain/errors";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { MySqlDescuentoRepository } from "./MySqlDescuentoRepository";

const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlDescuentoRepository(cliente);
const productos = new MySqlProductoRepository(cliente);
const prefijo = `desc-${randomUUID().slice(0, 8)}`;
const ids = { rol: randomUUID(), ciudad: randomUUID(), rubro: randomUUID(), usuario: randomUUID(), otroUsuario: randomUUID(), perfil: randomUUID(), otroPerfil: randomUUID() };
const T0 = new Date("2026-09-23T12:00:00.000Z");
const enMin = (minutos: number) => new Date(T0.getTime() + minutos * 60_000);

const nuevo = (parches: Partial<Parameters<typeof repositorio.crear>[0]> = {}) => ({
  perfilId: ids.perfil,
  porcentaje: 15,
  fechaInicio: null,
  fechaFin: null,
  ahora: T0,
  ...parches,
});

const nuevoProducto = (nombre: string, perfilId = ids.perfil) =>
  productos.crear({ perfilId, nombre: `${prefijo} ${nombre}`, descripcion: null, precio: 10, mostrarPrecio: true, imagenKey: "productos/p.webp", ahora: T0 });

beforeAll(async () => {
  await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [ids.rol, `${prefijo}-rol`]);
  await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [ids.ciudad, `${prefijo} Ciudad`]);
  await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [ids.rubro, `${prefijo} Rubro`]);
  for (const [usuarioId, perfilId, clave] of [[ids.usuario, ids.perfil, "uno"], [ids.otroUsuario, ids.otroPerfil, "dos"]]) {
    await cliente.ejecutar("INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'María', 'Flores', 'hash', ?)", [
      usuarioId,
      `${prefijo}-${clave}@prueba.test`,
      ids.rol,
    ]);
    await cliente.ejecutar(
      `INSERT INTO perfiles_emprendedores (id, usuario_id, nombre_negocio, descripcion, whatsapp, ciudad_id, rubro_id, foto_perfil_key, logo_key)
       VALUES (?, ?, ?, 'd', '59171234567', ?, ?, 'perfiles/f.webp', 'logos/l.webp')`,
      [perfilId, usuarioId, `${prefijo} Negocio ${clave}`, ids.ciudad, ids.rubro],
    );
  }
});

afterAll(async () => {
  await cliente.ejecutar("DELETE FROM perfiles_emprendedores WHERE nombre_negocio LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM usuarios WHERE email LIKE ?", [`${prefijo}-%`]);
  await cliente.ejecutar("DELETE FROM ciudades WHERE id = ?", [ids.ciudad]);
  await cliente.ejecutar("DELETE FROM rubros WHERE id = ?", [ids.rubro]);
  await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [ids.rol]);
  await cliente.cerrar();
});

describe("MySqlDescuentoRepository", () => {
  it("crear guarda el descuento y lo devuelve con el DECIMAL como número, fechas y dueña del perfil", async () => {
    const descuento = await repositorio.crear(nuevo({ porcentaje: 33.33, fechaInicio: enMin(10), fechaFin: enMin(70) }));

    expect(descuento).toMatchObject({
      perfilId: ids.perfil,
      perfilUsuarioId: ids.usuario,
      porcentaje: 33.33,
      fechaInicio: enMin(10),
      fechaFin: enMin(70),
      creadoEn: T0,
      productoIds: [],
    });
    expect(descuento.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("las fechas son opcionales e independientes: se guardan como NULL", async () => {
    expect(await repositorio.crear(nuevo())).toMatchObject({ fechaInicio: null, fechaFin: null });
    expect(await repositorio.crear(nuevo({ fechaFin: enMin(5) }))).toMatchObject({ fechaInicio: null, fechaFin: enMin(5) });
  });

  it("la base rechaza un porcentaje fuera de rango y un rango de fechas invertido (CHECK)", async () => {
    await expect(repositorio.crear(nuevo({ porcentaje: 0 }))).rejects.toThrow();
    await expect(repositorio.crear(nuevo({ porcentaje: 100.01 }))).rejects.toThrow();
    await expect(repositorio.crear(nuevo({ fechaInicio: enMin(10), fechaFin: enMin(5) }))).rejects.toThrow();
    await expect(repositorio.crear(nuevo({ fechaInicio: enMin(10), fechaFin: enMin(10) }))).rejects.toThrow();
  });

  it("un perfil inexistente da error de validación con el campo", async () => {
    await expect(repositorio.crear(nuevo({ perfilId: randomUUID() }))).rejects.toMatchObject({ detalles: [{ campo: "perfil_id" }] });
    await expect(repositorio.crear(nuevo({ perfilId: randomUUID() }))).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("buscarPorId devuelve el descuento o null", async () => {
    const creado = await repositorio.crear(nuevo());

    expect(await repositorio.buscarPorId(creado.id)).toEqual(creado);
    expect(await repositorio.buscarPorId(randomUUID())).toBeNull();
  });

  it("actualizar cambia solo lo indicado; null quita una fecha", async () => {
    const creado = await repositorio.crear(nuevo({ porcentaje: 10, fechaInicio: enMin(10), fechaFin: enMin(70) }));

    await repositorio.actualizar(creado.id, { porcentaje: 25 });
    expect(await repositorio.buscarPorId(creado.id)).toMatchObject({ porcentaje: 25, fechaInicio: enMin(10), fechaFin: enMin(70) });

    await repositorio.actualizar(creado.id, { fechaFin: null });
    expect(await repositorio.buscarPorId(creado.id)).toMatchObject({ porcentaje: 25, fechaInicio: enMin(10), fechaFin: null });

    await expect(repositorio.actualizar(creado.id, {})).resolves.toBeUndefined();
  });

  describe("asignación a productos", () => {
    it("asignar guarda los productos y es idempotente (repetir no falla ni duplica)", async () => {
      const descuento = await repositorio.crear(nuevo());
      const a = await nuevoProducto("A");
      const b = await nuevoProducto("B");

      await repositorio.asignar(descuento.id, [a.id, b.id]);
      await repositorio.asignar(descuento.id, [a.id]);

      expect((await repositorio.buscarPorId(descuento.id))?.productoIds.sort()).toEqual([a.id, b.id].sort());
    });

    it("un producto puede tener varios descuentos y un descuento varios productos (N:M)", async () => {
      const uno = await repositorio.crear(nuevo({ porcentaje: 10 }));
      const dos = await repositorio.crear(nuevo({ porcentaje: 20 }));
      const producto = await nuevoProducto("N:M");

      await repositorio.asignar(uno.id, [producto.id]);
      await repositorio.asignar(dos.id, [producto.id]);

      expect((await repositorio.buscarPorId(uno.id))?.productoIds).toEqual([producto.id]);
      expect((await repositorio.buscarPorId(dos.id))?.productoIds).toEqual([producto.id]);
    });

    it("asignar un producto inexistente falla con un error de validación (no lo absorbe el ON DUPLICATE KEY)", async () => {
      const descuento = await repositorio.crear(nuevo());

      await expect(repositorio.asignar(descuento.id, [randomUUID()])).rejects.toBeInstanceOf(ErrorValidacion);
    });

    it("quitar borra solo la asignación, no el descuento ni el producto, y es idempotente", async () => {
      const descuento = await repositorio.crear(nuevo());
      const a = await nuevoProducto("Q1");
      const b = await nuevoProducto("Q2");
      await repositorio.asignar(descuento.id, [a.id, b.id]);

      await repositorio.quitar(descuento.id, a.id);
      await repositorio.quitar(descuento.id, a.id);

      expect((await repositorio.buscarPorId(descuento.id))?.productoIds).toEqual([b.id]);
      expect(await productos.buscarPorId(a.id, T0)).not.toBeNull();
    });

    it("al borrar el producto, su asignación desaparece en cascada", async () => {
      const descuento = await repositorio.crear(nuevo());
      const producto = await nuevoProducto("Cascada");
      await repositorio.asignar(descuento.id, [producto.id]);

      await cliente.ejecutar("DELETE FROM productos WHERE id = ?", [producto.id]);

      expect((await repositorio.buscarPorId(descuento.id))?.productoIds).toEqual([]);
    });
  });

  describe("listarPorPerfil", () => {
    it("lista los del perfil, los más recientes primero, con sus productos, sin mezclar perfiles y con total estable", async () => {
      const antiguo = await repositorio.crear(nuevo({ perfilId: ids.otroPerfil, ahora: enMin(-500), porcentaje: 5 }));
      const reciente = await repositorio.crear(nuevo({ perfilId: ids.otroPerfil, ahora: enMin(-400), porcentaje: 6 }));
      const producto = await nuevoProducto("Lista", ids.otroPerfil);
      await repositorio.asignar(reciente.id, [producto.id]);

      const pagina1 = await repositorio.listarPorPerfil(ids.otroPerfil, { pagina: 1, limite: 1 });
      const pagina2 = await repositorio.listarPorPerfil(ids.otroPerfil, { pagina: 2, limite: 1 });

      expect(pagina1.total).toBe(2);
      expect(pagina2.total).toBe(2);
      expect(pagina1.datos[0]).toMatchObject({ id: reciente.id, productoIds: [producto.id] });
      expect(pagina2.datos[0]).toMatchObject({ id: antiguo.id, productoIds: [] });
    });

    it("un perfil sin descuentos devuelve una lista vacía", async () => {
      expect(await repositorio.listarPorPerfil(randomUUID(), { pagina: 1, limite: 20 })).toEqual({ datos: [], total: 0 });
    });

    describe("filtro por estado (regla 8)", () => {
      // Perfil propio: los totales de los demás tests de este archivo no se alteran.
      const dueno = randomUUID();
      const perfil = randomUUID();
      const ahora = enMin(0);
      let porNombre: Record<string, string>;

      beforeAll(async () => {
        await cliente.ejecutar("INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'María', 'Flores', 'hash', ?)", [
          dueno,
          `${prefijo}-filtro@prueba.test`,
          ids.rol,
        ]);
        await cliente.ejecutar(
          `INSERT INTO perfiles_emprendedores (id, usuario_id, nombre_negocio, descripcion, whatsapp, ciudad_id, rubro_id, foto_perfil_key, logo_key)
           VALUES (?, ?, ?, 'd', '59171234567', ?, ?, 'perfiles/f.webp', 'logos/l.webp')`,
          [perfil, dueno, `${prefijo} Negocio filtro`, ids.ciudad, ids.rubro],
        );
        const casos: Record<string, { fechaInicio: Date | null; fechaFin: Date | null }> = {
          sinFechas: { fechaInicio: null, fechaFin: null }, // vigente: permanente
          empezoYSinFin: { fechaInicio: enMin(-60), fechaFin: null }, // vigente
          dentroDelRango: { fechaInicio: enMin(-60), fechaFin: enMin(60) }, // vigente
          terminaJusto: { fechaInicio: null, fechaFin: enMin(0) }, // vigente: el último instante de fin todavía cuenta
          empiezaJusto: { fechaInicio: enMin(0), fechaFin: null }, // vigente: ya empezó
          futuro: { fechaInicio: enMin(1), fechaFin: enMin(100) }, // programado
          futuroSinFin: { fechaInicio: enMin(1), fechaFin: null }, // programado
          caducoHaceUnMinuto: { fechaInicio: null, fechaFin: enMin(-1) }, // vencido
          caduco: { fechaInicio: enMin(-120), fechaFin: enMin(-60) }, // vencido
        };
        porNombre = {};
        for (const [nombre, fechas] of Object.entries(casos)) {
          porNombre[nombre] = (await repositorio.crear(nuevo({ perfilId: perfil, ...fechas }))).id;
        }
      });

      const idsDe = async (estado?: "programado" | "vigente" | "vencido") => {
        const { datos, total } = await repositorio.listarPorPerfil(perfil, { pagina: 1, limite: 50 }, estado ? { estado, ahora } : undefined);
        return { ids: new Set(datos.map((d) => d.id)), total };
      };
      const nombres = (conjunto: Set<string>) => Object.keys(porNombre).filter((n) => conjunto.has(porNombre[n])).sort();

      it("vigente: ya empezó (o no tiene inicio) y aún no caducó; el último instante de fin todavía cuenta", async () => {
        const { ids: encontrados, total } = await idsDe("vigente");

        expect(nombres(encontrados)).toEqual(["dentroDelRango", "empezoYSinFin", "empiezaJusto", "sinFechas", "terminaJusto"]);
        expect(total).toBe(5);
      });

      it("programado: tiene inicio y todavía es futuro", async () => {
        const { ids: encontrados, total } = await idsDe("programado");

        expect(nombres(encontrados)).toEqual(["futuro", "futuroSinFin"]);
        expect(total).toBe(2);
      });

      it("vencido: tiene fin y ya pasó", async () => {
        const { ids: encontrados, total } = await idsDe("vencido");

        expect(nombres(encontrados)).toEqual(["caduco", "caducoHaceUnMinuto"]);
        expect(total).toBe(2);
      });

      it("los tres estados reparten todos los descuentos sin repetir ninguno; sin filtro, todos", async () => {
        const [vigentes, programados, vencidos, todos] = await Promise.all([idsDe("vigente"), idsDe("programado"), idsDe("vencido"), idsDe()]);

        expect(vigentes.total + programados.total + vencidos.total).toBe(todos.total);
        expect(todos.total).toBe(Object.keys(porNombre).length);
      });

      it("el total y la paginación cuentan solo los del estado filtrado", async () => {
        const pagina1 = await repositorio.listarPorPerfil(perfil, { pagina: 1, limite: 2 }, { estado: "vigente", ahora });
        const pagina3 = await repositorio.listarPorPerfil(perfil, { pagina: 3, limite: 2 }, { estado: "vigente", ahora });

        expect(pagina1.total).toBe(5);
        expect(pagina1.datos).toHaveLength(2);
        expect(pagina3.datos).toHaveLength(1); // 5 vigentes en páginas de 2: 2 + 2 + 1
      });

      it("coincide con el estado que calcula el dominio para cada descuento", async () => {
        const { estadoDescuento } = await import("../domain/VigenciaDescuento");
        const { datos } = await repositorio.listarPorPerfil(perfil, { pagina: 1, limite: 50 });
        for (const estado of ["programado", "vigente", "vencido"] as const) {
          const esperados = datos.filter((d) => estadoDescuento({ inicio: d.fechaInicio, fin: d.fechaFin }, ahora) === estado).map((d) => d.id);
          const { ids: delSql } = await idsDe(estado);
          expect([...delSql].sort()).toEqual([...esperados].sort());
        }
      });
    });
  });
});
