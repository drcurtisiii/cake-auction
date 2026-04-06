'use client';

import React from 'react';
import { useCountdown } from '@/hooks/useCountdown';

type CountdownVariant = 'preview' | 'live' | 'default';

interface CountdownProps {
  targetDate: Date | string | null;
  label?: string;
  variant?: CountdownVariant;
  className?: string;
}

const variantStyles: Record<
  CountdownVariant,
  { container: string; digit: string; separator: string; label: string; unit: string }
> = {
  preview: {
    container: 'bg-blue-50 border border-blue-200 text-blue-900',
    digit: 'bg-blue-100 text-blue-900',
    separator: 'text-blue-400',
    label: 'text-blue-700',
    unit: 'text-blue-500',
  },
  live: {
    container: 'bg-green-50 border border-green-200 text-green-900',
    digit: 'bg-green-100 text-green-900',
    separator: 'text-green-400',
    label: 'text-green-700',
    unit: 'text-green-500',
  },
  default: {
    container: 'bg-gray-50 border border-gray-200 text-gray-900',
    digit: 'bg-gray-100 text-gray-900',
    separator: 'text-gray-400',
    label: 'text-gray-600',
    unit: 'text-gray-500',
  },
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  label,
  variant = 'default',
  className = '',
}) => {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate);
  const styles = variantStyles[variant];

  if (isExpired) {
    return (
      <div
        className={`rounded-lg p-4 text-center ${styles.container} ${className}`}
      >
        {label && (
          <p className={`mb-2 text-sm font-medium ${styles.label}`}>
            {label}
          </p>
        )}
        <p className="text-lg font-semibold">Time&apos;s up!</p>
      </div>
    );
  }

  const units = [
    { value: days, label: 'Days' },
    { value: hours, label: 'Hours' },
    { value: minutes, label: 'Minutes' },
    { value: seconds, label: 'Seconds' },
  ];

  return (
    <div
      className={`rounded-lg p-4 text-center ${styles.container} ${className}`}
    >
      {label && (
        <p className={`mb-3 text-sm font-medium ${styles.label}`}>{label}</p>
      )}

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {units.map((unit, i) => (
          <React.Fragment key={unit.label}>
            {/* Digit block */}
            <div className="flex flex-col items-center">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-md text-xl font-bold tabular-nums sm:h-14 sm:w-14 sm:text-2xl ${styles.digit} ${
                  variant === 'live' ? 'animate-pulse-subtle' : ''
                }`}
              >
                {pad(unit.value)}
              </span>
              <span
                className={`mt-1 text-[10px] font-medium uppercase tracking-wide sm:text-xs ${styles.unit}`}
              >
                {unit.label}
              </span>
            </div>

            {/* Separator (not after the last unit) */}
            {i < units.length - 1 && (
              <span
                className={`mb-4 text-xl font-bold sm:text-2xl ${styles.separator}`}
              >
                :
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
