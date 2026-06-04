/* eslint-disable */
// Holdfast — Public-facing screens: Landing, Events, Gallery, Login
const { useState: usePub } = React;

// ───────── Public chrome (top nav) ─────────
function PublicNav({ active = "home", onNav }) {
  const items = ['Home','Events','Gallery','Officers','Charter'];
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '14px 28px',
      borderBottom: '1px solid var(--rule)',
      background: 'rgba(11,14,20,0.85)',
      backdropFilter: 'blur(6px)',
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div className="row" style={{ gap: 12 }}>
        <Crest size={34}/>
        <div>
          <div className="serif" style={{ fontSize: 17, color: 'var(--brass-300)', lineHeight: 1.05, fontWeight: 600 }}>Lord Regiment</div>
          <div className="admin-label" style={{ fontSize: 9, marginTop: 1 }}>Holdfast · Nations at War</div>
        </div>
      </div>
      <div className="row" style={{ marginLeft: 36, gap: 4 }}>
        {items.map(it => (
          <span key={it}
            onClick={() => onNav?.(it.toLowerCase())}
            style={{
              padding: '8px 12px', fontSize: 13.5, cursor: 'pointer',
              color: (active === it.toLowerCase()) ? 'var(--brass-300)' : 'var(--t-300)',
              borderBottom: (active === it.toLowerCase()) ? '2px solid var(--brass-400)' : '2px solid transparent',
              letterSpacing: '.02em',
            }}>{it}</span>
        ))}
      </div>
      <div className="sp"/>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost sm"><Icons.Discord style={{ width: 14, height: 14 }}/> Join Discord</button>
        <DiscordBtn>Sign in</DiscordBtn>
      </div>
    </nav>
  );
}

// ───────── Public Landing ─────────
function PublicLanding() {
  return (
    <div className="app-root grain" style={{ minHeight: '100%', background: 'var(--ink-900)' }}>
      <PublicNav active="home"/>

      {/* HERO */}
      <section style={{ position: 'relative', height: 520, overflow: 'hidden' }}>
        <img src="assets/bg-1.jpg" alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          filter: 'brightness(.42) saturate(.7)'
        }}/>
        <div style={{
          position: 'absolute', inset: 0,
          background:
            'radial-gradient(80% 70% at 20% 30%, rgba(11,14,20,0) 0%, var(--ink-900) 75%),' +
            'linear-gradient(180deg, rgba(11,14,20,.45), rgba(11,14,20,.92))',
        }}/>
        <div style={{ position: 'relative', padding: '90px 56px', maxWidth: 760 }}>
          <div className="row" style={{ gap: 12, marginBottom: 22 }}>
            <Crest size={56}/>
            <div>
              <div className="admin-label brass">Field Order № 014 · Posted 22 May</div>
              <div style={{ color: 'var(--t-300)', fontSize: 13, marginTop: 6 }}>Officers' noticeboard · Open to the public</div>
            </div>
          </div>
          <h1 className="serif" style={{ fontSize: 64, lineHeight: 1.02, color: 'var(--t-100)', fontWeight: 600, margin: 0, letterSpacing: '.005em' }}>
            The Lord Regiment.<br/>
            <span style={{ color: 'var(--brass-300)', fontStyle: 'italic' }}>Discipline, not spectacle.</span>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--t-300)', marginTop: 22, maxWidth: 580 }}>
            A line-infantry company in Holdfast: Nations at War. We drill three nights a week,
            field 30–60 muskets on event nights, and conduct ourselves like men who intend to
            still be standing at the end of the line.
          </p>
          <div className="row" style={{ gap: 12, marginTop: 28 }}>
            <DiscordBtn size="lg">Sign in with Discord</DiscordBtn>
            <button className="btn ghost lg">View Charter <Icons.Arrow style={{ width: 14, height: 14 }}/></button>
          </div>

          <div className="row" style={{ gap: 28, marginTop: 36, color: 'var(--t-400)', fontSize: 12.5 }}>
            <div><span className="serif-display" style={{ color: 'var(--t-100)', fontSize: 22, marginRight: 8 }}>84</span> active members</div>
            <div><span className="serif-display" style={{ color: 'var(--t-100)', fontSize: 22, marginRight: 8 }}>312</span> events fielded</div>
            <div><span className="serif-display" style={{ color: 'var(--t-100)', fontSize: 22, marginRight: 8 }}>11</span> campaigns won</div>
          </div>
        </div>
      </section>

      <div style={{ padding: '40px 56px 64px', maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
        {/* Upcoming events */}
        <div>
          <CrestDivider>Upcoming Orders</CrestDivider>
          <div className="col" style={{ gap: 12, marginTop: 18 }}>
            {[
              { date: 'Sat 31 May', time: '20:00 GMT', title: 'Linebattle: Coastal Advance', server: 'EU · Holdfast Official 4', platforms: ['steam','xbox'] },
              { date: 'Wed 04 Jun', time: '19:30 GMT', title: 'Drill Night — Volley & Square', server: 'Private · Lords Drill', platforms: ['steam'] },
              { date: 'Sat 07 Jun', time: '20:00 GMT', title: 'Campaign III · Battle of Fort Halen', server: 'EU · Holdfast Official 1', platforms: ['steam','xbox','ps'] },
            ].map((e, i) => (
              <div key={i} className="panel" style={{ display: 'grid', gridTemplateColumns: '74px 1fr auto', alignItems: 'center', padding: 14, gap: 16 }}>
                <div style={{ borderRight: '1px solid var(--rule-2)', paddingRight: 14, textAlign: 'center' }}>
                  <div className="admin-label brass" style={{ fontSize: 9.5 }}>{e.date.split(' ')[0]}</div>
                  <div className="serif-display" style={{ fontSize: 22, color: 'var(--t-100)', lineHeight: 1.1 }}>{e.date.split(' ')[1]}</div>
                  <div style={{ fontSize: 10, color: 'var(--t-400)' }}>{e.date.split(' ')[2]}</div>
                </div>
                <div>
                  <div className="serif-display" style={{ fontSize: 17, color: 'var(--t-100)' }}>{e.title}</div>
                  <div className="row" style={{ gap: 10, marginTop: 6 }}>
                    <span className="row" style={{ gap: 4, color: 'var(--t-400)', fontSize: 12 }}><Icons.Clock style={{ width: 12, height: 12 }}/>{e.time}</span>
                    <span style={{ color: 'var(--t-500)' }}>·</span>
                    <span style={{ color: 'var(--t-400)', fontSize: 12 }}>{e.server}</span>
                  </div>
                </div>
                <div className="col" style={{ alignItems: 'flex-end', gap: 8 }}>
                  <PlatformBadges platforms={e.platforms}/>
                  <button className="btn ghost sm">Details</button>
                </div>
              </div>
            ))}
          </div>

          <CrestDivider>From the Gallery</CrestDivider>
          <div className="grid-3" style={{ marginTop: 18, gap: 10 }}>
            {[
              { bg: 'assets/bg-1.jpg', t: 'The line holds — Fort Halen', a: 'Cpt. Asher' },
              { bg: 'assets/bg-2.jpg', t: 'Storming the redoubt', a: 'Lt. Nolt' },
              { bg: 'assets/banner.png', t: 'Volley at sunset', a: 'Sgt. Wren' },
            ].map((g, i) => (
              <div key={i} className="panel" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
                <div style={{ aspectRatio: '4/3', background: `url(${g.bg}) center/cover`, filter: 'saturate(.85)' }}/>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(11,14,20,.95) 100%)' }}/>
                <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
                  <div className="serif-display" style={{ fontSize: 14, color: 'var(--t-100)' }}>{g.t}</div>
                  <div className="row between" style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--t-400)' }}>{g.a}</span>
                    <span className="row" style={{ gap: 3, color: 'var(--oxblood-300)', fontSize: 11 }}>
                      <Icons.Heart style={{ width: 11, height: 11 }}/>{[24,18,31][i]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="col" style={{ gap: 22 }}>
          <div className="parchment" style={{ padding: 22, position: 'relative' }}>
            <div className="archive-label" style={{ position: 'absolute', top: -10, left: 18 }}>Charter · I.</div>
            <div className="serif" style={{ fontSize: 22, color: 'var(--parch-900)', fontWeight: 600, marginTop: 4 }}>
              We stand for steady fire, sober conduct, and a line that does not break.
            </div>
            <div style={{ height: 1, background: 'var(--parch-300)', margin: '14px 0' }}/>
            <p style={{ fontSize: 13.5, color: 'var(--t-on-parch-2)', lineHeight: 1.65, margin: 0 }}>
              Membership in the Lord Regiment is by application. We expect attendance at one drill
              per fortnight, a working microphone, and the patience to learn formation drill before
              taking a place in the line.
            </p>
            <div className="wax" style={{ position: 'absolute', right: 16, bottom: 16 }}>
              Lord<br/>Regt.
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span className="panel-title">Officers' Mess</span><span className="badge laurel dot">In Session</span></div>
            <div className="panel-body col" style={{ gap: 10 }}>
              {[
                { rank: 'Colonel', name: 'A. Holcombe', chev: 5 },
                { rank: 'Major',   name: 'D. Vasquez',  chev: 4 },
                { rank: 'Captain', name: 'R. Asher',    chev: 3 },
                { rank: 'Lt.',     name: 'J. Nolt',     chev: 2 },
              ].map((o, i) => (
                <div key={i} className="row between" style={{ borderBottom: i < 3 ? '1px solid var(--rule)' : 'none', paddingBottom: i < 3 ? 10 : 0 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={o.name} size={28}/>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--t-100)' }}>{o.name}</div>
                      <div className="admin-label" style={{ fontSize: 9.5 }}>{o.rank}</div>
                    </div>
                  </div>
                  <Chevrons n={o.chev}/>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: 18, background: 'var(--ink-850)', position: 'relative' }}>
            <Icons.Discord style={{ width: 24, height: 24, color: '#7f8df4', marginBottom: 10 }}/>
            <div className="serif" style={{ fontSize: 20, color: 'var(--t-100)', fontWeight: 600 }}>Step into the Drill Hall</div>
            <p style={{ fontSize: 13, color: 'var(--t-300)', lineHeight: 1.6, margin: '8px 0 14px' }}>
              All applications, RSVPs, and orders are coordinated through the regiment's Discord.
            </p>
            <button className="btn discord block"><Icons.Discord style={{ width: 14, height: 14 }}/>discord.gg/lord-regiment</button>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--rule)', padding: '20px 56px', background: 'var(--ink-850)' }}>
        <div className="row between" style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div className="row" style={{ gap: 10, color: 'var(--t-500)', fontSize: 12 }}>
            <Crest size={20}/>
            <span>Lord Regiment · Hosted on Holdfast Command, an open-source platform</span>
          </div>
          <div className="row" style={{ gap: 18, fontSize: 12, color: 'var(--t-400)' }}>
            <span>Privacy</span><span>GDPR</span><span>Self-host</span><span>v1.0.2</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ───────── Public Events ─────────
function PublicEvents() {
  return (
    <div className="app-root grain" style={{ minHeight: '100%' }}>
      <PublicNav active="events"/>
      <div style={{ padding: '32px 56px 56px', maxWidth: 1240, margin: '0 auto' }}>
        <PageHead
          eyebrow="Field Orders"
          title="Events & Orders"
          sub="Public dispatches. Server passwords are issued only to verified members."
          actions={<>
            <button className="btn ghost sm"><Icons.Filter style={{ width: 14, height: 14 }}/>Filters</button>
            <select className="select" style={{ width: 140, height: 32, fontSize: 12.5 }}><option>All platforms</option></select>
          </>}
        />

        {/* Ongoing pinned */}
        <div className="panel" style={{
          borderLeft: '3px solid var(--oxblood-400)',
          padding: 0, marginBottom: 24, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 180 }}>
            <div style={{ background: `url(assets/bg-2.jpg) center/cover`, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(11,14,20,.2), rgba(11,14,20,.9))' }}/>
              <div style={{ position: 'absolute', left: 14, top: 14 }}>
                <span className="badge ox dot">In Progress</span>
              </div>
            </div>
            <div style={{ padding: 22 }}>
              <div className="row" style={{ gap: 12 }}>
                <div className="admin-label brass">Now Fielding · 32 in line</div>
                <span style={{ color: 'var(--t-500)' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--t-400)' }}>Started 19:48 GMT</span>
              </div>
              <div className="serif-display" style={{ fontSize: 26, color: 'var(--t-100)', marginTop: 6 }}>
                Linebattle — French Riviera, 2nd Engagement
              </div>
              <div className="row" style={{ gap: 14, marginTop: 12, color: 'var(--t-300)', fontSize: 13 }}>
                <span className="row" style={{ gap: 6 }}><Icons.Flag style={{ width: 13, height: 13 }}/>EU · Holdfast Official 4</span>
                <span style={{ color: 'var(--t-500)' }}>·</span>
                <PlatformBadges platforms={['steam','xbox']}/>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--t-300)', lineHeight: 1.6, margin: '12px 0 14px', maxWidth: 600 }}>
                The line is forming up on the western beach. Officers in voice; muskets primed.
                Visitors may spectate via the public server — password is regiment-only.
              </p>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn primary">Sign in to view password</button>
                <button className="btn ghost">Watch on Twitch</button>
              </div>
            </div>
          </div>
        </div>

        <SectionHead title="Upcoming"/>
        <div className="col" style={{ gap: 10 }}>
          {[
            { d: 'Sat 31', m: 'May', t: '20:00 GMT', title: 'Linebattle: Coastal Advance', srv: 'EU · Holdfast Official 4', plats: ['steam','xbox'], recur: false, rsvp: 24 },
            { d: 'Wed 04', m: 'Jun', t: '19:30 GMT', title: 'Drill Night — Volley & Square', srv: 'Private · Lords Drill', plats: ['steam'], recur: 'Weekly', rsvp: 18 },
            { d: 'Sat 07', m: 'Jun', t: '20:00 GMT', title: 'Campaign III · Battle of Fort Halen', srv: 'EU · Holdfast Official 1', plats: ['steam','xbox','ps'], recur: false, rsvp: 41 },
            { d: 'Sun 08', m: 'Jun', t: '18:00 GMT', title: 'Recruit Trial — Open Audition', srv: 'Private · Lords Drill', plats: ['steam'], recur: 'Monthly', rsvp: 6 },
          ].map((e, i) => (
            <div key={i} className="panel" style={{ display: 'grid', gridTemplateColumns: '88px 1fr auto auto', alignItems: 'center', padding: 14, gap: 18 }}>
              <div style={{ textAlign: 'center', borderRight: '1px solid var(--rule-2)', paddingRight: 14 }}>
                <div className="admin-label brass" style={{ fontSize: 9.5 }}>{e.m}</div>
                <div className="serif-display" style={{ fontSize: 24, color: 'var(--t-100)', lineHeight: 1.1 }}>{e.d.split(' ')[1]}</div>
                <div style={{ fontSize: 10, color: 'var(--t-400)' }}>{e.d.split(' ')[0]}</div>
              </div>
              <div>
                <div className="serif-display" style={{ fontSize: 17, color: 'var(--t-100)' }}>{e.title}</div>
                <div className="row" style={{ gap: 10, marginTop: 6 }}>
                  <span className="row" style={{ gap: 4, color: 'var(--t-400)', fontSize: 12 }}><Icons.Clock style={{ width: 12, height: 12 }}/>{e.t}</span>
                  <span style={{ color: 'var(--t-500)' }}>·</span>
                  <span style={{ color: 'var(--t-400)', fontSize: 12 }}>{e.srv}</span>
                  {e.recur && <><span style={{ color: 'var(--t-500)' }}>·</span><span className="badge" style={{ fontSize: 9.5, padding: '1px 6px' }}><Icons.Reload style={{ width: 10, height: 10 }}/>{e.recur}</span></>}
                </div>
              </div>
              <PlatformBadges platforms={e.plats}/>
              <div className="row" style={{ gap: 10 }}>
                <div className="col" style={{ alignItems: 'flex-end', gap: 0 }}>
                  <div className="admin-label" style={{ fontSize: 9 }}>RSVPs</div>
                  <div className="serif-display" style={{ fontSize: 16, color: 'var(--brass-300)' }}>{e.rsvp}</div>
                </div>
                <button className="btn ghost sm">Details</button>
              </div>
            </div>
          ))}
        </div>

        <SectionHead title="Previous · Last 30 days"/>
        <div className="grid-2" style={{ gap: 10 }}>
          {[
            { d: '17 May', t: 'Linebattle — Pyrenees Pass', score: 'Held 7 of 9 rounds', plats: ['steam'] },
            { d: '10 May', t: 'Campaign II · Endgame', score: 'Victory, 11 standing', plats: ['steam','xbox'] },
            { d: '06 May', t: 'Drill — Bayonet Reform', score: 'Drilled 22 men', plats: ['steam'] },
            { d: '03 May', t: 'Pickup Skirmish — Skogur', score: '14 standing', plats: ['steam'] },
          ].map((e, i) => (
            <div key={i} className="panel" style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div className="archive-label" style={{ background: 'var(--ink-700)', color: 'var(--t-300)', border: '1px solid var(--rule-3)', flex: 'none' }}>{e.d}</div>
              <div style={{ flex: 1 }}>
                <div className="serif-display" style={{ fontSize: 14.5, color: 'var(--t-200)' }}>{e.t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--t-400)', marginTop: 3 }}>{e.score}</div>
              </div>
              <EventStatus state="prev"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────── Public Gallery ─────────
function PublicGallery() {
  const items = [
    { type: 'image', src: 'assets/bg-1.jpg', t: 'The line holds — Fort Halen', a: 'Cpt. Asher', l: 24, tags: ['linebattle','victory'] },
    { type: 'video', src: 'assets/bg-2.jpg', t: 'Bayonet charge across the redoubt', a: 'Lt. Nolt', l: 41, tags: ['campaign','clip'] },
    { type: 'image', src: 'assets/banner.png', t: 'Volley at dusk', a: 'Sgt. Wren', l: 18, tags: ['drill'] },
    { type: 'link',  src: 'assets/bg-2.jpg', t: 'Twitch VOD — Fort Halen, full match', a: 'Pvt. Calder', l: 9, tags: ['vod'] },
    { type: 'image', src: 'assets/bg-1.jpg', t: 'Officers’ mess, before drill', a: 'Sgt. Wren', l: 12, tags: ['portrait'] },
    { type: 'image', src: 'assets/banner.png', t: 'Color party, Sunday parade', a: 'Cpt. Asher', l: 31, tags: ['parade'] },
    { type: 'video', src: 'assets/bg-1.jpg', t: 'Square forms under cavalry charge', a: 'Maj. Vasquez', l: 56, tags: ['clip','campaign'] },
    { type: 'image', src: 'assets/bg-2.jpg', t: 'Storming the breach', a: 'Lt. Nolt', l: 28, tags: ['linebattle'] },
  ];
  const filters = ['All','Images','Videos','Links'];
  const tags = ['linebattle','campaign','drill','victory','portrait','vod','parade'];
  const [tab, setTab] = usePub('All');

  return (
    <div className="app-root grain" style={{ minHeight: '100%' }}>
      <PublicNav active="gallery"/>
      <div style={{ padding: '32px 56px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <PageHead
          eyebrow="Gallery Dispatches"
          title="The Regiment's Archive"
          sub="Approved photographs, clips, and dispatches submitted by members. Sign in to submit your own."
          actions={<DiscordBtn>Sign in to submit</DiscordBtn>}
        />

        <div className="row between" style={{ marginBottom: 18 }}>
          <div className="tabs" style={{ marginBottom: 0, border: 'none' }}>
            {filters.map(f => <div key={f} onClick={() => setTab(f)} className={"tab " + (tab === f ? 'active' : '')}>{f}</div>)}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', maxWidth: 600, justifyContent: 'flex-end' }}>
            {tags.map(t => <span key={t} className="badge" style={{ cursor: 'pointer' }}>#{t}</span>)}
          </div>
        </div>

        {/* Masonry-ish grid */}
        <div style={{ columnCount: 3, columnGap: 14 }}>
          {items.map((g, i) => (
            <div key={i} className="panel" style={{
              breakInside: 'avoid', marginBottom: 14, overflow: 'hidden', padding: 0, position: 'relative',
            }}>
              <div style={{
                aspectRatio: i % 3 === 1 ? '4/5' : (i % 4 === 0 ? '16/10' : '4/3'),
                background: `url(${g.src}) center/cover`, filter: 'saturate(.9)'
              }}/>
              {g.type === 'video' && (
                <div style={{
                  position: 'absolute', left: '50%', top: 'calc(50% - 30px)',
                  transform: 'translate(-50%, -50%)',
                  width: 48, height: 48, borderRadius: 999,
                  background: 'rgba(11,14,20,.7)', border: '1px solid var(--rule-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 0, height: 0, borderLeft: '12px solid var(--brass-300)', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', marginLeft: 3 }}/>
                </div>
              )}
              {g.type === 'link' && (
                <div className="badge brass" style={{ position: 'absolute', top: 10, left: 10 }}><Icons.Link style={{ width: 11, height: 11 }}/>VOD</div>
              )}
              <div style={{ padding: 12, borderTop: '1px solid var(--rule)' }}>
                <div className="serif-display" style={{ fontSize: 14, color: 'var(--t-100)' }}>{g.t}</div>
                <div className="row between" style={{ marginTop: 8 }}>
                  <div className="row" style={{ gap: 6, color: 'var(--t-400)', fontSize: 11.5 }}>
                    <Avatar name={g.a} size={18}/>
                    {g.a}
                  </div>
                  <span className="row" style={{ gap: 4, color: 'var(--oxblood-300)', fontSize: 11.5 }}>
                    <Icons.Heart style={{ width: 12, height: 12 }}/>{g.l}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────── Discord login / account creation ─────────
function DiscordLogin() {
  return (
    <div className="app-root grain" style={{ height: '100%', display: 'flex' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <img src="assets/bg-2.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.45) saturate(.7)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(11,14,20,.6), rgba(11,14,20,.9))' }}/>
        <div style={{ position: 'relative', padding: '64px 48px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 14 }}>
            <Crest size={48}/>
            <div>
              <div className="serif" style={{ fontSize: 22, color: 'var(--brass-300)', fontWeight: 600 }}>Lord Regiment</div>
              <div className="admin-label">Roll Call · Verified Access</div>
            </div>
          </div>

          <div style={{ maxWidth: 460 }}>
            <CrestDivider/>
            <div className="serif-display" style={{ fontSize: 36, color: 'var(--t-100)', lineHeight: 1.15 }}>
              "Identity is verified through the regiment's Discord. No accounts. No passwords. No exceptions."
            </div>
            <div style={{ fontSize: 13, color: 'var(--t-400)', marginTop: 18, lineHeight: 1.6 }}>
              — Field Order № 003, Chapter on Membership.
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--t-500)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Hosted on Holdfast Command · v1.0.2
          </div>
        </div>
      </div>

      <div style={{ width: 480, background: 'var(--ink-850)', borderLeft: '1px solid var(--rule)', padding: '64px 48px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <div className="admin-label brass">Step 01 / 02</div>
          <div className="serif-display" style={{ fontSize: 32, color: 'var(--t-100)', marginTop: 6, lineHeight: 1.15 }}>
            Sign in to the Regiment
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--t-300)', lineHeight: 1.6, marginTop: 10 }}>
            We authenticate through Discord. Once verified, the bot will confirm you are present in
            the regimental Discord server before granting access to member areas.
          </p>
        </div>

        <DiscordBtn size="lg">Continue with Discord</DiscordBtn>

        <div className="rule-ornament"><span className="pip"/></div>

        <div className="col" style={{ gap: 14 }}>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, border: '1px solid var(--brass-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brass-300)', fontSize: 11, fontWeight: 600, flex: 'none' }}>1</div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--t-100)', fontWeight: 500 }}>Authorize via Discord</div>
              <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 2 }}>We request <span style={{ color: 'var(--t-200)' }}>identify</span> and <span style={{ color: 'var(--t-200)' }}>guilds</span> scopes only.</div>
            </div>
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, border: '1px solid var(--rule-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-400)', fontSize: 11, flex: 'none' }}>2</div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--t-300)' }}>Confirm regiment membership</div>
              <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 2 }}>Members go directly to the command board. Visitors may apply.</div>
            </div>
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, border: '1px solid var(--rule-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-400)', fontSize: 11, flex: 'none' }}>3</div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--t-300)' }}>Set in-game name & role</div>
              <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 2 }}>Apply as <em>Applicant</em>, or join short-term as <em>Mercenary</em>.</div>
            </div>
          </div>
        </div>

        <div className="notice info">
          <Icons.Shield style={{ width: 16, height: 16, color: 'var(--regblue-300)', flex: 'none', marginTop: 1 }}/>
          <div>
            <div className="n-title">Private to this regiment</div>
            <div className="n-body">Your Discord identity is shared only with the Lord Regiment. We do not sell or syndicate user data.</div>
          </div>
        </div>

        <div className="sp"/>
        <div style={{ fontSize: 11.5, color: 'var(--t-500)' }}>
          By continuing you accept the <span style={{ color: 'var(--t-300)' }}>Code of Conduct</span> and the <span style={{ color: 'var(--t-300)' }}>Privacy notice</span>.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PublicLanding, PublicEvents, PublicGallery, DiscordLogin, PublicNav });
