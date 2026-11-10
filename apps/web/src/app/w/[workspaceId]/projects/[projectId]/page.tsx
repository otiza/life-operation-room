'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { deleteProject, getProject, updateProject } from '../../../../../features/projects/projects-api';
import { TasksWorkspace } from '../../../../../features/tasks/tasks-workspace';
import { Button } from '../../../../../components/ui/button';
import { Dialog } from '../../../../../components/ui/dialog';
import { PageContainer, PageHeader } from '../../../../../components/layout/page-container';
import { ApiError } from '../../../../../lib/api';

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <PageContainer size="md">
          <PageHeader title="Project" description="Loading…" />
        </PageContainer>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}

function ProjectDetailContent() {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  const { workspaceId, projectId } = params;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ['project', workspaceId, projectId],
    queryFn: () => getProject(workspaceId, projectId),
  });

  const saveMutation = useMutation({
    mutationFn: (input: { name?: string; description?: string | null; status?: 'active' | 'archived' }) =>
      updateProject(workspaceId, projectId, input),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['project', workspaceId, projectId] });
      await queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not save project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(workspaceId, projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      router.push(`/w/${workspaceId}/projects`);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not delete project');
    },
  });

  if (projectQuery.isLoading) {
    return (
      <PageContainer size="md">
        <PageHeader title="Project" description="Loading…" />
      </PageContainer>
    );
  }

  if (projectQuery.isError || !projectQuery.data?.project) {
    return (
      <PageContainer size="md">
        <PageHeader title="Project" description="Not found" />
        <p className="text-sm text-destructive">
          {projectQuery.error instanceof ApiError ? projectQuery.error.message : 'Project not found'}
        </p>
        <Link href={`/w/${workspaceId}/projects`} className="text-sm text-foreground underline">
          Back to projects
        </Link>
      </PageContainer>
    );
  }

  const project = projectQuery.data.project;
  const displayName = name ?? project.name;
  const displayDescription = description ?? project.description ?? '';

  return (
    <>
      <TasksWorkspace
        workspaceId={workspaceId}
        lockedProjectId={projectId}
        header={
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <input
                className="w-full bg-transparent text-xl font-semibold tracking-tight text-foreground outline-none sm:text-2xl"
                value={displayName}
                aria-label="Project name"
                onChange={(event) => setName(event.target.value)}
                onBlur={() => {
                  const next = displayName.trim();
                  if (!next || next === project.name) return;
                  saveMutation.mutate({ name: next });
                }}
              />
              <textarea
                className="mt-1 w-full resize-none bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground"
                rows={displayDescription ? 2 : 1}
                placeholder="Add a description"
                value={displayDescription}
                aria-label="Project description"
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() => {
                  const next = displayDescription.trim();
                  if (next === (project.description ?? '')) return;
                  saveMutation.mutate({ description: next || null });
                }}
              />
              {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Project actions"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-border bg-popover py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setMenuOpen(false);
                      saveMutation.mutate({ status: project.status === 'archived' ? 'active' : 'archived' });
                    }}
                  >
                    {project.status === 'archived' ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-destructive hover:bg-danger-soft"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        }
      />
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <div className="space-y-4 p-5">
          <h2 className="text-base font-semibold text-foreground">Delete {project.name}?</h2>
          <p className="text-sm text-muted-foreground">
            This is only allowed when the project has zero tasks. Archive it if work still exists.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="h-11" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
