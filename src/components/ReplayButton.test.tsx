// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReplayButton } from "@/components/ReplayButton";

afterEach(cleanup);

describe("ReplayButton", () => {
	it("I11: pinta su Icon en lugar del emoji y conserva el nombre accesible", () => {
		const onReplay = vi.fn();
		render(<ReplayButton onReplay={onReplay} aria-label="Oír otra vez" />);
		const boton = screen.getByRole("button", { name: "Oír otra vez" });
		expect(boton.querySelector("img")?.getAttribute("src")).toBe(
			"/icons/ui-replay.png",
		);
		expect(boton.textContent).not.toContain("🔊");
		fireEvent.click(boton);
		expect(onReplay).toHaveBeenCalledOnce();
	});
});
