// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	ChapterCard,
	FONDO_MUNDO,
	fondoDeMundo,
} from "@/features/map/ChapterCard";

afterEach(cleanup);

describe("ChapterCard", () => {
	it("CA1: la fase 0 es «MUNDO 1» con su nombre, su fondo y sin puntos", () => {
		const { container } = render(<ChapterCard phase={0} mastered={null} />);
		expect(screen.getByText("MUNDO 1")).toBeDefined();
		expect(screen.getByText("Oído de explorador")).toBeDefined();
		expect(container.firstElementChild?.className.split(/\s+/)).toContain(
			"bg-world-0",
		);
		expect(container.querySelector("[data-unit-dot]")).toBeNull();
		expect(screen.queryByRole("img")).toBeNull();
	});

	it("CA2: con dominados pinta un punto por ítem con su aria-label", () => {
		const { container } = render(<ChapterCard phase={2} mastered={3} />);
		expect(container.querySelectorAll("[data-unit-dot]")).toHaveLength(3);
		const puntos = screen.getByRole("img", { name: "3 letras aprendidas" });
		expect(puntos.className).toContain("flex-wrap");
		expect(container.firstElementChild?.className.split(/\s+/)).toContain(
			"bg-world-2",
		);
	});

	it("CA3: la fase 3 es «MUNDO 4», «Más letras» y bg-world-3", () => {
		const { container } = render(<ChapterCard phase={3} mastered={null} />);
		expect(screen.getByText("MUNDO 4")).toBeDefined();
		expect(screen.getByText("Más letras")).toBeDefined();
		expect(container.firstElementChild?.className.split(/\s+/)).toContain(
			"bg-world-3",
		);
	});

	it("CA3b: el registro fase → clase tiene exactamente las fases 0-3 y el resto cae en bg-world-3", () => {
		expect(Object.keys(FONDO_MUNDO).map(Number)).toEqual([0, 1, 2, 3]);
		expect(fondoDeMundo(0)).toBe("bg-world-0");
		expect(fondoDeMundo(1)).toBe("bg-world-1");
		expect(fondoDeMundo(2)).toBe("bg-world-2");
		expect(fondoDeMundo(3)).toBe("bg-world-3");
		expect(fondoDeMundo(7)).toBe("bg-world-3");
	});

	it("la tarjeta es opaca, con borde inferior de 4 px sin opacidad y texto en ink", () => {
		const { container } = render(<ChapterCard phase={1} mastered={null} />);
		const clases = container.firstElementChild?.className ?? "";
		expect(clases).toContain("border-b-4");
		// El filo usa su propio token: `node-locked-depth` casi no se veía sobre world-2 y world-3.
		expect(clases.split(/\s+/)).toContain("border-chapter-edge");
		expect(clases).not.toContain("border-node-locked-depth");
		expect(clases).toContain("text-ink");
		expect(clases).not.toMatch(/opacity|\/\d/);
	});
});
