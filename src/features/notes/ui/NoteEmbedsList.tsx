import { Button } from '@/shared/ui';
import { DEFAULT_NOTE_TITLE } from '../model/types';
import type { NoteListItem } from '../model/types';

interface NoteEmbedsListProps {
  embeds: NoteListItem[];
  onNavigate: (id: string) => void;
}

export function NoteEmbedsList({ embeds, onNavigate }: NoteEmbedsListProps) {
  return (
    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
        Pages in this page
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {embeds.map((embed) => (
          <li key={embed.id} style={{ marginBottom: '6px' }}>
            <Button variant="link" onClick={() => onNavigate(embed.id)}>
              {embed.title || DEFAULT_NOTE_TITLE}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
