-- Métricas de contacto (regla 19). Un clic en WhatsApp o Instagram del catálogo público inserta
-- una fila; sin ningún dato del visitante (ni IP, ni user-agent, ni cookie). A diferencia de
-- otp_codigos e intentos_login, sí referencia a perfiles_emprendedores, porque el clic siempre
-- pertenece a un perfil que ya existe.
CREATE TABLE clics_contacto (
    id CHAR(36) NOT NULL,
    perfil_id CHAR(36) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT chk_clics_contacto_tipo CHECK (tipo IN ('whatsapp', 'instagram')),
    CONSTRAINT fk_clics_contacto_perfil FOREIGN KEY (perfil_id) REFERENCES perfiles_emprendedores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
