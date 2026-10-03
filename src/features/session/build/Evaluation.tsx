"use client";

import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { OptionCard, type OptionState } from "@/components/OptionCard";
import { ReplayButton } from "@/components/ReplayButton";
import { curriculum, expectedPieces, reducedPieces } from "@/engine";
import { useAudio } from "@/features/app-context";
import type { EvaluationProps } from "@/features/session/registry";

/** Las dos casillas (consonante, vocal): el id de la pieza que tienen, o `null` si están libres. */
type Casillas = readonly [string | null, string | null];
const VACIAS: Casillas = [null, null];
const SIN_PIEZAS: readonly string[] = [];

/** Lo que se mueve el dedo antes de que un toque pase a ser un arrastre. */
const UMBRAL_ARRASTRE_PX = 10;

/**
 * Formar la sílaba que suena con dos casillas y una bandeja de piezas. La respuesta es el texto
 * de las dos piezas en el orden de las casillas; qué pieza es la correcta y las pistas las decide
 * el motor (`expectedPieces`, `reducedPieces`), aquí solo se pinta y se coloca.
 *
 * Tocar y arrastrar (R15) llevan al mismo estado porque las dos entradas llaman a las mismas
 * funciones `colocar` y `devolver`: las casillas son la única fuente de verdad.
 *
 * - Con las dos casillas llenas la vista queda inerte hasta el siguiente `attemptKey`: no hay
 *   segunda respuesta ni pieza que entre de más.
 * - Pista 1 (`dim-nonmatching-pieces`): las piezas que no entran se atenúan y se deshabilitan, y
 *   se mantienen en los intentos siguientes.
 * - Pista 2: la pieza de la vocal pulsa y suena.
 * - Pista 3 (modelo): solo se acepta colocar las dos piezas en orden; al colocar la segunda avisa
 *   con `onModelDone`, nunca con `onAnswer`.
 */
export function Evaluation(props: EvaluationProps) {
	const {
		exercise,
		item,
		attemptKey,
		feedback,
		locked,
		onAnswer,
		onModelDone,
	} = props;
	const audio = useAudio();
	const [casillas, setCasillas] = useState<Casillas>(VACIAS);
	const [atenuadas, setAtenuadas] = useState<readonly string[]>(SIN_PIEZAS);
	const [pulsando, setPulsando] = useState<string | null>(null);
	/** Las dos piezas del modelo en orden, cuando el motor pide la pista 3. */
	const [modelo, setModelo] = useState<readonly string[] | null>(null);
	const [arrastre, setArrastre] = useState<{
		id: string;
		dx: number;
		dy: number;
	} | null>(null);
	const gesto = useRef<{
		id: string;
		x0: number;
		y0: number;
		movido: boolean;
	} | null>(null);
	/** El clic que el navegador manda tras soltar un arrastre no es un toque. */
	const clicDeArrastre = useRef(false);

	useEffect(() => () => audio.stop(), [audio]);

	// Intento nuevo: las casillas se vacían y lo que pulsaba se apaga. Las atenuadas y el modelo
	// se conservan: la pista 1 sigue valiendo en los intentos siguientes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al intento
	useEffect(() => {
		setCasillas(VACIAS);
		setPulsando(null);
		setArrastre(null);
		gesto.current = null;
	}, [attemptKey]);

	// La pista que ordena el motor. Una vez por feedback nuevo, no por cada pintado. Los errores
	// de datos incoherentes (`expectedPieces`, `reducedPieces`) se dejan subir: no se ocultan.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacciona solo al feedback
	useEffect(() => {
		setPulsando(null);
		const action = feedback?.hint?.action;
		if (action === undefined) return;
		switch (action) {
			case "dim-nonmatching-pieces": {
				const quedan = reducedPieces(exercise, curriculum, item);
				setAtenuadas(exercise.optionIds.filter((id) => !quedan.includes(id)));
				return;
			}
			case "pulse-vowel-piece+play-vowel": {
				const vocal = expectedPieces(exercise, curriculum, item)[1];
				if (vocal === undefined) return;
				setPulsando(vocal);
				const sonido = curriculum.items.get(vocal)?.audioKey;
				if (sonido === undefined) return;
				audio.play({ key: sonido }).catch(() => {
					// El sonido acompaña, no manda.
				});
				return;
			}
			case "highlight-both-pieces-in-order":
				// El tercer fallo llega sin intento nuevo: las casillas siguen con la respuesta
				// errónea y, llenas, ninguna pieza respondería al modelo. Se vacían aquí.
				setCasillas(VACIAS);
				setArrastre(null);
				gesto.current = null;
				setModelo(expectedPieces(exercise, curriculum, item));
				return;
		}
	}, [feedback]);

	const textoDe = (id: string) => curriculum.items.get(id)?.text ?? "";
	const colocadas = casillas.filter((c) => c !== null).length;
	const llenas = colocadas === casillas.length;

	/** ¿Responde a un toque o a un arrastre esta pieza ahora mismo? */
	function interactiva(id: string): boolean {
		if (locked || llenas) return false;
		if (casillas.includes(id)) return modelo === null;
		if (modelo !== null) return id === modelo[colocadas];
		return !atenuadas.includes(id);
	}

	/**
	 * Lleva la pieza a `casilla` (o a la primera libre, si esa no lo está). En el modelo siempre
	 * va a la primera libre: se llena en orden aunque se suelte en la otra.
	 */
	function colocar(id: string, casilla?: number) {
		if (!interactiva(id)) return;
		const resto = casillas.map((c) => (c === id ? null : c));
		const libre =
			casilla !== undefined && modelo === null && resto[casilla] === null
				? casilla
				: resto.indexOf(null);
		if (libre < 0) return;
		const siguiente = resto.map((c, i) => (i === libre ? id : c));
		const nuevas: Casillas = [siguiente[0] ?? null, siguiente[1] ?? null];
		setCasillas(nuevas);
		if (nuevas.some((c) => c === null)) return;
		if (modelo !== null) onModelDone();
		else onAnswer(nuevas.map((c) => textoDe(c ?? "")).join(""));
	}

	/** Devuelve la pieza colocada a la bandeja. */
	function devolver(id: string) {
		if (!interactiva(id)) return;
		setCasillas([
			casillas[0] === id ? null : casillas[0],
			casillas[1] === id ? null : casillas[1],
		]);
	}

	function alPulsar(id: string) {
		if (clicDeArrastre.current) return;
		if (casillas.includes(id)) devolver(id);
		else colocar(id);
	}

	function alBajar(e: ReactPointerEvent<HTMLElement>, id: string) {
		if (!interactiva(id)) return;
		gesto.current = { id, x0: e.clientX, y0: e.clientY, movido: false };
	}

	function alMover(e: ReactPointerEvent<HTMLElement>) {
		const g = gesto.current;
		if (g === null) return;
		const dx = e.clientX - g.x0;
		const dy = e.clientY - g.y0;
		if (!g.movido && Math.hypot(dx, dy) < UMBRAL_ARRASTRE_PX) return;
		if (!g.movido)
			// Solo al empezar a arrastrar: capturar en el pointerdown retargeta el `click` al
			// contenedor y, con ratón, el toque no llegaría al botón. jsdom no lo implementa.
			e.currentTarget.setPointerCapture?.(e.pointerId);
		g.movido = true;
		setArrastre({ id: g.id, dx, dy });
	}

	function alSoltar(e: ReactPointerEvent<HTMLElement>) {
		const g = gesto.current;
		gesto.current = null;
		setArrastre(null);
		if (g === null || !g.movido) return; // un toque: lo resuelve el clic
		clicDeArrastre.current = true;
		setTimeout(() => {
			clicDeArrastre.current = false;
		}, 0);
		// Lo que hay bajo el dedo, de arriba abajo, sin la pieza que se arrastra.
		const casilla = (document.elementsFromPoint?.(e.clientX, e.clientY) ?? [])
			.filter((el) => !e.currentTarget.contains(el))
			.map((el) => el.closest("[data-casilla]"))
			.find((el) => el !== null);
		if (casilla !== undefined && casilla !== null)
			colocar(g.id, Number(casilla.getAttribute("data-casilla")));
		else devolver(g.id);
	}

	function alCancelar() {
		gesto.current = null;
		setArrastre(null);
	}

	function pieza(id: string) {
		const letra = curriculum.items.get(id);
		if (letra === undefined) return null;
		const colocada = casillas.includes(id);
		const orden = modelo?.indexOf(id) ?? -1;
		const estado: OptionState =
			modelo !== null
				? orden >= 0
					? "marked"
					: "dimmed"
				: !colocada && atenuadas.includes(id)
					? "dimmed"
					: pulsando === id
						? "pulsing"
						: "idle";
		const moviendo = arrastre?.id === id;
		return (
			<div
				data-piece={id}
				className="relative touch-none select-none"
				style={
					moviendo
						? {
								transform: `translate(${arrastre.dx}px, ${arrastre.dy}px)`,
								zIndex: 10,
							}
						: undefined
				}
				onPointerDown={(e) => alBajar(e, id)}
				onPointerMove={alMover}
				onPointerUp={alSoltar}
				onPointerCancel={alCancelar}
			>
				<OptionCard
					compact
					state={estado}
					disabled={!interactiva(id)}
					aria-label={letra.text}
					onSelect={() => alPulsar(id)}
				>
					<span className="text-5xl leading-none">
						{letra.display?.lower ?? letra.text}
					</span>
					{orden >= 0 && (
						<span
							aria-hidden="true"
							// Fuera de la caja de la letra: los desplazamientos cuentan desde el borde interior.
							className="absolute -bottom-5 -left-5 flex h-7 w-7 items-center justify-center rounded-full bg-action text-2xl font-bold text-action-ink"
						>
							{orden + 1}
						</span>
					)}
				</OptionCard>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-6 apaisado-bajo:flex-row apaisado-bajo:gap-6">
			{/* En apaisado bajo, «Oír» y las casillas van en una columna y la bandeja al lado. */}
			<div className="flex flex-col items-center gap-6 apaisado-bajo:gap-4">
				<ReplayButton
					aria-label="Oír otra vez"
					disabled={locked}
					onReplay={() => {
						audio.play({ key: item.audioKey }).catch(() => {
							// Sin voz también se puede jugar.
						});
					}}
				/>
				<div className="flex flex-row items-center justify-center gap-4">
					{casillas.map((id, i) => (
						<fieldset
							// biome-ignore lint/suspicious/noArrayIndexKey: son dos casillas fijas
							key={i}
							aria-label={`Casilla ${i + 1}`}
							data-casilla={i}
							className="flex min-h-24 min-w-24 items-center justify-center rounded-card border-4 border-dashed border-calm-border bg-card font-reading text-ink"
						>
							{id !== null && pieza(id)}
						</fieldset>
					))}
				</div>
			</div>
			{/* El hueco entre filas (28 px) es donde cabe la mano de la pieza marcada del modelo. */}
			<div className="flex flex-row flex-wrap items-center justify-center gap-x-3 gap-y-7 font-reading">
				{exercise.optionIds.map((id) => (
					<div key={id} className="min-h-18 min-w-18">
						{!casillas.includes(id) && pieza(id)}
					</div>
				))}
			</div>
		</div>
	);
}
