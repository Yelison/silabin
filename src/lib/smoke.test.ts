import { describe, expect, it } from "vitest";
import { projectName } from "@/lib/smoke";

describe("andamiaje", () => {
	it("resuelve el alias @ y ejecuta TypeScript", () => {
		expect(projectName()).toBe("Silabín");
	});
});
