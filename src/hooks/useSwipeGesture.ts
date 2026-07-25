import { useEffect, type RefObject } from "react";

/**
 * Detects a vertical swipe-down gesture on the referenced element.
 * Fires `onSwipeDown` when the user swipes down past `threshold` pixels
 * with sufficient velocity (>0.3 px/ms).
 */
export function useSwipeGesture(
  ref: RefObject<HTMLElement | null>,
  onSwipeDown: () => void,
  threshold: number = 80,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startY = 0;
    let startTime = 0;

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      startY = touch.clientY;
      startTime = Date.now();
    }

    function handleTouchEnd(e: TouchEvent) {
      const touch = e.changedTouches[0];
      const endY = touch.clientY;
      const dy = endY - startY; // positive = swipe down
      const dt = Date.now() - startTime;

      if (dy > threshold && dy / dt > 0.3) {
        onSwipeDown();
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, onSwipeDown, threshold]);
}
