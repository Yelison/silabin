"use client";

import type { CSSProperties } from "react";

type Props = {
	state: "idle" | "countdown" | "listening";
	/** Energía del micrófono, de 0 a 1. Solo mueve la onda con movimiento permitido. */
	level: number;
	disabled: boolean;
	onPress(): void;
};

const PUNTOS = [0, 1, 2];
/** Lo que tarda en encenderse cada punto: 3 puntos en `COUNTDOWN_MS` (900). */
const RETRASO_PUNTO_MS = 300;

function Microfono() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			width="48"
			height="48"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
			<path d="M5 11a7 7 0 0 0 14 0" />
			<path d="M12 18v3" />
		</svg>
	);
}

/**
 * El micrófono del niño: pinta su estado y avisa del toque, sin decidir nada. Mide al menos
 * 96 px. En `countdown` enciende tres puntos; en `listening` lleva un anillo fijo (que basta
 * con movimiento reducido) y, solo con movimiento permitido, una onda que sigue a `level`.
 * El nombre accesible es para el adulto y los lectores de pantalla.
 */
export function MicButton(props: Props) {
	const { state, disabled, onPress } = props;
	const nivel = Math.min(1, Math.max(0, props.level));
	const activo = state !== "idle";
	return (
		<button
			type="button"
			aria-label="Micrófono"
			aria-disabled={disabled}
			data-state={state}
			onClick={() => {
				if (disabled) return;
				onPress();
			}}
			className={`relative flex min-h-24 min-w-24 items-center justify-center rounded-full p-4 text-action-ink shadow-md active:scale-95 ${activo ? "bg-mark" : "bg-action"} ${disabled ? "opacity-30" : ""}`}
		>
			{state === "listening" && (
				<>
					<span
						data-wave
						aria-hidden="true"
						style={{ "--nivel": nivel } as CSSProperties}
						className="pointer-events-none absolute inset-0 hidden rounded-full bg-calm motion-safe:block motion-safe:scale-[calc(1_+_var(--nivel)_*_0.35)] motion-safe:transition-transform motion-safe:duration-100"
					/>
					<span
						data-ring
						aria-hidden="true"
						className="pointer-events-none absolute -inset-1 rounded-full border-4 border-calm-border"
					/>
				</>
			)}
			<span className="relative flex items-center justify-center">
				{state === "countdown" ? (
					<span className="flex items-center gap-2">
						{PUNTOS.map((i) => (
							<span
								key={i}
								data-dot
								aria-hidden="true"
								style={{ animationDelay: `${i * RETRASO_PUNTO_MS}ms` }}
								className="h-4 w-4 rounded-full bg-action-ink motion-safe:animate-pulse"
							/>
						))}
					</span>
				) : (
					<Microfono />
				)}
			</span>
		</button>
	);
}
