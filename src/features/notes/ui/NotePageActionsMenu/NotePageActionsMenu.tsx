import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/ui';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/shared/lib/toast';
import {
  useStudyItemStatus,
  useActivateLearningPage,
  useActivateLearningPageScoped,
  useActivateLearningPageDescendantsOnly,
  useDeactivateLearningPage,
  useStartScopedLearningSession,
} from '@/features/learning/model';
import { learningRoutes } from '@/features/learning/lib/routes';
import type { NotePageActionsMenuProps } from './NotePageActionsMenu.types';
import { NoteImportExportMenuSection } from './NoteImportExportMenuSection';

export function NotePageActionsMenu({
  noteId,
  isFavorite,
  hasChildren = false,
  hasDescendantsInGlobal = false,
  onAddToFavorites,
  onRemoveFromFavorites,
  onCreateChild,
  onDelete,
  isDeleting,
  importExport,
}: NotePageActionsMenuProps) {
  const navigate = useNavigate();
  const { data: studyStatus } = useStudyItemStatus(noteId);
  const activateLearning = useActivateLearningPage();
  const activateLearningScoped = useActivateLearningPageScoped();
  const activateLearningDescendantsOnly = useActivateLearningPageDescendantsOnly();
  const deactivateLearning = useDeactivateLearningPage();
  const startScopedSession = useStartScopedLearningSession();
  const isBusy = importExport?.isBusy ?? false;

  const isLearningActive = studyStatus?.status === 'active';

  const handleLearnAllChildren = () => {
    startScopedSession.mutate({ rootNoteId: noteId, mode: 'deep_dive' }, {
      onSuccess: (result) => {
        if ('reason' in result) {
          if (result.reason === 'NO_ELIGIBLE_PAGES') {
            showToast(
              'No eligible pages to learn. All child pages have already been studied today.'
            );
          }
          return;
        }
        navigate(learningRoutes.sessionById(result.sessionId));
      },
    });
  };

  const handleLearnDueChildren = () => {
    startScopedSession.mutate({ rootNoteId: noteId, mode: 'due_only' }, {
      onSuccess: (result) => {
        if ('reason' in result) {
          if (result.reason === 'NO_ELIGIBLE_PAGES') {
            showToast(
              'No due child pages to learn right now.'
            );
          }
          return;
        }
        navigate(learningRoutes.sessionById(result.sessionId));
      },
    });
  };

  const handleSetAsLearning = () => {
    activateLearning.mutate(noteId);
  };

  const handleSetAsLearningScoped = () => {
    activateLearningScoped.mutate(noteId);
  };

  const handleSetAsLearningDescendantsOnly = () => {
    activateLearningDescendantsOnly.mutate(noteId);
  };

  const handleRemoveFromLearning = () => {
    deactivateLearning.mutate(noteId);
  };

  return (
    <DropdownMenuContent align="end">
      {isFavorite ? (
        <DropdownMenuItem onClick={() => onRemoveFromFavorites?.(noteId)}>
          Remove from Favorites
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => onAddToFavorites?.(noteId)}>
          Add to Favorites
        </DropdownMenuItem>
      )}
      {isLearningActive ? (
        <DropdownMenuItem onClick={handleRemoveFromLearning}>
          Remove from learning
        </DropdownMenuItem>
      ) : (
        hasChildren ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Set as learning page</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleSetAsLearning}>
                Add this page only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSetAsLearningScoped}>
                Add this page and descendants
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSetAsLearningDescendantsOnly}>
                Add only all descendants
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem onClick={handleSetAsLearning}>
            Set as learning page
          </DropdownMenuItem>
        )
      )}
      {hasChildren && hasDescendantsInGlobal && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Start scoped learning session</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={handleLearnAllChildren}
              disabled={startScopedSession.isPending}
            >
              {startScopedSession.isPending ? 'Starting...' : 'Deep dive (all children)'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLearnDueChildren}
              disabled={startScopedSession.isPending}
            >
              {startScopedSession.isPending ? 'Starting...' : 'Due only (todays review)'}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      <NoteImportExportMenuSection importExport={importExport} />
      {importExport ? <DropdownMenuSeparator /> : null}
      <DropdownMenuItem onClick={() => onCreateChild(noteId)}>
        Add new page
      </DropdownMenuItem>
      <DropdownMenuItem
        variant="destructive"
        onClick={() => onDelete(noteId)}
        disabled={isDeleting || isBusy}
      >
        Move to trash
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
