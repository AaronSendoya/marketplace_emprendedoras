import { describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorValidacion } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import { hasherFalso, LoggerFalso, usuarioDePrueba } from "../testing/dobles";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { CreateUsuarioUseCase, type DatosNuevaCuenta } from "./CreateUsuarioUseCase";

const AHORA = new Date("2026-09-23T12:00:00Z");
const NUEVA = "emprendedora@gmail.com";

function construir() {
  const repoUsuarios = new UsuarioRepositoryEnMemoria([usuarioDePrueba({ id: "admin-1", email: "admin@gmail.com", rol: "Admin" })]);
  const clock = new FakeClock(AHORA);
  const logger = new LoggerFalso();
  const crear = new CreateUsuarioUseCase(repoUsuarios, hasherFalso, clock, logger, () => "TempPass2026");
  return { repoUsuarios, crear, logger };
}

const datos = (parches: Partial<DatosNuevaCuenta> = {}): DatosNuevaCuenta => ({
  email: NUEVA,
  nombres: "María Elena",
  apellidoPaterno: "Flores",
  apellidoMaterno: "Choque",
  ...parches,
});

describe("CreateUsuarioUseCase", () => {
  it("crea la cuenta con el rol Emprendedor, sin OTP, y solo el hash de la contraseña del Admin", async () => {
    const { repoUsuarios, crear } = construir();

    const { usuario, passwordTemporal } = await crear.ejecutar("admin-1", datos({ password: "ClaveInicial2026" }));

    expect(usuario).toMatchObject({
      email: NUEVA,
      nombres: "María Elena",
      apellidoPaterno: "Flores",
      apellidoMaterno: "Choque",
      rol: "Emprendedor",
      activo: true,
      passwordHash: "hash-de-ClaveInicial2026",
    });
    expect(passwordTemporal).toBeNull();
    expect(repoUsuarios.usuarios).toHaveLength(2);
  });

  // Regla 15: el alta ya no pide OTP; el correo queda sin verificar hasta el primer código que
  // complete esa cuenta (mismo criterio que las cuentas migradas del Excel, regla 12).
  it("el correo queda sin verificar (email_verificado_en nulo)", async () => {
    const { crear } = construir();

    const { usuario } = await crear.ejecutar("admin-1", datos());

    expect(usuario.emailVerificadoEn).toBeNull();
  });

  it("sin contraseña, genera una temporal, guarda su hash y la devuelve esa única vez", async () => {
    const { crear } = construir();

    const { usuario, passwordTemporal } = await crear.ejecutar("admin-1", datos());

    expect(passwordTemporal).toBe("TempPass2026");
    expect(usuario.passwordHash).toBe("hash-de-TempPass2026");
  });

  it("el apellido materno es opcional", async () => {
    const { crear } = construir();

    const { usuario } = await crear.ejecutar("admin-1", datos({ apellidoMaterno: null }));

    expect(usuario.apellidoMaterno).toBeNull();
  });

  it("un correo que ya tiene cuenta da conflicto", async () => {
    const { crear } = construir();

    await expect(crear.ejecutar("admin-1", datos({ email: "admin@gmail.com" }))).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("una contraseña que no cumple la política se rechaza", async () => {
    const { repoUsuarios, crear } = construir();

    await expect(crear.ejecutar("admin-1", datos({ password: "corta" }))).rejects.toBeInstanceOf(ErrorValidacion);

    expect(repoUsuarios.usuarios).toHaveLength(1);
  });

  it("registra el evento sin correo ni contraseña", async () => {
    const { crear, logger } = construir();

    await crear.ejecutar("admin-1", datos());

    expect(logger.registros.at(-1)).toEqual({ nivel: "info", evento: "cuenta_creada", datos: { usuarioId: "usuario-2", adminId: "admin-1" } });
    expect(JSON.stringify(logger.registros)).not.toMatch(/TempPass2026|@gmail\.com/);
  });
});
