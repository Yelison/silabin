"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { Picture } from "@/components/Picture";
import { curriculum, endingKey } from "@/engine";
import { useAudio } from "@/features/app-context";
import type { PresentationProps } from "@/features/session/registry";

/**
 * Introducción sin error (spec §2): las dos imágenes lado a lado, suena cada palabra y luego el
 * final que comparten, con las dos tarjetas pulsando juntas. No hay nada que acertar.
 *
 * El botón «siguiente» aparece al terminar de sonar todo y NO depende de `onSegment` ni de que
 * algo suene: si el audio falla, se avanza igual.
 */
export function Presentation(props: PresentationProps) {
	const { item, onDone } = props;
	const audio = useAudio();
	const [together, setTogether] = useState(false);
	const [ready, setReady] = useState(false);
	const rhyme =
		item.task?.answer === undefined
			? undefined
			: curriculum.items.get(item.task.answer);

	// biome-ignore lint/correctness/useExhaustiveDependencies: la secuencia suena una vez por ítem montado
	useEffect(() => {
		let alive = true;
		const play = async (key: string) => {
			try {
				await audio.play({ key });
			} catch {
				// Sin voz también se puede seguir.
			}
		};
		void (async () => {
			await play(item.audioKey);
			if (!alive) return;
			if (rhyme !== undefined) await play(rhyme.audioKey);
			if (!alive) return;
			setTogether(true);
			await play(endingKey(`picture:${item.text}`));
			if (!alive) return;
			setTogether(false);
			setReady(true);
		})();
		return () => {
			alive = false;
			// También cubre el doble montaje del modo estricto: no suena dos veces.
			audio.stop();
		};
	}, []);

	const card = `flex min-h-target min-w-target items-center justify-center rounded-card border-2 border-calm-border bg-calm p-4 ${together ? "motion-safe:animate-pulse" : ""}`;

	return (
		<div className="flex flex-col items-center gap-8">
			<div className="flex flex-row items-center justify-center gap-6">
				<div data-card className={card}>
					<Picture imageKey={item.imageKey} size="md" />
				</div>
				{rhyme !== undefined && (
					<div data-card className={card}>
						<Picture imageKey={rhyme.imageKey} size="md" />
					</div>
				)}
			</div>
			<div className="flex h-28 items-center">
				{ready && (
					<BigButton aria-label="Siguiente" onClick={onDone}>
						➡️
					</BigButton>
				)}
			</div>
		</div>
	);
}
