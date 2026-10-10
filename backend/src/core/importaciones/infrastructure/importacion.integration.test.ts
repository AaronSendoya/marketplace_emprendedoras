import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CreateUsuarioUseCase } from "@/core/auth/application/CreateUsuarioUseCase";
import { generarPasswordTemporal } from "@/core/auth/infrastructure/generarPasswordTemporal";
import { MySqlUsuarioRepository } from "@/core/auth/infrastructure/MySqlUsuarioRepository";
import { LoggerFalso, hasherFalso } from "@/core/auth/testing/dobles";
import { MySqlCatalogoRepository } from "@/core/catalogos/infrastructure/MySqlCatalogoRepository";
import { CreatePerfilUseCase } from "@/core/perfiles/application/CreatePerfilUseCase";
import { MySqlPerfilRepository } from "@/core/perfiles/infrastructure/MySqlPerfilRepository";
import type { Actor } from "@/shared/domain/Actor";
import { CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO } from "@/shared/domain/imagenes";
import { ImageProcessorService } from "@/shared/infrastructure/ImageProcessorService";
import { ImageStorageEnMemoria } from "@/shared/infrastructure/ImageStorageEnMemoria";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { SystemClock } from "@/shared/infrastructure/SystemClock";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { AnalizarExcelEmprendedorasUseCase } from "../application/AnalizarExcelEmprendedoras";
import { ImportarEmprendedorasUseCase, type FilaAImportar } from "../application/ImportarEmprendedoras";
import { crearExcelDePrueba, filaDeFormulario } from "../testing/dobles";
import { DriveFalso } from "../testing/DriveFalso";
import { LectorExcelExceljs } from "./LectorExcelExceljs";

// Regla 22 contra MySQL de verdad: analizar un .xlsx, importar y comprobar lo que quedó en la base. Todo lleva un prefijo propio y
// se borra al terminar.
const cliente = new MySqlClient(urlDePruebas());
const prefijo = `imp-${randomUUID().slice(0, 8)}`;
const ciudadId = randomUUID();
const rubroId = randomUUID();
const rolId = randomUUID();
const admin: Actor = { id: randomUUID(), rol: "Admin" };
let creamosElRol = false;

const usuarios = new MySqlUsuarioRepository(cliente);
const perfiles = new MySqlPerfilRepository(cliente);
const catalogos = new MySqlCatalogoRepository(cliente);
const logger = new LoggerFalso();
const clock = new SystemClock();
const analizar = new AnalizarExcelEmprendedorasUseCase(new LectorExcelExceljs(), usuarios, catalogos);
const importar = new ImportarEmprendedorasUseCase(
  usuarios,
  catalogos,
  new CreateUsuarioUseCase(usuarios, hasherFalso, clock, logger, generarPasswordTemporal),
  new CreatePerfilUseCase(perfiles, usuarios, new ImageProcessorService(), new ImageStorageEnMemoria(), clock, logger),
  logger,
);

const correo = (clave: string) => `${prefijo}-${clave}@prueba.test`;
const ciudad = `${prefijo} Ciudad`;
const rubro = `${prefijo} Rubro`;

beforeAll(async () => {
  await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [ciudadId, ciudad]);
  await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [rubroId, rubro]);
  const existente = await cliente.consultar<{ id: string }>("SELECT id FROM roles WHERE nombre = 'Emprendedor'");
  if (existente.length === 0) {
    await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, 'Emprendedor')", [rolId]);
    creamosElRol = true;
  }
});

afterAll(async () => {
  await cliente.ejecutar("DELETE FROM perfiles_emprendedores WHERE nombre_negocio LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM usuarios WHERE email LIKE ?", [`${prefijo}-%`]);
  await cliente.ejecutar("DELETE FROM ciudades WHERE id = ?", [ciudadId]);
  await cliente.ejecutar("DELETE FROM rubros WHERE id = ?", [rubroId]);
  if (creamosElRol) await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [rolId]);
  await cliente.cerrar();
});

const excel = () =>
  crearExcelDePrueba({
    filas: [
      filaDeFormulario({ correo: correo("uno"), nombre: "María Ñandú Pérez Rojas", ciudad, rubro, emprendimiento: `${prefijo} Dulces`, descripcion: "Ñandú y café ☕ 😀", whatsapp: 7.1578947e7 }),
      filaDeFormulario({ correo: correo("dos"), nombre: "LUISA GUEIL JORDAN", ciudad, rubro, emprendimiento: `${prefijo} Tejidos`, ofrece: "No", beneficio: "", instagram: "No tengo" }),
      filaDeFormulario({ correo: correo("tres"), ciudad, rubro, emprendimiento: `${prefijo} Roto`, whatsapp: "hola" }),
    ],
    ocultas: [4],
  });

const aImportar = (filas: Awaited<ReturnType<typeof analizar.ejecutar>>["filas"]): FilaAImportar[] => filas.map(({ fila, datos }) => ({ fila, datos }));

describe("importación de emprendedoras contra MySQL (regla 22)", () => {
  it("analiza el Excel con las ciudades y rubros reales de la base, y marca lo que no se puede importar", async () => {
    const analisis = await analizar.ejecutar({ nombre: "emprendedoras.xlsx", contenido: await excel() });

    expect(analisis.resumen).toMatchObject({ total: 3, conError: 1, ocultas: 1 });
    expect(analisis.filas.map((f) => f.estado)).toEqual(["lista", "revisar", "error"]);
    expect(analisis.filas[0].datos).toMatchObject({ ciudadId, rubroId, whatsapp: "+59171578947", nombres: "María Ñandú", apellidoPaterno: "Pérez" });
    expect(analisis.filas[1].datos).toMatchObject({ nombres: "Luisa", apellidoPaterno: "Gueil", apellidoMaterno: "Jordan" });
    expect(analisis.filas[2].avisos[0].codigo).toBe("whatsapp_invalido");
  });

  it("importa solo las filas buenas: cuenta y perfil con imágenes predeterminadas, y ningún descuento", async () => {
    const analisis = await analizar.ejecutar({ nombre: "emprendedoras.xlsx", contenido: await excel() });

    const resultados = await importar.ejecutar(admin, aImportar(analisis.filas));

    expect(resultados.map((r) => r.estado)).toEqual(["creada", "creada", "error"]);
    expect(resultados[0].passwordTemporal).toMatch(/\S{8,}/);
    expect(resultados[2]).toMatchObject({ cuentaCreada: false, passwordTemporal: null });

    const cuentas = await cliente.consultar<{ email: string; rol: string; verificado: Date | null; nombres: string; apellido_materno: string | null }>(
      `SELECT u.email, r.nombre AS rol, u.email_verificado_en AS verificado, u.nombres, u.apellido_materno
       FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.email LIKE ? ORDER BY u.email`,
      [`${prefijo}-%`],
    );
    expect(cuentas.map((c) => c.email)).toEqual([correo("dos"), correo("uno")]);
    expect(cuentas.every((c) => c.rol === "Emprendedor" && c.verificado === null)).toBe(true);
    expect(cuentas.find((c) => c.email === correo("uno"))).toMatchObject({ nombres: "María Ñandú", apellido_materno: "Rojas" });

    const perfilesCreados = await cliente.consultar<{ nombre_negocio: string; whatsapp: string; foto: string; logo: string; descripcion: string; ciudad_id: string; instagram_username: string | null }>(
      `SELECT nombre_negocio, whatsapp, foto_perfil_key AS foto, logo_key AS logo, descripcion, ciudad_id, instagram_username
       FROM perfiles_emprendedores WHERE nombre_negocio LIKE ? ORDER BY nombre_negocio`,
      [`${prefijo}%`],
    );
    expect(perfilesCreados).toHaveLength(2);
    expect(perfilesCreados.every((p) => p.foto === CLAVE_FOTO_PERFIL_PREDETERMINADA && p.logo === CLAVE_LOGO_PREDETERMINADO && p.ciudad_id === ciudadId)).toBe(true);
    expect(perfilesCreados[0]).toMatchObject({ nombre_negocio: `${prefijo} Dulces`, whatsapp: "59171578947", descripcion: "Ñandú y café ☕ 😀", instagram_username: "dulcesdeana" });
    expect(perfilesCreados[1].instagram_username).toBeNull();

    // La primera fila del Excel decía «Sí» con "10% de descuento en tortas": no se registra, así que no hay descuentos (regla 22).
    const [{ total }] = await cliente.consultar<{ total: number | string }>(
      "SELECT COUNT(*) AS total FROM descuentos d JOIN perfiles_emprendedores p ON p.id = d.perfil_id WHERE p.nombre_negocio LIKE ?",
      [`${prefijo}%`],
    );
    expect(Number(total)).toBe(0);
  });

  it("repetir la importación no duplica nada: lo creado se detecta al analizar y se omite al importar", async () => {
    const analisis = await analizar.ejecutar({ nombre: "emprendedoras.xlsx", contenido: await excel() });

    expect(analisis.filas.map((f) => f.estado)).toEqual(["ya_existe", "ya_existe", "error"]);

    const resultados = await importar.ejecutar(admin, aImportar(analisis.filas));

    expect(resultados.map((r) => r.estado)).toEqual(["omitida", "omitida", "error"]);
    const [{ total }] = await cliente.consultar<{ total: number | string }>("SELECT COUNT(*) AS total FROM usuarios WHERE email LIKE ?", [`${prefijo}-%`]);
    expect(Number(total)).toBe(2);
  });

  it("los registros del importador no llevan correos, contraseñas ni nombres", () => {
    const todo = JSON.stringify(logger.registros.filter((r) => r.evento.startsWith("importacion_")));

    expect(todo).not.toContain(prefijo);
    expect(todo).not.toMatch(/Temporal|María|Luisa|@/);
  });
});

// Regla 22 (2026-10-09), «Imágenes desde Drive»: del enlace del Excel al perfil con su imagen en R2, con el procesador de imágenes real
// (sharp) y MySQL de verdad. Drive es el único doble.
class AlmacenQueRecuerda extends ImageStorageEnMemoria {
  readonly guardados = new Map<string, Buffer>();
  async guardar(clave: string, contenido: Buffer): Promise<void> {
    this.guardados.set(clave, contenido);
    return super.guardar(clave, contenido);
  }
}

describe("importación con imágenes de Drive contra MySQL (regla 22)", () => {
  const ID_FOTO = "1FotoDeIntegracionDeLaImportacionAAAA";
  const ID_LOGO = "1LogoDeIntegracionDeLaImportacionBBBB";
  const ID_NO_IMAGEN = "1ArchivoQueNoEsUnaImagenDeIntegrCCCC";
  const ID_AJENO = "1ArchivoSinAccesoDeIntegracionDDDDDDD";
  const enlace = (id: string) => `https://drive.google.com/open?id=${id}`;

  it("analiza los enlaces, descarga, procesa a WebP, sube a R2 y deja en el perfil las claves; lo que falla queda predeterminado con su aviso", async () => {
    const foto = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 200, g: 40, b: 40 } } }).jpeg().toBuffer();
    const logo = await sharp({ create: { width: 1000, height: 1000, channels: 3, background: { r: 30, g: 60, b: 200 } } }).png().toBuffer();
    const drive = new DriveFalso()
      .agregar(ID_FOTO, { contenido: foto, tipoMime: "image/jpeg" })
      .agregar(ID_LOGO, { contenido: logo, tipoMime: "image/png" })
      .agregar(ID_NO_IMAGEN, { contenido: Buffer.from("esto no es una imagen") });
    const almacen = new AlmacenQueRecuerda();
    const procesador = new ImageProcessorService();
    const importarConDrive = new ImportarEmprendedorasUseCase(
      usuarios,
      catalogos,
      new CreateUsuarioUseCase(usuarios, hasherFalso, clock, logger, generarPasswordTemporal),
      new CreatePerfilUseCase(perfiles, usuarios, procesador, almacen, clock, logger),
      logger,
      drive,
      procesador,
    );
    const contenido = await crearExcelDePrueba({
      filas: [
        filaDeFormulario({ correo: correo("img-ok"), ciudad, rubro, emprendimiento: `${prefijo} ConImagenes`, foto: enlace(ID_FOTO), logo: enlace(ID_LOGO) }),
        filaDeFormulario({ correo: correo("img-mal"), ciudad, rubro, emprendimiento: `${prefijo} ConProblemas`, foto: enlace(ID_NO_IMAGEN), logo: enlace(ID_AJENO) }),
        filaDeFormulario({ correo: correo("img-sin"), ciudad, rubro, emprendimiento: `${prefijo} SinEnlaces`, foto: "", logo: "" }),
      ],
    });

    const analisis = await analizar.ejecutar({ nombre: "emprendedoras.xlsx", contenido });
    expect(analisis.filas.map((f) => [f.datos.fotoDriveId, f.datos.logoDriveId])).toEqual([
      [ID_FOTO, ID_LOGO],
      [ID_NO_IMAGEN, ID_AJENO],
      ["", ""],
    ]);

    const resultados = await importarConDrive.ejecutar(admin, aImportar(analisis.filas), drive.tokenValido);

    expect(resultados.map((r) => [r.estado, r.fotoCargada, r.logoCargado])).toEqual([
      ["creada", true, true],
      ["creada", false, false],
      ["creada", false, false],
    ]);
    expect(resultados[0].avisos).toEqual([]);
    expect(resultados[1].avisos.map((a) => a.codigo)).toEqual(["foto_no_es_imagen", "logo_sin_acceso"]);
    expect(resultados[2].avisos).toEqual([]);

    const claves = await cliente.consultar<{ nombre_negocio: string; foto: string; logo: string }>(
      `SELECT nombre_negocio, foto_perfil_key AS foto, logo_key AS logo FROM perfiles_emprendedores WHERE nombre_negocio LIKE ? ORDER BY nombre_negocio`,
      [`${prefijo} %`],
    );
    const por = Object.fromEntries(claves.map((c) => [c.nombre_negocio.replace(`${prefijo} `, ""), c]));
    expect(por.ConImagenes.foto).toMatch(/^perfiles\/.+\.webp$/);
    expect(por.ConImagenes.logo).toMatch(/^logos\/.+\.webp$/);
    for (const sinCargar of [por.ConProblemas, por.SinEnlaces]) {
      expect(sinCargar).toMatchObject({ foto: CLAVE_FOTO_PERFIL_PREDETERMINADA, logo: CLAVE_LOGO_PREDETERMINADO });
    }

    // Lo que quedó en R2: solo las dos imágenes buenas, ya en WebP y dentro de los límites de la regla 16.
    expect([...almacen.guardados.keys()].sort()).toEqual([por.ConImagenes.foto, por.ConImagenes.logo].sort());
    const fotoGuardada = await sharp(almacen.guardados.get(por.ConImagenes.foto)).metadata();
    const logoGuardado = await sharp(almacen.guardados.get(por.ConImagenes.logo)).metadata();
    expect(fotoGuardada.format).toBe("webp");
    expect(Math.max(fotoGuardada.width ?? 0, fotoGuardada.height ?? 0)).toBe(800);
    expect(logoGuardado.format).toBe("webp");
    expect(Math.max(logoGuardado.width ?? 0, logoGuardado.height ?? 0)).toBe(512);
  }, 30_000);
});
