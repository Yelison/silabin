/**
 * Si hay un SW esperando, le pide `SKIP_WAITING` y recarga cuando cambia el controlador.
 * Devuelve `true` si va a recargar. Sin `serviceWorker` o sin registro → `false`.
 *
 * Sin `skipWaiting` automático (S11): un SW nuevo podría borrar la precaché a mitad de una
 * sesión y romper la carga de fragmentos. Por eso esto solo se llama desde `StartScreen`,
 * nunca durante una sesión.
 */
export function applyWaitingUpdate(deps: {
	container:
		| Pick<ServiceWorkerContainer, "getRegistration" | "addEventListener">
		| undefined;
	reload: () => void;
}): Promise<boolean> {
	const { container, reload } = deps;
	if (container === undefined) return Promise.resolve(false);
	return container.getRegistration().then((registration) => {
		const waiting = registration?.waiting;
		if (waiting === undefined || waiting === null) return false;
		container.addEventListener("controllerchange", reload, { once: true });
		waiting.postMessage({ type: "SKIP_WAITING" });
		return true;
	});
}
