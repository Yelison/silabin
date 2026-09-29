/**
 * Los dos colores que el sistema pinta fuera de la página: el fondo de la pantalla de carga de
 * la PWA (`surface`) y la barra del navegador (`action`). Son los valores de `--color-surface` y
 * `--color-action` de `src/app/globals.css`: el manifiesto y el `viewport` de `layout.tsx` los
 * importan de aquí, y `tokens.test.ts` (CO3) comprueba que siguen siendo los mismos que los
 * tokens. Un CSS no se puede importar desde TypeScript, así que la copia es esta y solo esta.
 */
export const THEME_COLORS = {
	surface: "#fff8ec",
	action: "#f5b83d",
} as const;
