-- ============================================================================
-- Rubros oficiales del cliente (CLAUDE.md, sección 3, tabla `rubros`)
-- ============================================================================
-- Deja el catálogo `rubros` con los 8 rubros oficiales, los mismos que ofrece el formulario de Google Forms:
--   Salud y bienestar; Tecnología y servicios profesionales; Alimentos y bebidas; Artesanías o productos hechos a mano;
--   Belleza y cuidado personal; Comercio; Diseño o confección; Manufactura.
-- Es idempotente: se puede correr más de una vez y no duplica nada.
--
-- DÓNDE correrlo (una vez en cada base ya creada con catálogos):
--   - catalogo_dev (MySQL local): ya aplicado el 2026-10-06. Solo repetir si se recrea la base.
--   - catalogo_prod (TiDB Cloud): PENDIENTE. Es la que tiene los 10 rubros antiguos del seed de prueba.
--   - catalogo_test: NO. Se queda sin catálogos a propósito; las pruebas crean los suyos con prefijo.
--   Antes de ejecutar, comprueba en DBeaver que la base activa es la correcta (SELECT DATABASE();).
--
-- Qué hace, en orden:
--   0. Muestra cómo está el catálogo ahora (solo lectura).
--   1. Inserta los rubros oficiales que falten.
--   2. Reasigna los perfiles que usan un rubro anterior con equivalente claro:
--        Artesanías                       -> Artesanías o productos hechos a mano
--        Moda y accesorios                -> Diseño o confección
--        Tecnología y servicios digitales -> Tecnología y servicios profesionales
--        Servicios profesionales          -> Tecnología y servicios profesionales
--   3. Reasigna SOLO los perfiles de prueba (cuenta @prueba.pista8.com, de docs/seed-prueba.sql) que usan un rubro sin
--      equivalente claro. Un perfil real nunca se toca:
--        Hogar y decoración               -> Comercio
--        Educación y capacitación         -> Tecnología y servicios profesionales
--        Otros                            -> Manufactura
--   4. Borra los rubros que no son oficiales y que ningún perfil usa.
--   5. Muestra el resultado: deben quedar los 8 oficiales. Una fila que no sea oficial y tenga perfiles > 0 es un perfil real con un
--      rubro sin equivalente claro: elige su rubro a mano con un UPDATE y vuelve a correr el script para que el paso 4 lo borre.
--
-- En DBeaver: Alt+X ejecuta el script entero, sentencia por sentencia (en TiDB no uses Ctrl+Enter sobre varias a la vez, docs/TIDB.md).
-- Los literales llevan COLLATE por el choque de colaciones que describe docs/TIDB.md.

-- 0. Antes: rubros y cuántos perfiles usa cada uno (solo lectura)
SELECT r.nombre, COUNT(p.id) AS perfiles
FROM rubros r
LEFT JOIN perfiles_emprendedores p ON p.rubro_id = r.id
GROUP BY r.id, r.nombre
ORDER BY r.nombre;

-- 1. Rubros oficiales que falten
INSERT INTO rubros (id, nombre)
SELECT UUID(), t.nombre
FROM (
    SELECT 'Salud y bienestar' AS nombre
    UNION ALL SELECT 'Tecnología y servicios profesionales'
    UNION ALL SELECT 'Alimentos y bebidas'
    UNION ALL SELECT 'Artesanías o productos hechos a mano'
    UNION ALL SELECT 'Belleza y cuidado personal'
    UNION ALL SELECT 'Comercio'
    UNION ALL SELECT 'Diseño o confección'
    UNION ALL SELECT 'Manufactura'
) t
WHERE NOT EXISTS (SELECT 1 FROM rubros x WHERE x.nombre = t.nombre COLLATE utf8mb4_unicode_ci);

-- 2. Perfiles con un rubro anterior que tiene equivalente claro
UPDATE perfiles_emprendedores p
JOIN rubros viejo ON viejo.id = p.rubro_id
JOIN rubros nuevo ON nuevo.nombre = 'Artesanías o productos hechos a mano' COLLATE utf8mb4_unicode_ci
SET p.rubro_id = nuevo.id
WHERE viejo.nombre = 'Artesanías' COLLATE utf8mb4_unicode_ci;

UPDATE perfiles_emprendedores p
JOIN rubros viejo ON viejo.id = p.rubro_id
JOIN rubros nuevo ON nuevo.nombre = 'Diseño o confección' COLLATE utf8mb4_unicode_ci
SET p.rubro_id = nuevo.id
WHERE viejo.nombre = 'Moda y accesorios' COLLATE utf8mb4_unicode_ci;

UPDATE perfiles_emprendedores p
JOIN rubros viejo ON viejo.id = p.rubro_id
JOIN rubros nuevo ON nuevo.nombre = 'Tecnología y servicios profesionales' COLLATE utf8mb4_unicode_ci
SET p.rubro_id = nuevo.id
WHERE viejo.nombre IN ('Tecnología y servicios digitales' COLLATE utf8mb4_unicode_ci, 'Servicios profesionales' COLLATE utf8mb4_unicode_ci);

-- 3. Solo perfiles de prueba (@prueba.pista8.com) con un rubro sin equivalente claro
UPDATE perfiles_emprendedores p
JOIN usuarios u ON u.id = p.usuario_id
JOIN rubros viejo ON viejo.id = p.rubro_id
JOIN rubros nuevo ON nuevo.nombre = 'Comercio' COLLATE utf8mb4_unicode_ci
SET p.rubro_id = nuevo.id
WHERE u.email LIKE '%@prueba.pista8.com' COLLATE utf8mb4_unicode_ci
  AND viejo.nombre = 'Hogar y decoración' COLLATE utf8mb4_unicode_ci;

UPDATE perfiles_emprendedores p
JOIN usuarios u ON u.id = p.usuario_id
JOIN rubros viejo ON viejo.id = p.rubro_id
JOIN rubros nuevo ON nuevo.nombre = 'Tecnología y servicios profesionales' COLLATE utf8mb4_unicode_ci
SET p.rubro_id = nuevo.id
WHERE u.email LIKE '%@prueba.pista8.com' COLLATE utf8mb4_unicode_ci
  AND viejo.nombre = 'Educación y capacitación' COLLATE utf8mb4_unicode_ci;

UPDATE perfiles_emprendedores p
JOIN usuarios u ON u.id = p.usuario_id
JOIN rubros viejo ON viejo.id = p.rubro_id
JOIN rubros nuevo ON nuevo.nombre = 'Manufactura' COLLATE utf8mb4_unicode_ci
SET p.rubro_id = nuevo.id
WHERE u.email LIKE '%@prueba.pista8.com' COLLATE utf8mb4_unicode_ci
  AND viejo.nombre = 'Otros' COLLATE utf8mb4_unicode_ci;

-- 4. Rubros que no son oficiales y que ningún perfil usa
DELETE FROM rubros
WHERE nombre NOT IN (
    'Salud y bienestar' COLLATE utf8mb4_unicode_ci,
    'Tecnología y servicios profesionales' COLLATE utf8mb4_unicode_ci,
    'Alimentos y bebidas' COLLATE utf8mb4_unicode_ci,
    'Artesanías o productos hechos a mano' COLLATE utf8mb4_unicode_ci,
    'Belleza y cuidado personal' COLLATE utf8mb4_unicode_ci,
    'Comercio' COLLATE utf8mb4_unicode_ci,
    'Diseño o confección' COLLATE utf8mb4_unicode_ci,
    'Manufactura' COLLATE utf8mb4_unicode_ci
)
AND id NOT IN (SELECT rubro_id FROM perfiles_emprendedores);

-- 5. Después: deben quedar los 8 oficiales
SELECT r.nombre, COUNT(p.id) AS perfiles
FROM rubros r
LEFT JOIN perfiles_emprendedores p ON p.rubro_id = r.id
GROUP BY r.id, r.nombre
ORDER BY r.nombre;
