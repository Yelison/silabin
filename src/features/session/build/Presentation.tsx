"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import { curriculum, expectedPieces, stretchKey } from "@/engine";
import { useAudio } from "@/features/app-context";
import type { PresentationProps } from "@/features/session/registry";

/** Lo que tarda la letra en entrar desde su lado y en juntarse con la otra. */
const MOVIMIENTO = "motion-safe:transition-all motion-safe:duration-700";

// Clases completas, no armadas: Tailwind solo genera las que ve escritas en el código.
const DESDE_LA_IZQUIERDA = "motion-safe:-translate-x-32 motion-safe:opacity-0";
const DESDE_LA_DERECHA = "motion-safe:translate-x-32 motion-safe:opacity-0";

function letra(id: string) {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`No existe la letra ${id}`);
	return item;
}

/**
 * Introducción sin error (spec §2): la consonante y la vocal entran desde los lados, se juntan
 * en el centro y suenan una a una (la consonante alargada, la vocal) antes de la sílaba entera.
 * No hay nada que acertar.
 *
 * El botón «siguiente» aparece al terminar de sonar todo y NO depende de `onSegment` ni de que
 * algo suene: si el audio falla, se avanza igual. Todo el movimiento va con `motion-safe:`; sin
 * él, las letras se ven ya en su sitio.
 */
export function Presentation(props: PresentationProps) {
	const { exercise, item, onDone } = props;
	const audio = useAudio();
	const [consonante, vocal] = expectedPieces(exercise, curriculum, item).map(
		letra,
	);
	const [entradas, setEntradas] = useState(false);
	const [juntas, setJuntas] = useState(false);
	const [listo, setListo] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: la secuencia suena una vez por ítem montado
	useEffect(() => {
		let vivo = true;
		const sonar = async (key: string) => {
			try {
				await audio.play({ key });
			} catch {
				// Sin voz también se puede seguir.
			}
		};
		// Un instante con las letras fuera, para que la entrada se vea.
		const entrada = setTimeout(() => {
			if (vivo) setEntradas(true);
		}, 50);
		void (async () => {
			if (consonante === undefined || vocal === undefined) return;
			await sonar(stretchKey(consonante.id));
			if (!vivo) return;
			await sonar(vocal.audioKey);
			if (!vivo) return;
			setJuntas(true);
			await sonar(item.audioKey);
			if (vivo) setListo(true);
		})();
		return () => {
			vivo = false;
			clearTimeout(entrada);
			// También cubre el doble montaje del modo estricto: no suena dos veces.
			audio.stop();
		};
	}, []);

	return (
		<div className="flex flex-col items-center gap-8">
			<div
				data-joined={juntas}
				className={`flex min-h-40 items-center justify-center font-reading text-9xl leading-none text-ink ${MOVIMIENTO} ${juntas ? "gap-0" : "gap-12"}`}
			>
				<span
					data-part="consonante"
					className={`${MOVIMIENTO} ${entradas ? "" : DESDE_LA_IZQUIERDA}`}
				>
					{consonante?.display?.lower ?? consonante?.text}
				</span>
				<span
					data-part="vocal"
					className={`${MOVIMIENTO} ${entradas ? "" : DESDE_LA_DERECHA}`}
				>
					{vocal?.display?.lower ?? vocal?.text}
				</span>
			</div>
			<div className="flex h-28 items-center">
				{listo && (
					<BigButton aria-label="Siguiente" onClick={onDone}>
						<Icon name="next" />
					</BigButton>
				)}
			</div>
		</div>
	);
}
