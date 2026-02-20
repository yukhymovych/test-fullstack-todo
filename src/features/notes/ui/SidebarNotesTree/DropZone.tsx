import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export interface DropZoneProps {
  id: string;
  children?: React.ReactNode;
  className?: string;
  /** Use for "between items" reorder zones - shows a visible drop line when hovered */
  variant?: 'default' | 'between';
}

/** A droppable zone for drag-and-drop. */
export function DropZone({
  id,
  children,
  className,
  variant = 'default',
}: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors',
        variant === 'between' && 'min-h-[5px] flex items-center justify-center',
        variant === 'between' && isOver && 'bg-primary/15',
        variant === 'default' && isOver && 'bg-primary/20 rounded',
        className
      )}
    >
      {variant === 'between' && (
        <div
          className={cn(
            'w-full rounded-full transition-colors',
            isOver ? 'h-0.5 bg-primary' : 'h-px bg-transparent'
          )}
        />
      )}
      {children}
    </div>
  );
}
