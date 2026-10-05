-- Consulta que hacen los casos de uso: el resumen y el ranking agrupan por perfil y tipo.
CREATE INDEX idx_clics_contacto_perfil_tipo ON clics_contacto (perfil_id, tipo);
