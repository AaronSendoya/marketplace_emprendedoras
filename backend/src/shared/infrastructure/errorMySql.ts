import { ErrorConflicto, ErrorValidacion, type DetalleError } from "@/shared/domain/errors";

interface ReglaBd {
  mensaje: string;
  campo?: string;
}

// Mensajes propios de las restricciones que un usuario puede provocar con sus datos. Los nombres
// son los de las migraciones; un test comprueba que existen en la base. MySQL 8 nombra la clave
// de un duplicado como `tabla.clave` y MariaDB solo como `clave`: se busca primero completa.
export const REGLAS_POR_RESTRICCION: Record<string, ReglaBd> = {
  uk_usuarios_email: { campo: "email", mensaje: "Ya existe una cuenta con ese correo." },
  uk_usuario_perfil: { mensaje: "Este usuario ya tiene un perfil." },
  "producto_descuentos.PRIMARY": { mensaje: "El descuento ya está asignado a ese producto." },
  fk_perfiles_ciudad: { campo: "ciudad_id", mensaje: "La ciudad indicada no existe." },
  fk_perfiles_rubro: { campo: "rubro_id", mensaje: "El rubro indicado no existe." },
  fk_productos_perfil: { campo: "perfil_id", mensaje: "El perfil indicado no existe." },
  fk_descuentos_perfil: { campo: "perfil_id", mensaje: "El perfil indicado no existe." },
  fk_producto_descuentos_producto: { campo: "producto_id", mensaje: "El producto indicado no existe." },
  fk_producto_descuentos_descuento: { campo: "descuento_id", mensaje: "El descuento indicado no existe." },
};

// Números de error de MySQL y MariaDB.
export const ERRNO = {
  DUPLICADO: 1062, // ER_DUP_ENTRY
  PADRE_REFERENCIADO: 1451, // ER_ROW_IS_REFERENCED_2: borrar algo de lo que otros dependen (RESTRICT)
  HIJO_SIN_PADRE: 1452, // ER_NO_REFERENCED_ROW_2: referencia a una fila inexistente
  DATO_LARGO: 1406, // ER_DATA_TOO_LONG
  FUERA_DE_RANGO: 1264, // ER_WARN_DATA_OUT_OF_RANGE
  VALOR_INVALIDO: 1292, // ER_TRUNCATED_WRONG_VALUE (p. ej. una fecha imposible)
  VALOR_INVALIDO_CAMPO: 1366, // ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
  NULO: 1048, // ER_BAD_NULL_ERROR
  SIN_VALOR_POR_DEFECTO: 1364, // ER_NO_DEFAULT_FOR_FIELD
  CHECK_MYSQL: 3819, // ER_CHECK_CONSTRAINT_VIOLATED
  CHECK_MARIADB: 4025, // ER_CONSTRAINT_FAILED
} as const;

interface ErrorMySql {
  errno: number;
  sqlMessage?: string;
}

export const esErrorMySql = (error: unknown): error is ErrorMySql =>
  typeof error === "object" && error !== null && typeof (error as { errno?: unknown }).errno === "number";

// Nombre de la restricción o clave que motivó el error, leído del mensaje del motor. Los patrones
// del final se anclan a `$` porque en un duplicado el mensaje empieza con el valor del usuario:
// así un valor que imite "for key '...'" no puede hacerse pasar por la clave.
export function nombreRestriccion(error: unknown): string | undefined {
  const mensaje = esErrorMySql(error) ? error.sqlMessage : undefined;
  if (!mensaje) return undefined;
  return (
    /CONSTRAINT `([^`]+)`/.exec(mensaje)?.[1] ?? // claves foráneas (1451, 1452) y CHECK en MariaDB
    /Check constraint '([^']+)' is violated/.exec(mensaje)?.[1] ?? // CHECK en MySQL
    / for key '([^']+)'$/.exec(mensaje)?.[1] // duplicados
  );
}

// Columna de un NOT NULL ("Column 'x' cannot be null" o "Field 'x' doesn't have a default value").
export function columnaDeError(error: unknown): string | undefined {
  const mensaje = esErrorMySql(error) ? error.sqlMessage : undefined;
  return mensaje ? /(?:Column|Field) '([^']+)'/.exec(mensaje)?.[1] : undefined;
}

// Los mensajes de un duplicado o de un valor rechazado llevan el dato del usuario (un correo,
// un nombre): se tapan antes de escribirlos en un registro.
export function sanearMensajeSql(texto: string): string {
  return texto
    .replace(/Duplicate entry '[\s\S]*' for key /g, "Duplicate entry [REDACTADO] for key ")
    .replace(/(Incorrect [\w ]+ value: )'[\s\S]*?'( for column)/gi, "$1[REDACTADO]$2");
}

function reglaDe(error: ErrorMySql): ReglaBd | undefined {
  const nombre = nombreRestriccion(error);
  if (!nombre) return undefined;
  return REGLAS_POR_RESTRICCION[nombre] ?? REGLAS_POR_RESTRICCION[nombre.slice(nombre.indexOf(".") + 1)];
}

// Solo se traducen los fallos que provoca el dato del usuario. NOT NULL y CHECK quedan sin
// traducir a propósito: si llegan a la base, la validación previa falló (es un bug) y deben verse
// como 500 en los logs. Nunca se usa `sqlMessage`: contiene los valores.
export function traducirErrorMySql(error: unknown): unknown {
  if (!esErrorMySql(error)) return error;

  const regla = reglaDe(error);
  const detalles: DetalleError[] | undefined = regla?.campo
    ? [{ campo: regla.campo, mensaje: regla.mensaje }]
    : undefined;

  switch (error.errno) {
    case ERRNO.DUPLICADO:
      return new ErrorConflicto(regla?.mensaje ?? "Ya existe un registro con esos datos.", detalles);
    case ERRNO.PADRE_REFERENCIADO:
      return new ErrorConflicto("No se puede eliminar porque otros registros dependen de este.");
    case ERRNO.HIJO_SIN_PADRE:
      return new ErrorValidacion(regla?.mensaje ?? "Se hace referencia a un registro que no existe.", detalles);
    case ERRNO.VALOR_INVALIDO:
    case ERRNO.VALOR_INVALIDO_CAMPO:
      return new ErrorValidacion("Un dato tiene un formato inválido.");
    case ERRNO.DATO_LARGO:
      return new ErrorValidacion("Un dato es demasiado largo.");
    case ERRNO.FUERA_DE_RANGO:
      return new ErrorValidacion("Un valor numérico está fuera del rango permitido.");
    default:
      return error;
  }
}
