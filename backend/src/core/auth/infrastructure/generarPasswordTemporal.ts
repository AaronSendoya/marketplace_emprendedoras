import { randomInt } from "node:crypto";

// Sin caracteres que se confunden al dictarlos (0/O, 1/l/I). 55 símbolos x 12 = unos 69 bits.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const LONGITUD = 12;

export function generarPasswordTemporal(): string {
  return Array.from({ length: LONGITUD }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}
