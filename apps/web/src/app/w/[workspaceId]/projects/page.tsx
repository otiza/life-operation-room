'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProject, listProjects } from '../../../../features/projects/projects-api';
import { countsByProject } from '../../../../features/tasks/tasks-api';
import { listInstalledApps } from '../../../../features/apps/apps-api';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
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
    queryKey: ['task-counts', workspaceId],
    queryFn: () => countsByProject(workspaceId),
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
      <PageContainer>
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
            <p className="text-sm text-zinc-600">Projects is not installed in this workspace.</p>
            <Link
              href={`/w/${workspaceId}/apps`}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white sm:w-auto"
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
  const counts = countsQuery.data?.counts ?? {};

  return (
    <PageContainer>
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
                className="min-h-24 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400 sm:text-sm"
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
        <p className="text-sm text-zinc-500">Loading projects…</p>
      ) : projectsQuery.isError ? (
        <p className="text-sm text-red-600">
          {projectsQuery.error instanceof ApiError
            ? projectsQuery.error.message
            : 'Failed to load projects'}
        </p>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-base font-semibold text-zinc-900">No projects yet</p>
            <p className="mx-auto max-w-md text-sm text-zinc-500">
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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Active</h2>
            {activeProjects.length === 0 ? (
              <p className="text-sm text-zinc-500">No active projects.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeProjects.map((project) => {
                  const taskCount = counts[project.id] ?? 0;
                  return (
                    <div
                      key={project.id}
                      className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <Link
                        href={`/w/${workspaceId}/projects/${project.id}`}
                        className="min-w-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-base font-semibold text-zinc-900">
                            {project.name}
                          </h3>
                          <Badge className="shrink-0 border-transparent bg-emerald-50 text-emerald-800">
                            {project.status}
                          </Badge>
                        </div>
                        {project.description ? (
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
                            {project.description}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-zinc-400">No description</p>
                        )}
                      </Link>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Badge className="border-transparent bg-zinc-100 text-zinc-700">
                          {taskCount} task{taskCount === 1 ? '' : 's'}
                        </Badge>
                        {tasksInstalled ? (
                          <Link
                            href={`/w/${workspaceId}/tasks?projectId=${project.id}`}
                            className="inline-flex h-9 items-center rounded-md px-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                          >
                            Open tasks
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          {archivedProjects.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Archived
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {archivedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/w/${workspaceId}/projects/${project.id}`}
                    className="block min-w-0 rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-base font-medium text-zinc-700">
                        {project.name}
                      </h3>
                      <Badge className="shrink-0">{project.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {counts[project.id] ?? 0} task{(counts[project.id] ?? 0) === 1 ? '' : 's'}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
