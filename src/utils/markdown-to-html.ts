function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '#';
  return url;
}

function renderInline(text: string): string {
  let result = escapeHtml(text);

  result = result.replace(/`([^`]+)`/g, '<code class="font-mono text-[12px] bg-paper-soft px-1 py-0.5 border border-rule">$1</code>');

  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) =>
    `<a href="${escapeHtml(sanitizeUrl(url))}" target="_blank" rel="noopener noreferrer" class="underline text-billiard hover:text-billiard-deep">${text}</a>`);

  return result;
}

function isTableRow(line: string): boolean {
  return line.startsWith('|') && line.endsWith('|');
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line);
}

function renderTable(lines: string[]): { html: string; consumed: number } {
  const headerLine = lines[0];
  const headers = headerLine.split('|').filter((c) => c.trim() !== '').map((c) => c.trim());

  let consumed = 1;
  if (consumed < lines.length && isTableSeparator(lines[consumed])) {
    consumed++;
  }

  const rows: string[][] = [];
  while (consumed < lines.length && isTableRow(lines[consumed]) && !isTableSeparator(lines[consumed])) {
    const cells = lines[consumed].split('|').filter((c) => c.trim() !== '').map((c) => c.trim());
    rows.push(cells);
    consumed++;
  }

  const headerHtml = headers.map((h) => `<th class="border border-rule bg-paper-soft px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">${renderInline(h)}</th>`).join('');
  const bodyHtml = rows.map((row) => {
    const cells = row.map((c) => `<td class="border border-rule px-3 py-1.5 text-[13px] text-ink">${renderInline(c)}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const html = `<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-rule"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
  return { html, consumed };
}

export function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const output: string[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLang = '';

  while (i < lines.length) {
    const line = lines[i];

    if (!inCodeBlock && line.startsWith('```')) {
      inCodeBlock = true;
      codeBlockLang = line.slice(3).trim();
      codeBlockContent = '';
      i++;
      continue;
    }

    if (inCodeBlock) {
      if (line.startsWith('```')) {
        const langAttr = codeBlockLang ? ` data-lang="${escapeHtml(codeBlockLang)}"` : '';
        output.push(`<pre class="bg-paper-soft border border-rule p-4 my-4 overflow-x-auto font-mono text-[12px] leading-relaxed text-ink"${langAttr}><code>${escapeHtml(codeBlockContent.replace(/\n$/, ''))}</code></pre>`);
        inCodeBlock = false;
        codeBlockContent = '';
        codeBlockLang = '';
        i++;
        continue;
      }
      codeBlockContent += line + '\n';
      i++;
      continue;
    }

    if (isTableRow(line) && !isTableSeparator(line)) {
      const { html, consumed } = renderTable(lines.slice(i));
      output.push(html);
      i += consumed;
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const headingSizes: Record<number, string> = {
          1: 'text-[2rem] tracking-[0.04em] mt-10 mb-4',
          2: 'text-[1.3rem] tracking-[0.03em] mt-8 mb-3',
          3: 'text-[1.1rem] tracking-[0.02em] mt-6 mb-2',
          4: 'text-[1rem] mt-5 mb-2',
          5: 'text-[0.9rem] mt-4 mb-1',
          6: 'text-[0.85rem] mt-4 mb-1',
        };
        const cls = headingSizes[level] || headingSizes[1];
        output.push(`<h${level} class="font-display text-ink ${cls}">${renderInline(match[2])}</h${level}>`);
      }
      i++;
      continue;
    }

    if (/^---\s*$/.test(line)) {
      output.push('<hr class="border-rule my-6" />');
      i++;
      continue;
    }

    if (/^-\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^-\s/.test(lines[i])) {
        const content = lines[i].replace(/^-\s+/, '');
        listItems.push(`<li class="text-[13px] text-ink leading-relaxed ml-5 list-disc marker:text-gold-deep">${renderInline(content)}</li>`);
        i++;
      }
      output.push(`<ul class="space-y-1 my-3">${listItems.join('')}</ul>`);
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|```|---\s*$|-\s)/.test(lines[i]) && !(isTableRow(lines[i]) && !isTableSeparator(lines[i]))) {
      paragraphLines.push(lines[i]);
      i++;
    }
    const paragraph = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();
    if (paragraph) {
      output.push(`<p class="text-[13px] text-ink leading-relaxed my-2">${renderInline(paragraph)}</p>`);
    }
  }

  return output.join('\n');
}
