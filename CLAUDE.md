@README.md

# Instrucciones para Claude en esta carpeta

Esta carpeta es un único repositorio git con dos aplicaciones independientes, `backend/` y `frontend/`; el mapa está arriba. La fuente de verdad de las reglas de negocio son `backend/CLAUDE.md` y `frontend/CLAUDE.md` (secciones 1 a 4 idénticas): no se repiten aquí. Al trabajar en una aplicación se aplica su `CLAUDE.md`, incluida su regla de mantenimiento (documentar primero una regla nueva, en ambas carpetas, y después implementarla).

pnpm y las pruebas se ejecutan dentro de la carpeta de cada aplicación, nunca en esta raíz, que no tiene `package.json`. Hay un solo `.gitignore` (el de la raíz): no se crean otros dentro de las aplicaciones.
