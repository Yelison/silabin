"use client";

import type { ReactNode } from "react";
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
	const equipped = resolveEquipped(rewards);
	const visual = cosmeticVisual(equipped.background);
	const gradient =
		visual.slot === "background" ? visual.gradient : "from-surface to-calm";

	return (
		<div
			data-cosmetic-background={equipped.background}
			className={`min-h-screen bg-gradient-to-b ${gradient}`}
		>
			{props.children}
		</div>
	);
}
