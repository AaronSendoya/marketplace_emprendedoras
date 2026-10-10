import { jwtVerify, SignJWT } from "jose";
import { getEnv } from "@/shared/config/env";
import { ErrorNoAutenticado } from "@/shared/domain/errors";
import type { CargaToken, ITokenService } from "../domain/ITokenService";
import type { NombreRol } from "../domain/Rol";
import { DURACION_SESION_ADMIN_SEGUNDOS } from "../domain/Sesion";

const ALGORITMO = "HS256";
const MENSAJE_INVALIDO = "El token no es válido o venció.";

export class JwtTokenService implements ITokenService {
  private readonly secreto: Uint8Array;

  constructor(secreto: string) {
    this.secreto = new TextEncoder().encode(secreto);
  }

  // Regla 5: el token de Emprendedor no expira (sesión permanente); el de Admin, 4 horas desde que inicia sesión (tope absoluto).
  // Siempre lleva el id de su sesión (`jti`): dos inicios de sesión, aunque sean del mismo usuario en el mismo segundo, nunca
  // producen el mismo token.
  async emitir(usuario: { id: string; tokenVersion: number; rol: NombreRol; sesionId: string }): Promise<string> {
    const token = new SignJWT({ tv: usuario.tokenVersion })
      .setProtectedHeader({ alg: ALGORITMO })
      .setSubject(usuario.id)
      .setJti(usuario.sesionId)
      .setIssuedAt();
    if (usuario.rol === "Admin") {
      token.setExpirationTime(`${DURACION_SESION_ADMIN_SEGUNDOS}s`);
    }
    return token.sign(this.secreto);
  }

  // Firma inválida, formato inválido, vencido o sin sesión (`jti`): todo se rechaza igual, sin distinguir el motivo
  // (evita dar pistas de por qué falló un token ajeno).
  async verificar(token: string): Promise<CargaToken> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.secreto, { algorithms: [ALGORITMO] }));
    } catch {
      throw new ErrorNoAutenticado(MENSAJE_INVALIDO);
    }
    if (typeof payload.sub !== "string" || typeof payload.tv !== "number" || typeof payload.jti !== "string" || !payload.jti) {
      throw new ErrorNoAutenticado(MENSAJE_INVALIDO);
    }
    return { sub: payload.sub, tv: payload.tv, jti: payload.jti };
  }
}

let instancia: JwtTokenService | undefined;

export function crearJwtTokenService(): JwtTokenService {
  instancia ??= new JwtTokenService(getEnv().JWT_SECRET);
  return instancia;
}
