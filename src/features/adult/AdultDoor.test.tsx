// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdultDoor, PANEL_HOLD_MS } from "@/features/adult/AdultDoor";

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

function montar() {
	const onOpen = vi.fn();
	render(
		<AdultDoor onOpen={onOpen}>
			<span>logo</span>
		</AdultDoor>,
	);
	return { onOpen, logo: screen.getByText("logo") };
}

describe("AdultDoor", () => {
	it("N9: 2 s y soltar no abre nada; mantener 3 s abre la puerta una vez", () => {
		const { onOpen, logo } = montar();

		fireEvent.pointerDown(logo);
		avanzar(2000);
		fireEvent.pointerUp(logo);
		avanzar(5000);
		expect(onOpen).not.toHaveBeenCalled();

		fireEvent.pointerDown(logo);
		avanzar(PANEL_HOLD_MS - 1);
		expect(onOpen).not.toHaveBeenCalled();
		avanzar(1);
		expect(onOpen).toHaveBeenCalledTimes(1);
		avanzar(10000);
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("salir del logo con el puntero antes de los 3 s cancela", () => {
		const { onOpen, logo } = montar();
		fireEvent.pointerDown(logo);
		avanzar(2000);
		fireEvent.pointerLeave(logo);
		avanzar(5000);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("un toque corto no hace nada visible: el logo no es un botón para el niño", () => {
		const { onOpen, logo } = montar();
		expect(screen.queryByRole("button")).toBeNull();
		fireEvent.click(logo);
		expect(onOpen).not.toHaveBeenCalled();
	});
});
