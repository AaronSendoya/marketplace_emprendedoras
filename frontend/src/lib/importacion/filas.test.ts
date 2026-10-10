import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aFilaEditable,
  aplicarImagenesVerificadas,
  aplicarValidacion,
  avisosDelReporte,
  estadoDeImagen,
  filasPorVerificar,
  olvidarComprobacionDeImagenes,
  reducirFilas,
  resumenDeImagenes,
  tieneEnlaceDeDrive,
  type FilaEditable,
} from "./filas.ts";

type Aviso = FilaEditable["avisos"][number];

const aviso = (campo: string, codigo: string, severidad: Aviso["severidad"] = "revisar", reporte = true): Aviso => ({
  campo,
  codigo,
  severidad,
  mensaje: `Mensaje de ${codigo}.`,
  reporte,
});

const datos = (parches: Partial<FilaEditable["datos"]> = {}): FilaEditable["datos"] => ({
  correo: "ana@gmail.com",
  nombres: "Ana",
  apellido_paterno: "Pérez",
  apellido_materno: "",
  whatsapp: "59171234567",
  ciudad_id: "ciudad-1",
  ciudad_texto: "La Paz",
  rubro_id: "rubro-1",
  rubro_texto: "Comercio",
  nombre_negocio: "Dulces de Ana",
  descripcion: "Postres",
  instagram: "dulcesdeana",
  otra_red_social: "",
  foto_drive_id: "",
  logo_drive_id: "",
  ...parches,
});

const fila = (numero: number, parches: Partial<FilaEditable["datos"]> = {}, avisos: Aviso[] = [], estado: FilaEditable["estado"] = "lista"): FilaEditable =>
  aFilaEditable({
    fila: numero,
    oculta: false,
    estado,
    datos: datos(parches),
    avisos,
    ya_existe: estado === "ya_existe",
    repetida_de: null,
    textos: { instagram: "", otra_red: "" },
  });

const FOTO = "1aBcDeFgHiJkLmNoPqRs";
const LOGO = "1tUvWxYzAbCdEfGhIjKl";

const ok = { estado: "ok", aviso: null } as const;
const sinImagen = { estado: "sin_imagen", aviso: null } as const;
const problema = (campo: string, codigo: string) => ({ estado: "problema", aviso: aviso(campo, codigo) }) as const;

describe("estadoDeImagen", () => {
  it("sin enlace es sin_imagen; con enlace y sin comprobar, sin_comprobar", () => {
    const f = fila(2, { foto_drive_id: FOTO });
    assert.equal(estadoDeImagen(f, "foto"), "sin_comprobar");
    assert.equal(estadoDeImagen(f, "logo"), "sin_imagen");
  });

  it("un aviso del análisis (enlace inválido) es un problema aunque no haya id", () => {
    const f = fila(2, {}, [aviso("logo", "logo_enlace_invalido")], "revisar");
    assert.equal(estadoDeImagen(f, "logo"), "problema");
    assert.equal(estadoDeImagen(f, "foto"), "sin_imagen");
  });
});

describe("aplicarImagenesVerificadas", () => {
  it("un problema pasa a ser advertencia de la fila: la deja «para revisar», no «con error»", () => {
    const f = fila(2, { foto_drive_id: FOTO, logo_drive_id: LOGO });
    const r = aplicarImagenesVerificadas(f, { fila: 2, foto: problema("foto", "foto_sin_acceso"), logo: ok });

    assert.equal(r.estado, "revisar");
    assert.deepEqual(r.avisos.map((a) => a.codigo), ["foto_sin_acceso"]);
    assert.equal(estadoDeImagen(r, "foto"), "problema");
    assert.equal(estadoDeImagen(r, "logo"), "ok");
    assert.deepEqual(r.imagenesComprobadas, { foto: false, logo: true });
  });

  it("volver a comprobar reemplaza lo anterior y deja la fila «lista» si ya no hay problema", () => {
    const f = fila(2, { foto_drive_id: FOTO });
    const primero = aplicarImagenesVerificadas(f, { fila: 2, foto: problema("foto", "foto_sin_acceso"), logo: sinImagen });
    const segundo = aplicarImagenesVerificadas(primero, { fila: 2, foto: ok, logo: sinImagen });

    assert.equal(segundo.estado, "lista");
    assert.deepEqual(segundo.avisos, []);
    assert.equal(estadoDeImagen(segundo, "foto"), "ok");
  });

  it("no toca los avisos del análisis (el enlace que no servía) ni los de otros datos", () => {
    const analisis = [aviso("logo", "logo_enlace_invalido"), aviso("instagram", "instagram_supuesto")];
    const f = fila(2, { foto_drive_id: FOTO }, analisis, "revisar");
    const r = aplicarImagenesVerificadas(f, { fila: 2, foto: problema("foto", "foto_muy_grande"), logo: sinImagen });

    assert.deepEqual(r.avisos.map((a) => a.codigo).sort(), ["foto_muy_grande", "instagram_supuesto", "logo_enlace_invalido"]);
  });

  it("una fila con error sigue con error", () => {
    const f = fila(2, { foto_drive_id: FOTO }, [aviso("correo", "correo_invalido", "error", false)], "error");
    const r = aplicarImagenesVerificadas(f, { fila: 2, foto: ok, logo: sinImagen });

    assert.equal(r.estado, "error");
    assert.equal(r.elegida, false);
  });

  it("una fila que se omite no cambia", () => {
    const f = fila(2, { foto_drive_id: FOTO }, [], "ya_existe");
    assert.equal(aplicarImagenesVerificadas(f, { fila: 2, foto: problema("foto", "foto_sin_acceso"), logo: sinImagen }), f);
  });

  it("no cambia si la fila estaba elegida", () => {
    const f = fila(2, { foto_drive_id: FOTO });
    assert.equal(f.elegida, true);
    assert.equal(aplicarImagenesVerificadas(f, { fila: 2, foto: problema("foto", "foto_no_es_imagen"), logo: sinImagen }).elegida, true);
  });
});

describe("olvidarComprobacionDeImagenes", () => {
  it("quita lo que puso la comprobación y deja las imágenes «sin comprobar»", () => {
    const f = aplicarImagenesVerificadas(fila(2, { foto_drive_id: FOTO, logo_drive_id: LOGO }), {
      fila: 2,
      foto: problema("foto", "foto_sin_acceso"),
      logo: ok,
    });
    const r = olvidarComprobacionDeImagenes(f);

    assert.equal(r.estado, "lista");
    assert.deepEqual(r.avisos, []);
    assert.equal(estadoDeImagen(r, "foto"), "sin_comprobar");
    assert.equal(estadoDeImagen(r, "logo"), "sin_comprobar");
  });

  it("una fila sin nada comprobado queda tal cual (misma referencia)", () => {
    const f = fila(2, { foto_drive_id: FOTO });
    assert.equal(olvidarComprobacionDeImagenes(f), f);
  });
});

describe("reducirFilas con imágenes", () => {
  it("imagenesVerificadas aplica a cada fila por su número", () => {
    const filas = [fila(2, { foto_drive_id: FOTO }), fila(3, { logo_drive_id: LOGO })];
    const r = reducirFilas(filas, {
      tipo: "imagenesVerificadas",
      filas: [{ fila: 3, foto: sinImagen, logo: problema("logo", "logo_no_es_imagen") }],
    });

    assert.equal(r[0], filas[0]);
    assert.equal(r[1].estado, "revisar");
  });

  it("imagenesSinComprobar las deja a todas sin comprobar", () => {
    const comprobadas = reducirFilas([fila(2, { foto_drive_id: FOTO })], {
      tipo: "imagenesVerificadas",
      filas: [{ fila: 2, foto: ok, logo: sinImagen }],
    });
    const r = reducirFilas(comprobadas, { tipo: "imagenesSinComprobar" });

    assert.equal(estadoDeImagen(r[0], "foto"), "sin_comprobar");
  });

  it("corregir un dato y volver a validar no borra el problema de la imagen", () => {
    const comprobada = aplicarImagenesVerificadas(fila(2, { foto_drive_id: FOTO }), { fila: 2, foto: problema("foto", "foto_sin_acceso"), logo: sinImagen });
    const validada = aplicarValidacion(comprobada, comprobada.version, { fila: 2, estado: "lista", avisos: [], ya_existe: false });

    assert.equal(validada.estado, "revisar");
    assert.deepEqual(validada.avisos.map((a) => a.codigo), ["foto_sin_acceso"]);
  });
});

describe("filasPorVerificar y tieneEnlaceDeDrive", () => {
  it("solo las filas que se importan y traen algún enlace", () => {
    const filas = [
      fila(2, { foto_drive_id: FOTO }),
      fila(3),
      fila(4, { logo_drive_id: LOGO }, [], "ya_existe"),
      fila(5, { foto_drive_id: FOTO, logo_drive_id: LOGO }, [aviso("correo", "correo_invalido", "error", false)], "error"),
    ];

    assert.deepEqual(filasPorVerificar(filas), [
      { fila: 2, foto_drive_id: FOTO, logo_drive_id: "" },
      { fila: 5, foto_drive_id: FOTO, logo_drive_id: LOGO },
    ]);
    assert.equal(tieneEnlaceDeDrive(filas[1]), false);
    assert.equal(tieneEnlaceDeDrive(filas[0]), true);
  });
});

describe("resumenDeImagenes", () => {
  it("cuenta lo que se cargará, lo que tiene problema y lo que falta comprobar; las filas omitidas no cuentan", () => {
    const comprobada = aplicarImagenesVerificadas(fila(2, { foto_drive_id: FOTO, logo_drive_id: LOGO }), {
      fila: 2,
      foto: ok,
      logo: problema("logo", "logo_sin_acceso"),
    });
    const filas = [
      comprobada,
      fila(3, { foto_drive_id: FOTO }),
      fila(4, {}, [aviso("foto", "foto_enlace_invalido")], "revisar"),
      fila(5, { foto_drive_id: FOTO }, [], "ya_existe"),
      fila(6),
    ];

    assert.deepEqual(resumenDeImagenes(filas), { filasConEnlace: 3, conEnlace: 4, ok: 1, sinComprobar: 1, conProblema: 2, sinAcceso: 1 });
  });
});

describe("avisosDelReporte", () => {
  it("de las imágenes vale lo que pasó al importar, no lo que dijo la vista previa", () => {
    const previa = aplicarImagenesVerificadas(fila(2, { foto_drive_id: FOTO, logo_drive_id: LOGO }), {
      fila: 2,
      foto: problema("foto", "foto_sin_acceso"),
      logo: ok,
    });

    // En la vista previa la foto no tenía acceso; al importar se pudo cargar. El logo falló al descargarse.
    const resultado = { avisos: [aviso("logo", "logo_no_se_descargo")] };

    assert.deepEqual(avisosDelReporte(previa, resultado).map((a) => a.codigo), ["logo_no_se_descargo"]);
  });

  it("conserva el enlace inválido del análisis y las suposiciones de otros datos, sin duplicar", () => {
    const f = fila(2, {}, [aviso("foto", "foto_enlace_invalido"), aviso("instagram", "instagram_supuesto")], "revisar");
    const resultado = { avisos: [aviso("foto", "foto_enlace_invalido")] };

    assert.deepEqual(avisosDelReporte(f, resultado).map((a) => a.codigo), ["foto_enlace_invalido", "instagram_supuesto"]);
  });

  it("sin nada que mirar, queda vacío", () => {
    assert.deepEqual(avisosDelReporte(fila(2, { foto_drive_id: FOTO }), { avisos: [] }), []);
  });
});
