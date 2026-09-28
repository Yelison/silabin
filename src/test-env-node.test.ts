import { expect, it } from "vitest";

it("un .test.ts sigue corriendo en node", () => {
	expect(typeof document).toBe("undefined");
});
