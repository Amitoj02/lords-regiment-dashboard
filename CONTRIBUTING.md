# Contributing

How work actually gets done on the Lords Regiment Dashboard SPA: where code is
written, how it is tested, how it reaches production, and the handful of traps
that will cost you an afternoon if nobody warns you.

- **Architecture, design system and component reference** → [`CLAUDE.md`](CLAUDE.md)
- **Stack, scripts and project layout** → [`README.md`](README.md)
- **Canonical UI/UX source of truth** → [`design-reference/`](design-reference)

---

## Two repositories, one product

|         | Repo                                                                             | Stack                                                      | Dev server                  |
| ------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------- |
| **SPA** | `lords-regiment-dashboard` (this one)                                            | Angular 19 (NgModule, `standalone: false`) · Bootstrap 5.3 | `http://localhost:4200`     |
| **API** | [`lords-dashboard-backend`](https://github.com/Amitoj02/lords-dashboard-backend) | NestJS 11 · TypeORM · MySQL 8.4                            | `http://localhost:3000/api` |

They are expected to sit **side by side**:

```
~/Repositories/
├── lords-dashboard-backend/
└── lords-regiment-dashboard/
```

The backend's `docker-compose.yml` builds its `web` service from
`context: ../lords-regiment-dashboard`, so that layout is load-bearing for local
Docker runs. (CI and production don't rely on it — both build from GHCR images.)

**This app has no stub data.** All 13 services in `src/app/core/services/` call
`HttpClient` against the real API. The remaining `of(...)` calls are `catchError`
fallbacks and one default storage policy — do not "wire them up", they are
already wired. `src/app/core/models/` mirrors the API's response shapes; the
backend's `SCHEMA.md` and `src/auth/dto/current-user.dto.ts` are the source of
truth for them. Read those rather than guessing.

`environment.apiBaseUrl` is the **relative** string `/api` in both dev and prod,
so the built bundle carries no hostname and works behind any domain that proxies
`/api` to the backend. That also means the SPA and API must be **same-origin** —
auth is a bearer header (`localStorage` key `lords_access_token`, attached by
`jwt.interceptor.ts`), not a cookie, and a cross-origin setup has no CORS
allowance configured.

---

## Getting started

```bash
git clone <frontend> && cd lords-regiment-dashboard
git clone <backend> ../lords-dashboard-backend

npm ci
npm start          # http://localhost:4200
```

Requires Node `^18.19.1 || ^20.11.1 || >=22` (see `engines` in `package.json`).

`ng serve` proxies `/api` to `http://localhost:3000` via `proxy.conf.json`, so
**bring the backend up first** — see its
[CONTRIBUTING guide](https://github.com/Amitoj02/lords-dashboard-backend/blob/main/CONTRIBUTING.md).
There is a second config, `proxy.conf.docker.json`, targeting `http://api:3000`
for when this app runs as the backend compose stack's `web` container instead of
on the host.

> ⚠️ **Check which port the API is actually on.** The backend's compose publishes
> it as `${API_HOST_PORT:-3000}`, and 3000 is a popular port — if anything else on
> your machine already owns it, the API gets moved and `proxy.conf.json` keeps
> pointing at the squatter. `curl localhost:3000/api/health` and confirm the
> response is _this_ API before debugging the frontend.

### Signing in locally

Discord is **mocked** by the backend whenever `DISCORD_CLIENT_ID` is empty, which
is the default for a local `docker compose up`. Sign in as a specific persona by
visiting one of these in the browser — go through the **proxy**, not the API port
directly, so the whole flow stays same-origin:

| URL                                                 | Lands as                                             |
| --------------------------------------------------- | ---------------------------------------------------- |
| `http://localhost:4200/api/auth/discord?as=owner`   | Full admin — every capability, all of `/app/admin/*` |
| `http://localhost:4200/api/auth/discord?as=recruit` | Non-member — bounced to `/onboarding/apply`          |

The backend redirects back to `/auth/callback?token=…`, which `AuthCallbackComponent`
consumes. Guards read `AuthService.currentUser`, an Angular `signal` hydrated
from `GET /api/auth/me` by an `APP_INITIALIZER` before first render — so a guard
never sees a half-resolved auth state on the very first navigation.

If the backend's `.env` carries a **real** `DISCORD_CLIENT_ID`, the mock is off
and `?as=owner` silently bounces you to the genuine Discord consent screen
instead of failing loudly. Clear that variable to get the personas back.

---

## The day-to-day loop

```bash
git checkout main && git pull
git checkout -b feat/short-description

# ... write code ...

npm run format        # prettier --write
npm run lint          # eslint over *.ts and *.html
npm run test:ci       # unit tests, once, headless
npm run build         # production build — catches budget + AOT failures

git commit
git push -u origin feat/short-description
gh pr create
```

CI runs `format:check` → `lint` → production `build` → `test:ci` on every push
and PR to `main`. All four must be green before merge. **`format:check` is first
and it is unforgiving** — run `npm run format` before you push.

### Branch naming

`feat/`, `fix/`, `chore/`, `docs/`, `ci/`, `refactor/` + a short kebab description.

### Commits

Conventional-commit prefix with a scope, then **why**, not what — the diff
already says what. The repo's history is the reference:

```
fix(build): stop CSP blocking the main stylesheet in production
feat(applications): surface the Mercenary track in intake + review (T-0226..T-0229)
```

---

## Testing

| Command           | What it covers                               |
| ----------------- | -------------------------------------------- |
| `npm test`        | Karma/Jasmine in watch mode, real Chrome     |
| `npm run test:ci` | The same suite once, headless — what CI runs |

There is **no end-to-end suite**. Unit specs are the whole safety net, so
behavioural changes need one.

Write specs that pin the _reason_ a thing exists, not its current output. A spec
named "an untitled route falls back to the base title, never a stale one"
survives a well-meaning refactor; `expect(document.title).toBe('Events | Lords Regiment')`
alone does not.

Specs live beside the file they cover (`foo.service.ts` → `foo.service.spec.ts`).
For anything routing-shaped, prefer `RouterTestingHarness` over asserting on a
snapshot object — several bugs in this app only appear on the _second_
navigation, and a harness is the only thing that catches those.

---

## Conventions that are load-bearing

### NgModule, and `standalone: false` on every component

This app is deliberately **not** standalone. Features are lazy-loaded NgModules
(`public`, `onboarding`, `member`, `admin`), each declaring its own components
and its own `const routes: Routes`. `angular.json` sets `standalone: false` in
the component/directive/pipe schematics so `ng generate` matches — do not flip a
component to standalone in passing, it breaks the module that declares it.

Route tables are **not** all in `app-routing.module.ts`. There are five: the root
one plus an inline table in each feature module. When you change routing, check
all five.

### Zero extra runtime dependencies

Production dependencies are `@angular/*`, `bootstrap`, `bootstrap-icons`, `rxjs`,
`tslib` and `zone.js`. That is the whole list, and it is a deliberate posture:
there is **no date library, no markdown library, no lodash, no icon framework
beyond bootstrap-icons.**

If you need one of those, hand-write the minimum in `src/app/shared/services/`
and say so in the PR. A 40-line date formatter that does exactly what three
screens need beats 70 kB of locale data in the initial bundle — and the
production build has budgets (540 kB initial warning, 1 MB error; 6 kB per
component stylesheet) that will tell you when you got it wrong.

### Where the design system lives

- [`design-reference/`](design-reference) — the wireframe/design kit. **Consult it
  before changing layout, spacing or colour.** `screens-*.jsx` are the canonical
  screens, `components.jsx` the component anatomy, `screens-designsystem.jsx` the
  tokens. When a screen exists in the wireframe, match it; when it doesn't,
  follow the established language.
- `src/styles/_variables.scss` — every design token as a CSS custom property
  (`--ink-*`, `--brass-*`, `--laurel-*`, `--serif`/`--sans`/`--mono`, `--r-1..4`,
  `--t-100..500`). Never hardcode a hex that already has a token.
- `src/styles/_base|_buttons|_forms|_components|_layout.scss` — the global class
  layer (`.panel`, `.btn-*`, `.hf-input`, `.hf-table`, `.page-title`, …). Reach
  for an existing class before writing component SCSS.
- `src/app/shared/components/` — the twelve reusable `hf-*` components.

### Responsive rules

`src/styles/_responsive.scss` owns the mobile layer: **≤ 820px** collapses the
sidebar into an off-canvas drawer and reveals the bottom nav; **≤ 480px** is the
narrow-phone pass. Its header comment explains the split, and it is not a
suggestion: rules that must beat a component's `:host` styles cannot live in the
global layer, so **component-local grids get overridden in that component's own
SCSS**, not here. Verify visual work at 390px and 768px, not only desktop.

---

## Cross-repo changes

When a change touches both repos — a new endpoint this app consumes, a changed
DTO shape — **the two must ship together.** The SPA and API share a contract, and
a frontend deployed ahead of its backend is the breakage to avoid.

1. Branch in both repos, ideally with matching branch names.
2. Open both PRs and cross-link them in the descriptions.
3. Merge them together.
4. Deploy both images in one run (the deploy workflow takes both tags).

Where you can, make this app **degrade safely** if a backend field is absent —
treat a missing field as the permissive default. That turns a deploy-order
mistake from an outage into a cosmetic glitch.

---

## Getting to production

```
merge to main  →  Actions builds + pushes lords-web to GHCR   (nothing live changes)
manual run     →  Actions → "Deploy to production"  (BACKEND repo)
                  api_tag + web_tag = commit shas, or `latest`
```

This repo's `release.yml` only **publishes an image**. It never touches the
running site. That is why the image is built in Actions and not on the VPS: the
Angular CLI spawns several V8 isolates in one process, and production is a
2 vCore / 4 GB box already running MySQL and the API.

One workflow rolls **both** images and it lives in the backend repo. **This repo
has no deploy workflow by design** — see the backend's
[CONTRIBUTING guide](https://github.com/Amitoj02/lords-dashboard-backend/blob/main/CONTRIBUTING.md)
and `deploy/README.md` for the runbook and the rollback procedure.

The published package is private (this repo is private), so the VPS needs
`docker login ghcr.io` with a PAT carrying `read:packages`.

---

## Traps

Things that have actually cost time here.

**Do NOT re-enable `inlineCritical` in `angular.json`.** Angular's critical-CSS
inliner rewrites the stylesheet link to `media="print" onload="this.media='all'"`.
That `onload` is an inline event handler; production serves `script-src 'self'`,
the browser blocks it, the sheet never applies to screen, and the site renders
half-styled. It fails **only in production** — `development` disables
optimization entirely and `ng serve` sends no CSP header. ~18 kB of
render-blocking CSS is not worth weakening the CSP.

**Bootstrap's `.row > *` sets `width: 100%` on flex children.** The custom `.row`
utility in `_base.scss` overrides it with `> * { width: auto; }`. Removing that
"redundant" override silently stretches every inline row in the app.

**Prettier is 4-space here, and component templates need the override.** Angular's
prettier parser is locked to 2-space, so `.prettierrc.json` forces `parser: "html"`
for `*.component.html`. Match the file you are editing; `*.json`/`*.yml`/`*.md`
are 2-space by design.

**`WEB_ORIGIN` on the backend must include the port** — `http://localhost:4200`,
not `http://localhost`. Discord (and the mock's redirect construction) rejects a
mismatched `redirect_uri`, and the failure looks like a broken login page in
_this_ repo.

**Sass `@import` deprecation warnings are expected.** `angular.json` silences them
(`stylePreprocessorOptions.sass.silenceDeprecations`) pending a `@use`/`@forward`
migration. Don't "fix" one file in isolation.

**Broken image icons in the gallery/events are usually the object store, not this
app.** Media URLs arrive fully-qualified from the API; the frontend has no
storage base URL of its own. Check `S3_PUBLIC_BASE_URL` on the backend.

**A throw inside a global router provider breaks navigation everywhere.** The
router invokes `TitleStrategy.updateTitle` _inside_ the navigation pipeline,
before it resolves the transition — so app-wide hooks like `AppTitleStrategy`
(`src/app/core/title/`) must be total. Same reasoning applies to interceptors and
guards: degrade, never throw.

---

## Project state

This repo uses [**Blueframe**](https://github.com/Amitoj02/blueframe), an open-
source project-state tracker. Install it from that repository — you don't need it
to build or test this project, only to read and reconcile the task state below.

`.blueframe/state.json` is the machine-readable source of truth for task status,
open questions, test plans and regression risks.

- Read it at the start of a session — `in_progress` tasks, open `questions`,
  pending `testPlan` items, and `notesForNextSession`.
- Reconcile it before ending one: advance statuses, add newly discovered work
  with fresh task ids (never reuse a `T-####`), record what you deliberately
  skipped, and update `lastSyncedCommit`.
- Keep the file **ASCII-escaped** (`ensure_ascii`) or every em-dash line shows up
  as a spurious diff. `testPlan` status must be `pending`, `passed` or `failed`.

`bf serve lords-dashboard` gives combined state across both repos. The workspace
groups this repo with the API — see
[its CONTRIBUTING guide](https://github.com/Amitoj02/lords-dashboard-backend/blob/main/CONTRIBUTING.md)
for the backend half of the same flow.

The file is plain JSON, so you can read and edit it without installing anything;
`bf` is a convenience, not a gate. Full schema and CLI reference live in the
[Blueframe repository](https://github.com/Amitoj02/blueframe).
