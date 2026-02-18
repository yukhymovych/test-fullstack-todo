import { useAuth } from '../contexts/AuthContext';
import { decodeTokenPayload } from '@/shared/lib/auth';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

function getInitials(username: string): string {
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export function UserInfo() {
  const { token, logout } = useAuth();
  const payload = token ? decodeTokenPayload(token) : null;
  const username = payload?.username ?? 'User';

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
            <AvatarFallback className="bg-muted text-xs">
              {getInitials(username)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">{username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
