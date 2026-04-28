import { useState, type ReactNode } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './dropdown-menu';

const MOBILE_BREAKPOINT = '(max-width: 767px)';

export interface DropdownMenuResponsiveSubProps {
  label: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}

/**
 * Desktop: standard Radix nested submenu (flyout to the side).
 * Narrow viewports: accordion under the label — full width of the menu, readable text.
 */
export function DropdownMenuResponsiveSub({
  label,
  disabled,
  children,
}: DropdownMenuResponsiveSubProps) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isMobile) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={disabled}>{label}</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>{children}</DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return (
    <div className="w-full min-w-0">
      <DropdownMenuItem
        disabled={disabled}
        className="flex w-full cursor-pointer items-center gap-2 pr-2"
        aria-expanded={mobileOpen}
        onSelect={(event) => {
          event.preventDefault();
        }}
        onClick={() => {
          if (!disabled) setMobileOpen((open) => !open);
        }}
      >
        <span className="min-w-0 flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            mobileOpen && 'rotate-180'
          )}
          aria-hidden
        />
      </DropdownMenuItem>
      {mobileOpen ? (
        <div
          className="mt-1 flex w-full min-w-0 flex-col gap-0.5 border-l-2 border-border py-0.5 pl-2 ml-1"
          role="group"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
