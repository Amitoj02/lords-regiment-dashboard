import * as React from 'react';
import { EventStatus } from 'lords-regiment';

const Surface = ({ children, style }: any) => (
  <div className="app-root grain" style={{ background: 'var(--ink-900)', padding: 20, ...style }}>
    {children}
  </div>
);

export const AllStates = () => (
  <Surface>
    <div className="row" style={{ gap: 14 }}>
      <EventStatus state="upcoming" />
      <EventStatus state="ongoing" />
      <EventStatus state="previous" />
    </div>
  </Surface>
);

// Any state other than "ongoing"/"upcoming" falls through to Previous — worth
// showing, because the kit's own screens pass "prev".
export const UnknownStateFallsBackToPrevious = () => (
  <Surface>
    <div className="col" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 10 }}>
        <span style={{ width: 90, fontSize: 12, color: 'var(--t-400)' }}>"prev"</span>
        <EventStatus state={'prev' as any} />
      </div>
      <div className="row" style={{ gap: 10 }}>
        <span style={{ width: 90, fontSize: 12, color: 'var(--t-400)' }}>omitted</span>
        <EventStatus />
      </div>
    </div>
  </Surface>
);

export const InAnEventList = () => (
  <Surface>
    <div className="panel">
      <table className="tbl">
        <thead>
          <tr>
            <th>Event</th>
            <th>When</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {([
            ['Thursday Linebattle', '20:00 CET', 'ongoing'],
            ['Siege of Fort Amherst', 'Sat 19:30 CET', 'upcoming'],
            ['Autumn Drill Review', '14 Oct 2025', 'previous'],
          ] as [string, string, any][]).map(([name, when, state]) => (
            <tr key={name}>
              <td style={{ color: 'var(--t-100)' }}>{name}</td>
              <td className="mono" style={{ color: 'var(--t-400)' }}>{when}</td>
              <td><EventStatus state={state} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Surface>
);
