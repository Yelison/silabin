// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
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

async function montar(unlockedAt: Record<string, string>) {
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
	render(conProveedores(store, fakeAudio(), <Companion />));
}

describe("Companion", () => {
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
