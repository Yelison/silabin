import type { MetadataRoute } from "next";

/**
 * Manifiesto de la PWA. Los colores son los de `surface` y `action`
 * (ver `src/app/globals.css`, sección `@theme inline`).
 *
 * Los iconos son provisionales (S13): una «S» provisional, sin
 * margen de seguridad, así que no llevan `purpose: "any maskable"` (recortarían la letra en
 * un lanzador que aplique máscara). El Plan 7 los sustituye por la identidad visual final.
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
		],
	};
}
