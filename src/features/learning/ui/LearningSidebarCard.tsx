import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useTodayLearningSession } from '../model/useTodayLearningSession';
import { useTodayScopedSessions } from '../model/useTodayScopedSessions';
import { useDueStudyItemsCount } from '../model/useDueStudyItemsCount';
import { useStartLearningSession } from '../model/useStartLearningSession';
import { learningRoutes } from '../lib/routes';
import './LearningSidebarCard.css';

const GLOBAL_DAILY_CAP = 15;

const SCOPED_MODE_LABEL: Record<'deep_dive' | 'due_only', string> = {
  deep_dive: 'Deep dive',
  due_only: 'Due only',
};

export function LearningSidebarCard() {
  const navigate = useNavigate();
  const { data: session, isLoading } = useTodayLearningSession();
  const { data: scopedSessions = [], isLoading: scopedLoading } =
    useTodayScopedSessions();
  const { data: dueCount = 0 } = useDueStudyItemsCount(!session);
  const startSession = useStartLearningSession();

  const reviewableItems =
    session?.items.filter((i) => i.state !== 'unavailable') ?? [];
  const pendingCount = reviewableItems.filter((i) => i.state === 'pending').length;
  const totalCount = reviewableItems.length;
  const hasSession = !!session && totalCount > 0;
  const canContinue = hasSession && pendingCount > 0;
  const hasItemsReady = !hasSession && dueCount > 0;
  const sessionCapacity = Math.min(dueCount, GLOBAL_DAILY_CAP);
  const queuedCount = Math.max(dueCount - sessionCapacity, 0);
  const activeScopedSessions = scopedSessions.filter((s) => s.total > 0);

  const handleStartOrContinue = () => {
    if (canContinue) {
      navigate(learningRoutes.session());
      return;
    }
    startSession.mutate(undefined, {
      onSuccess: (data) => {
        if (data) navigate(learningRoutes.session());
      },
    });
  };

  if (isLoading || scopedLoading) {
    return (
      <div className="learning-sidebar-card">
        <div className="learning-sidebar-card__loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="learning-sidebar-card">
      <div className="learning-sidebar-card__header">
        <BookOpen className="learning-sidebar-card__icon size-4" />
        <span>Learning</span>
      </div>
      <div className="learning-sidebar-card__stats">
        {hasSession ? (
          <>
            <span className="learning-sidebar-card__remaining">{pendingCount}</span>
            <span className="learning-sidebar-card__separator">/</span>
            <span className="learning-sidebar-card__total">{totalCount}</span>
            <span className="learning-sidebar-card__label"> remaining</span>
          </>
        ) : hasItemsReady ? (
          <>
            <div>
              <span className="learning-sidebar-card__remaining">{dueCount}</span>
              <span className="learning-sidebar-card__label"> ready</span>
            </div>
            <div className="learning-sidebar-card__hint">
              Today&apos;s session: up to {sessionCapacity} item
              {sessionCapacity === 1 ? '' : 's'}
            </div>
            {queuedCount > 0 && (
              <div className="learning-sidebar-card__hint">
                {queuedCount} remain in queue
              </div>
            )}
          </>
        ) : (
          <span className="learning-sidebar-card__label">No items due</span>
        )}
      </div>
      <Button
        variant="ghost-muted"
        fullWidth
        onClick={handleStartOrContinue}
        disabled={startSession.isPending}
      >
        {startSession.isPending
          ? 'Starting...'
          : canContinue
            ? 'Continue'
            : hasItemsReady
              ? "Start today's session"
              : 'Start Learning'}
      </Button>
      {activeScopedSessions.length > 0 && (
        <div className="learning-sidebar-card__scoped">
          <span className="learning-sidebar-card__scoped-label">
            Continue scoped sessions
          </span>
          {activeScopedSessions.map((s) => (
            <Button
              key={s.sessionId}
              variant="ghost-muted"
              fullWidth
              className="learning-sidebar-card__scoped-btn"
              onClick={() => navigate(learningRoutes.sessionById(s.sessionId))}
            >
              {s.rootTitle} ({SCOPED_MODE_LABEL[s.mode]}): {s.done}/{s.total}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
