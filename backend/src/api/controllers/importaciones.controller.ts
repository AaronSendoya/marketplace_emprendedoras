import { ok } from "@/api/http/respuestas";
import type { AnalizarExcelEmprendedorasUseCase } from "@/core/importaciones/application/AnalizarExcelEmprendedoras";
import type {
  FilaAImportar,
  ImportarEmprendedorasUseCase,
  ResultadoDeFila,
  ValidacionDeFila,
  ValidarFilasEmprendedorasUseCase,
} from "@/core/importaciones/application/ImportarEmprendedoras";
import type { Aviso, CampoFila } from "@/core/importaciones/domain/Avisos";
import type { DatosFila } from "@/core/importaciones/domain/FilaImportacion";
import type { IGeneradorPlantilla } from "@/core/importaciones/domain/ILectorExcel";
import type { FilaAnalizada, ResultadoAnalisis } from "@/core/importaciones/domain/ResultadoAnalisis";
import type { Actor } from "@/shared/domain/Actor";
import type { ArchivoSubido } from "@/api/http/multipart";

// Regla 22. El mismo nombre en snake_case que usa el resto de la API.
const CAMPO: Record<CampoFila, string> = {
  fila: "fila",
  correo: "correo",
  nombres: "nombres",
  apellidoPaterno: "apellido_paterno",
  apellidoMaterno: "apellido_materno",
  whatsapp: "whatsapp",
  ciudad: "ciudad",
  rubro: "rubro",
  nombreNegocio: "nombre_negocio",
  descripcion: "descripcion",
  instagram: "instagram",
  otraRedSocial: "otra_red_social",
};

export const serializarAviso = (aviso: Aviso) => ({
  campo: CAMPO[aviso.campo],
  codigo: aviso.codigo,
  severidad: aviso.severidad,
  mensaje: aviso.mensaje,
  reporte: aviso.reporte,
});

export const serializarDatosFila = (datos: DatosFila) => ({
  correo: datos.correo,
  nombres: datos.nombres,
  apellido_paterno: datos.apellidoPaterno,
  apellido_materno: datos.apellidoMaterno,
  whatsapp: datos.whatsapp,
  ciudad_id: datos.ciudadId,
  ciudad_texto: datos.ciudadTexto,
  rubro_id: datos.rubroId,
  rubro_texto: datos.rubroTexto,
  nombre_negocio: datos.nombreNegocio,
  descripcion: datos.descripcion,
  instagram: datos.instagram,
  otra_red_social: datos.otraRedSocial,
});

// Lo que llega en el cuerpo de `validar` e `importar`, ya validado por el esquema.
export interface DatosFilaDeCuerpo {
  correo: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  whatsapp: string;
  ciudad_id: string;
  ciudad_texto: string;
  rubro_id: string;
  rubro_texto: string;
  nombre_negocio: string;
  descripcion: string;
  instagram: string;
  otra_red_social: string;
}

export const filasDeCuerpo = (filas: { fila: number; datos: DatosFilaDeCuerpo }[]): FilaAImportar[] =>
  filas.map(({ fila, datos }) => ({
    fila,
    datos: {
      correo: datos.correo,
      nombres: datos.nombres,
      apellidoPaterno: datos.apellido_paterno,
      apellidoMaterno: datos.apellido_materno,
      whatsapp: datos.whatsapp,
      ciudadId: datos.ciudad_id,
      ciudadTexto: datos.ciudad_texto,
      rubroId: datos.rubro_id,
      rubroTexto: datos.rubro_texto,
      nombreNegocio: datos.nombre_negocio,
      descripcion: datos.descripcion,
      instagram: datos.instagram,
      otraRedSocial: datos.otra_red_social,
    },
  }));

const serializarFilaAnalizada = (fila: FilaAnalizada) => ({
  fila: fila.fila,
  oculta: fila.oculta,
  estado: fila.estado,
  datos: serializarDatosFila(fila.datos),
  avisos: fila.avisos.map(serializarAviso),
  ya_existe: fila.yaExiste,
  repetida_de: fila.repetidaDe,
  textos: { instagram: fila.textos.instagram, otra_red: fila.textos.otraRed },
});

export const serializarAnalisis = (resultado: ResultadoAnalisis) => ({
  hoja: resultado.hoja,
  hojas: resultado.hojas,
  columnas: {
    reconocidas: resultado.columnas.reconocidas,
    ignoradas: resultado.columnas.ignoradas,
    opcionales_ausentes: resultado.columnas.opcionalesAusentes,
    obligatorias_ausentes: resultado.columnas.obligatoriasAusentes,
    desconocidas: resultado.columnas.desconocidas,
    aproximadas: resultado.columnas.aproximadas,
  },
  filas: resultado.filas.map(serializarFilaAnalizada),
  resumen: {
    total: resultado.resumen.total,
    listas: resultado.resumen.listas,
    revisar: resultado.resumen.revisar,
    con_error: resultado.resumen.conError,
    ya_existen: resultado.resumen.yaExisten,
    repetidas: resultado.resumen.repetidas,
    ocultas: resultado.resumen.ocultas,
  },
});

const serializarValidacion = (validacion: ValidacionDeFila) => ({
  fila: validacion.fila,
  estado: validacion.estado,
  avisos: validacion.avisos.map(serializarAviso),
  ya_existe: validacion.yaExiste,
});

// La contraseña temporal sale solo aquí, una vez, y nunca se guarda en claro (regla 5).
export const serializarResultado = (resultado: ResultadoDeFila) => ({
  fila: resultado.fila,
  correo: resultado.correo,
  estado: resultado.estado,
  cuenta_creada: resultado.cuentaCreada,
  perfil_creado: resultado.perfilCreado,
  password_temporal: resultado.passwordTemporal,
  avisos: resultado.avisos.map(serializarAviso),
  mensaje: resultado.mensaje,
});

export async function analizarExcel(usecase: AnalizarExcelEmprendedorasUseCase, archivo: ArchivoSubido): Promise<Response> {
  return ok(serializarAnalisis(await usecase.ejecutar(archivo)));
}

export async function validarFilas(usecase: ValidarFilasEmprendedorasUseCase, filas: FilaAImportar[]): Promise<Response> {
  return ok({ filas: (await usecase.ejecutar(filas)).map(serializarValidacion) });
}

export async function importarEmprendedoras(usecase: ImportarEmprendedorasUseCase, admin: Actor, filas: FilaAImportar[]): Promise<Response> {
  return ok({ resultados: (await usecase.ejecutar(admin, filas)).map(serializarResultado) });
}

export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function descargarPlantilla(generador: IGeneradorPlantilla): Promise<Response> {
  const contenido = await generador.generar();
  return new Response(new Uint8Array(contenido), {
    status: 200,
    headers: {
      "Content-Type": TIPO_XLSX,
      "Content-Disposition": 'attachment; filename="plantilla-emprendedoras.xlsx"',
      "Content-Length": String(contenido.length),
    },
  });
}
