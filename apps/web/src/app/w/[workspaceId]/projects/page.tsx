'use client';

import { FormEvent, useState } from 'react';
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
import { Input } from '../../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
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

  if (installedQuery.isLoading) {
    return (
      <PageContainer size="full">
        <PageHeader title="Projects" description="Loading…" />
      </PageContainer>
    );
  }

  if (!installed) {
    return (
      <PageContainer size="md">
        <PageHeader title="Projects" description="Organize work into projects." />
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

  return (
    <PageContainer size="full">
      <PageHeader
        title="Projects"
        description="Hubs for work. Tasks attach here; other apps can link later."
        actions={
          <Button className="h-11 w-full sm:w-auto" onClick={() => setShowCreate((value) => !value)}>
            {showCreate ? 'Cancel' : 'New project'}
          </Button>
        }
      />
      {showCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>Create project</CardTitle>
            <CardDescription>Give it a clear name. Description is optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreate}>
              <Input
                className="h-11"
                placeholder="Project name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
                placeholder="Description (optional)"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button className="h-11 w-full sm:w-auto" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {projectsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projectsQuery.isError ? (
        <p className="text-sm text-red-600">
          {projectsQuery.error instanceof ApiError
            ? projectsQuery.error.message
            : 'Failed to load projects'}
        </p>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-base font-semibold text-foreground">No projects yet</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Create a project to group tasks. Installing Projects also seeds an Inbox.
            </p>
            <Button className="h-11" onClick={() => setShowCreate(true)}>
              Create your first project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active</h2>
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
