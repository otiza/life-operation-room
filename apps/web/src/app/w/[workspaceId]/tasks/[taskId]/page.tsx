'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TaskDetailRedirectPage() {
  const params = useParams<{ workspaceId: string; taskId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/w/${params.workspaceId}/tasks?taskId=${params.taskId}`);
  }, [params.taskId, params.workspaceId, router]);

  return (
    <p className="text-sm text-zinc-500">Opening task…</p>
  );
}
