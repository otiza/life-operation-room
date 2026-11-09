'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteProject,
  getProject,
  updateProject,
} from '../../../../../features/projects/projects-api';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Badge } from '../../../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { PageContainer, PageHeader } from '../../../../../components/layout/page-container';
import { ApiError } from '../../../../../lib/api';

export default function ProjectDetailPage() {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  const { workspaceId, projectId } = params;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ['project', workspaceId, projectId],
    queryFn: () => getProject(workspaceId, projectId),
  });

  useEffect(() => {
    const project = projectQuery.data?.project;
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? '');
  }, [projectQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProject(workspaceId, projectId, {
        name: name.trim(),
        description: description.trim() || null,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['project', workspaceId, projectId] });
      await queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not save project');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (status: 'active' | 'archived') =>
      updateProject(workspaceId, projectId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', workspaceId, projectId] });
      await queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
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

  function onSave(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate();
  }

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
        <p className="text-sm text-red-600">
          {projectQuery.error instanceof ApiError
            ? projectQuery.error.message
            : 'Project not found'}
        </p>
        <Link href={`/w/${workspaceId}/projects`} className="text-sm text-zinc-700 underline">
          Back to projects
        </Link>
      </PageContainer>
    );
  }

  const project = projectQuery.data.project;

  return (
    <PageContainer size="md">
      <PageHeader
        title={project.name}
        description="Edit project details or jump to its tasks."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href={`/w/${workspaceId}/tasks?projectId=${project.id}`}
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
            >
              View tasks
            </Link>
            <Button
              variant="outline"
              className="h-11"
              onClick={() =>
                archiveMutation.mutate(project.status === 'archived' ? 'active' : 'archived')
              }
              disabled={archiveMutation.isPending}
            >
              {project.status === 'archived' ? 'Restore' : 'Archive'}
            </Button>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Details</CardTitle>
            <Badge>{project.status}</Badge>
          </div>
          <CardDescription>Changes save to this workspace only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSave}>
            <Input
              className="h-11"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <textarea
              className="min-h-28 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 sm:text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button className="h-11 w-full sm:w-auto" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11 w-full sm:w-auto"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      'Delete this project? This is only allowed when it has zero tasks. Archive it instead if work still exists.',
                    )
                  ) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Link href={`/w/${workspaceId}/projects`} className="text-sm text-zinc-600 underline">
        Back to projects
      </Link>
    </PageContainer>
  );
}
