-- Sesiones del servidor (regla 5). Cada inicio de sesión inserta una fila y emite un token que lleva su
-- id (jti); en cada petición autenticada se comprueba que la sesión exista, sea de esa cuenta y no haya
-- vencido, y POST /auth/logout la borra: así un token copiado deja de valer al cerrar la sesión.
-- expira_en: 4 horas después de creado_en para un Admin; NULL para una Emprendedora (no vence).
-- No guarda el token ni ningún dato del dispositivo (ni IP ni user-agent).
-- Los tokens emitidos antes de esta migración no llevan sesión y dejan de valer.
CREATE TABLE sesiones (
    id CHAR(36) NOT NULL,
    usuario_id CHAR(36) NOT NULL,
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expira_en DATETIME(3) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sesiones_usuario ON sesiones (usuario_id);
