-- Consulta que hace el caso de uso: contar los intentos de un correo en la ventana reciente.
CREATE INDEX idx_intentos_login_email_creado ON intentos_login (email, creado_en);
