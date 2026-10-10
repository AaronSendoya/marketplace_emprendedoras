import type { ResultSetHeader } from "mysql2/promise";
import { abrirConexion } from "./lib/conexion";
import { ejecutar } from "./lib/ejecutar";
import { cargarEntorno, destinoDe, variableObligatoria } from "./lib/entorno";
import {
  DIAS_CONSERVAR_INTENTOS_LOGIN,
  DIAS_CONSERVAR_OTP,
  DIAS_CONSERVAR_SESIONES_VENCIDAS,
  limpiarRegistrosAntiguos,
} from "./lib/limpieza";

// Regla 17 (retención de registros de abuso): borra los intentos de acceso, los códigos OTP y las sesiones de Admin vencidos hace tiempo. Usa DATABASE_URL; para
// limpiar producción desde el computador, pasa la cadena por la shell, igual que para migrar o respaldar. Es seguro correrlo
// las veces que haga falta, también mientras la aplicación está en uso.
async function main() {
  cargarEntorno();

  const url = variableObligatoria("DATABASE_URL");
  console.log(`Base de datos: ${destinoDe(url)}`);

  const conexion = await abrirConexion(url);
  try {
    const resultado = await limpiarRegistrosAntiguos(
      {
        async borrar(sql, valores) {
          const [respuesta] = await conexion.query<ResultSetHeader>(sql, valores);
          return respuesta.affectedRows;
        },
      },
      new Date(),
    );
    console.log(
      `Borrados: ${resultado.intentosLogin} intentos de acceso de más de ${DIAS_CONSERVAR_INTENTOS_LOGIN} días, ${resultado.otp} códigos OTP de más de ${DIAS_CONSERVAR_OTP} días y ${resultado.sesiones} sesiones de Admin vencidas hace más de ${DIAS_CONSERVAR_SESIONES_VENCIDAS} día.`,
    );
  } finally {
    await conexion.end();
  }
}

ejecutar(main);
