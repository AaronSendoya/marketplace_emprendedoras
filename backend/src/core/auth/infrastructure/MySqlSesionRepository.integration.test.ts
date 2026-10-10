import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { MySqlSesionRepository } from "./MySqlSesionRepository";

// Regla 5: sesiones del servidor, contra MySQL real.
const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlSesionRepository(cliente);
const prefijo = `ses-${randomUUID().slice(0, 8)}`;
const rolId = randomUUID();
const usuarioA = randomUUID();
const usuarioB = randomUUID();

const T0 = new Date("2026-10-08T12:00:00.000Z");
const enHoras = (horas: number) => new Date(T0.getTime() + horas * 3_600_000);

async function crearUsuario(id: string, clave: string) {
  await cliente.ejecutar(
    "INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'Ana', 'Rojas', 'hash', ?)",
    [id, `${prefijo}-${clave}@prueba.test`, rolId],
  );
}

beforeAll(async () => {
  await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [rolId, `${prefijo}-rol`]);
  await crearUsuario(usuarioA, "a");
  await crearUsuario(usuarioB, "b");
});

afterAll(async () => {
  await cliente.ejecutar("DELETE FROM sesiones WHERE usuario_id IN (?, ?)", [usuarioA, usuarioB]);
  await cliente.ejecutar("DELETE FROM usuarios WHERE id IN (?, ?)", [usuarioA, usuarioB]);
  await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [rolId]);
  await cliente.cerrar();
});

describe("MySqlSesionRepository", () => {
  it("crear devuelve un id nuevo cada vez, aunque sea la misma cuenta y la misma hora", async () => {
    const primero = await repositorio.crear(usuarioA, T0, null);
    const segundo = await repositorio.crear(usuarioA, T0, null);

    expect(primero).toMatch(/^[0-9a-f-]{36}$/);
    expect(segundo).not.toBe(primero);
  });

  it("una sesión sin vencimiento (Emprendedora) vale siempre, también años después", async () => {
    const id = await repositorio.crear(usuarioA, T0, null);

    expect(await repositorio.estaVigente(id, usuarioA, T0)).toBe(true);
    expect(await repositorio.estaVigente(id, usuarioA, new Date(T0.getTime() + 400 * 86_400_000))).toBe(true);
  });

  it("una sesión con vencimiento (Admin) vale hasta esa hora y no después", async () => {
    const id = await repositorio.crear(usuarioA, T0, enHoras(4));

    expect(await repositorio.estaVigente(id, usuarioA, enHoras(3))).toBe(true);
    expect(await repositorio.estaVigente(id, usuarioA, new Date(enHoras(4).getTime() - 1))).toBe(true);
    expect(await repositorio.estaVigente(id, usuarioA, enHoras(4))).toBe(false);
    expect(await repositorio.estaVigente(id, usuarioA, enHoras(5))).toBe(false);
  });

  it("una sesión no vale para otra cuenta ni si el id no existe", async () => {
    const id = await repositorio.crear(usuarioA, T0, null);

    expect(await repositorio.estaVigente(id, usuarioB, T0)).toBe(false);
    expect(await repositorio.estaVigente(randomUUID(), usuarioA, T0)).toBe(false);
  });

  it("cerrar borra solo esa sesión: las demás de la misma cuenta siguen abiertas", async () => {
    const telefono = await repositorio.crear(usuarioA, T0, null);
    const computador = await repositorio.crear(usuarioA, T0, null);

    await repositorio.cerrar(telefono, usuarioA);

    expect(await repositorio.estaVigente(telefono, usuarioA, T0)).toBe(false);
    expect(await repositorio.estaVigente(computador, usuarioA, T0)).toBe(true);
  });

  it("cerrar con la cuenta equivocada no borra nada, y cerrar dos veces no falla", async () => {
    const id = await repositorio.crear(usuarioA, T0, null);

    await repositorio.cerrar(id, usuarioB);
    expect(await repositorio.estaVigente(id, usuarioA, T0)).toBe(true);

    await repositorio.cerrar(id, usuarioA);
    await expect(repositorio.cerrar(id, usuarioA)).resolves.toBeUndefined();
  });

  it("un id con comillas o SQL se trata como dato (parámetros), no como código", async () => {
    await repositorio.crear(usuarioA, T0, null);

    expect(await repositorio.estaVigente("' OR '1'='1", usuarioA, T0)).toBe(false);
    await expect(repositorio.cerrar("' OR '1'='1", usuarioA)).resolves.toBeUndefined();
    expect(await cliente.consultar<{ n: number }>("SELECT COUNT(*) AS n FROM sesiones WHERE usuario_id = ?", [usuarioA])).not.toEqual([{ n: 0 }]);
  });
});
