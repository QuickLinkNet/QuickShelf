import { t } from '../../i18n';
type Props = { score: number; size?: number; label?: string };

const tone = (s: number) => (s >= 80 ? 'rgb(var(--ok))' : s >= 55 ? 'rgb(var(--warn))' : 'rgb(var(--bad))');

/** Circular score (0–100) used for the archive health. */
export default function ScoreRing({ score, size = 120, label = t('Ordnung') }: Props) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={t('{label}: {score} von 100', { label, score })}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={tone(score)} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`} className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none tabular-nums">{score}</span>
        <span className="mt-1 text-[11px] text-ink-3">{label}</span>
      </div>
    </div>
  );
}
