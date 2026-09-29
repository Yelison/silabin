"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { resolveEquipped } from "@/engine";
import { useApp } from "@/features/app-context";
import { cosmeticVisual } from "@/features/rewards/visuals";

/** Ninguna partícula vive más que esto (S10). */
export const PARTICLE_LIFETIME_MS = 600;
/** Como mucho esta cantidad de partículas viva a la vez, para no acumular nodos sin límite. */
export const MAX_PARTICLES = 24;

type Particle = { id: number; x: number; y: number };

let nextParticleId = 0;

const EMOJI: Record<"star" | "circle", string> = { star: "✨", circle: "🫧" };

/**
 * El rastro de dedo del cosmético equipado (S10), montado una sola vez en `App`. Escucha
 * `pointerdown`/`pointermove` en `window` con `{capture: true, passive: true}` y nunca llama a
 * `preventDefault` ni a `stopPropagation`: el trazo, el arrastre y cualquier otro gesto de la
 * interfaz tienen que llegar exactamente igual que si esta capa no existiera. La propia capa es
 * `fixed inset-0 pointer-events-none`, así que ningún puntero real la puede tocar.
 *
 * No pinta nada con `trail:none`, con movimiento reducido del sistema o con el ajuste
 * `reducedCelebrations`: en cualquiera de los tres casos no se monta ni la capa.
 */
export function TrailLayer() {
	const rewards = useApp((s) => s.doc.rewards);
	const reducedCelebrations = useApp((s) => s.doc.settings.reducedCelebrations);
	const prefersReducedMotion = useReducedMotion();
	const equipped = resolveEquipped(rewards);
	const visual = cosmeticVisual(equipped.trail);
	const shape = visual.slot === "trail" ? visual.shape : "none";
	const [particles, setParticles] = useState<Particle[]>([]);

	const enabled =
		shape !== "none" && !prefersReducedMotion && !reducedCelebrations;

	useEffect(() => {
		if (!enabled) {
			setParticles([]);
			return;
		}
		function spawn(x: number, y: number) {
			setParticles((prev) => {
				const next = [...prev, { id: nextParticleId++, x, y }];
				return next.length > MAX_PARTICLES
					? next.slice(next.length - MAX_PARTICLES)
					: next;
			});
		}
		function onPointerDown(e: PointerEvent) {
			spawn(e.clientX, e.clientY);
		}
		function onPointerMove(e: PointerEvent) {
			spawn(e.clientX, e.clientY);
		}
		const opts: AddEventListenerOptions = { capture: true, passive: true };
		window.addEventListener("pointerdown", onPointerDown, opts);
		window.addEventListener("pointermove", onPointerMove, opts);
		return () => {
			window.removeEventListener("pointerdown", onPointerDown, opts);
			window.removeEventListener("pointermove", onPointerMove, opts);
		};
	}, [enabled]);

	if (!enabled) return null;

	const emoji = EMOJI[shape as "star" | "circle"];

	return (
		<div
			data-testid="trail-layer"
			aria-hidden="true"
			className="pointer-events-none fixed inset-0"
		>
			<AnimatePresence>
				{particles.map((p) => (
					<motion.span
						key={p.id}
						initial={{ opacity: 1, scale: 0.5 }}
						animate={{ opacity: 0, scale: 1.2 }}
						exit={{ opacity: 0 }}
						transition={{ duration: PARTICLE_LIFETIME_MS / 1000 }}
						onAnimationComplete={() =>
							setParticles((prev) => prev.filter((x) => x.id !== p.id))
						}
						style={{ position: "fixed", left: p.x, top: p.y }}
						className="text-2xl"
					>
						{emoji}
					</motion.span>
				))}
			</AnimatePresence>
		</div>
	);
}
