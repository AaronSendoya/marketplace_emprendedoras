-- Esquema inicial del catálogo "Track de Mujeres 2026" (MySQL 8.0+ / MariaDB 10.4+).
-- Fuente de las reglas: CLAUDE.md, secciones 2 y 3.
--
-- Convenciones:
--   * ids: CHAR(36) con un UUID v4 que genera la aplicación (sin DEFAULT en la base).
--   * fechas: DATETIME(3) siempre en UTC (la aplicación fija la zona de la sesión en +00:00).
--   * todas las restricciones llevan nombre: el traductor de errores (errorMySql.ts) las usa
--     para dar mensajes propios.
--   * MySQL no revierte el DDL: cada CREATE confirma solo. Por eso esta migración no debe
--     editarse una vez aplicada; los cambios van en una migración nueva.

-- ==========================================
-- DOMINIO 1: CATÁLOGOS BASE Y AUTENTICACIÓN
-- ==========================================
CREATE TABLE roles (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_roles_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ciudades (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_ciudades_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rubros (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_rubros_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
    id CHAR(36) NOT NULL,
    email VARCHAR(150) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(50) NOT NULL,
    apellido_materno VARCHAR(50) NULL, -- Opcional: no todas las personas lo tienen (regla 10)
    password_hash VARCHAR(255) NOT NULL,
    rol_id CHAR(36) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE, -- Soft delete administrativo
    email_verificado_en DATETIME(3) NULL, -- NULL = correo sin verificar (p. ej. migrado del Excel, regla 15)
    token_version INT NOT NULL DEFAULT 0, -- Se incrementa al restablecer la contraseña e invalida los tokens anteriores
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT uk_usuarios_email UNIQUE (email),
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- DOMINIO 2: PERFILES DE EMPRENDEDORES (FEED 1)
-- ==========================================
CREATE TABLE perfiles_emprendedores (
    id CHAR(36) NOT NULL,
    usuario_id CHAR(36) NOT NULL,
    nombre_negocio VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    whatsapp VARCHAR(20) NOT NULL, -- Solo números, pre-formateado por el backend
    instagram_username VARCHAR(50) NULL, -- Solo username limpio sin '@'
    otra_red_social VARCHAR(50) NULL, -- Tercera red social opcional, texto libre (regla 3)
    ciudad_id CHAR(36) NOT NULL,
    rubro_id CHAR(36) NOT NULL,
    foto_perfil_key VARCHAR(255) NOT NULL, -- Clave en R2; sin DEFAULT: la imagen predeterminada se elige en el backend (regla 11)
    logo_key VARCHAR(255) NOT NULL, -- Ídem
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    actualizado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    -- Relación 1:1: un usuario tiene un solo perfil (regla 6)
    CONSTRAINT uk_usuario_perfil UNIQUE (usuario_id),
    CONSTRAINT fk_perfiles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_perfiles_ciudad FOREIGN KEY (ciudad_id) REFERENCES ciudades (id) ON DELETE RESTRICT,
    CONSTRAINT fk_perfiles_rubro FOREIGN KEY (rubro_id) REFERENCES rubros (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- DOMINIO 3: MARKETPLACE (FEED 2)
-- ==========================================
CREATE TABLE productos (
    id CHAR(36) NOT NULL,
    perfil_id CHAR(36) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NULL,
    precio DECIMAL(10,2) NULL, -- NULL si deciden no establecer precio (regla 7)
    mostrar_precio BOOLEAN NOT NULL DEFAULT TRUE,
    imagen_key VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE, -- Soft delete por la emprendedora
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    actualizado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_productos_perfil FOREIGN KEY (perfil_id) REFERENCES perfiles_emprendedores (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- DOMINIO 4: MOTOR DE PROMOCIONES
-- ==========================================
CREATE TABLE descuentos (
    id CHAR(36) NOT NULL,
    perfil_id CHAR(36) NOT NULL,
    porcentaje DECIMAL(5,2) NOT NULL,
    fecha_inicio DATETIME(3) NULL, -- NULL = vigente desde la creación (regla 8)
    fecha_fin DATETIME(3) NULL, -- NULL = permanente
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_descuentos_perfil FOREIGN KEY (perfil_id) REFERENCES perfiles_emprendedores (id) ON DELETE CASCADE,
    CONSTRAINT ck_descuentos_porcentaje CHECK (porcentaje > 0 AND porcentaje <= 100),
    CONSTRAINT ck_descuentos_rango_fechas
        CHECK (fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_fin > fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pivote N:M. No lleva perfil_id (violaría 2FN): que producto y descuento sean del mismo
-- perfil se valida en el caso de uso (regla 9).
CREATE TABLE producto_descuentos (
    producto_id CHAR(36) NOT NULL,
    descuento_id CHAR(36) NOT NULL,
    PRIMARY KEY (producto_id, descuento_id),
    CONSTRAINT fk_producto_descuentos_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
    CONSTRAINT fk_producto_descuentos_descuento FOREIGN KEY (descuento_id) REFERENCES descuentos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- DOMINIO 5: VERIFICACIÓN POR OTP
-- ==========================================
-- No referencia a usuarios: el correo puede pertenecer a una cuenta que aún no existe.
CREATE TABLE otp_codigos (
    id CHAR(36) NOT NULL,
    email VARCHAR(150) NOT NULL,
    proposito VARCHAR(30) NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL, -- Hash del código; nunca el código en texto plano
    intentos SMALLINT NOT NULL DEFAULT 0,
    expira_en DATETIME(3) NOT NULL,
    usado_en DATETIME(3) NULL, -- NULL = aún no consumido
    creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT ck_otp_proposito CHECK (proposito IN ('verificar_email', 'restablecer_password'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_otp_codigos_email_proposito ON otp_codigos (email, proposito, creado_en);
