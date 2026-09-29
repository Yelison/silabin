// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StartScreen } from "@/features/start/StartScreen";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

const boton = () => screen.getByRole("button", { name: "Empezar" });

describe("StartScreen", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("H4: con una actualización pendiente no llama a onStart", async () => {
		const onStart = vi.fn();
		const applyUpdate = vi.fn(async () => true);
		render(
			conProveedores(
				crearStore(),
				fakeAudio(),
				<StartScreen onStart={onStart} applyUpdate={applyUpdate} />,
			),
		);
		fireEvent.click(boton());
		await vi.runAllTimersAsync();
		expect(applyUpdate).toHaveBeenCalledTimes(1);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("H4: sin actualización pendiente llama a onStart", async () => {
		const onStart = vi.fn();
		const applyUpdate = vi.fn(async () => false);
		render(
			conProveedores(
				crearStore(),
				fakeAudio(),
				<StartScreen onStart={onStart} applyUpdate={applyUpdate} />,
			),
		);
		fireEvent.click(boton());
		await vi.runAllTimersAsync();
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("H4: con una promesa que no resuelve, llama a onStart a los 1 s", async () => {
		const onStart = vi.fn();
		const applyUpdate = vi.fn(() => new Promise<boolean>(() => {}));
		render(
			conProveedores(
				crearStore(),
				fakeAudio(),
				<StartScreen onStart={onStart} applyUpdate={applyUpdate} />,
			),
		);
		fireEvent.click(boton());
		await vi.advanceTimersByTimeAsync(999);
		expect(onStart).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("nunca llama a onStart dos veces cuando la promesa resuelve tarde pero antes de reventar", async () => {
		const onStart = vi.fn();
		let resolver: (v: boolean) => void = () => {};
		const applyUpdate = vi.fn(
			() =>
				new Promise<boolean>((resolve) => {
					resolver = resolve;
				}),
		);
		render(
			conProveedores(
				crearStore(),
				fakeAudio(),
				<StartScreen onStart={onStart} applyUpdate={applyUpdate} />,
			),
		);
		fireEvent.click(boton());
		await vi.advanceTimersByTimeAsync(1000);
		expect(onStart).toHaveBeenCalledTimes(1);
		resolver(false);
		await vi.advanceTimersByTimeAsync(0);
		expect(onStart).toHaveBeenCalledTimes(1);
	});
});
