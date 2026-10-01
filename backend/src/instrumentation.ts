// Next llama a register() una vez al iniciar el servidor y espera a que termine antes de
// atender peticiones: si falta una variable, el servidor no arranca (en vez de fallar en la
// primera petición). No se ejecuta en `next build`, así que el build no exige secretos.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validarEntornoAlArrancar } = await import("./shared/config/validarEntornoAlArrancar");
    validarEntornoAlArrancar();
  }
}
