'use client';

import { useParams } from 'next/navigation';
import { ReviewWorkspace } from '../../../../features/review/review-workspace';

export default function ReviewPage() {
  const params = useParams<{ workspaceId: string }>();
  return <ReviewWorkspace workspaceId={params.workspaceId} />;
}
