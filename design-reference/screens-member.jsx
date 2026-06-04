/* eslint-disable */
// Holdfast — Member-facing app screens
const { useState: useMem } = React;

// ───────── Member Dashboard ─────────
function MemberDashboard() {
  return (
    <AppShell active="home" crumbs={["Command Board"]}
      topActions={<button className="btn primary sm"><Icons.Plus style={{ width: 14, height: 14 }}/>RSVP Next Event</button>}>
      <div className="page">
        <PageHead
          eyebrow="Morning Roll · 22 May, 0800 GMT"
          title={<span>Stand by, Lieutenant Nolt.</span>}
          sub="Three events on the schedule this week. One application awaiting your review."
        />

        {/* Honors strip */}
        <div className="panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', alignItems: 'stretch', marginBottom: 22 }}>
          <div style={{ padding: 18, borderRight: '1px solid var(--rule)' }}>
            <div className="admin-label">Current Rank</div>
            <div className="row" style={{ gap: 12, marginTop: 8 }}>
              <Chevrons n={2}/>
              <div>
                <div className="serif-display" style={{ fontSize: 22, color: 'var(--t-100)' }}>Lieutenant</div>
                <div style={{ fontSize: 11.5, color: 'var(--t-400)' }}>Awarded 14 March · by Col. Holcombe</div>
              </div>
            </div>
          </div>
          <div style={{ padding: 18, borderRight: '1px solid var(--rule)' }}>
            <div className="row between">
              <div className="admin-label">Medals · 4 awarded</div>
              <span style={{ fontSize: 11, color: 'var(--t-400)' }}>See all</span>
            </div>
            <div className="row" style={{ gap: 16, marginTop: 10 }}>
              <Medal ribbon="blue" letter="L"/>
              <Medal ribbon="red" letter="V"/>
              <Medal ribbon="gold" letter="★"/>
              <Medal ribbon="green" letter="D"/>
              <div style={{ marginLeft: 10, color: 'var(--t-400)', fontSize: 12 }}>Linebattle · Valor · Marksman · Drill Master</div>
            </div>
          </div>
          <div style={{ padding: 18 }}>
            <div className="admin-label">Standing</div>
            <div className="serif-display" style={{ fontSize: 22, color: 'var(--t-100)', marginTop: 6 }}>Good Order</div>
            <div className="row" style={{ gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 11.5, color: 'var(--t-400)' }}>23 events · 88% attendance</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
          {/* Left col */}
          <div className="col" style={{ gap: 22 }}>
            {/* Upcoming */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Upcoming Orders</span>
                <span className="row" style={{ gap: 10 }}>
                  <span className="badge brass">3 events</span>
                  <button className="btn ghost sm">All events <Icons.ChevR style={{ width: 12, height: 12 }}/></button>
                </span>
              </div>
              <div>
                {[
                  { d: 'Sat 31 May', t: '20:00', title: 'Linebattle: Coastal Advance', server: 'EU 4', plats: ['steam','xbox'], rsvp: 'Interested' },
                  { d: 'Wed 04 Jun', t: '19:30', title: 'Drill Night — Volley & Square', server: 'Lords Drill', plats: ['steam'], rsvp: 'Tentative' },
                  { d: 'Sat 07 Jun', t: '20:00', title: 'Campaign III · Fort Halen', server: 'EU 1', plats: ['steam','xbox','ps'], rsvp: null },
                ].map((e, i, a) => (
                  <div key={i} style={{ padding: '14px 16px', borderBottom: i < a.length - 1 ? '1px solid var(--rule)' : 'none', display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 16, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--rule-2)', paddingRight: 8 }}>
                      <div className="admin-label brass" style={{ fontSize: 9 }}>{e.d.split(' ')[0]}</div>
                      <div className="serif-display" style={{ fontSize: 18, color: 'var(--t-100)' }}>{e.d.split(' ')[1]}</div>
                      <div style={{ fontSize: 9.5, color: 'var(--t-400)' }}>{e.d.split(' ')[2]}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--t-100)', fontWeight: 500 }}>{e.title}</div>
                      <div className="row" style={{ gap: 8, marginTop: 4, fontSize: 11.5, color: 'var(--t-400)' }}>
                        <Icons.Clock style={{ width: 11, height: 11 }}/>{e.t} GMT
                        <span>·</span>{e.server}
                        <span>·</span><PlatformBadges platforms={e.plats}/>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      {e.rsvp ? (
                        <span className={"badge " + (e.rsvp === 'Interested' ? 'laurel dot' : 'brass dot')}>{e.rsvp}</span>
                      ) : (
                        <button className="btn primary sm">RSVP</button>
                      )}
                      <button className="btn ghost sm icon"><Icons.ChevR style={{ width: 13, height: 13 }}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gallery approvals */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Recent Approvals</span>
                <span style={{ fontSize: 11.5, color: 'var(--t-400)' }}>Your dispatches, cleared by moderators</span>
              </div>
              <div className="panel-body grid-3" style={{ gap: 12 }}>
                {[
                  { bg: 'assets/bg-1.jpg', t: 'Storming the redoubt', l: 18 },
                  { bg: 'assets/bg-2.jpg', t: 'Square forms under cavalry', l: 41 },
                  { bg: 'assets/banner.png', t: 'Volley at dusk', l: 12 },
                ].map((g, i) => (
                  <div key={i} style={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--rule-2)', position: 'relative' }}>
                    <div style={{ aspectRatio: '4/3', background: `url(${g.bg}) center/cover` }}/>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(11,14,20,.92))' }}/>
                    <div style={{ position: 'absolute', left: 10, right: 10, bottom: 8 }}>
                      <div style={{ fontSize: 11.5, color: 'var(--t-100)', fontWeight: 500 }}>{g.t}</div>
                      <div className="row between" style={{ marginTop: 4, fontSize: 10.5, color: 'var(--t-400)' }}>
                        <span>Approved 3d ago</span>
                        <span className="row" style={{ gap: 3, color: 'var(--oxblood-300)' }}><Icons.Heart style={{ width: 10, height: 10 }}/>{g.l}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="col" style={{ gap: 22 }}>
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Field Dispatches</span>
                <span className="badge laurel dot">3 new</span>
              </div>
              <div className="panel-body col" style={{ gap: 12 }}>
                {[
                  { t: 'Drill cancelled — Wednesday', b: 'Field is waterlogged. Reconvening Sunday at 19:00 GMT.', a: 'Col. Holcombe · 1h', tone: 'warn' },
                  { t: 'New rank: Color Sergeant', b: 'Pvt. Calder is promoted following Fort Halen.', a: 'Maj. Vasquez · 6h', tone: 'ok' },
                  { t: 'Discord role sync ran successfully', b: '4 rank changes, 2 medal awards applied.', a: 'Quartermaster bot · 1d', tone: 'info' },
                ].map((n, i) => (
                  <div key={i} className={"notice " + n.tone} style={{ background: 'transparent', borderLeftWidth: 3 }}>
                    <div>
                      <div className="n-title">{n.t}</div>
                      <div className="n-body">{n.b}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--t-500)', marginTop: 6 }}>{n.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Awaiting Review</span>
                <button className="btn ghost sm">Open queue</button>
              </div>
              <div className="panel-body col" style={{ gap: 10 }}>
                {[
                  { n: 'M. Erskine', tag: '@erskine', t: 'Applicant · 2h' },
                  { n: 'K. Soto',    tag: '@kasoto',   t: 'Mercenary · 6h' },
                  { n: 'B. Trager',  tag: '@btrager',  t: 'Applicant · 1d' },
                ].map((a, i) => (
                  <div key={i} className="row between" style={{ paddingBottom: 8, borderBottom: i < 2 ? '1px solid var(--rule)' : 'none' }}>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={a.n} size={28}/>
                      <div>
                        <div style={{ fontSize: 12.5, color: 'var(--t-100)' }}>{a.n}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--t-400)' }}>{a.tag} · {a.t}</div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 4 }}>
                      <button className="btn ghost sm icon" title="Approve"><Icons.Check style={{ width: 12, height: 12, color: 'var(--ok)' }}/></button>
                      <button className="btn ghost sm icon" title="Decline"><Icons.X style={{ width: 12, height: 12, color: 'var(--err)' }}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel" style={{ padding: 18, background: 'rgba(43,62,85,.18)', borderColor: 'var(--regblue-700)' }}>
              <Icons.Discord style={{ width: 22, height: 22, color: '#7f8df4' }}/>
              <div className="serif-display" style={{ fontSize: 16, color: 'var(--t-100)', marginTop: 8 }}>Quartermaster · All quiet</div>
              <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 4, lineHeight: 1.5 }}>Synced 6 minutes ago · 84 members verified · 0 conflicts</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Members Roster ─────────
function MembersRoster() {
  const members = [
    { n: 'Alistair Holcombe', tag: '@a.holcombe',  rank: 'Colonel',          chev: 5, medals: ['blue','red','gold','green'], role: 'Owner',    discord: true,  status: 'Active',   last: '8m ago' },
    { n: 'Diego Vasquez',     tag: '@dvasquez',    rank: 'Major',            chev: 4, medals: ['blue','red','gold'],         role: 'Admin',    discord: true,  status: 'Active',   last: '2h ago' },
    { n: 'Rhett Asher',       tag: '@rasher',      rank: 'Captain',          chev: 3, medals: ['blue','red'],                role: 'Admin',    discord: true,  status: 'Active',   last: '1h ago' },
    { n: 'Jameson Nolt',      tag: '@jnolt',       rank: 'Lieutenant',       chev: 2, medals: ['blue','red','gold','green'], role: 'Moderator',discord: true,  status: 'Active',   last: 'Just now' },
    { n: 'Sade Wren',         tag: '@swren',       rank: 'Sergeant',         chev: 2, medals: ['blue','green'],              role: 'Moderator',discord: true,  status: 'Active',   last: '4h ago' },
    { n: 'Mara Erskine',      tag: '@erskine',     rank: 'Corporal',         chev: 1, medals: ['blue'],                      role: 'Member',   discord: true,  status: 'Active',   last: '7h ago' },
    { n: 'Bjorn Trager',      tag: '@btrager',     rank: 'Private',          chev: 0, medals: ['blue','green'],              role: 'Member',   discord: true,  status: 'Active',   last: '1d ago' },
    { n: 'Petra Calder',      tag: '@calder',      rank: 'Private',          chev: 0, medals: ['blue'],                      role: 'Member',   discord: true,  status: 'Inactive', last: '14d ago' },
    { n: 'Konstantin Soto',   tag: '@kasoto',      rank: 'Mercenary',        chev: 0, medals: [],                            role: 'Mercenary',discord: true,  status: 'Active',   last: '6h ago' },
    { n: 'Yusuf Bey',         tag: '@ybey',        rank: 'Applicant',        chev: 0, medals: [],                            role: 'Applicant',discord: false, status: 'Pending',  last: '—' },
  ];
  return (
    <AppShell active="roster" crumbs={["Regiment", "Members"]}>
      <div className="page">
        <PageHead
          eyebrow="Roll Call"
          title="Regimental Roster"
          sub="84 members · 6 officers · 2 applicants awaiting trial drill"
          actions={<>
            <button className="btn ghost"><Icons.Filter style={{ width: 14, height: 14 }}/>Filters</button>
            <button className="btn secondary"><Icons.Doc style={{ width: 14, height: 14 }}/>Export Ledger</button>
            <button className="btn primary"><Icons.Plus style={{ width: 14, height: 14 }}/>Invite Mercenary</button>
          </>}
        />

        {/* Filter row */}
        <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="input-wrap" style={{ width: 280 }}>
            <Icons.Search style={{ width: 13, height: 13 }}/>
            <input className="input has-icon" placeholder="Search name, Discord tag, in-game…" style={{ height: 32, fontSize: 12.5 }}/>
          </div>
          <select className="select" style={{ width: 140, height: 32, fontSize: 12.5 }}><option>Any rank</option></select>
          <select className="select" style={{ width: 140, height: 32, fontSize: 12.5 }}><option>Any role</option></select>
          <select className="select" style={{ width: 140, height: 32, fontSize: 12.5 }}><option>Any medal</option></select>
          <select className="select" style={{ width: 140, height: 32, fontSize: 12.5 }}><option>Activity: any</option></select>
          <span className="sp"/>
          <span style={{ fontSize: 11.5, color: 'var(--t-400)' }}>Showing 10 of 84</span>
        </div>

        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 28 }}><span className="check"/></th>
                <th>Member</th>
                <th>Rank</th>
                <th>Medals</th>
                <th>Role</th>
                <th>Discord</th>
                <th>Status</th>
                <th>Last seen</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i}>
                  <td><span className="check"/></td>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={m.n} size={32} online={m.discord && m.status === 'Active'}/>
                      <div>
                        <div style={{ color: 'var(--t-100)', fontWeight: 500, fontSize: 13 }}>{m.n}</div>
                        <div style={{ color: 'var(--t-400)', fontSize: 11.5 }}>{m.tag}</div>
                      </div>
                    </div>
                  </td>
                  <td><div className="row" style={{ gap: 6 }}>{m.chev > 0 && <Chevrons n={m.chev}/>}<span>{m.rank}</span></div></td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {m.medals.slice(0, 4).map((c, j) => (
                        <span key={j} style={{ width: 16, height: 16, borderRadius: 999,
                          background: c === 'blue' ? 'var(--regblue-500)' : c === 'red' ? 'var(--oxblood-500)' : c === 'gold' ? 'var(--brass-500)' : 'var(--laurel-500)',
                          border: '1px solid rgba(0,0,0,.4)' }}/>
                      ))}
                      {m.medals.length === 0 && <span style={{ color: 'var(--t-500)', fontSize: 11 }}>—</span>}
                    </div>
                  </td>
                  <td>
                    <span className={"badge " +
                      (m.role === 'Owner' ? 'brass' :
                       m.role === 'Admin' ? 'ox' :
                       m.role === 'Moderator' ? 'blue' :
                       m.role === 'Mercenary' ? 'parch' :
                       m.role === 'Applicant' ? '' : 'laurel')}>
                      {m.role}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6, fontSize: 12, color: 'var(--t-300)' }}>
                      <span className={"status-dot " + (m.discord ? 'discord-on' : 'discord-off')}/>
                      {m.discord ? 'Linked' : 'Missing'}
                    </div>
                  </td>
                  <td>
                    <span className={"badge " + (m.status === 'Active' ? 'laurel dot' : m.status === 'Inactive' ? 'dot' : 'brass dot')}>{m.status}</span>
                  </td>
                  <td style={{ color: 'var(--t-400)', fontSize: 12 }}>{m.last}</td>
                  <td><button className="btn ghost sm icon"><Icons.Dots style={{ width: 14, height: 14 }}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row between" style={{ marginTop: 14, color: 'var(--t-400)', fontSize: 12 }}>
          <span>10 of 84 ranks displayed</span>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm icon"><Icons.ChevL style={{ width: 12, height: 12 }}/></button>
            <span style={{ padding: '0 8px' }}>Page 1 of 9</span>
            <button className="btn ghost sm icon"><Icons.ChevR style={{ width: 12, height: 12 }}/></button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Member Profile ─────────
function MemberProfile() {
  return (
    <AppShell active="profile" crumbs={["Regiment", "Members", "Jameson Nolt"]}>
      <div>
        {/* Banner */}
        <div style={{ height: 200, position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--rule)' }}>
          <img src="assets/banner.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.5) saturate(.7)' }}/>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,14,20,.2), var(--ink-900) 95%)' }}/>
        </div>

        <div className="page" style={{ marginTop: -90, position: 'relative' }}>
          <div className="row" style={{ gap: 22, alignItems: 'flex-end' }}>
            <div style={{
              width: 124, height: 124, borderRadius: 4,
              border: '2px solid var(--brass-500)',
              background: 'oklch(0.32 0.04 220)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 48, color: 'var(--brass-100)', fontWeight: 600,
              boxShadow: '0 12px 32px -16px rgba(0,0,0,.8)',
            }}>JN</div>
            <div style={{ flex: 1, paddingBottom: 14 }}>
              <div className="admin-label brass">Officer · Joined March 14</div>
              <div className="row" style={{ gap: 14, marginTop: 4 }}>
                <h1 className="serif-display" style={{ fontSize: 36, color: 'var(--t-100)' }}>Jameson Nolt</h1>
                <span className="badge blue">@jnolt</span>
                <span className="badge laurel dot">Active</span>
              </div>
              <div className="row" style={{ gap: 18, marginTop: 6, color: 'var(--t-400)', fontSize: 13 }}>
                <span className="row" style={{ gap: 6 }}><Chevrons n={2}/>Lieutenant</span>
                <span>·</span>
                <span>Moderator</span>
                <span>·</span>
                <span className="row" style={{ gap: 6 }}><span className="status-dot discord-on"/>Discord linked</span>
              </div>
            </div>
            <div className="row" style={{ gap: 10, paddingBottom: 14 }}>
              <button className="btn ghost"><Icons.Discord style={{ width: 14, height: 14 }}/>Send DM</button>
              <button className="btn secondary"><Icons.Doc style={{ width: 14, height: 14 }}/>Service Record</button>
              <button className="btn ghost icon"><Icons.Dots style={{ width: 16, height: 16 }}/></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 28, marginTop: 32 }}>
            {/* Left: identity */}
            <div className="col" style={{ gap: 18 }}>
              <div className="panel">
                <div className="panel-header"><span className="panel-title">Honors</span><span className="badge brass">4</span></div>
                <div className="panel-body col" style={{ gap: 12 }}>
                  {[
                    { r: 'blue',  l: 'L', t: 'Linebattle Veteran',   d: '18 events fielded' },
                    { r: 'red',   l: 'V', t: 'Valor on the Line',    d: 'Held the standard at Pyrenees' },
                    { r: 'gold',  l: '★', t: 'Marksman, First Class',d: 'Top 5% accuracy, 3 events' },
                    { r: 'green', l: 'D', t: 'Drill Master',         d: 'Led 24 drill sessions' },
                  ].map((m, i) => (
                    <div key={i} className="row" style={{ gap: 12, paddingBottom: i < 3 ? 12 : 0, borderBottom: i < 3 ? '1px solid var(--rule)' : 'none' }}>
                      <Medal ribbon={m.r} letter={m.l}/>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--t-100)', fontWeight: 500 }}>{m.t}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--t-400)', marginTop: 2 }}>{m.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header"><span className="panel-title">Particulars</span></div>
                <div className="panel-body col" style={{ gap: 10, fontSize: 13 }}>
                  {[
                    ['In-game name', 'JNolt_Lord'],
                    ['Time zone', 'GMT (Western Europe)'],
                    ['Platform', 'Steam'],
                    ['Visibility', <span className="row" style={{ gap: 8 }}><span className="toggle on"/><span>Public profile</span></span>],
                    ['Discord', '@jnolt#0001'],
                  ].map(([k, v], i) => (
                    <div key={i} className="row between">
                      <span className="admin-label" style={{ fontSize: 10 }}>{k}</span>
                      <span style={{ color: 'var(--t-200)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin-only — last login */}
              <div className="panel" style={{ borderColor: 'var(--oxblood-700)', background: 'rgba(166,77,68,.05)' }}>
                <div className="panel-header"><span className="panel-title">Command Information</span><span className="badge ox">Admin only</span></div>
                <div className="panel-body col" style={{ gap: 10, fontSize: 12.5 }}>
                  <div className="row between"><span className="admin-label" style={{ fontSize: 10 }}>Last sign-in</span><span style={{ color: 'var(--t-200)' }}>Today, 07:48 GMT</span></div>
                  <div className="row between"><span className="admin-label" style={{ fontSize: 10 }}>Sign-in IP</span><span className="mono" style={{ color: 'var(--t-400)' }}>176.×××.×××.221</span></div>
                  <div className="row between"><span className="admin-label" style={{ fontSize: 10 }}>Account age</span><span style={{ color: 'var(--t-200)' }}>69 days</span></div>
                  <div className="divider" style={{ margin: '6px 0' }}/>
                  <button className="btn ghost sm" style={{ justifyContent: 'flex-start' }}>View 23 actions in audit ledger →</button>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="col" style={{ gap: 18 }}>
              <div className="tabs" style={{ marginBottom: 0 }}>
                <span className="tab active">Approved Gallery · 12</span>
                <span className="tab">Tagged in · 31</span>
                <span className="tab">Event History</span>
                <span className="tab">RSVPs</span>
              </div>
              <div className="grid-3" style={{ gap: 12 }}>
                {[
                  { bg: 'assets/bg-1.jpg', t: 'Storming the breach', l: 28 },
                  { bg: 'assets/bg-2.jpg', t: 'Volley at Fort Halen', l: 41 },
                  { bg: 'assets/banner.png', t: 'Drill at dawn', l: 15 },
                  { bg: 'assets/bg-2.jpg', t: 'Square under cavalry', l: 56 },
                  { bg: 'assets/bg-1.jpg', t: 'Color party', l: 12 },
                  { bg: 'assets/banner.png', t: 'Bayonet charge', l: 33 },
                ].map((g, i) => (
                  <div key={i} className="panel" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
                    <div style={{ aspectRatio: '4/3', background: `url(${g.bg}) center/cover` }}/>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(11,14,20,.92))' }}/>
                    <div style={{ position: 'absolute', left: 10, right: 10, bottom: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--t-100)', fontWeight: 500 }}>{g.t}</div>
                      <div className="row between" style={{ marginTop: 4, fontSize: 10.5, color: 'var(--t-400)' }}>
                        <span>2 weeks ago</span>
                        <span className="row" style={{ gap: 3, color: 'var(--oxblood-300)' }}><Icons.Heart style={{ width: 10, height: 10 }}/>{g.l}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <SectionHead title="Service Record" right={<span style={{ fontSize: 11.5, color: 'var(--t-400)' }}>69 days, 23 events</span>}/>
              <div className="panel" style={{ padding: 0 }}>
                {[
                  { d: '14 Mar', e: 'Enlisted as Private', note: 'Application approved by Lt. Holcombe' },
                  { d: '02 Apr', e: 'Awarded Linebattle Veteran medal', note: '10 events reached' },
                  { d: '17 Apr', e: 'Promoted to Corporal', note: 'By Maj. Vasquez' },
                  { d: '08 May', e: 'Promoted to Sergeant', note: 'By Maj. Vasquez' },
                  { d: '14 May', e: 'Promoted to Lieutenant', note: 'By Col. Holcombe' },
                  { d: '14 May', e: 'Awarded Valor on the Line', note: 'Standard held at Pyrenees Pass' },
                  { d: '17 May', e: 'Granted Moderator role', note: 'Discord role synced' },
                ].map((r, i, a) => (
                  <div key={i} className="row" style={{ padding: '11px 16px', gap: 16, borderBottom: i < a.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                    <div className="archive-label" style={{ minWidth: 70, justifyContent: 'center', background: 'var(--ink-700)', color: 'var(--t-300)', border: '1px solid var(--rule-3)' }}>{r.d}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--t-100)' }}>{r.e}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--t-400)', marginTop: 2 }}>{r.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Admin Action Modal ─────────
function AdminActionModal({ standalone }) {
  const Wrap = standalone ? 'div' : Fragment;
  const wrapProps = standalone ? { style: { position: 'relative', height: '100%', background: 'var(--ink-900)' } } : {};
  return (
    <Wrap {...wrapProps}>
      {/* faded backdrop showing context */}
      {standalone && (
        <div style={{ position: 'absolute', inset: 0, padding: 24, opacity: .35, pointerEvents: 'none', filter: 'blur(2px)' }}>
          <div className="panel" style={{ height: '100%' }}>
            <div className="panel-header"><span className="panel-title">Regimental Roster</span></div>
            <div className="panel-body" style={{ background: 'var(--ink-850)' }}>{' '}</div>
          </div>
        </div>
      )}
      <div style={{
        position: standalone ? 'absolute' : 'static', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: standalone ? 'rgba(11,14,20,.7)' : 'transparent',
      }}>
        <div className="panel" style={{ width: 480, background: 'var(--ink-800)', boxShadow: '0 24px 80px -20px rgba(0,0,0,.8), 0 0 0 1px var(--rule-2)' }}>
          <div className="panel-header" style={{ padding: '14px 18px' }}>
            <div className="row" style={{ gap: 12 }}>
              <Avatar name="Bjorn Trager" size={32}/>
              <div>
                <div className="serif-display" style={{ fontSize: 16, color: 'var(--t-100)' }}>Bjorn Trager</div>
                <div style={{ fontSize: 11, color: 'var(--t-400)' }}>@btrager · Private · Member since 2 Apr</div>
              </div>
            </div>
            <button className="btn ghost sm icon"><Icons.X style={{ width: 14, height: 14 }}/></button>
          </div>

          <div className="panel-body" style={{ padding: 0 }}>
            <div className="admin-label" style={{ padding: '12px 18px 6px' }}>Information</div>
            {[
              { Ic: Icons.Clock, l: 'View last sign-in', sub: 'Today, 14:22 GMT · 176.×××.×××.91' },
              { Ic: Icons.Audit, l: 'View audit history for this user', sub: '23 actions in ledger' },
            ].map((a, i) => (
              <div key={i} className="row" style={{ padding: '10px 18px', gap: 12, cursor: 'pointer', borderBottom: '1px solid var(--rule)' }}
                   onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ink-700)'}
                   onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <a.Ic style={{ width: 16, height: 16, color: 'var(--t-300)' }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--t-100)' }}>{a.l}</div>
                  <div style={{ fontSize: 11, color: 'var(--t-400)' }}>{a.sub}</div>
                </div>
                <Icons.ChevR style={{ width: 13, height: 13, color: 'var(--t-500)' }}/>
              </div>
            ))}

            <div className="admin-label" style={{ padding: '12px 18px 6px' }}>Rank & Honors</div>
            {[
              { Ic: Icons.Ranks, l: 'Change rank', sub: 'Current: Private' },
              { Ic: Icons.Shield, l: 'Award medal' },
              { Ic: Icons.X, l: 'Remove medal' },
              { Ic: Icons.Flag, l: 'Change role', sub: 'Current: Member' },
            ].map((a, i) => (
              <div key={i} className="row" style={{ padding: '10px 18px', gap: 12, cursor: 'pointer', borderBottom: '1px solid var(--rule)' }}>
                <a.Ic style={{ width: 16, height: 16, color: 'var(--t-300)' }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--t-100)' }}>{a.l}</div>
                  {a.sub && <div style={{ fontSize: 11, color: 'var(--t-400)' }}>{a.sub}</div>}
                </div>
                <Icons.ChevR style={{ width: 13, height: 13, color: 'var(--t-500)' }}/>
              </div>
            ))}

            <div className="admin-label" style={{ padding: '12px 18px 6px', color: 'var(--oxblood-300)' }}>Disciplinary</div>
            {[
              { Ic: Icons.Ban, l: 'Suspend temporarily', sub: 'Choose 24h, 7d, or 30d' },
              { Ic: Icons.Ban, l: 'Ban permanently', sub: 'Requires confirmation', danger: true },
            ].map((a, i) => (
              <div key={i} className="row" style={{ padding: '10px 18px', gap: 12, cursor: 'pointer', borderBottom: i === 0 ? '1px solid var(--rule)' : 'none' }}>
                <a.Ic style={{ width: 16, height: 16, color: a.danger ? 'var(--oxblood-300)' : 'var(--t-300)' }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: a.danger ? 'var(--oxblood-300)' : 'var(--t-100)' }}>{a.l}</div>
                  {a.sub && <div style={{ fontSize: 11, color: 'var(--t-400)' }}>{a.sub}</div>}
                </div>
                <Icons.ChevR style={{ width: 13, height: 13, color: 'var(--t-500)' }}/>
              </div>
            ))}
          </div>

          <div className="row between" style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)', background: 'var(--ink-850)' }}>
            <span style={{ fontSize: 11, color: 'var(--t-500)' }}>All actions are recorded to the audit ledger.</span>
            <button className="btn ghost sm">Close</button>
          </div>
        </div>
      </div>
    </Wrap>
  );
}

Object.assign(window, { MemberDashboard, MembersRoster, MemberProfile, AdminActionModal });
