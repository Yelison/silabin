// Disposición pura del camino: sin React ni DOM. Las posiciones son celdas de una rejilla y el
// trazo se expresa en unidades de celda, así que nada se mide en el navegador (MP7).

export type Cell = { readonly row: number; readonly col: number };

/** Las tres disposiciones, por punto de corte: base (< 768 px), md y lg. */
export const DISPOSICIONES = ["base", "md", "lg"] as const;
export type Disposicion = (typeof DISPOSICIONES)[number];

/** Columnas de la rejilla de cada disposición: la onda usa 5 para que el vaivén sea suave. */
export const COLUMNAS: Record<Disposicion, number> = { base: 5, md: 3, lg: 5 };

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

/** Columna (base 0) de cada nodo de la onda, en ciclo: centro, derecha, centro, izquierda (MC3). */
const ONDA = [2, 3, 2, 1] as const;

/** Onda de una columna: un nodo por fila, columnas 2, 3, 2, 1 en ciclo (MC3). */
export function wave(count: number): Cell[] {
	if (!Number.isInteger(count) || count < 0)
		throw new RangeError(`count debe ser un entero ≥ 0, no ${count}`);
	return Array.from({ length: count }, (_, row) => ({
		row,
		col: ONDA[row % ONDA.length] ?? 2,
	}));
}

/**
 * Curvas que unen los centros fila a fila, en unidades de celda. Salen y llegan en vertical
 * (los puntos de control están medio alto por encima y por debajo), así que el vaivén es suave.
 * "" con menos de 2 celdas.
 */
export function wavePath(cells: readonly Cell[]): string {
	const [primera, ...resto] = cells;
	if (primera === undefined || resto.length === 0) return "";
	let d = `M${primera.col + 0.5} ${primera.row + 0.5}`;
	let previa = primera;
	for (const celda of resto) {
		const x0 = previa.col + 0.5;
		const y0 = previa.row + 0.5;
		const x1 = celda.col + 0.5;
		const y1 = celda.row + 0.5;
		d += `C${x0} ${y0 + 0.5} ${x1} ${y1 - 0.5} ${x1} ${y1}`;
		previa = celda;
	}
	return d;
}

/** Celdas de cada disposición: base → wave, md → serpentine(n, 3), lg → serpentine(n, 5). */
export function layoutCells(count: number): Record<Disposicion, Cell[]> {
	return {
		base: wave(count),
		md: serpentine(count, COLUMNAS.md),
		lg: serpentine(count, COLUMNAS.lg),
	};
}

/** El trazo de una disposición: wavePath en base, serpentinePath en las otras. */
export function layoutPath(d: Disposicion, cells: readonly Cell[]): string {
	return d === "base" ? wavePath(cells) : serpentinePath(cells, COLUMNAS[d]);
}

/** Filas de la rejilla: count en base, ceil(count / columnas) en las otras. */
export function layoutRows(d: Disposicion, count: number): number {
	return d === "base" ? count : Math.ceil(count / COLUMNAS[d]);
}
