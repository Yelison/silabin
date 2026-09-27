// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page from "@/app/dev/plantillas/page";

afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
});

/** Lo que lanza `notFound()`: un error con este digest, que Next convierte en la página 404. */
function lanzado(fn: () => unknown): unknown {
	try {
		fn();
	} catch (error) {
		return error;
	}
	return undefined;
}

describe("/dev/plantillas: la guarda de producción", () => {
	it("en producción llama a notFound(), que lanza, y no pinta nada", () => {
		vi.stubEnv("NODE_ENV", "production");
		const error = lanzado(() => render(Page()));
		expect(error).toBeDefined();
		expect((error as { digest?: string }).digest).toBe(
			"NEXT_HTTP_ERROR_FALLBACK;404",
		);
		expect(screen.queryByRole("combobox", { name: "Plantilla" })).toBeNull();
	});

	it("en desarrollo pinta el selector de plantilla e ítem", () => {
		vi.stubEnv("NODE_ENV", "development");
		render(Page());
		expect(screen.getByRole("combobox", { name: "Plantilla" })).toBeDefined();
		expect(screen.getByRole("combobox", { name: "Ítem" })).toBeDefined();
	});
});
