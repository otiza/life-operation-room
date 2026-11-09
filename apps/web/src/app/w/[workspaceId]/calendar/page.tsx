'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { CalendarWorkspace } from '../../../../features/calendar/calendar-workspace';
import { PageContainer, PageHeader } from '../../../../components/layout/page-container';

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <PageContainer size="full">
          <PageHeader title="Calendar" description="Loading…" />
        </PageContainer>
      }
    >
      <CalendarPageContent />
    </Suspense>
  );
}

function CalendarPageContent() {
  const params = useParams<{ workspaceId: string }>();
  return <CalendarWorkspace workspaceId={params.workspaceId} />;
}
