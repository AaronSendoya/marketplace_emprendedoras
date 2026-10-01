import { getEnv } from "../src/shared/config/env";
import { CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO } from "../src/shared/domain/imagenes";
import { crearImageStorage } from "../src/shared/infrastructure/crearImageStorage";
import { ImageProcessorService } from "../src/shared/infrastructure/ImageProcessorService";
import { ejecutar } from "./lib/ejecutar";
import { cargarEntorno } from "./lib/entorno";
import sharp from "sharp";

// Regla 11: imágenes predeterminadas neutras (sin emojis), generadas aquí para no depender de
// archivos externos. Se procesan igual que cualquier subida (regla 16).
const FOTO_ANONIMA = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#e5e7eb"/>
  <circle cx="400" cy="320" r="130" fill="#9ca3af"/>
  <path d="M130 800 C130 600 260 520 400 520 C540 520 670 600 670 800 Z" fill="#9ca3af"/>
</svg>`;

const LOGO_VACIO = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f3f4f6"/>
  <rect x="96" y="96" width="320" height="320" rx="36" fill="none" stroke="#9ca3af" stroke-width="16" stroke-dasharray="36 24"/>
</svg>`;

async function main() {
  cargarEntorno();
  const env = getEnv();
  if (!env.R2_BUCKET) throw new Error("Completa las variables R2_* en .env.local antes de subir las imágenes.");
  const almacenamiento = crearImageStorage(env);
  const procesador = new ImageProcessorService();

  const imagenes = [
    { clave: CLAVE_FOTO_PERFIL_PREDETERMINADA, svg: FOTO_ANONIMA, tipo: "perfil" as const },
    { clave: CLAVE_LOGO_PREDETERMINADO, svg: LOGO_VACIO, tipo: "logo" as const },
  ];
  for (const { clave, svg, tipo } of imagenes) {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    await almacenamiento.guardar(clave, await procesador.procesar(png, tipo));
    console.log(`Subida: ${almacenamiento.urlPublica(clave)}`);
  }
}

ejecutar(main);
