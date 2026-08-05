import * as React from 'react';
import { RankPip } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const Ladder = () => (
  <Surface>
    <div className="col" style={{ gap: 10, alignItems: 'flex-start' }}>
      <RankPip name="Corporal" n={1} />
      <RankPip name="Sergeant" n={2} />
      <RankPip name="Lieutenant" n={2} />
      <RankPip name="Captain" n={3} />
      <RankPip name="Major" n={4} />
      <RankPip name="Colonel" n={5} />
    </div>
  </Surface>
);

export const Default = () => (
  <Surface>
    <RankPip />
  </Surface>
);

export const InAProfileHeader = () => (
  <Surface>
    <div className="panel">
      <div className="panel-body">
        <div className="serif" style={{ fontSize: 20, color: 'var(--t-100)' }}>Jameson Nolt</div>
        <div style={{ marginTop: 8 }}>
          <RankPip name="Lieutenant" n={2} />
        </div>
      </div>
    </div>
  </Surface>
);
