import type { IClock } from "@/shared/domain/IClock";

export class FakeClock implements IClock {
  constructor(private actual: Date) {}

  ahora(): Date {
    return new Date(this.actual);
  }

  fijar(fecha: Date): void {
    this.actual = new Date(fecha);
  }

  avanzar(milisegundos: number): void {
    this.actual = new Date(this.actual.getTime() + milisegundos);
  }
}
