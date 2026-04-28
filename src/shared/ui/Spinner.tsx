import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SpinnerSize = 'sm' | 'md';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  'aria-label'?: string;
  /**
   * When false, omits `role="status"` so the spinner can sit inside buttons/menus
   * without nested accessible names; pair with `sr-only` text or parent `aria-label`.
   */
  announce?: boolean;
}

/** Lucide `size` (px) so the icon is always sized; avoids SVG attr vs Tailwind `size-*` conflicts. */
const loaderPixelSize: Record<SpinnerSize, number> = {
  sm: 22,
  md: 32,
};

export function Spinner({
  size = 'md',
  className,
  'aria-label': ariaLabel,
  announce = true,
}: SpinnerProps) {
  const inner = (
    <Loader2
      className="animate-spin shrink-0"
      size={loaderPixelSize[size]}
      aria-hidden
    />
  );
  if (!announce) {
    return (
      <span className={cn('inline-flex items-center justify-center text-zinc-400', className)}>
        {inner}
      </span>
    );
  }
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center justify-center text-zinc-400', className)}
    >
      {inner}
    </span>
  );
}
