export const CODIGOS_ERROR = [
  "VALIDACION",
  "NO_AUTENTICADO",
  "PROHIBIDO",
  "NO_ENCONTRADO",
  "CONFLICTO",
  "ARCHIVO_MUY_GRANDE",
  "DEMASIADAS_SOLICITUDES",
  "ERROR_INTERNO",
] as const;

export type CodigoError = (typeof CODIGOS_ERROR)[number];

export interface DetalleError {
  campo: string;
  mensaje: string;
}

// El dominio solo conoce el código; el estado HTTP lo decide la capa api.
export abstract class ErrorDeDominio extends Error {
  abstract readonly codigo: CodigoError;

  constructor(
    mensaje: string,
    readonly detalles?: DetalleError[],
  ) {
    super(mensaje);
  }
}

export class ErrorValidacion extends ErrorDeDominio {
  readonly codigo = "VALIDACION" as const;

  constructor(mensaje = "Los datos enviados no son válidos.", detalles?: DetalleError[]) {
    super(mensaje, detalles);
  }
}

export class ErrorNoAutenticado extends ErrorDeDominio {
  readonly codigo = "NO_AUTENTICADO" as const;

  constructor(mensaje = "No autenticado.") {
    super(mensaje);
  }
}

export class ErrorProhibido extends ErrorDeDominio {
  readonly codigo = "PROHIBIDO" as const;

  constructor(mensaje = "No tienes permiso para esta acción.") {
    super(mensaje);
  }
}

export class ErrorNoEncontrado extends ErrorDeDominio {
  readonly codigo = "NO_ENCONTRADO" as const;

  constructor(mensaje = "Recurso no encontrado.") {
    super(mensaje);
  }
}

export class ErrorConflicto extends ErrorDeDominio {
  readonly codigo = "CONFLICTO" as const;

  constructor(mensaje = "La operación entra en conflicto con el estado actual del recurso.", detalles?: DetalleError[]) {
    super(mensaje, detalles);
  }
}

export class ErrorArchivoMuyGrande extends ErrorDeDominio {
  readonly codigo = "ARCHIVO_MUY_GRANDE" as const;

  constructor(mensaje = "El archivo supera el tamaño máximo permitido (5 MB).") {
    super(mensaje);
  }
}

export class ErrorDemasiadasSolicitudes extends ErrorDeDominio {
  readonly codigo = "DEMASIADAS_SOLICITUDES" as const;

  constructor(
    mensaje = "Demasiadas solicitudes. Intenta de nuevo más tarde.",
    readonly reintentarEnSegundos?: number,
  ) {
    super(mensaje);
  }
}
