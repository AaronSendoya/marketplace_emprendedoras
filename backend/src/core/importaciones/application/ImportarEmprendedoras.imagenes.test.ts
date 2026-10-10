import { describe, expect, it } from "vitest";
import { CreateUsuarioUseCase } from "@/core/auth/application/CreateUsuarioUseCase";
import { LoggerFalso, hasherFalso } from "@/core/auth/testing/dobles";
import { UsuarioRepositoryEnMemoria } from "@/core/auth/testing/UsuarioRepositoryEnMemoria";
import { CreatePerfilUseCase } from "@/core/perfiles/application/CreatePerfilUseCase";
import { PerfilRepositoryEnMemoria, ProcesadorFalso } from "@/core/perfiles/testing/dobles";
import type { Actor } from "@/shared/domain/Actor";
import { ErrorArchivoMuyGrande } from "@/shared/domain/errors";
import type { IImageProcessor } from "@/shared/domain/IImageProcessor";
import { CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO, TAMANO_MAX_IMAGEN_DRIVE_BYTES, type TipoImagen } from "@/shared/domain/imagenes";
import { ImageStorageEnMemoria } from "@/shared/infrastructure/ImageStorageEnMemoria";
import { FakeClock } from "@/shared/testing/FakeClock";
import { construirFila } from "../domain/FilaImportacion";
import { ErrorConexionGoogle } from "../domain/IArchivosDrive";
import { CIUDADES, RUBROS, catalogoEnMemoria, celdasDePrueba } from "../testing/dobles";
import { DriveFalso } from "../testing/DriveFalso";
import {
  ImportarEmprendedorasUseCase,
  MAXIMO_DE_FILAS_POR_TANDA,
  MAXIMO_DE_FILAS_POR_TANDA_CON_IMAGENES,
  type FilaAImportar,
} from "./ImportarEmprendedoras";

// Regla 22 (2026-10-09), «Imágenes desde Drive»: la importación descarga la foto y el logo de cada fila con la cuenta de Google
// conectada. Una imagen que no se puede traer deja la predeterminada y un aviso, nunca detiene la fila.

const admin: Actor = { id: "admin-1", rol: "Admin" };
const AHORA = new Date("2026-10-09T12:00:00Z");
const idDe = (n: number, cual: "F" | "L") => `1${cual === "F" ? "Foto" : "Logo"}${String(n).padStart(3, "0")}XXXXXXXXXXXXXXXXXXXXXXXXXXXX`;

const fila = (numero: number, conImagenes = true, parches = {}): FilaAImportar => {
  const base = construirFila(celdasDePrueba({ correo: `persona${numero}@ejemplo.com`, ...parches }), { ciudades: CIUDADES, rubros: RUBROS }).datos;
  return { fila: numero, datos: { ...base, fotoDriveId: conImagenes ? idDe(numero, "F") : "", logoDriveId: conImagenes ? idDe(numero, "L") : "" } };
};

function construir(opciones: { drive?: DriveFalso; procesador?: IImageProcessor; sinPerfilesValidos?: boolean } = {}) {
  const drive = opciones.drive ?? new DriveFalso();
  const usuarios = new UsuarioRepositoryEnMemoria();
  const perfiles = new PerfilRepositoryEnMemoria(
    [],
    opciones.sinPerfilesValidos ? [] : CIUDADES.map((c) => c.id),
    RUBROS.map((r) => r.id),
  );
  const almacenamiento = new ImageStorageEnMemoria();
  const logger = new LoggerFalso();
  const clock = new FakeClock(AHORA);
  const procesador = opciones.procesador ?? new ProcesadorFalso();
  let contador = 0;
  const crearUsuario = new CreateUsuarioUseCase(usuarios, hasherFalso, clock, logger, () => `Temporal-${++contador}`);
  const crearPerfil = new CreatePerfilUseCase(perfiles, usuarios, procesador, almacenamiento, clock, logger);
  const caso = new ImportarEmprendedorasUseCase(usuarios, catalogoEnMemoria, crearUsuario, crearPerfil, logger, drive, procesador);
  return { caso, drive, usuarios, perfiles, almacenamiento, logger };
}

describe("importar con imágenes de Drive: lo que sale bien", () => {
  it("descarga la foto y el logo, los procesa (foto 800 px, logo 512 px), los sube a R2 y el perfil usa esas claves", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F"), { contenido: "pixeles-de-la-foto" }).agregar(idDe(2, "L"), { contenido: "pixeles-del-logo" });
    const procesador = new ProcesadorFalso();
    const { caso, perfiles, almacenamiento } = construir({ drive, procesador });

    const [r] = await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(r).toMatchObject({ estado: "creada", fotoCargada: true, logoCargado: true, avisos: [] });
    expect(procesador.procesados).toEqual(
      expect.arrayContaining([
        { entrada: "pixeles-de-la-foto", tipo: "perfil" satisfies TipoImagen },
        { entrada: "pixeles-del-logo", tipo: "logo" satisfies TipoImagen },
      ]),
    );
    const perfil = perfiles.perfiles[0];
    expect(perfil.fotoPerfilKey).toMatch(/^perfiles\/.+\.webp$/);
    expect(perfil.logoKey).toMatch(/^logos\/.+\.webp$/);
    expect(almacenamiento.claves().sort()).toEqual([perfil.fotoPerfilKey, perfil.logoKey].sort());
  });

  it("la imagen se procesa una sola vez: lo que se guarda es el WebP que salió del proceso, sin volver a procesarlo", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F"), { contenido: "foto" }).agregar(idDe(2, "L"), { contenido: "logo" });
    const procesador = new ProcesadorFalso();
    const { caso } = construir({ drive, procesador });

    await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(procesador.procesados).toHaveLength(2);
    expect(procesador.procesados.every((p) => !p.entrada.startsWith("webp("))).toBe(true);
  });

  it("pide el tope de 20 MB para la descarga y para el proceso (la excepción de la regla 16)", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F")).agregar(idDe(2, "L"));
    const topes: (number | undefined)[] = [];
    const procesador: IImageProcessor = {
      async procesar(entrada, _tipo, opciones) {
        topes.push(opciones?.tamanoMaxBytes);
        return Buffer.from(`webp:${entrada.toString()}`);
      },
    };
    const { caso } = construir({ drive, procesador });

    await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(topes).toEqual([TAMANO_MAX_IMAGEN_DRIVE_BYTES, TAMANO_MAX_IMAGEN_DRIVE_BYTES]);
  });

  it("una fila sin enlaces no descarga nada y queda con las predeterminadas, sin aviso", async () => {
    const drive = new DriveFalso();
    const { caso, perfiles, almacenamiento } = construir({ drive });

    const [r] = await caso.ejecutar(admin, [fila(2, false)], drive.tokenValido);

    expect(r).toMatchObject({ estado: "creada", fotoCargada: false, logoCargado: false, avisos: [] });
    expect(drive.descargas).toEqual([]);
    expect(perfiles.perfiles[0]).toMatchObject({ fotoPerfilKey: CLAVE_FOTO_PERFIL_PREDETERMINADA, logoKey: CLAVE_LOGO_PREDETERMINADO });
    expect(almacenamiento.claves()).toEqual([]);
  });

  it("foto y logo se bajan a la vez pero nunca más de 2 descargas simultáneas, aunque la tanda tenga 5 filas", async () => {
    const drive = new DriveFalso();
    const filas = [2, 3, 4, 5, 6].map((n) => {
      drive.agregar(idDe(n, "F")).agregar(idDe(n, "L"));
      return fila(n);
    });
    const { caso } = construir({ drive });

    const resultados = await caso.ejecutar(admin, filas, drive.tokenValido);

    expect(resultados.every((r) => r.estado === "creada" && r.fotoCargada && r.logoCargado)).toBe(true);
    expect(drive.maximoSimultaneas).toBe(2);
  });
});

describe("importar con imágenes de Drive: una imagen que falla nunca detiene la fila", () => {
  it("sin acceso a la foto: queda la foto predeterminada con su aviso, el logo sí se carga y la fila se crea", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F"), { sinAcceso: true }).agregar(idDe(2, "L"));
    const { caso, perfiles, almacenamiento } = construir({ drive });

    const [r] = await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(r).toMatchObject({ estado: "creada", cuentaCreada: true, perfilCreado: true, fotoCargada: false, logoCargado: true });
    expect(r.avisos.map((a) => [a.campo, a.codigo, a.severidad, a.reporte])).toEqual([["foto", "foto_sin_acceso", "revisar", true]]);
    expect(perfiles.perfiles[0].fotoPerfilKey).toBe(CLAVE_FOTO_PERFIL_PREDETERMINADA);
    expect(perfiles.perfiles[0].logoKey).toMatch(/^logos\//);
    expect(almacenamiento.claves()).toEqual([perfiles.perfiles[0].logoKey]);
  });

  it("un archivo que no es una imagen (el proceso lo rechaza) deja la predeterminada y avisa que no es una imagen", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F"), { contenido: "invalida" }).agregar(idDe(2, "L"));
    const { caso, perfiles } = construir({ drive });

    const [r] = await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(r).toMatchObject({ estado: "creada", fotoCargada: false, logoCargado: true });
    expect(r.avisos).toMatchObject([{ campo: "foto", codigo: "foto_no_es_imagen" }]);
    expect(perfiles.perfiles[0].fotoPerfilKey).toBe(CLAVE_FOTO_PERFIL_PREDETERMINADA);
  });

  it("un archivo que pasa de 20 MB (Drive lo corta al bajarlo) deja la predeterminada y avisa", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "L"), { fallaAlDescargar: "muy_grande" }).agregar(idDe(2, "F"));
    const { caso } = construir({ drive });

    const [r] = await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(r).toMatchObject({ estado: "creada", fotoCargada: true, logoCargado: false });
    expect(r.avisos).toMatchObject([{ campo: "logo", codigo: "logo_muy_grande" }]);
    expect(r.avisos[0].mensaje).toContain("20 MB");
  });

  it("si el proceso de imágenes dice que el archivo es muy grande, el aviso dice cuánto pesaba", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F"), { contenido: Buffer.alloc(7 * 1024 * 1024) }).agregar(idDe(2, "L"));
    const procesador: IImageProcessor = {
      async procesar(entrada, tipo) {
        if (tipo === "perfil") throw new ErrorArchivoMuyGrande();
        return entrada;
      },
    };
    const { caso } = construir({ drive, procesador });

    const [r] = await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(r.avisos).toMatchObject([{ campo: "foto", codigo: "foto_muy_grande" }]);
    expect(r.avisos[0].mensaje).toContain("7 MB");
  });

  it("un fallo de red o de Google deja la predeterminada, avisa y registra solo el tipo del error (nunca el id ni el token)", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F"), { fallaAlDescargar: "error" }).agregar(idDe(2, "L"));
    const { caso, logger } = construir({ drive });

    const [r] = await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(r.avisos).toMatchObject([{ campo: "foto", codigo: "foto_no_se_descargo" }]);
    const texto = JSON.stringify(logger.registros);
    expect(texto).not.toContain(idDe(2, "F"));
    expect(texto).not.toContain(drive.tokenValido);
    expect(logger.registros.some((x) => x.evento === "importacion_imagen_fallida")).toBe(true);
  });

  it("las dos imágenes pueden fallar: la fila se crea igual con las dos predeterminadas y los dos avisos", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F"), { sinAcceso: true }).agregar(idDe(2, "L"), { sinAcceso: true });
    const { caso, perfiles, almacenamiento } = construir({ drive });

    const [r] = await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(r).toMatchObject({ estado: "creada", fotoCargada: false, logoCargado: false });
    expect(r.avisos.map((a) => a.codigo)).toEqual(["foto_sin_acceso", "logo_sin_acceso"]);
    expect(perfiles.perfiles[0]).toMatchObject({ fotoPerfilKey: CLAVE_FOTO_PERFIL_PREDETERMINADA, logoKey: CLAVE_LOGO_PREDETERMINADO });
    expect(almacenamiento.claves()).toEqual([]);
  });

  it("el fallo de una fila no afecta a las demás de la tanda", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F"), { sinAcceso: true }).agregar(idDe(2, "L"));
    drive.agregar(idDe(3, "F")).agregar(idDe(3, "L"));
    const { caso } = construir({ drive });

    const resultados = await caso.ejecutar(admin, [fila(2), fila(3)], drive.tokenValido);

    expect(resultados.map((r) => [r.fila, r.estado, r.fotoCargada, r.logoCargado])).toEqual([
      [2, "creada", false, true],
      [3, "creada", true, true],
    ]);
  });

  it("sin cuenta conectada: la fila se crea con las predeterminadas y avisa que no había conexión (no consulta Drive)", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F")).agregar(idDe(2, "L"));
    const { caso } = construir({ drive });

    const [r] = await caso.ejecutar(admin, [fila(2)], null);

    expect(r).toMatchObject({ estado: "creada", fotoCargada: false, logoCargado: false });
    expect(r.avisos.map((a) => a.codigo)).toEqual(["foto_sin_conexion", "logo_sin_conexion"]);
    expect(drive.consultas).toEqual([]);
    expect(drive.descargas).toEqual([]);
  });

  it("sin cuenta de Google en el servidor (sin Drive configurado) pasa lo mismo: nada se descarga y la fila se crea", async () => {
    const usuarios = new UsuarioRepositoryEnMemoria();
    const logger = new LoggerFalso();
    const clock = new FakeClock(AHORA);
    const perfiles = new PerfilRepositoryEnMemoria([], CIUDADES.map((c) => c.id), RUBROS.map((r) => r.id));
    const procesador = new ProcesadorFalso();
    const caso = new ImportarEmprendedorasUseCase(
      usuarios,
      catalogoEnMemoria,
      new CreateUsuarioUseCase(usuarios, hasherFalso, clock, logger, () => "Temporal-1"),
      new CreatePerfilUseCase(perfiles, usuarios, procesador, new ImageStorageEnMemoria(), clock, logger),
      logger,
    );

    const [r] = await caso.ejecutar(admin, [fila(2)], "ya29.cualquiera-aunque-no-haya-drive-0000000");

    expect(r).toMatchObject({ estado: "creada", fotoCargada: false, logoCargado: false });
    expect(r.avisos.map((a) => a.codigo)).toEqual(["foto_sin_conexion", "logo_sin_conexion"]);
  });
});

describe("importar con imágenes de Drive: nada queda a medias", () => {
  it("si la conexión con Google ya no vale, avisa ANTES de crear nada y la tanda se puede repetir entera", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F")).agregar(idDe(2, "L"));
    const { caso, usuarios, perfiles } = construir({ drive });

    await expect(caso.ejecutar(admin, [fila(2)], "ya29.token-vencido-0000000000000000000000")).rejects.toBeInstanceOf(ErrorConexionGoogle);

    expect(usuarios.usuarios).toHaveLength(0);
    expect(perfiles.perfiles).toHaveLength(0);
    expect(drive.descargas).toEqual([]);
  });

  it("el error de conexión vencida trae el campo `google`, para que el frontend pida volver a conectar", async () => {
    const { caso } = construir();

    const error = await caso.ejecutar(admin, [fila(2)], "ya29.token-vencido-0000000000000000000000").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorConexionGoogle);
    expect((error as ErrorConexionGoogle).codigo).toBe("CONFLICTO");
    expect((error as ErrorConexionGoogle).detalles?.[0].campo).toBe("google");
  });

  it("una fila cuyo correo ya existe se omite sin descargar nada ni subir nada a R2", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F")).agregar(idDe(2, "L"));
    const { caso, almacenamiento } = construir({ drive });
    await caso.ejecutar(admin, [fila(2, false)], null);
    drive.descargas.length = 0;

    const [r] = await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(r.estado).toBe("omitida");
    expect(drive.descargas).toEqual([]);
    expect(almacenamiento.claves()).toEqual([]);
  });

  it("si el alta del perfil falla después de procesar las imágenes, no queda ninguna en R2", async () => {
    const drive = new DriveFalso().agregar(idDe(2, "F")).agregar(idDe(2, "L"));
    const { caso, almacenamiento } = construir({ drive, sinPerfilesValidos: true });

    const [r] = await caso.ejecutar(admin, [fila(2)], drive.tokenValido);

    expect(r).toMatchObject({ estado: "error", cuentaCreada: true, perfilCreado: false, fotoCargada: false, logoCargado: false });
    expect(almacenamiento.claves()).toEqual([]);
  });

  it("con imágenes de Drive la tanda es de 5 filas; sin token (o sin enlaces) sigue siendo de 10", async () => {
    expect(MAXIMO_DE_FILAS_POR_TANDA).toBe(10);
    expect(MAXIMO_DE_FILAS_POR_TANDA_CON_IMAGENES).toBe(5);
    const drive = new DriveFalso();
    const { caso, usuarios } = construir({ drive });

    const seis = [2, 3, 4, 5, 6, 7].map((n) => fila(n));
    await expect(caso.ejecutar(admin, seis, drive.tokenValido)).rejects.toMatchObject({ codigo: "VALIDACION" });
    expect(usuarios.usuarios).toHaveLength(0);

    // Sin enlaces, el tope de 5 no aplica aunque haya token.
    const sinEnlaces = [2, 3, 4, 5, 6, 7].map((n) => fila(n, false));
    expect(await caso.ejecutar(admin, sinEnlaces, drive.tokenValido)).toHaveLength(6);
  });
});
