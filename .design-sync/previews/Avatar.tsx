import * as React from 'react';
import { Avatar } from 'lords-regiment';

// Components are designed for the kit's dark root surface — every screen in
// design-reference/ renders inside <div className="app-root grain">.
const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const Sizes = () => (
  <Surface>
    <div className="row" style={{ gap: 18, alignItems: 'flex-end' }}>
      {[24, 32, 40, 56].map((s) => (
        <div key={s} className="col" style={{ alignItems: 'center', gap: 8 }}>
          <Avatar name="Jameson Nolt" size={s} />
          <span style={{ fontSize: 10.5, color: 'var(--t-500)' }}>{s}px</span>
        </div>
      ))}
    </div>
  </Surface>
);

export const DeterministicColour = () => (
  <Surface>
    <div className="admin-label brass" style={{ marginBottom: 12 }}>
      Hue is derived from the name — the same member is always the same colour
    </div>
    <div className="row" style={{ gap: 14 }}>
      {['Jameson Nolt', 'Aldous Kerr', 'Bramwell Fitch', 'Cassius Vale', 'Rowan Ashby'].map((n) => (
        <div key={n} className="col" style={{ alignItems: 'center', gap: 6 }}>
          <Avatar name={n} size={40} />
          <span style={{ fontSize: 10.5, color: 'var(--t-400)' }}>{n.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  </Surface>
);

export const Presence = () => (
  <Surface>
    <div className="row" style={{ gap: 28 }}>
      <div className="row" style={{ gap: 10 }}>
        <Avatar name="Jameson Nolt" size={40} online />
        <div>
          <div style={{ fontSize: 13, color: 'var(--t-100)' }}>Jameson Nolt</div>
          <div style={{ fontSize: 11, color: 'var(--ok)' }}>On Discord</div>
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <Avatar name="Aldous Kerr" size={40} />
        <div>
          <div style={{ fontSize: 13, color: 'var(--t-100)' }}>Aldous Kerr</div>
          <div style={{ fontSize: 11, color: 'var(--t-500)' }}>Offline</div>
        </div>
      </div>
    </div>
  </Surface>
);

export const InARosterRow = () => (
  <Surface>
    <div className="panel">
      <table className="tbl">
        <thead>
          <tr>
            <th>Member</th>
            <th>Rank</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Jameson Nolt', 'Lieutenant', '12 Mar 2024'],
            ['Aldous Kerr', 'Sergeant', '04 Jun 2024'],
            ['Bramwell Fitch', 'Private', '19 Nov 2024'],
          ].map(([name, rank, joined]) => (
            <tr key={name}>
              <td>
                <span className="row" style={{ gap: 10 }}>
                  <Avatar name={name} size={28} online={name === 'Jameson Nolt'} />
                  <span style={{ color: 'var(--t-100)' }}>{name}</span>
                </span>
              </td>
              <td>{rank}</td>
              <td className="mono" style={{ color: 'var(--t-400)' }}>{joined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Surface>
);
