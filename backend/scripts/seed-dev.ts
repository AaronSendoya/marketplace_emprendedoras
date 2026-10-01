import type { RowDataPacket } from "mysql2/promise";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { abrirConexion } from "./lib/conexion";
import { ejecutar } from "./lib/ejecutar";
import { cargarEntorno, destinoDe, exigirDesarrollo, variableObligatoria } from "./lib/entorno";
import { normalizarSql } from "./lib/migrador";

async function main() {
  cargarEntorno();
  exigirDesarrollo(process.env.APP_ENV);

  const url = variableObligatoria("DATABASE_URL");
  const ruta = join(process.cwd(), "docs", "seed.dev.sql");
  if (!existsSync(ruta)) {
    throw new Error("No existe docs/seed.dev.sql (es un archivo local, ignorado por git).");
  }
  const sql = normalizarSql(readFileSync(ruta, "utf8"));

  console.log(`Base de datos: ${destinoDe(url)}`);
  const conexion = await abrirConexion(url, { multiplesSentencias: true });
  try {
    await conexion.beginTransaction();
    try {
      await conexion.query(sql);
      await conexion.commit();
    } catch (error) {
      await conexion.rollback().catch(() => {});
      if ((error as { code?: string }).code === "ER_NO_SUCH_TABLE") {
        throw new Error("Faltan tablas: aplica primero las migraciones con `pnpm db:migrate`.", { cause: error });
      }
      throw error;
    }

    const [filas] = await conexion.query<RowDataPacket[]>(`
      SELECT (SELECT COUNT(*) FROM roles) AS roles,
             (SELECT COUNT(*) FROM ciudades) AS ciudades,
             (SELECT COUNT(*) FROM rubros) AS rubros,
             (SELECT COUNT(*) FROM usuarios) AS usuarios`);
    console.log("Seed aplicado (idempotente). Totales:", { ...filas[0] });
  } finally {
    await conexion.end();
  }
}

ejecutar(main);
