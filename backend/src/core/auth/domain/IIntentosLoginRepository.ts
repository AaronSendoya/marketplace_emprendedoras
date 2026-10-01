// Freno a los intentos de login (regla 17). No referencia a `usuarios`: un correo inexistente
// también debe frenarse, para no revelar con la respuesta si la cuenta existe.
export interface EstadoIntentosLogin {
  totalFallos: number;
  ultimoFallo: Date | null;
}

export interface IIntentosLoginRepository {
  estado(email: string): Promise<EstadoIntentosLogin>;
  registrarFallo(email: string, ahora: Date): Promise<void>;
  // Un inicio de sesión correcto reinicia el conteo (regla 17): la próxima racha de fallos vuelve
  // a empezar en el primer escalón.
  limpiar(email: string): Promise<void>;
}
