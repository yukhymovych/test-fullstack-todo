import {
  DropdownMenuContent,
  DropdownMenuItem,
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
  useDeactivateLearningPage,
  useStartScopedLearningSession,
} from '@/features/learning/model';
import { learningRoutes } from '@/features/learning/lib/routes';
import type { NotePageActionsMenuProps } from './NotePageActionsMenu.types';

export function NotePageActionsMenu({
  noteId,
  isFavorite,
  hasChildren = false,
  onAddToFavorites,
  onRemoveFromFavorites,
  onCreateChild,
  onDelete,
  isDeleting,
}: NotePageActionsMenuProps) {
  const navigate = useNavigate();
  const { data: studyStatus } = useStudyItemStatus(noteId);
  const activateLearning = useActivateLearningPage();
  const activateLearningScoped = useActivateLearningPageScoped();
  const deactivateLearning = useDeactivateLearningPage();
  const startScopedSession = useStartScopedLearningSession();

  const isLearningActive = studyStatus?.status === 'active';

  const handleLearnAllChildren = () => {
    startScopedSession.mutate(noteId, {
      onSuccess: (result) => {
        if ('reason' in result) {
          if (result.reason === 'NO_ELIGIBLE_PAGES') {
            showToast(
              'No eligible pages to learn. All child pages are either due in global learning or already studied today.'
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
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem onClick={handleSetAsLearning}>
            Set as learning page
          </DropdownMenuItem>
        )
      )}
      {hasChildren && (
        <DropdownMenuItem
          onClick={handleLearnAllChildren}
          disabled={startScopedSession.isPending}
        >
          {startScopedSession.isPending ? 'Starting...' : 'Learn all children pages'}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => onCreateChild(noteId)}>
        Add new page
      </DropdownMenuItem>
      <DropdownMenuItem
        variant="destructive"
        onClick={() => onDelete(noteId)}
        disabled={isDeleting}
      >
        Delete page
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
