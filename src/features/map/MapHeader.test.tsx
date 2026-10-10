// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PANEL_HOLD_MS } from "@/features/adult/AdultDoor";
import { MapHeader } from "@/features/map/MapHeader";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function avanzar(ms: number) {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

function montar(props: Partial<Parameters<typeof MapHeader>[0]> = {}): {
	onOpenPanel: ReturnType<typeof vi.fn>;
} {
	const onOpenPanel = vi.fn();
	render(
		<MapHeader
			stars={0}
			milestone={{ from: 0, to: 10 }}
			lastSavedAt={null}
			saveFailed={false}
			onOpenPanel={onOpenPanel}
			{...props}
		/>,
	);
	return { onOpenPanel };
}

describe("MapHeader", () => {
	it("CB1: el título «Silabín» ya no es la puerta de padres: mantenerlo 3 s no abre nada", () => {
		const { onOpenPanel } = montar();
		const titulo = screen.getByRole("heading", { name: "Silabín" });
		fireEvent.pointerDown(titulo);
		avanzar(PANEL_HOLD_MS + 500);
		expect(onOpenPanel).not.toHaveBeenCalled();
	});

	it("CB2: mantener el candado «Panel de padres» 3 s abre una vez; un toque corto, ninguna", () => {
		const { onOpenPanel } = montar();
		const candado = screen.getByRole("img", { name: "Panel de padres" });
		// El candado no es un botón: no hay nada que activar con teclado o con un clic.
		expect(
			screen.queryByRole("button", { name: "Panel de padres" }),
		).toBeNull();
		expect(
			candado.querySelector('img[src="/icons/ui-lock.png"]'),
		).not.toBeNull();

		fireEvent.pointerDown(candado);
		avanzar(200);
		fireEvent.pointerUp(candado);
		avanzar(5000);
		expect(onOpenPanel).not.toHaveBeenCalled();

		fireEvent.pointerDown(candado);
		avanzar(PANEL_HOLD_MS - 1);
		expect(onOpenPanel).not.toHaveBeenCalled();
		avanzar(1);
		expect(onOpenPanel).toHaveBeenCalledTimes(1);
	});

	it("CB3: con 27 estrellas se ve «27» y la barra va de 25 a 50 con valuenow 27", () => {
		montar({ stars: 27, milestone: { from: 25, to: 50 } });
		expect(screen.getByText("27")).toBeDefined();
		const barra = screen.getByRole("progressbar");
		expect(barra.getAttribute("aria-valuemin")).toBe("25");
		expect(barra.getAttribute("aria-valuemax")).toBe("50");
		expect(barra.getAttribute("aria-valuenow")).toBe("27");
	});

	it("CB3: sin hito solo se ve el total, sin barra", () => {
		montar({ stars: 120, milestone: null });
		expect(screen.getByText("120")).toBeDefined();
		expect(screen.queryByRole("progressbar")).toBeNull();
	});

	it("CB4: la marca de guardado muestra la hora local de lastSavedAt, en el flujo de la cabecera", () => {
		const iso = "2026-09-28T14:05:00.000Z";
		montar({ lastSavedAt: iso });
		const f = new Date(iso);
		const hhmm = `${String(f.getHours()).padStart(2, "0")}:${String(f.getMinutes()).padStart(2, "0")}`;
		const marca = screen.getByLabelText(`Guardado a las ${hhmm}`);
		expect(marca.getAttribute("title")).toBe(`Guardado a las ${hhmm}`);
		// No flota: un ✓ fijo a la izquierda pisaba el wordmark.
		expect(marca.className).not.toMatch(/\bfixed\b/);
		expect(marca.closest("header")).not.toBeNull();
	});

	it("CB4: con lastSavedAt null o saveFailed no sale la marca de guardado", () => {
		montar({ lastSavedAt: null });
		expect(screen.queryByLabelText(/Guardado a las/)).toBeNull();
		cleanup();
		montar({ lastSavedAt: "2026-09-28T14:05:00.000Z", saveFailed: true });
		expect(screen.queryByLabelText(/Guardado a las/)).toBeNull();
	});

	it("CB5: con un aviso de guardado a la vista, la cabecera deja libre el rincón de la derecha", () => {
		montar({ avisoAdulto: true });
		const cabecera = screen
			.getByRole("heading", { name: "Silabín" })
			.closest("header");
		expect(cabecera?.className).toContain("pr-12");
		cleanup();
		montar();
		const sin = screen
			.getByRole("heading", { name: "Silabín" })
			.closest("header");
		expect(sin?.className).not.toContain("pr-12");
	});
});
