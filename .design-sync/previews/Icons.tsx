import * as React from 'react';
import { Icons } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

const NAMES = [
  'Home', 'Events', 'Gallery', 'Roster', 'Apps', 'Ranks', 'Audit', 'Settings', 'Profile',
  'Search', 'Bell', 'Plus', 'ChevD', 'ChevR', 'ChevL', 'Check', 'X', 'Filter', 'Link',
  'Heart', 'Shield', 'Swords', 'Flag', 'Doc', 'Upload', 'Logout', 'Calendar', 'Clock',
  'Lock', 'Eye', 'EyeOff', 'Dots', 'Grip', 'Ext', 'Arrow', 'Discord', 'Steam', 'Xbox',
  'PS', 'Reload', 'Ban', 'Trash', 'Archive',
];

// The whole set. `Icons` is a record of components — render a member, never
// the record itself.
export const TheFullSet = () => (
  <Surface>
    <div className="admin-label brass" style={{ marginBottom: 14 }}>
      {NAMES.length} icons · render as &lt;Icons.Name /&gt;
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))',
        gap: 14,
        color: 'var(--t-200)',
      }}
    >
      {NAMES.map((n) => {
        const Ic = (Icons as any)[n];
        return (
          <div key={n} className="col" style={{ alignItems: 'center', gap: 6 }}>
            <Ic style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 9.5, color: 'var(--t-500)' }}>{n}</span>
          </div>
        );
      })}
    </div>
  </Surface>
);

export const InheritsColour = () => (
  <Surface>
    <div className="admin-label brass" style={{ marginBottom: 12 }}>
      stroke is currentColor — icons take the colour of their context
    </div>
    <div className="row" style={{ gap: 26, alignItems: 'center' }}>
      {[
        ['var(--brass-400)', 'brass'],
        ['var(--ok)', 'ok'],
        ['var(--err)', 'err'],
        ['var(--regblue-300)', 'info'],
        ['var(--t-400)', 'muted'],
      ].map(([colour, label]) => (
        <div key={label} className="col" style={{ alignItems: 'center', gap: 7, color: colour }}>
          <Icons.Shield style={{ width: 22, height: 22 }} />
          <span style={{ fontSize: 10, color: 'var(--t-500)' }}>{label}</span>
        </div>
      ))}
    </div>
  </Surface>
);

export const InContext = () => (
  <Surface>
    <div className="col" style={{ gap: 10 }}>
      <div className="notice info">
        <Icons.Doc style={{ width: 16, height: 16, color: 'var(--regblue-300)', flex: 'none', marginTop: 1 }} />
        <div>
          <div className="n-title">Informational notice</div>
          <div className="n-body">For confirming routine events the user expected.</div>
        </div>
      </div>
      <div className="notice ok">
        <Icons.Check style={{ width: 16, height: 16, color: 'var(--ok)', flex: 'none', marginTop: 1 }} />
        <div>
          <div className="n-title">Operation succeeded</div>
          <div className="n-body">4 rank changes applied to Discord.</div>
        </div>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <button className="btn primary sm">
          <Icons.Plus style={{ width: 14, height: 14 }} />
          Call an event
        </button>
        <button className="btn ghost sm">
          <Icons.Filter style={{ width: 14, height: 14 }} />
          Filter
        </button>
        <button className="btn icon ghost">
          <Icons.Dots style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  </Surface>
);
