# Lords Regiment Dashboard — CLAUDE.md

## Project Overview

Angular 19 frontend for a military regiment management dashboard (Holdfast: Nations at War). Single-page app with lazy-loaded feature modules, stub services ready for HTTP backend replacement, and a custom dark military design system.

## Companion Repository — Backend API

This frontend is one half of a two-repo system. The **REST API it consumes lives in a separate backend repository** — when wiring real HTTP (see [Services Pattern](#services-pattern) below), read that repo for the actual endpoint contracts instead of inventing them.

| | |
|---|---|
| **Repo** | `lords-dashboard-backend` |
| **Local path** | `../lords-dashboard-backend` (abs: `/home/amitoj/Repositories/lords-dashboard-backend`) |
| **Remote** | https://github.com/Amitoj02/lords-dashboard-backend |
| **Stack** | NestJS 11 + TypeORM + MySQL 8 |
| **API base URL** | `http://localhost:3000/api` (Swagger UI at `/api/docs`) |

Key files to consult in the backend repo:
- `SCHEMA.md` — complete normalized DB schema (28 tables); the source of truth for the data shapes mirrored in `src/app/core/models/`.
- `src/auth/dto/current-user.dto.ts` — the `CurrentUser` projection returned by `GET /api/auth/me`, which this app's `AuthService` consumes.
- `README.md` — auth flow (Discord OAuth2 → JWT), route table, and local setup.

Auth handoff: on Discord sign-in the backend redirects to `http://localhost:4200/auth/callback` (success) or `/login` (failure). Both repos are grouped in the Blueframe workspace **`lords-dashboard`** — run `bf serve lords-dashboard` for combined project state and cross-repo drift.

## UI/UX Reference — ALWAYS consult first

All visual decisions (layout, spacing, colour, component shape) must be grounded in the wireframe/design kit at **`design-reference/`** in the repo root. These are the canonical UI/UX source of truth:

| File                       | Contains                                                    |
| -------------------------- | ----------------------------------------------------------- |
| `screens-public.jsx`       | Landing, Events, Gallery, Login public pages                |
| `screens-member.jsx`       | Dashboard, Roster, Profile member views                     |
| `screens-admin.jsx`        | Admin panel — Applications, Members, Ranks, Audit, Settings |
| `screens-onboarding.jsx`   | Setup wizard, Discord link, Apply flow                      |
| `screens-mobile.jsx`       | Mobile variants of all screens                              |
| `screens-designsystem.jsx` | Colours, typography, spacing tokens, component anatomy      |
| `components.jsx`           | Shared component specs (avatar, badge, tabs, table, etc.)   |
| `design-canvas.jsx`        | Full-page composition canvas                                |
| `styles.css`               | Reference CSS tokens and utility classes                    |
| `assets/`                  | Brand assets (logo, banners, background images)             |

> Some pages in the wireframes may not yet be built — that's expected. When a screen exists in the wireframe, match it. When it doesn't, follow the established design language.

## Tech Stack

- **Angular 19** — NgModule architecture (`standalone: false` on ALL components)
- **Bootstrap 5.3** — Grid/reboot/utilities only (no Bootstrap components)
- **SCSS** — Custom design tokens via CSS custom properties
- **RxJS** — `Observable` + `of()` stubs in all services (swap for `HttpClient` later)

## Module Structure

```
src/app/
├── app.module.ts               # Root: imports CoreModule, SharedModule
├── app-routing.module.ts       # Lazy-loaded routes
├── core/
│   ├── models/                 # member, event, application, gallery, audit-log
│   ├── services/               # members, events, applications, gallery, audit, auth
│   ├── guards/                 # auth.guard, admin.guard
│   └── core.module.ts          # Provides all services + guards
└── shared/
    ├── components/             # 12 reusable components
    └── shared.module.ts        # Declares + exports all shared components
        # Also re-exports: CommonModule, RouterModule, FormsModule, ReactiveFormsModule

features/
├── public/                     # '/', '/home', '/events', '/gallery', '/login'
├── onboarding/                 # '/setup', '/setup/discord', '/apply'
├── member/                     # '/dashboard', '/roster', '/profile', '/profile/:id'
└── admin/                      # '/admin/*' (10 admin routes)
```

## Routing

All feature modules are lazy-loaded. Routes with auth:

- `member` routes: guarded by `AuthGuard`
- `admin` routes: guarded by `AuthGuard` + `AdminGuard`

**Important:** The root redirect goes to `/home` (not `/`). Both `path: ''` and `path: 'home'` render `LandingComponent` in `public.module.ts`.

## Shared Components

| Selector             | Inputs                                     | Notes                                         |
| -------------------- | ------------------------------------------ | --------------------------------------------- |
| `hf-avatar`          | `[name]`, `[size]` (number), `[online]`    | Computes initials + deterministic oklch color |
| `hf-badge`           | `[variant]`, `[dot]`, `[text]`             |                                               |
| `hf-notice`          | `[variant]`, `[title]`, `[body]`           | ng-content fallback                           |
| `hf-medal`           | `[ribbon]`, `[letter]`, `[title]`          |                                               |
| `hf-chevrons`        | `[count]`                                  |                                               |
| `hf-crest-divider`   | —                                          | ng-content for label                          |
| `hf-platform-badges` | `[platforms]` (string[])                   |                                               |
| `hf-event-status`    | `[status]`                                 |                                               |
| `hf-stat-tile`       | `[label]`, `[value]`, `[foot]`, `[accent]` |                                               |
| `hf-app-shell`       | `[activeRoute]`, `[crumbs]`                | Wraps sidebar + topbar + scroll area          |
| `hf-sidebar`         | `[active]`, `[user]`, `[isAdmin]`          | `(navigate)` output                           |
| `hf-topbar`          | `[crumbs]`, `[showSearch]`                 | `[topbar-actions]` ng-content slot            |

## Design System

All tokens in `src/styles/_variables.scss` as CSS custom properties:

- Colors: `--ink-*`, `--parch-*`, `--brass-*`, `--laurel-*`, `--oxblood-*`, `--regblue-*`
- Typography: `--serif` (Cormorant Garamond), `--sans` (Inter), `--mono` (JetBrains Mono)
- Spacing, radius, shadows: `--r-1..4`, `--shadow-1/2`, `--t-100..500` (text hierarchy)

Global SCSS files:

- `_variables.scss` — CSS custom properties
- `_base.scss` — Reset, flex utilities (`.row`, `.col`, `.sp`, `.between`), typography helpers
- `_buttons.scss` — `.btn`, `.btn-primary/secondary/ghost/muted/destructive/discord`
- `_forms.scss` — `.hf-input`, `.hf-select`, `.hf-textarea`, `.hf-check`, `.hf-toggle`
- `_components.scss` — `.panel`, `.badge`, `.hf-table`, `.notice`, `.hf-tabs`, `.stat-tile`
- `_layout.scss` — `.sidebar`, `.nav-item`, `.topbar`, `.public-nav`, `.public-footer`

**⚠️ Bootstrap collision:** Bootstrap's `.row > *` sets `width: 100%` on flex children. The custom `.row` utility class in `_base.scss` overrides this with `> * { width: auto; ... }`. Do NOT remove this override.

## Auth Service

Uses Angular `signal()` for `currentUser`. Stub logged-in user: Jameson Nolt (Lieutenant, Moderator). Check `isAuthenticated()`, `isAdmin()`, `isOwnerOrAdmin()` from `AuthService`.

## Services Pattern

All services return `Observable<T>` using `of(stubData)`. To wire real HTTP:

```typescript
// Before (stub)
getAll(): Observable<Member[]> {
  return of(this.members);
}

// After (HTTP)
getAll(): Observable<Member[]> {
  return this.http.get<Member[]>('/api/members');
}
```

## Assets

Images in `src/assets/images/` — served at `/assets/images/*` via `angular.json` assets config.

## Known Non-Issues

- Sass `@import` deprecation warnings — non-blocking, future migration to `@use`/`@forward`
- Gallery/events images show broken img icons — expected (stub URLs, no real backend)

<!-- blueframe:start -->
## Blueframe state protocol (managed — do not edit inside these markers)

This repo uses **Blueframe**. Its machine-readable project state lives in
`.blueframe/state.json` and is the single source of truth for task status.

**At the start of every session:** read `.blueframe/state.json`. Focus on
tasks with status `in_progress`, any open `questions`, pending `testPlan`
items, and `notesForNextSession`.

**Before ending any session,** reconcile `.blueframe/state.json`:
- Advance task `status` values to reflect what actually happened
  (`planned → in_progress → questionnaire → review → test → deploy_ready → deployed`;
  use `blocked`/`archived` as off-ramps). Work that has landed on the default
  branch is `deployed` (the Orbit Sun only absorbs `deployed` — don't leave
  merged work parked at `deploy_ready`).
- Add newly discovered work as new tasks. **Never reuse or collide task ids**
  (`T-####`); allocate the next unused number.
- Record anything you deliberately did NOT do in `skippedByClaude` (short
  plain-string notes — never objects).
- Update `testPlan` items and add `regressionRisk` entries (status `open`)
  for any shared code you touched.
- Re-check open `regressionRisk` entries: if new commits show a risk was
  addressed or retired, mark it `resolved` with `resolvedAt`, `resolvedBy`,
  and a short evidence `note`; otherwise leave it `open`. Link a fix task
  to the risk it retires via `resolvesRisk` (`"<taskId>#<riskIndex>"`).
- Set `lastSyncedCommit` to the current `git rev-parse HEAD` and
  `lastSyncedAt` to now.
- Write a concise `notesForNextSession` handoff to your future self.
- Append a `history` entry for each status change.

Give each task a Project-Manager hierarchy so the Orbit PM lens shows one
node per *feature*, not per task: `area` = module / bounded context (~3–8
per repo, never one repo-wide area; a monorepo package name is a fine
module), `feature` = the durable capability (reused across every task on it),
`subfeature` = a specific control. Cross-repo dependencies use
`"<repoKey>:T-####"` in `dependsOn`; bare ids are local to this repo.

Keep diffs **minimal** and preserve existing key order. Do not touch content
in CLAUDE.md outside these markers.
<!-- blueframe:end -->

