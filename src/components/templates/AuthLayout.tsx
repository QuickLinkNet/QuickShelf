import type { ReactNode } from 'react';

/** Centered card for login and the first-run wizard (outside the app shell, so no router needed). */
export default function AuthLayout({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-sm'}`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="mb-4 h-14 w-14 rounded-2xl shadow-md" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>}
        </div>
        <div className="card card-pad">{children}</div>
      </div>
    </main>
  );
}
