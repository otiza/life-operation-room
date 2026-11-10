'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ManualIndexPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/w/${params.workspaceId}/docs/start`);
  }, [params.workspaceId, router]);

  return <p className="text-sm text-muted-foreground">Opening the manual…</p>;
}
