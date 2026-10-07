import type { ICatalogoRepository } from "@/core/catalogos/domain/ICatalogoRepository";
import type { IUsuarioRepository } from "@/core/auth/domain/IUsuarioRepository";
import { ErrorValidacion } from "@/shared/domain/errors";
import { validarArchivoExcel } from "../domain/ArchivoExcel";
import { AVISOS, type Aviso } from "../domain/Avisos";
import {
  COLUMNAS,
  FILAS_A_MIRAR_PARA_ENCABEZADO,
  MINIMO_COLUMNAS_PARA_ENCABEZADO,
  detectarEncabezados,
  faltantes,
  type ClaveColumna,
  type EncabezadosDetectados,
} from "../domain/ColumnasExcel";
import { construirFila, estadoDeAvisos, ordenarAvisos, type CeldasDeFila } from "../domain/FilaImportacion";
import type { FilaLeida, HojaLeida, ILectorExcel } from "../domain/ILectorExcel";
import type { EstadoFila, FilaAnalizada, ResultadoAnalisis } from "../domain/ResultadoAnalisis";

// Regla 22: tope de filas por importación.
export const MAXIMO_DE_FILAS_POR_IMPORTACION = 500;

const rechazar = (mensaje: string) => new ErrorValidacion(mensaje, [{ campo: "archivo", mensaje }]);

export const MENSAJES_ANALISIS = {
  sinFilas: "El archivo no tiene filas con datos debajo de los encabezados.",
  encabezadosNoEstanEnFila1: "Los encabezados no están en la primera fila. Borra las filas de arriba y vuelve a subirlo.",
  faltanColumnas: (nombres: string[]) =>
    nombres.length === 1
      ? `Falta la columna «${nombres[0]}». Los encabezados deben estar en la fila 1 y llamarse como en la guía.`
      : `Faltan las columnas ${nombres.map((nombre) => `«${nombre}»`).join(", ")}. Los encabezados deben estar en la fila 1 y llamarse como en la guía.`,
  demasiadasFilas: (filas: number) =>
    `El archivo tiene ${filas} filas y el máximo por importación es ${MAXIMO_DE_FILAS_POR_IMPORTACION}. Divídelo en partes.`,
};

interface HojaConEncabezados {
  hoja: HojaLeida;
  indiceEncabezado: number;
  deteccion: EncabezadosDetectados;
}

const columnasDistintas = (deteccion: EncabezadosDetectados) => Object.keys(deteccion.columnas).length;

// La hoja que tiene la fila de encabezados entre sus primeras filas. Si ninguna la tiene, devuelve la primera hoja con datos
// (con lo que se detectó en su primera fila) para decir qué columnas faltan.
function elegirHoja(hojas: HojaLeida[]): { encontrada: HojaConEncabezados | null; primeraConDatos: HojaConEncabezados | null } {
  let primeraConDatos: HojaConEncabezados | null = null;
  for (const hoja of hojas) {
    if (hoja.filas.length === 0) continue;
    const mirar = hoja.filas.slice(0, FILAS_A_MIRAR_PARA_ENCABEZADO);
    for (let indice = 0; indice < mirar.length; indice++) {
      const deteccion = detectarEncabezados(mirar[indice].celdas);
      if (indice === 0 && !primeraConDatos) primeraConDatos = { hoja, indiceEncabezado: 0, deteccion };
      if (columnasDistintas(deteccion) >= MINIMO_COLUMNAS_PARA_ENCABEZADO) return { encontrada: { hoja, indiceEncabezado: indice, deteccion }, primeraConDatos };
    }
  }
  return { encontrada: null, primeraConDatos };
}

function celdasDe(fila: FilaLeida, columnas: EncabezadosDetectados["columnas"]): CeldasDeFila {
  const celdas: CeldasDeFila = {};
  for (const [clave, indice] of Object.entries(columnas) as [ClaveColumna, number][]) celdas[clave] = fila.celdas[indice] ?? "";
  return celdas;
}

// Regla 22: lee el Excel y devuelve cada fila normalizada con sus avisos. No escribe nada.
export class AnalizarExcelEmprendedorasUseCase {
  constructor(
    private readonly lector: ILectorExcel,
    private readonly usuarios: Pick<IUsuarioRepository, "buscarPorEmail">,
    private readonly catalogos: ICatalogoRepository,
  ) {}

  async ejecutar(archivo: { nombre: string; contenido: Buffer }): Promise<ResultadoAnalisis> {
    validarArchivoExcel(archivo.nombre, archivo.contenido);
    const libro = await this.lector.leer(archivo.contenido);

    const { encontrada, primeraConDatos } = elegirHoja(libro.hojas);
    if (!encontrada) {
      if (!primeraConDatos) throw rechazar(MENSAJES_ANALISIS.sinFilas);
      throw rechazar(MENSAJES_ANALISIS.faltanColumnas(faltantes(primeraConDatos.deteccion).map((columna) => columna.nombre)));
    }
    if (encontrada.indiceEncabezado > 0) throw rechazar(MENSAJES_ANALISIS.encabezadosNoEstanEnFila1);

    const { hoja, deteccion } = encontrada;
    const columnasFaltantes = faltantes(deteccion);
    if (columnasFaltantes.length > 0) throw rechazar(MENSAJES_ANALISIS.faltanColumnas(columnasFaltantes.map((columna) => columna.nombre)));

    const filasDeDatos = hoja.filas.slice(encontrada.indiceEncabezado + 1);
    if (filasDeDatos.length === 0) throw rechazar(MENSAJES_ANALISIS.sinFilas);
    if (filasDeDatos.length > MAXIMO_DE_FILAS_POR_IMPORTACION) throw rechazar(MENSAJES_ANALISIS.demasiadasFilas(filasDeDatos.length));

    const [ciudades, rubros] = await Promise.all([this.catalogos.listarCiudades(), this.catalogos.listarRubros()]);
    const catalogos = { ciudades, rubros };

    const filas: FilaAnalizada[] = [];
    const primeraVezDeCada = new Map<string, number>();
    for (const fila of filasDeDatos) {
      const { datos, avisos, textos } = construirFila(celdasDe(fila, deteccion.columnas), catalogos);
      const todos: Aviso[] = [...avisos];

      let repetidaDe: number | null = null;
      let yaExiste = false;
      if (datos.correo) {
        const anterior = primeraVezDeCada.get(datos.correo);
        if (anterior !== undefined) {
          repetidaDe = anterior;
          todos.push(AVISOS.correoRepetido(anterior));
        } else {
          primeraVezDeCada.set(datos.correo, fila.numero);
          // Solo se consulta lo que tiene forma de correo: no tiene sentido buscar basura en la base.
          if (!avisos.some((aviso) => aviso.codigo === "correo_invalido")) {
            yaExiste = (await this.usuarios.buscarPorEmail(datos.correo)) !== null;
            if (yaExiste) todos.push(AVISOS.correoExistente());
          }
        }
      }
      if (fila.oculta) todos.push(AVISOS.filaOculta());

      const estado: EstadoFila = repetidaDe !== null ? "repetida" : yaExiste ? "ya_existe" : estadoDeAvisos(todos);
      filas.push({ fila: fila.numero, oculta: fila.oculta, estado, datos, avisos: ordenarAvisos(todos), yaExiste, repetidaDe, textos });
    }

    const contar = (estado: EstadoFila) => filas.filter((fila) => fila.estado === estado).length;
    return {
      hoja: hoja.nombre,
      hojas: libro.hojas.map((h) => h.nombre),
      columnas: {
        reconocidas: COLUMNAS.filter((columna) => deteccion.columnas[columna.clave] !== undefined).map((columna) => columna.nombre),
        ignoradas: deteccion.ignoradas,
        opcionalesAusentes: COLUMNAS.filter((columna) => !columna.obligatoria && deteccion.columnas[columna.clave] === undefined).map((columna) => columna.nombre),
      },
      filas,
      resumen: {
        total: filas.length,
        listas: contar("lista"),
        revisar: contar("revisar"),
        conError: contar("error"),
        yaExisten: contar("ya_existe"),
        repetidas: contar("repetida"),
        ocultas: filas.filter((fila) => fila.oculta).length,
      },
    };
  }
}
