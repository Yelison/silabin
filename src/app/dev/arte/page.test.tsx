// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page from "@/app/dev/arte/page";

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

describe("/dev/arte: la guarda de producción", () => {
	it("LE4: en producción llama a notFound(), que lanza, y no pinta nada", () => {
		vi.stubEnv("NODE_ENV", "production");
		const error = lanzado(() => render(Page()));
		expect(error).toBeDefined();
		expect((error as { digest?: string }).digest).toBe(
			"NEXT_HTTP_ERROR_FALLBACK;404",
		);
		expect(screen.queryByRole("heading", { name: "Paleta" })).toBeNull();
	});

	it("en desarrollo pinta la paleta", () => {
		vi.stubEnv("NODE_ENV", "development");
		render(Page());
		expect(screen.getByRole("heading", { name: "Paleta" })).toBeDefined();
	});
});
