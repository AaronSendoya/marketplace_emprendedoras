import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorValidacion } from "@/shared/domain/errors";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import type { NuevoPerfil } from "../domain/Perfil";
import { MySqlPerfilRepository } from "./MySqlPerfilRepository";

const cliente = new MySqlClient(urlDePruebas());
const repositorio = new MySqlPerfilRepository(cliente);
const prefijo = `perfil-${randomUUID().slice(0, 8)}`;
const rolId = randomUUID();
const ciudadA = randomUUID();
const ciudadB = randomUUID();
const rubroA = randomUUID();
const rubroB = randomUUID();
const usuarios = { uno: randomUUID(), dos: randomUUID(), tres: randomUUID(), inactivo: randomUUID(), sinPerfil: randomUUID() };
const T0 = new Date("2026-09-23T12:00:00.000Z");
const enMin = (minutos: number) => new Date(T0.getTime() + minutos * 60_000);

const nuevo = (usuarioId: string, parches: Partial<NuevoPerfil> = {}): NuevoPerfil => ({
  usuarioId,
  nombreNegocio: `${prefijo} Tienda`,
  descripcion: "Descripción",
  whatsapp: "59171234567",
  instagramUsername: "tienda",
  otraRedSocial: "tienda_tiktok",
  ciudadId: ciudadA,
  rubroId: rubroA,
  fotoPerfilKey: "perfiles/f.webp",
  logoKey: "logos/l.webp",
  ahora: T0,
  ...parches,
});

beforeAll(async () => {
  await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [rolId, `${prefijo}-rol`]);
  for (const [id, nombre] of [[ciudadA, "Ciudad A"], [ciudadB, "Ciudad B"]]) {
    await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [id, `${prefijo} ${nombre}`]);
  }
  for (const [id, nombre] of [[rubroA, "Rubro A"], [rubroB, "Rubro B"]]) {
    await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [id, `${prefijo} ${nombre}`]);
  }
  for (const [clave, id] of Object.entries(usuarios)) {
    await cliente.ejecutar(
      `INSERT INTO usuarios (id, email, nombres, apellido_paterno, apellido_materno, password_hash, rol_id, activo)
       VALUES (?, ?, 'María', 'Flores', ?, 'hash', ?, ?)`,
      [id, `${prefijo}-${clave}@prueba.test`, clave === "uno" ? "Choque" : null, rolId, clave === "inactivo" ? 0 : 1],
    );
  }
});

afterAll(async () => {
  await cliente.ejecutar("DELETE FROM perfiles_emprendedores WHERE nombre_negocio LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM usuarios WHERE email LIKE ?", [`${prefijo}-%`]);
  await cliente.ejecutar("DELETE FROM ciudades WHERE nombre LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM rubros WHERE nombre LIKE ?", [`${prefijo}%`]);
  await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [rolId]);
  await cliente.cerrar();
});

describe("MySqlPerfilRepository", () => {
  it("crear guarda el perfil y lo devuelve con ciudad, rubro y nombre completo de la emprendedora", async () => {
    const perfil = await repositorio.crear(nuevo(usuarios.uno));

    expect(perfil).toMatchObject({
      usuarioId: usuarios.uno,
      usuarioActivo: true,
      nombreEmprendedora: "María Flores Choque",
      nombreNegocio: `${prefijo} Tienda`,
      whatsapp: "59171234567",
      instagramUsername: "tienda",
      otraRedSocial: "tienda_tiktok",
      ciudad: { id: ciudadA, nombre: `${prefijo} Ciudad A` },
      rubro: { id: rubroA, nombre: `${prefijo} Rubro A` },
      fotoPerfilKey: "perfiles/f.webp",
      logoKey: "logos/l.webp",
      creadoEn: T0,
      actualizadoEn: T0,
    });
    expect(perfil.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sin apellido materno el nombre completo no lleva espacios de más; el Instagram puede ser null", async () => {
    const perfil = await repositorio.crear(nuevo(usuarios.dos, { instagramUsername: null, ciudadId: ciudadB, rubroId: rubroB, ahora: enMin(1) }));

    expect(perfil.nombreEmprendedora).toBe("María Flores");
    expect(perfil.instagramUsername).toBeNull();
  });

  it("un segundo perfil para el mismo usuario da conflicto (relación 1:1, regla 6)", async () => {
    await expect(repositorio.crear(nuevo(usuarios.uno))).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("una ciudad o un rubro inexistentes dan error de validación con el campo", async () => {
    await expect(repositorio.crear(nuevo(usuarios.sinPerfil, { ciudadId: randomUUID() }))).rejects.toMatchObject({ detalles: [{ campo: "ciudad_id" }] });
    await expect(repositorio.crear(nuevo(usuarios.sinPerfil, { rubroId: randomUUID() }))).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("buscarPorId y buscarPorUsuarioId encuentran el perfil; sin resultado devuelven null", async () => {
    const porUsuario = await repositorio.buscarPorUsuarioId(usuarios.uno);
    const porId = await repositorio.buscarPorId(porUsuario!.id);

    expect(porId).toEqual(porUsuario);
    expect(await repositorio.buscarPorId(randomUUID())).toBeNull();
    expect(await repositorio.buscarPorUsuarioId(usuarios.sinPerfil)).toBeNull();
  });

  it("actualizar cambia solo los campos indicados y la fecha de actualización", async () => {
    const antes = (await repositorio.buscarPorUsuarioId(usuarios.uno))!;

    await repositorio.actualizar(antes.id, { nombreNegocio: `${prefijo} Renombrada`, instagramUsername: null, otraRedSocial: null, logoKey: "logos/nuevo.webp" }, enMin(30));

    expect(await repositorio.buscarPorId(antes.id)).toMatchObject({
      nombreNegocio: `${prefijo} Renombrada`,
      instagramUsername: null,
      otraRedSocial: null,
      logoKey: "logos/nuevo.webp",
      descripcion: antes.descripcion,
      whatsapp: antes.whatsapp,
      fotoPerfilKey: antes.fotoPerfilKey,
      creadoEn: T0,
      actualizadoEn: enMin(30),
    });
  });

  it("actualizar sin cambios no hace nada, y con una ciudad inexistente da error", async () => {
    const perfil = (await repositorio.buscarPorUsuarioId(usuarios.uno))!;

    await expect(repositorio.actualizar(perfil.id, {}, enMin(60))).resolves.toBeUndefined();
    expect((await repositorio.buscarPorId(perfil.id))?.actualizadoEn).toEqual(enMin(30));
    await expect(repositorio.actualizar(perfil.id, { ciudadId: randomUUID() }, enMin(60))).rejects.toBeInstanceOf(ErrorValidacion);
  });

  describe("listar (regla 18)", () => {
    beforeAll(async () => {
      await repositorio.crear(nuevo(usuarios.tres, { nombreNegocio: `${prefijo} 100% Natural`, descripcion: "Jabones de miel", ahora: enMin(5) }));
      await repositorio.crear(nuevo(usuarios.inactivo, { nombreNegocio: `${prefijo} Oculta`, ahora: enMin(10) }));
    });

    const soloMios = async (filtros: Parameters<typeof repositorio.listar>[0], pagina = { pagina: 1, limite: 50 }) => {
      const resultado = await repositorio.listar({ ...filtros, q: filtros.q ?? prefijo }, pagina);
      return resultado;
    };

    it("no incluye perfiles de cuentas desactivadas y ordena los más recientes primero", async () => {
      const { datos, total } = await soloMios({});

      expect(datos.map((p) => p.nombreNegocio)).toEqual([`${prefijo} 100% Natural`, `${prefijo} Tienda`, `${prefijo} Renombrada`].filter((n) => datos.some((p) => p.nombreNegocio === n)));
      expect(datos.some((p) => p.nombreNegocio.endsWith("Oculta"))).toBe(false);
      expect(total).toBe(datos.length);
      expect(datos[0].creadoEn.getTime()).toBeGreaterThan(datos[1].creadoEn.getTime());
    });

    it("filtra por ciudad y por rubro", async () => {
      expect((await soloMios({ ciudadId: ciudadB })).datos.map((p) => p.usuarioId)).toEqual([usuarios.dos]);
      expect((await soloMios({ rubroId: rubroB })).datos.map((p) => p.usuarioId)).toEqual([usuarios.dos]);
      expect((await soloMios({ ciudadId: ciudadB, rubroId: rubroA })).datos).toEqual([]);
    });

    it("busca por texto en el nombre y en la descripción, sin distinguir mayúsculas", async () => {
      expect((await repositorio.listar({ q: "JABONES DE MIEL" }, { pagina: 1, limite: 50 })).datos.map((p) => p.usuarioId)).toEqual([usuarios.tres]);
      expect((await repositorio.listar({ q: `${prefijo} 100% natural` }, { pagina: 1, limite: 50 })).datos).toHaveLength(1);
    });

    it("un % o _ escrito por el usuario se busca tal cual, no como comodín", async () => {
      expect((await repositorio.listar({ q: `${prefijo} 100%` }, { pagina: 1, limite: 50 })).datos).toHaveLength(1);
      expect((await repositorio.listar({ q: `${prefijo} 1_0%` }, { pagina: 1, limite: 50 })).datos).toEqual([]);
      expect((await repositorio.listar({ q: "%" }, { pagina: 1, limite: 50 })).datos.every((p) => (p.nombreNegocio + p.descripcion).includes("%"))).toBe(true);
    });

    it("pagina con un total estable", async () => {
      const pagina1 = await soloMios({}, { pagina: 1, limite: 1 });
      const pagina2 = await soloMios({}, { pagina: 2, limite: 1 });

      expect(pagina1.total).toBe(pagina2.total);
      expect(pagina1.datos).toHaveLength(1);
      expect(pagina2.datos[0].id).not.toBe(pagina1.datos[0].id);
    });

    it("buscarPorId sí devuelve el perfil de una cuenta desactivada, marcado como inactivo", async () => {
      const oculta = (await repositorio.buscarPorUsuarioId(usuarios.inactivo))!;

      expect(oculta.usuarioActivo).toBe(false);
    });
  });
});
