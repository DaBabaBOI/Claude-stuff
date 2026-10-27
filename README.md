# Hacktrack

Hackathon project for SHISTECH. Theme is UN SDGs, we're going with Sustainable
Cities and Communities (SDG-11) — building something around a sustainable city.
Still figuring out the exact feature set, this repo is just the base to build on.

## Prerequisites

- Node.js version pinned in `.nvmrc` (currently 22). If you use nvm, run `nvm use`.

## Setup

```bash
git clone <repo-url>
cd Claude-stuff
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Script              | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Starts the Next.js dev server               |
| `npm run build`     | Builds the app for production               |
| `npm run start`     | Runs the production build                   |
| `npm run lint`      | Runs ESLint                                 |
| `npm run lint:fix`  | Runs ESLint and auto-fixes what it can      |
| `npm run format`    | Formats the codebase with Prettier          |
| `npm run typecheck` | Runs the TypeScript compiler with no output |

## Folder structure

```
src/
  app/          Routes, layouts and global styles (Next.js App Router)
  components/
    layout/     Structural pieces shared across pages (Header, Footer, Container)
    ui/         Reusable, generic UI primitives (Button, Card)
  lib/          Small shared utilities (e.g. the `cn` class-merge helper)
  types/        Shared TypeScript types, once we have any
```

Keep names generic for now — until we've actually agreed on what we're
building, don't name files/folders after a guessed feature.

## Branch and commit conventions

- `main` is always deployable — never commit to it directly.
- Branch names: `feat/<yourname>-<short-description>`, e.g. `feat/prithu-landing-page`.
  Also use `fix/`, `chore/`, `docs/` with the same shape.
- One feature per branch. Open a PR into `main`; someone else reviews before merge.
- Pull `main` before starting a new branch so you don't fork off stale code.
- Write commit messages in the imperative: "add header nav", not "added header nav".

## Team

- Prithu Sharma
- Aarav Kumar
- Vagisha Sinha
- Aaradhya Verma

## Deploying

Import this repo on [Vercel](https://vercel.com/new). The framework
auto-detects as Next.js — no configuration or environment variables are
needed yet.
