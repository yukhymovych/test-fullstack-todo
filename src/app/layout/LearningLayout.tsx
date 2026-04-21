import { Outlet } from 'react-router-dom';
import { useAppMode } from '@/features/offline/model/AppModeProvider';
import { LearningUnavailableOffline } from '@/features/offline/ui/LearningUnavailableOffline';

export function LearningLayout() {
  const { isReadOnly } = useAppMode();
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
      }}
    >
      {isReadOnly ? <LearningUnavailableOffline /> : <Outlet />}
    </div>
  );
}
