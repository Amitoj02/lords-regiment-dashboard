import * as React from 'react';
import { Sidebar } from 'lords-regiment';

// Sidebar is a full-height flex column (its member footer is pinned with
// margin-top:auto), so previews give it a bounded height to sit in.
// 540px clears the tallest arrangement — brand + both nav groups (9 items)
// + the pinned member footer. Anything shorter clips the footer.
const Frame = ({ children, height = 540 }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', display: 'flex', height }}>
    {children}
  </div>
);

export const Officer = () => (
  <Frame>
    <Sidebar active="home" user={{ name: 'Jameson Nolt', rank: 'Lieutenant' }} />
  </Frame>
);

export const MemberWithoutCommand = () => (
  <Frame>
    <Sidebar
      active="events"
      isAdmin={false}
      user={{ name: 'Bramwell Fitch', rank: 'Private' }}
    />
  </Frame>
);

export const OnTheAuditLedger = () => (
  <Frame>
    <Sidebar active="audit" user={{ name: 'Aldous Kerr', rank: 'Sergeant' }} />
  </Frame>
);
