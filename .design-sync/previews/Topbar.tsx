import * as React from 'react';
import { Topbar } from 'lords-regiment';

// Topbar is a full-width header bar — give it the page width it expects rather
// than the default surface padding.
const Bar = ({ children }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)' }}>
    {children}
  </div>
);

export const WithCrumbs = () => (
  <Bar>
    <Topbar crumbs={['Regiment', 'Members']} />
  </Bar>
);

export const DeepCrumbTrail = () => (
  <Bar>
    <Topbar crumbs={['Regiment', 'Members', 'Jameson Nolt']} />
  </Bar>
);

export const WithActions = () => (
  <Bar>
    <Topbar
      crumbs={['Command', 'Applications']}
      actions={<button className="btn primary sm">Review next</button>}
    />
  </Bar>
);

export const WithoutSearch = () => (
  <Bar>
    <Topbar crumbs={['Command Board']} search={false} />
  </Bar>
);
