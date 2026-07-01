# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev        # start dev server
pnpm build      # production build
pnpm start      # serve production build
pnpm lint       # run ESLint
```

No test suite is configured yet.

## Stack

- **Next.js 16.2.9** with the App Router — **read `node_modules/next/dist/docs/` before writing any Next.js code** (AGENTS.md requirement; APIs may differ from training data)
- **React 19.2.4**
- **Tailwind CSS v4** via `@tailwindcss/postcss` — config is in `postcss.config.mjs`, not `tailwind.config.*`
- **TypeScript** (strict mode, path alias `@/*` → `src/*`)
- **pnpm** (`pnpm-workspace.yaml` present; use pnpm, not npm/yarn/bun)

## Architecture

The project is a fresh Next.js App Router scaffold. All application code lives under `src/app/`:

- `layout.tsx` — root layout; applies Geist/Geist Mono fonts as CSS variables and wraps `<body>` in a flex column
- `page.tsx` — home page (currently the default scaffold)
- `globals.css` — global styles entry point

There are no additional routes, components, or data-fetching layers yet.
