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
 * Minecraft-style blocky icon-only HUD slot button that displays a classic
 * dark-purple Minecraft tooltip on hover, keyboard focus, or touch tap.
 */
export function IconTooltipButton({
  tooltip,
  onClick,
  children,
  className = '',
  placement = 'top',
  badge = null,
  active = false,
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
        className={`relative flex h-9 w-9 items-center justify-center rounded-none focus-visible:outline-2 focus-visible:outline-white ${
          active ? 'mc-hotbar-active' : ''
        } ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        {children}
        {badge !== null && badge !== undefined && badge !== 0 && (
          <span
            className="pointer-events-none absolute -top-1 -right-1 flex min-w-[16px] items-center justify-center border border-[#141414] bg-[#b83d35] px-1 text-[10px] leading-3.5 font-bold text-white tabular-nums mc-text-shadow"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="tooltip"
          className={`mc-tooltip pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
            placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
