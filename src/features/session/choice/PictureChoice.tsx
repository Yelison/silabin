"use client";

import { Picture } from "@/components/Picture";
import { ReplayButton } from "@/components/ReplayButton";
import { curriculum, expectedAnswer } from "@/engine";
import { useAudio } from "@/features/app-context";
import { ChoiceEvaluation } from "@/features/session/choice/ChoiceEvaluation";
import { choiceEffect } from "@/features/session/choice/hint-effects";
import type { EvaluationProps } from "@/features/session/registry";

/**
 * Elegir entre imágenes, con un altavoz que repite el audio del ítem. Lo comparten `rhyme` (con
 * la imagen del objetivo arriba) e `initial-sound` (solo el fonema). No decide la respuesta ni
 * las pistas: las opciones y la respuesta esperada vienen del motor.
 */
export function PictureChoice(
	props: EvaluationProps & { showTarget: boolean },
) {
	const { showTarget, ...rest } = props;
	const { exercise, item, locked } = rest;
	const audio = useAudio();
	const expected = expectedAnswer(exercise, item);

	const options = exercise.optionIds.map((id) => {
		const picture = curriculum.items.get(id);
		return {
			id,
			label: picture?.text ?? id,
			content: <Picture imageKey={picture?.imageKey} size="md" />,
		};
	});

	return (
		<div className="flex flex-col items-center gap-6">
			{showTarget && <Picture imageKey={item.imageKey} />}
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
				{...rest}
				options={options}
				effectFor={(action) =>
					expected === null
						? { kind: "none" }
						: choiceEffect({
								action,
								exercise,
								item,
								optionIds: exercise.optionIds,
								expected,
								lookup: (id) => curriculum.items.get(id),
							})
				}
			/>
		</div>
	);
}
