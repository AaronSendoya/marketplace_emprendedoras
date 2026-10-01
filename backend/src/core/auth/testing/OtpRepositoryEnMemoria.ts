import type { IOtpRepository } from "../domain/IOtpRepository";
import type { NuevoOtp, OtpCodigo, PropositoOtp } from "../domain/Otp";

// Doble de prueba: replica las condiciones atómicas del SQL real.
export class OtpRepositoryEnMemoria implements IOtpRepository {
  readonly filas: OtpCodigo[] = [];

  async crear(otp: NuevoOtp) {
    this.filas.push({ ...otp, id: `otp-${this.filas.length + 1}`, intentos: 0, usadoEn: null });
  }

  async buscarUltimo(email: string, proposito: PropositoOtp) {
    const propios = this.filas.filter((f) => f.email === email && f.proposito === proposito);
    const ultimo = propios[propios.length - 1];
    return ultimo ? { ...ultimo } : null;
  }

  async fechasSolicitudes(email: string, desde: Date) {
    return this.filas
      .filter((f) => f.email === email && f.creadoEn >= desde)
      .map((f) => f.creadoEn)
      .sort((a, b) => b.getTime() - a.getTime());
  }

  async reservarIntento(id: string, ahora: Date, maxIntentos: number) {
    const fila = this.filas.find((f) => f.id === id);
    if (!fila || fila.usadoEn || fila.intentos >= maxIntentos || fila.expiraEn <= ahora) return false;
    fila.intentos += 1;
    return true;
  }

  async consumir(id: string, ahora: Date) {
    const fila = this.filas.find((f) => f.id === id);
    if (!fila || fila.usadoEn) return false;
    fila.usadoEn = ahora;
    return true;
  }
}
