import * as React from 'react';
import { Fleur } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const Sizes = () => (
  <Surface>
    <div className="row" style={{ gap: 22, alignItems: 'flex-end', color: 'var(--brass-400)' }}>
      {[14, 20, 28, 40].map((s) => (
        <div key={s} className="col" style={{ alignItems: 'center', gap: 8 }}>
          <Fleur size={s} />
          <span style={{ fontSize: 10.5, color: 'var(--t-500)' }}>{s}px</span>
        </div>
      ))}
    </div>
  </Surface>
);

// Fleur fills with currentColor, so it takes the colour of whatever it sits in.
export const InheritsColour = () => (
  <Surface>
    <div className="admin-label brass" style={{ marginBottom: 12 }}>
      fill is currentColor — set colour on an ancestor
    </div>
    <div className="row" style={{ gap: 26, alignItems: 'center' }}>
      {[
        ['var(--brass-400)', 'brass'],
        ['var(--laurel-400)', 'laurel'],
        ['var(--oxblood-300)', 'oxblood'],
        ['var(--regblue-300)', 'regblue'],
        ['var(--parch-200)', 'parchment'],
      ].map(([colour, label]) => (
        <div key={label} className="col" style={{ alignItems: 'center', gap: 8, color: colour }}>
          <Fleur size={24} />
          <span style={{ fontSize: 10, color: 'var(--t-500)' }}>{label}</span>
        </div>
      ))}
    </div>
  </Surface>
);

export const AsAnOrnament = () => (
  <Surface>
    <div
      className="row"
      style={{ gap: 10, justifyContent: 'center', color: 'var(--brass-400)' }}
    >
      <Fleur size={14} />
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
        }}
      >
        Orders of the Day
      </span>
      <Fleur size={14} />
    </div>
  </Surface>
);
