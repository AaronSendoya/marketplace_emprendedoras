import { randomUUID } from "node:crypto";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import type { IOtpRepository } from "../domain/IOtpRepository";
import type { NuevoOtp, OtpCodigo, PropositoOtp } from "../domain/Otp";

interface FilaOtp {
  id: string;
  email: string;
  proposito: string;
  codigo_hash: string;
  intentos: number;
  expira_en: Date | string;
  usado_en: Date | string | null;
  creado_en: Date | string;
}

function mapear(fila: FilaOtp): OtpCodigo {
  return {
    id: fila.id,
    email: fila.email,
    proposito: fila.proposito as PropositoOtp,
    codigoHash: fila.codigo_hash,
    intentos: fila.intentos,
    expiraEn: new Date(fila.expira_en),
    usadoEn: fila.usado_en ? new Date(fila.usado_en) : null,
    creadoEn: new Date(fila.creado_en),
  };
}

export class MySqlOtpRepository implements IOtpRepository {
  constructor(private readonly db: EjecutorSql) {}

  async crear(otp: NuevoOtp): Promise<void> {
    await this.db.ejecutar(
      "INSERT INTO otp_codigos (id, email, proposito, codigo_hash, expira_en, creado_en) VALUES (?, ?, ?, ?, ?, ?)",
      [randomUUID(), otp.email, otp.proposito, otp.codigoHash, otp.expiraEn, otp.creadoEn],
    );
  }

  async buscarUltimo(email: string, proposito: PropositoOtp): Promise<OtpCodigo | null> {
    const filas = await this.db.consultar<FilaOtp>(
      `SELECT id, email, proposito, codigo_hash, intentos, expira_en, usado_en, creado_en
       FROM otp_codigos WHERE email = ? AND proposito = ?
       ORDER BY creado_en DESC LIMIT 1`,
      [email, proposito],
    );
    return filas[0] ? mapear(filas[0]) : null;
  }

  async fechasSolicitudes(email: string, desde: Date): Promise<Date[]> {
    const filas = await this.db.consultar<{ creado_en: Date | string }>(
      "SELECT creado_en FROM otp_codigos WHERE email = ? AND creado_en >= ? ORDER BY creado_en DESC",
      [email, desde],
    );
    return filas.map((fila) => new Date(fila.creado_en));
  }

  async reservarIntento(id: string, ahora: Date, maxIntentos: number): Promise<boolean> {
    const { filasAfectadas } = await this.db.ejecutar(
      "UPDATE otp_codigos SET intentos = intentos + 1 WHERE id = ? AND usado_en IS NULL AND intentos < ? AND expira_en > ?",
      [id, maxIntentos, ahora],
    );
    return filasAfectadas === 1;
  }

  async consumir(id: string, ahora: Date): Promise<boolean> {
    const { filasAfectadas } = await this.db.ejecutar(
      "UPDATE otp_codigos SET usado_en = ? WHERE id = ? AND usado_en IS NULL",
      [ahora, id],
    );
    return filasAfectadas === 1;
  }
}
