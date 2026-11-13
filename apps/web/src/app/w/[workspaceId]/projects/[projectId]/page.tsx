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
import { Menu } from '../../../../../components/ui/menu';
import { Skeleton, SkeletonText } from '../../../../../components/ui/skeleton';
import { PageContainer, PageHeader } from '../../../../../components/layout/page-container';
import { ApiError } from '../../../../../lib/api';

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <div className="space-y-3" aria-busy="true" aria-label="Loading project">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-56" />
            <SkeletonText lines={2} />
          </div>
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
      <PageContainer>
        <div className="space-y-3" aria-busy="true" aria-label="Loading project">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-56" />
          <SkeletonText lines={2} />
        </div>
      </PageContainer>
    );
  }

  if (projectQuery.isError || !projectQuery.data?.project) {
    return (
      <PageContainer>
        <PageHeader
          title="Project"
          description="Not found"
          breadcrumb={[
            { label: 'Projects', href: `/w/${workspaceId}/projects` },
            { label: 'Not found' },
          ]}
        />
        <p className="text-sm text-destructive">
          {projectQuery.error instanceof ApiError ? projectQuery.error.message : 'Project not found'}
        </p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <nav aria-label="Breadcrumb" className="mb-2">
                <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <li>
                    <Link
                      href={`/w/${workspaceId}/projects`}
                      className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Projects
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="text-border">
                      /
                    </span>
                    <span className="text-foreground" aria-current="page">
                      {displayName}
                    </span>
                  </li>
                </ol>
              </nav>
              <input
                className="w-full bg-transparent text-page-title text-foreground outline-none"
                value={displayName}
                aria-label="Project name"
                onChange={(event) => setName(event.target.value)}
                onBlur={() => {
                  const next = displayName.trim();
                  if (!next || next === project.name) {
                    setName(null);
                    return;
                  }
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
            <Menu
              aria-label="Project actions"
              align="end"
              triggerClassName="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              trigger={<MoreHorizontal className="h-4 w-4" />}
              items={[
                {
                  id: 'archive',
                  label: project.status === 'archived' ? 'Restore' : 'Archive',
                  onSelect: () =>
                    saveMutation.mutate({
                      status: project.status === 'archived' ? 'active' : 'archived',
                    }),
                },
                {
                  id: 'delete',
                  label: 'Delete',
                  destructive: true,
                  onSelect: () => setConfirmDelete(true),
                },
              ]}
            />
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
