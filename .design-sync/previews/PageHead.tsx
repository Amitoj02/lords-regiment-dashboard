import * as React from 'react';
import { PageHead } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 24, ...style }}>
    {children}
  </div>
);

export const WithEyebrow = () => (
  <Surface>
    <PageHead
      eyebrow="Awaiting Review · 7 papers"
      title="Applications"
      sub="Each application is logged to the audit ledger upon decision."
    />
  </Surface>
);

export const WithActions = () => (
  <Surface>
    <PageHead
      eyebrow="Article of Order"
      title="Draft an Event"
      sub="Members will be notified once you publish."
      actions={
        <>
          <button className="btn ghost">Save draft</button>
          <button className="btn primary">Publish orders</button>
        </>
      }
    />
  </Surface>
);

export const TitleAndSub = () => (
  <Surface>
    <PageHead
      title="Settings — Regiment Profile"
      sub="Edits are recorded to the audit ledger."
    />
  </Surface>
);

export const TitleOnly = () => (
  <Surface>
    <PageHead title="Audit Ledger" />
  </Surface>
);
