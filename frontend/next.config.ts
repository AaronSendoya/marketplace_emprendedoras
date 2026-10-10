import type { NextConfig } from "next";
import { CABECERAS_ESTATICAS } from "./src/lib/seguridad/csp";

const nextConfig: NextConfig = {
  // Regla 17: no anunciar el framework en cada respuesta (X-Powered-By), igual que el backend.
  poweredByHeader: false,
  // Regla 17: cabeceras de seguridad que no cambian entre peticiones, en toda respuesta (incluidos los archivos de
  // `/_next/static`). La Content-Security-Policy lleva un nonce por petición y la pone src/proxy.ts.
  async headers() {
    return [{ source: "/:path*", headers: [...CABECERAS_ESTATICAS] }];
  },
  // El límite por defecto de una Server Function es 1 MB. Dos usos lo superan: (a) la importación de emprendedoras envía el `.xlsx`
  // (hasta 2 MB, regla 22) y (b) el formulario del perfil envía la foto y el logo, de hasta 5 MB cada uno (regla 16), más los campos.
  // Con 3 MB (el valor anterior) una foto de teléfono de 3 a 5 MB, que el backend sí acepta, la rechazaba Next antes de llegar a
  // ninguna acción y la pantalla no podía explicarlo. 12 MB cubre el máximo del backend para un cuerpo multipart (11 MB), que es quien
  // lo impone de verdad; el navegador además revisa el tamaño al elegir cada imagen (`validarImagen`).
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  // Sin `remotePatterns`: las imágenes de R2 no pasan por el optimizador de Next (regla 16, 2026-10-08; se muestran con
  // `ImagenR2`, que fija `unoptimized`). Solo se optimizan los logos y banners locales de `public/`.
};

export default nextConfig;
