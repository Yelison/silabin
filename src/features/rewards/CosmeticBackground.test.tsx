// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
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
