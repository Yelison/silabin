import type { Metadata } from "next";
import { Andika } from "next/font/google";
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
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="es" className={`h-full antialiased ${andika.variable}`}>
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	);
}
