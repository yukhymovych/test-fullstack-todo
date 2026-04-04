import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/ui';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('notes');
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
              t('menu.toasts.noEligiblePages')
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
              t('menu.toasts.noDueChildPages')
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
          {t('menu.removeFromFavorites')}
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => onAddToFavorites?.(noteId)}>
          {t('menu.addToFavorites')}
        </DropdownMenuItem>
      )}
      {isLearningActive ? (
        <DropdownMenuItem onClick={handleRemoveFromLearning}>
          {t('menu.removeFromLearning')}
        </DropdownMenuItem>
      ) : (
        hasChildren ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('menu.setAsLearningPage')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleSetAsLearning}>
                {t('menu.setLearningThisPageOnly')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSetAsLearningScoped}>
                {t('menu.setLearningThisPageAndDescendants')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSetAsLearningDescendantsOnly}>
                {t('menu.setLearningDescendantsOnly')}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem onClick={handleSetAsLearning}>
            {t('menu.setAsLearningPage')}
          </DropdownMenuItem>
        )
      )}
      {hasChildren && hasDescendantsInGlobal && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t('menu.startScopedLearningSession')}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={handleLearnAllChildren}
              disabled={startScopedSession.isPending}
            >
              {startScopedSession.isPending ? t('menu.starting') : t('menu.deepDiveAllChildren')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLearnDueChildren}
              disabled={startScopedSession.isPending}
            >
              {startScopedSession.isPending ? t('menu.starting') : t('menu.dueOnlyTodaysReview')}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      <NoteImportExportMenuSection importExport={importExport} />
      {importExport ? <DropdownMenuSeparator /> : null}
      <DropdownMenuItem onClick={() => onCreateChild(noteId)}>
        {t('menu.addNewPage')}
      </DropdownMenuItem>
      <DropdownMenuItem
        variant="destructive"
        onClick={() => onDelete(noteId)}
        disabled={isDeleting || isBusy}
      >
        {t('menu.moveToTrash')}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
