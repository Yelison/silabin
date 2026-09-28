"use client";

import { useMemo, useState } from "react";
import {
	type AudioPlayer,
	createSilentPlayer,
	createSpeechPlayer,
} from "@/audio";
import {
	type AttemptFeedback,
	type Box,
	type CurriculumIndex,
	createAttemptState,
	curriculum,
	emptyProgressState,
	glyphFor,
	guideLevel,
	type Item,
	type PlannedExercise,
	planSession,
	recordAttempt,
	scoreTrace,
	type TemplateId,
	type TraceStroke,
	templates,
	type Unit,
} from "@/engine";
import { AppProviders } from "@/features/app-context";
import { type TraceInput, templateViews } from "@/features/session/registry";
import { createAppStore, createMemoryAdapter } from "@/store";

const UNIT_ID = "dev:plantilla";
const SEED_INICIAL = 1;

/** Las plantillas que la interfaz sabe pintar. */
export const PLANTILLAS = Object.keys(templateViews) as TemplateId[];

export function itemsDe(templateId: TemplateId): Item[] {
	const tipos = templates[templateId].itemKinds;
	return [...curriculum.items.values()].filter((i) => {
		if (!tipos.includes(i.kind)) return false;
		// Una tarea oral lleva su respuesta y sus opciones escritas en el dato, hechas para la
		// plantilla de la unidad que la introduce: en otra no hay ejercicio posible (el sonido
		// inicial de «sol» no existe como tarea) o no significaría nada. Letras, sílabas,
		// palabras y fonemas sirven para cualquier plantilla de su tipo, `listen-tap` y `build`
		// incluidas, que ninguna unidad ofrece todavía.
		if (i.kind !== "oral-skill") return true;
		return [...curriculum.units.values()].some(
			(u) =>
				u.introduces.includes(i.id) &&
				u.exercises.some((e) => e.templateId === templateId),
		);
	});
}

/**
 * El currículo con una unidad de prueba que introduce solo este ítem con esta plantilla,
 * colocada justo tras la unidad que lo enseña de verdad. Así el motor planifica el ejercicio
 * con lo que el niño ya habría visto en ese punto, aunque ninguna unidad ofrezca todavía esa
 * plantilla con ese ítem (`listen-tap`, `build`).
 */
function conUnidadDePrueba(
	templateId: TemplateId,
	item: Item,
): CurriculumIndex {
	const duena = [...curriculum.units.values()].find((u) =>
		u.introduces.includes(item.id),
	);
	const prueba: Unit = {
		id: UNIT_ID,
		phase: duena?.phase ?? 0,
		title: "Unidad de prueba",
		audioKey: "unit:dev",
		requires: [],
		introduces: [item.id],
		exercises: [{ templateId, weight: 1 }],
	};
	const orden = [...curriculum.unitOrder];
	const tras = duena === undefined ? orden.length - 1 : orden.indexOf(duena.id);
	orden.splice(tras + 1, 0, UNIT_ID);
	return {
		items: curriculum.items,
		// La de prueba va la última en el mapa: es la «dueña» del ítem para el planificador.
		units: new Map([...curriculum.units, [UNIT_ID, prueba]]),
		unitOrder: orden,
	};
}

/** Lo que el motor planifica para este ítem: su presentación y una evaluación. */
export function planificar(
	templateId: TemplateId,
	item: Item,
	seed: number,
): {
	presentacion: PlannedExercise | undefined;
	evaluacion: PlannedExercise | undefined;
} {
	const ejercicios = planSession({
		content: conUnidadDePrueba(templateId, item),
		state: emptyProgressState(),
		activeUnitId: UNIT_ID,
		sessionLength: 5,
		seed,
	});
	return {
		presentacion: ejercicios.find((e) => e.kind === "presentation"),
		evaluacion: ejercicios.find(
			(e) => e.kind === "evaluation" && e.itemId === item.id,
		),
	};
}

/** Lo que el motor respondería tras `rung` fallos seguidos. La página no decide la pista. */
function feedbackDelRung(
	templateId: TemplateId,
	rung: 1 | 2 | 3,
): AttemptFeedback {
	let estado = createAttemptState();
	let feedback: AttemptFeedback = { hint: null, resolution: null };
	for (let i = 0; i < rung; i++) {
		const paso = recordAttempt(templateId, estado, "wrong");
		estado = paso.state;
		feedback = { hint: paso.hint, resolution: paso.resolution };
	}
	return feedback;
}

function crearAudio(): AudioPlayer {
	if (typeof globalThis.speechSynthesis === "undefined")
		return createSilentPlayer();
	return createSpeechPlayer({
		synth: globalThis.speechSynthesis,
		accent: "neutro",
	});
}

const BOTON = "rounded border-2 border-calm-border bg-card px-3 py-2";

/** Las dos vistas de una plantilla con un ejercicio ya planificado. Se remonta al cambiar de ítem. */
function Panel(props: {
	templateId: TemplateId;
	item: Item;
	presentacion: PlannedExercise | undefined;
	evaluacion: PlannedExercise | undefined;
}) {
	const { templateId, item, presentacion, evaluacion } = props;
	const vistas = templateViews[templateId];
	const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
	const [attemptKey, setAttemptKey] = useState(0);
	const [locked, setLocked] = useState(false);
	const [suceso, setSuceso] = useState("");
	// Solo para trace: nivel de guía (T2) según la caja elegida y las pistas del rung simulado.
	const [rung, setRung] = useState<0 | 1 | 2 | 3>(0);
	const [caja, setCaja] = useState<Box>(0);
	const [marcador, setMarcador] = useState("");

	if (vistas === undefined) return <p>Sin vista para {templateId}.</p>;

	function simular(nuevoRung: 0 | 1 | 2 | 3) {
		setRung(nuevoRung);
		setFeedback(
			nuevoRung === 0 ? null : feedbackDelRung(templateId, nuevoRung),
		);
		// Solo un fallo con pista abre un intento nuevo; el modelo no (como en la sesión).
		if (nuevoRung < 3) setAttemptKey((k) => k + 1);
		setSuceso(
			nuevoRung === 0 ? "Sin feedback" : `Simulado el rung ${nuevoRung}`,
		);
	}

	// `glyphFor`/`guideLevel`/`scoreTrace` solo se usan en `features/dev/`: aquí, donde está
	// permitido explícitamente (T4). El marcador es texto para el adulto, solo en desarrollo.
	const trace: TraceInput | undefined =
		templateId === "trace"
			? {
					guide: {
						glyph: glyphFor(item, "upper"),
						level: guideLevel(caja, rung),
					},
					onTrace: (strokes: TraceStroke[]) => {
						const score = scoreTrace(glyphFor(item, "upper"), strokes);
						const cobertura = score.coverage
							.map((c) => `${Math.round(c * 100)}%`)
							.join(", ");
						const precision = Math.round(score.precision * 100);
						setMarcador(
							`cobertura ${cobertura} · precisión ${precision}% · ${
								score.correct ? "vale" : "no vale"
							}`,
						);
						// Deja repasar: un intento nuevo limpia la tinta, como en la sesión real.
						setAttemptKey((k) => k + 1);
					},
				}
			: undefined;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-3">
				{([0, 1, 2, 3] as const).map((rungBoton) => (
					<button
						key={rungBoton}
						type="button"
						className={BOTON}
						onClick={() => simular(rungBoton)}
					>
						{rungBoton === 0 ? "Sin feedback" : `Rung ${rungBoton}`}
					</button>
				))}
				<button
					type="button"
					aria-pressed={locked}
					className={BOTON}
					onClick={() => setLocked((l) => !l)}
				>
					locked
				</button>
			</div>
			{templateId === "trace" && (
				<div className="flex flex-wrap items-center gap-3">
					{([0, 1, 2] as const).map((c) => (
						<button
							key={c}
							type="button"
							aria-pressed={caja === c}
							className={BOTON}
							onClick={() => setCaja(c)}
						>
							{`Nivel ${c + 1}`}
						</button>
					))}
				</div>
			)}
			<p role="status" className="text-ink-soft">
				{suceso}
			</p>
			<div className="grid gap-8 md:grid-cols-2">
				<section aria-label="Presentation" className="rounded border p-4">
					<h2 className="mb-4 font-bold">Presentation</h2>
					{presentacion === undefined ? (
						<p>El motor no planificó presentación.</p>
					) : (
						<vistas.Presentation
							exercise={presentacion}
							item={item}
							onDone={() => setSuceso("Presentación terminada")}
						/>
					)}
				</section>
				<section aria-label="Evaluation" className="rounded border p-4">
					<h2 className="mb-4 font-bold">Evaluation</h2>
					{evaluacion === undefined ? (
						<p>El motor no planificó evaluación.</p>
					) : (
						<>
							<vistas.Evaluation
								exercise={evaluacion}
								item={item}
								attemptKey={attemptKey}
								feedback={feedback}
								locked={locked}
								onAnswer={(a) => setSuceso(`Respuesta: ${a}`)}
								onModelDone={() => setSuceso("Modelo completado")}
								{...(trace !== undefined ? { trace } : {})}
							/>
							{templateId === "trace" && (
								<p
									data-testid="marcador-trace"
									className="mt-4 text-sm text-ink-soft"
								>
									{marcador}
								</p>
							)}
						</>
					)}
				</section>
			</div>
		</div>
	);
}

/**
 * Herramienta de desarrollo: enseña la presentación y la evaluación de una plantilla con un
 * ítem cualquiera, y simula lo que el motor respondería en cada rung, sin sesión ni progreso.
 * Sirve para ver `listen-tap` y `build`, que ninguna unidad ofrece todavía. No decide nada:
 * el ejercicio lo planifica el motor y la pista de cada rung sale de `recordAttempt`.
 */
export function PlantillasDev(props: { audio?: AudioPlayer }) {
	const [audio] = useState(() => props.audio ?? crearAudio());
	const [store] = useState(() =>
		createAppStore({
			adapter: createMemoryAdapter(),
			content: curriculum,
			now: () => new Date().toISOString(),
			seed: () => SEED_INICIAL,
		}),
	);
	const [templateId, setTemplateId] = useState<TemplateId>(
		PLANTILLAS.includes("listen-tap")
			? "listen-tap"
			: (PLANTILLAS[0] as TemplateId),
	);
	const [itemId, setItemId] = useState<string | null>(null);
	const [seed, setSeed] = useState(SEED_INICIAL);

	const items = useMemo(() => itemsDe(templateId), [templateId]);
	const item = items.find((i) => i.id === itemId) ?? items[0];
	const plan = useMemo(
		() => (item === undefined ? null : planificar(templateId, item, seed)),
		[templateId, item, seed],
	);

	return (
		<AppProviders store={store} audio={audio}>
			{/* El navegador exige un gesto para dejar sonar: cualquier toque desbloquea. */}
			<main
				className="flex flex-col gap-6 p-6"
				onClickCapture={() => {
					void audio.unlock();
				}}
			>
				<h1 className="text-2xl font-bold">Plantillas (solo desarrollo)</h1>
				<div className="flex flex-wrap items-center gap-4">
					<label className="flex items-center gap-2">
						Plantilla
						<select
							className={BOTON}
							value={templateId}
							onChange={(e) => {
								setTemplateId(e.target.value as TemplateId);
								setItemId(null);
							}}
						>
							{PLANTILLAS.map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
					</label>
					<label className="flex items-center gap-2">
						Ítem
						<select
							className={BOTON}
							value={item?.id ?? ""}
							onChange={(e) => setItemId(e.target.value)}
						>
							{items.map((i) => (
								<option key={i.id} value={i.id}>
									{i.text} ({i.id})
								</option>
							))}
						</select>
					</label>
					<button
						type="button"
						className={BOTON}
						onClick={() => setSeed((s) => s + 1)}
					>
						Otro ejercicio
					</button>
				</div>
				{item === undefined || plan === null ? (
					<p>Esta plantilla no tiene ítems compatibles.</p>
				) : (
					<Panel
						key={`${templateId}|${item.id}|${seed}`}
						templateId={templateId}
						item={item}
						presentacion={plan.presentacion}
						evaluacion={plan.evaluacion}
					/>
				)}
			</main>
		</AppProviders>
	);
}
