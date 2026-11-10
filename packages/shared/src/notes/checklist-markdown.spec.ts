import { describe, expect, it } from 'vitest';
import {
  formatTaskMarker,
  getChecklistBlock,
  normalizeNoteMarkdown,
  parseNoteMarkdown,
  replaceChecklistLine,
  serializeNoteMarkdown,
  setChecklistTaskId,
} from './checklist-markdown.js';

describe('checklist-markdown', () => {
  it('parses paragraphs and checklist lines with optional task markers', () => {
    const taskId = '11111111-1111-4111-8111-111111111111';
    const body = `Morning thoughts.\n\n- [ ] Buy milk\n\n- [x] Ship it ${formatTaskMarker(taskId)}`;
    expect(parseNoteMarkdown(body)).toEqual([
      { type: 'paragraph', text: 'Morning thoughts.' },
      { type: 'checklist', checked: false, text: 'Buy milk', taskId: null },
      { type: 'checklist', checked: true, text: 'Ship it', taskId },
    ]);
  });

  it('keeps spaces while a line is being typed', () => {
    expect(serializeNoteMarkdown(parseNoteMarkdown('Pay the rent '))).toBe('Pay the rent ');
    expect(serializeNoteMarkdown(parseNoteMarkdown('- [ ] Buy milk '))).toBe('- [ ] Buy milk ');
  });

  it('round-trips through serialize', () => {
    const blocks = parseNoteMarkdown('Hello\n\n- [ ] One\n\n- [x] Two');
    expect(serializeNoteMarkdown(blocks)).toBe('Hello\n\n- [ ] One\n\n- [x] Two');
  });

  it('normalizes headings into plain paragraphs', () => {
    expect(normalizeNoteMarkdown('# Title\n\n- [ ] Item')).toBe('Title\n\n- [ ] Item');
  });

  it('attaches a task id to a checklist line', () => {
    const taskId = '22222222-2222-4222-8222-222222222222';
    const next = replaceChecklistLine('- [ ] Buy milk', 0, (block) =>
      setChecklistTaskId(block, taskId, true),
    );
    expect(next).toBe(`- [x] Buy milk ${formatTaskMarker(taskId)}`);
    expect(getChecklistBlock(next, 0).taskId).toBe(taskId);
  });
});
