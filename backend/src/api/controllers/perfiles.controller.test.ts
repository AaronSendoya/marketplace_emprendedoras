import { describe, expect, it } from "vitest";
import type { GetPerfilesUseCase } from "@/core/perfiles/application/ConsultasPerfil";
import type { CreatePerfilUseCase } from "@/core/perfiles/application/CreatePerfilUseCase";
import { perfilDePrueba } from "@/core/perfiles/testing/dobles";
import { crearPerfil, listarPerfiles, serializarPerfil } from "./perfiles.controller";

const url = (clave: string) => `https://cdn.ejemplo.com/${clave}`;

describe("serializarPerfil", () => {
  it("devuelve snake_case con URLs completas y sin el id de la cuenta ni el correo", () => {
    const cuerpo = serializarPerfil(perfilDePrueba({ usuarioId: "usuario-secreto" }), url);

    expect(cuerpo).toEqual({
      id: "perfil-1",
      nombre_negocio: "Dulces de Ana",
      descripcion: "Postres caseros",
      whatsapp: "59171234567",
      instagram_username: "dulcesdeana",
      otra_red_social: null,
      ciudad: { id: "ciudad-1", nombre: "La Paz" },
      rubro: { id: "rubro-1", nombre: "Alimentos" },
      emprendedora: "Ana Pérez",
      foto_perfil_url: "https://cdn.ejemplo.com/perfiles/foto-vieja.webp",
      logo_url: "https://cdn.ejemplo.com/logos/logo-viejo.webp",
      creado_en: "2026-09-01T00:00:00.000Z",
      actualizado_en: "2026-09-01T00:00:00.000Z",
    });
    expect(JSON.stringify(cuerpo)).not.toContain("usuario-secreto");
    expect(JSON.stringify(cuerpo)).not.toContain("_key");
  });
});

describe("controlador de perfiles", () => {
  it("listarPerfiles responde la página con la paginación", async () => {
    const usecase = { ejecutar: async () => ({ datos: [perfilDePrueba()], total: 9 }) } as unknown as GetPerfilesUseCase;

    const cuerpo = await listarPerfiles(usecase, {}, { pagina: 2, limite: 1 }, url).then((r) => r.json());

    expect(cuerpo.paginacion).toEqual({ pagina: 2, limite: 1, total: 9 });
    expect(cuerpo.datos[0].nombre_negocio).toBe("Dulces de Ana");
  });

  it("crearPerfil responde 201 con el perfil serializado", async () => {
    const usecase = { ejecutar: async () => perfilDePrueba() } as unknown as CreatePerfilUseCase;

    const respuesta = await crearPerfil(usecase, { id: "usuario-1", rol: "Emprendedor" }, {} as never, url);

    expect(respuesta.status).toBe(201);
    expect((await respuesta.json()).id).toBe("perfil-1");
  });
});
