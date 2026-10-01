import bcrypt from "bcryptjs";
import type { IPasswordHasher } from "../domain/IPasswordHasher";

// Regla 17: coste 12 (antes 10; el seed regenera su hash, las filas ya sembradas conservan el
// hash anterior hasta que se reinicie esa base).
const COSTE = 12;

export class BcryptPasswordHasher implements IPasswordHasher {
  hash(passwordPlano: string): Promise<string> {
    return bcrypt.hash(passwordPlano, COSTE);
  }

  comparar(passwordPlano: string, hash: string): Promise<boolean> {
    return bcrypt.compare(passwordPlano, hash);
  }
}
