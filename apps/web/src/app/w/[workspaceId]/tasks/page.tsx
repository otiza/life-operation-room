'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { TasksWorkspace } from '../../../../features/tasks/tasks-workspace';
import { PageContainer, PageHeader } from '../../../../components/layout/page-container';

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <PageContainer size="full">
          <PageHeader title="Tasks" description="Loading…" />
        </PageContainer>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const params = useParams<{ workspaceId: string }>();
  return <TasksWorkspace workspaceId={params.workspaceId} />;
}
