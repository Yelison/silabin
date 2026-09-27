"use client";

import { ReplayButton } from "@/components/ReplayButton";
import { curriculum, expectedAnswer } from "@/engine";
import { useAudio } from "@/features/app-context";
import { ChoiceEvaluation } from "@/features/session/choice/ChoiceEvaluation";
import { choiceEffect } from "@/features/session/choice/hint-effects";
import { Written } from "@/features/session/listen-tap/Written";
import type { EvaluationProps } from "@/features/session/registry";

/**
 * «Escucha y toca la que suena»: un altavoz con el audio del ítem y de 2 a 3 opciones escritas.
 * La respuesta y las pistas las decide el motor; aquí solo se pinta y se toca.
 */
export function Evaluation(props: EvaluationProps) {
	const { exercise, item, locked } = props;
	const audio = useAudio();
	const expected = expectedAnswer(exercise, item);

	const options = exercise.optionIds.flatMap((id) => {
		const option = curriculum.items.get(id);
		return option === undefined
			? []
			: [
					{
						id,
						label: option.text,
						content: <Written item={option} size="md" />,
					},
				];
	});

	return (
		<div className="flex flex-col items-center gap-6">
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
