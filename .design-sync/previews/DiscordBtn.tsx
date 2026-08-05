import * as React from 'react';
import { DiscordBtn } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const Default = () => (
  <Surface>
    <DiscordBtn />
  </Surface>
);

export const Large = () => (
  <Surface>
    <DiscordBtn size="lg" />
  </Surface>
);

export const CustomLabel = () => (
  <Surface>
    <div className="col" style={{ gap: 10, alignItems: 'flex-start' }}>
      <DiscordBtn>Link your Discord account</DiscordBtn>
      <DiscordBtn>Re-authorise the bot</DiscordBtn>
    </div>
  </Surface>
);

// How the sign-in screen actually presents it.
export const OnTheSignInPanel = () => (
  <Surface style={{ display: 'flex', justifyContent: 'center' }}>
    <div className="panel" style={{ width: 340, textAlign: 'center' }}>
      <div className="panel-body">
        <div className="serif" style={{ fontSize: 22, color: 'var(--t-100)' }}>Report for duty</div>
        <div style={{ fontSize: 12.5, color: 'var(--t-400)', margin: '6px 0 16px', lineHeight: 1.5 }}>
          The regiment signs in through Discord. No password is ever stored.
        </div>
        <DiscordBtn size="lg" />
      </div>
    </div>
  </Surface>
);
