import { ok } from "@/api/http/respuestas";
import type {
  ConectarGoogleUseCase,
  EstadoDeGoogleUseCase,
  UrlDeAutorizacionDeGoogleUseCase,
} from "@/core/importaciones/application/ConexionGoogle";

// Regla 17 y regla 22 (2026-10-09). Ninguna respuesta de aquí se guarda en caché: `/api/v1/admin/*` ya lleva `Cache-Control: no-store`.

export function estadoDeGoogle(usecase: EstadoDeGoogleUseCase): Response {
  return ok(usecase.ejecutar());
}

export function urlDeAutorizacion(usecase: UrlDeAutorizacionDeGoogleUseCase, state: string, desafioPkce: string): Response {
  return ok(usecase.ejecutar(state, desafioPkce));
}

export async function conectarGoogle(usecase: ConectarGoogleUseCase, adminId: string, codigo: string, verificadorPkce: string): Promise<Response> {
  const conexion = await usecase.ejecutar(adminId, codigo, verificadorPkce);
  return ok({ access_token: conexion.accessToken, expira_en: conexion.expiraEnSegundos, cuenta: conexion.cuenta });
}
