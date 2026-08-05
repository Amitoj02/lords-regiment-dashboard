import * as React from 'react';
import { Medal } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

// The five ribbon colourways, laid out as the kit's own design-system plate
// presents them (screens-designsystem.jsx — "Medals").
export const Ribbons = () => (
  <Surface>
    <div className="admin-label brass" style={{ marginBottom: 12 }}>Medals</div>
    <div className="row" style={{ gap: 16 }}>
      {[
        ['blue', 'L', 'Linebattle'],
        ['red', 'V', 'Valor'],
        ['gold', '★', 'Marksman'],
        ['green', 'D', 'Drill'],
        ['tricolor', 'S', 'Standard'],
      ].map(([ribbon, letter, label]) => (
        <div key={label} className="col" style={{ alignItems: 'center', gap: 5 }}>
          <Medal ribbon={ribbon as any} letter={letter} title={label} />
          <span style={{ fontSize: 10, color: 'var(--t-400)' }}>{label}</span>
        </div>
      ))}
    </div>
  </Surface>
);

export const AwardRack = () => (
  <Surface>
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Commendations</span>
        <span className="badge brass">4 awarded</span>
      </div>
      <div className="panel-body">
        <div className="row" style={{ gap: 12 }}>
          <Medal ribbon="blue" letter="L" title="Linebattle" />
          <Medal ribbon="red" letter="V" title="Valor" />
          <Medal ribbon="gold" letter="★" title="Marksman" />
          <Medal ribbon="tricolor" letter="S" title="Standard Bearer" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 12 }}>
          Awarded by the officer corps. Hover a medal for its full citation.
        </div>
      </div>
    </div>
  </Surface>
);

export const SingleAward = () => (
  <Surface>
    <div className="row" style={{ gap: 12 }}>
      <Medal ribbon="gold" letter="★" title="Marksman" />
      <div>
        <div className="serif" style={{ fontSize: 16, color: 'var(--t-100)' }}>Marksman</div>
        <div style={{ fontSize: 11.5, color: 'var(--t-400)' }}>Top score in three consecutive drills</div>
      </div>
    </div>
  </Surface>
);
