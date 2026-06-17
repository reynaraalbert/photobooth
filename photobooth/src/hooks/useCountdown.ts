"use client";

import { useCallback, useRef, useState } from "react";
import type { CountdownState } from "@/types/photobooth";

export function useCountdown(seconds: number = 3) {
  const [countdown, setCountdown] = useState<CountdownState>({
    isActive: false,
    value: null,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = useCallback(
    (onComplete: () => void): void => {
      clearTimer();
      let remaining = seconds;

      setCountdown({ isActive: true, value: remaining });

      const tick = () => {
        remaining -= 1;
        if (remaining <= 0) {
          setCountdown({ isActive: false, value: null });
          onComplete();
        } else {
          setCountdown({ isActive: true, value: remaining });
          timerRef.current = setTimeout(tick, 1000);
        }
      };

      timerRef.current = setTimeout(tick, 1000);
    },
    [seconds]
  );

  const cancel = useCallback(() => {
    clearTimer();
    setCountdown({ isActive: false, value: null });
  }, []);

  return { countdown, start, cancel };
}
