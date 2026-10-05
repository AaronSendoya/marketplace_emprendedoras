import { describe, expect, it } from "vitest";
import { perfilDePrueba, PerfilRepositoryEnMemoria } from "@/core/perfiles/testing/dobles";
import { FakeClock } from "@/shared/testing/FakeClock";
import { ErrorNoEncontrado } from "@/shared/domain/errors";
import type { TipoClic } from "../domain/Clic";
import type { IClicRepository } from "../domain/IClicRepository";
import { RegistrarClicUseCase } from "./RegistrarClicUseCase";

const AHORA = new Date("2026-10-01T12:00:00Z");

class ClicRepositoryFalso implements IClicRepository {
  registrados: { perfilId: string; tipo: TipoClic; ahora: Date }[] = [];

  async registrar(perfilId: string, tipo: TipoClic, ahora: Date) {
    this.registrados.push({ perfilId, tipo, ahora });
  }

  async resumen() {
    return { whatsapp: 0, instagram: 0 };
  }

  async ranking() {
    return [];
  }

  async serieDiaria() {
    return [];
  }

  async porRubro() {
    return [];
  }

  async clicsDiariosPorPerfil() {
    return [];
  }

  async totalesPorPerfil() {
    return [];
  }
}

describe("RegistrarClicUseCase (regla 19)", () => {
  it("registra el clic de un perfil activo", async () => {
    const perfiles = new PerfilRepositoryEnMemoria([perfilDePrueba({ id: "perfil-1" })]);
    const clics = new ClicRepositoryFalso();
    const useCase = new RegistrarClicUseCase(perfiles, clics, new FakeClock(AHORA));

    await useCase.ejecutar("perfil-1", "whatsapp");

    expect(clics.registrados).toEqual([{ perfilId: "perfil-1", tipo: "whatsapp", ahora: AHORA }]);
  });

  it("un perfil inexistente da 404 y no registra nada", async () => {
    const perfiles = new PerfilRepositoryEnMemoria([]);
    const clics = new ClicRepositoryFalso();
    const useCase = new RegistrarClicUseCase(perfiles, clics, new FakeClock(AHORA));

    await expect(useCase.ejecutar("no-existe", "instagram")).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(clics.registrados).toHaveLength(0);
  });

  it("un perfil de una cuenta desactivada da 404 y no registra nada (regla 18)", async () => {
    const perfiles = new PerfilRepositoryEnMemoria([perfilDePrueba({ id: "perfil-1", usuarioActivo: false })]);
    const clics = new ClicRepositoryFalso();
    const useCase = new RegistrarClicUseCase(perfiles, clics, new FakeClock(AHORA));

    await expect(useCase.ejecutar("perfil-1", "whatsapp")).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(clics.registrados).toHaveLength(0);
  });
});
