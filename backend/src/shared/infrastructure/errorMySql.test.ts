import { describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorValidacion } from "@/shared/domain/errors";
import {
  columnaDeError,
  ERRNO,
  nombreRestriccion,
  sanearMensajeSql,
  traducirErrorMySql,
} from "./errorMySql";

const errorMySql = (errno: number, sqlMessage = "mensaje interno") =>
  Object.assign(new Error(sqlMessage), { errno, sqlMessage, code: "ER_X" });

// Los mensajes reales de MySQL 8 (tabla.clave) y de MariaDB (solo clave) difieren.
const duplicadoMySql8 = (clave: string, valor = "ana@correo.com") =>
  errorMySql(ERRNO.DUPLICADO, `Duplicate entry '${valor}' for key '${clave}'`);
const fkInexistente = (restriccion: string) =>
  errorMySql(
    ERRNO.HIJO_SIN_PADRE,
    `Cannot add or update a child row: a foreign key constraint fails (\`catalogo\`.\`perfiles_emprendedores\`, CONSTRAINT \`${restriccion}\` FOREIGN KEY (\`ciudad_id\`) REFERENCES \`ciudades\` (\`id\`) ON DELETE RESTRICT)`,
  );

describe("nombreRestriccion", () => {
  it.each([
    ["duplicado en MySQL 8", duplicadoMySql8("usuarios.uk_usuarios_email"), "usuarios.uk_usuarios_email"],
    ["duplicado en MariaDB", duplicadoMySql8("uk_usuarios_email"), "uk_usuarios_email"],
    ["clave foránea", fkInexistente("fk_perfiles_ciudad"), "fk_perfiles_ciudad"],
    [
      "CHECK en MySQL",
      errorMySql(ERRNO.CHECK_MYSQL, "Check constraint 'ck_descuentos_porcentaje' is violated."),
      "ck_descuentos_porcentaje",
    ],
    [
      "CHECK en MariaDB",
      errorMySql(ERRNO.CHECK_MARIADB, "CONSTRAINT `ck_descuentos_porcentaje` failed for `catalogo`.`descuentos`"),
      "ck_descuentos_porcentaje",
    ],
  ])("lee la restricción de %s", (_caso, error, esperado) => {
    expect(nombreRestriccion(error)).toBe(esperado);
  });

  it("un valor que imita \"for key\" no puede hacerse pasar por la clave", () => {
    const malicioso = duplicadoMySql8("usuarios.uk_usuarios_email", "x' for key 'uk_usuario_perfil");

    expect(nombreRestriccion(malicioso)).toBe("usuarios.uk_usuarios_email");
  });

  it("devuelve undefined si no hay mensaje o no es un error de MySQL", () => {
    expect(nombreRestriccion(new Error("otro"))).toBeUndefined();
    expect(nombreRestriccion(errorMySql(1))).toBeUndefined();
    expect(nombreRestriccion(null)).toBeUndefined();
  });
});

describe("columnaDeError", () => {
  it.each([
    ["Column 'logo_key' cannot be null", "logo_key"],
    ["Field 'foto_perfil_key' doesn't have a default value", "foto_perfil_key"],
  ])("lee la columna de %s", (mensaje, columna) => {
    expect(columnaDeError(errorMySql(ERRNO.NULO, mensaje))).toBe(columna);
  });
});

describe("traducirErrorMySql", () => {
  it.each([
    ["MySQL 8", "usuarios.uk_usuarios_email"],
    ["MariaDB", "uk_usuarios_email"],
  ])("un correo repetido (%s) es un conflicto con mensaje propio y el campo señalado", (_motor, clave) => {
    const traducido = traducirErrorMySql(duplicadoMySql8(clave));

    expect(traducido).toBeInstanceOf(ErrorConflicto);
    expect(traducido).toMatchObject({
      message: "Ya existe una cuenta con ese correo.",
      detalles: [{ campo: "email", mensaje: "Ya existe una cuenta con ese correo." }],
    });
  });

  it("una asignación repetida de descuento usa su mensaje solo cuando el motor da tabla.clave", () => {
    expect(traducirErrorMySql(duplicadoMySql8("producto_descuentos.PRIMARY", "a-b"))).toMatchObject({
      message: "El descuento ya está asignado a ese producto.",
    });
    expect(traducirErrorMySql(duplicadoMySql8("PRIMARY", "a-b"))).toMatchObject({
      message: "Ya existe un registro con esos datos.",
    });
  });

  it("un duplicado sin mensaje propio usa el mensaje por defecto", () => {
    expect(traducirErrorMySql(duplicadoMySql8("otra_clave"))).toMatchObject({
      message: "Ya existe un registro con esos datos.",
    });
  });

  it("una referencia inexistente es un error de validación y nombra el campo", () => {
    const traducido = traducirErrorMySql(fkInexistente("fk_perfiles_ciudad"));

    expect(traducido).toBeInstanceOf(ErrorValidacion);
    expect(traducido).toMatchObject({ detalles: [{ campo: "ciudad_id", mensaje: "La ciudad indicada no existe." }] });
  });

  it.each([
    [ERRNO.PADRE_REFERENCIADO, ErrorConflicto, /No se puede eliminar/],
    [ERRNO.VALOR_INVALIDO, ErrorValidacion, /formato inválido/],
    [ERRNO.VALOR_INVALIDO_CAMPO, ErrorValidacion, /formato inválido/],
    [ERRNO.DATO_LARGO, ErrorValidacion, /demasiado largo/],
    [ERRNO.FUERA_DE_RANGO, ErrorValidacion, /fuera del rango/],
  ])("traduce el número de error %s", (errno, clase, mensaje) => {
    const traducido = traducirErrorMySql(errorMySql(errno));

    expect(traducido).toBeInstanceOf(clase);
    expect((traducido as Error).message).toMatch(mensaje);
  });

  it("NOT NULL y CHECK no se traducen: son un bug de validación y deben verse como 500", () => {
    for (const errno of [ERRNO.NULO, ERRNO.SIN_VALOR_POR_DEFECTO, ERRNO.CHECK_MYSQL, ERRNO.CHECK_MARIADB]) {
      const original = errorMySql(errno);
      expect(traducirErrorMySql(original)).toBe(original);
    }
  });

  it("deja pasar los errores que no son de MySQL y los ya traducidos", () => {
    const comun = new Error("otro");
    const dominio = new ErrorConflicto("x");

    expect(traducirErrorMySql(comun)).toBe(comun);
    expect(traducirErrorMySql(dominio)).toBe(dominio);
    expect(traducirErrorMySql("texto")).toBe("texto");
    expect(traducirErrorMySql(null)).toBeNull();
  });

  it("nunca copia el mensaje del motor (lleva los valores, p. ej. el correo)", () => {
    const traducido = traducirErrorMySql(duplicadoMySql8("usuarios.uk_usuarios_email", "ana@correo.com"));

    expect(JSON.stringify(traducido)).not.toContain("ana@correo.com");
    expect((traducido as Error).message).not.toContain("ana@correo.com");
  });
});

describe("sanearMensajeSql", () => {
  it("tapa el valor de un duplicado y conserva la clave", () => {
    const texto = sanearMensajeSql("Duplicate entry 'Ana Perez' for key 'usuarios.uk_usuarios_email'");

    expect(texto).toBe("Duplicate entry [REDACTADO] for key 'usuarios.uk_usuarios_email'");
  });

  it("tapa el valor de un dato rechazado", () => {
    const texto = sanearMensajeSql("Incorrect datetime value: 'mañana por la tarde' for column 'fecha_fin' at row 1");

    expect(texto).not.toContain("mañana");
    expect(texto).toContain("for column 'fecha_fin'");
  });

  it("no toca los mensajes sin datos del usuario", () => {
    expect(sanearMensajeSql("Data too long for column 'nombre' at row 1")).toBe("Data too long for column 'nombre' at row 1");
  });
});
