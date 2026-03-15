import { createReactBlockSpec } from '@blocknote/react';
import { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRegFileAlt } from "react-icons/fa";
import { DEFAULT_NOTE_TITLE } from '../model/types';
import { notesRoutes } from '../lib/routes';

/** Map of noteId -> title for resolving embedded page titles */
export const NoteTitlesContext = createContext<Map<string, string>>(new Map());

// Internal component for rendering the embedded page block
function EmbeddedPageBlockRender({ block }: { block: { props: { noteId: string } } }) {
  const navigate = useNavigate();
  const noteId = block.props.noteId as string;
  const titlesMap = useContext(NoteTitlesContext);
  const title = noteId && titlesMap instanceof Map && titlesMap.get(noteId) ? titlesMap.get(noteId)! : DEFAULT_NOTE_TITLE;

  const handleClick = () => {
    if (noteId) {
      navigate(notesRoutes.editor(noteId));
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 0',
        cursor: 'pointer',
        maxWidth: '400px',
      }}
    >
      <FaRegFileAlt size={18} style={{ flexShrink: 0, color: 'rgb(194, 197, 201)' }} />
      <span style={{ fontSize: '15px', fontWeight: 500, color: 'white' }}>
        {title}
      </span>
    </div>
  );
}

export const EmbeddedPageBlock = createReactBlockSpec(
  {
    type: 'embeddedPage',
    propSchema: {
      noteId: {
        default: '' as string,
        type: 'string' as const,
      },
    },
    content: 'none',
  },
  {
    render: (props) => <EmbeddedPageBlockRender {...props} />,
  },
);
