"use client";

import { useEffect, useMemo, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import { Mouth } from "@/components/Mouth";
import { ReplayButton } from "@/components/ReplayButton";
import { useAudio } from "@/features/app-context";
import { Written } from "@/features/session/listen-tap/Written";
import type { PresentationProps } from "@/features/session/registry";
import { playCapped } from "@/features/session/voice/hint-audio";
import { safeMouthShapes } from "@/features/session/voice/safe-mouth";

/** Pausa entre las dos veces que suena el ítem. */
const PAUSE_MS = 900;

/**
 * Introducción sin error (spec §2): el objetivo, grande, con la boca articulándolo mientras
 * suena, dos veces con una pausa (P15, D21). No hay nada que acertar.
 *
 * «Siguiente» aparece al terminar de sonar todo, pero cada espera de audio tiene tope
 * (`playCapped`): si el audio falla o no acaba, se avanza igual.
 */
export function Presentation(props: PresentationProps) {
	const { item, onDone } = props;
	const audio = useAudio();
	const [ready, setReady] = useState(false);
	// Cada vuelta remonta la boca para que empiece por su primera forma a la vez que el audio.
	const [vuelta, setVuelta] = useState(0);
	const shapes = useMemo(() => safeMouthShapes(item), [item]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: la secuencia suena una vez por ítem montado
	useEffect(() => {
		let alive = true;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const pause = () =>
			new Promise<void>((resolve) => {
				timer = setTimeout(resolve, PAUSE_MS);
			});
		void (async () => {
			await playCapped(audio, { key: item.audioKey });
			if (!alive) return;
			await pause();
			if (!alive) return;
			setVuelta(1);
			await playCapped(audio, { key: item.audioKey });
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
		<div className="flex flex-col items-center gap-6">
			<div className="flex min-h-40 items-center justify-center font-reading">
				<Written item={item} size="lg" />
			</div>
			{shapes !== null && <Mouth key={vuelta} shapes={shapes} playing />}
			<div className="flex h-28 items-center gap-6">
				<ReplayButton
					aria-label="Oír otra vez"
					disabled={!ready}
					onReplay={() => {
						setVuelta((v) => v + 1);
						void playCapped(audio, { key: item.audioKey });
					}}
				/>
				{ready && (
					<BigButton aria-label="Siguiente" onClick={onDone}>
						<Icon name="next" />
					</BigButton>
				)}
			</div>
		</div>
	);
}
