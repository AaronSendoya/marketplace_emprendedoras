import { jwtVerify, SignJWT } from "jose";
import { getEnv } from "@/shared/config/env";
import { ErrorNoAutenticado } from "@/shared/domain/errors";
import type { CargaToken, ITokenService } from "../domain/ITokenService";
import type { NombreRol } from "../domain/Rol";

const ALGORITMO = "HS256";
// Regla 5: el token de Emprendedor no expira (sesión permanente); el de Admin, 24 horas.
const DURACION_ADMIN = "24h";
const MENSAJE_INVALIDO = "El token no es válido o venció.";

export class JwtTokenService implements ITokenService {
  private readonly secreto: Uint8Array;

  constructor(secreto: string) {
    this.secreto = new TextEncoder().encode(secreto);
  }

  async emitir(usuario: { id: string; tokenVersion: number; rol: NombreRol }): Promise<string> {
    const token = new SignJWT({ tv: usuario.tokenVersion })
      .setProtectedHeader({ alg: ALGORITMO })
      .setSubject(usuario.id)
      .setIssuedAt();
    if (usuario.rol === "Admin") {
      token.setExpirationTime(DURACION_ADMIN);
    }
    return token.sign(this.secreto);
  }

  // Firma inválida, formato inválido o vencido: todo se rechaza igual, sin distinguir el motivo
  // (evita dar pistas de por qué falló un token ajeno).
  async verificar(token: string): Promise<CargaToken> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.secreto, { algorithms: [ALGORITMO] }));
    } catch {
      throw new ErrorNoAutenticado(MENSAJE_INVALIDO);
    }
    if (typeof payload.sub !== "string" || typeof payload.tv !== "number") {
      throw new ErrorNoAutenticado(MENSAJE_INVALIDO);
    }
    return { sub: payload.sub, tv: payload.tv };
  }
}

let instancia: JwtTokenService | undefined;

export function crearJwtTokenService(): JwtTokenService {
  instancia ??= new JwtTokenService(getEnv().JWT_SECRET);
  return instancia;
}
