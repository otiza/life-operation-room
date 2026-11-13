'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getChecklistBlock, parseNoteMarkdown, serializeNoteMarkdown } from '@life-room/shared';
import { listInstalledApps } from '../apps/apps-api';
import { viewerTimeZone } from '../calendar/calendar-api';
import { PageContainer, PageHeader } from '../../components/layout/page-container';
import { Button } from '../../components/ui/button';
import { Skeleton, SkeletonText } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';
import { ApiError } from '../../lib/api';
import { NoteEditor } from './note-editor';
import { getTodayNote, promoteChecklistLine, updateNoteBody } from './notes-api';

export function NotesWorkspace({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const timeZone = viewerTimeZone();
  const [draft, setDraft] = useState<{ noteId: string; body: string } | null>(null);
  const [focusedChecklistIndex, setFocusedChecklistIndex] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appsQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });
  const tasksInstalled = useMemo(
    () => (appsQuery.data?.apps ?? []).some((app) => app.appKey === 'tasks'),
    [appsQuery.data?.apps],
  );

  const noteQuery = useQuery({
    queryKey: ['notes', workspaceId, 'today', timeZone],
    queryFn: () => getTodayNote(workspaceId, timeZone),
  });

  const note = noteQuery.data?.note;
  const body = note && draft?.noteId === note.id ? draft.body : (note?.body ?? '');

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: (input: { noteId: string; body: string }) =>
      updateNoteBody(workspaceId, input.noteId, { body: input.body }),
    onSuccess: (result) => {
      setSaveError(null);
      queryClient.setQueryData(['notes', workspaceId, 'today', timeZone], result);
    },
    onError: (error) => {
      setSaveError(error instanceof ApiError ? error.message : 'Could not save note');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (input: { noteId: string; lineIndex: number; checked?: boolean }) =>
      promoteChecklistLine(workspaceId, input.noteId, {
        lineIndex: input.lineIndex,
        checked: input.checked,
      }),
    onSuccess: async (result) => {
      setDraft({ noteId: result.note.id, body: result.note.body });
      queryClient.setQueryData(['notes', workspaceId, 'today', timeZone], { note: result.note });
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      if (result.created) {
        toast({ title: 'Task created for today' });
      }
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : 'Could not turn the line into a task';
      toast({ title: message });
    },
  });

  function scheduleSave(nextBody: string, noteId: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveMutation.mutate({ noteId, body: nextBody });
    }, 450);
  }

  function onBodyChange(nextBody: string) {
    const noteId = note?.id;
    if (!noteId) return;
    setDraft({ noteId, body: nextBody });
    scheduleSave(nextBody, noteId);
  }

  function onToggleChecklist(checklistIndex: number, checked: boolean) {
    const noteId = note?.id;
    if (!noteId) return;
    let block: ReturnType<typeof getChecklistBlock>;
    try {
      block = getChecklistBlock(body, checklistIndex);
    } catch {
      return;
    }
    if (block.taskId || !tasksInstalled) {
      let index = -1;
      const nextBlocks = parseNoteMarkdown(body).map((item) => {
        if (item.type !== 'checklist') return item;
        index += 1;
        if (index !== checklistIndex) return item;
        return { ...item, checked };
      });
      onBodyChange(serializeNoteMarkdown(nextBlocks));
      return;
    }
    promoteMutation.mutate({ noteId, lineIndex: checklistIndex, checked });
  }

  function onAddCheckbox() {
    const checklistCount = parseNoteMarkdown(body).filter((block) => block.type === 'checklist').length;
    const separator = body.length ? '\n\n' : '';
    onBodyChange(`${body}${separator}- [ ] `);
    setFocusedChecklistIndex(checklistCount);
  }

  function onMakeTask() {
    const noteId = note?.id;
    if (noteId == null || focusedChecklistIndex == null) return;
    if (!tasksInstalled) {
      toast({
        title: 'Install Tasks to turn a checklist line into a task',
      });
      return;
    }
    let block: ReturnType<typeof getChecklistBlock>;
    try {
      block = getChecklistBlock(body, focusedChecklistIndex);
    } catch {
      return;
    }
    if (block.taskId) {
      toast({ title: 'This line is already a task' });
      return;
    }
    promoteMutation.mutate({
      noteId,
      lineIndex: focusedChecklistIndex,
      checked: true,
    });
  }

  const dayLabel = note
    ? new Date(`${note.day}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : 'Today';

  const canMakeTask = focusedChecklistIndex != null;
  const focusedLinked = useMemo(() => {
    if (focusedChecklistIndex == null) return false;
    try {
      return Boolean(getChecklistBlock(body, focusedChecklistIndex).taskId);
    } catch {
      return false;
    }
  }, [body, focusedChecklistIndex]);

  return (
    <PageContainer>
      <PageHeader
        title="Today's note"
        description={dayLabel}
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onAddCheckbox}
          >
            Add checkbox
          </Button>
          <Button
            type="button"
            disabled={!canMakeTask || promoteMutation.isPending || focusedLinked}
            onClick={onMakeTask}
            title={
              !tasksInstalled
                ? 'Install Tasks to turn a checklist line into a task'
                : focusedLinked
                  ? 'This line is already a task'
                  : canMakeTask
                    ? 'Make task'
                    : 'Focus an open checklist line'
            }
          >
            Make task
          </Button>
          </div>
        }
      />

      {noteQuery.isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading note">
          <Skeleton className="h-8 w-48" />
          <SkeletonText lines={6} />
        </div>
      ) : noteQuery.isError ? (
        <p className="text-sm text-destructive">Could not open today’s note.</p>
      ) : (
        <div className="min-h-[50vh] rounded-xl border border-border bg-card px-4 py-5 shadow-flat sm:px-6 sm:py-6">
          <NoteEditor
            value={body}
            onChange={onBodyChange}
            focusedChecklistIndex={focusedChecklistIndex}
            onFocusedChecklistIndexChange={setFocusedChecklistIndex}
            onToggleChecklist={onToggleChecklist}
          />
          <div className="mt-4 flex flex-col gap-1 text-meta text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span>Add a checkbox, write the line, then choose Make task.</span>
            <span>
              {saveMutation.isPending ? 'Saving…' : saveError ? saveError : 'Saved'}
            </span>
            {!tasksInstalled ? (
              <span>Checklist lines stay in the note until Tasks is installed.</span>
            ) : null}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
