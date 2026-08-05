import * as React from 'react';
import { Chevrons } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

// Ported from the kit's own design-system plate (screens-designsystem.jsx —
// "Rank chevrons"): the regiment's ladder, where Private carries none.
export const RankLadder = () => (
  <Surface>
    <div className="admin-label brass" style={{ marginBottom: 12 }}>Rank chevrons</div>
    <div className="col" style={{ gap: 8 }}>
      {([
        ['Private', 0],
        ['Corporal', 1],
        ['Sergeant', 2],
        ['Lieutenant', 2],
        ['Captain', 3],
        ['Major', 4],
        ['Colonel', 5],
      ] as [string, number][]).map(([name, n]) => (
        <div key={name} className="row" style={{ gap: 10 }}>
          <span style={{ width: 90, fontSize: 12, color: 'var(--t-300)' }}>{name}</span>
          {n > 0 ? <Chevrons n={n} /> : <span style={{ color: 'var(--t-500)', fontSize: 12 }}>—</span>}
        </div>
      ))}
    </div>
  </Surface>
);

export const Counts = () => (
  <Surface>
    <div className="row" style={{ gap: 24 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="col" style={{ alignItems: 'center', gap: 6 }}>
          <Chevrons n={n} />
          <span style={{ fontSize: 10.5, color: 'var(--t-500)' }}>n={n}</span>
        </div>
      ))}
    </div>
  </Surface>
);

export const BesideAName = () => (
  <Surface>
    <div className="row" style={{ gap: 10 }}>
      <span style={{ fontSize: 13.5, color: 'var(--t-100)' }}>Jameson Nolt</span>
      <Chevrons n={2} />
      <span className="badge blue">Moderator</span>
    </div>
  </Surface>
);
