import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { MySqlCatalogoRepository } from "./MySqlCatalogoRepository";

const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlCatalogoRepository(cliente);
const prefijo = `catalogo-${randomUUID().slice(0, 8)}`;

afterAll(async () => {
  await cliente.ejecutar("DELETE FROM ciudades WHERE nombre LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM rubros WHERE nombre LIKE ?", [`${prefijo}%`]);
  await cliente.cerrar();
});

describe("MySqlCatalogoRepository", () => {
  it("lista las ciudades en orden alfabético, con id y nombre", async () => {
    await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [randomUUID(), `${prefijo}-Zeta`]);
    await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [randomUUID(), `${prefijo}-Alfa`]);

    const propias = (await repositorio.listarCiudades()).filter((c) => c.nombre.startsWith(prefijo));

    expect(propias.map((c) => c.nombre)).toEqual([`${prefijo}-Alfa`, `${prefijo}-Zeta`]);
    expect(propias[0]).toEqual({ id: expect.any(String), nombre: `${prefijo}-Alfa` });
  });

  it("lista los rubros en orden alfabético, con id y nombre", async () => {
    await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [randomUUID(), `${prefijo}-Zeta`]);
    await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [randomUUID(), `${prefijo}-Alfa`]);

    const propios = (await repositorio.listarRubros()).filter((r) => r.nombre.startsWith(prefijo));

    expect(propios.map((r) => r.nombre)).toEqual([`${prefijo}-Alfa`, `${prefijo}-Zeta`]);
    expect(propios[0]).toEqual({ id: expect.any(String), nombre: `${prefijo}-Alfa` });
  });
});
