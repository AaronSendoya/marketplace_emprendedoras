import { randomUUID } from "node:crypto";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import type { ISesionRepository } from "../domain/ISesionRepository";

export class MySqlSesionRepository implements ISesionRepository {
  constructor(private readonly db: EjecutorSql) {}

  async crear(usuarioId: string, creadaEn: Date, expiraEn: Date | null): Promise<string> {
    const id = randomUUID();
    await this.db.ejecutar("INSERT INTO sesiones (id, usuario_id, creado_en, expira_en) VALUES (?, ?, ?, ?)", [id, usuarioId, creadaEn, expiraEn]);
    return id;
  }

  async estaVigente(id: string, usuarioId: string, ahora: Date): Promise<boolean> {
    const filas = await this.db.consultar<{ id: string }>(
      "SELECT id FROM sesiones WHERE id = ? AND usuario_id = ? AND (expira_en IS NULL OR expira_en > ?)",
      [id, usuarioId, ahora],
    );
    return filas.length > 0;
  }

  async cerrar(id: string, usuarioId: string): Promise<void> {
    await this.db.ejecutar("DELETE FROM sesiones WHERE id = ? AND usuario_id = ?", [id, usuarioId]);
  }
}
