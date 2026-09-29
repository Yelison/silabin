// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CosmeticBackground } from "@/features/rewards/CosmeticBackground";
import { SessionScreen } from "@/features/session/SessionScreen";
import {
	conProveedores,
	crearStore,
	documentoConUnidadesHechas,
	fakeAudio,
	vistasFalsas,
} from "@/features/test-support";
import { createMemoryAdapter } from "@/store";

afterEach(cleanup);

describe("CosmeticBackground", () => {
	it("AR9: con un fondo equipado pinta su imagen y, si no carga, queda el degradado y el atributo", async () => {
		const doc = documentoConUnidadesHechas(null);
		const store = crearStore(
			createMemoryAdapter({
				...doc,
				rewards: {
					unlockedAt: { "first-session": "2026-09-26T12:00:00.000Z" },
					equipped: { background: "bg:pradera", companion: null, trail: null },
				},
			}),
		);
		await store.getState().load();
		const { container } = render(
			conProveedores(
				store,
				fakeAudio(),
				<CosmeticBackground>
					<div>mapa</div>
				</CosmeticBackground>,
			),
		);
		const fondo = container.querySelector("[data-cosmetic-background]");
		expect(fondo?.getAttribute("data-cosmetic-background")).toBe("bg:pradera");
		expect(fondo?.className).toContain("bg-gradient-to-b");
		expect(fondo?.className).toContain("from-calm to-action");
		expect(fondo?.className).toContain("relative isolate");
		const imgs = container.querySelectorAll("img");
		expect(imgs).toHaveLength(1);
		const img = imgs[0] as HTMLImageElement;
		expect(img.getAttribute("src")).toMatch(/\/bg-pradera\.webp$/);
		expect(img.getAttribute("alt")).toBe("");
		expect(img.getAttribute("aria-hidden")).toBe("true");
		expect(img.className).toContain("pointer-events-none");
		expect(img.className).toContain("-z-10");

		fireEvent.error(img);

		expect(container.querySelector("img")).toBeNull();
		const despues = container.querySelector("[data-cosmetic-background]");
		expect(despues?.getAttribute("data-cosmetic-background")).toBe(
			"bg:pradera",
		);
		expect(despues?.className).toContain("from-calm to-action");
		expect(despues?.textContent).toBe("mapa");
	});

	it("F4: un equipped.background bloqueado (importado) pinta el fondo por defecto", async () => {
		const doc = documentoConUnidadesHechas(null);
		const store = crearStore(
			createMemoryAdapter({
				...doc,
				rewards: {
					unlockedAt: {},
					// "bg:pradera" no está desbloqueado (no hay first-session): resolveEquipped
					// debe caer al de por defecto.
					equipped: { background: "bg:pradera", companion: null, trail: null },
				},
			}),
		);
		await store.getState().load();
		const { container } = render(
			conProveedores(
				store,
				fakeAudio(),
				<CosmeticBackground>
					<div>mapa</div>
				</CosmeticBackground>,
			),
		);
		const fondo = container.querySelector("[data-cosmetic-background]");
		expect(fondo?.getAttribute("data-cosmetic-background")).toBe("bg:default");
	});

	it("F8: no aparece dentro de SessionScreen", async () => {
		const store = crearStore();
		await store.getState().load();
		store.getState().beginSession();
		const vistas = vistasFalsas();
		const { container } = render(
			conProveedores(
				store,
				fakeAudio(),
				<SessionScreen
					onEnd={() => {}}
					onExit={() => {}}
					views={{ "count-syllables": vistas.views }}
					celebrationMs={0}
				/>,
			),
		);
		expect(container.querySelector("[data-cosmetic-background]")).toBeNull();
	});
});
