import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Regla 22 (backend): la importación de emprendedoras envía el `.xlsx` (hasta 2 MB) en una Server Function, y el límite por
  // defecto es 1 MB. 3 MB deja margen sobre el máximo del backend, que es quien lo impone de verdad (2 MB).
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // Sin `remotePatterns`: las imágenes de R2 no pasan por el optimizador de Next (regla 16, 2026-10-08; se muestran con
  // `ImagenR2`, que fija `unoptimized`). Solo se optimizan los logos y banners locales de `public/`.
};

export default nextConfig;
