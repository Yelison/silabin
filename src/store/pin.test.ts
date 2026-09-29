import { describe, expect, it } from "vitest";
import { hashPin, pinSupported, verifyPin } from "@/store/pin";

describe("pinSupported", () => {
	it("es true en este entorno de test (Node trae crypto.subtle)", () => {
		expect(pinSupported()).toBe(true);
	});
});

describe("A1: hashPin y verifyPin", () => {
	it("el formato es sha256:<32 hex>:<64 hex>", async () => {
		const hash = await hashPin("1234");
		expect(hash).toMatch(/^sha256:[0-9a-f]{32}:[0-9a-f]{64}$/);
	});

	it("dos llamadas con el mismo PIN dan sales distintas", async () => {
		const primera = await hashPin("1234");
		const segunda = await hashPin("1234");
		const salPrimera = primera.split(":")[1];
		const salSegunda = segunda.split(":")[1];
		expect(salPrimera).not.toBe(salSegunda);
	});

	it("verifyPin es true con el PIN correcto y false con uno distinto", async () => {
		const hash = await hashPin("1234");
		expect(await verifyPin("1234", hash)).toBe(true);
		expect(await verifyPin("1235", hash)).toBe(false);
	});
});

describe("A2: PIN inválido y stored mal formado", () => {
	it("hashPin lanza con un PIN que no son 4 dígitos", async () => {
		await expect(hashPin("12a4")).rejects.toThrow();
		await expect(hashPin("123")).rejects.toThrow();
		await expect(hashPin("12345")).rejects.toThrow();
	});

	it("verifyPin da false sin lanzar con un stored mal formado", async () => {
		expect(await verifyPin("1234", "basura")).toBe(false);
		expect(await verifyPin("1234", "sha256:zz:zz")).toBe(false);
	});
});
