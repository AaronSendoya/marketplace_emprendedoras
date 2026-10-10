import type { ResultadoFilaImportacion } from "@/lib/api/tipos";
import { aCsv, neutralizarFormula } from "./csv";
import { avisosDelReporte, nombreCompleto, type FilaEditable } from "./filas";

// Regla 22: los dos CSV que se descargan al terminar. Se arman en el navegador con lo que ya tiene la pantalla: ni las
// contraseñas ni los reportes pasan por el servidor ni se guardan en ningún sitio.

export type ResultadosPorFila = Readonly<Record<number, ResultadoFilaImportacion>>;

// Las filas que se crearon, con su resultado: lo que cuentan los dos reportes.
function creadas(filas: readonly FilaEditable[], resultados: ResultadosPorFila) {
  return filas.flatMap((fila) => {
    const resultado = resultados[fila.fila];
    return resultado && resultado.estado === "creada" ? [{ fila, resultado }] : [];
  });
}

export const filasPorRevisar = (filas: readonly FilaEditable[], resultados: ResultadosPorFila) =>
  creadas(filas, resultados).filter(({ fila, resultado }) => avisosDelReporte(fila, resultado).length > 0);

export const cuentasConContrasena = (resultados: ResultadosPorFila) =>
  Object.values(resultados).filter((resultado) => resultado.password_temporal !== null).length;

// Para que el Admin entregue a cada emprendedora su acceso. La contraseña va tal cual (la genera el sistema; neutralizarla la
// cambiaría); lo demás viene de un archivo ajeno y se neutraliza.
export function csvDeCredenciales(filas: readonly FilaEditable[], resultados: ResultadosPorFila): string {
  const encabezado = ["Nombre", "Correo", "WhatsApp", "Emprendimiento", "Contraseña temporal"];
  const cuerpo = creadas(filas, resultados)
    .filter(({ resultado }) => resultado.password_temporal !== null)
    .map(({ fila, resultado }) => [
      neutralizarFormula(nombreCompleto(fila.datos)),
      neutralizarFormula(resultado.correo),
      neutralizarFormula(fila.datos.whatsapp),
      neutralizarFormula(fila.datos.nombre_negocio),
      resultado.password_temporal ?? "",
    ]);
  return aCsv([encabezado, ...cuerpo]);
}

// Las filas creadas con algo que conviene mirar: qué suposición hizo el sistema o qué dato no se guardó, con el texto original
// de Instagram y de «otra red social» cuando es de eso.
export function csvPorRevisar(filas: readonly FilaEditable[], resultados: ResultadosPorFila): string {
  const encabezado = ["Fila del Excel", "Nombre", "Correo", "Emprendimiento", "Qué revisar", "Instagram que decía el Excel", "Otra red social que decía el Excel"];
  const cuerpo = filasPorRevisar(filas, resultados).map(({ fila, resultado }) => {
    const avisos = avisosDelReporte(fila, resultado);
    const deInstagram = avisos.some((aviso) => aviso.campo === "instagram");
    const deOtraRed = avisos.some((aviso) => aviso.campo === "otra_red_social");
    return [
      String(fila.fila),
      neutralizarFormula(nombreCompleto(fila.datos)),
      neutralizarFormula(fila.datos.correo),
      neutralizarFormula(fila.datos.nombre_negocio),
      neutralizarFormula(avisos.map((aviso) => aviso.mensaje).join(" | ")),
      neutralizarFormula(deInstagram ? fila.textos.instagram : ""),
      neutralizarFormula(deOtraRed ? fila.textos.otra_red : ""),
    ];
  });
  return aCsv([encabezado, ...cuerpo]);
}
