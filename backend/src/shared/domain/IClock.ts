// Puerto del reloj: permite probar vigencias y vencimientos con un reloj falso.
export interface IClock {
  ahora(): Date;
}
