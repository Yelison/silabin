/**
 * Si hay un SW esperando, le pide `SKIP_WAITING` y recarga cuando cambia el controlador.
 * Devuelve `true` si va a recargar. Sin `serviceWorker` o sin registro → `false`.
 *
 * Sin `skipWaiting` automático (S11): un SW nuevo podría borrar la precaché a mitad de una
 * sesión y romper la carga de fragmentos. Por eso esto solo se llama desde `StartScreen`,
 * nunca durante una sesión.
 *
 * `signal` sirve para desistir: si ya se abortó cuando el registro responde (la pantalla de inicio
 * dejó de esperar y arrancó la app), no se envía `SKIP_WAITING`; y si se aborta después de
 * enviarlo, el cambio de controlador ya no recarga (nunca a mitad de sesión).
 */
export function applyWaitingUpdate(deps: {
	container:
		| Pick<ServiceWorkerContainer, "getRegistration" | "addEventListener">
		| undefined;
	reload: () => void;
	signal?: AbortSignal;
}): Promise<boolean> {
	const { container, reload, signal } = deps;
	if (container === undefined) return Promise.resolve(false);
	return container.getRegistration().then((registration) => {
		const waiting = registration?.waiting;
		if (waiting === undefined || waiting === null) return false;
		if (signal?.aborted) return false;
		container.addEventListener(
			"controllerchange",
			() => {
				if (!signal?.aborted) reload();
			},
			{ once: true },
		);
		waiting.postMessage({ type: "SKIP_WAITING" });
		return true;
	});
}
