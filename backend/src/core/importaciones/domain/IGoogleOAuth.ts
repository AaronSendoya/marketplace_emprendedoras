// Regla 17 (2026-10-09): conectar una cuenta de Google para leer Drive. Puerto de salida: el dominio no conoce HTTP ni a Google.
export interface TokenDeGoogle {
  // Vale una hora. No se guarda en ningún sitio del backend.
  accessToken: string;
  expiraEnSegundos: number;
}

export interface IGoogleOAuth {
  // `false` si faltan las variables GOOGLE_*: el importador funciona como antes y no ofrece conectar.
  disponible(): boolean;
  // La dirección a la que se manda a la persona para elegir su cuenta. `state` y el desafío PKCE los genera el frontend.
  urlDeAutorizacion(state: string, desafioPkce: string): string;
  // Cambia el código que devolvió Google por un token de acceso. Solo lectura (`drive.readonly`), sin acceso sin conexión.
  intercambiar(codigo: string, verificadorPkce: string): Promise<TokenDeGoogle>;
}
