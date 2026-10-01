export interface MensajeCorreo {
  para: string;
  asunto: string;
  texto: string;
}

// Puerto de envío de correo (regla 15): permite cambiar de proveedor sin tocar los casos de uso.
export interface IEmailSender {
  enviar(mensaje: MensajeCorreo): Promise<void>;
}
