import { createHmac } from "node:crypto";
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { JwtTokenService } from "@/core/auth/infrastructure/JwtTokenService";
import { usuarioDePrueba } from "@/core/auth/testing/dobles";
import { emitirConSesion, SesionRepositoryEnMemoria } from "@/core/auth/testing/SesionRepositoryEnMemoria";
import { UsuarioRepositoryEnMemoria } from "@/core/auth/testing/UsuarioRepositoryEnMemoria";
import { ErrorNoAutenticado } from "@/shared/domain/errors";
import { SystemClock } from "@/shared/infrastructure/SystemClock";

// Regla 5, caja blanca: se fabrican tokens maliciosos y se comprueba que JwtTokenService y
// requireAuth los rechazan. El algoritmo está fijado (HS256) y nada se acepta sin firma válida.
const SECRETO = "secreto-de-prueba-de-al-menos-32-caracteres";
const codificar = (objeto: unknown) => Buffer.from(JSON.stringify(objeto)).toString("base64url");
const clave = (texto: string) => new TextEncoder().encode(texto);
const servicio = new JwtTokenService(SECRETO);

const firmar = (alg: string, carga: Record<string, unknown> = { tv: 0 }, secreto = SECRETO) =>
  new SignJWT(carga).setProtectedHeader({ alg }).setSubject("usuario-1").setJti("sesion-x").setIssuedAt().sign(clave(secreto));

describe("verificación del token (JwtTokenService)", () => {
  it("acepta un token bien firmado con HS256", async () => {
    await expect(servicio.verificar(await firmar("HS256", { tv: 4 }))).resolves.toEqual({ sub: "usuario-1", tv: 4, jti: "sesion-x" });
  });

  it("rechaza un token sin firma (alg: none), la técnica clásica de suplantación", async () => {
    const sinFirma = `${codificar({ alg: "none", typ: "JWT" })}.${codificar({ sub: "admin-1", tv: 0 })}.`;

    await expect(servicio.verificar(sinFirma)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    await expect(servicio.verificar(sinFirma.slice(0, -1))).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it.each(["HS384", "HS512"])("rechaza un token firmado con %s aunque use el secreto correcto (algoritmo fijado a HS256)", async (alg) => {
    await expect(servicio.verificar(await firmar(alg))).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza un token firmado con otro secreto", async () => {
    await expect(servicio.verificar(await firmar("HS256", { tv: 0 }, "otro-secreto-de-al-menos-32-caracteres!!"))).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza un token con la carga alterada (la firma ya no coincide)", async () => {
    const [cabecera, , firma] = (await firmar("HS256", { tv: 0 })).split(".");
    const alterado = `${cabecera}.${codificar({ sub: "admin-1", tv: 0 })}.${firma}`;

    await expect(servicio.verificar(alterado)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it.each([
    ["tv como texto", { tv: "3" }],
    ["tv como objeto", { tv: { $gt: 0 } }],
    ["tv nulo", { tv: null }],
    ["sin tv", {}],
  ])("rechaza un token válido pero con %s (no se confía en su forma)", async (_caso, carga) => {
    await expect(servicio.verificar(await firmar("HS256", carga))).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza un token bien firmado cuyo sub no es texto (se firma a mano: jose no lo permite)", async () => {
    const cuerpo = `${codificar({ alg: "HS256", typ: "JWT" })}.${codificar({ sub: 12345, tv: 0 })}`;
    const firma = createHmac("sha256", SECRETO).update(cuerpo).digest("base64url");

    await expect(servicio.verificar(`${cuerpo}.${firma}`)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza un token vencido y uno que todavía no es válido (nbf)", async () => {
    const vencido = await new SignJWT({ tv: 0 }).setProtectedHeader({ alg: "HS256" }).setSubject("u").setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(clave(SECRETO));
    const futuro = await new SignJWT({ tv: 0 }).setProtectedHeader({ alg: "HS256" }).setSubject("u").setNotBefore(Math.floor(Date.now() / 1000) + 3600).sign(clave(SECRETO));

    await expect(servicio.verificar(vencido)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    await expect(servicio.verificar(futuro)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it.each(["", " ", "abc", "a.b", "a.b.c", "....", "eyJhbGciOiJIUzI1NiJ9..", "\u0000", "x".repeat(200_000)])("rechaza la basura %j sin lanzar un error interno", async (basura) => {
    await expect(servicio.verificar(basura)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("los rechazos dan todos el mismo mensaje (no orientan a quien ataca)", async () => {
    const mensajes = new Set<string>();
    for (const token of [await firmar("HS512"), "basura", await firmar("HS256", { tv: "x" })]) {
      const error = (await servicio.verificar(token).catch((e: unknown) => e)) as Error;
      mensajes.add(error.message);
    }

    expect(mensajes.size).toBe(1);
  });
});

describe("cabecera Authorization (requireAuth)", () => {
  const usuarios = new UsuarioRepositoryEnMemoria([usuarioDePrueba({ tokenVersion: 0 })]);
  const sesiones = new SesionRepositoryEnMemoria();
  const dependencias = { usuarios, sesiones, tokens: servicio, clock: new SystemClock() };
  const protegida = requireAuth(() => new Response("ok"), dependencias);
  const pedir = (cabeceras: Record<string, string>, url = "http://localhost/x") => protegida(new Request(url, { headers: cabeceras }), undefined);

  it("acepta Bearer con el token válido (sin distinguir mayúsculas del esquema)", async () => {
    const token = await emitirConSesion(servicio, sesiones, { id: "usuario-1", tokenVersion: 0, rol: "Emprendedor" });

    expect((await pedir({ authorization: `Bearer ${token}` })).status).toBe(200);
    expect((await pedir({ authorization: `bearer ${token}` })).status).toBe(200);
  });

  it.each([
    ["sin cabecera", {}],
    ["esquema Basic", { authorization: "Basic dXNlcjpwYXNz" }],
    ["Bearer sin token", { authorization: "Bearer" }],
    ["Bearer con espacios", { authorization: "Bearer   " }],
    ["solo el token, sin esquema", { authorization: "abc.def.ghi" }],
  ])("rechaza %s", async (_caso, cabeceras) => {
    await expect(pedir(cabeceras)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("no acepta el token por la URL ni por una cookie: solo por la cabecera", async () => {
    const token = await emitirConSesion(servicio, sesiones, { id: "usuario-1", tokenVersion: 0, rol: "Emprendedor" });

    await expect(pedir({}, `http://localhost/x?token=${token}&access_token=${token}`)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    await expect(pedir({ cookie: `token=${token}; jwt=${token}` })).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("un token con firma y versión correctas pero sin sesión abierta se rechaza (sesión cerrada o nunca creada)", async () => {
    const sinSesion = await servicio.emitir({ id: "usuario-1", tokenVersion: 0, rol: "Emprendedor", sesionId: "sesion-que-nunca-existio" });

    await expect(pedir({ authorization: `Bearer ${sinSesion}` })).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("un token de una cuenta no sirve con la sesión de otra: el jti se ata a la cuenta", async () => {
    const sesionAjena = await sesiones.crear("otra-cuenta", new Date(), null);
    const token = await servicio.emitir({ id: "usuario-1", tokenVersion: 0, rol: "Emprendedor", sesionId: sesionAjena });

    await expect(pedir({ authorization: `Bearer ${token}` })).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("un token válido de un usuario que ya no existe se rechaza", async () => {
    const token = await emitirConSesion(servicio, sesiones, { id: "fantasma", tokenVersion: 0, rol: "Emprendedor" });

    await expect(pedir({ authorization: `Bearer ${token}` })).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("el rol del token no cuenta: un token de Emprendedor emitido como Admin no otorga nada (el rol sale de la base)", async () => {
    const token = await emitirConSesion(servicio, sesiones, { id: "usuario-1", tokenVersion: 0, rol: "Admin" });
    const { requireAdmin } = await import("@/api/middlewares/requireAdmin");
    const soloAdmin = requireAdmin(() => new Response("ok"), dependencias);

    await expect(soloAdmin(new Request("http://localhost/x", { headers: { authorization: `Bearer ${token}` } }), undefined)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
  });
});
