// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RewardsScreen } from "@/features/rewards/RewardsScreen";
import {
	conProveedores,
	crearStore,
	documentoConUnidadesHechas,
	fakeAudio,
} from "@/features/test-support";
import { createMemoryAdapter } from "@/store";

afterEach(cleanup);

/** Un store cargado con `unlockedAt` ya resuelto, listo para montar la galería. */
async function montar(unlockedAt: Record<string, string> = {}) {
	const doc = documentoConUnidadesHechas(null);
	const store = crearStore(
		createMemoryAdapter({
			...doc,
			rewards: {
				unlockedAt,
				equipped: { background: null, companion: null, trail: null },
			},
		}),
	);
	await store.getState().load();
	const onClose = vi.fn();
	render(
		conProveedores(store, fakeAudio(), <RewardsScreen onClose={onClose} />),
	);
	return { store, onClose };
}

describe("RewardsScreen", () => {
	it("M4/M5: los títulos son solo para lectores de pantalla (spec §9) y los objetivos táctiles van a 16 px", async () => {
		await montar();
		const titulos = screen.getAllByRole("heading");
		expect(titulos.length).toBeGreaterThanOrEqual(5);
		for (const titulo of titulos) expect(titulo.className).toContain("sr-only");
		const filas = document.querySelectorAll("section > div");
		expect(filas.length).toBe(4);
		for (const fila of filas) {
			expect(fila.className).toContain("gap-4");
			expect(fila.className).not.toContain("gap-3");
		}
	});

	it("F2: con first-session ganado, Pradera se puede equipar y queda marcada con ✓; Espacio no llama a nada", async () => {
		const { store } = await montar({
			"first-session": "2026-09-26T12:00:00.000Z",
		});

		const pradera = screen.getByRole("button", { name: "Pradera" });
		await userEvent.setup().click(pradera);
		// El toque llama a `equip("bg:pradera")`: su efecto real es lo que el store guarda.
		expect(store.getState().doc.rewards.equipped.background).toBe("bg:pradera");
		expect(pradera.getAttribute("data-equipped")).toBe("true");
		expect(pradera.textContent).toContain("✓");

		const espacio = document.querySelector('[data-cosmetic="bg:espacio"]');
		if (espacio === null) throw new Error("falta bg:espacio");
		expect(espacio.getAttribute("aria-label")).toBe("Por descubrir");
		await userEvent.setup().click(espacio);
		// Espacio sigue bloqueado: el toque no cambia nada.
		expect(store.getState().doc.rewards.equipped.background).toBe("bg:pradera");
		expect(espacio.tagName).not.toBe("BUTTON");
	});

	it("F3: lo no ganado del álbum tiene aria-label «Por descubrir» y no es un botón", async () => {
		await montar({ "first-session": "2026-09-26T12:00:00.000Z" });
		const porDescubrir = screen.getAllByRole("img", { name: "Por descubrir" });
		expect(porDescubrir.length).toBeGreaterThan(0);
		for (const el of porDescubrir) {
			expect(el.tagName).not.toBe("BUTTON");
		}
		// vowel-a no está ganado con solo first-session: aparece como "Por descubrir".
		const vowelA = document.querySelector('[data-reward="vowel-a"]');
		expect(vowelA?.getAttribute("aria-label")).toBe("Por descubrir");
		expect(vowelA?.getAttribute("data-earned")).toBe("false");
		expect(vowelA?.tagName).not.toBe("BUTTON");
	});

	it("AR10: el álbum pinta la pieza de cada logro, la no ganada en gris, y no muestra ninguna cifra", async () => {
		await montar({ "vowel-a": "2026-09-26T12:00:00.000Z" });
		const ganado = document.querySelector('[data-reward="vowel-a"]');
		expect(ganado?.querySelector("img")?.getAttribute("src")).toMatch(
			/\/sticker-avion\.webp$/,
		);
		expect(ganado?.getAttribute("data-earned")).toBe("true");
		expect(ganado?.className).not.toContain("grayscale");

		const pendiente = document.querySelector('[data-reward="stars:10"]');
		expect(pendiente?.getAttribute("data-earned")).toBe("false");
		expect(pendiente?.className).toContain("grayscale");
		expect(pendiente?.className).toContain("opacity-40");
		expect(pendiente?.querySelector("img")?.getAttribute("src")).toMatch(
			/\/sticker-10\.webp$/,
		);

		const album = screen.getByRole("region", { name: "Álbum" });
		const nodos = document.createTreeWalker(album, NodeFilter.SHOW_TEXT);
		// Los títulos son solo para lectores (`sr-only`): lo visible es lo que pinta el resto.
		for (let n = nodos.nextNode(); n !== null; n = nodos.nextNode()) {
			if (n.parentElement?.tagName === "H2") continue;
			expect(n.textContent, "texto visible del álbum").not.toMatch(/\d/);
		}
	});

	it("AR11: un cosmético bloqueado es una silueta gris de su imagen, sin 🔒 y sin ser un botón", async () => {
		await montar();
		const espacio = document.querySelector('[data-cosmetic="bg:espacio"]');
		if (espacio === null) throw new Error("falta bg:espacio");
		expect(espacio.tagName).not.toBe("BUTTON");
		expect(espacio.className).toContain("grayscale");
		expect(espacio.className).toContain("opacity-40");
		expect(espacio.querySelector("img")?.getAttribute("src")).toMatch(
			/\/bg-espacio\.webp$/,
		);
		expect(espacio.textContent).not.toContain("🔒");
		expect(document.body.textContent).not.toContain("🔒");
	});

	it("los cosméticos desbloqueados pintan su imagen: compañero a 64 px y rastro a 40 px; trail:none es un anillo vacío", async () => {
		await montar({
			"five-vowels": "2026-09-26T12:00:00.000Z",
			"first-syllable-voice": "2026-09-26T12:00:00.000Z",
		});
		const segundo = document.querySelector(
			'[data-cosmetic="companion:second"]',
		);
		const compa = segundo?.querySelector("img");
		expect(compa?.getAttribute("src")).toMatch(/\/companion-2\.webp$/);
		expect(compa?.getAttribute("width")).toBe("64");

		const estrellitas = document.querySelector(
			'[data-cosmetic="trail:estrellitas"]',
		);
		const particula = estrellitas?.querySelector("img");
		expect(particula?.getAttribute("src")).toMatch(
			/\/particle-estrellita\.webp$/,
		);
		expect(particula?.getAttribute("width")).toBe("40");

		const ninguno = document.querySelector('[data-cosmetic="trail:none"]');
		expect(ninguno?.querySelector("img")).toBeNull();
		// Es el rastro por defecto, así que lleva la ✓ del equipado y nada más de texto.
		expect(ninguno?.textContent?.replace("✓", "")).toBe("");
		expect(ninguno?.innerHTML).toContain("border-dashed");

		const fondo = document.querySelector('[data-cosmetic="bg:default"]');
		expect(fondo?.querySelector("img")?.getAttribute("width")).toBe("72");
	});

	it("tiene un botón para volver al mapa", async () => {
		const { onClose } = await montar();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Volver al mapa" }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
