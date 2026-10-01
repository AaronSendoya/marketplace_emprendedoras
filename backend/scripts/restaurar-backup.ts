import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { descifrar } from "./lib/backup";
import { cargarEntorno, variableObligatoria } from "./lib/entorno";
import { ejecutar } from "./lib/ejecutar";

// Descifra un respaldo (de backups/ o descargado de R2) y lo deja como SQL plano, listo para
// `mysql -h HOST -u USUARIO -p BASE < archivo.sql`. Este script solo descifra: no toca ninguna
// base de datos, para que restaurar sea un paso consciente y separado. Detalle en docs/RESPALDOS.md.
//
// Uso: pnpm db:restaurar backups/catalogo_prod_2026-09-27T10-15-00-000Z.sql.gz.enc
async function main() {
  cargarEntorno();
  const rutaCifrada = process.argv[2];
  if (!rutaCifrada) {
    throw new Error("Indica el archivo a restaurar: pnpm db:restaurar backups/archivo.sql.gz.enc");
  }
  const claveCifrado = variableObligatoria("BACKUP_ENCRYPTION_KEY");

  const cifrado = readFileSync(rutaCifrada);
  const sql = gunzipSync(descifrar(cifrado, claveCifrado));

  const rutaSalida = rutaCifrada.replace(/\.sql\.gz\.enc$/, "") + ".sql";
  writeFileSync(rutaSalida, sql);
  console.log(`Descifrado en ${rutaSalida} (${(sql.length / 1024).toFixed(0)} KB).`);
  console.log("Este archivo tiene la base en texto plano: bórralo cuando termines de restaurar.");
}

ejecutar(main);
