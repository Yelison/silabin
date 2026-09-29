import { spawnSync } from "node:child_process";

/**
 * S23: la revisión de la precaché de `/` sale de `VERCEL_GIT_COMMIT_SHA` (Vercel la pone en el
 * build) y, si no existe, de `git rev-parse HEAD` (entorno local); en Vercel no conviene contar
 * con `git`. Se usa `||` y no `??`: una cadena vacía (fuera de un repositorio, `git` devuelve
 * `""` sin error) haría que Serwist tratara la entrada como "sin revisión" y `/` no se volvería
 * a descargar en los despliegues siguientes.
 */
export function calcularRevision(
	deps: {
		env?: string | undefined;
		git?: () => string | undefined;
		uuid?: () => string;
	} = {},
): string {
	const {
		env = process.env.VERCEL_GIT_COMMIT_SHA,
		git = () =>
			spawnSync("git", ["rev-parse", "HEAD"], {
				encoding: "utf-8",
			}).stdout?.trim(),
		uuid = () => crypto.randomUUID(),
	} = deps;
	return env?.trim() || git()?.trim() || uuid();
}
