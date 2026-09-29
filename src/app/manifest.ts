import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/app/theme-colors";

/**
 * Manifiesto de la PWA. Los colores son los de `surface` y `action`, que viven en
 * `src/app/theme-colors.ts` (y en `@theme inline` de `src/app/globals.css`).
 *
 * Los iconos son el arte final del Plan 7. `app-512.png` se declara además `maskable`, pero
 * el loro ocupa cerca del 81 % del cuadro y no el 70 % central de la zona segura: la cabeza es
 * casi circular y las facciones caben en el círculo seguro del 80 %, aunque una máscara
 * circular sí puede recortar plumas del contorno. Si molesta en Android, se regenera con más
 * margen. La entrada `any` y la `maskable` van separadas, porque `purpose: "any maskable"` en
 * una sola haría que el lanzador usara siempre la versión con máscara.
 */
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Silabín",
		short_name: "Silabín",
		description: "Aprende a leer con sílabas, jugando.",
		lang: "es",
		start_url: "/",
		display: "standalone",
		orientation: "any",
		background_color: THEME_COLORS.surface,
		theme_color: THEME_COLORS.action,
		icons: [
			{
				src: "/icons/app-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/icons/app-512.png",
				sizes: "512x512",
				type: "image/png",
			},
			{
				src: "/icons/app-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
