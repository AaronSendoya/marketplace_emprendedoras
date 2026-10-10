"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { clasificarError } from "@/lib/errores/clasificar";

// Un formulario con Server Function que NO se vacía cuando el servidor responde con un error.
//
// Con `<form action={accion}>`, React 19 reinicia el formulario (todos los campos vuelven a su valor inicial) cada vez que la
// acción termina, también cuando termina mal: quien repite un correo, o pone un WhatsApp inválido, perdía todo lo que había
// escrito, y en el inicio de sesión hasta el correo. Aquí el envío lo hace `onSubmit` y llama a la misma acción dentro de una
// transición: el estado (`estado`, el error de la acción) y `pendiente` funcionan igual que con `useActionState`, pero el
// formulario no se toca. La validación nativa del navegador (`required`, `minLength`...) corre igual antes del envío.
//
// Uso: `const { estado, alEnviar, pendiente } = useEnvioSinReinicio(accion, estadoInicial);` y `<form onSubmit={alEnviar}>`.
//
// Control de errores: si la propia llamada falla (se cortó internet entre el navegador y el servidor, Next rechazó el cuerpo por
// pesado, el servidor se cayó a mitad), la excepción no sube a la pantalla de error crítico: se convierte en el `error` del estado,
// que cada formulario ya muestra en su lugar. Los fallos que sí llegan a la acción (el backend rechazó un dato) los devuelve la
// propia acción como `error`, con el motivo exacto.
export function useEnvioSinReinicio<Estado extends { error?: string }>(
  accion: (estadoPrevio: Awaited<Estado>, datos: FormData) => Estado | Promise<Estado>,
  estadoInicial: Awaited<Estado>,
) {
  const accionSegura = async (estadoPrevio: Awaited<Estado>, datos: FormData): Promise<Awaited<Estado>> => {
    try {
      return (await accion(estadoPrevio, datos)) as Awaited<Estado>;
    } catch (fallo) {
      const { categoria, mensaje } = clasificarError(fallo);
      const error =
        categoria === "desconocido" || categoria === "servidor"
          ? "No pudimos enviar el formulario. Revisa tu conexión, que las imágenes pesen menos de 5 MB e inténtalo de nuevo."
          : mensaje;
      return { ...estadoPrevio, error } as unknown as Awaited<Estado>;
    }
  };
  const [estado, ejecutar, pendiente] = useActionState(accionSegura, estadoInicial);
  const [, iniciarTransicion] = useTransition();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const enviador = (evento.nativeEvent as SubmitEvent).submitter;
    const datos = new FormData(evento.currentTarget, enviador instanceof HTMLElement ? enviador : null);
    iniciarTransicion(() => ejecutar(datos));
  }

  return { estado, alEnviar, pendiente };
}
