# Lords Regiment Dashboard — CLAUDE.md

## Project Overview
Angular 19 frontend for a military regiment management dashboard (Holdfast: Nations at War). Single-page app with lazy-loaded feature modules, stub services ready for HTTP backend replacement, and a custom dark military design system.

## UI/UX Reference — ALWAYS consult first

All visual decisions (layout, spacing, colour, component shape) must be grounded in the wireframe/design kit at **`design-reference/`** in the repo root. These are the canonical UI/UX source of truth:

| File | Contains |
|---|---|
| `screens-public.jsx` | Landing, Events, Gallery, Login public pages |
| `screens-member.jsx` | Dashboard, Roster, Profile member views |
| `screens-admin.jsx` | Admin panel — Applications, Members, Ranks, Audit, Settings |
| `screens-onboarding.jsx` | Setup wizard, Discord link, Apply flow |
| `screens-mobile.jsx` | Mobile variants of all screens |
| `screens-designsystem.jsx` | Colours, typography, spacing tokens, component anatomy |
| `components.jsx` | Shared component specs (avatar, badge, tabs, table, etc.) |
| `design-canvas.jsx` | Full-page composition canvas |
| `styles.css` | Reference CSS tokens and utility classes |
| `assets/` | Brand assets (logo, banners, background images) |

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

| Selector | Inputs | Notes |
|---|---|---|
| `hf-avatar` | `[name]`, `[size]` (number), `[online]` | Computes initials + deterministic oklch color |
| `hf-badge` | `[variant]`, `[dot]`, `[text]` | |
| `hf-notice` | `[variant]`, `[title]`, `[body]` | ng-content fallback |
| `hf-medal` | `[ribbon]`, `[letter]`, `[title]` | |
| `hf-chevrons` | `[count]` | |
| `hf-crest-divider` | — | ng-content for label |
| `hf-platform-badges` | `[platforms]` (string[]) | |
| `hf-event-status` | `[status]` | |
| `hf-stat-tile` | `[label]`, `[value]`, `[foot]`, `[accent]` | |
| `hf-app-shell` | `[activeRoute]`, `[crumbs]` | Wraps sidebar + topbar + scroll area |
| `hf-sidebar` | `[active]`, `[user]`, `[isAdmin]` | `(navigate)` output |
| `hf-topbar` | `[crumbs]`, `[showSearch]` | `[topbar-actions]` ng-content slot |

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
