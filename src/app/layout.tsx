import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Andika } from "next/font/google";
import { THEME_COLORS } from "@/app/theme-colors";
import "./globals.css";

// Letras de un solo piso (a, g), pensada para alfabetización: ver docs/diseno-visual.md.
const andika = Andika({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--font-andika",
});

export const metadata: Metadata = {
	title: "Silabín",
	description: "Aprende a leer con sílabas, jugando.",
	appleWebApp: {
		capable: true,
		title: "Silabín",
	},
	icons: {
		apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
	},
};

// El mismo color que `theme_color` en `src/app/manifest.ts` (`--color-action`).
export const viewport: Viewport = {
	themeColor: THEME_COLORS.action,
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="es" className={`h-full antialiased ${andika.variable}`}>
			<body className="min-h-full flex flex-col">
				{/* Desactivado en desarrollo (S11): un SW cacheando en `next dev` confundiría los
				    cambios en caliente con una app que no se actualiza. */}
				<SerwistProvider
					swUrl="/serwist/sw.js"
					// Por defecto recarga la página en cada evento `online`, también a mitad de una
					// sesión o de una importación (S11: las actualizaciones solo entran desde el inicio).
					reloadOnOnline={false}
					disable={process.env.NODE_ENV === "development"}
				>
					{children}
				</SerwistProvider>
			</body>
		</html>
	);
}
