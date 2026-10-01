import { ok } from "@/api/http/respuestas";

// Lo único que el controlador necesita de la base: poder hacer una consulta (así no conoce el adaptador).
export interface ComprobadorBase {
  consultar(texto: string): Promise<unknown>;
}

// Si la base no responde, la consulta lanza y withErrorHandling lo convierte en 500 estándar.
export async function obtenerHealth(db: ComprobadorBase): Promise<Response> {
  await db.consultar("SELECT 1");
  return ok({ estado: "ok", base_de_datos: "ok" });
}
