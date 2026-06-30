# Prompt Studio

Local-first prompt management workbench built with Next.js, Dexie (IndexedDB), Monaco Editor, and XRender.

## Features

- Prompt CRUD with categories, flat tags, favorites, ratings, and notes
- Version history with changelog notes, diff view, and rollback
- Template variables via `{{variable}}` syntax with JSON Schema-driven forms
- Prompt result storage per model
- Privacy mode with hidden toggle (tap logo 10 times)
- JSON import/export
- Translation assist (iframe or external API, not persisted)

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` - start development server
- `pnpm build` - production build
- `pnpm lint` - run ESLint

## Architecture

```
UI (Next.js) -> Zustand -> Repository -> Dexie (IndexedDB)
```

See `prompt-studio.md` and `deep-research-report.md` for product and design docs.
