'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { NotesWorkspace } from '../../../../features/notes/notes-workspace';
import { PageContainer } from '../../../../components/layout/page-container';
import { Skeleton, SkeletonText } from '../../../../components/ui/skeleton';

export default function NotesPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <div className="space-y-3" aria-busy="true" aria-label="Loading note">
            <Skeleton className="h-8 w-40" />
            <SkeletonText lines={4} />
          </div>
        </PageContainer>
      }
    >
      <NotesPageContent />
    </Suspense>
  );
}

function NotesPageContent() {
  const params = useParams<{ workspaceId: string }>();
  return <NotesWorkspace workspaceId={params.workspaceId} />;
}
