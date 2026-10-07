// Puerto de lectura de un libro de Excel (regla 22). El dominio no sabe qué librería lo abre: el adaptador de `exceljs` vive en
// infraestructura y es lo único que la conoce.

export interface FilaLeida {
  // Número de fila como lo ve quien abre el Excel (la primera es la 1).
  numero: number;
  // La fila estaba oculta (por ejemplo, por un filtro de Excel).
  oculta: boolean;
  // El valor de cada celda como texto, desde la columna A. Los números llegan como número entero, sin notación científica.
  celdas: string[];
}

export interface HojaLeida {
  nombre: string;
  // Solo las filas que tienen algo escrito, en orden.
  filas: FilaLeida[];
}

export interface LibroLeido {
  hojas: HojaLeida[];
}

export interface ILectorExcel {
  // Lanza ErrorValidacion con un mensaje entendible si el contenido no se puede leer como un libro de Excel.
  leer(contenido: Buffer): Promise<LibroLeido>;
}

export interface IGeneradorPlantilla {
  // El `.xlsx` de ejemplo que se descarga desde la pantalla de importación.
  generar(): Promise<Buffer>;
}
