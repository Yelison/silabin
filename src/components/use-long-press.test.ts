// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLongPress } from "@/components/use-long-press";

describe("useLongPress", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("U9: dispara a los ms exactos, ni antes ni después", () => {
		const onLongPress = vi.fn();
		const { result } = renderHook(() => useLongPress(onLongPress, 3000));
		result.current.onPointerDown();
		vi.advanceTimersByTime(2999);
		expect(onLongPress).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onLongPress).toHaveBeenCalledTimes(1);
	});

	it.each(["onPointerUp", "onPointerLeave", "onPointerCancel"] as const)(
		"U9: %s antes de tiempo lo cancela",
		(cancelador) => {
			const onLongPress = vi.fn();
			const { result } = renderHook(() => useLongPress(onLongPress, 3000));
			result.current.onPointerDown();
			vi.advanceTimersByTime(2900);
			result.current[cancelador]();
			vi.advanceTimersByTime(5000);
			expect(onLongPress).not.toHaveBeenCalled();
		},
	);

	it("una segunda pulsación reinicia la cuenta y no dispara dos veces", () => {
		const onLongPress = vi.fn();
		const { result } = renderHook(() => useLongPress(onLongPress, 3000));
		result.current.onPointerDown();
		vi.advanceTimersByTime(2000);
		result.current.onPointerDown();
		vi.advanceTimersByTime(2999);
		expect(onLongPress).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onLongPress).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(10000);
		expect(onLongPress).toHaveBeenCalledTimes(1);
	});

	it("desmontar cancela la cuenta pendiente", () => {
		const onLongPress = vi.fn();
		const { result, unmount } = renderHook(() =>
			useLongPress(onLongPress, 3000),
		);
		result.current.onPointerDown();
		unmount();
		vi.advanceTimersByTime(5000);
		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("usa la última función recibida, no la del primer render", () => {
		const primera = vi.fn();
		const segunda = vi.fn();
		const { result, rerender } = renderHook(
			({ fn }) => useLongPress(fn, 3000),
			{ initialProps: { fn: primera } },
		);
		result.current.onPointerDown();
		rerender({ fn: segunda });
		vi.advanceTimersByTime(3000);
		expect(primera).not.toHaveBeenCalled();
		expect(segunda).toHaveBeenCalledTimes(1);
	});
});
