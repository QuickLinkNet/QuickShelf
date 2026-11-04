# Contributing

Thanks for helping! Small, focused pull requests are easiest to review.

## Setup

```bash
npm install
npm run demo        # demo archive + API + UI, no personal data needed (pip install pymupdf pillow)
```

Requirements: Node ≥ 20, PHP ≥ 8.0 with `pdo_sqlite` and `mbstring`.

## Before you open a PR

```bash
npm run check       # typecheck, lint, Vitest, i18n check, PHP tests
```

All of it must pass (CI runs the same).

## Conventions

- Frontend: React + TypeScript + Tailwind, Atomic Design, keep files under ~200 lines.
- Every user-visible string goes through `t('German text')`; add the English text to `src/i18n/en.ts` (`npm run i18n:check` tells you what is missing).
- Backend: plain PHP 8, no framework; add a test to `api/tests/run.php` for new behaviour.
- The archive stays read-only by default; anything that writes must respect `READ_ONLY`, be logged and be undoable.
- Never commit real paths, IP addresses, passwords or personal files.

## Bugs and ideas

Open an issue with steps to reproduce (PHP version, web server, NAS model if relevant).
