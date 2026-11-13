'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { TasksWorkspace } from '../../../../features/tasks/tasks-workspace';
import { PageContainer } from '../../../../components/layout/page-container';
import { Skeleton, SkeletonText } from '../../../../components/ui/skeleton';

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
            <Skeleton className="h-8 w-40" />
            <SkeletonText lines={2} />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
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
