import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorValidacion } from "@/shared/domain/errors";
import { MySqlClient } from "@/shared/infrastructure/MySqlClient";
import { urlDePruebas } from "../../../../tests/integration/support/conexion";
import { GetPerfilesUseCase } from "../application/ConsultasPerfil";
import { MAXIMO_DE_CARACTERES_DE_DESCRIPCION } from "@/shared/domain/BusquedaSimilar";
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

    describe("búsqueda por palabras y por varios campos (regla 20)", () => {
      const ids = async (q: string, filtros: Parameters<typeof repositorio.listar>[0] = {}) =>
        (await repositorio.listar({ ...filtros, q }, { pagina: 1, limite: 50 })).datos.map((p) => p.usuarioId).sort();
      const ordenados = (...lista: string[]) => [...lista].sort();

      const insertarProducto = async (usuarioId: string, nombre: string, descripcion: string | null, activo: boolean) => {
        const perfil = (await repositorio.buscarPorUsuarioId(usuarioId))!;
        await cliente.ejecutar(
          "INSERT INTO productos (id, perfil_id, nombre, descripcion, imagen_key, activo) VALUES (?, ?, ?, ?, 'productos/p.webp', ?)",
          [randomUUID(), perfil.id, nombre, descripcion, activo ? 1 : 0],
        );
      };

      beforeAll(async () => {
        await insertarProducto(usuarios.dos, "Café especial", "Grano tostado en La Paz", true);
        await insertarProducto(usuarios.tres, "CAFETERÍA Andina", null, true);
        await insertarProducto(usuarios.uno, "Zzz oculto", "Producto que su dueña ocultó", false);
        await insertarProducto(usuarios.inactivo, "Cafetería de una cuenta desactivada", null, true);
      });

      it("busca por el nombre de la emprendedora: nombres y apellidos de su cuenta", async () => {
        expect(await ids(`${prefijo} choque`)).toEqual([usuarios.uno]);
        expect(await ids(`${prefijo} flores maría`)).toEqual(ordenados(usuarios.uno, usuarios.dos, usuarios.tres));
      });

      it("no distingue acentos ni mayúsculas, en cualquier campo", async () => {
        expect(await ids(`${prefijo} MARIA`)).toEqual(await ids(`${prefijo} maría`));
        expect(await ids(`${prefijo} jabones`)).toEqual([usuarios.tres]);
        expect(await ids(`${prefijo} JABÓNES`)).toEqual([usuarios.tres]);
      });

      it("busca en el nombre y en la descripción de los productos activos", async () => {
        expect(await ids(`${prefijo} cafe`)).toEqual(ordenados(usuarios.dos, usuarios.tres));
        expect(await ids(`${prefijo} CAFÉ ESPECIAL`)).toEqual([usuarios.dos]);
        expect(await ids(`${prefijo} tostado`)).toEqual([usuarios.dos]);
        expect(await ids(`${prefijo} cafeteria`)).toEqual([usuarios.tres]);
      });

      it("encuentra una palabra como parte de otra", async () => {
        expect(await ids(`${prefijo} tost`)).toEqual([usuarios.dos]);
        expect(await ids(`${prefijo} ndina`)).toEqual([usuarios.tres]);
      });

      it("un producto oculto no hace aparecer a su dueña", async () => {
        expect(await ids(`${prefijo} zzz`)).toEqual([]);
        expect(await ids(`${prefijo} ocultó`)).toEqual([]);
      });

      it("el producto de una cuenta desactivada no la hace aparecer (regla 18)", async () => {
        expect(await ids(`${prefijo} desactivada`)).toEqual([]);
        expect(await ids(`${prefijo} cafe`)).not.toContain(usuarios.inactivo);
      });

      it("cada palabra puede estar en un campo distinto y en cualquier orden", async () => {
        expect(await ids(`${prefijo} tostado maría`)).toEqual([usuarios.dos]);
        expect(await ids(`maría tostado ${prefijo}`)).toEqual([usuarios.dos]);
        expect(await ids(`${prefijo}   tostado   maría `)).toEqual([usuarios.dos]);
      });

      it("todas las palabras deben aparecer: si una no está en ningún campo, no hay resultado", async () => {
        expect(await ids(`${prefijo} tostado jabones`)).toEqual([]);
        expect(await ids(`${prefijo} maría inexistentepalabra`)).toEqual([]);
      });

      it("se combina con la ciudad y el rubro con AND: ningún filtro anula a otro", async () => {
        expect(await ids(`${prefijo} cafe`, { ciudadId: ciudadB })).toEqual([usuarios.dos]);
        expect(await ids(`${prefijo} cafe`, { rubroId: rubroA })).toEqual([usuarios.tres]);
        expect(await ids(`${prefijo} cafe`, { ciudadId: ciudadB, rubroId: rubroA })).toEqual([]);
        expect(await ids(`${prefijo} cafe`, { ciudadId: ciudadB, rubroId: rubroB })).toEqual([usuarios.dos]);
      });

      it("el total cuenta los mismos perfiles que se listan", async () => {
        const { datos, total } = await repositorio.listar({ q: `${prefijo} cafe` }, { pagina: 1, limite: 1 });

        expect(total).toBe(2);
        expect(datos).toHaveLength(1);
      });

      it("un % o _ escrito en una palabra sigue buscándose tal cual", async () => {
        expect(await ids(`${prefijo} maría 100%`)).toEqual([usuarios.tres]);
        expect(await ids(`${prefijo} maría 1_0%`)).toEqual([]);
      });

      describe("resultados similares (regla 20)", () => {
        const perfilDe = async (usuarioId: string) => (await repositorio.buscarPorUsuarioId(usuarioId))!.id;
        const usecase = new GetPerfilesUseCase(repositorio);
        const parecidos = async (q: string, filtros: { ciudadId?: string; rubroId?: string } = {}) => {
          const resultado = await usecase.ejecutar({ ...filtros, q }, { pagina: 1, limite: 50 });
          return { usuarios: resultado.datos.map((p) => p.usuarioId).sort(), similares: resultado.similares, total: resultado.total };
        };

        beforeAll(async () => {
          await insertarProducto(usuarios.uno, "Mermelada de frutilla", "x".repeat(MAXIMO_DE_CARACTERES_DE_DESCRIPCION + 100), true);
        });

        it("textosBuscables entrega los textos de los perfiles activos y solo sus productos activos", async () => {
          const textos = await repositorio.textosBuscables({});
          const [idUno, idDos, idInactivo] = await Promise.all([usuarios.uno, usuarios.dos, usuarios.inactivo].map(perfilDe));
          const dos = textos.find((t) => t.perfilId === idDos);
          const uno = textos.find((t) => t.perfilId === idUno);

          expect(dos).toMatchObject({
            nombreNegocio: `${prefijo} Tienda`,
            nombreEmprendedora: "María Flores",
            productos: [{ nombre: "Café especial", descripcion: "Grano tostado en La Paz" }],
          });
          expect(uno?.productos.map((p) => p.nombre)).toEqual(["Mermelada de frutilla"]);
          expect(textos.some((t) => t.perfilId === idInactivo)).toBe(false);
        });

        it("de cada descripción de producto entrega solo el comienzo", async () => {
          const textos = await repositorio.textosBuscables({});
          const idUno = await perfilDe(usuarios.uno);
          const uno = textos.find((t) => t.perfilId === idUno)!;

          expect(uno.productos[0].descripcion).toHaveLength(MAXIMO_DE_CARACTERES_DE_DESCRIPCION);
        });

        it("textosBuscables respeta la ciudad y el rubro", async () => {
          const idDos = await perfilDe(usuarios.dos);

          expect((await repositorio.textosBuscables({ ciudadId: ciudadB })).filter((t) => t.nombreNegocio.startsWith(prefijo)).map((t) => t.perfilId)).toEqual([idDos]);
          expect((await repositorio.textosBuscables({ rubroId: rubroB })).filter((t) => t.nombreNegocio.startsWith(prefijo)).map((t) => t.perfilId)).toEqual([idDos]);
          expect((await repositorio.textosBuscables({ ciudadId: ciudadB, rubroId: rubroA })).filter((t) => t.nombreNegocio.startsWith(prefijo))).toEqual([]);
        });

        it("listarPorIds respeta el orden dado y omite las cuentas desactivadas y los ids que no existen", async () => {
          const [uno, dos, tres, inactivo] = await Promise.all([usuarios.uno, usuarios.dos, usuarios.tres, usuarios.inactivo].map(perfilDe));

          expect((await repositorio.listarPorIds([tres, inactivo, randomUUID(), uno, dos])).map((p) => p.id)).toEqual([tres, uno, dos]);
          expect(await repositorio.listarPorIds([])).toEqual([]);
        });

        it("sin coincidencia exacta devuelve el perfil parecido y lo marca", async () => {
          expect(await parecidos(`${prefijo} jabonez`)).toEqual({ usuarios: [usuarios.tres], similares: true, total: 1 });
          expect(await parecidos(`${prefijo} maria floress tostdo`)).toMatchObject({ usuarios: [usuarios.dos], similares: true });
        });

        it("con una coincidencia exacta no muestra parecidos", async () => {
          expect(await parecidos(`${prefijo} jabones`)).toEqual({ usuarios: [usuarios.tres], similares: false, total: 1 });
        });

        it("los parecidos también se combinan con la ciudad y el rubro con AND", async () => {
          expect(await parecidos(`${prefijo} jabonez`, { ciudadId: ciudadA })).toMatchObject({ usuarios: [usuarios.tres], similares: true });
          expect(await parecidos(`${prefijo} jabonez`, { ciudadId: ciudadB })).toEqual({ usuarios: [], similares: false, total: 0 });
          expect(await parecidos(`${prefijo} jabonez`, { rubroId: rubroB })).toEqual({ usuarios: [], similares: false, total: 0 });
        });

        it("un producto oculto o de una cuenta desactivada no hace parecer a su dueña", async () => {
          expect(await parecidos(`${prefijo} oculto`)).toMatchObject({ usuarios: [] });
          expect(await parecidos(`${prefijo} desactivda`)).toMatchObject({ usuarios: [] });
        });
      });
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
