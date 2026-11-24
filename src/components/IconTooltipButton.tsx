import { ReactNode, useEffect, useRef, useState } from 'react';

interface IconTooltipButtonProps {
  tooltip: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  placement?: 'top' | 'bottom';
  badge?: number | string | null;
  active?: boolean;
  isNight?: boolean;
  disabled?: boolean;
}

/**
 * Icon-only HUD button that displays a crisp floating tooltip on desktop hover,
 * keyboard focus, or touch tap/press — keeping the 3D viewport ultra-clean.
 */
export function IconTooltipButton({
  tooltip,
  onClick,
  children,
  className = '',
  placement = 'top',
  badge = null,
  isNight = false,
  disabled = false,
}: IconTooltipButtonProps) {
  const [open, setOpen] = useState(false);
  const tapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  const handleTouchStart = () => {
    setOpen(true);
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current);
    }
    tapTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 1500);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onTouchStart={handleTouchStart}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={tooltip}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3C7B52] sm:h-9 sm:w-9 ${
          disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
      >
        {children}
        {badge !== null && badge !== undefined && badge !== 0 && (
          <span
            className="pointer-events-none absolute -top-1 -right-1 flex min-w-[16px] items-center justify-center rounded-full bg-[#D64940] px-1 text-[10px] leading-4 font-bold text-white tabular-nums shadow-sm"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shadow-md ${
            placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
          } ${
            isNight
              ? 'border-[#39507A] bg-[#0E1626] text-[#F2F6FC]'
              : 'border-[#D5C9B0] bg-[#242E20] text-[#FAF6EE]'
          }`}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
