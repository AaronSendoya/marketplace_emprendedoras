// Puerto de la caché de la CDN que sirve las imágenes (regla 1: Cloudflare). Una imagen que se borra de R2 puede seguir
// sirviéndose desde la caché de la CDN: al eliminar una cuenta (regla 5) se pide que la olvide.
export interface ICachePublica {
  // Purga estas direcciones públicas de la caché. Una que no estaba en caché no es un error. Lanza si la CDN no respondió bien.
  purgar(urls: string[]): Promise<void>;
}
