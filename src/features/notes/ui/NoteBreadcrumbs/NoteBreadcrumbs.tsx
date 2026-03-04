import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  buildNoteLookupMaps,
  getAncestorChain,
  splitBreadcrumbAncestors,
} from '../../model/noteHierarchy';
import { DEFAULT_NOTE_TITLE } from '../../model/types';
import { notesRoutes } from '../../lib/routes';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui';
import type {
  BreadcrumbEllipsisDropdownProps,
  BreadcrumbAncestorLinkProps,
  NoteBreadcrumbsProps,
} from './NoteBreadcrumbs.types';

const TRUNCATE_CLASS = 'max-w-[130px] sm:max-w-[220px] truncate inline-block';
const MAX_VISIBLE_LINKS = 3;

function BreadcrumbEllipsisDropdown({
  ancestorIds,
  titleById,
  onNavigate,
}: BreadcrumbEllipsisDropdownProps) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <BreadcrumbEllipsis />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              {ancestorIds.map((aid) => (
                <DropdownMenuItem
                  key={aid}
                  onClick={() => onNavigate(aid)}
                  className="cursor-pointer"
                >
                  <span className={TRUNCATE_CLASS}>
                    {titleById.get(aid) ?? DEFAULT_NOTE_TITLE}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </BreadcrumbItem>
    </>
  );
}

function BreadcrumbAncestorLink({ id, title }: BreadcrumbAncestorLinkProps) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink asChild>
          <Link
            to={notesRoutes.editor(id)}
            className={`${TRUNCATE_CLASS} text-muted-foreground hover:text-foreground hover:underline`}
          >
            {title}
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
    </>
  );
}

export function NoteBreadcrumbs({ activeId, notes, currentTitle }: NoteBreadcrumbsProps) {
  const navigate = useNavigate();

  const { byId, titleById } = useMemo(
    () => buildNoteLookupMaps(notes ?? []),
    [notes]
  );

  const ancestorIds = useMemo(
    () => getAncestorChain(activeId, byId),
    [activeId, byId]
  );

  const { hidden, visible } = useMemo(
    () => splitBreadcrumbAncestors(ancestorIds, MAX_VISIBLE_LINKS),
    [ancestorIds]
  );

  const displayTitle = currentTitle.trim() || DEFAULT_NOTE_TITLE;

  const handleNavigate = (id: string) => navigate(notesRoutes.editor(id));

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="text-[13px] gap-1.5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to={notesRoutes.list()}
              className={`${TRUNCATE_CLASS} text-muted-foreground hover:text-foreground hover:underline`}
            >
              Notes
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {hidden.length > 0 && (
          <BreadcrumbEllipsisDropdown
            ancestorIds={hidden}
            titleById={titleById}
            onNavigate={handleNavigate}
          />
        )}

        {visible.map((aid) => (
          <BreadcrumbAncestorLink
            key={aid}
            id={aid}
            title={titleById.get(aid) ?? DEFAULT_NOTE_TITLE}
          />
        ))}

        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className={`${TRUNCATE_CLASS} font-medium`}>
            {displayTitle}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
