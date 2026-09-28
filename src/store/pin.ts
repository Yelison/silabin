const PIN_PATTERN = /^\d{4}$/;
const STORED_PATTERN = /^sha256:([0-9a-f]{32}):([0-9a-f]{64})$/;
const SALT_BYTES = 16;

/**
 * El PIN es una puerta para el niño, no seguridad: el hash solo evita que el PIN salga en
 * claro del disco, no protege contra un adulto que abra las herramientas del navegador.
 */
export function pinSupported(): boolean {
	return typeof crypto?.subtle?.digest === "function";
}

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

async function digestHex(salt: Uint8Array, pin: string): Promise<string> {
	const pinBytes = new TextEncoder().encode(pin);
	const combined = new Uint8Array(salt.length + pinBytes.length);
	combined.set(salt);
	combined.set(pinBytes, salt.length);
	const digest = await crypto.subtle.digest("SHA-256", combined);
	return toHex(new Uint8Array(digest));
}

/** "sha256:<salHex>:<hashHex>", con 16 bytes de sal de crypto.getRandomValues. */
export async function hashPin(pin: string): Promise<string> {
	if (!PIN_PATTERN.test(pin)) throw new Error("El PIN debe tener 4 dígitos.");
	if (!pinSupported())
		throw new Error("Este dispositivo no admite crypto.subtle.");
	const salt = new Uint8Array(SALT_BYTES);
	crypto.getRandomValues(salt);
	const hashHex = await digestHex(salt, pin);
	return `sha256:${toHex(salt)}:${hashHex}`;
}

/** `false` con un `stored` mal formado, nunca lanza por eso. */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
	const match = STORED_PATTERN.exec(stored);
	if (match === null) return false;
	const [, saltHex, expectedHash] = match;
	if (saltHex === undefined || expectedHash === undefined) return false;
	const hash = await digestHex(fromHex(saltHex), pin);
	return hash === expectedHash;
}
