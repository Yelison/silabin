"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import { type TraceAnimation, TraceCanvas } from "@/components/TraceCanvas";
import { glyphFor, type TraceStroke } from "@/engine";
import { useAudio } from "@/features/app-context";
import { Written } from "@/features/session/listen-tap/Written";
import type { PresentationProps } from "@/features/session/registry";

/**
 * Introducción sin error de `trace` (spec §2, D12): la mayúscula se dibuja sola en nivel 1
 * antes de pedir que se trace. El par a/A va siempre visible, como en las demás presentaciones.
 * `glyphFor` solo tiene mayúsculas por ahora (D16).
 *
 * El botón «Siguiente» aparece cuando el lienzo avisa de que acabó su animación
 * (`onAnimationEnd`, por el temporizador de `animationMs` en `TraceCanvas`), nunca cuando
 * termina el audio: si no hay voz se sigue jugando igual.
 *
 * El niño puede repasar la letra mientras tanto: se pinta su tinta (`disabled={false}`, sin
 * bloquear durante la animación, a diferencia de la evaluación), pero no se puntúa ni se manda
 * a ningún sitio — eso es solo de `trace/Evaluation.tsx`.
 */
export function Presentation(props: PresentationProps) {
	const { item, onDone } = props;
	const audio = useAudio();
	const glyph = glyphFor(item, "upper");

	const [ready, setReady] = useState(false);
	const [animation, setAnimation] = useState<TraceAnimation>("full");
	const [ink, setInk] = useState<readonly TraceStroke[]>([]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: el sonido va una vez por ítem montado
	useEffect(() => {
		void audio.play({ key: item.audioKey }).catch(() => {
			// Sin voz también se puede seguir.
		});
		return () => {
			// También cubre el doble montaje del modo estricto: la primera pasada se corta
			// antes de sonar y solo queda la segunda.
			audio.stop();
		};
	}, []);

	return (
		/*
		 * Global Constraint literal (plan): la letra ocupa ≥60 % del lado corto del área del
		 * ejercicio, sin scroll en 360×640 vertical ni en 1024×768 apaisado. Apilar los tres
		 * bloques (par, lienzo, botón) en vertical deja 528 px bajo el encabezado y el relleno
		 * de `SessionScreen` (640 − 80 − 32); el par por su propia fuente
		 * (`h-[min(8rem,26vw)]` = 93.6 a 360 de ancho) y el hueco del botón ajustado a su alto
		 * real (`h-24` = 96, sin sobrante de `h-28`) con `gap-2` (16 en total) dejan 205.6 fijos,
		 * así que al lienzo le caben 322.4 (50vh = 320, 2.4 de margen). Con `letter:a`
		 * (vb 1.2×1.4): escala = min(295.2/1.2, 320/1.4) = 228.6 → 63.5 % de 360 (69.7 % del
		 * área, 328 tras el relleno). En apaisado, apilar no cabe ni de lejos (el alto disponible
		 * es 656 y el lienzo solo por sí necesitaría 645 para el mismo 60 %): por eso aquí los
		 * tres van en fila (`landscape:flex-row`), como el botón de `trace/Evaluation.tsx`, y el
		 * lienzo puede ocupar casi todo el alto sin competir por él. `landscape:h-[85vh]`
		 * (652.8) dentro de 656 (3.2 de margen, igual que en `Evaluation.tsx`) con
		 * `landscape:w-[55vw]` (563.2, con margen de sobra para el par y el botón en la misma
		 * fila): escala = min(563.2/1.2, 652.8/1.4) = 466.3 → 60.7 % de 768. Sin verificación en
		 * navegador real (sin `chromium-cli` ni Playwright en esta caja, ver el informe de la
		 * Tarea 4): son las mismas cuentas con la fórmula exacta del lienzo, no una medida.
		 */
		<div className="flex flex-col items-center gap-2 landscape:flex-row landscape:gap-4">
			<div className="flex h-[min(8rem,26vw)] items-center justify-center font-reading">
				<Written item={item} size="lg" />
			</div>
			<div className="flex h-[50vh] w-[82vw] items-center justify-center landscape:h-[85vh] landscape:w-[55vw]">
				<TraceCanvas
					glyph={glyph}
					level={1}
					strokes={ink}
					animation={animation}
					disabled={false}
					onStrokeStart={() => {}}
					onStrokeEnd={(stroke) => setInk((prev) => [...prev, stroke])}
					onAnimationEnd={() => {
						// La letra dibujada se apaga al acabar: si se quedara en "full" taparía
						// exactamente la tinta del niño donde su repaso coincide con el trazo.
						setAnimation("none");
						setReady(true);
					}}
				/>
			</div>
			<div className="flex h-24 items-center">
				{ready && (
					<BigButton aria-label="Siguiente" onClick={onDone}>
						<Icon name="next" />
					</BigButton>
				)}
			</div>
		</div>
	);
}
