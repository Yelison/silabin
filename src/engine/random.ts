export type Rng = {
	next(): number;
	int(maxExclusive: number): number;
	pick<T>(items: readonly T[]): T;
	shuffle<T>(items: readonly T[]): T[];
};

export function createRng(seed: number): Rng {
	let state = seed >>> 0;

	function next(): number {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	function int(maxExclusive: number): number {
		if (maxExclusive <= 0)
			throw new Error("int necesita un máximo mayor que cero");
		return Math.floor(next() * maxExclusive);
	}

	function pick<T>(items: readonly T[]): T {
		if (items.length === 0)
			throw new Error("pick no puede elegir de un arreglo vacío");
		const item = items[int(items.length)];
		if (item === undefined) throw new Error("pick obtuvo un índice inválido");
		return item;
	}

	function shuffle<T>(items: readonly T[]): T[] {
		const out = [...items];
		for (let i = out.length - 1; i > 0; i -= 1) {
			const j = int(i + 1);
			const a = out[i];
			const b = out[j];
			if (a === undefined || b === undefined) continue;
			out[i] = b;
			out[j] = a;
		}
		return out;
	}

	return { next, int, pick, shuffle };
}
