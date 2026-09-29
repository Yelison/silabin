// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { curriculum } from "@/engine";
import { ProgressSection } from "@/features/adult/ProgressSection";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

async function montarConDoc() {
	const store = crearStore();
	await store.getState().load();
	render(conProveedores(store, fakeAudio(), <ProgressSection />));
	return { store };
}

describe("ProgressSection", () => {
	it("D1: con el currículo real vacío, hay 3 fases, la primera unidad Activa y todo Sin ver", async () => {
		await montarConDoc();

		expect(screen.getByRole("heading", { name: "Fase 0" })).toBeDefined();
		expect(screen.getByRole("heading", { name: "Fase 1" })).toBeDefined();
		expect(screen.getByRole("heading", { name: "Fase 2" })).toBeDefined();

		const primeraUnidad = curriculum.units.get(curriculum.unitOrder[0] ?? "");
		expect(primeraUnidad).toBeDefined();
		if (primeraUnidad === undefined) return;
		expect(
			screen.getByText(new RegExp(`${primeraUnidad.title} — Activa —`)),
		).toBeDefined();

		// Nada dominado ni en repaso todavía: todos los ítems son "Sin ver".
		expect(screen.queryByText(/: Dominado$/)).toBeNull();
		expect(screen.queryByText(/: En repaso$/)).toBeNull();
	});

	it("sin sesiones dice 'Todavía no hay sesiones'", async () => {
		await montarConDoc();
		expect(screen.getByText("Todavía no hay sesiones")).toBeDefined();
	});

	it("D2: 12 sesiones muestran solo las últimas 10, la más nueva primero, y una de repaso dice 'Repaso'", async () => {
		const { store } = await montarConDoc();
		const primerUnitId = curriculum.unitOrder[0] ?? "";
		const sesiones = Array.from({ length: 12 }, (_, i) => ({
			index: i,
			unitId: i === 11 ? null : primerUnitId,
			stars: 2 as const,
			endedAt: `2026-01-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`,
		}));
		act(() => {
			store.setState((s) => ({ doc: { ...s.doc, sessions: sesiones } }));
		});

		const bloqueSesiones = screen.getByText("Últimas sesiones").closest("div");
		expect(bloqueSesiones).not.toBeNull();
		if (bloqueSesiones === null) return;
		const filas = within(bloqueSesiones).getAllByRole("listitem");
		expect(filas.length).toBe(10);
		// La más nueva primero: la sesión de índice 11, que es de repaso.
		expect(filas[0]?.textContent).toMatch(/Repaso/);
		const tituloPrimeraUnidad =
			curriculum.units.get(primerUnitId)?.title ?? primerUnitId;
		expect(filas[0]?.textContent).not.toMatch(tituloPrimeraUnidad);
	});
});
