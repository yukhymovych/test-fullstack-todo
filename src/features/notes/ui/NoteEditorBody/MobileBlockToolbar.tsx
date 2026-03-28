import { SuggestionMenu } from '@blocknote/core/extensions';
import {
  BlockTypeSelect,
  useBlockNoteEditor,
  useEditorSelectionChange,
  useExtension,
} from '@blocknote/react';
import { ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { MouseEventHandler } from 'react';
import './MobileBlockToolbar.css';

type MobileBlockToolbarProps = {
  isMobile: boolean;
  interactionVersion: number;
};

export function MobileBlockToolbar({
  isMobile,
  interactionVersion,
}: MobileBlockToolbarProps) {
  const editor = useBlockNoteEditor();
  const suggestionMenu = useExtension(SuggestionMenu, { editor });

  const [anchorTop, setAnchorTop] = useState<number>();
  const [currentBlockId, setCurrentBlockId] = useState<string>();
  const [dismissedAtInteractionVersion, setDismissedAtInteractionVersion] = useState<number | null>(
    null,
  );
  const isDismissed = dismissedAtInteractionVersion === interactionVersion;

  const syncToolbarState = useCallback(() => {
    const cursorPosition = editor.getTextCursorPosition();
    const selectionBox = editor.getSelectionBoundingBox();
    setAnchorTop(selectionBox ? selectionBox.bottom + 8 : undefined);
    setCurrentBlockId(cursorPosition.block.id);
  }, [editor]);

  useEffect(() => {
    if (!isMobile || interactionVersion === 0) return;
    const frameId = window.requestAnimationFrame(syncToolbarState);
    return () => window.cancelAnimationFrame(frameId);
  }, [interactionVersion, isMobile, syncToolbarState]);

  useEditorSelectionChange(() => {
    if (!isMobile || interactionVersion === 0) return;
    syncToolbarState();
  }, editor);

  useEffect(() => {
    if (!isMobile || interactionVersion === 0 || isDismissed) return;
    const frameId = window.requestAnimationFrame(syncToolbarState);
    return () => window.cancelAnimationFrame(frameId);
  }, [editor.document.length, interactionVersion, isDismissed, isMobile, syncToolbarState]);

  useEffect(() => {
    if (!isMobile || interactionVersion === 0 || isDismissed) return;
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
  }, [editor, interactionVersion, isDismissed, isMobile]);

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
    setDismissedAtInteractionVersion(interactionVersion);
  };

  if (
    !isMobile ||
    interactionVersion === 0 ||
    !currentBlock ||
    !anchorTop ||
    !editor.isEditable ||
    isDismissed
  ) {
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
