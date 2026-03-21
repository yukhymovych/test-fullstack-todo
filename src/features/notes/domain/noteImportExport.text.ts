export function normalizeExportText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(
      /^\[([^\]]+)\]\(\/notes\/([^)]+)\)\s*$/gm,
      (_match: string, title: string) => title.trim()
    )
    .replace(
      /^\[Embedded page:\s*(.+?)\]\s+\(note:\s*([^)]+)\)\s*$/gm,
      (_match: string, title: string) => title.trim()
    )
    .trimEnd();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function applyInlineMarkdown(text: string): string {
  const codeSpans: string[] = [];
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, (_, code: string) => {
    const placeholder = `__REMEMO_CODE_${codeSpans.length}__`;
    codeSpans.push(`<code>${code}</code>`);
    return placeholder;
  });

  html = html.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g,
    (_, label: string, href: string) => `<a href="${href}">${label}</a>`
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?;:]|$)/g, '$1<em>$2</em>');
  html = html.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?;:]|$)/g, '$1<em>$2</em>');
  html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');

  for (const [index, codeHtml] of codeSpans.entries()) {
    html = html.replace(`__REMEMO_CODE_${index}__`, codeHtml);
  }

  return html;
}

type MarkdownListItem = {
  indent: number;
  type: 'ul' | 'ol';
  content: string;
};

function getIndentSize(value: string): number {
  return value.replace(/\t/g, '    ').length;
}

function tryParseListItem(line: string): MarkdownListItem | null {
  const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
  if (!match) {
    return null;
  }

  return {
    indent: getIndentSize(match[1]),
    type: /\d+\./.test(match[2]) ? 'ol' : 'ul',
    content: match[3],
  };
}

function tryParseEmbeddedPagePlaceholder(line: string) {
  const match = line.match(/^\[Embedded page:\s*(.+?)\]\s+\(note:\s*([^)]+)\)\s*$/);
  if (!match) {
    return null;
  }

  return {
    title: match[1].trim(),
    noteId: match[2].trim(),
  };
}

function buildListHtml(lines: string[]): string {
  const items = lines
    .map((line) => tryParseListItem(line))
    .filter((item): item is MarkdownListItem => item !== null);

  if (items.length === 0) {
    return '';
  }

  const parts: string[] = [];
  const stack: Array<{ indent: number; type: 'ul' | 'ol'; liOpen: boolean }> = [];

  const closeCurrentLevel = () => {
    const current = stack.pop();
    if (!current) return;
    if (current.liOpen) {
      parts.push('</li>');
    }
    parts.push(`</${current.type}>`);
  };

  for (const item of items) {
    while (stack.length > 0 && item.indent < stack[stack.length - 1].indent) {
      closeCurrentLevel();
    }

    const current = stack[stack.length - 1];
    if (current && item.indent === current.indent && item.type !== current.type) {
      closeCurrentLevel();
    }

    const active = stack[stack.length - 1];
    if (!active || item.indent > active.indent) {
      parts.push(`<${item.type}>`);
      stack.push({ indent: item.indent, type: item.type, liOpen: false });
    } else if (active.liOpen) {
      parts.push('</li>');
      active.liOpen = false;
    }

    parts.push(`<li>${applyInlineMarkdown(item.content.trim())}`);
    stack[stack.length - 1].liOpen = true;
  }

  while (stack.length > 0) {
    closeCurrentLevel();
  }

  return parts.join('');
}

export function convertTextToImportHtml(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const parts: string[] = [];
  let paragraphLines: string[] = [];
  let codeFenceLanguage = '';
  let codeLines: string[] = [];
  let inCodeFence = false;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const content = paragraphLines.join(' ').trim();
    if (content) {
      parts.push(`<p>${applyInlineMarkdown(content)}</p>`);
    }
    paragraphLines = [];
  };

  const flushCodeFence = () => {
    if (!inCodeFence) return;
    const languageAttr = codeFenceLanguage
      ? ` data-language="${escapeHtml(codeFenceLanguage)}"`
      : '';
    parts.push(
      `<pre><code${languageAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`
    );
    codeFenceLanguage = '';
    codeLines = [];
    inCodeFence = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^```([\w-]+)?\s*$/);
    if (fenceMatch) {
      if (inCodeFence) {
        flushCodeFence();
      } else {
        flushParagraph();
        inCodeFence = true;
        codeFenceLanguage = fenceMatch[1] ?? '';
      }
      continue;
    }

    if (inCodeFence) {
      codeLines.push(line);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    const embeddedPagePlaceholder = tryParseEmbeddedPagePlaceholder(line);
    if (embeddedPagePlaceholder) {
      flushParagraph();
      parts.push(
        `<p><a href="/notes/${escapeHtml(embeddedPagePlaceholder.noteId)}">${escapeHtml(
          embeddedPagePlaceholder.title
        )}</a></p>`
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const content = headingMatch[2].trim();
      if (content) {
        parts.push(`<h${level}>${applyInlineMarkdown(content)}</h${level}>`);
      }
      continue;
    }

    if (/^(\*\*\*|---|___)\s*$/.test(line.trim())) {
      flushParagraph();
      parts.push('<hr />');
      continue;
    }

    if (line.trimStart().startsWith('>')) {
      flushParagraph();
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].trimStart().startsWith('>')) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }

      index -= 1;
      const quoteHtml = convertTextToImportHtml(quoteLines.join('\n')).trim();
      if (quoteHtml) {
        parts.push(`<blockquote>${quoteHtml}</blockquote>`);
      }
      continue;
    }

    if (tryParseListItem(line)) {
      flushParagraph();
      const listLines: string[] = [];

      while (index < lines.length) {
        const currentLine = lines[index];
        if (currentLine.trim() === '') {
          break;
        }

        if (!tryParseListItem(currentLine)) {
          break;
        }

        listLines.push(currentLine);
        index += 1;
      }

      index -= 1;
      const listHtml = buildListHtml(listLines);
      if (listHtml) {
        parts.push(listHtml);
      }
      continue;
    }

    paragraphLines.push(line.trim());
  }

  flushParagraph();
  flushCodeFence();

  return parts.join('');
}
