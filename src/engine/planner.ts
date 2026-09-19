import type { CurriculumIndex } from "@/content/index";
import { pictures } from "@/content/pictures";
import { type TemplateId, templates } from "@/content/templates";
import type { Item, Unit } from "@/content/types";
import {
	type DistractorLevel,
	isForbiddenDistractor,
	pickDistractors,
} from "@/engine/distractors";
import { isDue } from "@/engine/leitner";
import { itemProgressOf } from "@/engine/mastery";
import { createRng, type Rng } from "@/engine/random";
import type { PlannedExercise, ProgressState } from "@/engine/types";

export const MAX_PRESENTATIONS = 2;
export const REVIEW_SHARE = 0.3;

/** Qué unidad introduce cada ítem. */
export function owningUnits(content: CurriculumIndex): Map<string, string> {
	const out = new Map<string, string>();
	for (const unit of content.units.values()) {
		for (const itemId of unit.introduces) out.set(itemId, unit.id);
	}
	return out;
}

function templatesFor(unit: Unit, item: Item): TemplateId[] {
	return unit.exercises
		.filter((exercise) =>
			templates[exercise.templateId].itemKinds.includes(item.kind),
		)
		.flatMap((exercise) =>
			Array.from({ length: exercise.weight }, () => exercise.templateId),
		);
}

function basePool(unit: Unit, item: Item): TemplateId[] {
	const weighted = templatesFor(unit, item);
	if (weighted.length > 0) return weighted;

	const fallback = (Object.keys(templates) as TemplateId[]).filter((id) =>
		templates[id].itemKinds.includes(item.kind),
	);
	if (fallback.length === 0)
		throw new Error(`Ninguna plantilla acepta un ítem de clase ${item.kind}`);
	return fallback;
}

/**
 * Elige plantilla para el ítem. Cuando se pasan `counts` y `cap`, evita las plantillas que ya
 * alcanzaron el tope salvo que eso vacíe el conjunto elegible: sin esa salvedad, una unidad con
 * una sola plantilla aplicable (como la de sí o no) se quedaría sin ninguna opción.
 */
function pickTemplate(
	unit: Unit,
	item: Item,
	rng: Rng,
	counts?: Map<TemplateId, number>,
	cap?: number,
): TemplateId {
	const pool = basePool(unit, item);
	if (counts === undefined || cap === undefined) return rng.pick(pool);

	const underCap = pool.filter((id) => (counts.get(id) ?? 0) < cap);
	return rng.pick(underCap.length > 0 ? underCap : pool);
}

/** Ítems que el niño ya ha visto: los que introducen las unidades hasta la activa, incluida. */
function seenItemIds(
	content: CurriculumIndex,
	activeUnitId: string,
): Set<string> {
	const hasta = content.unitOrder.indexOf(activeUnitId);
	const out = new Set<string>();
	for (const unitId of content.unitOrder.slice(0, hasta + 1)) {
		for (const id of content.units.get(unitId)?.introduces ?? []) out.add(id);
	}
	return out;
}

/** Ítems de todas las unidades de la misma fase que la activa, se hayan visto o no. */
function samePhaseItemIds(content: CurriculumIndex, unit: Unit): Set<string> {
	const out = new Set<string>();
	for (const otra of content.units.values()) {
		if (otra.phase !== unit.phase) continue;
		for (const id of otra.introduces) out.add(id);
	}
	return out;
}

/**
 * De dónde salen las opciones falsas. Se prefiere siempre lo que el niño ya ha visto: sin
 * este filtro, en phase1:vowel-a la a se ofrecía junto a la s (que no se enseña hasta doce
 * unidades después) o junto a palabras de cuatro letras como amo o masa, hechas con
 * consonantes que el niño no conoce. Eso no es un distractor, es ruido.
 *
 * Cuando lo visto no alcanza, se completa con la misma fase. En la Fase 1 eso es justo lo
 * que pide la spec §4: "nivel fácil = formas muy distintas (a vs i vs u); nivel medio =
 * vocales restantes". En phase1:vowel-a el niño solo ha visto la a, así que las otras
 * cuatro vocales son los distractores que la especificación nombra una por una; la i y la
 * u, de otro grupo de trazo, son además las del nivel fácil. Solo hace falta en vowel-a y
 * en vowel-e: desde vowel-o ya hay letras vistas de sobra, y en la Fase 2 nunca, porque al
 * llegar a phase2:m hay 6 letras, 5 sílabas y 5 palabras vistas.
 *
 * El tercer nivel, el currículo entero, es la red de seguridad: con contenido nuevo que
 * dejara una fase sin distractores suficientes, es preferible una opción lejana a dejar al
 * niño a medias de la sesión con un error.
 */
function optionPool(input: {
	content: CurriculumIndex;
	templateId: TemplateId;
	target: Item;
	needed: number;
	seen: ReadonlySet<string>;
	samePhase: ReadonlySet<string>;
}): Item[] {
	const { content, templateId, target, needed, seen, samePhase } = input;
	// Las imágenes del sonido inicial no se leen: el niño mira y escucha, así que no tienen
	// que haberse "enseñado" antes.
	if (templateId === "initial-sound") return [...pictures];

	const kinds = templates[templateId].itemKinds;
	const todos = [...content.items.values()].filter((candidate) =>
		kinds.includes(candidate.kind),
	);
	const utiles = (pool: Item[]): number =>
		pool.filter(
			(candidate) =>
				candidate.id !== target.id && !isForbiddenDistractor(target, candidate),
		).length;

	const vistos = todos.filter((candidate) => seen.has(candidate.id));
	if (utiles(vistos) >= needed) return vistos;

	const conFase = todos.filter(
		(candidate) => seen.has(candidate.id) || samePhase.has(candidate.id),
	);
	if (utiles(conFase) >= needed) return conFase;

	return todos;
}

function buildOptions(input: {
	content: CurriculumIndex;
	item: Item;
	templateId: TemplateId;
	level: DistractorLevel;
	rng: Rng;
	seen: ReadonlySet<string>;
	samePhase: ReadonlySet<string>;
}): { optionIds: string[]; correctOptionId: string | null } {
	const { content, item, templateId, level, rng, seen, samePhase } = input;
	const range = templates[templateId].options;
	if (range === undefined) return { optionIds: [], correctOptionId: null };

	// Las tareas orales ya traen sus opciones escritas en el dato.
	if (item.task?.optionIds !== undefined) {
		return {
			optionIds: rng.shuffle(item.task.optionIds),
			correctOptionId: item.task.answer,
		};
	}

	const total = level === "easy" ? range.min : range.max;

	// En sonido inicial la respuesta es una imagen que empieza por el fonema practicado.
	const correct: Item =
		templateId === "initial-sound"
			? rng.pick(pictures.filter((p) => p.phonemes[0] === item.phonemes[0]))
			: item;

	const distractors = pickDistractors({
		target: correct,
		pool: optionPool({
			content,
			templateId,
			target: correct,
			needed: total - 1,
			seen,
			samePhase,
		}).filter((c) => c.id !== correct.id),
		count: total - 1,
		rng,
		level,
	});

	return {
		optionIds: rng.shuffle([correct.id, ...distractors.map((d) => d.id)]),
		correctOptionId: correct.id,
	};
}

/**
 * Ordena sin repetir plantilla en dos ejercicios seguidos, repartiendo por paridad: los grupos
 * más numerosos ocupan primero las posiciones pares (0, 2, 4…) y el resto llena las impares. Es
 * el método clásico para este problema: a diferencia de "tomar el primero que sirva", no deja
 * varado el sobrante de una plantilla mayoritaria al final cuando sí existe una disposición
 * válida (y una existe siempre que ninguna plantilla supere la mitad de la lista).
 *
 * `forbiddenLast`, cuando se indica, reserva el último puesto para otra plantilla, porque quien
 * cierre la sesión (la evaluación más fácil) se añade después y no debe quedar pegado a su misma
 * plantilla. El reparto por paridad ya tiende a evitarlo, porque aleja a la plantilla mayoritaria
 * del final; si aun así coincidiera, se intercambia con la primera posición anterior donde el
 * cambio no rompa la regla en ninguno de los dos lados.
 */
function arrangeNoAdjacent(
	list: PlannedExercise[],
	rng: Rng,
	forbiddenLast?: TemplateId,
): PlannedExercise[] {
	const total = list.length;
	if (total === 0) return [];

	const groups = new Map<TemplateId, PlannedExercise[]>();
	for (const exercise of list) {
		const group = groups.get(exercise.templateId);
		if (group === undefined) groups.set(exercise.templateId, [exercise]);
		else group.push(exercise);
	}
	const order = rng
		.shuffle([...groups.values()])
		.sort((a, b) => b.length - a.length);

	const slots: (PlannedExercise | undefined)[] = new Array(total).fill(
		undefined,
	);
	let index = 0;
	for (const group of order) {
		for (const exercise of rng.shuffle(group)) {
			slots[index] = exercise;
			index += 2;
			if (index >= total) index = 1;
		}
	}
	const arranged = slots.filter(
		(exercise): exercise is PlannedExercise => exercise !== undefined,
	);

	const last = arranged.length - 1;
	const displaced = arranged[last];
	if (
		forbiddenLast !== undefined &&
		displaced !== undefined &&
		displaced.templateId === forbiddenLast
	) {
		const swapIndex = arranged.findIndex((exercise, i) => {
			if (i >= last || exercise.templateId === forbiddenLast) return false;
			const leftOk =
				i === 0 || arranged[i - 1]?.templateId !== displaced.templateId;
			const rightOk = arranged[i + 1]?.templateId !== displaced.templateId;
			const tailOk =
				last === 0 || arranged[last - 1]?.templateId !== exercise.templateId;
			return leftOk && rightOk && tailOk;
		});
		const target = arranged[swapIndex];
		if (swapIndex >= 0 && target !== undefined) {
			arranged[swapIndex] = displaced;
			arranged[last] = target;
		}
	}

	return arranged;
}

/**
 * Reduce los pares de plantillas repetidas seguidas intercambiando posiciones, sin tocar
 * nunca la última: cerrar con el ejercicio más fácil es una garantía dura. Cuando la
 * plantilla mayoritaria no es la más fácil, un par es inevitable, pero tres no: el
 * algoritmo voraz puede dejar la peor disposición y esta pasada la mejora.
 */
function reduceAdjacency(list: PlannedExercise[]): PlannedExercise[] {
	const out = [...list];
	const pares = (arr: PlannedExercise[]) => {
		let n = 0;
		for (let i = 1; i < arr.length; i += 1) {
			if (arr[i]?.templateId === arr[i - 1]?.templateId) n += 1;
		}
		return n;
	};
	const ultimo = out.length - 1;
	for (let vuelta = 0; vuelta < out.length; vuelta += 1) {
		let mejoro = false;
		for (let i = 0; i < ultimo; i += 1) {
			for (let j = i + 1; j < ultimo; j += 1) {
				const antes = pares(out);
				const a = out[i];
				const b = out[j];
				if (a === undefined || b === undefined) continue;
				out[i] = b;
				out[j] = a;
				if (pares(out) < antes) {
					mejoro = true;
				} else {
					out[i] = a;
					out[j] = b;
				}
			}
		}
		if (!mejoro) break;
	}
	return out;
}

export function planSession(input: {
	content: CurriculumIndex;
	state: ProgressState;
	activeUnitId: string;
	sessionLength: 5 | 6;
	seed: number;
}): PlannedExercise[] {
	const { content, state, activeUnitId, sessionLength, seed } = input;
	const rng = createRng(seed);
	const unit = content.units.get(activeUnitId);
	if (unit === undefined)
		throw new Error(`Unidad desconocida: ${activeUnitId}`);
	// Sin ítems que enseñar no hay sesión posible: con una unidad vacía este planificador
	// devolvía ejercicios repetidos y repasos mal etiquetados en vez de avisar.
	if (unit.introduces.length === 0)
		throw new Error(
			`La unidad ${activeUnitId} no introduce ningún ítem: no se puede planificar una sesión con ella`,
		);
	const sessionIndex = state.sessionCounter;
	const owners = owningUnits(content);
	const seen = seenItemIds(content, activeUnitId);
	const samePhase = samePhaseItemIds(content, unit);

	// Cuenta cuántas evaluaciones ya usaron cada plantilla, para no dejar que una domine la
	// sesión hasta el punto de que ninguna disposición pueda evitar dos seguidas.
	const templateCounts = new Map<TemplateId, number>();
	let templateCap = Number.POSITIVE_INFINITY;

	let counter = 0;
	const makeExercise = (
		itemId: string,
		kind: PlannedExercise["kind"],
		source: PlannedExercise["source"],
	): PlannedExercise => {
		const item = content.items.get(itemId);
		if (item === undefined) throw new Error(`Ítem desconocido: ${itemId}`);
		const ownerId = owners.get(itemId) ?? activeUnitId;
		const owner = content.units.get(ownerId) ?? unit;
		const templateId =
			kind === "evaluation"
				? pickTemplate(owner, item, rng, templateCounts, templateCap)
				: pickTemplate(owner, item, rng);
		if (kind === "evaluation")
			templateCounts.set(templateId, (templateCounts.get(templateId) ?? 0) + 1);
		const level: DistractorLevel =
			itemProgressOf(state, itemId).firstTryCorrect >= 1 ? "hard" : "easy";
		const { optionIds, correctOptionId } =
			kind === "presentation"
				? { optionIds: [], correctOptionId: null }
				: buildOptions({
						content,
						item,
						templateId,
						level,
						rng,
						seen,
						samePhase,
					});
		counter += 1;
		return {
			id: `ex-${counter}`,
			kind,
			templateId,
			itemId,
			optionIds,
			correctOptionId,
			source,
		};
	};

	// 1. Presentar lo nuevo, como máximo dos ítems.
	const unpresented = unit.introduces.filter(
		(id) => !itemProgressOf(state, id).presented,
	);
	const toPresent = unpresented.slice(0, MAX_PRESENTATIONS);
	const presentations = toPresent.map((id) =>
		makeExercise(id, "presentation", "active-unit"),
	);

	const budget = sessionLength - presentations.length;
	if (budget <= 0) return presentations;

	// 2. Repaso de otras unidades, de la caja más baja a la más alta.
	// Entra un ítem si está vencido según su caja, o si se presentó y nunca llegó a
	// acertarse (caja 0). Sin esa segunda condición, un ítem de una unidad que se completó
	// con el 80 % y que el niño nunca acertó quedaría abandonado para siempre: isDue
	// devuelve false para la caja 0, y su unidad ya no es la activa. Sería justo la letra
	// que más le cuesta la que dejaría de aparecer.
	const reviewPool = [...content.items.keys()]
		.filter((id) => owners.get(id) !== activeUnitId)
		.filter((id) => {
			const progress = itemProgressOf(state, id);
			return (
				isDue(progress, sessionIndex) ||
				(progress.presented && progress.box === 0)
			);
		})
		.sort((a, b) => {
			const pa = itemProgressOf(state, a);
			const pb = itemProgressOf(state, b);
			return (
				pa.box - pb.box ||
				pa.lastSessionIndex - pb.lastSessionIndex ||
				a.localeCompare(b)
			);
		});

	const reviewCount = Math.min(
		Math.round(REVIEW_SHARE * budget),
		reviewPool.length,
	);
	const activeCount = budget - reviewCount;

	// 3. Unidad activa: los menos dominados primero, ciclando si hay más huecos que ítems.
	const availableActive = unit.introduces.filter(
		(id) => itemProgressOf(state, id).presented || toPresent.includes(id),
	);
	const activeSorted = rng
		.shuffle(availableActive)
		.sort(
			(a, b) =>
				itemProgressOf(state, a).firstTryCorrect -
				itemProgressOf(state, b).firstTryCorrect,
		);

	const activeIds: string[] = [];
	const source = activeSorted.length > 0 ? activeSorted : reviewPool;
	for (let i = 0; i < activeCount && source.length > 0; i += 1) {
		const id = source[i % source.length];
		if (id !== undefined) activeIds.push(id);
	}

	// El tope evita que una sola plantilla acapare tantas evaluaciones que ninguna disposición
	// pueda ya evitar dos seguidas: con n evaluaciones, ninguna plantilla puede pasar de la mitad.
	const evaluationTotal = activeIds.length + reviewCount;
	templateCap = Math.max(1, Math.floor(evaluationTotal / 2));

	const evaluations = [
		...activeIds.map((id) => makeExercise(id, "evaluation", "active-unit")),
		...reviewPool
			.slice(0, reviewCount)
			.map((id) => makeExercise(id, "evaluation", "review")),
	];

	if (evaluations.length === 0) return presentations;

	// 4. Cerrar con el más fácil y evitar dos plantillas iguales seguidas.
	const easiest = evaluations.reduce((best, current) =>
		templates[current.templateId].difficulty <
		templates[best.templateId].difficulty
			? current
			: best,
	);
	const rest = evaluations.filter((e) => e.id !== easiest.id);
	const arranged = arrangeNoAdjacent(rest, rng, easiest.templateId);
	const mejorado = reduceAdjacency([...arranged, easiest]);

	return [...presentations, ...mejorado];
}
