import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { parsearUrlMySql } from "../src/shared/infrastructure/opcionesMySql";
import { cifrar, contenidoArchivoOpciones, nombreArchivoBackup } from "./lib/backup";
import { cargarEntorno, destinoDe, variableObligatoria } from "./lib/entorno";
import { ejecutar } from "./lib/ejecutar";

// Regla 17: respaldo cifrado hacia un bucket de R2 privado, separado del bucket público de las
// imágenes. Detalle y checklist de restauración en docs/RESPALDOS.md.
//
// Usa DATABASE_URL: para respaldar producción desde el computador, activa el acceso remoto en
// hPanel (o usa la URL de TiDB) y pasa la cadena por la shell, igual que para migrar.
const R2_BACKUPS_CLAVES = [
  "R2_BACKUPS_ACCOUNT_ID",
  "R2_BACKUPS_ACCESS_KEY_ID",
  "R2_BACKUPS_SECRET_ACCESS_KEY",
  "R2_BACKUPS_BUCKET",
] as const;

// `--column-statistics=0`: sin él, mysqldump 8+ falla contra un servidor sin esa tabla del
// sistema (algunas versiones de MariaDB y TiDB). `--single-transaction` evita bloquear las
// tablas mientras se vuelca (InnoDB). Sin `--routines`/`--triggers`/`--events`: el esquema no usa
// ninguno (ver db/migrations/); si algún día se agregan, súmalos aquí también.
function argsMysqldump(base: string, archivoOpciones: string, esLocal: boolean): string[] {
  const args = ["--defaults-extra-file=" + archivoOpciones, "--single-transaction", "--column-statistics=0"];
  if (!esLocal) args.push("--ssl-mode=REQUIRED");
  args.push(base);
  return args;
}

function volcar(base: string, archivoOpciones: string, esLocal: boolean): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proceso = spawn("mysqldump", argsMysqldump(base, archivoOpciones, esLocal));
    const trozos: Buffer[] = [];
    let errorTexto = "";
    proceso.stdout.on("data", (trozo: Buffer) => trozos.push(trozo));
    proceso.stderr.on("data", (trozo: Buffer) => (errorTexto += trozo.toString()));
    proceso.on("error", (error) =>
      reject(
        error.message.includes("ENOENT")
          ? new Error("No se encontró mysqldump. Instala el cliente de MySQL y agrégalo al PATH.")
          : error,
      ),
    );
    proceso.on("close", (codigo) => {
      if (codigo === 0) resolve(Buffer.concat(trozos));
      else reject(new Error(`mysqldump terminó con código ${codigo}: ${errorTexto.trim()}`));
    });
  });
}

async function subirAR2(nombre: string, contenido: Buffer): Promise<void> {
  const cliente = new S3Client({
    region: "auto",
    endpoint: `https://${variableObligatoria("R2_BACKUPS_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: variableObligatoria("R2_BACKUPS_ACCESS_KEY_ID"),
      secretAccessKey: variableObligatoria("R2_BACKUPS_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  await cliente.send(
    new PutObjectCommand({
      Bucket: variableObligatoria("R2_BACKUPS_BUCKET"),
      Key: nombre,
      Body: contenido,
      ContentType: "application/octet-stream",
    }),
  );
}

async function main() {
  cargarEntorno();
  const cadena = variableObligatoria("DATABASE_URL");
  const claveCifrado = variableObligatoria("BACKUP_ENCRYPTION_KEY");
  const { host, puerto, usuario, clave, base } = parsearUrlMySql(cadena);
  const esLocal = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host.toLowerCase());

  console.log(`Base de datos: ${destinoDe(cadena)}`);

  // Carpeta temporal solo para las credenciales (nunca en /tmp compartido ni en el repo); se borra
  // siempre, incluso si mysqldump falla.
  const temporal = mkdtempSync(join(tmpdir(), "backup-"));
  const archivoOpciones = join(temporal, "mysqldump.cnf");
  writeFileSync(archivoOpciones, contenidoArchivoOpciones({ host, puerto, usuario, clave }), { mode: 0o600 });

  let volcado: Buffer;
  try {
    volcado = await volcar(base, archivoOpciones, esLocal);
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
  console.log(`Volcado: ${(volcado.length / 1024).toFixed(0)} KB sin comprimir.`);

  const cifrado = cifrar(gzipSync(volcado), claveCifrado);
  const nombre = nombreArchivoBackup(base, new Date());

  const carpetaLocal = join(process.cwd(), "backups");
  mkdirSync(carpetaLocal, { recursive: true });
  const rutaLocal = join(carpetaLocal, nombre);
  writeFileSync(rutaLocal, cifrado);
  console.log(`Guardado en ${rutaLocal} (${(cifrado.length / 1024).toFixed(0)} KB cifrado).`);

  const r2Configurado = R2_BACKUPS_CLAVES.every((clave) => process.env[clave]?.trim());
  if (r2Configurado) {
    await subirAR2(nombre, cifrado);
    console.log(`Subido al bucket privado de respaldos: ${nombre}`);
  } else {
    console.log(
      "R2_BACKUPS_* no está configurado: el respaldo quedó solo en este computador. " +
        "Muévelo a un lugar seguro fuera de él (no basta con tenerlo aquí).",
    );
  }
}

ejecutar(main);
