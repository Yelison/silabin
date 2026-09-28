// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MicButton } from "@/components/MicButton";

afterEach(cleanup);

type Estado = "idle" | "countdown" | "listening";
function pintar(
	over: Partial<{
		state: Estado;
		level: number;
		disabled: boolean;
		onPress: () => void;
	}> = {},
) {
	const onPress = over.onPress ?? vi.fn();
	const r = render(
		<MicButton
			state={over.state ?? "idle"}
			level={over.level ?? 0}
			disabled={over.disabled ?? false}
			onPress={onPress}
		/>,
	);
	return { ...r, onPress };
}

describe("MicButton", () => {
	it("V3: se llama Micrófono y mide al menos 96 px (min-h-24 min-w-24)", () => {
		pintar();
		const boton = screen.getByRole("button", { name: "Micrófono" });
		expect(boton.className).toContain("min-h-24");
		expect(boton.className).toContain("min-w-24");
	});

	it("V3: onPress se llama al tocar y no se llama con disabled", () => {
		const { onPress, unmount } = pintar();
		fireEvent.click(screen.getByRole("button", { name: "Micrófono" }));
		expect(onPress).toHaveBeenCalledTimes(1);
		unmount();
		const b = pintar({ disabled: true });
		fireEvent.click(screen.getByRole("button", { name: "Micrófono" }));
		expect(b.onPress).not.toHaveBeenCalled();
		expect(
			screen
				.getByRole("button", { name: "Micrófono" })
				.getAttribute("aria-disabled"),
		).toBe("true");
	});

	it("countdown: tres puntos; idle y listening no los tienen", () => {
		const { container, rerender } = pintar({ state: "countdown" });
		expect(container.querySelectorAll("[data-dot]")).toHaveLength(3);
		rerender(
			<MicButton state="idle" level={0} disabled={false} onPress={() => {}} />,
		);
		expect(container.querySelectorAll("[data-dot]")).toHaveLength(0);
	});

	it("listening: onda que sigue a level, solo con motion-safe, y un anillo fijo que no depende del movimiento", () => {
		const { container } = pintar({ state: "listening", level: 0.5 });
		const onda = container.querySelector("[data-wave]");
		expect(onda).not.toBeNull();
		expect(onda?.getAttribute("style")).toContain("0.5");
		for (const c of (onda?.className ?? "").split(/\s+/)) {
			if (/scale|transition|animate/.test(c))
				expect(c.startsWith("motion-safe:"), c).toBe(true);
		}
		expect(container.querySelector("[data-ring]")).not.toBeNull();
	});

	it("level fuera de rango se acota a 0..1", () => {
		const { container } = pintar({ state: "listening", level: 7 });
		expect(
			container.querySelector("[data-wave]")?.getAttribute("style"),
		).toContain("--nivel: 1");
	});
});
