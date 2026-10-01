import type { IClock } from "@/shared/domain/IClock";

export class SystemClock implements IClock {
  ahora(): Date {
    return new Date();
  }
}
