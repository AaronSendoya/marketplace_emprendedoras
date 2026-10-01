import { join } from "node:path";
import { aplicarMigraciones, leerMigraciones } from "../../scripts/lib/migrador";
import { conectar } from "./support/conexion";

export async function setup() {
  const conexion = await conectar({ multiplesSentencias: true });
  try {
    await aplicarMigraciones(conexion, leerMigraciones(join(process.cwd(), "db", "migrations")));
  } finally {
    await conexion.end();
  }
}
