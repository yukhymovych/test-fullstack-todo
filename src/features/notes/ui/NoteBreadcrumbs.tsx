import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAncestorChain } from '../model/noteHierarchy';
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

interface NoteBreadcrumbsProps {
  activeId: string;
  notes: Array<{ id: string; title?: string; parent_id?: string | null }> | undefined;
  currentTitle: string;
}

const TRUNCATE_CLASS = 'max-w-[220px] truncate inline-block';
const MAX_VISIBLE_LINKS = 3;

export function NoteBreadcrumbs({ activeId, notes, currentTitle }: NoteBreadcrumbsProps) {
  const navigate = useNavigate();

  const byId = new Map<string, { id: string; parent_id: string | null }>();
  if (notes) {
    for (const n of notes) {
      byId.set(n.id, { id: n.id, parent_id: n.parent_id ?? null });
    }
  }

  const ancestorIds = getAncestorChain(activeId, byId);
  const titleById = new Map<string, string>();
  if (notes) {
    for (const n of notes) {
      titleById.set(n.id, n.title ?? 'Untitled');
    }
  }

  const displayTitle = currentTitle.trim() || 'Untitled';

  // Total segments: Notes + ancestors + current
  const totalSegments = 1 + ancestorIds.length + 1;
  const shouldCollapse = totalSegments > MAX_VISIBLE_LINKS;

  // When collapsed: Notes / [dropdown] / lastAncestor / Current
  const hiddenInDropdown = shouldCollapse ? ancestorIds.slice(0, -1) : [];
  const visibleAncestors = shouldCollapse ? ancestorIds.slice(-1) : ancestorIds;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="text-[13px] gap-1.5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to="/notes"
              className={`${TRUNCATE_CLASS} text-muted-foreground hover:text-foreground hover:underline`}
            >
              Notes
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {shouldCollapse && hiddenInDropdown.length > 0 && (
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
                    {hiddenInDropdown.map((aid) => (
                      <DropdownMenuItem
                        key={aid}
                        onClick={() => navigate(`/notes/${aid}`)}
                        className="cursor-pointer"
                      >
                        <span className={TRUNCATE_CLASS}>
                          {titleById.get(aid) ?? 'Untitled'}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        )}

        {visibleAncestors.map((aid) => (
          <React.Fragment key={aid}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to={`/notes/${aid}`}
                  className={`${TRUNCATE_CLASS} text-muted-foreground hover:text-foreground hover:underline`}
                >
                  {titleById.get(aid) ?? 'Untitled'}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </React.Fragment>
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
