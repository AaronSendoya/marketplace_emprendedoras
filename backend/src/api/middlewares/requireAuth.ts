import { crearJwtTokenService } from "@/core/auth/infrastructure/JwtTokenService";
import { MySqlUsuarioRepository } from "@/core/auth/infrastructure/MySqlUsuarioRepository";
import type { ITokenService } from "@/core/auth/domain/ITokenService";
import type { IUsuarioRepository } from "@/core/auth/domain/IUsuarioRepository";
import type { UsuarioAutenticado } from "@/core/auth/domain/Usuario";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";
import { ErrorNoAutenticado } from "@/shared/domain/errors";

export interface DependenciasAuth {
  usuarios: Pick<IUsuarioRepository, "buscarPorId">;
  tokens: ITokenService;
}

let porDefecto: DependenciasAuth | undefined;

// Cablea las dependencias reales una sola vez: las rutas protegidas (este paso y los siguientes)
// no repiten el cableado en cada endpoint.
export function dependenciasAuthPorDefecto(): DependenciasAuth {
  porDefecto ??= { usuarios: new MySqlUsuarioRepository(getMySqlClient()), tokens: crearJwtTokenService() };
  return porDefecto;
}

type Manejador<C> = (request: Request, contexto: C, usuario: UsuarioAutenticado) => Response | Promise<Response>;

function extraerToken(request: Request): string {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) throw new ErrorNoAutenticado("Falta la cabecera Authorization: Bearer <token>.");
  return token;
}

// Regla 5: en cada petición se verifica firma y vigencia del token, se carga el usuario de la
// base (nunca se confía en el token salvo para identificarlo), se exige que siga activo y se
// compara token_version con la del token. El rol lo lee requireAdmin de este mismo usuario,
// siempre de la base, nunca del token.
export function requireAuth<C = unknown>(
  manejador: Manejador<C>,
  dependencias: DependenciasAuth = dependenciasAuthPorDefecto(),
) {
  return async (request: Request, contexto: C): Promise<Response> => {
    const { sub, tv } = await dependencias.tokens.verificar(extraerToken(request));
    const usuario = await dependencias.usuarios.buscarPorId(sub);
    if (!usuario || !usuario.activo || usuario.tokenVersion !== tv) {
      throw new ErrorNoAutenticado("El token no es válido o venció.");
    }
    // Lista explícita (no destructuring-omit): así queda claro, sin advertencias de lint por la
    // variable descartada, que passwordHash nunca llega al manejador.
    const usuarioAutenticado: UsuarioAutenticado = {
      id: usuario.id,
      email: usuario.email,
      nombres: usuario.nombres,
      apellidoPaterno: usuario.apellidoPaterno,
      apellidoMaterno: usuario.apellidoMaterno,
      rol: usuario.rol,
      activo: usuario.activo,
      emailVerificadoEn: usuario.emailVerificadoEn,
      tokenVersion: usuario.tokenVersion,
      creadoEn: usuario.creadoEn,
    };
    return manejador(request, contexto, usuarioAutenticado);
  };
}
