const FACTOR_MIN = 6;
const FACTOR_MAX = 9;
const RANGO = FACTOR_MAX - FACTOR_MIN + 1;

export type AdultChallenge = { question: string; answer: number };

function factor(random: () => number): number {
	return FACTOR_MIN + Math.floor(random() * RANGO);
}

/**
 * La pregunta de "¿olvidaste el PIN?": una multiplicación que un niño pequeño no resuelve por
 * casualidad pero cualquier adulto responde sin esfuerzo. Los factores van de 6 a 9, ni tan
 * chicos como para adivinarlos ni tan grandes como para que el adulto se equivoque por
 * descuido. `random` se inyecta para que el flujo de "olvidé el PIN" sea determinista en los
 * tests.
 */
export function adultChallenge(random: () => number): AdultChallenge {
	const a = factor(random);
	const b = factor(random);
	return { question: `¿Cuánto es ${a} × ${b}?`, answer: a * b };
}
