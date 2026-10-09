// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { curriculum } from "@/engine";
import { BadgeIcon, UnitIcon } from "@/features/map/UnitIcon";
import {
	BADGE_ICONS,
	type BadgeId,
	UNIT_ICONS,
} from "@/features/map/unit-icons";

afterEach(cleanup);

const IDS = curriculum.unitOrder;

describe("iconos de unidad (Plan 8, T1)", () => {
	it("UI1: cada unidad del currículo tiene su icono, no vacío", () => {
		for (const id of IDS) {
			expect(UNIT_ICONS[id], id).toBeDefined();
			expect(UNIT_ICONS[id]?.length, id).toBeGreaterThan(0);
		}
	});

	it("UI2: UNIT_ICONS tiene exactamente las unidades del currículo", () => {
		expect(Object.keys(UNIT_ICONS).sort()).toEqual([...IDS].sort());
	});

	it("UI3: las letras llevan data-letter y las demás no", () => {
		for (const id of ["phase1:vowel-a", "phase2:m", "phase3:enie"]) {
			const { container } = render(<UnitIcon unitId={id} />);
			expect(
				container.querySelector('svg[data-letter="true"]'),
				id,
			).not.toBeNull();
			cleanup();
		}
		const { container } = render(<UnitIcon unitId="phase0:clap" />);
		expect(container.querySelector("svg")?.hasAttribute("data-letter")).toBe(
			false,
		);
	});

	it("UI4: ninguna forma lleva un color fijo", () => {
		const formas = [
			...Object.values(UNIT_ICONS).flat(),
			...Object.values(BADGE_ICONS).flat(),
		];
		for (const [, attrs] of formas) {
			for (const clave of ["fill", "stroke"]) {
				const valor = attrs[clave];
				if (valor !== undefined)
					expect(["currentColor", "none"]).toContain(valor);
			}
		}
	});

	it("UI5: el icono se oculta a los lectores y no usa <img>", () => {
		for (const id of IDS) {
			const { container } = render(<UnitIcon unitId={id} />);
			expect(
				container.querySelector("svg")?.getAttribute("aria-hidden"),
				id,
			).toBe("true");
			expect(container.querySelector("img"), id).toBeNull();
			cleanup();
		}
		for (const badge of Object.keys(BADGE_ICONS) as BadgeId[]) {
			const { container } = render(<BadgeIcon badge={badge} />);
			expect(
				container.querySelector("svg")?.getAttribute("aria-hidden"),
				badge,
			).toBe("true");
			cleanup();
		}
	});

	it("UI6: un id desconocido pinta un <svg> vacío sin lanzar", () => {
		const { container } = render(<UnitIcon unitId="no:existe" />);
		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		expect(svg?.childElementCount).toBe(0);
	});
});
