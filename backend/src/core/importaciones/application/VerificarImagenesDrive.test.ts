import { describe, expect, it } from "vitest";
import { TAMANO_MAX_IMAGEN_DRIVE_BYTES } from "@/shared/domain/imagenes";
import { DriveFalso } from "../testing/DriveFalso";
import { VerificarImagenesDriveUseCase, type FilaAVerificar } from "./VerificarImagenesDrive";

const FOTO = "1FotoDeLaEmprendedoraUnoAAAAAAAAAA";
const LOGO = "1LogoDeLaEmprendedoraUnoBBBBBBBBBB";

const fila = (numero: number, fotoDriveId = "", logoDriveId = ""): FilaAVerificar => ({ fila: numero, fotoDriveId, logoDriveId });

describe("VerificarImagenesDriveUseCase (regla 22)", () => {
  it("con la cuenta conectada y acceso a los dos archivos, la foto y el logo salen «ok» y dice con qué cuenta", async () => {
    const drive = new DriveFalso().agregar(FOTO).agregar(LOGO, { tipoMime: "image/png" });

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO, LOGO)], drive.tokenValido);

    expect(r).toMatchObject({ conexion: "ok", cuenta: "empresa@gmail.com" });
    expect(r.filas[0]).toEqual({ fila: 2, foto: { estado: "ok", aviso: null }, logo: { estado: "ok", aviso: null } });
  });

  it("solo lee metadatos: no descarga ningún archivo", async () => {
    const drive = new DriveFalso().agregar(FOTO).agregar(LOGO);

    await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO, LOGO)], drive.tokenValido);

    expect(drive.descargas).toEqual([]);
    expect(drive.consultas.sort()).toEqual([FOTO, LOGO].sort());
  });

  it("una fila sin enlaces no consulta nada y queda «sin_imagen», sin aviso", async () => {
    const drive = new DriveFalso();

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2)], drive.tokenValido);

    expect(drive.consultas).toEqual([]);
    expect(r.filas[0]).toEqual({ fila: 2, foto: { estado: "sin_imagen", aviso: null }, logo: { estado: "sin_imagen", aviso: null } });
  });

  it("un mismo archivo que aparece en varias filas se consulta una sola vez", async () => {
    const drive = new DriveFalso().agregar(FOTO);

    await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO), fila(3, FOTO), fila(4, FOTO)], drive.tokenValido);

    expect(drive.consultas).toEqual([FOTO]);
  });

  it("sin acceso: el aviso nombra la cuenta conectada y dice qué hacer, y es una advertencia, no un error", async () => {
    const drive = new DriveFalso().agregar(FOTO, { sinAcceso: true });

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO)], drive.tokenValido);

    expect(r.filas[0].foto.estado).toBe("problema");
    expect(r.filas[0].foto.aviso).toMatchObject({ campo: "foto", codigo: "foto_sin_acceso", severidad: "revisar", reporte: true });
    expect(r.filas[0].foto.aviso?.mensaje).toContain("empresa@gmail.com");
    expect(r.filas[0].foto.aviso?.mensaje).toContain("Comparte la carpeta");
  });

  it("un archivo que no existe responde igual que uno sin acceso (Drive no distingue)", async () => {
    const drive = new DriveFalso();

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, "1ArchivoQueNoExisteAAAAAAAAAAAAAAA")], drive.tokenValido);

    expect(r.filas[0].foto.aviso?.codigo).toBe("foto_sin_acceso");
  });

  it("un archivo que la cuenta ve pero no puede descargar cuenta como sin acceso", async () => {
    const drive = new DriveFalso().agregar(FOTO, { puedeDescargar: false });

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO)], drive.tokenValido);

    expect(r.filas[0].foto.aviso?.codigo).toBe("foto_sin_acceso");
  });

  it.each([
    ["application/pdf", "un PDF"],
    ["image/heic", "una foto HEIC"],
    ["application/vnd.google-apps.folder", "una carpeta"],
  ])("un archivo %s no es una imagen: el aviso dice qué es", async (tipoMime, queEs) => {
    const drive = new DriveFalso().agregar(LOGO, { tipoMime });

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, "", LOGO)], drive.tokenValido);

    expect(r.filas[0].logo.aviso).toMatchObject({ campo: "logo", codigo: "logo_no_es_imagen", severidad: "revisar" });
    expect(r.filas[0].logo.aviso?.mensaje).toContain(queEs);
  });

  it("un archivo de más de 20 MB dice cuánto pesa y cuál es el máximo", async () => {
    const drive = new DriveFalso().agregar(FOTO, { bytes: TAMANO_MAX_IMAGEN_DRIVE_BYTES + 3 * 1024 * 1024 });

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO)], drive.tokenValido);

    expect(r.filas[0].foto.aviso).toMatchObject({ codigo: "foto_muy_grande" });
    expect(r.filas[0].foto.aviso?.mensaje).toMatch(/pesa 23 MB y el máximo es 20 MB/);
  });

  it("si Google falla al consultar, no se acusa al archivo: «no pudimos comprobar»", async () => {
    const drive = new DriveFalso().agregar(FOTO, { errorAlConsultar: true });

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO)], drive.tokenValido);

    expect(r.filas[0].foto.aviso?.codigo).toBe("foto_no_se_comprobo");
  });

  it("un problema en la foto no afecta al logo de la misma fila", async () => {
    const drive = new DriveFalso().agregar(FOTO, { sinAcceso: true }).agregar(LOGO);

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO, LOGO)], drive.tokenValido);

    expect(r.filas[0].foto.estado).toBe("problema");
    expect(r.filas[0].logo).toEqual({ estado: "ok", aviso: null });
  });

  it("sin token: no consulta nada y marca las imágenes como «sin_comprobar»", async () => {
    const drive = new DriveFalso().agregar(FOTO);

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO), fila(3)], null);

    expect(r).toMatchObject({ conexion: "sin_conexion", cuenta: null });
    expect(drive.consultas).toEqual([]);
    expect(r.filas[0].foto.estado).toBe("sin_comprobar");
    expect(r.filas[1].foto.estado).toBe("sin_imagen");
  });

  it("con un token que Google rechaza: conexión «vencida», sin avisos falsos de acceso", async () => {
    const drive = new DriveFalso().agregar(FOTO);

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar([fila(2, FOTO)], "ya29.token-que-ya-no-sirve-000000000000");

    expect(r.conexion).toBe("vencida");
    expect(r.filas[0].foto).toEqual({ estado: "sin_comprobar", aviso: null });
  });

  it("revisa muchas filas a la vez sin perder ninguna", async () => {
    const drive = new DriveFalso();
    const filas: FilaAVerificar[] = [];
    for (let i = 0; i < 25; i++) {
      const id = `1Archivo${String(i).padStart(2, "0")}AAAAAAAAAAAAAAAAAAAAAAAAA`;
      drive.agregar(id, i % 5 === 0 ? { sinAcceso: true } : {});
      filas.push(fila(i + 2, id));
    }

    const r = await new VerificarImagenesDriveUseCase(drive).ejecutar(filas, drive.tokenValido);

    expect(r.filas).toHaveLength(25);
    expect(r.filas.filter((f) => f.foto.estado === "problema")).toHaveLength(5);
    expect(r.filas.filter((f) => f.foto.estado === "ok")).toHaveLength(20);
    expect(r.filas.map((f) => f.fila)).toEqual(filas.map((f) => f.fila));
  });
});
