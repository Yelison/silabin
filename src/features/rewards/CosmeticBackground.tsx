"use client";

import { type ReactNode, useState } from "react";
import { resolveEquipped } from "@/engine";
import { useApp } from "@/features/app-context";
import { cosmeticVisual } from "@/features/rewards/visuals";

/**
 * Envuelve una pantalla con el fondo equipado (S19): el mapa, la galería y el fin de sesión.
 * Nunca envuelve `SessionScreen` (D..): un fondo decorativo no debe competir por atención con
 * un ejercicio. `resolveEquipped` ya garantiza un id válido y desbloqueado, así que aquí solo se
 * pinta lo que devuelve, sin comprobar nada más.
 */
export function CosmeticBackground(props: { children: ReactNode }) {
	const rewards = useApp((s) => s.doc.rewards);
	const [fallida, setFallida] = useState<string | null>(null);
	const equipped = resolveEquipped(rewards);
	const visual = cosmeticVisual(equipped.background);
	const fondo =
		visual.slot === "background"
			? visual
			: { src: "", gradient: "from-surface to-calm" };

	return (
		<div
			data-cosmetic-background={equipped.background}
			className={`relative isolate min-h-screen bg-gradient-to-b ${fondo.gradient}`}
		>
			{fondo.src !== "" && fallida !== fondo.src && (
				// biome-ignore lint/performance/noImgElement: el WebP ya viene a su tamaño y la PWA lo precachea tal cual; el optimizador de next/image no aporta nada y necesita servidor
				<img
					src={fondo.src}
					alt=""
					aria-hidden="true"
					draggable={false}
					onError={() => setFallida(fondo.src)}
					className="pointer-events-none fixed inset-0 -z-10 h-full w-full select-none object-cover"
				/>
			)}
			{props.children}
		</div>
	);
}
