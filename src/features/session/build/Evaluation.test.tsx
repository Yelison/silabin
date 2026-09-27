// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type AttemptFeedback,
	curriculum,
	type PlannedExercise,
	templates,
} from "@/engine";
import { Evaluation } from "@/features/session/build/Evaluation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

// jsdom no tiene layout ni `elementsFromPoint`: cada test de arrastre dice qué hay «bajo el
// dedo» al soltar, y la vista los busca con esa API (ver `arrastrar`).
const original = Object.getOwnPropertyDescriptor(document, "elementsFromPoint");
beforeEach(() => {
	// jsdom no implementa la captura de puntero: un método vacío que los tests pueden espiar.
	if (!("setPointerCapture" in HTMLElement.prototype))
		Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
			configurable: true,
			writable: true,
			value: () => {},
		});
	Object.defineProperty(document, "elementsFromPoint", {
		configurable: true,
		writable: true,
		value: vi.fn(() => []),
	});
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	if (original === undefined)
		Reflect.deleteProperty(document, "elementsFromPoint");
	else Object.defineProperty(document, "elementsFromPoint", original);
});

function datos(itemId: string, optionIds: string[]) {
	const item = curriculum.items.get(itemId);
	if (item === undefined) throw new Error(`Falta ${itemId}`);
	for (const id of optionIds)
		if (!curriculum.items.has(id)) throw new Error(`Falta ${id}`);
	const exercise: PlannedExercise = {
		id: `ev:${itemId}`,
		kind: "evaluation",
		templateId: "build",
		itemId,
		optionIds,
		correctOptionId: null,
		source: "active-unit",
	};
	return { item, exercise };
}

// El motor mezcla: aquí la bandeja sale desordenada a propósito.
const MA = () =>
	datos("syllable:ma", [
		"letter:e",
		"letter:m",
		"letter:a",
		"letter:l",
		"letter:i",
		"letter:o",
		"letter:u",
	]);
const LO = () =>
	datos("syllable:lo", [
		"letter:m",
		"letter:l",
		"letter:o",
		"letter:a",
		"letter:e",
		"letter:i",
		"letter:u",
	]);

const conPista = (rung: number): AttemptFeedback => ({
	hint: templates.build.hints[rung - 1] ?? null,
	resolution: rung === 3 ? { status: "assisted" } : null,
});

type Datos = ReturnType<typeof datos>;

function vista(
	d: Datos,
	o: {
		feedback?: AttemptFeedback | null;
		attemptKey?: number;
		locked?: boolean;
		onAnswer?: () => void;
		onModelDone?: () => void;
	},
): ReactElement {
	return (
		<Evaluation
			exercise={d.exercise}
			item={d.item}
			attemptKey={o.attemptKey ?? 0}
			feedback={o.feedback ?? null}
			locked={o.locked ?? false}
			onAnswer={o.onAnswer ?? vi.fn()}
			onModelDone={o.onModelDone ?? vi.fn()}
		/>
	);
}

function montar(
	d: Datos,
	inicial: { feedback?: AttemptFeedback | null; locked?: boolean } = {},
) {
	const audio = fakeAudio();
	const store = crearStore();
	const onAnswer = vi.fn();
	const onModelDone = vi.fn();
	const view = render(
		conProveedores(
			store,
			audio,
			vista(d, { ...inicial, attemptKey: 0, onAnswer, onModelDone }),
		),
	);
	/** Reenvía la vista con otras entradas, sin remontarla. */
	const cambiar = (o: {
		feedback?: AttemptFeedback | null;
		attemptKey?: number;
		locked?: boolean;
	}) =>
		view.rerender(
			conProveedores(store, audio, vista(d, { ...o, onAnswer, onModelDone })),
		);
	return { audio, onAnswer, onModelDone, cambiar, ...view };
}

const boton = (nombre: string) => screen.getByRole("button", { name: nombre });
const estado = (nombre: string) => boton(nombre).getAttribute("data-state");
const casilla = (n: 1 | 2) =>
	screen.getByRole("group", { name: `Casilla ${n}` });
const enCasilla = (n: 1 | 2) =>
	within(casilla(n))
		.queryAllByRole("button")
		.map((b) => b.getAttribute("aria-label"));
const claves = (audio: ReturnType<typeof fakeAudio>) =>
	audio.play.mock.calls.map((c) => c[0]);
const tocar = (...nombres: string[]) => {
	for (const n of nombres) fireEvent.click(boton(n));
};

/** Arrastra una pieza y la suelta sobre `destino` (una casilla) o fuera de ellas (`null`). */
function arrastrar(
	nombre: string,
	destino: HTMLElement | null,
	{ mover = true }: { mover?: boolean } = {},
) {
	const pieza = boton(nombre);
	// Lo que hay bajo el dedo, de arriba abajo: la propia pieza y luego la casilla.
	(document.elementsFromPoint as ReturnType<typeof vi.fn>).mockImplementation(
		() => (destino === null ? [pieza, document.body] : [pieza, destino]),
	);
	fireEvent.pointerDown(pieza, { pointerId: 1, clientX: 10, clientY: 10 });
	if (mover)
		fireEvent.pointerMove(pieza, { pointerId: 1, clientX: 80, clientY: 90 });
	fireEvent.pointerUp(pieza, { pointerId: 1, clientX: 80, clientY: 90 });
}

describe("build / Evaluation", () => {
	it("B1: tocar m y luego a responde «ma» una sola vez", () => {
		const m = montar(MA());
		tocar("m");
		expect(m.onAnswer).not.toHaveBeenCalled();
		tocar("a");
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).toHaveBeenCalledWith("ma");
		expect(m.onModelDone).not.toHaveBeenCalled();
	});

	it("tocar lleva la pieza a la primera casilla libre y la saca de la bandeja", () => {
		montar(MA());
		tocar("a");
		expect(enCasilla(1)).toEqual(["a"]);
		expect(enCasilla(2)).toEqual([]);
		tocar("m");
		expect(enCasilla(2)).toEqual(["m"]);
	});

	it("la respuesta va en el orden de las casillas, no en el que se tocó", () => {
		const m = montar(MA());
		arrastrar("a", casilla(2));
		expect(enCasilla(2)).toEqual(["a"]);
		arrastrar("m", casilla(1));
		expect(m.onAnswer).toHaveBeenCalledWith("ma");
	});

	it("B2: arrastrar m a la casilla 1 y a a la 2 responde «ma»", () => {
		const m = montar(MA());
		arrastrar("m", casilla(1));
		expect(enCasilla(1)).toEqual(["m"]);
		arrastrar("a", casilla(2));
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).toHaveBeenCalledWith("ma");
	});

	it("B3: cuatro toques seguidos dan una sola respuesta y las piezas sobrantes no entran", () => {
		const m = montar(MA());
		tocar("m", "a", "l", "e");
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).toHaveBeenCalledWith("ma");
		expect(enCasilla(1)).toEqual(["m"]);
		expect(enCasilla(2)).toEqual(["a"]);
		expect(estado("l")).toBe("idle");
		expect(boton("l").getAttribute("aria-disabled")).toBe("true");
	});

	it("B3: llenas las casillas, tocar una pieza colocada no responde otra vez", () => {
		const m = montar(MA());
		tocar("m", "a", "m", "a");
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(enCasilla(1)).toEqual(["m"]);
		expect(enCasilla(2)).toEqual(["a"]);
	});

	it("B3: llenas las casillas, arrastrar tampoco mueve nada ni responde otra vez", () => {
		const m = montar(MA());
		tocar("m", "a");
		arrastrar("l", casilla(1));
		arrastrar("a", null);
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(enCasilla(1)).toEqual(["m"]);
		expect(enCasilla(2)).toEqual(["a"]);
	});

	it("B4: tocar una pieza colocada la devuelve a la bandeja y su casilla queda libre", () => {
		const m = montar(MA());
		tocar("m");
		tocar("m");
		expect(enCasilla(1)).toEqual([]);
		expect(m.onAnswer).not.toHaveBeenCalled();
		tocar("l", "a");
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).toHaveBeenCalledWith("la");
	});

	it("con la casilla 1 libre y la 2 ocupada, tocar rellena la 1", async () => {
		const m = montar(MA());
		arrastrar("a", casilla(2));
		expect(enCasilla(1)).toEqual([]);
		await act(async () => {
			await new Promise((r) => setTimeout(r, 0)); // pasa el clic que sigue a soltar
		});
		tocar("l");
		expect(enCasilla(1)).toEqual(["l"]);
		expect(m.onAnswer).toHaveBeenCalledWith("la");
	});

	it("B5: con locked, ni tocar ni arrastrar colocan nada", () => {
		const m = montar(MA(), { locked: true });
		tocar("m", "a");
		arrastrar("m", casilla(1));
		expect(enCasilla(1)).toEqual([]);
		expect(enCasilla(2)).toEqual([]);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("B5: si se bloquea a mitad de arrastre, soltar sobre la casilla no coloca", () => {
		const m = montar(MA());
		const pieza = boton("m");
		(document.elementsFromPoint as ReturnType<typeof vi.fn>).mockImplementation(
			() => [casilla(1)],
		);
		fireEvent.pointerDown(pieza, { pointerId: 1, clientX: 0, clientY: 0 });
		fireEvent.pointerMove(pieza, { pointerId: 1, clientX: 50, clientY: 50 });
		m.cambiar({ locked: true });
		fireEvent.pointerUp(boton("m"), { pointerId: 1, clientX: 50, clientY: 50 });
		expect(enCasilla(1)).toEqual([]);
	});

	it("B5: con locked, las piezas colocadas tampoco vuelven a la bandeja", () => {
		const m = montar(MA());
		tocar("m");
		m.cambiar({ locked: true });
		tocar("m");
		expect(enCasilla(1)).toEqual(["m"]);
	});

	it("B6: soltar una pieza fuera de las casillas la deja en la bandeja, sin responder", () => {
		const m = montar(MA());
		arrastrar("m", null);
		expect(enCasilla(1)).toEqual([]);
		expect(enCasilla(2)).toEqual([]);
		expect(boton("m")).toBeDefined();
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("B6: soltar una pieza colocada fuera de las casillas la devuelve a la bandeja", () => {
		const m = montar(MA());
		tocar("m");
		arrastrar("m", null);
		expect(enCasilla(1)).toEqual([]);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("una pieza colocada se puede arrastrar a la otra casilla", () => {
		montar(MA());
		tocar("m");
		arrastrar("m", casilla(2));
		expect(enCasilla(1)).toEqual([]);
		expect(enCasilla(2)).toEqual(["m"]);
	});

	it("R15: tocar y arrastrar dejan exactamente el mismo estado", () => {
		const porToque = montar(MA());
		tocar("m", "l");
		const htmlToque = porToque.container.innerHTML;
		cleanup();
		const porArrastre = montar(MA());
		arrastrar("m", casilla(1));
		arrastrar("l", casilla(2));
		expect(porArrastre.container.innerHTML).toBe(htmlToque);
		expect(porArrastre.onAnswer).toHaveBeenCalledWith("ml");
	});

	it("R15: a medio arrastre la pieza sigue al dedo y al soltar no queda ninguna transformación", () => {
		montar(MA());
		const pieza = boton("m");
		fireEvent.pointerDown(pieza, { pointerId: 1, clientX: 10, clientY: 10 });
		fireEvent.pointerMove(pieza, { pointerId: 1, clientX: 60, clientY: 40 });
		const envoltorio = boton("m").closest("[data-piece]") as HTMLElement;
		expect(envoltorio.style.transform).toBe("translate(50px, 30px)");
		fireEvent.pointerUp(boton("m"), { pointerId: 1, clientX: 60, clientY: 40 });
		expect(
			(boton("m").closest("[data-piece]") as HTMLElement).style.transform,
		).toBe("");
	});

	it("un movimiento pequeño no cuenta como arrastre: el toque coloca una sola vez", () => {
		const m = montar(MA());
		const pieza = boton("m");
		fireEvent.pointerDown(pieza, { pointerId: 1, clientX: 10, clientY: 10 });
		fireEvent.pointerMove(pieza, { pointerId: 1, clientX: 12, clientY: 11 });
		fireEvent.pointerUp(pieza, { pointerId: 1, clientX: 12, clientY: 11 });
		expect(enCasilla(1)).toEqual([]); // aún no: el toque llega con el clic
		fireEvent.click(pieza);
		expect(enCasilla(1)).toEqual(["m"]);
		tocar("a");
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
	});

	describe("M8: con el dedo, un movimiento menor que el umbral es un toque", () => {
		/** Un dedo (o un ratón) que baja, se mueve `dx` px y sube; el clic, si lo hay, lo manda el test. */
		function deslizar(nombre: string, dx: number, pointerType: string) {
			const pieza = boton(nombre);
			const base = { pointerId: 1, pointerType, clientY: 10 };
			fireEvent.pointerDown(pieza, { ...base, clientX: 10 });
			fireEvent.pointerMove(pieza, { ...base, clientX: 10 + dx });
			fireEvent.pointerUp(pieza, { ...base, clientX: 10 + dx });
			return pieza;
		}

		it.each([0, 3, 6, 8, 9])(
			"con el dedo, %i px sin clic (Chromium no lo manda) colocan la pieza",
			(dx) => {
				montar(MA());
				deslizar("m", dx, "touch");
				expect(enCasilla(1)).toEqual(["m"]);
			},
		);

		it("con el dedo, el clic que sí llega tras un toque no lo deshace ni lo repite", () => {
			const m = montar(MA());
			// La pieza cambia de sitio al colocarla: el clic llega a la que hay ahora.
			deslizar("m", 2, "touch");
			fireEvent.click(boton("m"));
			expect(enCasilla(1)).toEqual(["m"]);
			deslizar("a", 2, "touch");
			fireEvent.click(boton("a"));
			expect(enCasilla(2)).toEqual(["a"]);
			expect(m.onAnswer).toHaveBeenCalledTimes(1);
			expect(m.onAnswer).toHaveBeenCalledWith("ma");
		});

		it("con el dedo, tocar una pieza colocada la devuelve a la bandeja, con clic o sin él", () => {
			montar(MA());
			deslizar("m", 8, "touch");
			expect(enCasilla(1)).toEqual(["m"]);
			deslizar("m", 1, "touch");
			fireEvent.click(boton("m"));
			expect(enCasilla(1)).toEqual([]);
			deslizar("m", 8, "touch");
			expect(enCasilla(1)).toEqual(["m"]);
			deslizar("m", 8, "touch");
			expect(enCasilla(1)).toEqual([]);
		});

		it("con el dedo, 10 px o más siguen siendo un arrastre (R22) y no un toque", () => {
			montar(MA());
			// Lo que hay bajo el dedo al soltar: la casilla 2.
			const pieza = boton("m");
			(
				document.elementsFromPoint as ReturnType<typeof vi.fn>
			).mockImplementation(() => [pieza, casilla(2)]);
			deslizar("m", 10, "touch");
			expect(enCasilla(1)).toEqual([]);
			expect(enCasilla(2)).toEqual(["m"]);
			// Y el clic que Chromium suele omitir tras un arrastre no cambia nada.
			fireEvent.click(pieza);
			expect(enCasilla(2)).toEqual(["m"]);
		});

		it("con el ratón, un movimiento pequeño lo resuelve solo el clic: una vez, no dos", () => {
			montar(MA());
			const pieza = deslizar("m", 2, "mouse");
			expect(enCasilla(1)).toEqual([]);
			fireEvent.click(pieza);
			expect(enCasilla(1)).toEqual(["m"]);
			tocar("m");
			expect(enCasilla(1)).toEqual([]);
		});

		it("con el dedo, un clic de teclado o lector de pantalla posterior sí cuenta", async () => {
			montar(MA());
			deslizar("m", 8, "touch"); // sin clic: el aviso de «viene un clic» caduca solo
			expect(enCasilla(1)).toEqual(["m"]);
			await act(async () => {
				await new Promise((r) => setTimeout(r, 500));
			});
			tocar("m");
			expect(enCasilla(1)).toEqual([]);
		});

		it("R20: en el modelo, la pieza fuera de turno no responde al dedo, ni con clic", () => {
			const m = montar(LO(), { feedback: conPista(3) });
			deslizar("o", 3, "touch"); // la vocal antes que la consonante
			fireEvent.click(boton("o"));
			deslizar("m", 8, "touch"); // una pieza que no es del modelo
			expect(enCasilla(1)).toEqual([]);
			expect(enCasilla(2)).toEqual([]);
			deslizar("l", 8, "touch");
			expect(enCasilla(1)).toEqual(["l"]);
			deslizar("o", 8, "touch");
			expect(m.onModelDone).toHaveBeenCalledTimes(1);
			expect(m.onAnswer).not.toHaveBeenCalled();
		});

		it("con locked, el dedo no coloca nada", () => {
			montar(MA(), { locked: true });
			deslizar("m", 3, "touch");
			fireEvent.click(boton("m"));
			deslizar("a", 8, "touch");
			expect(enCasilla(1)).toEqual([]);
			expect(enCasilla(2)).toEqual([]);
		});
	});

	it("el clic que llega justo tras un arrastre no vuelve a mover la pieza", async () => {
		montar(MA());
		const pieza = boton("m");
		arrastrar("m", null);
		fireEvent.click(pieza); // el navegador lo manda tras soltar
		expect(enCasilla(1)).toEqual([]);
		await act(async () => {
			await new Promise((r) => setTimeout(r, 0));
		});
		tocar("m"); // un toque de verdad, después, sí cuenta
		expect(enCasilla(1)).toEqual(["m"]);
	});

	it("soltar una pieza sobre una casilla ocupada la lleva a la libre", () => {
		montar(MA());
		tocar("m");
		arrastrar("a", casilla(1));
		expect(enCasilla(1)).toEqual(["m"]);
		expect(enCasilla(2)).toEqual(["a"]);
	});

	it("B7: pista 1 en syllable:lo atenúa y deshabilita m, y las demás siguen activas", () => {
		const m = montar(LO(), { feedback: conPista(1) });
		m.cambiar({ feedback: conPista(1), attemptKey: 1 });
		expect(estado("m")).toBe("dimmed");
		expect(boton("m").getAttribute("aria-disabled")).toBe("true");
		for (const n of ["l", "o", "a", "e", "i", "u"]) {
			expect(estado(n), n).toBe("idle");
			expect(boton(n).getAttribute("aria-disabled"), n).toBe("false");
		}
		tocar("m");
		expect(enCasilla(1)).toEqual([]);
		arrastrar("m", casilla(1));
		expect(enCasilla(1)).toEqual([]);
	});

	it("B7: la atenuación se mantiene en el intento 3, con otra pista", () => {
		const m = montar(LO(), { feedback: conPista(1) });
		m.cambiar({ feedback: conPista(1), attemptKey: 1 });
		m.cambiar({ feedback: conPista(2), attemptKey: 2 });
		m.cambiar({ feedback: conPista(2), attemptKey: 3 });
		expect(estado("m")).toBe("dimmed");
		expect(estado("l")).toBe("idle");
		tocar("m");
		expect(enCasilla(1)).toEqual([]);
	});

	it("B7: la pista 1 no pide ningún audio y no atenúa la consonante correcta", () => {
		const m = montar(MA(), { feedback: conPista(1) });
		expect(estado("m")).toBe("idle");
		expect(estado("l")).toBe("dimmed");
		expect(estado("a")).toBe("idle");
		expect(claves(m.audio)).toEqual([]);
	});

	it("B8: pista 2 en syllable:lo hace pulsar la pieza o y suena phoneme:o", () => {
		const m = montar(LO(), { feedback: conPista(2) });
		expect(estado("o")).toBe("pulsing");
		for (const n of ["m", "l", "a", "e", "i", "u"])
			expect(estado(n), n).toBe("idle");
		expect(claves(m.audio)).toEqual([{ key: "phoneme:o" }]);
		tocar("l", "o");
		expect(m.onAnswer).toHaveBeenCalledWith("lo");
	});

	it("B8: el pulso se apaga con el intento siguiente", () => {
		const pista = conPista(2);
		const m = montar(LO(), { feedback: pista });
		expect(estado("o")).toBe("pulsing");
		m.cambiar({ feedback: pista, attemptKey: 1 });
		expect(estado("o")).toBe("idle");
	});

	it("B9: pista 3 marca las dos piezas con su número de orden", () => {
		montar(LO(), { feedback: conPista(3) });
		expect(estado("l")).toBe("marked");
		expect(estado("o")).toBe("marked");
		expect(within(boton("l")).getByText("1")).toBeDefined();
		expect(within(boton("o")).getByText("2")).toBeDefined();
		for (const n of ["m", "a", "e", "i", "u"])
			expect(within(boton(n)).queryByText(/^[12]$/), n).toBeNull();
	});

	it("B9: solo se acepta en orden: la vocal primero no coloca; al final, onModelDone y ningún onAnswer", () => {
		const m = montar(LO(), { feedback: conPista(3) });
		tocar("o");
		expect(enCasilla(1)).toEqual([]);
		expect(enCasilla(2)).toEqual([]);
		arrastrar("o", casilla(1));
		expect(enCasilla(1)).toEqual([]);
		tocar("m", "a"); // otras piezas: tampoco
		expect(enCasilla(1)).toEqual([]);
		tocar("l");
		expect(enCasilla(1)).toEqual(["l"]);
		expect(m.onModelDone).not.toHaveBeenCalled();
		tocar("o");
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("B9: el modelo también se completa arrastrando, y la vocal soltada en la casilla 2 no salta el orden", () => {
		const m = montar(LO(), { feedback: conPista(3) });
		arrastrar("o", casilla(2));
		expect(enCasilla(2)).toEqual([]);
		arrastrar("l", casilla(2)); // en el modelo se llena en orden, aunque se suelte en la 2
		expect(enCasilla(1)).toEqual(["l"]);
		arrastrar("o", casilla(2));
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("B9: en el modelo, la pieza ya colocada no vuelve a la bandeja (ni tocando ni arrastrando)", () => {
		const m = montar(LO(), { feedback: conPista(3) });
		tocar("l");
		tocar("l");
		expect(enCasilla(1)).toEqual(["l"]);
		arrastrar("l", null);
		expect(enCasilla(1)).toEqual(["l"]);
		tocar("o");
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
	});

	it("C1: el tercer fallo llega con el MISMO attemptKey y las casillas llenas: se vacían y el modelo se completa", () => {
		const m = montar(MA(), { feedback: conPista(2) });
		m.cambiar({ feedback: conPista(2), attemptKey: 1 });
		tocar("a", "e"); // respuesta errónea que llena las casillas
		expect(enCasilla(1)).toEqual(["a"]);
		expect(enCasilla(2)).toEqual(["e"]);
		m.cambiar({ feedback: conPista(3), attemptKey: 1 });
		expect(enCasilla(1)).toEqual([]);
		expect(enCasilla(2)).toEqual([]);
		tocar("a"); // fuera de orden
		expect(enCasilla(1)).toEqual([]);
		tocar("m");
		expect(enCasilla(1)).toEqual(["m"]);
		expect(m.onModelDone).not.toHaveBeenCalled();
		tocar("a");
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).toHaveBeenCalledTimes(1); // solo la errónea de antes
		expect(m.onAnswer).toHaveBeenCalledWith("ae");
	});

	it("C1: volver a pintar con la misma pista 3 no vacía lo que el niño ya colocó del modelo", () => {
		const pista = conPista(3);
		const m = montar(MA(), { feedback: pista });
		tocar("m");
		m.cambiar({ feedback: pista, attemptKey: 0 });
		expect(enCasilla(1)).toEqual(["m"]);
	});

	it("I1: un toque sin movimiento no captura el puntero (con ratón retargetearía el clic)", () => {
		const captura = vi.fn();
		vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(
			captura,
		);
		const m = montar(MA());
		const pieza = boton("m");
		fireEvent.pointerDown(pieza, { pointerId: 1, clientX: 10, clientY: 10 });
		fireEvent.pointerUp(pieza, { pointerId: 1, clientX: 10, clientY: 10 });
		fireEvent.click(pieza);
		expect(captura).not.toHaveBeenCalled();
		expect(enCasilla(1)).toEqual(["m"]);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("I1: el puntero se captura una sola vez, al superar el umbral de arrastre", () => {
		const captura = vi.fn();
		vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(
			captura,
		);
		montar(MA());
		const pieza = boton("m");
		fireEvent.pointerDown(pieza, { pointerId: 7, clientX: 10, clientY: 10 });
		fireEvent.pointerMove(pieza, { pointerId: 7, clientX: 13, clientY: 10 });
		expect(captura).not.toHaveBeenCalled();
		fireEvent.pointerMove(pieza, { pointerId: 7, clientX: 40, clientY: 10 });
		fireEvent.pointerMove(pieza, { pointerId: 7, clientX: 60, clientY: 10 });
		expect(captura).toHaveBeenCalledTimes(1);
		expect(captura).toHaveBeenCalledWith(7);
	});

	it("B9: terminado el modelo, nada más responde ni avisa otra vez", () => {
		const m = montar(LO(), { feedback: conPista(3) });
		tocar("l", "o", "l", "o", "m");
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(enCasilla(1)).toEqual(["l"]);
		expect(enCasilla(2)).toEqual(["o"]);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("B9: en el modelo, con locked, no se coloca nada", () => {
		const m = montar(LO(), { feedback: conPista(3), locked: true });
		tocar("l");
		expect(enCasilla(1)).toEqual([]);
		expect(m.onModelDone).not.toHaveBeenCalled();
	});

	it("B10: un attemptKey nuevo vacía las casillas y devuelve las piezas a la bandeja", () => {
		const m = montar(MA());
		tocar("m", "a");
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		m.cambiar({ attemptKey: 1 });
		expect(enCasilla(1)).toEqual([]);
		expect(enCasilla(2)).toEqual([]);
		expect(boton("m")).toBeDefined();
		expect(boton("a")).toBeDefined();
		tocar("l", "a");
		expect(m.onAnswer).toHaveBeenCalledTimes(2);
		expect(m.onAnswer).toHaveBeenLastCalledWith("la");
	});

	it("B10: el mismo attemptKey no vacía nada aunque cambie otra cosa", () => {
		const m = montar(MA());
		tocar("m");
		m.cambiar({ attemptKey: 0, locked: false });
		expect(enCasilla(1)).toEqual(["m"]);
	});

	it("una acción de pista que no se conoce no hace nada", () => {
		const m = montar(MA(), {
			feedback: {
				hint: { rung: "reduce", action: "algo-nuevo", note: "" },
				resolution: null,
			},
		});
		expect(estado("m")).toBe("idle");
		expect(claves(m.audio)).toEqual([]);
	});

	it("el altavoz repite la sílaba y se apaga con locked", () => {
		const m = montar(MA());
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves(m.audio)).toEqual([{ key: "syllable:ma" }]);
		m.cambiar({ locked: true });
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves(m.audio)).toHaveLength(1);
	});

	it("piezas y casillas usan la fuente de lectura y objetivos táctiles de 72 px o más", () => {
		montar(MA());
		for (const n of ["m", "a", "e"]) {
			const b = boton(n);
			expect(b.className).toContain("font-reading");
			expect(b.className).toMatch(/min-h-(18|2\d|target)/);
			expect(b.closest("[data-piece]")?.className).toContain("touch-none");
		}
		for (const n of [1, 2] as const) {
			expect(casilla(n).className).toContain("font-reading");
			expect(casilla(n).className).toMatch(/min-h-(18|2\d|target)/);
		}
	});

	it("con el reproductor que falla, la vista sigue respondiendo", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		const d = LO();
		const onAnswer = vi.fn();
		render(
			conProveedores(
				crearStore(),
				audio,
				vista(d, { feedback: conPista(2), attemptKey: 1, onAnswer }),
			),
		);
		await act(async () => {});
		tocar("l", "o");
		expect(onAnswer).toHaveBeenCalledWith("lo");
	});

	it("datos incoherentes (la consonante no está en las piezas de la pista 1) no se ocultan", () => {
		const d = LO();
		d.exercise.optionIds = ["letter:o", "letter:a"];
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				conProveedores(
					crearStore(),
					fakeAudio(),
					vista(d, { feedback: conPista(1), attemptKey: 1 }),
				),
			),
		).not.toThrow(); // la consonante sí existe en el currículo: solo faltan piezas
		cleanup();
		const roto = LO();
		roto.item = { ...roto.item, phonemes: ["ñ", "o"] }; // letter:ñ no existe
		expect(() =>
			render(
				conProveedores(
					crearStore(),
					fakeAudio(),
					vista(roto, { feedback: conPista(1), attemptKey: 1 }),
				),
			),
		).toThrow(/letter:ñ/);
		vi.restoreAllMocks();
	});
});
