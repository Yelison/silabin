"use client";

import { useEffect, useRef } from "react";
import { REWARDS, type Reward, type RewardKind } from "@/engine";
import { useApp, useAudio } from "@/features/app-context";

const ICONO: Record<RewardKind, string> = {
	badge: "🏅",
	background: "🌄",
	companion: "🐣",
	trail: "✨",
	sticker: "🌟",
	trophy: "🏆",
};

function etiquetaEstrellas(n: number): string {
	return n === 1 ? "1 estrella" : `${n} estrellas`;
}

/**
 * La celebración del final: las estrellas ganadas y, si hay, un icono por logro nuevo. El
 * nombre del logro es para el adulto y solo va en `aria-label`. Dura menos de 4 s (3 saltos de
 * 1 s, y solo si el sistema no pide reducir el movimiento) y un toque en cualquier sitio
 * la cierra.
 */
export function EndScreen(props: { onDone: () => void }) {
	const { onDone } = props;
	const summary = useApp((s) => s.summary);
	const clearSummary = useApp((s) => s.clearSummary);
	const audio = useAudio();
	const sonado = useRef(false);
	// Un resumen que se limpia con el toque no es un resumen que faltara: solo se sale sola
	// si la pantalla se abrió sin ninguno.
	const tuvoResumen = useRef(false);
	const hayResumen = summary !== null;

	// biome-ignore lint/correctness/useExhaustiveDependencies: suena una vez al mostrarse; onDone y el audio no cambian el momento
	useEffect(() => {
		if (!hayResumen) {
			// Sin resumen no hay nada que celebrar.
			if (!tuvoResumen.current) onDone();
			return;
		}
		tuvoResumen.current = true;
		if (sonado.current) return;
		sonado.current = true;
		void audio.play({ key: "celebrate:session" }).catch(() => {});
		if ((summary?.newRewardIds.length ?? 0) > 0)
			void audio.play({ key: "reward:new" }).catch(() => {});
	}, [hayResumen]);

	if (summary === null) return null;

	const logros = summary.newRewardIds
		.map((id) => REWARDS.find((r) => r.id === id))
		.filter((r): r is Reward => r !== undefined);

	return (
		<button
			type="button"
			data-screen="end"
			aria-label="Continuar"
			onClick={() => {
				audio.stop();
				clearSummary();
				onDone();
			}}
			className="flex min-h-screen w-full flex-col items-center justify-center gap-10 p-6"
		>
			<span
				role="img"
				aria-label={etiquetaEstrellas(summary.stars)}
				className="text-8xl text-yellow-500 motion-safe:animate-[bounce_1s_ease-in-out_3]"
			>
				{"★".repeat(summary.stars)}
			</span>
			{logros.length > 0 && (
				<span className="flex gap-6">
					{logros.map((r) => (
						<span
							key={r.id}
							role="img"
							data-reward={r.id}
							aria-label={r.name}
							className="text-7xl motion-safe:animate-[bounce_1s_ease-in-out_3]"
						>
							{ICONO[r.kind]}
						</span>
					))}
				</span>
			)}
		</button>
	);
}
