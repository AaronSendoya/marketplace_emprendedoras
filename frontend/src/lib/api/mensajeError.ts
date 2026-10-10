// El texto que se le muestra a la persona cuando el backend rechaza lo que envió.
//
// Un `400` de validación trae dos cosas: un `mensaje` general, que casi siempre es «Los datos enviados no son válidos.», y los
// `detalles`, uno por campo con el motivo exacto («El precio debe ser 0 o más, con hasta 2 decimales.»). Mostrar solo el general
// dejaba a quien llenaba el formulario sin saber qué corregir. Cuando el mensaje es el general se usan los motivos de los detalles;
// cuando el backend ya dio un mensaje propio (un archivo que no es .xlsx, una fecha de fin anterior al inicio) se respeta tal cual.
//
// Sin imports: el corredor de pruebas de Node carga este módulo directamente.

// Calca el mensaje por defecto de `ErrorValidacion` en `backend/src/shared/domain/errors.ts`.
export const MENSAJE_VALIDACION_GENERAL = "Los datos enviados no son válidos.";

// Hasta cuántos motivos se muestran juntos: más de unos pocos abruman y el resto aparece al corregir los primeros.
const MAXIMO_MOTIVOS = 3;

export function mensajeDeError(mensaje: string | undefined, detalles: readonly { mensaje: string }[] | undefined, estado: number): string {
  if (mensaje && mensaje !== MENSAJE_VALIDACION_GENERAL) return mensaje;
  const motivos = [...new Set((detalles ?? []).map((detalle) => detalle.mensaje.trim()).filter(Boolean))];
  if (motivos.length > 0) return motivos.slice(0, MAXIMO_MOTIVOS).join(" ");
  return mensaje ?? `El servidor respondió ${estado}.`;
}
