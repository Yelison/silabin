"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { useAudio } from "@/features/app-context";
import { Imagen, Luces } from "@/features/session/count-syllables/parts";
import type { PresentationProps } from "@/features/session/registry";

/**
 * Introducción sin error (spec §2): se ve la imagen, suena la palabra y luego otra vez marcando
 * las sílabas con una luz cada una. No hay nada que acertar.
 *
 * El botón «siguiente» aparece cuando ha terminado de sonar todo, y NO depende de `onSegment`:
 * ese aviso solo se garantiza cuando suena de verdad (no con el reproductor silencioso ni sin
 * `speechSynthesis`), así que sin él simplemente no hay luces y se avanza igual. Si el audio
 * falla, también: el sonido acompaña, no manda.
 */
export function Presentation(props: PresentationProps) {
	const { item, onDone } = props;
	const audio = useAudio();
	const [luces, setLuces] = useState(0);
	const [listo, setListo] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: la secuencia suena una vez por ítem montado
	useEffect(() => {
		let vivo = true;
		void (async () => {
			try {
				await audio.play({ key: item.audioKey });
			} catch {
				// Sin voz también se puede seguir.
			}
			if (!vivo) return;
			try {
				await audio.play({
					key: item.audioKey,
					style: "beats",
					syllables: item.syllables ?? [],
					onSegment: (i) => {
						if (vivo) setLuces((l) => Math.max(l, i + 1));
					},
				});
			} catch {
				// Ídem.
			}
			if (vivo) setListo(true);
		})();
		return () => {
			vivo = false;
			// También cubre el doble montaje del modo estricto: no suena dos veces.
			audio.stop();
		};
	}, []);

	return (
		<div className="flex flex-col items-center gap-8">
			<Imagen imageKey={item.imageKey} />
			<Luces count={luces} />
			<div className="flex h-28 items-center">
				{listo && (
					<BigButton aria-label="Siguiente" onClick={onDone}>
						➡️
					</BigButton>
				)}
			</div>
		</div>
	);
}
