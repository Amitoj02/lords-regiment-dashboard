# Building with the Lords Regiment kit

A dark, military-archival design system for a Holdfast regiment dashboard: ink
surfaces, brass accents, a Cormorant Garamond display serif over Inter body text,
and parchment for anything ceremonial. Restraint is the point — one brass accent
per view, hairline rules instead of shadows, square-ish corners (2–6px).

## 1. Every screen needs the root surface

Components are designed for a dark surface and set **no background of their
own**. Outside the root class they render dark-on-white and look broken. Wrap
the page:

```jsx
<div className="app-root grain">   {/* .app-root = ink-900 bg, base text colour, Inter */}
  …your page…
</div>
```

`.grain` is optional (a subtle paper texture). `AppShell` already includes
`.app-root` — never nest another one inside it.

There is no theme provider, no context, no CSS-in-JS. Load the bundled
`styles.css` and render; that is the whole setup.

## 2. The styling idiom: the kit's own classes + `var(--…)`

This is a **plain-CSS class system**, not utility-first and not prop-styled.
Compose layout and chrome from the classes the stylesheet already defines, and
reach for `var(--…)` only for colour. Do not invent class names — an unknown
class silently does nothing here.

| Family | Class names |
|---|---|
| Layout | `.row` `.col` `.sp` (flex spacer) `.between` `.grid-2` `.grid-3` `.grid-4` `.page` `.divider` |
| Surfaces | `.panel` `.panel.raised` `.panel-header` `.panel-title` `.panel-body` `.parchment` `.grain` |
| Buttons | `.btn` + `.primary` `.secondary` `.ghost` `.muted` `.destructive` `.discord`; sizes `.sm` `.lg` `.icon` `.block` |
| Badges | `.badge` + `.brass` `.laurel` `.ox` `.blue` `.parch` `.solid` `.dot` |
| Notices | `.notice` + `.ok` `.warn` `.err` `.info`, with `.n-title` / `.n-body` inside |
| Tables | `.tbl` (use real `<thead>/<tbody>`) |
| Forms | `.input` `.select` `.textarea` `.input-wrap` `.has-icon` `.field-label` `.field-hint` `.field-error` `.check` `.toggle` (+ `.on`) |
| Type | `.serif` `.serif-display` `.mono` `.admin-label` (+ `.brass` / `.parch`) `.page-title` `.page-sub` |
| Empty state | `.empty` with `.e-title` / `.e-body` |
| Ornament | `.crest-divider` `.rule-ornament` (+ `.pip`) `.wax` `.archive-label` |

**Colour tokens** — all 55 are defined in the shipped stylesheet:

- Surfaces `--ink-900` (page) `--ink-850` `--ink-800` (panel) `--ink-750` `--ink-700` `--ink-600` `--ink-500` `--ink-400`
- Hairlines `--rule` `--rule-2` `--rule-3`
- Text `--t-100` (headings) `--t-200` (body) `--t-300` `--t-400` `--t-500`, and `--t-on-parch` / `--t-on-parch-2` on parchment
- Accents `--brass-100/300/400/500/600/700` (the primary accent), `--laurel-400…700` (green), `--oxblood-300…700` (red), `--regblue-300/500/700` (steel blue)
- Parchment `--parch-50/100/200/300/700/900`
- Semantic `--ok` `--warn` `--err` `--info`
- Type `--serif` `--sans` `--mono` · Radii `--r-1`…`--r-4` · Elevation `--shadow-1` `--shadow-2`

Brass is the accent of authority — use it for the single primary action, active
nav, and section eyebrows. Oxblood means destructive or live; laurel means
granted or healthy.

## 3. Icons

`Icons` is a **record of 43 SVG components, not a component**. Render a member:

```jsx
<Icons.Shield style={{ width: 16, height: 16 }} />   // correct
<Icons />                                            // wrong
```

They stroke with `currentColor`, so set `color` on an ancestor to tint them.
Each is also exported individually as `IconShield`, `IconHome`, and so on.

## 4. Where the truth lives

- `styles.css` and the `_ds_bundle.css` it imports — the real, complete class and
  token definitions. Read them before inventing any styling.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage.
- `components/<group>/<Name>/<Name>.d.ts` — the prop contract.

## 5. An idiomatic composition

```jsx
<div className="app-root grain" style={{ padding: 24 }}>
  <PageHead
    eyebrow="Awaiting Review · 7 papers"
    title="Applications"
    sub="Each application is logged to the audit ledger upon decision."
    actions={<button className="btn primary">Review next</button>}
  />

  <div className="grid-4" style={{ gap: 12, marginTop: 18 }}>
    <StatTile label="Muster strength" value="84" foot="+3 this month" />
    <StatTile label="Applications" value="7" foot="Awaiting review" />
  </div>

  <SectionHead title="Upcoming Orders" right={<button className="btn ghost sm">View all</button>} />

  <div className="panel" style={{ marginTop: 12 }}>
    <table className="tbl">
      <thead><tr><th>Event</th><th>When</th><th>Status</th></tr></thead>
      <tbody>
        <tr>
          <td style={{ color: 'var(--t-100)' }}>Thursday Linebattle</td>
          <td className="mono" style={{ color: 'var(--t-400)' }}>20:00 CET</td>
          <td><EventStatus state="ongoing" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

For a whole signed-in screen, start from `AppShell` (it supplies the root
surface, `Sidebar` and `Topbar`) and put only the page body in its children.
