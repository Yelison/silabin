"use client";

import { ArtImage } from "@/components/ArtImage";
import { resolveEquipped, wearsCap } from "@/engine";
import { useApp } from "@/features/app-context";
import { cosmeticVisual } from "@/features/rewards/visuals";

/**
 * El compañero equipado, en el mapa y en el fin de sesión. Lleva la gorra de `ten-sessions` si
 * está ganada (S5: la gorra no tiene ranura propia, la lleva el compañero directamente): hay una
 * imagen con gorra por compañero, no una gorra superpuesta. `size` es el ancho y alto en px.
 */
export function Companion(props: { className?: string; size?: number }) {
	const { className = "", size = 112 } = props;
	const rewards = useApp((s) => s.doc.rewards);
	const equipped = resolveEquipped(rewards);
	const visual = cosmeticVisual(equipped.companion);
	const cosmetic = visual.slot === "companion" ? visual : null;
	const cap = wearsCap(rewards.unlockedAt);
	const art =
		cosmetic === null
			? { src: "", emoji: "🐣" }
			: cap
				? cosmetic.withCap
				: cosmetic.art;

	return (
		<span
			role="img"
			aria-label="Tu compañero"
			data-companion={equipped.companion}
			data-wears-cap={cap}
			className={`inline-flex items-center justify-center ${className}`}
		>
			<ArtImage art={art} size={size} />
		</span>
	);
}
