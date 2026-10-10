import "server-only";
import { redirect } from "next/navigation";
import { clasificarError, type CategoriaDeError, type ResultadoDeAccion } from "./clasificar";
import { registrarErrorDelServidor } from "./registro";

export type { ResultadoDeAccion };

// Estas categorías son culpa de lo que escribió la persona o de un cambio normal: no son un fallo del sistema, y no ensucian el registro.
const SIN_REGISTRO: ReadonlySet<CategoriaDeError> = new Set(["validacion", "conflicto", "sin_permiso", "no_encontrado", "sesion_vencida"]);
// De estas, el mensaje que trae el backend (o el del catálogo) es más útil que el genérico de la acción.
const CON_MENSAJE_GENERAL: ReadonlySet<CategoriaDeError> = new Set(["sin_conexion", "tiempo_agotado", "servicio_no_disponible", "demasiadas_peticiones"]);

// El texto de error de una acción (Server Function), a partir de lo que lanzó el backend o el cliente HTTP. Se llama desde el `catch`:
//   - sesión vencida (401): no hay nada que hacer aquí, se manda a iniciar sesión (la excepción de `redirect` sale de este `catch`);
//   - el backend rechazó lo enviado (400, 403, 404, 409, 413): su mensaje ya es para la persona, en español, y se respeta;
//   - sin conexión, tiempo agotado, servicio no disponible o demasiadas peticiones: un mensaje que dice eso;
//   - cualquier otra cosa (un 500, algo inesperado): `mensajePorDefecto`, el «No pudimos guardar…» propio de la acción.
// Lo que se registra en el servidor ya va sin datos personales (ver `registro.ts`).
export function mensajeDeAccion(contexto: string, error: unknown, mensajePorDefecto: string): string {
  const clasificado = clasificarError(error);
  if (clasificado.categoria === "sesion_vencida") redirect("/iniciar-sesion");
  if (!SIN_REGISTRO.has(clasificado.categoria)) registrarErrorDelServidor(contexto, error);

  switch (clasificado.categoria) {
    case "validacion":
    case "conflicto":
    case "sin_permiso":
    case "no_encontrado":
      return clasificado.mensaje;
    default:
      return CON_MENSAJE_GENERAL.has(clasificado.categoria) ? clasificado.mensaje : mensajePorDefecto;
  }
}
