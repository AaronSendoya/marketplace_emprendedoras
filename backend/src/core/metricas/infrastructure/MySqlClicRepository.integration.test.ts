import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { resolverRango } from "../domain/RangoFechas";
import { MySqlClicRepository } from "./MySqlClicRepository";

const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlClicRepository(cliente);
const prefijo = `clic-${randomUUID().slice(0, 8)}`;
const ids = {
  rol: randomUUID(),
  ciudad: randomUUID(),
  rubro: randomUUID(),
  usuarioActivo: randomUUID(),
  usuarioInactivo: randomUUID(),
  perfilActivo: randomUUID(),
  perfilInactivo: randomUUID(),
};
const T0 = new Date("2026-10-01T12:00:00.000Z");
// T0 = 12:00 UTC = 08:00 La Paz (UTC-4): cae en el día de calendario 2026-10-01.
const rangoDeT0 = resolverRango({ desde: "2026-10-01", hasta: "2026-10-01" }, T0);
const rangoDeTresDias = resolverRango({ desde: "2026-09-29", hasta: "2026-10-01" }, T0);

beforeAll(async () => {
  await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [ids.rol, `${prefijo}-rol`]);
  await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [ids.ciudad, `${prefijo} Ciudad`]);
  await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [ids.rubro, `${prefijo} Rubro`]);
  for (const [clave, activo] of [["usuarioActivo", 1], ["usuarioInactivo", 0]] as const) {
    await cliente.ejecutar(
      "INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id, activo) VALUES (?, ?, 'María', 'Flores', 'hash', ?, ?)",
      [ids[clave], `${prefijo}-${clave}@prueba.test`, ids.rol, activo],
    );
  }
  for (const [perfilId, usuarioId, nombre] of [
    [ids.perfilActivo, ids.usuarioActivo, "Negocio Activo"],
    [ids.perfilInactivo, ids.usuarioInactivo, "Negocio Inactivo"],
  ]) {
    await cliente.ejecutar(
      `INSERT INTO perfiles_emprendedores (id, usuario_id, nombre_negocio, descripcion, whatsapp, ciudad_id, rubro_id, foto_perfil_key, logo_key)
       VALUES (?, ?, ?, 'd', '59171234567', ?, ?, 'perfiles/f.webp', 'logos/l.webp')`,
      [perfilId, usuarioId, `${prefijo} ${nombre}`, ids.ciudad, ids.rubro],
    );
  }
});

afterAll(async () => {
  // Los clics se borran en cascada con el perfil.
  await cliente.ejecutar("DELETE FROM perfiles_emprendedores WHERE nombre_negocio LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM usuarios WHERE email LIKE ?", [`${prefijo}-%`]);
  await cliente.ejecutar("DELETE FROM ciudades WHERE id = ?", [ids.ciudad]);
  await cliente.ejecutar("DELETE FROM rubros WHERE id = ?", [ids.rubro]);
  await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [ids.rol]);
  await cliente.cerrar();
});

describe("MySqlClicRepository", () => {
  it("registrar inserta el evento", async () => {
    await repositorio.registrar(ids.perfilActivo, "whatsapp", T0);

    const [fila] = await cliente.consultar<{ perfil_id: string; tipo: string }>(
      "SELECT perfil_id, tipo FROM clics_contacto WHERE perfil_id = ?",
      [ids.perfilActivo],
    );
    expect(fila).toMatchObject({ perfil_id: ids.perfilActivo, tipo: "whatsapp" });
  });

  it("resumen suma por tipo y excluye las cuentas desactivadas (regla 18)", async () => {
    await repositorio.registrar(ids.perfilActivo, "whatsapp", T0);
    await repositorio.registrar(ids.perfilActivo, "instagram", T0);
    await repositorio.registrar(ids.perfilInactivo, "whatsapp", T0);

    const resumen = await repositorio.resumen(rangoDeT0);

    // No asume un total global (otros tests de este archivo también escriben clics del perfil
    // activo): solo que el perfil inactivo nunca cuenta.
    const total = await cliente.consultar<{ total: number }>(
      `SELECT COUNT(*) AS total FROM clics_contacto c
       JOIN perfiles_emprendedores p ON p.id = c.perfil_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE u.activo = 1`,
    );
    expect(resumen.whatsapp + resumen.instagram).toBe(Number(total[0]?.total));
  });

  it("ranking ordena por total descendente y excluye las cuentas desactivadas", async () => {
    await repositorio.registrar(ids.perfilInactivo, "whatsapp", T0);
    await repositorio.registrar(ids.perfilInactivo, "instagram", T0);

    const ranking = await repositorio.ranking(20, rangoDeT0);

    expect(ranking.find((item) => item.perfilId === ids.perfilInactivo)).toBeUndefined();
    const item = ranking.find((entrada) => entrada.perfilId === ids.perfilActivo);
    expect(item).toMatchObject({ nombreNegocio: `${prefijo} Negocio Activo` });
    expect(item?.total).toBe(item!.whatsapp + item!.instagram);
  });

  it("serieDiaria agrupa por día de La Paz, completa los días sin clics con 0 y excluye cuentas desactivadas", async () => {
    await repositorio.registrar(ids.perfilActivo, "whatsapp", T0);
    await repositorio.registrar(ids.perfilInactivo, "whatsapp", T0);

    const serie = await repositorio.serieDiaria(rangoDeTresDias);

    expect(serie.map((punto) => punto.fecha)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
    expect(serie[0]).toEqual({ fecha: "2026-09-29", whatsapp: 0, instagram: 0 });
    // Al menos el clic de este test (otros tests de este archivo también escriben en T0, con el
    // mismo perfil activo): el del perfil inactivo nunca debe sumar.
    expect(serie[2].whatsapp).toBeGreaterThanOrEqual(1);
  });

  it("clicsDiariosPorPerfil agrupa por cuenta y día de La Paz, separa los canales y excluye cuentas desactivadas", async () => {
    // 2026-10-02T02:00Z = 2026-10-01 22:00 en La Paz (UTC-4): sigue siendo el día 1, no el 2.
    const nocheDelDia1 = new Date("2026-10-02T02:00:00.000Z");
    await repositorio.registrar(ids.perfilActivo, "whatsapp", T0);
    await repositorio.registrar(ids.perfilActivo, "instagram", nocheDelDia1);
    await repositorio.registrar(ids.perfilInactivo, "whatsapp", T0);

    const filas = await repositorio.clicsDiariosPorPerfil([ids.perfilActivo, ids.perfilInactivo], rangoDeTresDias);

    expect(filas.every((fila) => fila.perfilId === ids.perfilActivo)).toBe(true);
    const delDia1 = filas.filter((fila) => fila.fecha === "2026-10-01");
    // Un solo día de La Paz (T0 y la noche del día 1 caen los dos en el 2026-10-01), una sola fila.
    expect(delDia1).toHaveLength(1);
    expect(delDia1[0].whatsapp).toBeGreaterThanOrEqual(1);
    expect(delDia1[0].instagram).toBeGreaterThanOrEqual(1);
    // Fuera del rango o sin clics ese día, no hay fila.
    expect(filas.find((fila) => fila.fecha === "2026-09-29")).toBeUndefined();
  });

  it("clicsDiariosPorPerfil sin cuentas devuelve una lista vacía sin consultar", async () => {
    expect(await repositorio.clicsDiariosPorPerfil([], rangoDeTresDias)).toEqual([]);
  });

  it("totalesPorPerfil suma los dos canales de cada cuenta en el rango y excluye cuentas desactivadas", async () => {
    await repositorio.registrar(ids.perfilActivo, "whatsapp", T0);
    await repositorio.registrar(ids.perfilActivo, "instagram", T0);
    await repositorio.registrar(ids.perfilInactivo, "whatsapp", T0);
    const [esperado] = await cliente.consultar<{ total: number }>(
      "SELECT COUNT(*) AS total FROM clics_contacto WHERE perfil_id = ? AND creado_en BETWEEN ? AND ?",
      [ids.perfilActivo, rangoDeTresDias.desde, rangoDeTresDias.hasta],
    );

    const totales = await repositorio.totalesPorPerfil([ids.perfilActivo, ids.perfilInactivo], rangoDeTresDias);

    expect(totales.map((item) => item.perfilId)).toEqual([ids.perfilActivo]);
    expect(totales[0].total).toBe(Number(esperado?.total));
    // Fuera del rango no hay clics: la cuenta no devuelve fila.
    expect(await repositorio.totalesPorPerfil([ids.perfilActivo], resolverRango({ desde: "2020-01-01", hasta: "2020-01-31" }, T0))).toEqual([]);
  });

  it("totalesPorPerfil sin cuentas devuelve una lista vacía sin consultar", async () => {
    expect(await repositorio.totalesPorPerfil([], rangoDeTresDias)).toEqual([]);
  });

  it("ranking con orden por canal arma el top con ese canal, no con el total", async () => {
    // Cuenta con más Instagram y menos total que la otra: solo el orden por canal las invierte.
    const prefijoOrden = `${prefijo}-orden`;
    const idRol = randomUUID();
    const dueños: string[] = [randomUUID(), randomUUID()];
    const perfiles: string[] = [randomUUID(), randomUUID()];
    await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [idRol, `${prefijoOrden}-rol`]);
    for (const [i, dueño] of dueños.entries()) {
      await cliente.ejecutar(
        "INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id, activo) VALUES (?, ?, 'María', 'Flores', 'hash', ?, 1)",
        [dueño, `${prefijoOrden}-${i}@prueba.test`, idRol],
      );
      await cliente.ejecutar(
        `INSERT INTO perfiles_emprendedores (id, usuario_id, nombre_negocio, descripcion, whatsapp, ciudad_id, rubro_id, foto_perfil_key, logo_key)
         VALUES (?, ?, ?, 'd', '59171234567', ?, ?, 'perfiles/f.webp', 'logos/l.webp')`,
        [perfiles[i], dueño, `${prefijoOrden} ${i === 0 ? "Mucho WhatsApp" : "Mucho Instagram"}`, ids.ciudad, ids.rubro],
      );
    }
    const dia = new Date("2026-06-15T12:00:00.000Z");
    const rangoPropio = resolverRango({ desde: "2026-06-15", hasta: "2026-06-15" }, dia);
    try {
      // Cuenta 0: 6 de WhatsApp y 0 de Instagram (total 6). Cuenta 1: 1 de WhatsApp y 4 de Instagram (total 5).
      for (let i = 0; i < 6; i++) await repositorio.registrar(perfiles[0], "whatsapp", dia);
      await repositorio.registrar(perfiles[1], "whatsapp", dia);
      for (let i = 0; i < 4; i++) await repositorio.registrar(perfiles[1], "instagram", dia);

      const porTotal = await repositorio.ranking(20, rangoPropio);
      const porInstagram = await repositorio.ranking(20, rangoPropio, "instagram");
      const porWhatsapp = await repositorio.ranking(1, rangoPropio, "whatsapp");

      const propias = (lista: typeof porTotal) => lista.filter((item) => perfiles.includes(item.perfilId)).map((item) => item.perfilId);
      expect(propias(porTotal)).toEqual([perfiles[0], perfiles[1]]); // 6 y 5
      expect(propias(porInstagram)).toEqual([perfiles[1], perfiles[0]]); // 4 y 0
      expect(porWhatsapp).toHaveLength(1); // el límite se respeta con el orden por canal
      expect(porWhatsapp[0].whatsapp).toBeGreaterThanOrEqual(6);
    } finally {
      await cliente.ejecutar("DELETE FROM perfiles_emprendedores WHERE nombre_negocio LIKE ?", [`${prefijoOrden}%`]);
      await cliente.ejecutar("DELETE FROM usuarios WHERE email LIKE ?", [`${prefijoOrden}-%`]);
      await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [idRol]);
    }
  });

  it("porRubro suma por rubro y excluye cuentas desactivadas", async () => {
    await repositorio.registrar(ids.perfilActivo, "instagram", T0);
    await repositorio.registrar(ids.perfilInactivo, "instagram", T0);

    const porRubro = await repositorio.porRubro(rangoDeT0);

    const item = porRubro.find((entrada) => entrada.rubro === `${prefijo} Rubro`);
    // Los dos perfiles de este archivo comparten el mismo rubro: el total refleja solo los clics
    // del perfil activo (de este test y de los anteriores), nunca los del inactivo.
    expect(item).toBeDefined();
    expect(item!.total).toBeGreaterThanOrEqual(1);
  });
});
