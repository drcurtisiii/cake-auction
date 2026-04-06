'use client';

import { useState, useEffect, useMemo } from 'react';

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

const EXPIRED: CountdownValues = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  isExpired: true,
  totalSeconds: 0,
};

function computeCountdown(target: Date): CountdownValues {
  const diff = target.getTime() - Date.now();

  if (diff <= 0) return EXPIRED;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isExpired: false, totalSeconds };
}

/**
 * Counts down to a target date, updating every second.
 * Returns all zeros with isExpired = true when the target is null or in the past.
 */
export function useCountdown(targetDate: Date | string | null): CountdownValues {
  const target = useMemo(() => {
    if (!targetDate) return null;
    const d = targetDate instanceof Date ? targetDate : new Date(targetDate);
    return isNaN(d.getTime()) ? null : d;
  }, [targetDate]);

  const [countdown, setCountdown] = useState<CountdownValues>(() =>
    target ? computeCountdown(target) : EXPIRED,
  );

  useEffect(() => {
    if (!target) {
      setCountdown(EXPIRED);
      return;
    }

    // Compute immediately so we don't wait a full second
    setCountdown(computeCountdown(target));

    const intervalId = setInterval(() => {
      const next = computeCountdown(target);
      setCountdown(next);

      // Stop ticking once expired
      if (next.isExpired) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [target]);

  return countdown;
}
