import * as React from 'react';
import { AppShell, PageHead, SectionHead, StatTile, Avatar, EventStatus, Icons } from 'lords-regiment';

// AppShell already supplies its own .app-root wrapper, sidebar and topbar — it
// only needs a bounded height to lay out against.
const Frame = ({ children, height = 620 }: any) => (
  <div style={{ height }}>{children}</div>
);

export const OfficerDashboard = () => (
  <Frame>
    <AppShell
      active="home"
      crumbs={['Command Board']}
      user={{ name: 'Jameson Nolt', rank: 'Lieutenant' }}
      topActions={
        <button className="btn primary sm">
          <Icons.Plus style={{ width: 14, height: 14 }} />
          RSVP Next Event
        </button>
      }
    >
      <div className="page" style={{ padding: '22px 26px' }}>
        <PageHead
          eyebrow="Good Order · Est. MMXXIV"
          title="Command Board"
          sub="Muster, orders and dispatches for the week."
        />
        <div className="grid-4" style={{ gap: 12, marginTop: 18 }}>
          <StatTile label="Muster strength" value="84" foot="+3 this month" />
          <StatTile label="Events attended" value="27" foot="Of 31 called" />
          <StatTile label="Applications" value="7" foot="Awaiting review" />
          <StatTile label="Commendations" value="4" foot="Last awarded Oct" />
        </div>
        <div style={{ marginTop: 24 }}>
          <SectionHead title="Upcoming Orders" />
        </div>
        <div className="panel" style={{ marginTop: 12 }}>
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
      </div>
    </AppShell>
  </Frame>
);

export const RosterPage = () => (
  <Frame>
    <AppShell
      active="roster"
      crumbs={['Regiment', 'Members']}
      user={{ name: 'Aldous Kerr', rank: 'Sergeant' }}
    >
      <div className="page" style={{ padding: '22px 26px' }}>
        <PageHead title="Members" sub="84 souls on the muster roll." />
        <div className="panel" style={{ marginTop: 16 }}>
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
                ['Cassius Vale', 'Corporal', '02 Feb 2025'],
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
      </div>
    </AppShell>
  </Frame>
);
