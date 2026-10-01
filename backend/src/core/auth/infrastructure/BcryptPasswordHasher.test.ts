import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { BcryptPasswordHasher } from "./BcryptPasswordHasher";

describe("BcryptPasswordHasher", () => {
  const hasher = new BcryptPasswordHasher();

  it("genera un hash con coste 12 (regla 17) que valida la contraseña correcta y rechaza otra", async () => {
    const hash = await hasher.hash("Aaron123*");

    expect(bcrypt.getRounds(hash)).toBe(12);
    await expect(hasher.comparar("Aaron123*", hash)).resolves.toBe(true);
    await expect(hasher.comparar("otra-clave", hash)).resolves.toBe(false);
  });

  it("nunca guarda la contraseña en texto plano", async () => {
    const hash = await hasher.hash("Aaron123*");

    expect(hash).not.toContain("Aaron123*");
  });

  it("dos hashes de la misma contraseña son distintos (sal aleatoria) pero ambos validan", async () => {
    const [hashUno, hashDos] = await Promise.all([hasher.hash("misma-clave"), hasher.hash("misma-clave")]);

    expect(hashUno).not.toBe(hashDos);
    await expect(hasher.comparar("misma-clave", hashUno)).resolves.toBe(true);
    await expect(hasher.comparar("misma-clave", hashDos)).resolves.toBe(true);
  });
});
