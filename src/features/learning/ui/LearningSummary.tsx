import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { useRefillSessionDebug } from '../model';
import type { LearningSessionItem } from '../domain/learning.types';

export interface LearningSummaryProps {
  items: LearningSessionItem[];
}

export function LearningSummary({ items }: LearningSummaryProps) {
  const navigate = useNavigate();
  const refillSession = useRefillSessionDebug();
  const doneCount = items.filter((i) => i.state === 'done').length;
  const totalCount = items.length;

  const handleDone = () => {
    navigate('/notes');
  };

  const handleAddMore = () => {
    refillSession.mutate(undefined, {
      onSuccess: (data) => {
        if (data && data.items.some((i) => i.state === 'pending')) {
          // Stay on page - session will refetch and show pending items
        }
      },
    });
  };

  return (
    <div className="learning-summary">
      <h2 className="learning-summary__title">Session Complete</h2>
      <p className="learning-summary__stats">
        You reviewed {doneCount} of {totalCount} items.
      </p>
      <div className="learning-summary__actions">
        <Button variant="primary" onClick={handleDone} className="learning-summary__btn">
          Done
        </Button>
        <Button
          variant="secondary"
          onClick={handleAddMore}
          disabled={refillSession.isPending}
          className="learning-summary__btn learning-summary__btn--debug"
        >
          {refillSession.isPending ? 'Adding...' : 'Add more items (debug)'}
        </Button>
      </div>
    </div>
  );
}
