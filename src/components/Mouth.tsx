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

/**
 * Los seis fotogramas, en el orden en que se apilan. `as const satisfies` y no una anotación
 * `readonly MouthShape[]`: con la anotación, `(typeof MOUTH_SHAPES)[number]` sería `MouthShape`
 * entero y la comprobación de cobertura de abajo pasaría en vacío.
 */
export const MOUTH_SHAPES = [
	"open",
	"spread",
	"round",
	"closed",
	"teeth",
	"tongue",
] as const satisfies readonly MouthShape[];

// Deja de compilar si se añade una forma a `MouthShape` y no a `MOUTH_SHAPES`.
const _cubre: Exclude<MouthShape, (typeof MOUTH_SHAPES)[number]> extends never
	? true
	: never = true;

/** El fotograma de una forma, en `public/images/arte/`. */
export function mouthFrameSrc(shape: MouthShape): string {
	return `/images/arte/mouth-${shape}.webp`;
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

/** El dibujo esquemático de una forma: el respaldo si algún fotograma no carga (V7). */
function MouthSchematic({ forma }: { forma: MouthShape }) {
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

/**
 * Boca que recorre las formas de un sonido, una cada `MOUTH_STEP_MS`, y avisa con
 * `onDone` al acabar. Apila los seis fotogramas desde el montaje y solo cambia la opacidad
 * (V12): así la primera vez que suena no hay un hueco mientras se descarga cada imagen. Es decorativa: nada de lo que dice es necesario para jugar. Con movimiento
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
	// Si algún fotograma no carga, toda la boca cae al dibujo esquemático: el paso y los
	// tiempos no cambian, solo lo que se pinta.
	const [fallida, setFallida] = useState(false);
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
	if (fallida) return <MouthSchematic forma={forma} />;
	return (
		<div aria-hidden="true" data-shape={forma} className="relative size-32">
			{MOUTH_SHAPES.map((f) => (
				// biome-ignore lint/performance/noImgElement: los WebP ya vienen a su tamaño y la PWA los precachea tal cual; el optimizador de next/image no aporta nada y necesita servidor
				<img
					key={f}
					src={mouthFrameSrc(f)}
					alt=""
					data-frame={f}
					draggable={false}
					onError={() => setFallida(true)}
					className={`absolute inset-0 size-full select-none motion-safe:transition-opacity motion-safe:duration-150 ${
						f === forma ? "opacity-100" : "opacity-0"
					}`}
				/>
			))}
		</div>
	);
}
