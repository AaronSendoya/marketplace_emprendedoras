import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorConflicto } from "@/shared/domain/errors";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { MySqlUsuarioRepository } from "./MySqlUsuarioRepository";

const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlUsuarioRepository(cliente);
const prefijo = `usuario-${randomUUID().slice(0, 8)}`;
const email = `${prefijo}@prueba.test`;
const rolId = randomUUID();
const usuarioId = randomUUID();

beforeAll(async () => {
  await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [rolId, `${prefijo}-rol`]);
  await cliente.ejecutar(
    `INSERT INTO usuarios (id, email, nombres, apellido_paterno, apellido_materno, password_hash, rol_id, token_version)
     VALUES (?, ?, 'Nombre', 'Apellido', NULL, 'hash-x', ?, 3)`,
    [usuarioId, email, rolId],
  );
});

afterAll(async () => {
  await cliente.ejecutar("DELETE FROM usuarios WHERE id = ?", [usuarioId]);
  await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [rolId]);
  await cliente.cerrar();
});

describe("MySqlUsuarioRepository", () => {
  it("buscarPorEmail devuelve el usuario con el rol, sin apellido materno y con token_version", async () => {
    const usuario = await repositorio.buscarPorEmail(email);

    expect(usuario).toMatchObject({
      id: usuarioId,
      email,
      nombres: "Nombre",
      apellidoPaterno: "Apellido",
      apellidoMaterno: null,
      passwordHash: "hash-x",
      rol: `${prefijo}-rol`,
      activo: true,
      emailVerificadoEn: null,
      tokenVersion: 3,
    });
    expect(usuario!.creadoEn).toBeInstanceOf(Date);
  });

  it("buscarPorId devuelve el mismo usuario", async () => {
    const usuario = await repositorio.buscarPorId(usuarioId);

    expect(usuario?.email).toBe(email);
  });

  it("con un correo o id inexistente devuelve null", async () => {
    expect(await repositorio.buscarPorEmail("no-existe@prueba.test")).toBeNull();
    expect(await repositorio.buscarPorId(randomUUID())).toBeNull();
  });
});

describe("MySqlUsuarioRepository (escritura)", () => {
  const otroId = randomUUID();
  const otroEmail = `${prefijo}-otro@prueba.test`;
  const ahora = new Date("2026-09-23T12:00:00.000Z");

  beforeAll(async () => {
    await cliente.ejecutar(
      `INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id)
       VALUES (?, ?, 'Otro', 'Usuario', 'hash-otro', ?)`,
      [otroId, otroEmail, rolId],
    );
  });

  afterAll(async () => {
    await cliente.ejecutar("DELETE FROM usuarios WHERE id = ?", [otroId]);
  });

  it("restablecerPassword guarda el hash, suma 1 a token_version y verifica el correo si no lo estaba", async () => {
    await repositorio.restablecerPassword(usuarioId, "hash-nuevo", ahora);

    expect(await repositorio.buscarPorId(usuarioId)).toMatchObject({
      passwordHash: "hash-nuevo",
      tokenVersion: 4,
      emailVerificadoEn: ahora,
    });
  });

  it("restablecerPassword conserva la fecha de verificación si ya existía", async () => {
    await repositorio.restablecerPassword(usuarioId, "hash-otra-vez", new Date("2027-01-01T00:00:00.000Z"));

    expect(await repositorio.buscarPorId(usuarioId)).toMatchObject({ tokenVersion: 5, emailVerificadoEn: ahora });
  });

  it("restablecerPassword solo toca la cuenta indicada", async () => {
    expect(await repositorio.buscarPorId(otroId)).toMatchObject({ passwordHash: "hash-otro", tokenVersion: 0, emailVerificadoEn: null });
  });

  it("cambiarEmail guarda el correo nuevo y lo deja verificado", async () => {
    const nuevo = `${prefijo}-nuevo@prueba.test`;

    await repositorio.cambiarEmail(otroId, nuevo, ahora);

    expect(await repositorio.buscarPorEmail(nuevo)).toMatchObject({ id: otroId, emailVerificadoEn: ahora });
    expect(await repositorio.buscarPorEmail(otroEmail)).toBeNull();
  });

  it("cambiarEmail a un correo que ya tiene otra cuenta da conflicto", async () => {
    await expect(repositorio.cambiarEmail(otroId, email, ahora)).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("cambiarEstado desactiva y reactiva solo la cuenta indicada", async () => {
    await repositorio.cambiarEstado(otroId, false);
    expect((await repositorio.buscarPorId(otroId))?.activo).toBe(false);
    expect((await repositorio.buscarPorId(usuarioId))?.activo).toBe(true);

    await repositorio.cambiarEstado(otroId, true);
    expect((await repositorio.buscarPorId(otroId))?.activo).toBe(true);
  });

  it("actualizar solo toca las columnas presentes", async () => {
    await repositorio.actualizar(otroId, { nombres: "Otro Editado" });

    expect(await repositorio.buscarPorId(otroId)).toMatchObject({ nombres: "Otro Editado", apellidoPaterno: "Usuario" });
  });

  it("actualizar con un cuerpo vacío no ejecuta ningún UPDATE", async () => {
    const antes = await repositorio.buscarPorId(otroId);

    await repositorio.actualizar(otroId, {});

    expect(await repositorio.buscarPorId(otroId)).toEqual(antes);
  });

  it("actualizar null en apellido_materno lo quita", async () => {
    await repositorio.actualizar(otroId, { apellidoMaterno: null });

    expect((await repositorio.buscarPorId(otroId))?.apellidoMaterno).toBeNull();
  });

  it("actualizar con un correo que ya tiene otra cuenta da conflicto", async () => {
    await expect(repositorio.actualizar(otroId, { email })).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("actualizar con email_verificado_en nulo deja el correo sin verificar", async () => {
    const nuevo = `${prefijo}-editado@prueba.test`;

    await repositorio.actualizar(otroId, { email: nuevo, emailVerificadoEn: null });

    expect(await repositorio.buscarPorId(otroId)).toMatchObject({ email: nuevo, emailVerificadoEn: null });
  });

  it("cambiarPasswordAdmin guarda el hash y suma 1 a token_version, sin tocar email_verificado_en", async () => {
    const antes = await repositorio.buscarPorId(usuarioId);

    await repositorio.cambiarPasswordAdmin(usuarioId, "hash-por-admin");

    expect(await repositorio.buscarPorId(usuarioId)).toMatchObject({
      passwordHash: "hash-por-admin",
      tokenVersion: (antes?.tokenVersion ?? 0) + 1,
      emailVerificadoEn: antes?.emailVerificadoEn ?? null,
    });
  });
});

describe("MySqlUsuarioRepository (alta y listado)", () => {
  const ahora = new Date("2026-09-23T12:00:00.000Z");
  // Fechas lejanas para que estas cuentas salgan primero en el listado aunque haya otras en la base.
  const creadas: string[] = [];
  const datos = (sufijo: string, creadoEn: Date, parches: Partial<Parameters<MySqlUsuarioRepository["crear"]>[0]> = {}) => ({
    email: `${prefijo}-${sufijo}@prueba.test`,
    nombres: "María Elena",
    apellidoPaterno: "Flores",
    apellidoMaterno: "Choque",
    passwordHash: "hash-alta",
    rol: `${prefijo}-rol` as never, // un rol propio de la prueba, no uno de los del dominio
    emailVerificadoEn: ahora,
    creadoEn,
    ...parches,
  });

  afterAll(async () => {
    await cliente.ejecutar("DELETE FROM usuarios WHERE email LIKE ?", [`${prefijo}-%`]);
  });

  it("crear guarda la cuenta con el rol pedido, el correo verificado y devuelve el usuario completo", async () => {
    const usuario = await repositorio.crear(datos("alta", new Date("2099-01-02T00:00:00.000Z")));
    creadas.push(usuario.id);

    expect(usuario).toMatchObject({
      email: `${prefijo}-alta@prueba.test`,
      nombres: "María Elena",
      apellidoPaterno: "Flores",
      apellidoMaterno: "Choque",
      passwordHash: "hash-alta",
      rol: `${prefijo}-rol`,
      activo: true,
      emailVerificadoEn: ahora,
      tokenVersion: 0,
      creadoEn: new Date("2099-01-02T00:00:00.000Z"),
    });
    expect(usuario.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("crear sin apellido materno guarda NULL", async () => {
    const usuario = await repositorio.crear(datos("sin-materno", new Date("2099-01-01T00:00:00.000Z"), { apellidoMaterno: null }));
    creadas.push(usuario.id);

    expect(usuario.apellidoMaterno).toBeNull();
  });

  it("crear con un correo repetido da conflicto", async () => {
    await expect(repositorio.crear(datos("alta", ahora))).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("crear con un rol que no existe falla (falta sembrar los roles) y no deja nada", async () => {
    await expect(repositorio.crear(datos("sin-rol", ahora, { rol: "RolInexistente" as never }))).rejects.toThrow("no existe");

    expect(await repositorio.buscarPorEmail(`${prefijo}-sin-rol@prueba.test`)).toBeNull();
  });

  it("listar devuelve las más recientes primero, sin el hash, con el total y paginado", async () => {
    const pagina1 = await repositorio.listar({}, { pagina: 1, limite: 1 });
    const pagina2 = await repositorio.listar({}, { pagina: 2, limite: 1 });

    expect(pagina1.datos.map((u) => u.id)).toEqual([creadas[0]]);
    expect(pagina2.datos.map((u) => u.id)).toEqual([creadas[1]]);
    expect(pagina1.total).toBeGreaterThanOrEqual(2);
    expect(pagina1.datos[0]).not.toHaveProperty("passwordHash");
    expect(pagina1.datos[0]).toMatchObject({ rol: `${prefijo}-rol`, activo: true, tokenVersion: 0 });
  });

  it("listar más allá de la última página devuelve una lista vacía con el mismo total", async () => {
    const primera = await repositorio.listar({}, { pagina: 1, limite: 50 });
    const lejos = await repositorio.listar({}, { pagina: 9999, limite: 50 });

    expect(lejos.datos).toEqual([]);
    expect(lejos.total).toBe(primera.total);
  });

  it("busca por texto en nombres, apellidos y correo, sin distinguir mayúsculas (regla 5)", async () => {
    const porNombre = await repositorio.listar({ q: "maría elena" }, { pagina: 1, limite: 50 });
    const porCorreo = await repositorio.listar({ q: `${prefijo}-ALTA` }, { pagina: 1, limite: 50 });
    const sinCoincidencias = await repositorio.listar({ q: `${prefijo}-no-existe` }, { pagina: 1, limite: 50 });

    expect(porNombre.datos.map((u) => u.id).sort()).toEqual([...creadas].sort());
    expect(porCorreo.datos.map((u) => u.id)).toEqual([creadas[0]]);
    expect(sinCoincidencias.datos).toEqual([]);
  });

  it("un _ escrito en la búsqueda se toma tal cual, no como comodín de un carácter", async () => {
    // El correo real lleva un guion (`${prefijo}-alta@...`); sin escapar, `_` haría de comodín y
    // igual lo encontraría. Con el escape no hay coincidencia.
    expect((await repositorio.listar({ q: `${prefijo}_alta@prueba.test` }, { pagina: 1, limite: 50 })).datos).toEqual([]);
  });

  it("filtra por estado (activo/inactivo) y se combina con la búsqueda", async () => {
    await repositorio.cambiarEstado(creadas[1], false);

    const activas = await repositorio.listar({ q: "María Elena", activo: true }, { pagina: 1, limite: 50 });
    const inactivas = await repositorio.listar({ q: "María Elena", activo: false }, { pagina: 1, limite: 50 });

    expect(activas.datos.map((u) => u.id)).toEqual([creadas[0]]);
    expect(inactivas.datos.map((u) => u.id)).toEqual([creadas[1]]);

    await repositorio.cambiarEstado(creadas[1], true);
  });
});
