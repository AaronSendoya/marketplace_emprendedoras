import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Regla 17: los respaldos se cifran antes de subirse, con una clave que nunca viaja con ellos.
const ALGORITMO = "aes-256-gcm";
const LONGITUD_IV = 12; // 96 bits, el tamaño recomendado para GCM
const LONGITUD_ETIQUETA = 16;

function clave(claveBase64: string): Buffer {
  const bytes = Buffer.from(claveBase64, "base64");
  if (bytes.length !== 32) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY debe ser una clave de 32 bytes en base64. Genera una con: " +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  return bytes;
}

// Formato del archivo: IV (12 bytes) + etiqueta de autenticidad (16 bytes) + datos cifrados.
// Todo en un solo archivo para no tener que llevar la cuenta de tres partes sueltas.
export function cifrar(datos: Buffer, claveBase64: string): Buffer {
  const iv = randomBytes(LONGITUD_IV);
  const cifrador = createCipheriv(ALGORITMO, clave(claveBase64), iv);
  const cuerpo = Buffer.concat([cifrador.update(datos), cifrador.final()]);
  return Buffer.concat([iv, cifrador.getAuthTag(), cuerpo]);
}

// Si la clave no es la que cifró el archivo, o el archivo se alteró, revienta acá (GCM autentica):
// mejor un error claro que restaurar una base a medias.
export function descifrar(datos: Buffer, claveBase64: string): Buffer {
  const iv = datos.subarray(0, LONGITUD_IV);
  const etiqueta = datos.subarray(LONGITUD_IV, LONGITUD_IV + LONGITUD_ETIQUETA);
  const cuerpo = datos.subarray(LONGITUD_IV + LONGITUD_ETIQUETA);
  const descifrador = createDecipheriv(ALGORITMO, clave(claveBase64), iv);
  descifrador.setAuthTag(etiqueta);
  return Buffer.concat([descifrador.update(cuerpo), descifrador.final()]);
}

// catalogo_prod_2026-09-27T10-15-00-000Z.sql.gz.enc: se ordenan solos por nombre y el timestamp
// no choca entre respaldos del mismo minuto (lleva milisegundos).
export function nombreArchivoBackup(base: string, ahora: Date): string {
  const marca = ahora.toISOString().replace(/[:.]/g, "-");
  return `catalogo_${base}_${marca}.sql.gz.enc`;
}

export interface CredencialesDump {
  host: string;
  puerto: number;
  usuario: string;
  clave: string;
}

// mysqldump lee las credenciales de un archivo de opciones: pasarlas como argumento del proceso
// las dejaría visibles para cualquier otro usuario del sistema (`ps`, Administrador de tareas).
export function contenidoArchivoOpciones({ host, puerto, usuario, clave }: CredencialesDump): string {
  return `[client]\nhost=${host}\nport=${puerto}\nuser=${usuario}\npassword=${clave}\n`;
}
