import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NoteListItem } from '../../model/types';

export interface NotesSliderSectionProps {
  title: string;
  icon: LucideIcon;
  titleSuffix?: ReactNode;
  notes: NoteListItem[];
  formattedTimes: Map<string, string>;
  renderMeta?: (noteId: string) => ReactNode;
  onNoteClick: (noteId: string) => void;
}
