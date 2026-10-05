# Base de datos en TiDB Cloud (producción temporal)

Decisión del cliente. Reglas en `CLAUDE.md`, sección 1. El código no cambia salvo el pool (`MySqlClient.ts`).
Las claves y URLs van solo en `.env.local` o en el panel de Hostinger, nunca en el chat ni en el repositorio.

## 1. Crear el clúster

1. Entra en https://tidbcloud.com e inicia sesión.
2. **Create Cluster** y elige el plan gratuito (Starter). Región: la más cercana a Hostinger. Nómbralo `catalogo`.
3. Al terminar, abre **Connect**. Anota (sin pegarlos en el chat): host (`gateway01...tidbcloud.com`), puerto `4000`, usuario (lleva un prefijo, `xxxx.root`) y genera la contraseña de `root` con **Generate Password**. Se muestra una sola vez.

## 2. Crear las bases y el usuario de la app

En el panel: **SQL Editor** (o DBeaver con la conexión de `root`, SSL activado). Ejecuta:

```sql
CREATE DATABASE IF NOT EXISTS catalogo_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS catalogo_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

`catalogo_test` solo sirve para `pnpm test:integration`; si prefieres no gastar cuota de la nube, sigue probando con la MySQL local y omítela.

Usuario propio (regla 17: privilegios solo sobre su base). En TiDB Cloud el nombre debe llevar el mismo prefijo que ves en Connect (`xxxx.`):

```sql
CREATE USER 'xxxx.catalogo_app'@'%' IDENTIFIED BY 'UNA_CLAVE_LARGA_SOLO_LETRAS_Y_NUMEROS';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON catalogo_prod.* TO 'xxxx.catalogo_app'@'%';
```

Sustituye `xxxx` y la clave. Si `CREATE USER` no está permitido en tu plan, usa `root` solo para migrar y anótalo como pendiente.

## 3. Comprobaciones (ejecútalas antes de migrar)

```sql
SELECT VERSION();                                              -- TiDB debe ser v8.5.0 o superior para aplicar claves foráneas
SELECT @@tidb_enable_check_constraint;                         -- debe ser 1 (CHECK activos)
SELECT @@foreign_key_checks;                                   -- debe ser 1
SELECT VARIABLE_VALUE FROM mysql.tidb WHERE VARIABLE_NAME = 'new_collation_enabled'; -- debe ser True (correo sin distinguir mayúsculas)
SELECT GET_LOCK('prueba', 1), RELEASE_LOCK('prueba');          -- debe devolver 1 y 1 (lo usan las migraciones)
```

**Choque de colaciones en SQL manual (`docs/seed-prueba.sql`, y cualquier script futuro con literales):** en un `INSERT ... SELECT` que compara una columna real contra el resultado de `SELECT 'texto' UNION ALL SELECT 'otro'`, TiDB puede dar `Illegal mix of collations (utf8mb4_unicode_ci) y (utf8mb4_0900_ai_ci)`. La columna real tiene la colación fija del esquema (`utf8mb4_unicode_ci`); la columna que sale de un `UNION` de literales toma la colación de la conexión, con la misma prioridad ("implicit") en vez de ceder como haría un literal suelto. MySQL local no lo exige. Se arregla forzando la colación en la comparación: `WHERE tabla.columna = derivada.columna COLLATE utf8mb4_unicode_ci`.

**Multi-statement en el SQL Editor (DBeaver, Chat2Query):** TiDB rechaza por defecto una consulta que trae varias sentencias separadas por `;` en un solo envío ("client has multi-statement capability disabled"). Al crear el usuario del paso 2, ejecuta el `CREATE USER` y el `GRANT` **cada uno por separado** (en DBeaver: cursor en la línea, `Ctrl+Enter`), no los dos seleccionados juntos. No hace falta activar `tidb_multi_statement_mode` a nivel de clúster (`SET GLOBAL`) para esto ni para migrar: `pnpm db:migrate` ya lo habilita solo para su propia sesión (`scripts/lib/conexion.ts`), porque cada archivo de migración es varias sentencias en un solo `.query()`.

Si alguna falla, avísame con el resultado antes de migrar:
- Versión menor a 8.5 o `foreign_key_checks` en 0: las claves foráneas no se aplican. La app sigue validando en los casos de uso, pero se pierde la integridad en la base (y `ON DELETE CASCADE`).
- `GET_LOCK` no soportado: ajusto `migrador.ts` para migrar sin bloqueo (es seguro si migra una sola persona).

## 4. Migrar desde tu computador

En PowerShell, dentro de `backend/`. Sustituye HOST, USUARIO y CLAVE; la clave sin caracteres especiales. La URL se pasa por la terminal, no se guarda en ningún archivo:

```powershell
$env:DATABASE_URL = "mysql://xxxx.catalogo_app:CLAVE@HOST:4000/catalogo_prod?ssl=true"
pnpm db:migrate
Remove-Item Env:DATABASE_URL
```

Debe aplicar las migraciones `0001` a `0004`. Si falla a la mitad, no la repitas a ciegas: el DDL no se revierte; revisa qué tablas quedaron (`SHOW TABLES`) y avísame.

Luego verifica en el SQL Editor:

```sql
SHOW TABLES;              -- 11 tablas: roles, ciudades, rubros, usuarios, perfiles_emprendedores, productos, descuentos, producto_descuentos, otp_codigos, intentos_login, _migraciones
SELECT nombre FROM _migraciones ORDER BY nombre;
```

## 5. Datos iniciales de producción

No uses `seed.dev.sql` (es solo desarrollo). Faltan los roles `Admin` y `Emprendedor`, las ciudades y rubros, y el primer Admin (regla 14, plantilla en `schema.reference.sql`, directriz 10). Inserta con UUID v4 generados localmente.

## 6. Conectar la app

En el panel de Hostinger (variables de la app backend), no en un archivo:

```
APP_ENV=production
DATABASE_URL=mysql://xxxx.catalogo_app:CLAVE@HOST:4000/catalogo_prod?ssl=true
DATABASE_POOL_MAX=5
```

Free tier: 400 conexiones y 50 M de request units al mes (dato de un buscador, no confirmado en la página oficial): confírmalo en el panel del clúster.

## 7. Respaldos

El plan gratuito puede no incluir respaldos automáticos. Mantén el `mysqldump` cifrado hacia el bucket privado de R2 (regla 17) y verifica en el panel qué retención ofrece TiDB.
