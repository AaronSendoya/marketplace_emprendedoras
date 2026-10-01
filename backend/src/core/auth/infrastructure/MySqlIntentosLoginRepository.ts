import { randomUUID } from "node:crypto";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import type { EstadoIntentosLogin, IIntentosLoginRepository } from "../domain/IIntentosLoginRepository";

export class MySqlIntentosLoginRepository implements IIntentosLoginRepository {
  constructor(private readonly db: EjecutorSql) {}

  async estado(email: string): Promise<EstadoIntentosLogin> {
    const filas = await this.db.consultar<{ total: number; ultimo: Date | string | null }>(
      "SELECT COUNT(*) AS total, MAX(creado_en) AS ultimo FROM intentos_login WHERE email = ?",
      [email],
    );
    const fila = filas[0];
    return {
      totalFallos: Number(fila?.total ?? 0),
      ultimoFallo: fila?.ultimo ? new Date(fila.ultimo) : null,
    };
  }

  async registrarFallo(email: string, ahora: Date): Promise<void> {
    await this.db.ejecutar("INSERT INTO intentos_login (id, email, creado_en) VALUES (?, ?, ?)", [randomUUID(), email, ahora]);
  }

  async limpiar(email: string): Promise<void> {
    await this.db.ejecutar("DELETE FROM intentos_login WHERE email = ?", [email]);
  }
}
