'use client';

import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ManualView } from '../../../../../features/manual/manual-view';
import { getManualChapter } from '../../../../../features/manual/manual';

export default function ManualChapterPage() {
  const params = useParams<{ slug: string }>();
  if (!getManualChapter(params.slug)) notFound();
  return <ManualView slug={params.slug} />;
}
