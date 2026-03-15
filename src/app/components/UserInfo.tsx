import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
} from '@/shared/ui';
import { FolderMinus, LogOut, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEBUG_ACTIONS } from '@/shared/config/env';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserInfo() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = user?.name ?? user?.email ?? 'User';
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
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-2 rounded-md px-2 py-1.5',
            'bg-white/5 text-[#d1d5db] hover:bg-white/10'
          )}
        >
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
        {DEBUG_ACTIONS && (
          <>
            <DropdownMenuItem
              onClick={handleAddMore}
              disabled={refillSession.isPending}
              className="text-muted-foreground"
            >
              <Plus className="size-4" />
              {refillSession.isPending ? 'Adding...' : 'Add more items (debug)'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleResetSession}
              disabled={isResetting}
              className="text-muted-foreground"
            >
              <RotateCcw className="size-4" />
              {isResetting ? 'Resetting...' : 'Reset session (debug)'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteFutureSessions.mutate(undefined)}
              disabled={deleteFutureSessions.isPending}
              className="text-muted-foreground"
            >
              <Trash2 className="size-4" />
              {deleteFutureSessions.isPending
                ? 'Deleting...'
                : 'Delete future sessions (debug)'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteTodayScopedSessions.mutate(undefined)}
              disabled={deleteTodayScopedSessions.isPending}
              className="text-muted-foreground"
            >
              <FolderMinus className="size-4" />
              {deleteTodayScopedSessions.isPending
                ? 'Deleting...'
                : 'Delete today scoped sessions (debug)'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => refreshAllGrades.mutate(undefined)}
              disabled={refreshAllGrades.isPending}
              className="text-muted-foreground"
            >
              <RefreshCw className="size-4" />
              {refreshAllGrades.isPending
                ? 'Refreshing...'
                : 'Refresh all grades (debug)'}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
