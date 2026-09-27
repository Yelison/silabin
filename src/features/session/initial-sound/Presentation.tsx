"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import { Picture } from "@/components/Picture";
import { curriculum, type Item, picturesStartingWith } from "@/engine";
import { useAudio } from "@/features/app-context";
import { onsetSplit } from "@/features/session/choice/hint-effects";
import type { PresentationProps } from "@/features/session/registry";

/** Cuántas imágenes se enseñan cuando el ítem es el fonema y no una imagen concreta. */
const PICTURES_PER_PHONEME = 3;

/** Las imágenes que se enseñan: la del ítem oral, o las primeras que empiezan por el fonema. */
function picturesFor(item: Item): Item[] {
	if (item.kind === "phoneme")
		return picturesStartingWith(item.phonemes[0] ?? "", PICTURES_PER_PHONEME);
	const answer =
		item.task?.answer === undefined
			? undefined
			: curriculum.items.get(item.task.answer);
	return answer === undefined ? [] : [answer];
}

/**
 * Introducción sin error (spec §2): se ve la imagen, suena el fonema y luego la palabra partida
 * en su inicio y el resto («a… vión»). Con un fonema, así con cada una de sus imágenes, una a
 * una. No hay nada que acertar.
 *
 * El botón «siguiente» aparece al terminar de sonar todo y NO depende de `onSegment` ni de que
 * algo suene: si el audio falla, se avanza igual.
 */
export function Presentation(props: PresentationProps) {
	const { item, onDone } = props;
	const audio = useAudio();
	const pictures = picturesFor(item);
	const [shown, setShown] = useState(0);
	const [ready, setReady] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: la secuencia suena una vez por ítem montado
	useEffect(() => {
		let alive = true;
		const play = async (request: Parameters<typeof audio.play>[0]) => {
			try {
				await audio.play(request);
			} catch {
				// Sin voz también se puede seguir.
			}
		};
		void (async () => {
			for (const [i, picture] of pictures.entries()) {
				if (!alive) return;
				setShown(i + 1);
				await play({ key: item.audioKey });
				if (!alive) return;
				const parts = onsetSplit(picture.syllables);
				await play(
					parts === null
						? { key: picture.audioKey }
						: { key: picture.audioKey, style: "by-syllable", syllables: parts },
				);
			}
			if (alive) setReady(true);
		})();
		return () => {
			alive = false;
			// También cubre el doble montaje del modo estricto: no suena dos veces.
			audio.stop();
		};
	}, []);

	return (
		<div className="flex flex-col items-center gap-8">
			<div className="flex min-h-40 flex-row items-center justify-center gap-6">
				{pictures.slice(0, shown).map((picture) => (
					<Picture
						key={picture.id}
						imageKey={picture.imageKey}
						size={pictures.length > 1 ? "md" : "lg"}
					/>
				))}
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
