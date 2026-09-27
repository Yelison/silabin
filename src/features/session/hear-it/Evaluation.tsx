"use client";

import { Picture } from "@/components/Picture";
import { ReplayButton } from "@/components/ReplayButton";
import { curriculum, expectedAnswer } from "@/engine";
import { useAudio } from "@/features/app-context";
import { ChoiceEvaluation } from "@/features/session/choice/ChoiceEvaluation";
import { choiceEffect } from "@/features/session/choice/hint-effects";
import { HEAR_OPTIONS } from "@/features/session/hear-it/parts";
import type { EvaluationProps } from "@/features/session/registry";

/**
 * «¿Oyes el sonido en la palabra?»: la imagen, un altavoz con la pregunta y dos botones, «sí» y
 * «no». La respuesta y las pistas las decide el motor; aquí solo se pinta y se toca.
 */
export function Evaluation(props: EvaluationProps) {
	const { exercise, item, locked } = props;
	const audio = useAudio();
	const expected = expectedAnswer(exercise, item);

	return (
		<div className="flex flex-col items-center gap-6">
			<Picture imageKey={item.imageKey} />
			<ReplayButton
				aria-label="Oír otra vez"
				disabled={locked}
				onReplay={() => {
					audio.play({ key: item.audioKey }).catch(() => {
						// Sin voz también se puede jugar.
					});
				}}
			/>
			<ChoiceEvaluation
				{...props}
				options={HEAR_OPTIONS}
				effectFor={(action) =>
					expected === null
						? { kind: "none" }
						: choiceEffect({
								action,
								exercise,
								item,
								optionIds: HEAR_OPTIONS.map((o) => o.id),
								expected,
								lookup: (id) => curriculum.items.get(id),
							})
				}
			/>
		</div>
	);
}
