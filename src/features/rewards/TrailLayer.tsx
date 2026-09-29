"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArtImage } from "@/components/ArtImage";
import { resolveEquipped } from "@/engine";
import { useApp } from "@/features/app-context";
import { cosmeticVisual } from "@/features/rewards/visuals";

/** Ninguna partícula vive más que esto (S10). */
export const PARTICLE_LIFETIME_MS = 600;
/** Como mucho esta cantidad de partículas viva a la vez, para no acumular nodos sin límite. */
export const MAX_PARTICLES = 24;

type Particle = { id: number; x: number; y: number };

const PUNTERO_FINO = "(pointer: fine)";

function suscribirPuntero(aviso: () => void): () => void {
	if (typeof window.matchMedia !== "function") return () => {};
	const mq = window.matchMedia(PUNTERO_FINO);
	mq.addEventListener("change", aviso);
	return () => mq.removeEventListener("change", aviso);
}

function hayPunteroFino(): boolean {
	return typeof window.matchMedia === "function"
		? window.matchMedia(PUNTERO_FINO).matches
		: false;
}

/**
 * El cursor de PC del rastro equipado (V11). Es estático, así que no depende del movimiento
 * reducido ni de `reducedCelebrations`; sí de que haya un puntero fino (ratón), porque en un
 * dedo no hay cursor que cambiar. Va en `<html>` como un atributo y una propiedad CSS (la regla
 * está en `globals.css`) y no como `style.cursor`: así los elementos con cursor propio, como
 * los enlaces, lo conservan.
 */
function useCursorDeRastro(id: string, cursor: string | null): void {
	const fino = useSyncExternalStore(
		suscribirPuntero,
		hayPunteroFino,
		() => false,
	);
	useEffect(() => {
		if (cursor === null || !fino) return;
		const raiz = document.documentElement;
		raiz.setAttribute("data-trail-cursor", id);
		raiz.style.setProperty("--trail-cursor", `url("${cursor}") 16 16`);
		return () => {
			raiz.removeAttribute("data-trail-cursor");
			raiz.style.removeProperty("--trail-cursor");
		};
	}, [id, cursor, fino]);
}

let nextParticleId = 0;

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
	const particle = visual.slot === "trail" ? visual.particle : null;
	const cursor = visual.slot === "trail" ? visual.cursor : null;
	useCursorDeRastro(equipped.trail, cursor);
	const [particles, setParticles] = useState<Particle[]>([]);

	const enabled =
		particle !== null && !prefersReducedMotion && !reducedCelebrations;

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

	if (!enabled || particle === null) return null;

	return (
		<div
			data-testid="trail-layer"
			aria-hidden="true"
			className="pointer-events-none fixed inset-0"
		>
			{/*
			 * Sin `exit`: una partícula recortada por MAX_PARTICLES desaparece del DOM en el mismo
			 * render en que sale del estado, en vez de quedar montada animándose hacia fuera. Con
			 * `exit`, `AnimatePresence` retiene cada nodo saliente sus propios 600 ms, así que bajo
			 * eventos separados (no en un único lote de estado) el tope de 24 en el estado no se
			 * traducía en un tope de 24 nodos reales en el DOM.
			 */}
			<AnimatePresence>
				{particles.map((p) => (
					<motion.span
						key={p.id}
						initial={{ opacity: 1, scale: 0.5 }}
						animate={{ opacity: 0, scale: 1.2 }}
						transition={{ duration: PARTICLE_LIFETIME_MS / 1000 }}
						onAnimationComplete={() =>
							setParticles((prev) => prev.filter((x) => x.id !== p.id))
						}
						style={{ position: "fixed", left: p.x, top: p.y }}
					>
						<ArtImage art={particle} size={28} className="block" />
					</motion.span>
				))}
			</AnimatePresence>
		</div>
	);
}
