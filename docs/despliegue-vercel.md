# Despliegue en Vercel

Este documento es para el autor humano. **Ningún agente despliega**: aquí solo se explica lo
que hay que hacer a mano.

## Importar el repositorio

1. En Vercel, «Add New… → Project» e importar este repositorio de GitHub.
2. Vercel detecta Next.js automáticamente (Framework Preset: Next.js). No hace falta tocar el
   comando de build ni el de salida.
3. **Gestor de paquetes:** `pnpm` (el repo trae `pnpm-lock.yaml` y `packageManager` en
   `package.json`; Vercel lo detecta solo, pero conviene comprobarlo en Settings → General).
4. **Versión de Node:** 22.
5. **Variables de entorno:** ninguna. La app no necesita secretos ni claves para funcionar
   (el audio es `speechSynthesis`, sin cuenta de terceros todavía).
6. Desplegar. El primer build tarda algo más porque genera el service worker (Serwist con
   Turbopack); los siguientes son incrementales como cualquier build de Next.

## Comprobar en el iPad (Safari)

Después de que el despliegue esté listo, con un iPad real:

1. **Se instala:** abrir la URL en Safari, tocar «Compartir» → «Añadir a pantalla de inicio».
   El icono debe verse (el loro del Plan 7) y el nombre debe ser «Silabín».
   La lista completa para el autor es `docs/checklist-ipad.md`.
2. **Funciona sin red:** abrir la app ya instalada, esperar a que cargue una vez con red, y
   luego activar el modo avión. Volver a abrir la app: debe entrar y enseñar la pantalla de
   inicio sin red (sirve `/` precacheado). No hace falta que funcione todo sin red — solo que
   la app cargue en vez de quedarse en blanco o mostrar el error del navegador.
3. **Cómo se actualiza:** tras publicar un cambio y un nuevo despliegue, volver a abrir la
   app instalada. La primera vez puede tardar en notar la actualización (el service worker
   viejo sigue sirviendo mientras el nuevo se descarga en segundo plano); ese SW nuevo se
   queda «esperando». La próxima vez que se toque «Toca para empezar» en la pantalla de
   inicio, la app debe recargarse sola una vez (nunca a mitad de una sesión) y, tras eso, el
   cambio debe verse.

## Advertencia

**La URL del despliegue es pública.** Cualquiera con el enlace puede abrir la app; no hay
autenticación de por medio (el PIN de la sección de padres protege solo los ajustes dentro de
la app, no el acceso a la URL). No compartir el enlace de producción en sitios públicos
mientras el contenido siga en pruebas.
