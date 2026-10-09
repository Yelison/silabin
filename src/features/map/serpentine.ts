// Disposición pura del camino: sin React ni DOM. Las posiciones son celdas de una rejilla y el
// trazo se expresa en unidades de celda, así que nada se mide en el navegador (MP7).

export type Cell = { readonly row: number; readonly col: number };

/** Columnas por punto de corte: base, md (≥ 768 px) y lg (≥ 1024 px) (MP9). */
export const COLUMNAS = [2, 3, 5] as const;
export type Columnas = (typeof COLUMNAS)[number];

/** Celdas en bustrofedón: las filas pares van de izquierda a derecha y las impares al revés. */
export function serpentine(count: number, columns: number): Cell[] {
	if (!Number.isInteger(count) || count < 0)
		throw new RangeError(`count debe ser un entero ≥ 0, no ${count}`);
	if (!Number.isInteger(columns) || columns < 1)
		throw new RangeError(`columns debe ser un entero ≥ 1, no ${columns}`);
	return Array.from({ length: count }, (_, i) => {
		const row = Math.floor(i / columns);
		const pos = i % columns;
		return { row, col: row % 2 === 0 ? pos : columns - 1 - pos };
	});
}

/**
 * El trazo que une los centros de las celdas, en unidades de celda; "" con menos de 2 celdas.
 * Dentro de una fila va recto; al pasar a la fila siguiente (misma columna) da una curva hacia
 * fuera, por la izquierda en la columna 0 y por la derecha en las demás.
 */
export function serpentinePath(
	cells: readonly Cell[],
	_columns: number,
): string {
	const [primera, ...resto] = cells;
	if (primera === undefined || resto.length === 0) return "";
	let d = `M${primera.col + 0.5} ${primera.row + 0.5}`;
	let previa = primera;
	for (const celda of resto) {
		const x = celda.col + 0.5;
		const y1 = celda.row + 0.5;
		if (celda.row === previa.row) {
			d += `L${x} ${y1}`;
		} else {
			const y0 = previa.row + 0.5;
			const salto = celda.col === 0 ? -0.5 : 0.5;
			d += `C${x + salto} ${y0} ${x + salto} ${y1} ${x} ${y1}`;
		}
		previa = celda;
	}
	return d;
}
