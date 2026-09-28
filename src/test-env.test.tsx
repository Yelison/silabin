import { expect, it } from "vitest";

it("un .test.tsx corre en jsdom sin comentario de entorno", () => {
	expect(typeof document).not.toBe("undefined");
});
