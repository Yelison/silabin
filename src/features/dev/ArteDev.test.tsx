// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ICON_NAMES } from "@/components/Icon";
import { ArteDev } from "@/features/dev/ArteDev";

afterEach(cleanup);

describe("ArteDev", () => {
	it("V15: enseña la paleta, los compañeros, los fondos, las piezas, las bocas y los iconos", () => {
		const { container } = render(<ArteDev />);
		for (const titulo of [
			"Paleta",
			"Silabín — World Exploration",
			"Compañeros, sin y con gorra",
			"Fondos con la banda del mapa",
			"Pegatinas, trofeo y partículas",
			"Las seis bocas, a 128 px",
			"Iconos dentro de BigButton",
		])
			expect(screen.getByRole("heading", { name: titulo })).toBeDefined();
		expect(container.querySelectorAll("[data-token]")).toHaveLength(12);
		expect(container.querySelector("[data-world-composition]")).not.toBeNull();
		expect(container.querySelectorAll("[data-world-node]")).toHaveLength(10);
		// Cuatro compañeros (dos, con y sin gorra) a dos tamaños; cuatro fondos en dos formatos.
		expect(container.querySelectorAll('img[src*="companion-"]')).toHaveLength(
			8,
		);
		expect(container.querySelectorAll('img[src*="/bg-"]')).toHaveLength(8);
		expect(container.querySelectorAll("button")).toHaveLength(
			ICON_NAMES.length,
		);
	});

	it("R1: las seis bocas y la nota de que su arte está aplazado", () => {
		const { container } = render(<ArteDev />);
		const bocas = container.querySelectorAll("li [data-shape]");
		expect([...bocas].map((b) => b.getAttribute("data-shape"))).toEqual([
			"open",
			"spread",
			"round",
			"closed",
			"teeth",
			"tongue",
		]);
		const nota = container.querySelector('[data-nota="bocas-aplazadas"]');
		expect(nota?.textContent).toContain("aplazado");
	});
});
