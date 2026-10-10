// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { curriculum, type Unit, type UnitProgress } from "@/engine";
import { LLEGA_DESPUES, MapNode } from "@/features/map/MapNode";
import { nodeLook } from "@/features/map/node-look";

afterEach(cleanup);

function unidad(id: string): Unit {
	const unit = curriculum.units.get(id);
	if (unit === undefined) throw new Error(`falta la unidad ${id}`);
	return unit;
}

const CLAP = unidad("phase0:clap");
const RHYME = unidad("phase0:rhyme");

function pintar(
	unit: Unit,
	progress: UnitProgress | undefined,
	playable: boolean,
) {
	const onStart = vi.fn();
	const { container } = render(
		<MapNode
			unit={unit}
			progress={progress}
			playable={playable}
			onStart={onStart}
		/>,
	);
	const boton = container.querySelector("button");
	if (boton === null) throw new Error("no hay botón");
	return { boton, onStart };
}

const ACTIVA: UnitProgress = { status: "active", bestStars: 0 };
const BLOQUEADA: UnitProgress = { status: "locked", bestStars: 0 };
const HECHA: UnitProgress = { status: "done", bestStars: 2 };

describe("nodo del mapa (Plan 8, T2)", () => {
	it("N1: nodeLook traduce el estado del motor y si hay sesión jugable", () => {
		expect(nodeLook(undefined, true)).toBe("locked");
		expect(nodeLook("locked", true)).toBe("locked");
		expect(nodeLook("active", true)).toBe("available");
		expect(nodeLook("active", false)).toBe("soon");
		expect(nodeLook("done", false)).toBe("completed");
		expect(nodeLook("done", true)).toBe("completed");
	});

	it("N2: activa y jugable es el único nodo que arranca la sesión", () => {
		const { boton, onStart } = pintar(CLAP, ACTIVA, true);
		expect(boton.getAttribute("data-look")).toBe("available");
		expect(boton.getAttribute("data-status")).toBe("active");
		expect(boton.getAttribute("data-unit")).toBe(CLAP.id);
		expect(boton.getAttribute("type")).toBe("button");
		expect(boton.getAttribute("aria-current")).toBe("step");
		expect(boton.hasAttribute("aria-disabled")).toBe(false);
		expect(boton.getAttribute("aria-label")).toBe(CLAP.title);
		expect(boton.querySelector("[data-badge]")).toBeNull();
		fireEvent.click(boton);
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("N3: activa sin sesión jugable es «soon»: avisa, no arranca", () => {
		const { boton, onStart } = pintar(CLAP, ACTIVA, false);
		expect(boton.getAttribute("data-look")).toBe("soon");
		expect(boton.getAttribute("aria-label")).toBe(LLEGA_DESPUES);
		expect(boton.getAttribute("aria-disabled")).toBe("true");
		expect(boton.getAttribute("aria-current")).toBe("step");
		expect(boton.querySelector('[data-badge="soon"]')).not.toBeNull();
		expect(boton.querySelector('[data-badge="lock"]')).toBeNull();
		fireEvent.click(boton);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("N4: bloqueada se anuncia, lleva candado y símbolo, y no arranca", () => {
		const { boton, onStart } = pintar(RHYME, BLOQUEADA, true);
		expect(boton.getAttribute("data-look")).toBe("locked");
		expect(boton.getAttribute("aria-label")).toBe(
			"Rimas saltarinas, bloqueada",
		);
		expect(boton.getAttribute("aria-disabled")).toBe("true");
		expect(boton.hasAttribute("aria-current")).toBe(false);
		expect(boton.querySelector('[data-badge="lock"]')).not.toBeNull();
		expect(boton.querySelector("[data-symbol] svg")).not.toBeNull();
		expect(boton.hasAttribute("disabled")).toBe(false);
		fireEvent.click(boton);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("N5: terminada muestra sus estrellas y su insignia, y tocarla no hace nada", () => {
		const { boton, onStart } = pintar(CLAP, HECHA, true);
		expect(boton.getAttribute("data-look")).toBe("completed");
		expect(boton.getAttribute("data-status")).toBe("done");
		expect(boton.getAttribute("aria-label")).toMatch(/2 de 3 estrellas$/);
		const texto = boton.textContent ?? "";
		expect(texto.match(/★/g)?.length).toBe(2);
		// D59: solo las estrellas ganadas, sin huecos.
		expect(texto).not.toContain("☆");
		expect(boton.querySelector('[data-badge="check"]')).not.toBeNull();
		expect(boton.hasAttribute("aria-disabled")).toBe(false);
		fireEvent.click(boton);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("ST1: con 3 estrellas se ven tres ★ y ningún ☆", () => {
		const { boton } = pintar(CLAP, { status: "done", bestStars: 3 }, true);
		const texto = boton.textContent ?? "";
		expect(texto.match(/★/g)?.length).toBe(3);
		expect(texto).not.toContain("☆");
	});

	it("N6: sin progreso se pinta como bloqueada", () => {
		const { boton, onStart } = pintar(RHYME, undefined, true);
		expect(boton.getAttribute("data-look")).toBe("locked");
		expect(boton.getAttribute("data-status")).toBe("locked");
		expect(boton.getAttribute("aria-label")).toBe(
			"Rimas saltarinas, bloqueada",
		);
		expect(boton.getAttribute("aria-disabled")).toBe("true");
		expect(boton.querySelector('[data-badge="lock"]')).not.toBeNull();
		fireEvent.click(boton);
		expect(onStart).not.toHaveBeenCalled();
	});

	const ASPECTOS: [string, UnitProgress, boolean][] = [
		["available", ACTIVA, true],
		["soon", ACTIVA, false],
		["completed", HECHA, true],
		["locked", BLOQUEADA, true],
	];

	it.each(ASPECTOS)(
		"N7 (%s): objetivo grande, ficha opaca y sin px en línea",
		(look, progress, playable) => {
			const { boton } = pintar(CLAP, progress, playable);
			expect(boton.getAttribute("data-look")).toBe(look);
			expect(boton.className).toContain("min-h-18");
			expect(boton.className).toContain("min-w-18");
			const todos = [boton, ...boton.querySelectorAll("*")];
			for (const el of todos) {
				const clases = (el.getAttribute("class") ?? "").split(/\s+/);
				expect(
					clases.filter((c) => /(^|:)opacity-/.test(c)),
					el.outerHTML.slice(0, 80),
				).toEqual([]);
			}
			expect(boton.querySelector("[style*='px']")).toBeNull();
			expect(boton.getAttribute("style") ?? "").not.toContain("px");
		},
	);

	it.each(ASPECTOS)(
		"N7b (%s): el aro de «te toca» y el hundimiento al pulsar son solo del aspecto available",
		(look, progress, playable) => {
			const { boton } = pintar(CLAP, progress, playable);
			const clases = [boton, ...boton.querySelectorAll("*")].flatMap((el) =>
				(el.getAttribute("class") ?? "").split(/\s+/),
			);
			const esperado = look === "available";
			expect(
				clases.some((c) => c.includes("before:border-mark")),
				"aro",
			).toBe(esperado);
			expect(
				clases.some((c) => c.includes("active:translate-y-0.5")),
				"hundimiento",
			).toBe(esperado);
		},
	);

	it.each(ASPECTOS)(
		"N8 (%s): nunca hay barras de avance dentro del nodo",
		(_look, progress, playable) => {
			const { boton } = pintar(CLAP, progress, playable);
			expect(
				boton.querySelector(
					"[role='progressbar'], [role='meter'], progress, meter",
				),
			).toBeNull();
		},
	);
});
