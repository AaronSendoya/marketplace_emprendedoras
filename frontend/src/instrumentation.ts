// Next llama a register() una vez al iniciar el servidor y espera a que termine antes de atender peticiones: si BACKEND_URL es
// inválida (o en producción no es https://, regla 17), el servidor no arranca en vez de fallar en la primera petición. No se
// ejecuta en `next build`, así que el build no exige las variables de entorno.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validarEntornoAlArrancar } = await import("./lib/config/validarEntornoAlArrancar");
    validarEntornoAlArrancar();
  }
}
