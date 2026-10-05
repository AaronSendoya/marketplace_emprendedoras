# Respaldos de la base de datos (regla 17)

Copia de seguridad cifrada de la base, independiente de lo que Hostinger o TiDB Cloud ofrezcan por su cuenta. Sirve para el día que algo salga mal: alguien borra datos por error, una migración deja el esquema a medias (MySQL no revierte el DDL, sección 3 de `CLAUDE.md`), o el proveedor pierde los datos. Sin esto, ese día no habría nada que restaurar.

## Cómo funciona `pnpm db:backup`

1. Vuelca la base con `mysqldump` (usa `DATABASE_URL`).
2. Comprime el volcado (gzip).
3. Lo cifra con AES-256-GCM y la clave de `BACKUP_ENCRYPTION_KEY`.
4. Lo guarda en `backups/` (local, ignorado por git).
5. Si están las cuatro variables `R2_BACKUPS_*`, además lo sube a ese bucket. Si no están, se queda solo en el paso 4 y avisa.

Nada de esto pasa dentro del servidor de la aplicación: es un script aparte que corres tú (o una tarea programada de Hostinger), como `pnpm db:migrate`.

## Por qué está cifrado y en un bucket aparte

Un volcado de la base trae todo en texto plano: correos, hashes de contraseña, teléfonos. Cifrarlo antes de subirlo es lo que hace que, si alguien accede al bucket de respaldos, no consiga nada legible. Por eso:
- **Nunca** va en el mismo bucket que las imágenes (que es público).
- La clave de cifrado (`BACKUP_ENCRYPTION_KEY`) vive solo en `.env.local`, nunca junto al respaldo. Si la pierdes, ese respaldo queda ilegible para siempre — sin puerta trasera posible.

## Preparar la primera vez

1. Genera la clave de cifrado (una sola vez, se reutiliza siempre):
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Cópiala a `BACKUP_ENCRYPTION_KEY` en `.env.local`. Guárdala también fuera del computador (un gestor de contraseñas), porque si se borra este `.env.local` la pierdes.
2. (Opcional, para no depender solo de este computador) En Cloudflare, crea un bucket R2 nuevo, por ejemplo `catalogo-respaldos`, con un token "Object Read & Write" que solo alcance a ese bucket. Completa `R2_BACKUPS_ACCOUNT_ID`, `R2_BACKUPS_ACCESS_KEY_ID`, `R2_BACKUPS_SECRET_ACCESS_KEY` y `R2_BACKUPS_BUCKET`.
3. `pnpm db:backup`.

## Restaurar un respaldo

```
pnpm db:restaurar backups/catalogo_catalogo_dev_2026-09-27T10-15-00-000Z.sql.gz.enc
```

Descifra y descomprime, y deja un archivo `.sql` al lado (mismo nombre, sin `.gz.enc`). Ese archivo tiene la base en texto plano: revísalo, cárgalo con
```
mysql -h HOST -u USUARIO -p BASE < backups/catalogo_....sql
```
y bórralo apenas termines. El script no toca ninguna base por sí solo: restaurar es un paso consciente, no automático.

## Pendiente

- **Programarlo como tarea diaria** en Hostinger al desplegar (paso 16 del plan). Hasta entonces, córrelo a mano de vez en cuando, sobre todo antes de una migración.
- **Retención:** hoy no borra respaldos viejos. Si el bucket crece demasiado, hace falta una regla de ciclo de vida en R2 (se configura en el panel de Cloudflare, no en código) o un borrado manual periódico.
