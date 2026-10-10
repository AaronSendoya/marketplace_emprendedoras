import { describe, expect, it } from "vitest";
import type { ActualizarUsuarioUseCase } from "@/core/auth/application/ActualizarUsuarioUseCase";
import type { AdminRestablecerPasswordUseCase } from "@/core/auth/application/AdminRestablecerPasswordUseCase";
import type { CambiarEstadoUsuarioUseCase } from "@/core/auth/application/CambiarEstadoUsuarioUseCase";
import type { CreateUsuarioUseCase } from "@/core/auth/application/CreateUsuarioUseCase";
import type { EliminarCuentaUseCase } from "@/core/auth/application/EliminarCuentaUseCase";
import type { GetUsuarioUseCase } from "@/core/auth/application/GetUsuarioUseCase";
import type { ListUsuariosUseCase } from "@/core/auth/application/ListUsuariosUseCase";
import type { Usuario } from "@/core/auth/domain/Usuario";
import { usuarioDePrueba } from "@/core/auth/testing/dobles";
import { actualizarUsuario, cambiarEstadoUsuario, crearUsuario, eliminarUsuario, listarUsuarios, obtenerUsuario, restablecerPasswordAdmin } from "./admin-usuarios.controller";

const conHash = (parches: Partial<Usuario> = {}) => usuarioDePrueba({ passwordHash: "hash-secreto", ...parches });

describe("controlador de cuentas del Admin", () => {
  it("crearUsuario responde 201 con la cuenta serializada y la contraseña temporal, sin el hash", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return { usuario: conHash(), passwordTemporal: "TempPass2026" };
      },
    } as unknown as CreateUsuarioUseCase;
    const datos = { email: "aaron@gmail.com", nombres: "Aaron", apellidoPaterno: "Mamani", apellidoMaterno: null };

    const respuesta = await crearUsuario(usecase, "admin-1", datos);
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(201);
    expect(recibido).toEqual(["admin-1", datos]);
    expect(cuerpo.password_temporal).toBe("TempPass2026");
    expect(cuerpo.usuario).toMatchObject({ id: "usuario-1", rol: "Emprendedor", nombre_completo: "Aaron Mamani" });
    expect(JSON.stringify(cuerpo)).not.toContain("hash-secreto");
  });

  it("crearUsuario devuelve password_temporal nulo si el Admin definió la contraseña", async () => {
    const usecase = { ejecutar: async () => ({ usuario: conHash(), passwordTemporal: null }) } as unknown as CreateUsuarioUseCase;

    const cuerpo = await crearUsuario(usecase, "admin-1", {} as never).then((r) => r.json());

    expect(cuerpo.password_temporal).toBeNull();
  });

  it("listarUsuarios responde la página con la paginación y sin el hash", async () => {
    const usecase = { ejecutar: async () => ({ datos: [conHash(), conHash({ id: "usuario-2" })], total: 7 }) } as unknown as ListUsuariosUseCase;

    const cuerpo = await listarUsuarios(usecase, {}, { pagina: 2, limite: 2 }).then((r) => r.json());

    expect(cuerpo.paginacion).toEqual({ pagina: 2, limite: 2, total: 7 });
    expect(cuerpo.datos.map((u: { id: string }) => u.id)).toEqual(["usuario-1", "usuario-2"]);
    expect(JSON.stringify(cuerpo)).not.toContain("hash-secreto");
  });

  it("listarUsuarios incluye el perfil de cada cuenta (o null si todavía no tiene)", async () => {
    const usecase = {
      ejecutar: async () => ({
        datos: [
          { ...conHash(), perfil: { id: "perfil-1", nombreNegocio: "Dulces de Ana" } },
          { ...conHash({ id: "usuario-2" }), perfil: null },
        ],
        total: 2,
      }),
    } as unknown as ListUsuariosUseCase;

    const cuerpo = await listarUsuarios(usecase, {}, { pagina: 1, limite: 10 }).then((r) => r.json());

    expect(cuerpo.datos[0].perfil).toEqual({ id: "perfil-1", nombre_negocio: "Dulces de Ana" });
    expect(cuerpo.datos[1].perfil).toBeNull();
    expect(JSON.stringify(cuerpo)).not.toContain("hash-secreto");
  });

  it("cambiarEstadoUsuario pasa los ids y el estado al caso de uso y responde la cuenta", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return conHash({ activo: false });
      },
    } as unknown as CambiarEstadoUsuarioUseCase;

    const cuerpo = await cambiarEstadoUsuario(usecase, "admin-1", "usuario-1", false).then((r) => r.json());

    expect(recibido).toEqual(["admin-1", "usuario-1", false]);
    expect(cuerpo).toMatchObject({ id: "usuario-1", activo: false });
    expect(JSON.stringify(cuerpo)).not.toContain("hash-secreto");
  });

  it("actualizarUsuario pasa los cambios al caso de uso y responde la cuenta editada, sin el hash", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return conHash({ nombres: "Nuevo Nombre" });
      },
    } as unknown as ActualizarUsuarioUseCase;

    const cuerpo = await actualizarUsuario(usecase, "admin-1", "usuario-1", { nombres: "Nuevo Nombre" }).then((r) => r.json());

    expect(recibido).toEqual(["admin-1", "usuario-1", { nombres: "Nuevo Nombre" }]);
    expect(cuerpo).toMatchObject({ id: "usuario-1", nombres: "Nuevo Nombre" });
    expect(JSON.stringify(cuerpo)).not.toContain("hash-secreto");
  });

  it("obtenerUsuario responde la cuenta, sin el hash (módulo \"Emprendimientos\" del panel)", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return conHash();
      },
    } as unknown as GetUsuarioUseCase;

    const respuesta = await obtenerUsuario(usecase, "usuario-1");
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(recibido).toEqual(["usuario-1"]);
    expect(cuerpo).toMatchObject({ id: "usuario-1" });
    expect(JSON.stringify(cuerpo)).not.toContain("hash-secreto");
  });

  it("restablecerPasswordAdmin responde la cuenta y la contraseña temporal, sin el hash", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return { usuario: conHash(), passwordTemporal: "TempPass2026" };
      },
    } as unknown as AdminRestablecerPasswordUseCase;

    const cuerpo = await restablecerPasswordAdmin(usecase, "admin-1", "usuario-1", undefined).then((r) => r.json());

    expect(recibido).toEqual(["admin-1", "usuario-1", undefined]);
    expect(cuerpo.password_temporal).toBe("TempPass2026");
    expect(cuerpo.usuario).toMatchObject({ id: "usuario-1" });
    expect(JSON.stringify(cuerpo)).not.toContain("hash-secreto");
  });

  it("eliminarUsuario responde 200 con cuánto se eliminó y le pasa al caso de uso quién pide, qué cuenta y el correo escrito", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return { perfiles: 1, productos: 6, descuentos: 2, clics: 120, imagenes: 8 };
      },
    } as unknown as EliminarCuentaUseCase;

    const respuesta = await eliminarUsuario(usecase, "admin-1", "usuario-1", "aaron@gmail.com");

    expect(respuesta.status).toBe(200);
    expect(recibido).toEqual(["admin-1", "usuario-1", "aaron@gmail.com"]);
    expect(await respuesta.json()).toEqual({ perfiles: 1, productos: 6, descuentos: 2, clics: 120, imagenes: 8 });
  });
});
