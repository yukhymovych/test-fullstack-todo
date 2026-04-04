import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { useTranslation } from 'react-i18next';
import type { LearningSessionItem } from '../domain/learning.types';
import { notesRoutes } from '@/features/notes/lib/routes';

export interface LearningSummaryProps {
  items: LearningSessionItem[];
}

export function LearningSummary({ items }: LearningSummaryProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('learning');
  const reviewableItems = items.filter((i) => i.state !== 'unavailable');
  const doneCount = reviewableItems.filter((i) => i.state === 'done').length;
  const totalCount = reviewableItems.length;

  return (
    <div className="learning-summary">
      <h2 className="learning-summary__title">{t('summary.title')}</h2>
      <p className="learning-summary__stats">
        {t('summary.stats', { doneCount, totalCount })}
      </p>
      <div className="learning-summary__actions">
        <Button
          variant="primary"
          onClick={() => navigate(notesRoutes.list())}
          className="learning-summary__btn"
        >
          {t('summary.done')}
        </Button>
      </div>
    </div>
  );
}
