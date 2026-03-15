# Project: nestjs-turbo

Turborepo monorepo with NestJS backends and a web frontend.

## Context Files

- @README.md
- @turbo.json

## Structure

- `apps/` — Deployable applications (realworld-api, realworld-graphql, realworldx-api, web, docs)
- `packages/` — Shared libraries (nest-common, mysql-typeorm, postgresql-typeorm, graphql, api, ui, eslint-config, typescript-config)

## Tech Stack

- **Runtime:** Node.js >= 20
- **Package manager:** pnpm (workspace)
- **Build system:** Turborepo
- **Backend:** NestJS, Fastify
- **Language:** TypeScript

## Commands

- `pnpm dev` — Start all apps in dev mode
- `pnpm build` — Build all packages/apps
- `pnpm test` — Run tests
- `pnpm test:e2e` — Run end-to-end tests
- `pnpm lint` — Lint all packages/apps
- `pnpm format` — Format code with Prettier

## Conventions

- Commit messages follow Conventional Commits (enforced by commitlint + husky)
- Code is formatted with Prettier
