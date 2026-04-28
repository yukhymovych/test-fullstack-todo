import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import {
  useDeleteFutureSessionsDebug,
  useDeleteTodayScopedSessionsDebug,
  useRefreshAllGradesDebug,
  useRefillSessionDebug,
  useResetSessionDebug,
  useStartLearningSession,
} from '@/features/learning/model/useStartLearningSession';
import { learningRoutes } from '@/features/learning/lib/routes';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Spinner,
} from '@/shared/ui';
import {
  FolderMinus,
  Languages,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { DEBUG_ACTIONS } from '@/shared/config/env';
import { notesRoutes } from '@/features/notes/lib/routes';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export interface UserInfoProps {
  onNavigate?: () => void;
}

export function UserInfo({ onNavigate }: UserInfoProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const displayName = user?.name ?? user?.email ?? t('user.fallbackName');
  const deleteFutureSessions = useDeleteFutureSessionsDebug();
  const deleteTodayScopedSessions = useDeleteTodayScopedSessionsDebug();
  const refreshAllGrades = useRefreshAllGradesDebug();
  const refillSession = useRefillSessionDebug();
  const resetSession = useResetSessionDebug();
  const startSession = useStartLearningSession();

  const handleAddMore = () => {
    refillSession.mutate(undefined, {
      onSuccess: (data) => {
        if (data?.items.some((i) => i.state === 'pending')) {
          navigate(learningRoutes.session());
        }
      },
    });
  };

  const handleResetSession = () => {
    resetSession.mutate(undefined, {
      onSuccess: () => {
        startSession.mutate(undefined, {
          onSuccess: (data) => {
            if (data) navigate(learningRoutes.session());
          },
        });
      },
    });
  };

  const isResetting =
    resetSession.isPending || (resetSession.isSuccess && startSession.isPending);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size='sm'>
          <Avatar className="h-8 w-8 shrink-0">
            {user?.picture && <AvatarImage src={user.picture} alt={displayName} />}
            <AvatarFallback className="bg-muted text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem
          onClick={() => {
            navigate(notesRoutes.settings());
            onNavigate?.();
          }}
        >
          <Languages className="size-4" />
          {t('userMenu.settings')}
        </DropdownMenuItem>
        {DEBUG_ACTIONS && (
          <>
            <DropdownMenuItem
              onClick={handleAddMore}
              disabled={refillSession.isPending}
              className="text-muted-foreground"
            >
              <Plus className="size-4" />
              {refillSession.isPending ? (
                <>
                  <Spinner announce={false} size="sm" />
                  <span className="sr-only">{t('userMenu.debug.adding')}</span>
                </>
              ) : (
                t('userMenu.debug.addMore')
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleResetSession}
              disabled={isResetting}
              className="text-muted-foreground"
            >
              <RotateCcw className="size-4" />
              {isResetting ? (
                <>
                  <Spinner announce={false} size="sm" />
                  <span className="sr-only">{t('userMenu.debug.resetting')}</span>
                </>
              ) : (
                t('userMenu.debug.resetSession')
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteFutureSessions.mutate(undefined)}
              disabled={deleteFutureSessions.isPending}
              className="text-muted-foreground"
            >
              <Trash2 className="size-4" />
              {deleteFutureSessions.isPending ? (
                <>
                  <Spinner announce={false} size="sm" />
                  <span className="sr-only">{t('userMenu.debug.deleting')}</span>
                </>
              ) : (
                t('userMenu.debug.deleteFutureSessions')
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteTodayScopedSessions.mutate(undefined)}
              disabled={deleteTodayScopedSessions.isPending}
              className="text-muted-foreground"
            >
              <FolderMinus className="size-4" />
              {deleteTodayScopedSessions.isPending ? (
                <>
                  <Spinner announce={false} size="sm" />
                  <span className="sr-only">{t('userMenu.debug.deleting')}</span>
                </>
              ) : (
                t('userMenu.debug.deleteTodayScopedSessions')
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => refreshAllGrades.mutate(undefined)}
              disabled={refreshAllGrades.isPending}
              className="text-muted-foreground"
            >
              <RefreshCw className="size-4" />
              {refreshAllGrades.isPending ? (
                <>
                  <Spinner announce={false} size="sm" />
                  <span className="sr-only">{t('userMenu.debug.refreshing')}</span>
                </>
              ) : (
                t('userMenu.debug.refreshAllGrades')
              )}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut className="size-4" />
          {t('userMenu.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
