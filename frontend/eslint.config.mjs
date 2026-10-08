import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Regla 16 (CLAUDE.md): las imágenes de R2 no pasan por el optimizador de Next. Una imagen borrada de R2 seguiría sirviéndose
  // desde la copia que el optimizador guarda en disco, y eliminar una cuenta debe borrar todo (regla 5). Se usa `ImagenR2`.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/image",
              message:
                "Las imágenes de R2 se muestran con <ImagenR2> (src/components/atoms/ImagenR2.tsx): no deben pasar por el optimizador de Next (regla 16). Solo los logos y banners locales de PISTA8 usan next/image.",
            },
          ],
        },
      ],
    },
  },
  // Los únicos archivos que pueden importar next/image: el átomo ImagenR2 y los que muestran imágenes LOCALES de PISTA8.
  {
    files: [
      "src/components/atoms/ImagenR2.tsx",
      "src/components/atoms/FondoFotografico.tsx",
      "src/components/organisms/Navbar.tsx",
      "src/components/organisms/AdminSidebar.tsx",
      "src/components/organisms/negocio/CabeceraMovilNegocio.tsx",
      "src/components/organisms/negocio/RielNegocio.tsx",
      "src/app/iniciar-sesion/page.tsx",
    ],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
