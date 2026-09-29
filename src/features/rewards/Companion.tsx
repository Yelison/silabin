"use client";

import { resolveEquipped, wearsCap } from "@/engine";
import { useApp } from "@/features/app-context";
import { cosmeticVisual } from "@/features/rewards/visuals";

/**
 * El compañero equipado, en el mapa y en el fin de sesión. Lleva la gorra de `ten-sessions` si
 * está ganada (S5: la gorra no tiene ranura propia, la lleva el compañero directamente).
 */
export function Companion(props: { className?: string }) {
	const { className = "" } = props;
	const rewards = useApp((s) => s.doc.rewards);
	const equipped = resolveEquipped(rewards);
	const visual = cosmeticVisual(equipped.companion);
	const emoji = visual.slot === "companion" ? visual.emoji : "🐣";
	const cap = wearsCap(rewards.unlockedAt);

	return (
		<span
			role="img"
			aria-label="Tu compañero"
			data-companion={equipped.companion}
			data-wears-cap={cap}
			className={`relative inline-flex items-center justify-center text-6xl ${className}`}
		>
			{emoji}
			{cap && (
				<span aria-hidden="true" className="absolute -top-3 -right-1 text-3xl">
					🧢
				</span>
			)}
		</span>
	);
}
