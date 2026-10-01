-- Consulta del listado de cuentas del Admin (regla 5): filtra por activo y siempre ordena por
-- creado_en DESC; sin este índice, cada página pedía un filesort sobre toda la tabla.
CREATE INDEX idx_usuarios_activo_creado_en ON usuarios (activo, creado_en);
