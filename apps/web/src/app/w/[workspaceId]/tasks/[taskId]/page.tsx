'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TaskDetailRedirectPage() {
  const params = useParams<{ workspaceId: string; taskId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/w/${params.workspaceId}/tasks?view=today&task=${params.taskId}`);
  }, [params.taskId, params.workspaceId, router]);

  return (
    <p className="text-sm text-muted-foreground">Opening task…</p>
  );
}
