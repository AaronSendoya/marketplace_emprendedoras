import { ErrorConflicto, ErrorValidacion } from "@/shared/domain/errors";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IArchivosDrive } from "../domain/IArchivosDrive";
import { ErrorArchivoDrive } from "../domain/IArchivosDrive";
import type { IGoogleOAuth } from "../domain/IGoogleOAuth";

// Regla 17 y regla 22 (2026-10-09): conectar una cuenta de Google para leer las imágenes de Drive. Ninguno de estos casos de uso guarda
// nada: el token vive una hora en el navegador (cookie httpOnly del frontend) y vuelve a la API en cada petición del importador.

const NO_CONFIGURADO = "La conexión con Google no está configurada en el servidor.";
const sinConfigurar = () => new ErrorConflicto(NO_CONFIGURADO, [{ campo: "google", mensaje: NO_CONFIGURADO }]);

export class EstadoDeGoogleUseCase {
  constructor(private readonly oauth: Pick<IGoogleOAuth, "disponible">) {}

  ejecutar(): { disponible: boolean } {
    return { disponible: this.oauth.disponible() };
  }
}

export class UrlDeAutorizacionDeGoogleUseCase {
  constructor(private readonly oauth: Pick<IGoogleOAuth, "disponible" | "urlDeAutorizacion">) {}

  // `state` y `desafioPkce` los genera el frontend (los guarda en una cookie de corta vida y los comprueba al volver): aquí solo se
  // arma la dirección.
  ejecutar(state: string, desafioPkce: string): { url: string } {
    if (!this.oauth.disponible()) throw sinConfigurar();
    return { url: this.oauth.urlDeAutorizacion(state, desafioPkce) };
  }
}

export interface ConexionDeGoogle {
  accessToken: string;
  expiraEnSegundos: number;
  // El correo de la cuenta conectada, para que el Admin vea con cuál trabaja.
  cuenta: string | null;
}

export class ConectarGoogleUseCase {
  constructor(
    private readonly oauth: Pick<IGoogleOAuth, "disponible" | "intercambiar">,
    private readonly drive: Pick<IArchivosDrive, "cuenta">,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(adminId: string, codigo: string, verificadorPkce: string): Promise<ConexionDeGoogle> {
    if (!this.oauth.disponible()) throw sinConfigurar();
    const token = await this.oauth.intercambiar(codigo, verificadorPkce);
    let cuenta: string | null = null;
    try {
      cuenta = await this.drive.cuenta(token.accessToken);
    } catch (error) {
      // Un token recién emitido que Drive rechaza: la conexión no sirve. Cualquier otro fallo solo deja sin mostrar el correo.
      if (error instanceof ErrorArchivoDrive && error.motivo === "conexion_vencida") {
        throw new ErrorValidacion("No pudimos conectar con Google. Vuelve a pulsar «Conectar cuenta de Google» e inténtalo de nuevo.");
      }
    }
    // Ni el correo ni el token: solo quién conectó.
    this.logger.info("google_conectado", { adminId });
    return { accessToken: token.accessToken, expiraEnSegundos: token.expiraEnSegundos, cuenta };
  }
}
