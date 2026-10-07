// Lo que se borró junto con una cuenta (regla 5: eliminar una cuenta por completo).
export interface ResumenEliminacion {
  perfiles: number;
  productos: number;
  descuentos: number;
  clics: number;
  // Claves de R2 de las imágenes de la cuenta (foto de perfil, logo e imagen de cada producto), para borrarlas cuando la
  // transacción ya se confirmó. Pueden incluir las predeterminadas: quien las borra las descarta (regla 11).
  clavesImagenes: string[];
}

export interface IEliminacionCuentaRepository {
  // Borra la cuenta y todo lo que depende de ella en una sola transacción, de forma explícita (sin depender de que la base
  // aplique las claves foráneas en cascada, regla 3): sus clics de contacto, las asignaciones entre productos y descuentos, sus
  // descuentos, sus productos, su perfil, los códigos OTP y los intentos de acceso de su correo, y la cuenta. Bloquea la fila de
  // la cuenta mientras tanto.
  // Lanza ErrorNoEncontrado si la cuenta ya no existe y ErrorConflicto si, ya bajo el bloqueo, no es una cuenta de Emprendedor
  // activa (alguien pudo suspenderla entre la comprobación del caso de uso y el borrado). En ese caso no borra nada.
  eliminar(usuarioId: string): Promise<ResumenEliminacion>;
}
