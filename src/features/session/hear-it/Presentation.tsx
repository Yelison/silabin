"use client";

import { useEffect, useRef, useState } from "react";
import { OptionCard } from "@/components/OptionCard";
import { Picture } from "@/components/Picture";
import { expectedAnswer, stretchInKey } from "@/engine";
import { useAudio } from "@/features/app-context";
import { HEAR_OPTIONS } from "@/features/session/hear-it/parts";
import type { PresentationProps } from "@/features/session/registry";

/**
 * Introducción sin error (spec §2): suena la pregunta, luego qué hace cada botón («sí» y «no»,
 * cada uno pulsando mientras suena el suyo), después la palabra (alargada si el sonido está) y
 * se marca el botón correcto. Nada que acertar: los botones no responden hasta que se marca el
 * correcto, y tocarlo termina.
 *
 * El botón correcto se marca al terminar de sonar todo y NO depende de `onSegment` ni de que
 * algo suene: si el audio falla, se avanza igual.
 */
export function Presentation(props: PresentationProps) {
	const { exercise, item, onDone } = props;
	const audio = useAudio();
	const expected = expectedAnswer(exercise, item);
	const [pulsing, setPulsing] = useState<string | null>(null);
	const [ready, setReady] = useState(false);
	const done = useRef(false);

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
			setPulsing("si");
			await play("ui:hear-yes");
			if (!alive) return;
			setPulsing("no");
			await play("ui:hear-no");
			if (!alive) return;
			setPulsing(null);
			await play(
				expected === "si" ? stretchInKey(item.id) : `word:${item.text}`,
			);
			if (alive) setReady(true);
		})();
		return () => {
			alive = false;
			// También cubre el doble montaje del modo estricto: no suena dos veces.
			audio.stop();
		};
	}, []);

	function select(id: string) {
		if (!ready || done.current) return;
		if (expected !== null && id !== expected) return;
		done.current = true;
		onDone();
	}

	return (
		<div className="flex flex-col items-center gap-8">
			<Picture imageKey={item.imageKey} />
			<div className="flex flex-row items-center justify-center gap-6">
				{HEAR_OPTIONS.map((option) => (
					<OptionCard
						key={option.id}
						state={
							ready && option.id === expected
								? "marked"
								: pulsing === option.id
									? "pulsing"
									: "idle"
						}
						disabled={!ready || (expected !== null && option.id !== expected)}
						aria-label={option.label}
						onSelect={() => select(option.id)}
					>
						{option.content}
					</OptionCard>
				))}
			</div>
		</div>
	);
}
