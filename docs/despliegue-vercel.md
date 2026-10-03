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

## Probar un preview

1. **Un preview por push.** Cada push a una rama crea un despliegue de preview con su propia URL;
   no hace falta tocar producción para probar una rama.
2. **Vercel Authentication.** Por defecto protege los previews con el inicio de sesión de Vercel,
   así que un iPad (o el arnés de Playwright) se encuentra la pantalla de login y no la app. Para
   probar hay que desactivarla en Settings → Deployment Protection (el autor la desactivó para el
   preview del commit `10d8b40`). Mientras esté desactivada, **la URL es pública: no
   compartirla**.
3. **Un push tras importar.** Importar el repositorio no despliega lo que ya estaba subido: hace
   falta un push posterior. El commit vacío `10d8b40` («dispara el despliegue de preview en
   Vercel», sin ficheros) se hizo para eso; su mensaje lo dice, aunque no explica por qué el
   despliegue inicial no salió solo (no se verificó la causa).
4. **El service worker vive en `/serwist/sw.js`, no en `/sw.js`.** Con Serwist y Turbopack no hay
   fichero estático: lo genera el route handler `src/app/serwist/[path]/route.ts` (compila
   `src/app/sw.ts`), y `SerwistProvider` lo registra con `swUrl="/serwist/sw.js"` en
   `src/app/layout.tsx`. La librería lo sirve con la cabecera `Service-Worker-Allowed: /` y
   registra con alcance `/`, por eso controla toda la app aunque cuelgue de `/serwist/`. En
   desarrollo (`next dev`) el registro está desactivado: el SW solo existe en un build de
   producción o en un preview. Para probar la actualización (P6/P7 de la checklist) hace falta
   un segundo despliegue con otro commit: la revisión de la precaché de `/` sale de
   `VERCEL_GIT_COMMIT_SHA` (`src/app/serwist/revision.ts`), así que un redespliegue del mismo
   commit no cambia nada. El SW nuevo queda «esperando» (`skipWaiting: false`) hasta que
   `StartScreen` pide `SKIP_WAITING`. Para el modo sin red, abrir antes el preview con red para
   que el SW se instale y precachee; para comprobarlo, buscar `sw.js` bajo `/serwist/` en
   DevTools → Application, no en la raíz.

## Advertencia

**La URL del despliegue es pública.** Cualquiera con el enlace puede abrir la app; no hay
autenticación de por medio (el PIN de la sección de padres protege solo los ajustes dentro de
la app, no el acceso a la URL). No compartir el enlace de producción en sitios públicos
mientras el contenido siga en pruebas.
