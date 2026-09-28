"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import {
	animationMs,
	type TraceAnimation,
	TraceCanvas,
} from "@/components/TraceCanvas";
import { glyphFor, type TraceStroke } from "@/engine";
import { useApp, useAudio } from "@/features/app-context";
import { Written } from "@/features/session/listen-tap/Written";
import type { PresentationProps } from "@/features/session/registry";

/**
 * Cuánto dura la guía de dirección animada que sigue al dibujo completo (Tarea 6, punto 3),
 * como fracción de `animationMs(glyph)`: más corta que el dibujo, para que no se sienta como una
 * segunda pasada completa.
 */
export const ARROW_ANIMATION_RATIO = 0.6;

type Phase = "draw" | "arrow" | "done";

/**
 * Introducción sin error de `trace` (spec §2, D12): la letra se dibuja sola en nivel 1 antes
 * de pedir que se trace, en el caso que fije `run.traceCase` (D28, `?? "upper"`). El par a/A
 * va siempre visible, como en las demás presentaciones, sea cual sea el caso trazado.
 *
 * El botón «Siguiente» aparece cuando termina toda la secuencia: el dibujo completo
 * (`animation="full"`) y, encadenada tras él, la guía de dirección animada (`animation="dot"`,
 * reutilizada del punto 3 de la Tarea 6 — una flecha, no el punto simple de antes). Ambas fases
 * comparten el mismo `onAnimationEnd` de `TraceCanvas`: la fase (`phase`) dice cuál de las dos
 * acaba de terminar. Nunca cuando termina el audio: si no hay voz se sigue jugando igual.
 *
 * El niño puede repasar la letra mientras tanto: se pinta su tinta (`disabled={false}`, sin
 * bloquear durante la animación, a diferencia de la evaluación), pero no se puntúa ni se manda
 * a ningún sitio — eso es solo de `trace/Evaluation.tsx`.
 */
export function Presentation(props: PresentationProps) {
	const { item, onDone } = props;
	const audio = useAudio();
	const traceCase = useApp((s) => s.run?.traceCase ?? "upper");
	const glyph = glyphFor(item, traceCase);

	const [phase, setPhase] = useState<Phase>("draw");
	const [ink, setInk] = useState<readonly TraceStroke[]>([]);
	const ready = phase === "done";
	const animation: TraceAnimation =
		phase === "draw" ? "full" : phase === "arrow" ? "dot" : "none";

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
		 * área, 328 tras el relleno). En vertical de tableta (768×1024, hallazgo de la Tarea 6:
		 * `browser-qa` midió 47.6 % en vez de ≥60 %) el mismo cálculo cambia porque el par crece
		 * hasta su tope de `8rem` (128, ya que `26vw` da 199.68 a 768 de ancho) y el 50vh de
		 * antes da solo 512 de alto: escala = min(629.76/1.2, 512/1.4) = min(524.8, 365.71) =
		 * 365.71 → 47.6 % de 768, justo el hallazgo. `md:portrait:h-[65vh]` (665.6, dentro de los
		 * 672 disponibles — 912 − 128 − 96 − 16, 6.4 de margen) sin tocar el ancho (`82vw` ya
		 * deja el ancho como no vinculante: 629.76/1.2 = 524.8 > el alto): escala =
		 * min(524.8, 665.6/1.4) = min(524.8, 475.43) = 475.43 → 61.9 % de 768. `md:` (≥768 de
		 * ancho) y `portrait:` juntos para no rozar el caso apaisado de abajo (1024×768 cumple
		 * `md:` pero no `portrait:`, así que esta regla no le aplica). En apaisado, apilar no
		 * cabe ni de lejos (el alto disponible es 656 y el lienzo solo por sí necesitaría 645
		 * para el mismo 60 %): por eso aquí los
		 * tres van en fila (`landscape:flex-row`), como el botón de `trace/Evaluation.tsx`, y el
		 * lienzo puede ocupar casi todo el alto sin competir por él. `landscape:h-[85vh]`
		 * (652.8) dentro de 656 (3.2 de margen, igual que en `Evaluation.tsx`) con
		 * `landscape:w-[55vw]` (563.2, con margen de sobra para el par y el botón en la misma
		 * fila): escala = min(563.2/1.2, 652.8/1.4) = 466.3 → 60.7 % de 768. Sin verificación en
		 * navegador real (sin `chromium-cli` ni Playwright en esta caja, ver el informe de la
		 * Tarea 4): son las mismas cuentas con la fórmula exacta del lienzo, no una medida.
		 * El hueco del botón lleva `w-24` además de `h-24`: en fila (apaisado), un hueco sin
		 * ancho mide 0 hasta que `ready` pone el botón (96 px), y como la fila entera se centra
		 * (`SessionScreen`, `justify-center`), aparecer lo desplazaría 48 px de golpe — con el
		 * lienzo al lado, moviéndose justo cuando el niño puede estar trazando encima
		 * (`disabled={false}`). Reservar el ancho fijo evita el salto; en vertical no hace nada
		 * (el hueco ya no compite por ancho con nadie) y el presupuesto de ancho de apaisado ya
		 * contaba con esos 96 px.
		 */
		<div className="flex flex-col items-center gap-2 landscape:flex-row landscape:gap-4">
			<div className="flex h-[min(8rem,26vw)] items-center justify-center font-reading">
				<Written item={item} size="lg" />
			</div>
			<div className="flex h-[50vh] w-[82vw] items-center justify-center md:portrait:h-[65vh] landscape:h-[85vh] landscape:w-[55vw]">
				<TraceCanvas
					glyph={glyph}
					level={1}
					strokes={ink}
					animation={animation}
					{...(phase === "arrow"
						? { dotDurationMs: animationMs(glyph) * ARROW_ANIMATION_RATIO }
						: {})}
					disabled={false}
					onStrokeStart={() => {}}
					onStrokeEnd={(stroke) => setInk((prev) => [...prev, stroke])}
					onAnimationEnd={() => {
						// El dibujo completo acaba y encadena la flecha (más corta, letra ya
						// quieta); la flecha acaba y ahí sí se apaga y aparece «Siguiente». Si el
						// dibujo se quedara en "full" taparía exactamente la tinta del niño donde
						// su repaso coincide con el trazo — por eso cada fase se apaga al pasar a
						// la siguiente, nunca se acumulan.
						setPhase((fase) => (fase === "draw" ? "arrow" : "done"));
					}}
				/>
			</div>
			<div className="flex h-24 w-24 items-center justify-center">
				{ready && (
					<BigButton aria-label="Siguiente" onClick={onDone}>
						<Icon name="next" />
					</BigButton>
				)}
			</div>
		</div>
	);
}
