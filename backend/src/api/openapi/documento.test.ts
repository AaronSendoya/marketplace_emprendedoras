import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CODIGOS_ERROR } from "@/shared/domain/errors";
import { generarDocumento } from "./documento";

const documento = generarDocumento();
const METODOS = ["get", "post", "put", "patch", "delete"] as const;
const operaciones = Object.entries(documento.paths ?? {}).flatMap(([ruta, item]) =>
  METODOS.filter((metodo) => item?.[metodo]).map((metodo) => ({ ruta, metodo, operacion: item![metodo]! })),
);

describe("documento OpenAPI", () => {
  it("es OpenAPI 3.1 y apunta al mismo origen bajo /api/v1", () => {
    expect(documento.openapi).toBe("3.1.0");
    expect(documento.servers).toEqual([{ url: "/api/v1" }]);
  });

  it("define el esquema de seguridad bearerAuth (JWT)", () => {
    expect(documento.components?.securitySchemes?.bearerAuth).toMatchObject({ type: "http", scheme: "bearer", bearerFormat: "JWT" });
  });

  it("incluye los componentes reutilizables Error y Paginacion", () => {
    expect(Object.keys(documento.components?.schemas ?? {})).toEqual(expect.arrayContaining(["Error", "Paginacion"]));
  });

  it("el esquema Error lista exactamente los códigos de error del dominio", () => {
    const esquema = documento.components?.schemas?.Error as { properties: { error: { properties: { codigo: { enum: string[] } } } } };

    expect(esquema.properties.error.properties.codigo.enum).toEqual([...CODIGOS_ERROR]);
  });

  it("documenta GET /health como público con respuestas 200 y 500", () => {
    const health = documento.paths?.["/health"]?.get;

    expect(health?.security).toEqual([]);
    expect(Object.keys(health?.responses ?? {})).toEqual(["200", "500"]);
  });

  it("toda operación declara `security` (público o bearerAuth)", () => {
    expect(operaciones.length).toBeGreaterThan(0);
    for (const { ruta, metodo, operacion } of operaciones) {
      expect(operacion.security, `${metodo.toUpperCase()} ${ruta}`).toBeDefined();
    }
  });

  it("toda operación documenta al menos una respuesta de error con el esquema Error", () => {
    for (const { ruta, metodo, operacion } of operaciones) {
      const conError = Object.entries(operacion.responses ?? {}).some(
        ([estado, respuesta]) =>
          Number(estado) >= 400 && JSON.stringify(respuesta).includes("#/components/schemas/Error"),
      );
      expect(conError, `${metodo.toUpperCase()} ${ruta}`).toBe(true);
    }
  });

  it("docs/openapi.json está al día (si falla, ejecutar `pnpm openapi:export`)", () => {
    const versionado = JSON.parse(readFileSync(join(process.cwd(), "docs", "openapi.json"), "utf8"));

    expect(versionado).toEqual(JSON.parse(JSON.stringify(documento)));
  });
});
