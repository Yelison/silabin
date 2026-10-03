// @vitest-environment jsdom
//
// En fichero aparte a propósito: `useReducedMotion` de motion/react cachea el resultado de
// `matchMedia` a nivel de módulo la primera vez que se llama (no por componente ni por test), así
// que hay que ser el primer llamador del proceso para que el valor «reducido» cuente. Vitest le
// da a cada fichero de test su propio registro de módulos, así que aislar este caso en su propio
// fichero es la única forma fiable de comprobarlo sin tocar el interior de la librería.
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrailLayer } from "@/features/rewards/TrailLayer";
import {
	conProveedores,
	crearStore,
	documentoConUnidadesHechas,
	fakeAudio,
} from "@/features/test-support";
import { createMemoryAdapter } from "@/store";

beforeEach(() => {
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			matches:
				query.includes("prefers-reduced-motion") ||
				query.includes("pointer: fine"),
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
		})),
	);
});

afterEach(() => {
	cleanup();
	document.documentElement.removeAttribute("data-trail-cursor");
	document.documentElement.style.removeProperty("--trail-cursor");
	vi.unstubAllGlobals();
});

describe("TrailLayer con movimiento reducido del sistema", () => {
	it("F7: no monta la capa aunque haya rastro equipado", async () => {
		const doc = documentoConUnidadesHechas(null);
		const store = crearStore(
			createMemoryAdapter({
				...doc,
				rewards: {
					unlockedAt: { "word-reader": "2026-09-26T12:00:00.000Z" },
					equipped: {
						background: null,
						companion: null,
						trail: "trail:burbujas",
					},
				},
			}),
		);
		await store.getState().load();
		const { container } = render(
			conProveedores(store, fakeAudio(), <TrailLayer />),
		);
		expect(container.querySelector('[data-testid="trail-layer"]')).toBeNull();
	});

	it("RA4: el cursor es estático, así que con movimiento reducido sigue puesto", async () => {
		const doc = documentoConUnidadesHechas(null);
		const store = crearStore(
			createMemoryAdapter({
				...doc,
				rewards: {
					unlockedAt: {
						"word-reader": "2026-09-26T12:00:00.000Z",
						"first-syllable-voice": "2026-09-26T12:00:00.000Z",
					},
					equipped: {
						background: null,
						companion: null,
						trail: "trail:estrellitas",
					},
				},
			}),
		);
		await store.getState().load();
		render(conProveedores(store, fakeAudio(), <TrailLayer />));
		const html = document.documentElement;
		expect(html.getAttribute("data-trail-cursor")).toBe("trail:estrellitas");
		expect(html.style.getPropertyValue("--trail-cursor")).toBe(
			'url("/icons/cursor-estrellita.png") 16 16',
		);
	});
});
