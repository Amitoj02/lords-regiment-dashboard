import * as React from 'react';
import { CrestDivider } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const WithLabel = () => (
  <Surface>
    <CrestDivider>Article II · Regiment Details</CrestDivider>
  </Surface>
);

export const Unlabelled = () => (
  <Surface>
    <CrestDivider />
  </Surface>
);

// How the kit actually uses it: to separate ceremonial sections of a page.
export const BetweenSections = () => (
  <Surface>
    <div style={{ fontSize: 13, color: 'var(--t-300)', lineHeight: 1.6 }}>
      Every applicant is reviewed by two officers before a decision is entered.
    </div>
    <div style={{ margin: '18px 0' }}>
      <CrestDivider>Enlistment Answers</CrestDivider>
    </div>
    <div className="parchment" style={{ padding: 16 }}>
      <div className="admin-label parch">Why do you wish to enlist?</div>
      <div className="serif" style={{ fontSize: 16, color: 'var(--parch-900)', marginTop: 6, lineHeight: 1.4 }}>
        I have drilled with the line for two seasons and wish to serve under a proper standard.
      </div>
    </div>
  </Surface>
);
