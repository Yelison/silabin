import type { MetadataRoute } from "next";

/**
 * Manifiesto de la PWA. Los colores son los de `surface` y `action`
 * (ver `src/app/globals.css`, sección `@theme inline`).
 *
 * Los iconos son el arte final del Plan 7. `app-512.png` se declara además `maskable`: el
 * personaje ocupa el centro y un lanzador con máscara solo recorta el fondo. La entrada
 * `any` y la `maskable` van separadas, porque `purpose: "any maskable"` en una sola haría
 * que el lanzador usara siempre la versión con máscara.
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
		background_color: "#fff8ec",
		theme_color: "#f5b83d",
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
