-- Índices para los filtros de los feeds y para las claves foráneas que se consultan al revés.
-- (usuarios.email, perfiles_emprendedores.usuario_id y la clave de producto_descuentos ya
-- tienen índice por sus restricciones UNIQUE / PRIMARY KEY.)
--
-- MySQL crea solo un índice por cada clave foránea que no tiene uno propio; al crear aquí
-- los índices explícitos, el motor descarta esos automáticos por redundantes.

-- Feed 1: filtros por ciudad y rubro; también aceleran la comprobación de ON DELETE RESTRICT.
CREATE INDEX idx_perfiles_ciudad_id ON perfiles_emprendedores (ciudad_id);
CREATE INDEX idx_perfiles_rubro_id ON perfiles_emprendedores (rubro_id);

-- Productos de un perfil, con o sin filtrar por activo ("mis productos" y detalle público).
-- MySQL no tiene índices parciales: uno compuesto (perfil_id, activo) cubre ambas consultas.
CREATE INDEX idx_productos_perfil_activo ON productos (perfil_id, activo);

-- Motor de promociones: descuentos de un perfil y productos que usan un descuento.
CREATE INDEX idx_descuentos_perfil_id ON descuentos (perfil_id);
CREATE INDEX idx_producto_descuentos_descuento_id ON producto_descuentos (descuento_id);
