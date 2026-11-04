import type { ReactNode } from 'react';

type Props = { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string };

/** Standard page head: optional eyebrow, big title, subtitle and an actions slot. */
export default function PageHeader({ title, subtitle, actions, eyebrow }: Props) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 animate-rise">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>}
        <h1 className="h-page">{title}</h1>
        {subtitle && <p className="muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
