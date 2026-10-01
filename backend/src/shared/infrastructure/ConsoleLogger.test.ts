import { describe, expect, it } from "vitest";
import { ErrorConflicto } from "@/shared/domain/errors";
import { ConsoleLogger, sanearDatos, sanearTexto } from "./ConsoleLogger";

const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.firma-abc_123";

function registrar(accion: (logger: ConsoleLogger) => void) {
  const lineas: { nivel: string; linea: string }[] = [];
  accion(new ConsoleLogger((nivel, linea) => lineas.push({ nivel, linea })));
  return lineas;
}

describe("sanearTexto", () => {
  it("oculta correos, JWT y cabeceras Bearer", () => {
    const texto = sanearTexto(`falló ana@correo.com con Bearer ${JWT} y token ${JWT}`);

    expect(texto).not.toContain("ana@correo.com");
    expect(texto).not.toContain("eyJ");
    expect(texto).toContain("[EMAIL]");
  });

  it("deja intacto el texto sin datos sensibles", () => {
    expect(sanearTexto("perfil creado")).toBe("perfil creado");
  });
});

describe("sanearDatos", () => {
  it.each(["password", "password_hash", "token", "token_version", "jwt", "authorization", "otp", "codigo_otp", "email", "correo", "whatsapp", "JWT_SECRET"])(
    "redacta la clave %s",
    (clave) => {
      expect(sanearDatos({ [clave]: "valor" })).toEqual({ [clave]: "[REDACTADO]" });
    },
  );

  it("conserva las claves inofensivas, incluido `codigo` de error", () => {
    expect(sanearDatos({ codigo: "CONFLICTO", perfil_id: "abc", intentos: 3 })).toEqual({
      codigo: "CONFLICTO",
      perfil_id: "abc",
      intentos: 3,
    });
  });

  it("recorre objetos y arreglos anidados", () => {
    const saneado = sanearDatos({ usuario: { password: "x", nombre: "Ana" }, lista: [{ email: "a@b.com" }] });

    expect(saneado).toEqual({ usuario: { password: "[REDACTADO]", nombre: "Ana" }, lista: [{ email: "[REDACTADO]" }] });
  });

  it("limpia los correos que viajan dentro de textos", () => {
    expect(sanearDatos({ detalle: "ya existe ana@correo.com" })).toEqual({ detalle: "ya existe [EMAIL]" });
  });

  it("de un error de MySQL conserva código y restricción, pero no el valor duplicado", () => {
    const errorMySql = Object.assign(new Error("Duplicate entry 'Ana Perez Mamani' for key 'usuarios.uk_usuarios_email'"), {
      code: "ER_DUP_ENTRY",
      errno: 1062,
      sqlMessage: "Duplicate entry 'Ana Perez Mamani' for key 'usuarios.uk_usuarios_email'",
      sql: "INSERT INTO usuarios (nombres) VALUES ('Ana Perez Mamani')",
    });

    const saneado = JSON.stringify(sanearDatos({ error: errorMySql }));

    expect(saneado).toContain("ER_DUP_ENTRY");
    expect(saneado).toContain("usuarios.uk_usuarios_email");
    expect(saneado).not.toContain("Ana Perez");
  });

  it("toma el `codigo` de los errores de dominio", () => {
    expect(sanearDatos(new ErrorConflicto("x"))).toMatchObject({ codigo: "CONFLICTO" });
  });

  it("no falla con referencias circulares, bigint ni fechas", () => {
    const circular: Record<string, unknown> = { nombre: "x" };
    circular.yo = circular;

    expect(() => JSON.stringify(sanearDatos({ circular, grande: BigInt(10), fecha: new Date(0) }))).not.toThrow();
  });
});

describe("ConsoleLogger", () => {
  it("escribe una línea JSON con nivel, evento y fecha", () => {
    const [{ nivel, linea }] = registrar((logger) => logger.warn("intento_fallido", { intentos: 2 }));
    const entrada = JSON.parse(linea);

    expect(nivel).toBe("warn");
    expect(entrada).toMatchObject({ nivel: "warn", evento: "intento_fallido", intentos: 2 });
    expect(new Date(entrada.fecha).toString()).not.toBe("Invalid Date");
  });

  it("nunca deja pasar contraseñas, tokens ni correos", () => {
    const [{ linea }] = registrar((logger) =>
      logger.error("login_fallido", { email: "ana@correo.com", password: "Secreta123*", cabecera: `Bearer ${JWT}` }),
    );

    for (const secreto of ["ana@correo.com", "Secreta123*", JWT]) {
      expect(linea).not.toContain(secreto);
    }
  });

  it("los datos no pueden pisar nivel ni evento", () => {
    const [{ linea }] = registrar((logger) => logger.info("real", { evento: "falso", nivel: "error" }));

    expect(JSON.parse(linea)).toMatchObject({ evento: "real", nivel: "info" });
  });
});
