import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorDeDominio, ErrorValidacion } from "@/shared/domain/errors";
import { urlDePruebas } from "../../../tests/integration/support/conexion";
import { REGLAS_POR_RESTRICCION } from "./errorMySql";
import { MySqlClient } from "./MySqlClient";

const cliente = new MySqlClient(urlDePruebas(), { maxConexiones: 3 });
const prefijo = `mysqlclient-${randomUUID().slice(0, 8)}`;
const insertarRol = (sufijo: string) =>
  cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [randomUUID(), `${prefijo}-${sufijo}`]);
const rolesCreados = () => cliente.consultar<{ nombre: string }>("SELECT nombre FROM roles WHERE nombre LIKE ?", [`${prefijo}%`]);

afterAll(async () => {
  await cliente.ejecutar("DELETE FROM usuarios WHERE email LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM roles WHERE nombre LIKE ?", [`${prefijo}%`]);
  await cliente.cerrar();
});

describe("MySqlClient", () => {
  it("consultar devuelve filas y acepta parámetros", async () => {
    expect(await cliente.consultar("SELECT CAST(? AS SIGNED) + CAST(? AS SIGNED) AS suma", [2, 3])).toEqual([{ suma: 5 }]);
  });

  it("consultar expande los arreglos de un IN", async () => {
    const filas = await cliente.consultar("SELECT 1 AS uno WHERE 2 IN (?)", [[1, 2, 3]]);

    expect(filas).toEqual([{ uno: 1 }]);
  });

  it("ejecutar informa cuántas filas afectó, contando las encontradas aunque su valor no cambie", async () => {
    await insertarRol("afectadas");

    // mysql2 pide a MySQL contar las filas que cumplen el WHERE, no solo las modificadas: así un
    // repositorio distingue "no existe" (0) de "existe pero no cambió" (1).
    expect(await cliente.ejecutar("UPDATE roles SET nombre = nombre WHERE nombre = ?", [`${prefijo}-afectadas`])).toEqual({
      filasAfectadas: 1,
    });
    expect(await cliente.ejecutar("UPDATE roles SET nombre = nombre WHERE nombre = ?", [`${prefijo}-no-existe`])).toEqual({
      filasAfectadas: 0,
    });
    expect(await cliente.ejecutar("DELETE FROM roles WHERE nombre = ?", [`${prefijo}-afectadas`])).toEqual({
      filasAfectadas: 1,
    });
  });

  it("cada conexión del pool trabaja en UTC y con modo estricto", async () => {
    // Tres consultas a la vez obligan al pool a abrir más de una conexión.
    const resultados = await Promise.all(
      [1, 2, 3].map(() => cliente.consultar<{ zona: string; modo: string }>("SELECT @@session.time_zone AS zona, @@session.sql_mode AS modo")),
    );

    for (const [fila] of resultados) {
      expect(fila.zona).toBe("+00:00");
      expect(fila.modo).toContain("STRICT_ALL_TABLES");
    }
  });

  it("una fecha de JavaScript se guarda y se lee como el mismo instante", async () => {
    const instante = new Date("2026-12-01T04:00:00.123Z");
    const id = randomUUID();
    await cliente.transaccion(async (tx) => {
      await tx.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [id, `${prefijo}-fecha`]);
      await tx.ejecutar(
        "INSERT INTO otp_codigos (id, email, proposito, codigo_hash, expira_en) VALUES (?, ?, 'verificar_email', 'h', ?)",
        [id, `${prefijo}-fecha@prueba.test`, instante],
      );
    });

    const [fila] = await cliente.consultar<{ expira_en: Date }>("SELECT expira_en FROM otp_codigos WHERE id = ?", [id]);

    expect(fila.expira_en.toISOString()).toBe(instante.toISOString());
    await cliente.ejecutar("DELETE FROM otp_codigos WHERE id = ?", [id]);
  });

  it("transaccion confirma los cambios si el trabajo termina bien", async () => {
    const resultado = await cliente.transaccion(async (tx) => {
      await tx.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [randomUUID(), `${prefijo}-ok`]);
      return "hecho";
    });

    expect(resultado).toBe("hecho");
    expect(await rolesCreados()).toContainEqual({ nombre: `${prefijo}-ok` });
  });

  it("transaccion revierte todo y propaga el error si el trabajo falla", async () => {
    const trabajo = cliente.transaccion(async (tx) => {
      await tx.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [randomUUID(), `${prefijo}-revertido`]);
      throw new Error("falla a propósito");
    });

    await expect(trabajo).rejects.toThrow("falla a propósito");
    expect(await rolesCreados()).not.toContainEqual({ nombre: `${prefijo}-revertido` });
  });

  it("dentro de la transacción se ven los cambios propios; fuera, hasta confirmar", async () => {
    await cliente.transaccion(async (tx) => {
      await tx.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [randomUUID(), `${prefijo}-aislado`]);

      const dentro = await tx.consultar("SELECT 1 FROM roles WHERE nombre = ?", [`${prefijo}-aislado`]);
      const fuera = await cliente.consultar("SELECT 1 FROM roles WHERE nombre = ?", [`${prefijo}-aislado`]);

      expect(dentro).toHaveLength(1);
      expect(fuera).toHaveLength(0);
    });
  });

  it("devuelve la conexión al pool aunque la transacción falle", async () => {
    // El pool tiene 3 conexiones: si las transacciones fallidas no las liberaran, la cuarta se colgaría.
    for (let i = 0; i < 6; i++) {
      await cliente
        .transaccion(async () => {
          throw new Error("falla");
        })
        .catch(() => {});
    }

    expect(await cliente.consultar("SELECT 1 AS uno")).toEqual([{ uno: 1 }]);
  });
});

describe("MySqlClient: errores de la base traducidos", () => {
  const insertarProducto = (perfilId: string) => ({
    texto: "INSERT INTO productos (id, perfil_id, nombre, imagen_key) VALUES (?, ?, 'P', 'k.webp')",
    valores: [randomUUID(), perfilId],
  });

  it("un correo repetido sale como ErrorConflicto con mensaje propio", async () => {
    const rolId = randomUUID();
    await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [rolId, `${prefijo}-rol`]);
    const insertarUsuario = () =>
      cliente.ejecutar(
        "INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'N', 'A', 'h', ?)",
        [randomUUID(), `${prefijo}@prueba.test`, rolId],
      );
    await insertarUsuario();

    const error = await insertarUsuario().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorConflicto);
    expect(error).toMatchObject({ message: "Ya existe una cuenta con ese correo.", detalles: [{ campo: "email" }] });
  });

  it("una referencia inexistente sale como ErrorValidacion con el campo", async () => {
    const { texto, valores } = insertarProducto(randomUUID());

    const error = await cliente.ejecutar(texto, valores).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect(error).toMatchObject({ detalles: [{ campo: "perfil_id", mensaje: "El perfil indicado no existe." }] });
  });

  it("un dato demasiado largo sale como ErrorValidacion", async () => {
    const error = await cliente
      .ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [randomUUID(), "x".repeat(60)])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect(error).toMatchObject({ message: "Un dato es demasiado largo." });
  });

  it("dentro de una transacción también se traduce, y se revierte", async () => {
    const { texto, valores } = insertarProducto(randomUUID());

    const error = await cliente
      .transaccion(async (tx) => {
        await tx.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [randomUUID(), `${prefijo}-tx`]);
        await tx.ejecutar(texto, valores);
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect(await rolesCreados()).not.toContainEqual({ nombre: `${prefijo}-tx` });
  });

  it("un error no previsto llega sin traducir", async () => {
    const error = await cliente.consultar("SELECT * FROM tabla_que_no_existe").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ErrorDeDominio);
  });

  it("el error traducido no contiene el valor del usuario", async () => {
    const correo = `${prefijo}-secreto@prueba.test`;
    const [rol] = await cliente.consultar<{ id: string }>("SELECT id FROM roles WHERE nombre = ?", [`${prefijo}-rol`]);
    const insertar = () =>
      cliente.ejecutar(
        "INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'N', 'A', 'h', ?)",
        [randomUUID(), correo, rol.id],
      );
    await insertar();

    const error = await insertar().catch((e: unknown) => e);

    expect(JSON.stringify(error)).not.toContain(correo);
    expect((error as Error).message).not.toContain(correo);
  });
});

describe("catálogo de restricciones", () => {
  it("todas las del catálogo de mensajes existen en la base", async () => {
    const filas = await cliente.consultar<{ tabla: string; nombre: string }>(
      "SELECT TABLE_NAME AS tabla, CONSTRAINT_NAME AS nombre FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE()",
    );
    const existentes = new Set(filas.flatMap((fila) => [fila.nombre, `${fila.tabla}.${fila.nombre}`]));

    expect(Object.keys(REGLAS_POR_RESTRICCION).filter((nombre) => !existentes.has(nombre))).toEqual([]);
  });
});
