import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
} from '@dnd-kit/core';

export interface DndContextWrapperProps {
  children: React.ReactNode;
  onDragEnd: (noteId: string, overId: string) => void;
}

export function DndContextWrapper({ children, onDragEnd }: DndContextWrapperProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const noteId = String(active.id);
    const overId = String(over.id);
    onDragEnd(noteId, overId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
