import { describe, expect, it } from "vitest";
import { CreateUsuarioUseCase } from "@/core/auth/application/CreateUsuarioUseCase";
import { LoggerFalso, hasherFalso } from "@/core/auth/testing/dobles";
import { UsuarioRepositoryEnMemoria } from "@/core/auth/testing/UsuarioRepositoryEnMemoria";
import { usuarioDePrueba } from "@/core/auth/testing/dobles";
import { DescuentoRepositoryEnMemoria } from "@/core/descuentos/testing/dobles";
import { CreatePerfilUseCase } from "@/core/perfiles/application/CreatePerfilUseCase";
import { PerfilRepositoryEnMemoria, ProcesadorFalso } from "@/core/perfiles/testing/dobles";
import type { Actor } from "@/shared/domain/Actor";
import { CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO } from "@/shared/domain/imagenes";
import { ErrorConflicto } from "@/shared/domain/errors";
import { ImageStorageEnMemoria } from "@/shared/infrastructure/ImageStorageEnMemoria";
import { FakeClock } from "@/shared/testing/FakeClock";
import { construirFila } from "../domain/FilaImportacion";
import { CIUDADES, RUBROS, catalogoEnMemoria, celdasDePrueba, idDeRubro } from "../testing/dobles";
import { ImportarEmprendedorasUseCase, MENSAJES_IMPORTACION, ValidarFilasEmprendedorasUseCase, type FilaAImportar } from "./ImportarEmprendedoras";

const admin: Actor = { id: "admin-1", rol: "Admin" };
const AHORA = new Date("2026-10-06T12:00:00Z");

const fila = (numero: number, parches = {}): FilaAImportar => ({
  fila: numero,
  datos: construirFila(celdasDePrueba({ correo: `persona${numero}@ejemplo.com`, ...parches }), { ciudades: CIUDADES, rubros: RUBROS }).datos,
});

// Cada sustituto es un objeto que reemplaza al caso de uso real, o una función que lo recibe y lo envuelve (para fallar solo a veces).
type Sustituto<T> = T | ((real: T) => T);
const resolver = <T,>(sustituto: Sustituto<T> | undefined, real: T): T => (typeof sustituto === "function" ? (sustituto as (real: T) => T)(real) : (sustituto ?? real));

function construir(sustitutos: { crearUsuario?: Sustituto<Pick<CreateUsuarioUseCase, "ejecutar">>; crearPerfil?: Sustituto<Pick<CreatePerfilUseCase, "ejecutar">> } = {}) {
  const usuarios = new UsuarioRepositoryEnMemoria();
  const perfiles = new PerfilRepositoryEnMemoria(
    [],
    CIUDADES.map((c) => c.id),
    RUBROS.map((r) => r.id),
  );
  const descuentos = new DescuentoRepositoryEnMemoria();
  const almacenamiento = new ImageStorageEnMemoria();
  const logger = new LoggerFalso();
  const clock = new FakeClock(AHORA);
  let contador = 0;
  const crearUsuario = new CreateUsuarioUseCase(usuarios, hasherFalso, clock, logger, () => `Temporal-${++contador}`);
  const crearPerfil = new CreatePerfilUseCase(perfiles, usuarios, new ProcesadorFalso(), almacenamiento, clock, logger);
  const caso = new ImportarEmprendedorasUseCase(
    usuarios,
    catalogoEnMemoria,
    resolver(sustitutos.crearUsuario, crearUsuario),
    resolver(sustitutos.crearPerfil, crearPerfil),
    logger,
  );
  return { caso, usuarios, perfiles, descuentos, almacenamiento, logger, crearUsuario, crearPerfil };
}

describe("ImportarEmprendedorasUseCase: una fila buena", () => {
  it("crea la cuenta y el perfil, y devuelve la contraseña temporal una sola vez", async () => {
    const { caso, usuarios, perfiles } = construir();

    const [resultado] = await caso.ejecutar(admin, [fila(2)]);

    expect(resultado).toMatchObject({
      fila: 2,
      correo: "persona2@ejemplo.com",
      estado: "creada",
      cuentaCreada: true,
      perfilCreado: true,
      passwordTemporal: "Temporal-1",
      mensaje: null,
    });
    expect(resultado).not.toHaveProperty("descuentoCreado");
    expect(usuarios.usuarios).toHaveLength(1);
    expect(perfiles.perfiles).toHaveLength(1);
  });

  it("la cuenta es Emprendedor, sin verificar, con solo el hash de la contraseña (regla 5 y 15)", async () => {
    const { caso, usuarios } = construir();

    await caso.ejecutar(admin, [fila(2)]);

    expect(usuarios.usuarios[0]).toMatchObject({
      email: "persona2@ejemplo.com",
      nombres: "Ana Maria",
      apellidoPaterno: "Perez",
      apellidoMaterno: "Rojas",
      rol: "Emprendedor",
      emailVerificadoEn: null,
      passwordHash: "hash-de-Temporal-1",
    });
  });

  it("el perfil usa las imágenes predeterminadas y no sube ninguna imagen (regla 11 y 22)", async () => {
    const { caso, perfiles, almacenamiento } = construir();

    await caso.ejecutar(admin, [fila(2)]);

    expect(perfiles.perfiles[0]).toMatchObject({ fotoPerfilKey: CLAVE_FOTO_PERFIL_PREDETERMINADA, logoKey: CLAVE_LOGO_PREDETERMINADO });
    expect(almacenamiento.claves()).toEqual([]);
  });

  it("el perfil queda con el WhatsApp normalizado, el Instagram sin arroba y la ciudad y el rubro del catálogo", async () => {
    const { caso, perfiles } = construir();

    await caso.ejecutar(admin, [fila(2, { whatsapp: "71578947", instagram: "@DulcesDeAna", ciudad: "Santa Cruz", rubro: "Salud y bienestar" })]);

    expect(perfiles.perfiles[0]).toMatchObject({
      nombreNegocio: "Dulces de Ana",
      whatsapp: "59171578947",
      instagramUsername: "dulcesdeana",
      ciudad: { id: CIUDADES[2].id },
      rubro: { id: idDeRubro("Salud y bienestar") },
    });
  });

  it("un enlace que no es de Instagram queda como «otra red social»", async () => {
    const { caso, perfiles } = construir();

    await caso.ejecutar(admin, [fila(2, { instagram: "https://www.facebook.com/Nativa" })]);

    expect(perfiles.perfiles[0]).toMatchObject({ instagramUsername: null, otraRedSocial: "https://www.facebook.com/Nativa" });
  });

  it("nunca crea descuentos: el beneficio del formulario no se registra (regla 22)", async () => {
    const { caso, descuentos } = construir();

    const resultados = await caso.ejecutar(admin, [fila(2), fila(3)]);

    expect(resultados.map((r) => r.estado)).toEqual(["creada", "creada"]);
    expect(descuentos.descuentos).toEqual([]);
  });

  it("crea cada perfil en nombre del Admin, con la cuenta recién creada como dueña", async () => {
    const llamadas: unknown[][] = [];
    const { caso } = construir({
      crearPerfil: (real) => ({ ejecutar: async (...args: Parameters<CreatePerfilUseCase["ejecutar"]>) => (llamadas.push(args), real.ejecutar(...args)) }),
    });

    await caso.ejecutar(admin, [fila(2)]);

    expect(llamadas[0][0]).toEqual(admin);
    expect(llamadas[0][1]).toMatchObject({ usuarioId: "usuario-1", foto: "predeterminada", logo: "predeterminada" });
  });
});

describe("ImportarEmprendedorasUseCase: una fila que no se crea", () => {
  it("un correo que ya tiene cuenta se omite sin tocar nada", async () => {
    const { caso, usuarios, perfiles } = construir();
    usuarios.usuarios.push(usuarioDePrueba({ email: "persona2@ejemplo.com" }));

    const [resultado] = await caso.ejecutar(admin, [fila(2)]);

    expect(resultado).toMatchObject({ estado: "omitida", cuentaCreada: false, passwordTemporal: null });
    expect(resultado.mensaje).toBe("Esta persona ya tiene cuenta. Se omitirá; no se cambia nada de lo que ya tiene.");
    expect(usuarios.usuarios).toHaveLength(1);
    expect(perfiles.perfiles).toEqual([]);
  });

  it("repetir la importación no duplica: lo ya creado se omite", async () => {
    const { caso, usuarios } = construir();

    await caso.ejecutar(admin, [fila(2), fila(3)]);
    const segunda = await caso.ejecutar(admin, [fila(2), fila(3)]);

    expect(segunda.map((r) => r.estado)).toEqual(["omitida", "omitida"]);
    expect(usuarios.usuarios).toHaveLength(2);
  });

  it("el mismo correo dos veces en una tanda: se crea el primero y se omite el segundo", async () => {
    const { caso, usuarios } = construir();

    const resultados = await caso.ejecutar(admin, [fila(2), { ...fila(3), datos: { ...fila(3).datos, correo: "persona2@ejemplo.com" } }]);

    expect(resultados.map((r) => r.estado)).toEqual(["creada", "omitida"]);
    expect(usuarios.usuarios).toHaveLength(1);
  });

  it("una fila con datos inválidos no crea nada y dice qué falla", async () => {
    const { caso, usuarios } = construir();

    const [resultado] = await caso.ejecutar(admin, [fila(2, { whatsapp: "hola" })]);

    expect(resultado).toMatchObject({ estado: "error", cuentaCreada: false, passwordTemporal: null });
    expect(resultado.avisos[0].codigo).toBe("whatsapp_invalido");
    expect(resultado.mensaje).toContain("El WhatsApp «hola» no es válido");
    expect(usuarios.usuarios).toEqual([]);
  });

  it("el servidor no se fía de la vista previa: vuelve a validar aunque el cliente mande otra cosa", async () => {
    const { caso, usuarios } = construir();
    const manipulada: FilaAImportar = { fila: 2, datos: { ...fila(2).datos, ciudadId: "ciudad-inventada", correo: "no-es-un-correo" } };

    const [resultado] = await caso.ejecutar(admin, [manipulada]);

    expect(resultado.estado).toBe("error");
    expect(resultado.avisos.map((a) => a.codigo)).toEqual(expect.arrayContaining(["correo_invalido", "ciudad_desconocida"]));
    expect(usuarios.usuarios).toEqual([]);
  });

  it("una fila con error no detiene a las demás", async () => {
    const { caso, usuarios } = construir();

    const resultados = await caso.ejecutar(admin, [fila(2), fila(3, { whatsapp: "hola" }), fila(4)]);

    expect(resultados.map((r) => r.estado)).toEqual(["creada", "error", "creada"]);
    expect(usuarios.usuarios.map((u) => u.email)).toEqual(["persona2@ejemplo.com", "persona4@ejemplo.com"]);
  });

  it("si otra petición registró el correo justo antes, se omite con ese mensaje", async () => {
    const { caso } = construir({ crearUsuario: { ejecutar: async () => { throw new ErrorConflicto("Ya existe una cuenta con ese correo."); } } });

    const [resultado] = await caso.ejecutar(admin, [fila(2)]);

    expect(resultado).toMatchObject({ estado: "omitida", mensaje: MENSAJES_IMPORTACION.correoRegistradoMientras });
  });
});

describe("ImportarEmprendedorasUseCase: algo falla a medias", () => {
  it("si la cuenta se crea y el perfil falla, queda la cuenta sin perfil, se avisa y se entrega la contraseña igual", async () => {
    const { caso, usuarios } = construir({ crearPerfil: { ejecutar: async () => { throw new Error("falló la base"); } } });

    const [resultado] = await caso.ejecutar(admin, [fila(2)]);

    expect(resultado).toMatchObject({
      estado: "error",
      cuentaCreada: true,
      perfilCreado: false,
      passwordTemporal: "Temporal-1",
      mensaje: MENSAJES_IMPORTACION.cuentaSinPerfil,
    });
    expect(usuarios.usuarios).toHaveLength(1);
  });

  it("un error inesperado en una fila da un mensaje genérico y las demás filas siguen", async () => {
    let llamadas = 0;
    const { caso } = construir({
      crearUsuario: (real) => ({
        ejecutar: async (adminId, datos) => {
          if (++llamadas === 1) throw new Error("conexión perdida con la base de datos");
          return real.ejecutar(adminId, datos);
        },
      }),
    });

    const resultados = await caso.ejecutar(admin, [fila(2), fila(3)]);

    expect(resultados[0]).toMatchObject({ estado: "error", mensaje: MENSAJES_IMPORTACION.errorDelServidor });
    expect(resultados[1].estado).toBe("creada");
  });
});

describe("ImportarEmprendedorasUseCase: registro de eventos (sin datos personales)", () => {
  it("deja un resumen con solo conteos", async () => {
    const { caso, logger } = construir();

    await caso.ejecutar(admin, [fila(2), fila(3, { whatsapp: "hola" }), fila(4)]);

    expect(logger.registros.find((r) => r.evento === "importacion_emprendedoras")).toMatchObject({
      nivel: "info",
      datos: { adminId: "admin-1", filas: 3, creadas: 2, omitidas: 0, conError: 1 },
    });
  });

  it("ningún registro lleva un correo, una contraseña, un teléfono ni un nombre", async () => {
    const { caso, logger } = construir({ crearPerfil: { ejecutar: async () => { throw new Error("error con persona2@ejemplo.com y 71234567"); } } });

    await caso.ejecutar(admin, [fila(2), fila(3)]);

    const todo = JSON.stringify(logger.registros);
    expect(todo).not.toMatch(/persona\d@ejemplo\.com/);
    expect(todo).not.toContain("Temporal-");
    expect(todo).not.toContain("71234567");
    expect(todo).not.toContain("Ana");
    expect(logger.registros.some((r) => r.evento === "importacion_perfil_fallido")).toBe(true);
  });
});

describe("ValidarFilasEmprendedorasUseCase", () => {
  it("revisa filas corregidas por el Admin sin escribir nada", async () => {
    const usuarios = new UsuarioRepositoryEnMemoria([usuarioDePrueba({ email: "persona3@ejemplo.com" })]);
    const caso = new ValidarFilasEmprendedorasUseCase(usuarios, catalogoEnMemoria);

    const resultados = await caso.ejecutar([fila(2), fila(3), fila(4, { whatsapp: "hola" })]);

    expect(resultados.map((r) => [r.fila, r.estado, r.yaExiste])).toEqual([
      [2, "lista", false],
      [3, "ya_existe", true],
      [4, "error", false],
    ]);
    expect(resultados[2].avisos[0].codigo).toBe("whatsapp_invalido");
    expect(usuarios.usuarios).toHaveLength(1);
  });

  it("una fila «para revisar» no es un error: la validación solo ve errores, así que queda «lista»", async () => {
    const caso = new ValidarFilasEmprendedorasUseCase(new UsuarioRepositoryEnMemoria(), catalogoEnMemoria);

    const [resultado] = await caso.ejecutar([fila(2, { nombreCompleto: "Ana Pérez Rojas" })]);

    expect(resultado.estado).toBe("lista");
  });
});
