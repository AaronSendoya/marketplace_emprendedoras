import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { generarDocumento } from "../src/api/openapi/documento";
import { ejecutar } from "./lib/ejecutar";

// docs/openapi.json se versiona: el frontend genera de él su cliente y sus tipos.
async function main() {
  const ruta = join(process.cwd(), "docs", "openapi.json");
  writeFileSync(ruta, `${JSON.stringify(generarDocumento(), null, 2)}\n`);
  console.log(`Escrito ${ruta}`);
}

ejecutar(main);
