export type Download = (filename: string, contents: string) => void;

/** `silabin-progreso-<YYYY-MM-DD>.json`, con la fecha local del dispositivo. */
export function exportFilename(date: Date): string {
	const dos = (n: number) => String(n).padStart(2, "0");
	return `silabin-progreso-${date.getFullYear()}-${dos(date.getMonth() + 1)}-${dos(date.getDate())}.json`;
}

/** Descarga real en el navegador: Blob, URL temporal y un `<a download>` pulsado por código. */
export const downloadInBrowser: Download = (filename, contents) => {
	const url = URL.createObjectURL(
		new Blob([contents], { type: "application/json" }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	// Safari y Firefox pueden cancelar la descarga si se revoca justo tras el clic.
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
};
