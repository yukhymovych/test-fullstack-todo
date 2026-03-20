import {
  DEFAULT_EXPORT_NOTE_TITLE,
  NOTE_EXPORT_VERSION,
} from './noteImportExport.constants';

const EXPORT_DOCUMENT_STYLES = `
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    body {
      padding: 32px 20px 64px;
    }

    [data-rememo-export="note"] {
      max-width: 760px;
      margin: 0 auto;
    }

    [data-rememo-export-content] {
      line-height: 1.7;
      font-size: 1.125rem;
      word-break: break-word;
    }

    [data-rememo-export-content] > :first-child {
      margin-top: 0;
    }

    [data-rememo-export-content] > :last-child {
      margin-bottom: 0;
    }

    [data-rememo-export-content] h1,
    [data-rememo-export-content] h2,
    [data-rememo-export-content] h3,
    [data-rememo-export-content] h4,
    [data-rememo-export-content] h5,
    [data-rememo-export-content] h6 {
      margin: 2rem 0 1rem;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    [data-rememo-export-content] h1 { font-size: 3rem; }
    [data-rememo-export-content] h2 { font-size: 2.35rem; }
    [data-rememo-export-content] h3 { font-size: 1.8rem; }
    [data-rememo-export-content] h4 { font-size: 1.45rem; }

    [data-rememo-export-content] p,
    [data-rememo-export-content] ul,
    [data-rememo-export-content] ol,
    [data-rememo-export-content] pre,
    [data-rememo-export-content] blockquote,
    [data-rememo-export-content] hr {
      margin: 1rem 0;
    }

    [data-rememo-export-content] ul,
    [data-rememo-export-content] ol {
      padding-left: 1.6rem;
    }

    [data-rememo-export-content] li + li {
      margin-top: 0.4rem;
    }

    [data-rememo-export-content] strong {
      font-weight: 700;
    }

    [data-rememo-export-content] em {
      font-style: italic;
    }

    [data-rememo-export-content] hr {
      border: 0;
      border-top: 1px solid var(--rememo-border);
    }

    [data-rememo-export-content] blockquote {
      border-left: 3px solid var(--rememo-quote-border);
      padding-left: 1rem;
    }

    [data-rememo-export-content] code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.92em;
      background: var(--rememo-code-bg);
      border-radius: 6px;
      padding: 0.12em 0.35em;
    }

    [data-rememo-export-content] pre {
      overflow-x: auto;
      background: var(--rememo-code-bg);
      border: 1px solid var(--rememo-border);
      border-radius: 12px;
      padding: 1rem 1.1rem;
    }

    [data-rememo-export-content] pre code {
      background: transparent;
      padding: 0;
      border-radius: 0;
    }

    @media (max-width: 767px) {
      body {
        padding: 20px 14px 40px;
      }

      [data-rememo-export-content] {
        font-size: 1rem;
      }

      [data-rememo-export-content] h1 { font-size: 2.35rem; }
      [data-rememo-export-content] h2 { font-size: 1.9rem; }
      [data-rememo-export-content] h3 { font-size: 1.55rem; }
    }
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildExportHtmlDocument(input: {
  title: string;
  bodyHtml: string;
  noteId?: string;
}) {
  const title = input.title.trim() || DEFAULT_EXPORT_NOTE_TITLE;
  const noteIdMeta = input.noteId
    ? `\n    <meta name="rememo-note-id" content="${escapeHtml(input.noteId)}" />`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="rememo-export-version" content="${NOTE_EXPORT_VERSION}" />${noteIdMeta}
    <title>${escapeHtml(title)}</title>
    <style>${EXPORT_DOCUMENT_STYLES}</style>
  </head>
  <body data-rememo-export="note">
    <main data-rememo-export-content>
      ${input.bodyHtml}
    </main>
  </body>
</html>`;
}

function unwrapElement(element: Element) {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

export function sanitizeImportedHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach((node) => {
    node.remove();
  });

  doc.querySelectorAll('*').forEach((element) => {
    const attributes = [...element.attributes];
    for (const attribute of attributes) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  return doc.body.innerHTML;
}

export function normalizeImportedHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

  doc.querySelectorAll('span').forEach((element) => {
    if (element.attributes.length === 0) {
      unwrapElement(element);
    }
  });

  doc.querySelectorAll('div').forEach((element) => {
    const text = element.textContent?.trim() ?? '';
    if (text === '') {
      const hasMeaningfulChild = [...element.children].some((child) =>
        ['P', 'PRE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(
          child.tagName
        )
      );

      if (!hasMeaningfulChild) {
        element.remove();
      }
    }
  });

  return doc.body.innerHTML.trim();
}
