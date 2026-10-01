import { ok } from "@/api/http/respuestas";
import { generarDocumento } from "@/api/openapi/documento";
import { ErrorNoEncontrado } from "@/shared/domain/errors";

// Versión fija con SRI: la página comparte origen con la API y guarda el JWT en localStorage,
// así que no debe ejecutar un script de CDN sin verificar. Al subir de versión, recalcular
// ambos hashes (sha384 en base64 de cada archivo).
const VERSION_SWAGGER_UI = "5.33.0";
const CDN = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSION_SWAGGER_UI}`;
const SRI_CSS = "sha384-Ov4/wv3j2bmct8cDc5X4ngJZohVPzEmc6uDPH8WeljUxO5vtoykvMEfbu9Vh6RaW";
const SRI_JS = "sha384-YDALVcy8kj8yltLBVi1vBiBAUqdxvus673gM8XKwiy6aDUJFXivF/KCufekjYbVf";

let documento: ReturnType<typeof generarDocumento> | undefined;

// Con Swagger deshabilitado (producción) parece que la ruta no existe.
export function obtenerOpenApi(habilitado: boolean): Response {
  if (!habilitado) throw new ErrorNoEncontrado();
  documento ??= generarDocumento();
  return ok(documento);
}

const politicaDeContenido = (nonce: string) =>
  [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' https://cdn.jsdelivr.net`,
    "style-src https://cdn.jsdelivr.net 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src https://cdn.jsdelivr.net data:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");

export function obtenerDocs(habilitado: boolean): Response {
  if (!habilitado) throw new ErrorNoEncontrado();

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Documentación de la API</title>
  <link rel="stylesheet" href="${CDN}/swagger-ui.css" integrity="${SRI_CSS}" crossorigin="anonymous">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${CDN}/swagger-ui-bundle.js" integrity="${SRI_JS}" crossorigin="anonymous"></script>
  <script nonce="${nonce}">
    window.ui = SwaggerUIBundle({
      url: "/api/v1/openapi.json",
      dom_id: "#swagger-ui",
      persistAuthorization: true,
      tryItOutEnabled: true,
      validatorUrl: null,
      deepLinking: false,
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": politicaDeContenido(nonce),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
