"use client";

import { MotionConfig, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ArtImage } from "@/components/ArtImage";
import { REWARDS, type Reward } from "@/engine";
import { useApp, useAudio } from "@/features/app-context";
import { Companion } from "@/features/rewards/Companion";
import { rewardArt } from "@/features/rewards/visuals";

function etiquetaEstrellas(n: number): string {
	return n === 1 ? "1 estrella" : `${n} estrellas`;
}

/** El salto de celebración: 3 rebotes de 1 s. Solo se usa cuando no hay que reducir nada. */
const REBOTE = {
	animate: { y: [0, -18, 0, -18, 0, -18, 0] },
	transition: { duration: 3, ease: "easeInOut" as const },
};

/**
 * La celebración del final: las estrellas ganadas y, si hay, la pieza de cada logro nuevo, más el
 * compañero equipado. El nombre del logro es para el adulto y solo va en `aria-label`. Dura
 * menos de 4 s y un toque en cualquier sitio la cierra.
 *
 * Con `reducedCelebrations` (S4): estrellas y logros quietos —ni siquiera son `motion.span`, no
 * hay ninguna clase ni prop de animación que quitar—, sin partículas (la capa del rastro ya se
 * calla sola con este mismo ajuste) y solo suena `celebrate:session`, nunca `reward:new`.
 */
export function EndScreen(props: { onDone: () => void }) {
	const { onDone } = props;
	const summary = useApp((s) => s.summary);
	const clearSummary = useApp((s) => s.clearSummary);
	const reducedCelebrations = useApp((s) => s.doc.settings.reducedCelebrations);
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
		if (!reducedCelebrations && (summary?.newRewardIds.length ?? 0) > 0)
			void audio.play({ key: "reward:new" }).catch(() => {});
	}, [hayResumen]);

	if (summary === null) return null;

	const logros = summary.newRewardIds
		.map((id) => REWARDS.find((r) => r.id === id))
		.filter((r): r is Reward => r !== undefined);

	return (
		<MotionConfig reducedMotion="user">
			<button
				type="button"
				data-screen="end"
				aria-label="Continuar"
				onClick={() => {
					audio.stop();
					clearSummary();
					onDone();
				}}
				className="flex min-h-svh w-full flex-col items-center justify-center gap-10 p-6 apaisado-bajo:p-3"
			>
				{/* Una superficie opaca (V13): los ★ y los logros no se pintan sobre el fondo. */}
				<span className="flex flex-col items-center gap-10 rounded-card bg-surface p-8 apaisado-bajo:flex-row apaisado-bajo:gap-8 apaisado-bajo:p-4">
					<Companion size={160} />
					{/* En apaisado bajo, el compañero a un lado y las ★ con los logros al otro. */}
					<span className="flex flex-col items-center gap-10 apaisado-bajo:gap-4">
						{reducedCelebrations ? (
							<span
								role="img"
								aria-label={etiquetaEstrellas(summary.stars)}
								className="text-8xl text-celebrate"
							>
								{"★".repeat(summary.stars)}
							</span>
						) : (
							<motion.span
								role="img"
								aria-label={etiquetaEstrellas(summary.stars)}
								className="text-8xl text-celebrate"
								animate={REBOTE.animate}
								transition={REBOTE.transition}
							>
								{"★".repeat(summary.stars)}
							</motion.span>
						)}
						{logros.length > 0 && (
							<span className="flex flex-wrap justify-center gap-6">
								{logros.map((r) =>
									reducedCelebrations ? (
										<span
											key={r.id}
											role="img"
											data-reward={r.id}
											aria-label={r.name}
										>
											<ArtImage art={rewardArt(r.id)} size={96} />
										</span>
									) : (
										<motion.span
											key={r.id}
											role="img"
											data-reward={r.id}
											aria-label={r.name}
											animate={REBOTE.animate}
											transition={REBOTE.transition}
										>
											<ArtImage art={rewardArt(r.id)} size={96} />
										</motion.span>
									),
								)}
							</span>
						)}
					</span>
				</span>
			</button>
		</MotionConfig>
	);
}
