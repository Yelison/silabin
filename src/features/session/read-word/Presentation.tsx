"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import { Picture } from "@/components/Picture";
import { ReplayButton } from "@/components/ReplayButton";
import { useAudio } from "@/features/app-context";
import { Palabra } from "@/features/session/read-word/Palabra";
import type { PresentationProps } from "@/features/session/registry";
import { playCapped } from "@/features/session/voice/hint-audio";

/**
 * Introducción sin error (spec §2): la palabra con sus sílabas separadas, su imagen a la vista y
 * la palabra sonando. No hay nada que acertar; en la evaluación la imagen estará tapada.
 *
 * «Siguiente» aparece al terminar de sonar, pero la espera tiene tope (`playCapped`): si el
 * audio falla o no acaba, se avanza igual.
 */
export function Presentation(props: PresentationProps) {
	const { item, onDone } = props;
	const audio = useAudio();
	const [ready, setReady] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: suena una vez por ítem montado
	useEffect(() => {
		let alive = true;
		void playCapped(audio, { key: item.audioKey }).then(() => {
			if (alive) setReady(true);
		});
		return () => {
			alive = false;
			// También cubre el doble montaje del modo estricto: no suena dos veces.
			audio.stop();
		};
	}, []);

	return (
		<div className="flex flex-col items-center gap-6">
			<div className="flex min-h-32 items-center justify-center font-reading">
				<Palabra item={item} separada />
			</div>
			<Picture imageKey={item.imageKey} />
			<div className="flex h-28 items-center gap-6">
				<ReplayButton
					aria-label="Oír otra vez"
					disabled={!ready}
					onReplay={() => {
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
