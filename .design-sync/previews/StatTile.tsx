import * as React from 'react';
import { StatTile } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const DashboardRow = () => (
  <Surface>
    <div className="grid-4" style={{ gap: 12 }}>
      <StatTile label="Muster strength" value="84" foot="+3 this month" />
      <StatTile label="Events attended" value="27" foot="Of 31 called" />
      <StatTile label="Applications" value="7" foot="Awaiting review" />
      <StatTile label="Commendations" value="4" foot="Last awarded Oct" />
    </div>
  </Surface>
);

export const WithAccent = () => (
  <Surface>
    <div className="grid-3" style={{ gap: 12 }}>
      <StatTile label="Connection" value="Healthy" foot="Heartbeat 41ms" accent="var(--ok)" />
      <StatTile label="Missing permission" value="1" foot="Manage Roles" accent="var(--err)" />
      <StatTile label="Roles under authority" value="9" foot="Out of 14 total" accent="var(--brass-300)" />
    </div>
  </Surface>
);

export const Single = () => (
  <Surface>
    <div style={{ maxWidth: 220 }}>
      <StatTile label="Server members visible" value="84 / 84" foot="Last full sync 6m ago" />
    </div>
  </Surface>
);

export const WithoutFoot = () => (
  <Surface>
    <div className="grid-2" style={{ gap: 12, maxWidth: 380 }}>
      <StatTile label="Muster strength" value="84" />
      <StatTile label="Officers" value="6" />
    </div>
  </Surface>
);
