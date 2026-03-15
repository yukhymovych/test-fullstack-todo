import { useEffect } from 'react';

const APP_NAME = 'Rememo';

export function buildPageTitle(pageTitle?: string): string {
  const trimmed = pageTitle?.trim();
  if (!trimmed) return APP_NAME;
  return `${trimmed} | ${APP_NAME}`;
}

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = buildPageTitle(pageTitle);
  }, [pageTitle]);
}
