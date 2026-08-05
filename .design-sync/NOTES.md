# /design-sync notes — Lords Regiment

## What is being synced, and why it isn't the Angular app

This repo is an **Angular** SPA. Claude Design renders **React**, so the Angular
components in `src/app/shared/components/` cannot be bundled for it, and
reimplementing them in React is explicitly out of scope.

What *is* synced is `design-reference/` — the repo's React design kit, which is
the canonical UI/UX source of truth (see the root `CLAUDE.md`) and which the
Angular `hf-*` components are a 1:1 port of. Syncing it means the design agent
composes with the same parts the Angular app implements.

Scope chosen on the first sync (2026-08-04): **primitives only** — the 17
components in `design-reference/components.jsx`. The 21 full screen
compositions in `design-reference/screens-*.jsx` were deliberately left out;
they are zero-prop templates with hardcoded demo data. They remain an option
for a later sync.

## How the adapter works

The kit is not an npm package: it has no build, no `dist/`, no `.d.ts`, no
Storybook. Its files are loaded as `<script type="text/babel">` in
`design-reference/Holdfast Command.html`, read React off the global, and publish
components with `Object.assign(window, {…})`.

`.design-sync/entry/index.jsx` is a thin adapter that imports
`design-reference/components.jsx` and re-exports what it put on `window`. This
works because the converter already externalises `react` to `window.React`
(`lib/bundle.mjs`) — the exact contract the kit relies on. **Nothing is
reimplemented.** If components are added to the kit, add them to the entry AND
to `componentSrcMap` + `dtsPropsFor` in `config.json`.

Verify the bundle after a change:

```sh
node -e 'const s=require("fs").readFileSync("ds-bundle/_ds_bundle.js","utf8");
global.window=global; global.React={createElement:()=>null,Fragment:"F"};
(0,eval)(s); console.log(Object.keys(global.LordsRegiment).length,"exports")'
```
Expect **60** — 17 components + 43 `Icon<Name>` aliases.

## Repo-specific gotchas

- **`--node-modules` must be `./.ds-sync/node_modules`**, not the repo's own.
  The repo root `node_modules` is Angular's and has no React. React **18.3.1**
  is pinned there deliberately: `vendorReact` prefers `react/umd/*` and React 19
  ships no UMD build. It also matches the version the kit's own page loads.
- **Playwright must be 1.61.0.** The machine's cache has chromium builds 1223
  and 1228; pw 1.61.0 pins 1228. Newer playwright (1.62 → chromium 1234) fails
  with `browserType.launch: Executable doesn't exist`. Verify with
  `node_modules/playwright-core/browsers.json`, don't guess.
- **`srcDir` MUST stay `design-reference`.** `PKG_DIR` resolves to the repo
  root (the entry walk-up finds the root `package.json`), so the default `src/`
  would make the converter scan the whole Angular app.
- **`[DTS_REACT]` warning is expected and harmless here.** `projectFor` derives
  its node_modules from `PKG_DIR` (repo root) and never looks in
  `.ds-sync/node_modules`, so it can't find `@types/react`. It does not matter
  because every prop body is hand-written in `cfg.dtsPropsFor` — the kit has no
  TypeScript at all. Validate confirms "all .d.ts parse cleanly".
- **The shell `cd`s persist between tool calls** and `DesignSync(localDir)`
  resolves against the process cwd — pass absolute paths.

## Source edit made to the kit (2026-08-04)

`design-reference/components.jsx` — `Crest` previously rendered
`<img src="assets/regiment-logo.png">`, a **relative** path that only resolved
on a page served from `design-reference/`. It was broken in the DS bundle and
would be broken in any design the agent builds. It now renders a 160px WebP
data URI (`CREST_SRC`, ~11.7 kB base64) and accepts a `src` prop to override.
Still works in the kit's own page. Regenerate with:

```sh
magick design-reference/assets/regiment-logo.png -resize 160x160 -strip -quality 88 crest160.webp
```

Note the screens (`screens-*.jsx`) still use relative `assets/bg-1.jpg` etc.
That is fine while they are out of scope, but **any future sync that includes
the screens must solve those the same way.**

## Fonts

`.design-sync/fonts/` holds Cormorant Garamond, Inter and JetBrains Mono as
**variable** woff2s (latin subset, ~180 kB total) fetched from Google Fonts,
wired via `cfg.extraFonts`. The kit's own page loads these from the Google CDN;
they are vendored so rendered designs never fall back to system fonts. All
three are SIL OFL 1.1 — `OFL.txt` carries the license and copyright lines.

- **`OFL.txt` must be copied into the bundle by hand before upload.** The
  converter only copies the woff2s + a rewritten `fonts.css` (it strips the
  attribution comment), and a rebuild wipes `ds-bundle/`. Re-run
  `cp .design-sync/fonts/OFL.txt ds-bundle/fonts/OFL.txt` after the final build
  of every sync — OFL 1.1 requires the license travel with the fonts.

## Known validate warns (expected — an unrecorded warn is new)

- `[FONT_MISSING] "Source Sans 3", "IBM Plex Sans", "Libre Caslon Text",
  "Garamond", "IBM Plex Mono"` — these are **fallback entries** in the
  `--sans`/`--serif`/`--mono` stacks in `design-reference/styles.css`, not brand
  faces. They are meant to resolve from the system or never at all. The three
  real families are shipped. Do not try to "fix" this.
- `[BUNDLE_EXPORT] 1 compound namespace(s): Icons` — informational and correct.

## The `Icons` wrinkle

`Icons` is a record of 43 SVG components, not a renderable component, but it is
registered as one so the picker gets a visible icon sheet. The generated
`Icons.d.ts` therefore ends with the boilerplate
`React.ComponentType<IconsProps>`, which is not strictly true. This is defused
deliberately in three places: the `cfg.dtsPropsFor.Icons` body opens with "NOT
renderable on its own" and types the index signature as a map of components; the
authored preview is headed `render as <Icons.Name />`; and the conventions
header repeats it. If the emit template ever gains a namespace form, switch to it.

## Re-sync risks — what to watch

- **The `Crest` data URI is inlined in the kit's source.** If someone reverts
  that hunk or replaces the logo asset, the crest silently reverts to a broken
  relative path everywhere. Check `grep -c CREST_SRC design-reference/components.jsx`.
- **Prop contracts are hand-written and can rot.** `cfg.dtsPropsFor` is the
  *only* source of the API the design agent codes against — there is no
  TypeScript to check it. If a component's signature changes in
  `components.jsx`, the `.d.ts` will keep describing the old one with no error.
  Diff the destructured params against `dtsPropsFor` on every re-sync.
- **The entry's export list is hand-maintained**, including the 43 icon names.
  A new icon in the kit is invisible until added to `.design-sync/entry/index.jsx`.
  The bundle-export count check above catches drift.
- **`.design-sync/conventions.md` enumerates real class and token names.** It was
  validated against the built CSS on 2026-08-04 (69 classes, all verified). If
  `design-reference/styles.css` changes, re-run that validation — a named class
  that no longer exists makes the agent emit silently unstyled markup.
- **Fonts were fetched from the network** at sync time. They are committed, so a
  re-sync does not refetch, but the pinned subset is latin-only — non-latin
  member names will fall back.
- **Only latin subset + no `tokens/` files.** The 55 custom properties live
  inside `_ds_bundle.css` (copied from the kit's stylesheet), not in `tokens/`;
  `tokens/` is legitimately empty.

## Not done / deliberately skipped

- The 21 screen compositions (`screens-*.jsx`) — out of the chosen scope.
- Hover/focus/drag states — not statically renderable, so not in any preview.
- `guidelines/` is empty; the kit has no standalone design-guideline markdown.
