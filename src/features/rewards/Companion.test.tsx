// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Companion } from "@/features/rewards/Companion";
import {
	conProveedores,
	crearStore,
	documentoConUnidadesHechas,
	fakeAudio,
} from "@/features/test-support";
import { createMemoryAdapter } from "@/store";

afterEach(cleanup);

async function montar(
	unlockedAt: Record<string, string>,
	companion: string | null = null,
) {
	const doc = documentoConUnidadesHechas(null);
	const store = crearStore(
		createMemoryAdapter({
			...doc,
			rewards: {
				unlockedAt,
				equipped: { background: null, companion, trail: null },
			},
		}),
	);
	await store.getState().load();
	render(conProveedores(store, fakeAudio(), <Companion />));
}

const GANADOS = {
	"five-vowels": "2026-09-26T12:00:00.000Z",
	"ten-sessions": "2026-09-26T12:00:00.000Z",
};

describe("Companion", () => {
	it("AR6: por defecto pinta companion-1 a 112 px dentro de su role=img", async () => {
		await montar({});
		const compa = screen.getByRole("img", { name: "Tu compañero" });
		expect(compa.getAttribute("data-companion")).toBe("companion:first");
		expect(compa.getAttribute("data-wears-cap")).toBe("false");
		const img = compa.querySelector("img");
		expect(img?.getAttribute("src")).toMatch(/\/companion-1\.webp$/);
		expect(img?.getAttribute("width")).toBe("112");
		expect(img?.getAttribute("height")).toBe("112");
	});

	it("AR7: con companion:second y la gorra ganada pinta la imagen con gorra y ningún 🧢", async () => {
		await montar(GANADOS, "companion:second");
		const compa = screen.getByRole("img", { name: "Tu compañero" });
		expect(compa.getAttribute("data-wears-cap")).toBe("true");
		expect(compa.querySelector("img")?.getAttribute("src")).toMatch(
			/\/companion-2-gorra\.webp$/,
		);
		expect(document.body.textContent).not.toContain("🧢");
	});

	it("AR8: companion:second equipado sin five-vowels (documento importado) pinta companion-1: manda resolveEquipped", async () => {
		await montar({}, "companion:second");
		const compa = screen.getByRole("img", { name: "Tu compañero" });
		expect(compa.getAttribute("data-companion")).toBe("companion:first");
		expect(compa.querySelector("img")?.getAttribute("src")).toMatch(
			/\/companion-1\.webp$/,
		);
	});

	it("si la imagen no carga queda el emoji del compañero, sin la caja vacía", async () => {
		await montar({});
		const compa = screen.getByRole("img", { name: "Tu compañero" });
		const img = compa.querySelector("img");
		if (img === null) throw new Error("falta la imagen");
		fireEvent.error(img);
		expect(compa.querySelector("img")).toBeNull();
		expect(compa.querySelector("[data-art-fallback]")?.textContent).toBe("🦜");
	});

	it("sin ten-sessions no lleva gorra", async () => {
		await montar({});
		expect(
			screen
				.getByRole("img", { name: "Tu compañero" })
				.getAttribute("data-wears-cap"),
		).toBe("false");
	});

	it("con ten-sessions ganado lleva la gorra", async () => {
		await montar({ "ten-sessions": "2026-09-26T12:00:00.000Z" });
		expect(
			screen
				.getByRole("img", { name: "Tu compañero" })
				.getAttribute("data-wears-cap"),
		).toBe("true");
	});
});
