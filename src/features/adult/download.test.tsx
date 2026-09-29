// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { downloadInBrowser, exportFilename } from "@/features/adult/download";

describe("exportFilename", () => {
	it("el nombre lleva la fecha local con ceros", () => {
		expect(exportFilename(new Date(2026, 0, 5, 23, 59))).toBe(
			"silabin-progreso-2026-01-05.json",
		);
	});
});

describe("downloadInBrowser", () => {
	it("pulsa un enlace con el nombre y revoca la URL después, no dentro del clic", () => {
		vi.useFakeTimers();
		const crear = vi.fn(() => "blob:silabin");
		const revocar = vi.fn();
		vi.stubGlobal("URL", {
			createObjectURL: crear,
			revokeObjectURL: revocar,
		});
		let descargado: string | null = null;
		const clic = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				descargado = this.download;
			});
		try {
			downloadInBrowser("silabin-progreso-2026-09-26.json", "{}");
			expect(crear).toHaveBeenCalledTimes(1);
			expect(descargado).toBe("silabin-progreso-2026-09-26.json");
			// Safari y Firefox pueden cancelar la descarga si se revoca justo tras el clic.
			expect(revocar).not.toHaveBeenCalled();
			vi.advanceTimersByTime(60_000);
			expect(revocar).toHaveBeenCalledWith("blob:silabin");
			expect(document.querySelector("a[download]")).toBeNull();
		} finally {
			clic.mockRestore();
			vi.unstubAllGlobals();
			vi.useRealTimers();
		}
	});
});
