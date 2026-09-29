import { describe, expect, it } from "vitest";
import { calcularRevision } from "@/app/serwist/revision";

const uuid = () => "uuid-aleatorio";

describe("calcularRevision", () => {
	it("M1: usa VERCEL_GIT_COMMIT_SHA cuando existe", () => {
		expect(calcularRevision({ env: "abc123", git: () => "def", uuid })).toBe(
			"abc123",
		);
	});

	it("M1: con el SHA vacío cae a git", () => {
		expect(calcularRevision({ env: "", git: () => "def456", uuid })).toBe(
			"def456",
		);
	});

	it("M1: sin SHA y con git vacío o ausente cae al UUID", () => {
		expect(calcularRevision({ env: undefined, git: () => "", uuid })).toBe(
			"uuid-aleatorio",
		);
		expect(calcularRevision({ env: "", git: () => undefined, uuid })).toBe(
			"uuid-aleatorio",
		);
	});
});
