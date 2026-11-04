import type { ReactNode } from 'react';

type Props = { title: string; description?: string; children: ReactNode };

/** Label + help text on the left, control on the right (stacks on phones). */
export default function SettingRow({ title, description, children }: Props) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-ink-3">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
