import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { AnalizarExcelEmprendedorasUseCase } from "@/core/importaciones/application/AnalizarExcelEmprendedoras";
import type { ImportarEmprendedorasUseCase, ResultadoDeFila } from "@/core/importaciones/application/ImportarEmprendedoras";
import { AVISOS } from "@/core/importaciones/domain/Avisos";
import { construirFila } from "@/core/importaciones/domain/FilaImportacion";
import type { ResultadoAnalisis } from "@/core/importaciones/domain/ResultadoAnalisis";
import { GeneradorPlantillaExceljs } from "@/core/importaciones/infrastructure/GeneradorPlantillaExceljs";
import { CIUDADES, RUBROS, celdasDePrueba } from "@/core/importaciones/testing/dobles";
import {
  TIPO_XLSX,
  analizarExcel,
  descargarPlantilla,
  filasDeCuerpo,
  importarEmprendedoras,
  serializarAviso,
  serializarDatosFila,
  serializarResultado,
} from "./importaciones.controller";

const datos = construirFila(celdasDePrueba(), { ciudades: CIUDADES, rubros: RUBROS }).datos;

describe("serializarDatosFila y filasDeCuerpo (regla 22)", () => {
  it("usa snake_case como el resto de la API", () => {
    expect(Object.keys(serializarDatosFila(datos)).sort()).toEqual(
      [
        "apellido_materno",
        "apellido_paterno",
        "ciudad_id",
        "ciudad_texto",
        "correo",
        "descripcion",
        "instagram",
        "nombre_negocio",
        "nombres",
        "otra_red_social",
        "rubro_id",
        "rubro_texto",
        "whatsapp",
      ].sort(),
    );
  });

  it("lo que sale de la API vuelve a entrar igual: ida y vuelta sin pérdidas", () => {
    const [{ datos: devuelto }] = filasDeCuerpo([{ fila: 2, datos: serializarDatosFila(datos) }]);

    expect(devuelto).toEqual(datos);
  });

  it("conserva el número de fila para relacionar la respuesta con la vista previa", () => {
    expect(filasDeCuerpo([{ fila: 17, datos: serializarDatosFila(datos) }])[0].fila).toBe(17);
  });
});

describe("serializarAviso", () => {
  it("el campo sale en snake_case y trae código, severidad, mensaje y si va al reporte", () => {
    expect(serializarAviso(AVISOS.instagramIrreconocible("Nutrimentos maybo"))).toEqual({
      campo: "instagram",
      codigo: "instagram_irreconocible",
      severidad: "revisar",
      mensaje: "No pudimos reconocer «Nutrimentos maybo» como un usuario de Instagram. Se dejará vacío; puedes escribirlo aquí.",
      reporte: true,
    });
    expect(serializarAviso(AVISOS.negocioVacio()).campo).toBe("nombre_negocio");
    expect(serializarAviso(AVISOS.nombreUnaPalabra()).campo).toBe("nombres");
  });
});

describe("serializarResultado: la contraseña temporal", () => {
  const resultado: ResultadoDeFila = {
    fila: 2,
    correo: "ana@ejemplo.com",
    estado: "creada",
    cuentaCreada: true,
    perfilCreado: true,
    passwordTemporal: "Temporal-1",
    avisos: [],
    mensaje: null,
  };

  it("sale en la respuesta de la importación, una vez", () => {
    expect(serializarResultado(resultado)).toEqual({
      fila: 2,
      correo: "ana@ejemplo.com",
      estado: "creada",
      cuenta_creada: true,
      perfil_creado: true,
      password_temporal: "Temporal-1",
      avisos: [],
      mensaje: null,
    });
  });

  it("una fila omitida o con error no trae contraseña", () => {
    expect(serializarResultado({ ...resultado, estado: "omitida", cuentaCreada: false, passwordTemporal: null }).password_temporal).toBeNull();
  });
});

describe("rutas de la importación", () => {
  it("analizarExcel pasa el archivo al caso de uso y responde con la vista previa en snake_case", async () => {
    let recibido: unknown;
    const analisis: ResultadoAnalisis = {
      hoja: "Hoja 1",
      hojas: ["Hoja 1"],
      columnas: { reconocidas: ["Correo"], ignoradas: ["Sube tu foto"], opcionalesAusentes: ["Instagram"] },
      filas: [{ fila: 2, oculta: true, estado: "lista", datos, avisos: [AVISOS.filaOculta()], yaExiste: false, repetidaDe: null, textos: { instagram: "" } }],
      resumen: { total: 1, listas: 1, revisar: 0, conError: 0, yaExisten: 0, repetidas: 0, ocultas: 1 },
    };
    const usecase = { ejecutar: async (archivo: unknown) => ((recibido = archivo), analisis) } as unknown as AnalizarExcelEmprendedorasUseCase;
    const archivo = { nombre: "datos.xlsx", contenido: Buffer.from("x") };

    const cuerpo = await analizarExcel(usecase, archivo).then((r) => r.json());

    expect(recibido).toBe(archivo);
    expect(cuerpo.columnas.opcionales_ausentes).toEqual(["Instagram"]);
    expect(cuerpo.resumen).toEqual({ total: 1, listas: 1, revisar: 0, con_error: 0, ya_existen: 0, repetidas: 0, ocultas: 1 });
    expect(cuerpo.filas[0]).toMatchObject({ fila: 2, oculta: true, ya_existe: false, repetida_de: null });
    expect(cuerpo.filas[0].datos.nombre_negocio).toBe("Dulces de Ana");
    expect(cuerpo.filas[0].avisos[0].campo).toBe("fila");
  });

  it("importarEmprendedoras pasa al Admin como actor y devuelve los resultados", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => ((recibido = args), [{ fila: 2, correo: "a@b.co", estado: "omitida", cuentaCreada: false, perfilCreado: false, passwordTemporal: null, avisos: [], mensaje: "ya existe" }]),
    } as unknown as ImportarEmprendedorasUseCase;

    const respuesta = await importarEmprendedoras(usecase, { id: "admin-1", rol: "Admin" }, filasDeCuerpo([{ fila: 2, datos: serializarDatosFila(datos) }]));

    expect(respuesta.status).toBe(200);
    expect(recibido[0]).toEqual({ id: "admin-1", rol: "Admin" });
    expect((await respuesta.json()).resultados[0]).toMatchObject({ fila: 2, estado: "omitida", mensaje: "ya existe" });
  });
});

describe("descargarPlantilla", () => {
  it("responde un .xlsx como adjunto, con el tipo y el tamaño correctos, que se puede abrir", async () => {
    const respuesta = await descargarPlantilla(new GeneradorPlantillaExceljs());
    const contenido = Buffer.from(await respuesta.arrayBuffer());

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe(TIPO_XLSX);
    expect(respuesta.headers.get("Content-Disposition")).toBe('attachment; filename="plantilla-emprendedoras.xlsx"');
    expect(respuesta.headers.get("Content-Length")).toBe(String(contenido.length));
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(contenido as unknown as ArrayBuffer);
    expect(libro.worksheets[0].rowCount).toBe(3);
  });
});
