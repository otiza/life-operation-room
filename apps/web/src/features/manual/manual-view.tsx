'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer } from '../../components/layout/page-container';
import { cn } from '../../lib/utils';
import {
  MANUAL_CHAPTERS,
  getManualChapter,
  manualHeadingId,
  type ManualBlock,
  type ManualChapter,
} from './manual';

const GROUPS = ['Guide', 'Reference'] as const;

export function ManualView({ slug }: { slug: string }) {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const chapter = getManualChapter(slug) ?? MANUAL_CHAPTERS[0]!;
  const base = `/w/${workspaceId}/docs`;
  const index = MANUAL_CHAPTERS.findIndex((item) => item.slug === chapter.slug);
  const previous = index > 0 ? MANUAL_CHAPTERS[index - 1] : null;
  const next = index < MANUAL_CHAPTERS.length - 1 ? MANUAL_CHAPTERS[index + 1] : null;
  const headings = chapter.blocks.filter((block) => block.type === 'h2');

  return (
    <PageContainer size="lg" className="space-y-8">
      <div className="lg:hidden">
        <p className="text-meta text-muted-foreground">Manual</p>
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {MANUAL_CHAPTERS.map((item) => (
            <ChapterLink key={item.slug} href={`${base}/${item.slug}`} active={item.slug === chapter.slug} compact>
              {item.title}
            </ChapterLink>
          ))}
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:items-start lg:gap-14">
        <nav aria-label="Manual" className="sticky top-0 hidden lg:block">
          {GROUPS.map((group) => (
            <div key={group} className="mb-6">
              <p className="px-3 text-meta text-muted-foreground">{group}</p>
              <ul className="mt-1.5 space-y-0.5 border-l border-border">
                {MANUAL_CHAPTERS.filter((item) => item.group === group).map((item) => (
                  <li key={item.slug}>
                    <ChapterLink href={`${base}/${item.slug}`} active={item.slug === chapter.slug}>
                      {item.title}
                    </ChapterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="xl:grid xl:grid-cols-[minmax(0,40rem)_11rem] xl:items-start xl:gap-10">
        <article className="min-w-0">
          <header className="border-b border-border pb-6">
            <p className="text-meta text-muted-foreground">
              {chapter.group}
              <span aria-hidden="true"> · </span>
              {String(index + 1).padStart(2, '0')}
            </p>
            <h1 className="mt-2 text-page-title text-foreground">{chapter.title}</h1>
            <p className="mt-3 max-w-[62ch] text-base leading-7 text-muted-foreground">{chapter.summary}</p>
          </header>
          <div className="mt-8 space-y-6">
            {chapter.blocks.map((block, blockIndex) => (
              <ManualBlockView key={`${chapter.slug}-${blockIndex}`} block={block} />
            ))}
          </div>
          <nav aria-label="Chapters" className="mt-12 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
            {previous ? <ChapterPager href={`${base}/${previous.slug}`} direction="Previous" chapter={previous} /> : <span />}
            {next ? <ChapterPager href={`${base}/${next.slug}`} direction="Next" chapter={next} align="end" /> : null}
          </nav>
        </article>
        <aside className="sticky top-0 hidden xl:block">
          {headings.length > 0 ? (
            <div>
              <p className="text-meta text-muted-foreground">On this page</p>
              <ul className="mt-2 space-y-1">
                {headings.map((heading) =>
                  heading.type === 'h2' ? (
                    <li key={heading.text}>
                      <a
                        href={`#${manualHeadingId(heading.text)}`}
                        className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {heading.text}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ) : null}
        </aside>
        </div>
      </div>
    </PageContainer>
  );
}

function ChapterLink({
  href,
  active,
  compact,
  children,
}: {
  href: string;
  active: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'block text-sm text-muted-foreground hover:text-foreground',
        compact
          ? 'shrink-0 rounded-full border border-border px-3 py-2'
          : '-ml-px border-l-2 border-transparent px-3 py-1.5',
        active && compact && 'border-foreground bg-card text-foreground',
        active && !compact && 'border-primary font-medium text-foreground',
      )}
    >
      {children}
    </Link>
  );
}

function ChapterPager({
  href,
  direction,
  chapter,
  align,
}: {
  href: string;
  direction: string;
  chapter: ManualChapter;
  align?: 'end';
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent',
        align === 'end' && 'sm:text-right',
      )}
    >
      <span className="text-meta text-muted-foreground">{direction}</span>
      <span className="mt-1 block text-sm font-medium text-foreground">{chapter.title}</span>
    </Link>
  );
}

function ManualBlockView({ block }: { block: ManualBlock }) {
  if (block.type === 'p') {
    return <p className="max-w-[68ch] text-body leading-7 text-foreground">{block.text}</p>;
  }
  if (block.type === 'h2') {
    const id = manualHeadingId(block.text);
    return (
      <h2 id={id} className="scroll-mt-6 pt-4 text-section-title text-foreground">
        <a href={`#${id}`} className="hover:underline decoration-border underline-offset-4">
          {block.text}
        </a>
      </h2>
    );
  }
  if (block.type === 'callout') {
    return (
      <aside className="max-w-[68ch] rounded-xl border border-border border-l-2 border-l-primary bg-card px-4 py-3">
        <p className="text-sm font-medium text-foreground">{block.title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{block.text}</p>
      </aside>
    );
  }
  if (block.type === 'steps') {
    return (
      <ol className="max-w-[68ch] space-y-0">
        {block.items.map((step, stepIndex) => (
          <li key={step.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-meta text-foreground">
                {stepIndex + 1}
              </span>
              {stepIndex < block.items.length - 1 ? <span className="my-1 w-px flex-1 bg-border" /> : null}
            </div>
            <div className={stepIndex < block.items.length - 1 ? 'pb-5' : undefined}>
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-[38%] px-4 py-2.5 text-meta font-medium text-muted-foreground">{block.columns[0]}</th>
            <th className="px-4 py-2.5 text-meta font-medium text-muted-foreground">{block.columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row[0]} className="border-b border-border last:border-0">
              <td className="px-4 py-3 align-top">
                {block.variant === 'keys' ? <Keycaps value={row[0]} /> : <Example value={row[0]} />}
              </td>
              <td className="px-4 py-3 align-top leading-6 text-foreground">{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Example({ value }: { value: string }) {
  return <code className="font-mono text-[13px] leading-5 text-foreground">{value}</code>;
}

function Keycaps({ value }: { value: string }) {
  const parts = value.split(/\s+\/\s+/);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {parts.map((part, partIndex) => (
        <span key={part} className="inline-flex items-center gap-1.5">
          {partIndex > 0 ? <span className="text-meta text-muted-foreground">/</span> : null}
          <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[12px] text-foreground">
            {part}
          </kbd>
        </span>
      ))}
    </span>
  );
}
