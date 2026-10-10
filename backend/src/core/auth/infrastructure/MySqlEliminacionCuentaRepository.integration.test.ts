import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorNoEncontrado } from "@/shared/domain/errors";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { MySqlEliminacionCuentaRepository } from "./MySqlEliminacionCuentaRepository";

// Regla 5: eliminar una cuenta por completo. Contra MySQL real: se borra todo lo que depende de la cuenta y solo eso.
const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlEliminacionCuentaRepository(cliente);
const prefijo = `elim-${randomUUID().slice(0, 8)}`;
const ids = { rolEmprendedor: randomUUID(), rolAdmin: randomUUID(), ciudad: randomUUID(), rubro: randomUUID() };
let creamosRolEmprendedor = false;
let creamosRolAdmin = false;
const correo = (clave: string) => `${prefijo}-${clave}@prueba.test`;

async function rolId(nombre: "Emprendedor" | "Admin"): Promise<string> {
  const [fila] = await cliente.consultar<{ id: string }>("SELECT id FROM roles WHERE nombre = ?", [nombre]);
  if (fila) return fila.id;
  const id = nombre === "Emprendedor" ? ids.rolEmprendedor : ids.rolAdmin;
  await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [id, nombre]);
  if (nombre === "Emprendedor") creamosRolEmprendedor = true;
  else creamosRolAdmin = true;
  return id;
}

interface CuentaCreada {
  usuarioId: string;
  perfilId: string;
  productoIds: string[];
  descuentoIds: string[];
}

// Una cuenta con perfil, 3 productos, 2 descuentos asignados, clics, un OTP y un intento de acceso.
async function crearCuentaCompleta(clave: string, opciones: { activo?: boolean } = {}): Promise<CuentaCreada> {
  const rol = await rolId("Emprendedor");
  const usuarioId = randomUUID();
  const perfilId = randomUUID();
  await cliente.ejecutar(
    "INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id, activo) VALUES (?, ?, 'María', 'Flores', 'hash', ?, ?)",
    [usuarioId, correo(clave), rol, opciones.activo === false ? 0 : 1],
  );
  await cliente.ejecutar(
    `INSERT INTO perfiles_emprendedores (id, usuario_id, nombre_negocio, descripcion, whatsapp, ciudad_id, rubro_id, foto_perfil_key, logo_key)
     VALUES (?, ?, ?, 'd', '59171234567', ?, ?, ?, ?)`,
    [perfilId, usuarioId, `${prefijo} ${clave}`, ids.ciudad, ids.rubro, `perfiles/${clave}-foto.webp`, `logos/${clave}-logo.webp`],
  );
  const productoIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const id = randomUUID();
    productoIds.push(id);
    await cliente.ejecutar("INSERT INTO productos (id, perfil_id, nombre, imagen_key) VALUES (?, ?, ?, ?)", [id, perfilId, `${prefijo} P${i}`, `productos/${clave}-${i}.webp`]);
  }
  const descuentoIds: string[] = [];
  for (let i = 1; i <= 2; i++) {
    const id = randomUUID();
    descuentoIds.push(id);
    await cliente.ejecutar("INSERT INTO descuentos (id, perfil_id, porcentaje) VALUES (?, ?, ?)", [id, perfilId, 10 * i]);
    await cliente.ejecutar("INSERT INTO producto_descuentos (producto_id, descuento_id) VALUES (?, ?)", [productoIds[0], id]);
  }
  for (const tipo of ["whatsapp", "whatsapp", "instagram"]) {
    await cliente.ejecutar("INSERT INTO clics_contacto (id, perfil_id, tipo) VALUES (?, ?, ?)", [randomUUID(), perfilId, tipo]);
  }
  await cliente.ejecutar("INSERT INTO otp_codigos (id, email, proposito, codigo_hash, expira_en) VALUES (?, ?, 'restablecer_password', 'h', '2030-01-01 00:00:00')", [randomUUID(), correo(clave)]);
  await cliente.ejecutar("INSERT INTO intentos_login (id, email) VALUES (?, ?)", [randomUUID(), correo(clave)]);
  // Dos sesiones abiertas (dos dispositivos), una sin vencimiento y otra con él.
  await cliente.ejecutar("INSERT INTO sesiones (id, usuario_id, expira_en) VALUES (?, ?, NULL)", [randomUUID(), usuarioId]);
  await cliente.ejecutar("INSERT INTO sesiones (id, usuario_id, expira_en) VALUES (?, ?, '2030-01-01 00:00:00')", [randomUUID(), usuarioId]);
  return { usuarioId, perfilId, productoIds, descuentoIds };
}

const contar = async (sql: string, valores: unknown[]) => Number((await cliente.consultar<{ n: number }>(sql, valores))[0].n);

async function quedaDeLaCuenta(c: CuentaCreada, clave: string) {
  return {
    usuario: await contar("SELECT COUNT(*) AS n FROM usuarios WHERE id = ?", [c.usuarioId]),
    perfil: await contar("SELECT COUNT(*) AS n FROM perfiles_emprendedores WHERE id = ?", [c.perfilId]),
    productos: await contar("SELECT COUNT(*) AS n FROM productos WHERE perfil_id = ?", [c.perfilId]),
    descuentos: await contar("SELECT COUNT(*) AS n FROM descuentos WHERE perfil_id = ?", [c.perfilId]),
    asignaciones: await contar("SELECT COUNT(*) AS n FROM producto_descuentos WHERE producto_id IN (?)", [c.productoIds]),
    clics: await contar("SELECT COUNT(*) AS n FROM clics_contacto WHERE perfil_id = ?", [c.perfilId]),
    otp: await contar("SELECT COUNT(*) AS n FROM otp_codigos WHERE email = ?", [correo(clave)]),
    intentos: await contar("SELECT COUNT(*) AS n FROM intentos_login WHERE email = ?", [correo(clave)]),
    sesiones: await contar("SELECT COUNT(*) AS n FROM sesiones WHERE usuario_id = ?", [c.usuarioId]),
  };
}

beforeAll(async () => {
  await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [ids.ciudad, `${prefijo} Ciudad`]);
  await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [ids.rubro, `${prefijo} Rubro`]);
});

afterAll(async () => {
  const perfiles = `(SELECT id FROM perfiles_emprendedores WHERE nombre_negocio LIKE '${prefijo}%')`;
  await cliente.ejecutar(`DELETE FROM clics_contacto WHERE perfil_id IN ${perfiles}`);
  await cliente.ejecutar(`DELETE FROM producto_descuentos WHERE producto_id IN (SELECT id FROM productos WHERE perfil_id IN ${perfiles})`);
  await cliente.ejecutar(`DELETE FROM descuentos WHERE perfil_id IN ${perfiles}`);
  await cliente.ejecutar(`DELETE FROM productos WHERE perfil_id IN ${perfiles}`);
  await cliente.ejecutar("DELETE FROM perfiles_emprendedores WHERE nombre_negocio LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM otp_codigos WHERE email LIKE ?", [`${prefijo}-%`]);
  await cliente.ejecutar("DELETE FROM intentos_login WHERE email LIKE ?", [`${prefijo}-%`]);
  await cliente.ejecutar("DELETE FROM sesiones WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE ?)", [`${prefijo}-%`]);
  await cliente.ejecutar("DELETE FROM usuarios WHERE email LIKE ?", [`${prefijo}-%`]);
  await cliente.ejecutar("DELETE FROM ciudades WHERE id = ?", [ids.ciudad]);
  await cliente.ejecutar("DELETE FROM rubros WHERE id = ?", [ids.rubro]);
  if (creamosRolEmprendedor) await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [ids.rolEmprendedor]);
  if (creamosRolAdmin) await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [ids.rolAdmin]);
  await cliente.cerrar();
});

describe("MySqlEliminacionCuentaRepository", () => {
  it("borra la cuenta y todo lo que depende de ella, y cuenta lo borrado", async () => {
    const cuenta = await crearCuentaCompleta("completa");

    const resumen = await repositorio.eliminar(cuenta.usuarioId);

    expect(resumen).toMatchObject({ perfiles: 1, productos: 3, descuentos: 2, clics: 3 });
    expect(resumen.clavesImagenes.sort()).toEqual(
      ["perfiles/completa-foto.webp", "logos/completa-logo.webp", "productos/completa-1.webp", "productos/completa-2.webp", "productos/completa-3.webp"].sort(),
    );
    expect(await quedaDeLaCuenta(cuenta, "completa")).toEqual({ usuario: 0, perfil: 0, productos: 0, descuentos: 0, asignaciones: 0, clics: 0, otp: 0, intentos: 0, sesiones: 0 });
  });

  it("no toca nada de las demás cuentas (ni sus clics, ni sus productos, ni sus códigos)", async () => {
    const eliminada = await crearCuentaCompleta("a-eliminar");
    const vecina = await crearCuentaCompleta("vecina");

    await repositorio.eliminar(eliminada.usuarioId);

    expect(await quedaDeLaCuenta(vecina, "vecina")).toEqual({ usuario: 1, perfil: 1, productos: 3, descuentos: 2, asignaciones: 2, clics: 3, otp: 1, intentos: 1, sesiones: 2 });
  });

  it("una cuenta sin perfil se elimina igual y no devuelve imágenes", async () => {
    const rol = await rolId("Emprendedor");
    const usuarioId = randomUUID();
    await cliente.ejecutar("INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'Ana', 'Rojas', 'hash', ?)", [usuarioId, correo("sin-perfil"), rol]);

    const resumen = await repositorio.eliminar(usuarioId);

    expect(resumen).toEqual({ perfiles: 0, productos: 0, descuentos: 0, clics: 0, clavesImagenes: [] });
    expect(await contar("SELECT COUNT(*) AS n FROM usuarios WHERE id = ?", [usuarioId])).toBe(0);
  });

  it("una cuenta suspendida no se elimina (409) y no se pierde nada", async () => {
    const cuenta = await crearCuentaCompleta("suspendida", { activo: false });

    await expect(repositorio.eliminar(cuenta.usuarioId)).rejects.toBeInstanceOf(ErrorConflicto);

    expect(await quedaDeLaCuenta(cuenta, "suspendida")).toEqual({ usuario: 1, perfil: 1, productos: 3, descuentos: 2, asignaciones: 2, clics: 3, otp: 1, intentos: 1, sesiones: 2 });
  });

  it("una cuenta de Admin no se elimina (409) aunque la pidan por su id", async () => {
    const rol = await rolId("Admin");
    const adminId = randomUUID();
    await cliente.ejecutar("INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'Root', 'Admin', 'hash', ?)", [adminId, correo("admin"), rol]);

    await expect(repositorio.eliminar(adminId)).rejects.toBeInstanceOf(ErrorConflicto);

    expect(await contar("SELECT COUNT(*) AS n FROM usuarios WHERE id = ?", [adminId])).toBe(1);
  });

  it("una cuenta que no existe da 404", async () => {
    await expect(repositorio.eliminar(randomUUID())).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("es todo o nada: si algo falla a la mitad, la cuenta y sus datos quedan intactos", async () => {
    const cuenta = await crearCuentaCompleta("a-medias");
    // Un cliente cuya transacción falla justo al borrar la cuenta (después de haber borrado todo lo demás).
    const fallando = new MySqlEliminacionCuentaRepository({
      transaccion: (trabajo) =>
        cliente.transaccion((tx) =>
          trabajo({
            consultar: (texto, valores) => tx.consultar(texto, valores),
            ejecutar: (texto, valores) => {
              if (texto.startsWith("DELETE FROM usuarios")) throw new Error("falla simulada al final");
              return tx.ejecutar(texto, valores);
            },
          }),
        ),
    });

    await expect(fallando.eliminar(cuenta.usuarioId)).rejects.toThrow("falla simulada al final");

    expect(await quedaDeLaCuenta(cuenta, "a-medias")).toEqual({ usuario: 1, perfil: 1, productos: 3, descuentos: 2, asignaciones: 2, clics: 3, otp: 1, intentos: 1, sesiones: 2 });
  });
});
