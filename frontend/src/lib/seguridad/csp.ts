// Regla 17 (CLAUDE.md): cabeceras de seguridad del sitio. Sin imports a propósito: lo usan `src/proxy.ts` (runtime de Next) y
// `next.config.ts` (carga de configuración), y lo prueba `csp.test.ts` con el corredor de Node.

// Estas cabeceras no dependen de la petición: `next.config.ts` las pone en toda respuesta, incluidos los archivos de
// `/_next/static`. La Content-Security-Policy sí depende (lleva un nonce nuevo por petición) y la arma `proxy.ts`.
export const CABECERAS_ESTATICAS: ReadonlyArray<{ key: string; value: string }> = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti-clickjacking para navegadores sin `frame-ancestors`; la CSP dice lo mismo.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Igual que el backend: sin includeSubDomains ni preload (no controlamos el resto de subdominios). Un navegador la ignora si
  // la conexión no es https, así que es inofensiva en local.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

// 128 bits aleatorios en base64 (los caracteres `+`, `/` y `=` son válidos en un nonce de CSP). Un valor nuevo por petición:
// con uno repetido el nonce dejaría de proteger.
export function generarNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export interface OpcionesCsp {
  nonce: string;
  // `next dev`: React usa `eval` para reconstruir pilas de error y el servidor de desarrollo abre un websocket (HMR).
  desarrollo: boolean;
}

// El nonce acaba dentro de una cabecera: solo se aceptan los caracteres de base64, así que ni un valor mal armado puede cerrar
// la directiva ni añadir otra.
const NONCE_VALIDO = /^[A-Za-z0-9+/]{16,}={0,2}$/;

export function construirCsp({ nonce, desarrollo }: OpcionesCsp): string {
  if (!NONCE_VALIDO.test(nonce)) throw new Error("Nonce de CSP inválido.");

  const directivas: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    // Con 'strict-dynamic' los scripts que cargue uno con nonce también valen, y se ignoran 'self' y los dominios (los navegadores
    // que no lo entienden caen en 'self'). Ningún script en línea sin nonce.
    ["script-src", ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(desarrollo ? ["'unsafe-eval'"] : [])]],
    // Un nonce no cubre los atributos `style` (React y los gráficos los usan), por eso 'unsafe-inline' aquí y no en los scripts.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    // Las imágenes llegan de R2 (https) y su dominio propio todavía no existe, así que no se fija un host. `blob:` es la
    // previsualización de la imagen elegida en un formulario (URL.createObjectURL). Cuando exista el dominio de la CDN, aquí
    // va ese host en lugar de `https:`.
    ["img-src", ["'self'", ...(desarrollo ? ["http:"] : []), "https:", "data:", "blob:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...(desarrollo ? ["ws:", "wss:"] : [])]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];

  return directivas.map(([nombre, valores]) => `${nombre} ${valores.join(" ")}`).join("; ");
}
