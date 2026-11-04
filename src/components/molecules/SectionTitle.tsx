import type { ReactNode } from 'react';

type Props = { title: string; hint?: string; action?: ReactNode };

export default function SectionTitle({ title, hint, action }: Props) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="h-sec">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
