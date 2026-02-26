import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useTodayLearningSession } from '../model/useTodayLearningSession';
import { useTodayScopedSessions } from '../model/useTodayScopedSessions';
import { useDueStudyItemsCount } from '../model/useDueStudyItemsCount';
import { useStartLearningSession } from '../model/useStartLearningSession';
import { learningRoutes } from '../lib/routes';
import './LearningSidebarCard.css';

export function LearningSidebarCard() {
  const navigate = useNavigate();
  const { data: session, isLoading } = useTodayLearningSession();
  const { data: scopedSessions = [], isLoading: scopedLoading } =
    useTodayScopedSessions();
  const { data: dueCount = 0 } = useDueStudyItemsCount(!session);
  const startSession = useStartLearningSession();

  const pendingCount =
    session?.items.filter((i) => i.state === 'pending').length ?? 0;
  const totalCount = session?.items.length ?? 0;
  const hasSession = !!session && totalCount > 0;
  const canContinue = hasSession && pendingCount > 0;
  const hasItemsReady = !hasSession && dueCount > 0;
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
            <span className="learning-sidebar-card__remaining">{dueCount}</span>
            <span className="learning-sidebar-card__label"> items ready</span>
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
              {s.rootTitle}: {s.done}/{s.total}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
