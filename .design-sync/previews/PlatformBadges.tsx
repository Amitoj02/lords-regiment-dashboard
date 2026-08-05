import * as React from 'react';
import { PlatformBadges } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const EachPlatform = () => (
  <Surface>
    <div className="col" style={{ gap: 10, alignItems: 'flex-start' }}>
      <PlatformBadges platforms={['steam']} />
      <PlatformBadges platforms={['xbox']} />
      <PlatformBadges platforms={['ps']} />
    </div>
  </Surface>
);

export const Combined = () => (
  <Surface>
    <div className="col" style={{ gap: 10, alignItems: 'flex-start' }}>
      <PlatformBadges platforms={['steam', 'xbox']} />
      <PlatformBadges platforms={['steam', 'xbox', 'ps']} />
    </div>
  </Surface>
);

export const OnAnEventCard = () => (
  <Surface>
    <div className="panel" style={{ maxWidth: 380 }}>
      <div className="panel-header">
        <span className="panel-title">Siege of Fort Amherst</span>
        <span className="badge brass dot">Upcoming</span>
      </div>
      <div className="panel-body">
        <div style={{ fontSize: 12.5, color: 'var(--t-300)', marginBottom: 10 }}>
          Saturday · 19:30 CET · 64 slots
        </div>
        <PlatformBadges platforms={['steam', 'xbox']} />
      </div>
    </div>
  </Surface>
);
