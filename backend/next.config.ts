import type { NextConfig } from "next";

// Regla 17: las mismas cabeceras que src/proxy.ts pone en /api/*, para el resto de rutas. Se excluyen
// /api (ya las lleva el proxy) y /docs (Swagger, solo en desarrollo, con su propia política).
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  // No anunciar el framework en cada respuesta (X-Powered-By).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/((?!api/|docs).*)", headers: cabecerasSeguridad }];
  },
  experimental: {
    // Por defecto el proxy (CORS) copia solo 10 MB del cuerpo y recorta el resto en silencio; el
    // alta de un perfil sube dos imágenes de hasta 5 MB. Debe ser mayor que
    // LIMITE_CUERPO_DOS_IMAGENES (src/api/http/multipart.ts, 11 MB), que es el que corta primero.
    proxyClientMaxBodySize: "12mb",
  },
};

export default nextConfig;
