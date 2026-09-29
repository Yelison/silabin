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

	it("tiene un botón para volver al mapa", async () => {
		const { onClose } = await montar();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Volver al mapa" }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
