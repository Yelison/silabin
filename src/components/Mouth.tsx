"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MouthShape } from "@/engine";

/** Lo que dura cada forma de la boca. */
export const MOUTH_STEP_MS = 450;

const REDUCED = "(prefers-reduced-motion: reduce)";

function suscribir(aviso: () => void): () => void {
	if (typeof window.matchMedia !== "function") return () => {};
	const mq = window.matchMedia(REDUCED);
	mq.addEventListener("change", aviso);
	return () => mq.removeEventListener("change", aviso);
}

function movimientoReducido(): boolean {
	return typeof window.matchMedia === "function"
		? window.matchMedia(REDUCED).matches
		: false;
}

/** El movimiento no se puede saber en el servidor: ahí se supone que está permitido. */
function useMovimientoReducido(): boolean {
	return useSyncExternalStore(suscribir, movimientoReducido, () => false);
}

function contar(clave: string): number {
	return clave === "" ? 0 : clave.split(",").length;
}

/**
 * El interior de la boca de cada forma (D21). Es un dibujo esquemático y provisional: la
 * identidad visual llega en el Plan 6. Solo usa los tokens de `globals.css`.
 */
function Interior({ forma }: { forma: MouthShape }) {
	switch (forma) {
		case "open":
			return <ellipse cx="60" cy="45" rx="26" ry="28" className="fill-ink" />;
		case "spread":
			return (
				<>
					<rect
						x="18"
						y="37"
						width="84"
						height="16"
						rx="8"
						className="fill-ink"
					/>
					<rect x="30" y="37" width="60" height="6" className="fill-card" />
				</>
			);
		case "round":
			return <circle cx="60" cy="45" r="15" className="fill-ink" />;
		case "closed":
			return (
				<rect x="20" y="41" width="80" height="8" rx="4" className="fill-ink" />
			);
		case "teeth":
			return (
				<>
					<rect
						x="20"
						y="33"
						width="80"
						height="24"
						rx="10"
						className="fill-ink"
					/>
					<rect
						x="28"
						y="38"
						width="64"
						height="14"
						rx="3"
						className="fill-card"
					/>
				</>
			);
		case "tongue":
			return (
				<>
					<ellipse cx="60" cy="47" rx="28" ry="20" className="fill-ink" />
					<ellipse cx="60" cy="38" rx="14" ry="8" className="fill-celebrate" />
				</>
			);
	}
}

/**
 * Boca esquemática que recorre las formas de un sonido, una cada `MOUTH_STEP_MS`, y avisa con
 * `onDone` al acabar. Es decorativa: nada de lo que dice es necesario para jugar. Con movimiento
 * reducido enseña la última forma quieta, y `onDone` llega al mismo tiempo total, así que quien
 * espera a la boca avanza igual.
 */
export function Mouth(props: {
	shapes: readonly MouthShape[];
	playing: boolean;
	onDone?(): void;
}) {
	const { shapes, playing } = props;
	const reducido = useMovimientoReducido();
	const [paso, setPaso] = useState(0);
	const alTerminar = useRef(props.onDone);
	useEffect(() => {
		alTerminar.current = props.onDone;
	});
	// Los padres suelen pasar un array nuevo en cada pintado: se compara por contenido.
	const clave = shapes.join(",");
	const total = contar(clave);

	useEffect(() => {
		if (!playing) return;
		const total = contar(clave);
		setPaso(0);
		const temporizadores: ReturnType<typeof setTimeout>[] = [];
		for (let i = 1; i < total; i += 1) {
			temporizadores.push(setTimeout(() => setPaso(i), i * MOUTH_STEP_MS));
		}
		temporizadores.push(
			setTimeout(() => alTerminar.current?.(), total * MOUTH_STEP_MS),
		);
		return () => {
			for (const t of temporizadores) clearTimeout(t);
		};
	}, [playing, clave]);

	const indice = reducido ? total - 1 : Math.min(paso, total - 1);
	const forma: MouthShape = shapes[Math.max(indice, 0)] ?? "closed";
	return (
		<svg
			aria-hidden="true"
			data-shape={forma}
			viewBox="0 0 120 90"
			className="h-24 w-32"
		>
			<ellipse
				cx="60"
				cy="45"
				rx="56"
				ry="40"
				className="fill-mark stroke-mark-border"
				strokeWidth="4"
			/>
			<Interior forma={forma} />
		</svg>
	);
}
