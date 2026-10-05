import { describe, expect, it } from "vitest";
import type { ClicDiarioPerfil } from "./Clic";
import { armarMapaCalor, columnasDelRango, DIAS_MAXIMOS_POR_DIA, DIAS_MAXIMOS_POR_SEMANA, elegirGranularidad } from "./MapaCalor";
import { resolverRango } from "./RangoFechas";

const AHORA = new Date("2026-10-04T12:00:00Z");
const UN_DIA_MS = 24 * 60 * 60 * 1000;
const rangoDe = (desde: string, hasta: string) => resolverRango({ desde, hasta }, AHORA);
const medianoche = (dia: string) => new Date(`${dia}T00:00:00Z`).getTime();

describe("elegirGranularidad (regla 19)", () => {
  it("hasta 45 días, un día por columna", () => {
    expect(elegirGranularidad(1)).toBe("dia");
    expect(elegirGranularidad(DIAS_MAXIMOS_POR_DIA)).toBe("dia");
  });

  it("de 46 a 180 días, una semana por columna", () => {
    expect(elegirGranularidad(DIAS_MAXIMOS_POR_DIA + 1)).toBe("semana");
    expect(elegirGranularidad(DIAS_MAXIMOS_POR_SEMANA)).toBe("semana");
  });

  it("más de 180 días, un mes por columna", () => {
    expect(elegirGranularidad(DIAS_MAXIMOS_POR_SEMANA + 1)).toBe("mes");
    expect(elegirGranularidad(731)).toBe("mes");
  });
});

describe("columnasDelRango", () => {
  it("un solo día es una columna", () => {
    const { granularidad, columnas } = columnasDelRango(rangoDe("2026-10-01", "2026-10-01"));
    expect(granularidad).toBe("dia");
    expect(columnas).toEqual([{ inicio: "2026-10-01", fin: "2026-10-01" }]);
  });

  it("el período por defecto (30 días) trae una columna por día, completas y en orden", () => {
    const { granularidad, columnas } = columnasDelRango(resolverRango(undefined, AHORA));
    expect(granularidad).toBe("dia");
    expect(columnas).toHaveLength(30);
    expect(columnas[0]).toEqual({ inicio: "2026-09-05", fin: "2026-09-05" });
    expect(columnas[29]).toEqual({ inicio: "2026-10-04", fin: "2026-10-04" });
  });

  it("con 45 días sigue siendo por día y con 46 pasa a semanas", () => {
    expect(columnasDelRango(rangoDe("2026-08-21", "2026-10-04")).granularidad).toBe("dia"); // 45 días
    expect(columnasDelRango(rangoDe("2026-08-20", "2026-10-04")).granularidad).toBe("semana"); // 46 días
  });

  it("las semanas van de lunes a domingo y la primera se recorta al período", () => {
    // 2026-08-20 es jueves; 2026-10-04 es domingo.
    const { columnas } = columnasDelRango(rangoDe("2026-08-20", "2026-10-04"));
    expect(columnas[0]).toEqual({ inicio: "2026-08-20", fin: "2026-08-23" }); // jueves a domingo, recortada
    expect(columnas[1]).toEqual({ inicio: "2026-08-24", fin: "2026-08-30" }); // lunes a domingo, completa
    expect(columnas.at(-1)).toEqual({ inicio: "2026-09-28", fin: "2026-10-04" }); // termina en domingo
    expect(columnas).toHaveLength(7);
  });

  it("una semana parcial al final queda como una sola columna", () => {
    // 52 días (por semana), de lunes 2026-08-10 a miércoles 2026-09-30: la última semana es lunes 28
    // a miércoles 30, y la primera es completa porque empieza en lunes.
    const { granularidad, columnas } = columnasDelRango(rangoDe("2026-08-10", "2026-09-30"));
    expect(granularidad).toBe("semana");
    expect(columnas[0]).toEqual({ inicio: "2026-08-10", fin: "2026-08-16" });
    expect(columnas.at(-1)).toEqual({ inicio: "2026-09-28", fin: "2026-09-30" });
    expect(columnas).toHaveLength(8);
  });

  it("con más de 180 días agrupa por mes de calendario, recortando los extremos", () => {
    const { granularidad, columnas } = columnasDelRango(rangoDe("2026-01-15", "2026-10-04"));
    expect(granularidad).toBe("mes");
    expect(columnas[0]).toEqual({ inicio: "2026-01-15", fin: "2026-01-31" });
    expect(columnas[1]).toEqual({ inicio: "2026-02-01", fin: "2026-02-28" });
    expect(columnas.at(-1)).toEqual({ inicio: "2026-10-01", fin: "2026-10-04" });
    expect(columnas).toHaveLength(10);
  });

  it("el rango máximo de 2 años nunca supera 26 columnas", () => {
    const { columnas } = columnasDelRango(rangoDe("2024-10-05", "2026-10-04"));
    expect(columnas.length).toBeLessThanOrEqual(26);
  });

  it.each([
    ["2026-09-01", "2026-09-30"], // por día
    ["2026-06-01", "2026-10-04"], // por semana
    ["2025-10-05", "2026-10-04"], // por mes
  ])("las columnas de %s a %s cubren todos los días sin huecos ni solapes", (desde, hasta) => {
    const { columnas, indicePorDia } = columnasDelRango(rangoDe(desde, hasta));

    for (let i = 1; i < columnas.length; i++) {
      expect(medianoche(columnas[i].inicio) - medianoche(columnas[i - 1].fin)).toBe(UN_DIA_MS);
    }
    expect(columnas[0].inicio).toBe(desde);
    expect(columnas.at(-1)?.fin).toBe(hasta);
    expect(indicePorDia.size).toBe(Math.round((medianoche(hasta) - medianoche(desde)) / UN_DIA_MS) + 1);
  });
});

describe("armarMapaCalor", () => {
  const rango = rangoDe("2026-10-01", "2026-10-03");
  const ana = { perfilId: "p-ana", nombreNegocio: "Dulces de Ana" };
  const luz = { perfilId: "p-luz", nombreNegocio: "Taller Luz" };

  it("una celda por columna, con 0 donde no hubo clics, y los totales suman las celdas", () => {
    const diarios: ClicDiarioPerfil[] = [
      { perfilId: "p-ana", fecha: "2026-10-01", whatsapp: 2, instagram: 1 },
      { perfilId: "p-ana", fecha: "2026-10-03", whatsapp: 4, instagram: 0 },
    ];

    const mapa = armarMapaCalor(rango, [ana], diarios);

    expect(mapa.granularidad).toBe("dia");
    expect(mapa.columnas).toHaveLength(3);
    expect(mapa.filas).toEqual([
      {
        perfilId: "p-ana",
        nombreNegocio: "Dulces de Ana",
        whatsapp: 6,
        instagram: 1,
        total: 7,
        totalAnterior: 0,
        celdas: [
          { whatsapp: 2, instagram: 1 },
          { whatsapp: 0, instagram: 0 },
          { whatsapp: 4, instagram: 0 },
        ],
      },
    ]);
  });

  it("ordena por total descendente y, en empate, por nombre", () => {
    const diarios: ClicDiarioPerfil[] = [
      { perfilId: "p-luz", fecha: "2026-10-02", whatsapp: 3, instagram: 0 },
      { perfilId: "p-ana", fecha: "2026-10-02", whatsapp: 1, instagram: 2 },
      { perfilId: "p-mia", fecha: "2026-10-02", whatsapp: 9, instagram: 0 },
    ];

    const mapa = armarMapaCalor(rango, [luz, ana, { perfilId: "p-mia", nombreNegocio: "Mía Moda" }], diarios);

    // Totales 9, 3 y 3: el empate entre Ana y Luz se resuelve por nombre.
    expect(mapa.filas.map((fila) => fila.nombreNegocio)).toEqual(["Mía Moda", "Dulces de Ana", "Taller Luz"]);
  });

  it("suma los clics de varios días en la misma columna cuando el período se agrupa por semana", () => {
    const largo = rangoDe("2026-08-20", "2026-10-04");
    const diarios: ClicDiarioPerfil[] = [
      { perfilId: "p-ana", fecha: "2026-08-24", whatsapp: 1, instagram: 0 },
      { perfilId: "p-ana", fecha: "2026-08-27", whatsapp: 2, instagram: 1 },
      { perfilId: "p-ana", fecha: "2026-08-30", whatsapp: 0, instagram: 4 },
    ];

    const mapa = armarMapaCalor(largo, [ana], diarios);

    expect(mapa.granularidad).toBe("semana");
    expect(mapa.filas[0].celdas[1]).toEqual({ whatsapp: 3, instagram: 5 }); // semana del 24 al 30 de agosto
    expect(mapa.filas[0].total).toBe(8);
  });

  it("ignora un clic de una cuenta que no está en el top o de un día fuera del período", () => {
    const diarios: ClicDiarioPerfil[] = [
      { perfilId: "otra", fecha: "2026-10-02", whatsapp: 5, instagram: 5 },
      { perfilId: "p-ana", fecha: "2026-09-01", whatsapp: 5, instagram: 5 },
    ];

    const mapa = armarMapaCalor(rango, [ana], diarios);

    expect(mapa.filas).toHaveLength(1);
    expect(mapa.filas[0].total).toBe(0);
  });

  it("deja el total del período anterior de cada cuenta en total_anterior, o 0 si no tuvo clics", () => {
    const mapa = armarMapaCalor(rango, [ana, luz], [], [{ perfilId: "p-ana", total: 12 }, { perfilId: "fuera-del-top", total: 99 }]);

    const porNombre = Object.fromEntries(mapa.filas.map((fila) => [fila.nombreNegocio, fila.totalAnterior]));
    expect(porNombre).toEqual({ "Dulces de Ana": 12, "Taller Luz": 0 });
  });

  it("ordena por el canal pedido, luego por total y luego por nombre", () => {
    const diarios: ClicDiarioPerfil[] = [
      { perfilId: "p-ana", fecha: "2026-10-02", whatsapp: 5, instagram: 20 }, // total 25, whatsapp 5
      { perfilId: "p-luz", fecha: "2026-10-02", whatsapp: 9, instagram: 1 }, // total 10, whatsapp 9
      { perfilId: "p-mia", fecha: "2026-10-02", whatsapp: 9, instagram: 3 }, // total 12, whatsapp 9
    ];
    const cuentas = [ana, luz, { perfilId: "p-mia", nombreNegocio: "Mía Moda" }];

    const nombres = (orden: "total" | "whatsapp" | "instagram") => armarMapaCalor(rango, cuentas, diarios, [], orden).filas.map((fila) => fila.nombreNegocio);

    expect(nombres("total")).toEqual(["Dulces de Ana", "Mía Moda", "Taller Luz"]); // 25, 12, 10
    expect(nombres("whatsapp")).toEqual(["Mía Moda", "Taller Luz", "Dulces de Ana"]); // 9 y 9 (desempata el total 12 > 10), luego 5
    expect(nombres("instagram")).toEqual(["Dulces de Ana", "Mía Moda", "Taller Luz"]); // 20, 3, 1
  });

  it("sin cuentas devuelve las columnas y ninguna fila", () => {
    const mapa = armarMapaCalor(rango, [], []);
    expect(mapa.columnas).toHaveLength(3);
    expect(mapa.filas).toEqual([]);
  });
});
