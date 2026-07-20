# Lords Regiment Dashboard

A management dashboard for a **Holdfast: Nations at War** military regiment — roster, events,
gallery, applications, ranks/medals and an admin panel. Built as an **Angular 19 single-page app**
with a custom dark military design system.

> **Status:** Fully wired to the API. All 13 services in `src/app/core/services/` call `HttpClient`
> against `environment.apiBaseUrl` — the relative string `/api`, so one build works behind any
> domain provided something proxies `/api` to the backend. Sign-in is real Discord OAuth2.
> The backend lives in the companion repo
> [`lords-dashboard-backend`](https://github.com/Amitoj02/lords-dashboard-backend); the two share
> an API contract and must be deployed together.

## Tech stack

- **Angular 19** — NgModule architecture (`standalone: false` on all components), lazy-loaded features
- **Bootstrap 5.3** — grid, reboot and utilities only (no Bootstrap JS components)
- **SCSS** — custom design tokens exposed as CSS custom properties
- **RxJS 7** — `Observable`-based `HttpClient` services with a JWT interceptor
- **ESLint (angular-eslint) + Prettier** — linting and formatting
- **Karma + Jasmine** — unit tests

## Getting started

```bash
npm install
npm start            # dev server on http://localhost:4200/
```

Requires Node `^18.19.1 || ^20.11.1 || >=22` (see `engines` in `package.json`).

## NPM scripts

| Script                 | Purpose                                |
| ---------------------- | -------------------------------------- |
| `npm start`            | Run the dev server (`ng serve`)        |
| `npm run build`        | Production build to `dist/`            |
| `npm test`             | Unit tests in watch mode (Karma)       |
| `npm run test:ci`      | Unit tests once, headless (used by CI) |
| `npm run lint`         | ESLint over `*.ts` and `*.html`        |
| `npm run lint:fix`     | ESLint with auto-fix                   |
| `npm run format`       | Format the repo with Prettier          |
| `npm run format:check` | Verify formatting (used by CI)         |

## Project structure

```
src/app/
├── core/        # singleton HttpClient services, guards, interceptors, models — provided in root
├── shared/      # reusable design-system components (hf-*) + SharedModule
└── features/    # lazy-loaded feature modules:
    ├── public/        '', 'home', 'events', 'gallery', 'login'
    ├── onboarding/    'setup', 'setup/discord', 'apply'
    ├── member/        'dashboard', 'roster', 'profile', 'profile/:id'   (AuthGuard)
    └── admin/         'admin/*'                                          (AuthGuard + AdminGuard)
```

Member routes require authentication; admin routes additionally require an admin role. Both guards
are functional (`CanActivateFn`) reading from `AuthService`, whose `currentUser` is an Angular
`signal` populated from `GET /api/auth/me`. An `APP_INITIALIZER` resolves that call before first
render when a token is present, so guards always see the real state. Fine-grained access uses
`hasCapability()`, backed by the API's role-permissions matrix.

## Design reference

All visual decisions are grounded in the wireframe/design kit under [`design-reference/`](./design-reference)
(screens, component specs, design tokens). Consult it before changing layout, spacing or colour. See
[`CLAUDE.md`](./CLAUDE.md) for the full architecture and design-system reference.

## Testing

Unit tests run on Karma/Jasmine (`npm test`). There is no end-to-end suite configured.

## Continuous integration

`.github/workflows/ci.yml` runs formatting check, lint, production build and headless unit tests on
every push and pull request to `main`.
