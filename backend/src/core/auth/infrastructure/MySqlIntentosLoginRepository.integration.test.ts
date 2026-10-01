import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { MySqlIntentosLoginRepository } from "./MySqlIntentosLoginRepository";

const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlIntentosLoginRepository(cliente);
const email = `intentos-${randomUUID().slice(0, 8)}@prueba.test`;

afterAll(async () => {
  await cliente.ejecutar("DELETE FROM intentos_login WHERE email LIKE ?", [`${email}%`]);
  await cliente.cerrar();
});

describe("MySqlIntentosLoginRepository", () => {
  it("empieza en 0 sin fallos ni último fallo", async () => {
    expect(await repositorio.estado(email)).toEqual({ totalFallos: 0, ultimoFallo: null });
  });

  it("cuenta cada fallo registrado y trae la fecha del más reciente", async () => {
    await repositorio.registrarFallo(email, new Date("2026-09-22T12:00:00Z"));
    await repositorio.registrarFallo(email, new Date("2026-09-22T12:05:00Z"));

    const estado = await repositorio.estado(email);

    expect(estado.totalFallos).toBe(2);
    expect(estado.ultimoFallo).toEqual(new Date("2026-09-22T12:05:00Z"));
  });

  it("no mezcla los intentos de otro correo", async () => {
    expect(await repositorio.estado(`otro-${email}`)).toEqual({ totalFallos: 0, ultimoFallo: null });
  });

  it("limpiar borra todos los fallos del correo y no toca otros", async () => {
    const otro = `otro-${email}`;
    await repositorio.registrarFallo(otro, new Date("2026-09-22T12:00:00Z"));

    await repositorio.limpiar(email);

    expect(await repositorio.estado(email)).toEqual({ totalFallos: 0, ultimoFallo: null });
    expect((await repositorio.estado(otro)).totalFallos).toBe(1);

    await cliente.ejecutar("DELETE FROM intentos_login WHERE email = ?", [otro]);
  });
});
