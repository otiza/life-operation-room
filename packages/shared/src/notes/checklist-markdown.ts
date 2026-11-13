const TASK_MARKER_RE = /<!--tiza-task:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-->/i;
const CHECKLIST_RE = /^-\s+\[([ xX])\]\s+(.*)$/;

export type NoteParagraphBlock = {
  type: 'paragraph';
  text: string;
};

export type NoteChecklistBlock = {
  type: 'checklist';
  checked: boolean;
  text: string;
  taskId: string | null;
};

export type NoteBlock = NoteParagraphBlock | NoteChecklistBlock;

export function formatTaskMarker(taskId: string): string {
  return `<!--tiza-task:${taskId}-->`;
}

export function extractTaskId(raw: string): string | null {
  const match = TASK_MARKER_RE.exec(raw);
  return match?.[1] ?? null;
}

export function stripTaskMarker(raw: string): string {
  return raw.replace(/ ?<!--tiza-task:[0-9a-f-]{36}-->/i, '');
}

function parseChecklistLine(line: string): NoteChecklistBlock | null {
  const match = CHECKLIST_RE.exec(line);
  if (!match) return null;
  const checked = match[1].toLowerCase() === 'x';
  const rest = match[2] ?? '';
  const taskId = extractTaskId(rest);
  const text = stripTaskMarker(rest);
  return { type: 'checklist', checked, text, taskId };
}

/** Parse note Markdown into paragraphs and checklist lines only. */
export function parseNoteMarkdown(body: string): NoteBlock[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: NoteBlock[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (!paragraphLines.length) return;
    const text = paragraphLines.join('\n');
    paragraphLines = [];
    if (text.length) blocks.push({ type: 'paragraph', text });
  }

  for (const line of lines) {
    const checklist = parseChecklistLine(line);
    if (checklist) {
      flushParagraph();
      blocks.push(checklist);
      continue;
    }
    if (line.trim() === '') {
      // A blank line ends a paragraph; blank lines between blocks are not content.
      flushParagraph();
      continue;
    }
    paragraphLines.push(line);
  }
  flushParagraph();
  return blocks;
}

/** Serialize blocks back to the supported Markdown subset. */
export function serializeNoteMarkdown(blocks: NoteBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      if (block.text.length) parts.push(block.text);
      continue;
    }
    const mark = block.checked ? 'x' : ' ';
    const marker = block.taskId ? ` ${formatTaskMarker(block.taskId)}` : '';
    parts.push(`- [${mark}] ${block.text}${marker}`);
  }
  return parts.join('\n\n');
}

/**
 * Normalize arbitrary Markdown to paragraphs + checklist lines.
 * Headings, emphasis markers, and other syntax become plain paragraph text.
 */
export function normalizeNoteMarkdown(body: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: NoteBlock[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (!paragraphLines.length) return;
    const text = paragraphLines.join('\n');
    paragraphLines = [];
    if (text.length) blocks.push({ type: 'paragraph', text });
  }

  for (const rawLine of lines) {
    const checklist = parseChecklistLine(rawLine);
    if (checklist) {
      flushParagraph();
      blocks.push(checklist);
      continue;
    }
    if (rawLine.trim() === '') {
      flushParagraph();
      continue;
    }
    // Flatten common Markdown prefixes into plain text for this v1 subset.
    let line = rawLine
      .replace(/^#{1,6}\s+/, '')
      .replace(/^>\s?/, '')
      .replace(/^[*+-]\s+(?!\[[ xX]\])/, '')
      .replace(/^\d+\.\s+/, '');
    paragraphLines.push(line);
  }
  flushParagraph();
  return serializeNoteMarkdown(blocks);
}

export function setChecklistTaskId(block: NoteChecklistBlock, taskId: string, checked?: boolean): NoteChecklistBlock {
  return {
    ...block,
    taskId,
    checked: checked ?? block.checked,
  };
}

export function replaceChecklistLine(
  body: string,
  lineIndex: number,
  updater: (block: NoteChecklistBlock) => NoteChecklistBlock,
): string {
  const blocks = parseNoteMarkdown(body);
  let checklistIndex = -1;
  const next = blocks.map((block) => {
    if (block.type !== 'checklist') return block;
    checklistIndex += 1;
    if (checklistIndex !== lineIndex) return block;
    return updater(block);
  });
  if (checklistIndex < lineIndex) {
    throw new Error('Checklist line not found');
  }
  return serializeNoteMarkdown(next);
}

export function getChecklistBlock(body: string, lineIndex: number): NoteChecklistBlock {
  const blocks = parseNoteMarkdown(body).filter((block): block is NoteChecklistBlock => block.type === 'checklist');
  const block = blocks[lineIndex];
  if (!block) throw new Error('Checklist line not found');
  return block;
}
