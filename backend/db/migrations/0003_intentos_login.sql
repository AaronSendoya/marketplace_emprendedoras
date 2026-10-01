-- Freno a los intentos de acceso (regla 17). Un intento fallido de login inserta una fila; el
-- caso de uso cuenta las filas del correo en los últimos minutos antes de comparar la contraseña
-- (mismo patrón que otp_codigos, dominio 5: contar filas en una ventana de tiempo).
-- No referencia a usuarios: un correo inexistente también debe frenarse, para no revelar con la
-- respuesta si la cuenta existe.
CREATE TABLE intentos_login (
    id CHAR(36) NOT NULL,
    email VARCHAR(150) NOT NULL,
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
