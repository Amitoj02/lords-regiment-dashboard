import * as React from 'react';
import { SectionHead } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const Default = () => (
  <Surface>
    <SectionHead title="Upcoming Orders" />
  </Surface>
);

export const WithRightControl = () => (
  <Surface>
    <SectionHead
      title="Recent Dispatches"
      right={<button className="btn ghost sm">View all</button>}
    />
  </Surface>
);

// How the kit uses it: to divide one long page into labelled bands.
export const DividingAPage = () => (
  <Surface>
    <SectionHead title="Colour · Surfaces &amp; Accents" />
    <div style={{ fontSize: 13, color: 'var(--t-300)', margin: '10px 0 22px', lineHeight: 1.6 }}>
      Ink surfaces carry the interface; brass, laurel and oxblood carry meaning.
    </div>
    <SectionHead
      title="Badges, Ranks, Medals"
      right={<span className="badge brass">12 tokens</span>}
    />
    <div style={{ fontSize: 13, color: 'var(--t-300)', marginTop: 10, lineHeight: 1.6 }}>
      Rank and award marks share one visual family.
    </div>
  </Surface>
);
