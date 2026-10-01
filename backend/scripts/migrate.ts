import { join } from "node:path";
import { abrirConexion } from "./lib/conexion";
import { cargarEntorno, destinoDe, variableObligatoria } from "./lib/entorno";
import { ejecutar } from "./lib/ejecutar";
import { aplicarMigraciones, leerMigraciones } from "./lib/migrador";

// Usa DATABASE_URL: para migrar producción desde el computador, activa MySQL remoto en hPanel con
// tu IP y pasa esa URL por la shell (`DATABASE_URL=mysql://... pnpm db:migrate`).
async function main() {
  cargarEntorno();
  const url = variableObligatoria("DATABASE_URL");
  const migraciones = leerMigraciones(join(process.cwd(), "db", "migrations"));

  console.log(`Base de datos: ${destinoDe(url)}`);
  const conexion = await abrirConexion(url, { multiplesSentencias: true });
  try {
    const aplicadas = await aplicarMigraciones(conexion, migraciones, (nombre) =>
      console.log(`  aplicada: ${nombre}`),
    );
    console.log(
      aplicadas.length > 0
        ? `${aplicadas.length} migración(es) aplicada(s).`
        : "Sin migraciones pendientes.",
    );
  } finally {
    await conexion.end();
  }
}

ejecutar(main);
