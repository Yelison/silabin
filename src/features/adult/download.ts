export type Download = (filename: string, contents: string) => void;

/**
 * `silabin-<childName>-<YYYY-MM-DD>.json` si hay nombre (S16), o
 * `silabin-progreso-<YYYY-MM-DD>.json` sin él. La fecha es la local del dispositivo.
 * El nombre va en minúsculas, sin tildes ni ñ (mismo patrón que `slugFor` en
 * `src/images/index.ts`) y con los espacios convertidos en guiones.
 */
export function exportFilename(date: Date, childName: string | null): string {
	const dos = (n: number) => String(n).padStart(2, "0");
	const fecha = `${date.getFullYear()}-${dos(date.getMonth() + 1)}-${dos(date.getDate())}`;
	const slug =
		childName === null
			? "progreso"
			: childName
					.normalize("NFD")
					.replace(/\p{M}/gu, "")
					.toLowerCase()
					.trim()
					.replace(/\s+/g, "-");
	return `silabin-${slug}-${fecha}.json`;
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
