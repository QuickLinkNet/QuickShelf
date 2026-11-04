import type { ReactNode } from 'react';

type Props = { icon: ReactNode; title: string; text?: string; action?: ReactNode };

export default function EmptyState({ icon, title, text, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</div>
      <h3 className="h-sec">{title}</h3>
      {text && <p className="muted max-w-sm">{text}</p>}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
