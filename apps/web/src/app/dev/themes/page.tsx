import { notFound } from 'next/navigation';
import { ThemeLab } from './theme-lab';

/* Development only: every primitive in every registered theme (THEMES-PLAN PR 3). */
export default function ThemeLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ThemeLab />;
}
