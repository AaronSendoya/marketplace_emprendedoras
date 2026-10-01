import { describe, expect, it } from "vitest";
import { ConsoleEmailSender } from "./ConsoleEmailSender";
import { crearEmailSender } from "./crearEmailSender";

describe("ConsoleEmailSender", () => {
  it("escribe destinatario, asunto y texto (con el código) en la salida, sin enviar nada", async () => {
    const lineas: string[] = [];

    await new ConsoleEmailSender((linea) => lineas.push(linea)).enviar({
      para: "aaron@gmail.com",
      asunto: "Código de prueba",
      texto: "Tu código es 482913",
    });

    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toContain("Para: aaron@gmail.com");
    expect(lineas[0]).toContain("Asunto: Código de prueba");
    expect(lineas[0]).toContain("482913");
  });
});

describe("crearEmailSender", () => {
  it("con EMAIL_DRIVER=console devuelve el adaptador de consola", () => {
    expect(crearEmailSender({ EMAIL_DRIVER: "console" })).toBeInstanceOf(ConsoleEmailSender);
  });

  it("con EMAIL_DRIVER=smtp falla claramente hasta que exista el envío real (paso 8b)", () => {
    expect(() => crearEmailSender({ EMAIL_DRIVER: "smtp" })).toThrow("paso 8b");
  });
});
