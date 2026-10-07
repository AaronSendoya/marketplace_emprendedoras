-- Detalle opcional del descuento (regla 8): un texto libre de hasta 280 caracteres que explica la
-- promoción. En MySQL VARCHAR(n) cuenta caracteres y no bytes, así que con utf8mb4 caben 280 aunque
-- lleven tildes, ñ o emojis; es el mismo límite que valida la API (LARGO_MAXIMO_DESCRIPCION_DESCUENTO),
-- de modo que la base nunca acepta algo que la API rechaza. NULL = sin detalle: los descuentos que ya
-- existen quedan así.
ALTER TABLE descuentos ADD COLUMN descripcion VARCHAR(280) NULL;
