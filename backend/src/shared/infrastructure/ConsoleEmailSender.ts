import type { IEmailSender, MensajeCorreo } from "@/shared/domain/IEmailSender";

type Salida = (linea: string) => void;

// Solo desarrollo: no envía nada, así que nunca llega correo a las direcciones ficticias del seed.
// Escribe con `console` y no con el logger a propósito: el logger redacta correos y códigos, y
// aquí se necesita ver el código.
export class ConsoleEmailSender implements IEmailSender {
  constructor(private readonly salida: Salida = (linea) => console.info(linea)) {}

  async enviar({ para, asunto, texto }: MensajeCorreo): Promise<void> {
    this.salida(`\n[correo de desarrollo] Para: ${para}\nAsunto: ${asunto}\n${texto}\n`);
  }
}
