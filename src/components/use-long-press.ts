import { useCallback, useEffect, useRef } from "react";

/**
 * Pulsación larga: `onLongPress` se llama cuando el puntero lleva `ms` sin soltarse ni salir.
 * Levantar, salir del elemento o cancelar el toque antes de tiempo lo cancela. Sirve de
 * puerta del adulto: un niño no mantiene el logo tres segundos por casualidad.
 */
export function useLongPress(onLongPress: () => void, ms: number) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latest = useRef(onLongPress);
	useEffect(() => {
		latest.current = onLongPress;
	}, [onLongPress]);

	const cancel = useCallback(() => {
		if (timer.current !== null) clearTimeout(timer.current);
		timer.current = null;
	}, []);

	// Si el componente se desmonta a media pulsación, la cuenta no debe sobrevivirle.
	useEffect(() => cancel, [cancel]);

	const onPointerDown = useCallback(() => {
		cancel();
		timer.current = setTimeout(() => {
			timer.current = null;
			latest.current();
		}, ms);
	}, [cancel, ms]);

	return {
		onPointerDown,
		onPointerUp: cancel,
		onPointerLeave: cancel,
		onPointerCancel: cancel,
	};
}
