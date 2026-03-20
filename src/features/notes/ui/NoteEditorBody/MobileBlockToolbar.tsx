import { SuggestionMenu } from '@blocknote/core/extensions';
import {
  BlockTypeSelect,
  useBlockNoteEditor,
  useEditorSelectionChange,
  useExtension,
} from '@blocknote/react';
import { ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MouseEventHandler } from 'react';
import './MobileBlockToolbar.css';

type MobileBlockToolbarProps = {
  isMobile: boolean;
};

export function MobileBlockToolbar({ isMobile }: MobileBlockToolbarProps) {
  const editor = useBlockNoteEditor();
  const suggestionMenu = useExtension(SuggestionMenu, { editor });

  const [anchorTop, setAnchorTop] = useState<number>();
  const [currentBlockId, setCurrentBlockId] = useState<string>();
  const [isDismissed, setIsDismissed] = useState(false);

  const syncToolbarState = () => {
    const cursorPosition = editor.getTextCursorPosition();
    const selectionBox = editor.getSelectionBoundingBox();
    setAnchorTop(selectionBox ? selectionBox.bottom + 8 : undefined);
    setCurrentBlockId(cursorPosition.block.id);
  };

  useEffect(() => {
    syncToolbarState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.document.length]);

  useEditorSelectionChange(() => {
    setIsDismissed(false);
    syncToolbarState();
  }, editor);

  useEffect(() => {
    if (!isMobile || isDismissed) return;
    const syncPosition = () => {
      const selectionBox = editor.getSelectionBoundingBox();
      setAnchorTop(selectionBox ? selectionBox.bottom + 8 : undefined);
    };

    window.addEventListener('resize', syncPosition);
    document.addEventListener('scroll', syncPosition, true);
    return () => {
      window.removeEventListener('resize', syncPosition);
      document.removeEventListener('scroll', syncPosition, true);
    };
  }, [editor, isDismissed, isMobile]);

  const currentBlock = currentBlockId ? editor.getBlock(currentBlockId) : undefined;

  const handleAddBlock: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    if (!currentBlock) return;

    const blockContent = currentBlock.content;
    const isBlockEmpty =
      blockContent !== undefined && Array.isArray(blockContent) && blockContent.length === 0;

    if (isBlockEmpty) {
      editor.setTextCursorPosition(currentBlock);
      suggestionMenu.openSuggestionMenu('/');
      return;
    }

    const insertedBlock = editor.insertBlocks([{ type: 'paragraph' }], currentBlock, 'after')[0];
    if (!insertedBlock) return;
    editor.setTextCursorPosition(insertedBlock);
    suggestionMenu.openSuggestionMenu('/');
  };

  const handleDeleteBlock: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    if (!currentBlock) return;
    editor.removeBlocks([currentBlock]);
  };

  const handleMoveBlockUp: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    editor.moveBlocksUp();
    syncToolbarState();
  };

  const handleMoveBlockDown: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    editor.moveBlocksDown();
    syncToolbarState();
  };

  const handleCloseToolbar: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    setIsDismissed(true);
  };

  if (!isMobile || !currentBlock || !anchorTop || !editor.isEditable || isDismissed) {
    return null;
  }

  return (
    <div
      className="mobile-block-toolbar-wrap"
      style={{
        top: anchorTop,
      }}
    >
      <div className="mobile-block-toolbar" role="toolbar" aria-label="Block actions">
        <button
          type="button"
          className="mobile-block-toolbar__button"
          aria-label="Add block"
          onMouseDown={handleAddBlock}
        >
          +
        </button>
        <div className="mobile-block-toolbar__turn-into">
          <BlockTypeSelect />
        </div>
        <button
          type="button"
          className="mobile-block-toolbar__button"
          aria-label="Delete block"
          onMouseDown={handleDeleteBlock}
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          className="mobile-block-toolbar__button"
          aria-label="Move block up"
          onMouseDown={handleMoveBlockUp}
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          className="mobile-block-toolbar__button"
          aria-label="Move block down"
          onMouseDown={handleMoveBlockDown}
        >
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          className="mobile-block-toolbar__button mobile-block-toolbar__button--close"
          aria-label="Close toolbar"
          onMouseDown={handleCloseToolbar}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
