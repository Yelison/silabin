"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import { useAudio } from "@/features/app-context";
import { Written } from "@/features/session/listen-tap/Written";
import type { PresentationProps } from "@/features/session/registry";

/** Pausa entre las dos veces que suena el ítem. */
const PAUSE_MS = 900;

/**
 * Introducción sin error (spec §2): el ítem, grande, suena dos veces con una pausa. No hay nada
 * que acertar.
 *
 * El botón «siguiente» aparece al terminar de sonar todo y NO depende de `onSegment` ni de que
 * algo suene: si el audio falla, se avanza igual.
 */
export function Presentation(props: PresentationProps) {
	const { item, onDone } = props;
	const audio = useAudio();
	const [ready, setReady] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: la secuencia suena una vez por ítem montado
	useEffect(() => {
		let alive = true;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const play = async () => {
			try {
				await audio.play({ key: item.audioKey });
			} catch {
				// Sin voz también se puede seguir.
			}
		};
		const pause = () =>
			new Promise<void>((resolve) => {
				timer = setTimeout(resolve, PAUSE_MS);
			});
		void (async () => {
			await play();
			if (!alive) return;
			await pause();
			if (!alive) return;
			await play();
			if (alive) setReady(true);
		})();
		return () => {
			alive = false;
			clearTimeout(timer);
			// También cubre el doble montaje del modo estricto: no suena dos veces.
			audio.stop();
		};
	}, []);

	return (
		<div className="flex flex-col items-center gap-8">
			<div className="flex min-h-40 items-center justify-center">
				<Written item={item} size="lg" />
			</div>
			<div className="flex h-28 items-center">
				{ready && (
					<BigButton aria-label="Siguiente" onClick={onDone}>
						<Icon name="next" />
					</BigButton>
				)}
			</div>
		</div>
	);
}
