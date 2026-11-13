'use client';

import { FormEvent, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProject, listProjects } from '../../../../features/projects/projects-api';
import { taskCounts } from '../../../../features/tasks/tasks-api';
import {
  projectStatsFromUnifiedCounts,
  taskCountsQueryKey,
} from '../../../../features/tasks/task-counts';
import { listInstalledApps } from '../../../../features/apps/apps-api';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { EmptyState } from '../../../../components/ui/empty-state';
import { Input } from '../../../../components/ui/input';
import { Skeleton, SkeletonCard } from '../../../../components/ui/skeleton';
import { Card, CardContent } from '../../../../components/ui/card';
import { PageContainer, PageHeader } from '../../../../components/layout/page-container';
import { ApiError } from '../../../../lib/api';

export default function ProjectsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const createTitleId = useId();

  const installedQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });
  const installed = installedQuery.data?.apps.some((app) => app.appKey === 'projects');
  const tasksInstalled = installedQuery.data?.apps.some((app) => app.appKey === 'tasks');

  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => listProjects(workspaceId),
    enabled: Boolean(installed),
  });
  const countsQuery = useQuery({
    queryKey: taskCountsQueryKey(workspaceId),
    queryFn: () => taskCounts(workspaceId),
    enabled: Boolean(tasksInstalled),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProject(workspaceId, {
        name: name.trim(),
        description: description.trim() || null,
      }),
    onSuccess: async () => {
      setName('');
      setDescription('');
      setShowCreate(false);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not create project');
    },
  });

  function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  function openCreate() {
    setError(null);
    setShowCreate(true);
  }

  if (installedQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-3" aria-busy="true" aria-label="Loading projects">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!installed) {
    return (
      <PageContainer>
        <PageHeader title="Projects" description="Group related tasks into projects." />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground">Projects is not installed in this workspace.</p>
            <Link
              href={`/w/${workspaceId}/apps`}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground sm:w-auto"
            >
              Open marketplace
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const projects = projectsQuery.data?.projects ?? [];
  const activeProjects = projects.filter((project) => project.status === 'active');
  const archivedProjects = projects.filter((project) => project.status === 'archived');
  const counts = countsQuery.data?.counts;
  const showEmpty = !projectsQuery.isLoading && !projectsQuery.isError && projects.length === 0 && !showCreate;

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Group related tasks into projects."
        actions={
          <Button className="h-11 w-full sm:w-auto" onClick={openCreate}>
            New project
          </Button>
        }
      />
      <Dialog
        open={showCreate}
        onClose={() => {
          if (createMutation.isPending) return;
          setShowCreate(false);
        }}
        className="sm:max-w-lg"
        aria-labelledby={createTitleId}
      >
        <form className="flex flex-col gap-4 p-5" onSubmit={onCreate}>
          <div className="space-y-1">
            <h2 id={createTitleId} className="text-base font-semibold text-foreground">
              Create project
            </h2>
            <p className="text-sm text-muted-foreground">Give it a clear name. Description is optional.</p>
          </div>
          <Input
            data-autofocus
            className="h-11"
            placeholder="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <textarea
            className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            placeholder="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={createMutation.isPending}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </Dialog>
      {projectsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading projects">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : projectsQuery.isError ? (
        <p className="text-sm text-destructive">
          {projectsQuery.error instanceof ApiError
            ? projectsQuery.error.message
            : 'Failed to load projects'}
        </p>
      ) : showEmpty ? (
        <EmptyState
          title="No projects yet"
          description="Create a project to group related tasks."
          primaryAction={{ label: 'Create project', onClick: openCreate }}
        />
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-section-title text-foreground">Active</h2>
            {activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active projects.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {activeProjects.map((project) => {
                  const stats = projectStatsFromUnifiedCounts(counts, project.id);
                  const done = Math.max(stats.total - stats.open, 0);
                  const progress = stats.total ? Math.round((done / stats.total) * 100) : 0;
                  return (
                    <Link
                      key={project.id}
                      href={`/w/${workspaceId}/projects/${project.id}`}
                      className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 shadow-sm hover:border-border"
                    >
                      <h3 className="truncate text-base font-semibold text-foreground">{project.name}</h3>
                      {project.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                      ) : null}
                      <div className="mt-4">
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {tasksInstalled ? `${stats.open} open · ${stats.total} tasks` : 'Tasks not installed'}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
          {archivedProjects.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-section-title text-foreground">
                Archived
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {archivedProjects.map((project) => {
                  const stats = projectStatsFromUnifiedCounts(counts, project.id);
                  return (
                    <Link
                      key={project.id}
                      href={`/w/${workspaceId}/projects/${project.id}`}
                      className="block min-w-0 rounded-xl border border-border bg-muted/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-base font-medium text-foreground">{project.name}</h3>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {tasksInstalled ? `${stats.open} open · ${stats.total} tasks` : project.status}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
