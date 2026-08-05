import * as React from 'react';
import { Crest } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const Sizes = () => (
  <Surface>
    <div className="row" style={{ gap: 20, alignItems: 'flex-end' }}>
      {[20, 34, 48, 60].map((s) => (
        <div key={s} className="col" style={{ alignItems: 'center', gap: 8 }}>
          <Crest size={s} />
          <span style={{ fontSize: 10.5, color: 'var(--t-500)' }}>{s}px</span>
        </div>
      ))}
    </div>
  </Surface>
);

// The lockup the sidebar and public nav both build from the crest.
export const BrandLockup = () => (
  <Surface>
    <div className="row" style={{ gap: 10 }}>
      <Crest size={36} />
      <div>
        <div
          className="serif"
          style={{ fontSize: 17, color: 'var(--brass-300)', fontWeight: 600, lineHeight: 1.05 }}
        >
          Lord Regiment
        </div>
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: '.22em',
            textTransform: 'uppercase',
            color: 'var(--t-400)',
            marginTop: 2,
          }}
        >
          Est. MMXXIV · Holdfast
        </div>
      </div>
    </div>
  </Surface>
);

export const InAFooter = () => (
  <Surface>
    <div
      className="row"
      style={{ gap: 12, color: 'var(--t-500)', fontSize: 11.5, justifyContent: 'center' }}
    >
      <Crest size={20} />
      <span>Holdfast Command · Lord Regiment · Est. MMXXIV</span>
    </div>
  </Surface>
);
