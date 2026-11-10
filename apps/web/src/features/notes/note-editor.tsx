'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import {
  parseNoteMarkdown,
  serializeNoteMarkdown,
  type NoteBlock,
  type NoteChecklistBlock,
} from '@erp-tiza/shared';
import { cn } from '../../lib/utils';

type NoteEditorProps = {
  value: string;
  onChange: (next: string) => void;
  focusedChecklistIndex: number | null;
  onFocusedChecklistIndexChange: (index: number | null) => void;
  onToggleChecklist: (checklistIndex: number, checked: boolean) => void;
  className?: string;
};

function checklistOrdinal(blocks: NoteBlock[], blockIndex: number): number {
  let index = -1;
  for (let i = 0; i <= blockIndex; i += 1) {
    if (blocks[i]?.type === 'checklist') index += 1;
  }
  return index;
}

export function NoteEditor({
  value,
  onChange,
  focusedChecklistIndex,
  onFocusedChecklistIndexChange,
  onToggleChecklist,
  className,
}: NoteEditorProps) {
  const blocks = parseNoteMarkdown(value);
  const displayBlocks: NoteBlock[] = blocks.length
    ? blocks
    : [{ type: 'paragraph', text: '' }];
  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  useEffect(() => {
    textareaRefs.current = textareaRefs.current.slice(0, displayBlocks.length);
  }, [displayBlocks.length]);

  useEffect(() => {
    if (focusedChecklistIndex == null) return;
    const blockIndex = displayBlocks.findIndex(
      (block, index) =>
        block.type === 'checklist' && checklistOrdinal(displayBlocks, index) === focusedChecklistIndex,
    );
    if (blockIndex >= 0) textareaRefs.current[blockIndex]?.focus();
  }, [focusedChecklistIndex, displayBlocks.length]);

  function commit(nextBlocks: NoteBlock[]) {
    onChange(serializeNoteMarkdown(nextBlocks));
  }

  function updateBlock(blockIndex: number, next: NoteBlock) {
    const nextBlocks = displayBlocks.map((block, index) => (index === blockIndex ? next : block));
    commit(nextBlocks);
  }

  function insertAfter(blockIndex: number, block: NoteBlock) {
    const nextBlocks = [
      ...displayBlocks.slice(0, blockIndex + 1),
      block,
      ...displayBlocks.slice(blockIndex + 1),
    ];
    commit(nextBlocks);
    requestAnimationFrame(() => {
      textareaRefs.current[blockIndex + 1]?.focus();
    });
  }

  function removeBlock(blockIndex: number) {
    if (displayBlocks.length <= 1) {
      commit([{ type: 'paragraph', text: '' }]);
      return;
    }
    const nextBlocks = displayBlocks.filter((_, index) => index !== blockIndex);
    commit(nextBlocks.length ? nextBlocks : [{ type: 'paragraph', text: '' }]);
    requestAnimationFrame(() => {
      textareaRefs.current[Math.max(0, blockIndex - 1)]?.focus();
    });
  }

  function onParagraphKeyDown(blockIndex: number, event: KeyboardEvent<HTMLTextAreaElement>) {
    const block = displayBlocks[blockIndex];
    if (!block || block.type !== 'paragraph') return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const trimmed = block.text.trim();
      if (trimmed === '- [ ]' || trimmed === '- []' || trimmed.startsWith('- [ ] ')) {
        const text = trimmed.replace(/^-\s*\[[ ]?\]\s*/, '');
        updateBlock(blockIndex, { type: 'checklist', checked: false, text, taskId: null });
        onFocusedChecklistIndexChange(checklistOrdinal(
          displayBlocks.map((item, index) =>
            index === blockIndex
              ? { type: 'checklist', checked: false, text, taskId: null }
              : item,
          ),
          blockIndex,
        ));
        return;
      }
      insertAfter(blockIndex, { type: 'paragraph', text: '' });
      return;
    }
    if (event.key === 'Backspace' && block.text === '' && displayBlocks.length > 1) {
      event.preventDefault();
      removeBlock(blockIndex);
    }
  }

  function onChecklistKeyDown(
    blockIndex: number,
    checklistIndex: number,
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    const block = displayBlocks[blockIndex] as NoteChecklistBlock;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      insertAfter(blockIndex, { type: 'checklist', checked: false, text: '', taskId: null });
      onFocusedChecklistIndexChange(checklistIndex + 1);
      return;
    }
    if (event.key === 'Backspace' && block.text === '') {
      event.preventDefault();
      updateBlock(blockIndex, { type: 'paragraph', text: '' });
      onFocusedChecklistIndexChange(null);
    }
  }

  function autoSize(element: HTMLTextAreaElement | null) {
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.max(element.scrollHeight, 28)}px`;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {displayBlocks.map((block, blockIndex) => {
        if (block.type === 'paragraph') {
          return (
            <textarea
              key={`p-${blockIndex}`}
              ref={(node) => {
                textareaRefs.current[blockIndex] = node;
                autoSize(node);
              }}
              value={block.text}
              rows={1}
              placeholder={blockIndex === 0 ? "Write today's note…" : undefined}
              aria-label="Note paragraph"
              className="block w-full resize-none border-0 bg-transparent text-body leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => {
                updateBlock(blockIndex, { type: 'paragraph', text: event.target.value });
                autoSize(event.currentTarget);
              }}
              onFocus={() => onFocusedChecklistIndexChange(null)}
              onKeyDown={(event) => onParagraphKeyDown(blockIndex, event)}
            />
          );
        }

        const checklistIndex = checklistOrdinal(displayBlocks, blockIndex);
        const focused = focusedChecklistIndex === checklistIndex;
        return (
          <div
            key={`c-${blockIndex}-${block.taskId ?? 'open'}`}
            className={cn(
              'flex items-start gap-3 rounded-lg px-1 py-0.5',
              focused ? 'bg-accent/40' : null,
            )}
          >
            <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center sm:h-9 sm:w-9">
              <input
                type="checkbox"
                checked={block.checked}
                aria-label={block.checked ? 'Mark checklist line open' : 'Check checklist line'}
                className="size-5 accent-primary"
                onChange={(event) => onToggleChecklist(checklistIndex, event.target.checked)}
              />
            </label>
            <textarea
              ref={(node) => {
                textareaRefs.current[blockIndex] = node;
                autoSize(node);
              }}
              value={block.text}
              rows={1}
              aria-label="Checklist line"
              className={cn(
                'mt-2 block min-w-0 flex-1 resize-none border-0 bg-transparent text-body leading-relaxed outline-none sm:mt-1.5',
                block.checked ? 'text-muted-foreground line-through' : 'text-foreground',
              )}
              onChange={(event) => {
                updateBlock(blockIndex, { ...block, text: event.target.value });
                autoSize(event.currentTarget);
              }}
              onFocus={() => onFocusedChecklistIndexChange(checklistIndex)}
              onKeyDown={(event) => onChecklistKeyDown(blockIndex, checklistIndex, event)}
            />
            {block.taskId ? (
              <span className="mt-2 shrink-0 text-meta text-muted-foreground sm:mt-1.5">Task</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
