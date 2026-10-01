import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { MySqlOtpRepository } from "./MySqlOtpRepository";

const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlOtpRepository(cliente);
const prefijo = `otp-${randomUUID().slice(0, 8)}`;
const nuevoCorreo = () => `${prefijo}-${randomUUID().slice(0, 6)}@prueba.test`;

const T0 = new Date("2026-09-23T12:00:00.000Z");
const enMinutos = (minutos: number) => new Date(T0.getTime() + minutos * 60_000);

const crear = (email: string, parches: Partial<Parameters<MySqlOtpRepository["crear"]>[0]> = {}) =>
  repositorio.crear({ email, proposito: "restablecer_password", codigoHash: "hash-x", expiraEn: enMinutos(10), creadoEn: T0, ...parches });

afterAll(async () => {
  await cliente.ejecutar("DELETE FROM otp_codigos WHERE email LIKE ?", [`${prefijo}%`]);
  await cliente.cerrar();
});

describe("MySqlOtpRepository", () => {
  it("crear y buscarUltimo devuelven el código con sus fechas, 0 intentos y sin usar", async () => {
    const email = nuevoCorreo();
    await crear(email);

    const otp = await repositorio.buscarUltimo(email, "restablecer_password");

    expect(otp).toMatchObject({ email, proposito: "restablecer_password", codigoHash: "hash-x", intentos: 0, usadoEn: null });
    expect(otp?.expiraEn).toEqual(enMinutos(10));
    expect(otp?.creadoEn).toEqual(T0);
  });

  it("buscarUltimo devuelve el más reciente del propósito y null si no hay", async () => {
    const email = nuevoCorreo();
    await crear(email, { codigoHash: "viejo", creadoEn: T0 });
    await crear(email, { codigoHash: "nuevo", creadoEn: enMinutos(2) });
    await crear(email, { proposito: "verificar_email", codigoHash: "otro-proposito", creadoEn: enMinutos(5) });

    expect((await repositorio.buscarUltimo(email, "restablecer_password"))?.codigoHash).toBe("nuevo");
    expect((await repositorio.buscarUltimo(email, "verificar_email"))?.codigoHash).toBe("otro-proposito");
    expect(await repositorio.buscarUltimo(nuevoCorreo(), "restablecer_password")).toBeNull();
  });

  it("fechasSolicitudes cuenta todos los propósitos del correo desde `desde`, la más reciente primero", async () => {
    const email = nuevoCorreo();
    await crear(email, { creadoEn: T0 });
    await crear(email, { proposito: "verificar_email", creadoEn: enMinutos(30) });
    await crear(email, { creadoEn: enMinutos(50) });

    expect(await repositorio.fechasSolicitudes(email, enMinutos(-1))).toEqual([enMinutos(50), enMinutos(30), T0]);
    expect(await repositorio.fechasSolicitudes(email, enMinutos(20))).toEqual([enMinutos(50), enMinutos(30)]);
    expect(await repositorio.fechasSolicitudes(nuevoCorreo(), enMinutos(-1))).toEqual([]);
  });

  describe("reservarIntento", () => {
    it("suma un intento mientras el código esté vigente, sin usar y bajo el máximo", async () => {
      const email = nuevoCorreo();
      await crear(email);
      const { id } = (await repositorio.buscarUltimo(email, "restablecer_password"))!;

      expect(await repositorio.reservarIntento(id, enMinutos(1), 2)).toBe(true);
      expect(await repositorio.reservarIntento(id, enMinutos(1), 2)).toBe(true);
      expect(await repositorio.reservarIntento(id, enMinutos(1), 2)).toBe(false);
      expect((await repositorio.buscarUltimo(email, "restablecer_password"))?.intentos).toBe(2);
    });

    it("rechaza un código vencido (justo a la hora de expirar ya no vale)", async () => {
      const email = nuevoCorreo();
      await crear(email);
      const { id } = (await repositorio.buscarUltimo(email, "restablecer_password"))!;

      expect(await repositorio.reservarIntento(id, enMinutos(9), 5)).toBe(true);
      expect(await repositorio.reservarIntento(id, enMinutos(10), 5)).toBe(false);
    });

    it("es atómico: con 10 peticiones en paralelo y máximo 5, solo 5 lo consiguen", async () => {
      const email = nuevoCorreo();
      await crear(email);
      const { id } = (await repositorio.buscarUltimo(email, "restablecer_password"))!;

      const resultados = await Promise.all(Array.from({ length: 10 }, () => repositorio.reservarIntento(id, enMinutos(1), 5)));

      expect(resultados.filter(Boolean)).toHaveLength(5);
      expect((await repositorio.buscarUltimo(email, "restablecer_password"))?.intentos).toBe(5);
    });

    it("con un id inexistente devuelve false", async () => {
      expect(await repositorio.reservarIntento(randomUUID(), enMinutos(1), 5)).toBe(false);
    });
  });

  describe("consumir", () => {
    it("marca el código como usado una sola vez, aunque se pida en paralelo", async () => {
      const email = nuevoCorreo();
      await crear(email);
      const { id } = (await repositorio.buscarUltimo(email, "restablecer_password"))!;

      const resultados = await Promise.all([repositorio.consumir(id, enMinutos(1)), repositorio.consumir(id, enMinutos(1))]);

      expect(resultados.filter(Boolean)).toHaveLength(1);
      expect((await repositorio.buscarUltimo(email, "restablecer_password"))?.usadoEn).toEqual(enMinutos(1));
    });

    it("un código usado ya no admite intentos", async () => {
      const email = nuevoCorreo();
      await crear(email);
      const { id } = (await repositorio.buscarUltimo(email, "restablecer_password"))!;
      await repositorio.consumir(id, enMinutos(1));

      expect(await repositorio.reservarIntento(id, enMinutos(2), 5)).toBe(false);
    });
  });

  it("la base rechaza un propósito desconocido (CHECK)", async () => {
    await expect(crear(nuevoCorreo(), { proposito: "otro" as never })).rejects.toThrow();
  });
});
