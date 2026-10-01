import type { NextConfig } from "next";

// Regla 16 (backend): las imágenes llegan como URL completa del dominio de R2. Sin
// NEXT_PUBLIC_IMAGENES_HOST (R2 aún no conectado, paso 10b del backend) no hay ningún dominio
// remoto que declarar; los componentes de imagen detectan esa ausencia y muestran un marcador
// en su lugar (src/lib/formato/imagen.ts) en vez de que next/image falle en tiempo de ejecución.
const hostImagenes = process.env.NEXT_PUBLIC_IMAGENES_HOST;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: hostImagenes ? [{ protocol: "https", hostname: hostImagenes }] : [],
  },
};

export default nextConfig;
