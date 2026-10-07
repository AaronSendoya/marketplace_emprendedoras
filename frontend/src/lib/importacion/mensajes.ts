// Mensajes de la pantalla de importación de emprendedoras (regla 22, backend). Los de archivo repiten a propósito los de
// `MENSAJES_ARCHIVO` en `backend/src/core/importaciones/domain/ArchivoExcel.ts`: quien arrastra el archivo los ve al instante,
// sin esperar al servidor, y el servidor los repite si algo se le escapa al navegador. Si se cambia uno, se cambia el otro.

export const MENSAJES_ARCHIVO = {
  temporal:
    "Ese es un archivo temporal que Excel crea mientras el documento está abierto. Elige el archivo que tiene el mismo nombre pero sin ~$.",
  xls: "Este es un Excel antiguo (.xls). Ábrelo, elige Archivo > Guardar como > Libro de Excel (.xlsx) y vuelve a subirlo.",
  csv: "Los archivos .csv no se admiten. Ábrelo en Excel y guárdalo como Libro de Excel (.xlsx).",
  macros: "Los archivos con macros no se admiten. Guárdalo como Libro de Excel (.xlsx), sin macros.",
  googleSheets: "En Google Sheets elige Archivo > Descargar > Microsoft Excel (.xlsx) y sube ese archivo.",
  otroTipo: (extension: string) => `Solo se admiten archivos Excel (.xlsx). Elegiste un archivo${extension ? ` .${extension}` : " sin extensión"}.`,
  vacio: "El archivo está vacío. Revisa que sea el documento correcto.",
  muyGrande: (megabytes: string) =>
    `El archivo pesa ${megabytes} MB y el máximo es 2 MB. Si tiene imágenes pegadas, quítalas y vuelve a guardarlo.`,
  noEsExcel:
    "Este archivo no parece un Excel real: puede estar dañado o ser de otro tipo con la extensión cambiada. Ábrelo en Excel y guárdalo de nuevo como .xlsx.",
  conContrasena: "El archivo tiene contraseña. Quítala en Excel (Archivo > Información > Proteger libro) y súbelo de nuevo.",
  // Solo del navegador (el servidor recibe siempre un archivo).
  varios: (cantidad: number) => `Arrastraste ${cantidad} archivos. Sube uno solo a la vez.`,
  carpeta: "Arrastraste una carpeta. Abre la carpeta y arrastra el archivo Excel.",
  noSePudoLeer: "No pudimos leer el archivo. Ábrelo en Excel, guárdalo de nuevo como .xlsx e inténtalo otra vez.",
};

export const MENSAJES_IMPORTACION = {
  sinArchivo: "No llegó ningún archivo. Elige uno e inténtalo de nuevo.",
  sesionVencida: "Tu sesión venció. Inicia sesión de nuevo y vuelve a subir el archivo.",
  sinPermiso: "Tu cuenta no puede importar emprendedoras. Inicia sesión con una cuenta de Admin.",
  demasiadasPeticiones: (segundos: number) => `Hay demasiadas peticiones seguidas. Espera ${segundos} segundos; se reintenta solo.`,
  errorDelServidor: "No pudimos completar esta operación por un error del servidor. Inténtalo de nuevo en un momento.",
  sinConexion: (creadas: number) =>
    creadas > 0
      ? `No pudimos comunicarnos con el servidor. Se importaron ${creadas} ${creadas === 1 ? "fila" : "filas"}; las demás siguen pendientes. Puedes reintentar: las ya creadas se omiten solas.`
      : "No pudimos comunicarnos con el servidor. No se importó ninguna fila todavía. Revisa tu conexión y vuelve a intentarlo.",
  sinConexionAlLeer: "No pudimos comunicarnos con el servidor para leer el archivo. Revisa tu conexión y vuelve a intentarlo.",
  sinConexionAlRevisar: "No pudimos revisar tus cambios porque no hay conexión con el servidor. Se revisarán al importar, pero conviene volver a intentarlo.",
};
