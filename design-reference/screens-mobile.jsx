/* eslint-disable */
// Holdfast — Mobile variants of key screens
// All rendered inside a 360x780 phone frame

function PhoneFrame({ children, label }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{
        width: 360, height: 780,
        background: 'var(--ink-900)',
        border: '1px solid var(--rule-3)',
        borderRadius: 22,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 24px 60px -20px rgba(0,0,0,.7)',
      }}>
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 100, height: 22, background: 'var(--ink-900)', borderRadius: 12, zIndex: 5 }}/>
        <div className="phone grain" style={{ height: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function PhoneStatus({ light }) {
  return (
    <div style={{ height: 36, background: 'transparent', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 22px 4px', fontSize: 12, color: light ? 'var(--t-100)' : 'var(--t-200)', fontWeight: 600 }}>
      <span>9:24</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10 }}>● ●● ▮</span>
    </div>
  );
}

function PhoneHeader({ title, sub, left, right }) {
  return (
    <header style={{
      padding: '8px 16px 14px',
      borderBottom: '1px solid var(--rule)',
      background: 'var(--ink-850)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {left || <div style={{ width: 24 }}/>}
      <div style={{ flex: 1 }}>
        <div className="serif-display" style={{ fontSize: 17, color: 'var(--t-100)' }}>{title}</div>
        {sub && <div style={{ fontSize: 10.5, color: 'var(--t-400)', letterSpacing: '.14em', textTransform: 'uppercase' }}>{sub}</div>}
      </div>
      {right || <div style={{ width: 24 }}/>}
    </header>
  );
}

function BNav({ active = 'home' }) {
  const items = [
    { id: 'home',   l: 'Board',   Ic: Icons.Home },
    { id: 'events', l: 'Orders',  Ic: Icons.Events },
    { id: 'gallery',l: 'Gallery', Ic: Icons.Gallery },
    { id: 'roster', l: 'Roster',  Ic: Icons.Roster },
    { id: 'me',     l: 'Me',      Ic: Icons.Profile },
  ];
  return (
    <div className="bnav">
      {items.map(i => (
        <div key={i.id} className={"b " + (active === i.id ? 'active' : '')}>
          <i.Ic style={{ width: 18, height: 18 }}/>
          {i.l}
        </div>
      ))}
    </div>
  );
}

// ───────── Mobile Landing ─────────
function MobileLanding() {
  return (
    <PhoneFrame>
      <PhoneStatus light/>
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--ink-900)' }}>
        <div style={{ position: 'relative', height: 320, overflow: 'hidden' }}>
          <img src="assets/bg-1.jpg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.42) saturate(.7)' }}/>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,14,20,.3) 0%, var(--ink-900) 95%)' }}/>
          <div style={{ position: 'relative', padding: '24px 22px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 10 }}>
              <Crest size={32}/>
              <div>
                <div className="serif" style={{ fontSize: 14, color: 'var(--brass-300)', fontWeight: 600 }}>Lord Regiment</div>
                <div className="admin-label" style={{ fontSize: 8.5 }}>Holdfast · Nations at War</div>
              </div>
              <span className="sp"/>
              <button className="btn ghost sm" style={{ height: 26, padding: '0 10px', fontSize: 11 }}>Menu</button>
            </div>
            <div>
              <div className="admin-label brass" style={{ fontSize: 9 }}>Field Order № 014</div>
              <h1 className="serif" style={{ fontSize: 32, color: 'var(--t-100)', lineHeight: 1.05, margin: '6px 0 0' }}>Discipline,<br/><em style={{ color: 'var(--brass-300)' }}>not spectacle.</em></h1>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 18px 28px' }}>
          <p style={{ fontSize: 13, color: 'var(--t-300)', lineHeight: 1.6, margin: 0 }}>
            A line-infantry company. We drill three nights a week, field 30–60 muskets on event nights.
          </p>
          <div className="col" style={{ gap: 8, marginTop: 16 }}>
            <DiscordBtn>Sign in with Discord</DiscordBtn>
            <button className="btn ghost block">View Charter</button>
          </div>

          <CrestDivider>Upcoming</CrestDivider>

          <div className="col" style={{ gap: 10 }}>
            {[
              { d: 'Sat 31', t: 'Linebattle: Coastal Advance', s: '20:00 GMT · EU 4' },
              { d: 'Wed 04', t: 'Drill Night — Volley & Square', s: '19:30 GMT · Drill Hall' },
            ].map((e, i) => (
              <div key={i} className="panel" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 44, textAlign: 'center', borderRight: '1px solid var(--rule-2)', paddingRight: 8 }}>
                  <div className="admin-label brass" style={{ fontSize: 8.5 }}>{e.d.split(' ')[0]}</div>
                  <div className="serif-display" style={{ fontSize: 18, color: 'var(--t-100)' }}>{e.d.split(' ')[1]}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--t-100)', fontWeight: 500 }}>{e.t}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--t-400)', marginTop: 3 }}>{e.s}</div>
                </div>
              </div>
            ))}
          </div>

          <CrestDivider>Gallery</CrestDivider>
          <div className="grid-2" style={{ gap: 8 }}>
            {['bg-1.jpg','bg-2.jpg','banner.png','bg-1.jpg'].map((b, i) => (
              <div key={i} className="panel" style={{ padding: 0, aspectRatio: '4/3', background: `url(assets/${b}) center/cover`, overflow: 'hidden' }}/>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ───────── Mobile Dashboard ─────────
function MobileDashboard() {
  return (
    <PhoneFrame>
      <PhoneStatus light/>
      <PhoneHeader title="Command Board" sub="Lt. Nolt · Good Order" left={<Crest size={26}/>} right={<Icons.Bell style={{ width: 18, height: 18, color: 'var(--t-300)' }}/>}/>
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px 20px' }}>
        <div className="panel" style={{ padding: 14 }}>
          <div className="admin-label brass">Your standing</div>
          <div className="row between" style={{ marginTop: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              <Chevrons n={2}/>
              <span className="serif-display" style={{ fontSize: 18, color: 'var(--t-100)' }}>Lieutenant</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <Medal ribbon="blue" letter="L"/>
              <Medal ribbon="red" letter="V"/>
              <Medal ribbon="gold" letter="★"/>
              <Medal ribbon="green" letter="D"/>
            </div>
          </div>
        </div>

        <SectionHead title="Next event"/>
        <div className="panel" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ height: 110, background: 'url(assets/bg-1.jpg) center/cover', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, rgba(11,14,20,.95))' }}/>
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 8 }}>
              <span className="badge brass dot">Saturday · in 5 days</span>
              <div className="serif-display" style={{ fontSize: 16, color: 'var(--t-100)', marginTop: 4 }}>Linebattle: Coastal Advance</div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            <div className="row between">
              <div className="row" style={{ gap: 8, color: 'var(--t-400)', fontSize: 11.5 }}>
                <Icons.Clock style={{ width: 11, height: 11 }}/>20:00 GMT
                <span>·</span>
                <PlatformBadges platforms={['steam','xbox']}/>
              </div>
            </div>
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              <button className="btn primary sm" style={{ flex: 1 }}>Interested</button>
              <button className="btn ghost sm" style={{ flex: 1 }}>Tentative</button>
              <button className="btn ghost sm icon"><Icons.X style={{ width: 12, height: 12 }}/></button>
            </div>
          </div>
        </div>

        <SectionHead title="Dispatches"/>
        <div className="col" style={{ gap: 10 }}>
          {[
            { t: 'Drill cancelled — Wednesday', b: 'Field waterlogged. Sunday 19:00 instead.', tone: 'warn' },
            { t: 'Promotion: Color Sergeant', b: 'Pvt. Calder promoted after Fort Halen.', tone: 'ok' },
          ].map((n, i) => (
            <div key={i} className={"notice " + n.tone} style={{ padding: 10 }}>
              <div>
                <div className="n-title" style={{ fontSize: 12.5 }}>{n.t}</div>
                <div className="n-body" style={{ fontSize: 11.5 }}>{n.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BNav active="home"/>
    </PhoneFrame>
  );
}

// ───────── Mobile Members list ─────────
function MobileMembers() {
  const ms = [
    { n: 'A. Holcombe', rank: 'Colonel',   chev: 5, role: 'Owner' },
    { n: 'D. Vasquez',  rank: 'Major',     chev: 4, role: 'Admin' },
    { n: 'R. Asher',    rank: 'Captain',   chev: 3, role: 'Admin' },
    { n: 'J. Nolt',     rank: 'Lieutenant',chev: 2, role: 'Mod' },
    { n: 'S. Wren',     rank: 'Sergeant',  chev: 2, role: 'Mod' },
    { n: 'M. Erskine',  rank: 'Corporal',  chev: 1, role: 'Member' },
    { n: 'B. Trager',   rank: 'Private',   chev: 0, role: 'Member' },
    { n: 'P. Calder',   rank: 'Private',   chev: 0, role: 'Member' },
  ];
  return (
    <PhoneFrame>
      <PhoneStatus light/>
      <PhoneHeader title="Roster" sub="84 members · 6 officers"
        left={<Icons.ChevL style={{ width: 18, height: 18, color: 'var(--t-300)' }}/>}
        right={<Icons.Filter style={{ width: 18, height: 18, color: 'var(--t-300)' }}/>}/>
      <div style={{ padding: '12px 14px 8px' }}>
        <div className="input-wrap"><Icons.Search style={{ width: 13, height: 13 }}/><input className="input has-icon" placeholder="Search roster…"/></div>
        <div className="row" style={{ gap: 4, marginTop: 10, overflow: 'auto' }}>
          {['All','Officers','Privates','Mercenaries','Inactive'].map((t, i) => (
            <span key={t} className="badge" style={{
              padding: '4px 10px',
              background: i === 0 ? 'rgba(176,132,54,.16)' : 'var(--ink-700)',
              color: i === 0 ? 'var(--brass-300)' : 'var(--t-300)',
              borderColor: i === 0 ? 'var(--brass-500)' : 'var(--rule-3)',
            }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 14px' }}>
        <div className="col" style={{ gap: 8 }}>
          {ms.map((m, i) => (
            <div key={i} className="panel" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={m.n} size={36} online/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between">
                  <span style={{ fontSize: 13, color: 'var(--t-100)', fontWeight: 500 }}>{m.n}</span>
                  <Chevrons n={m.chev}/>
                </div>
                <div className="row between" style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--t-400)' }}>{m.rank}</span>
                  <span className={"badge " + (m.role === 'Owner' ? 'brass' : m.role === 'Admin' ? 'ox' : m.role === 'Mod' ? 'blue' : 'laurel')} style={{ padding: '1px 6px', fontSize: 9 }}>{m.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BNav active="roster"/>
    </PhoneFrame>
  );
}

// ───────── Mobile Event Detail ─────────
function MobileEvent() {
  return (
    <PhoneFrame>
      <PhoneStatus light/>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ position: 'relative', height: 220 }}>
          <img src="assets/bg-1.jpg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.55)' }}/>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,14,20,.4), rgba(11,14,20,.95))' }}/>
          <div style={{ position: 'absolute', top: 12, left: 12, right: 12 }} className="row between">
            <button className="btn ghost sm icon" style={{ background: 'rgba(11,14,20,.6)' }}><Icons.ChevL style={{ width: 14, height: 14 }}/></button>
            <button className="btn ghost sm icon" style={{ background: 'rgba(11,14,20,.6)' }}><Icons.Dots style={{ width: 14, height: 14 }}/></button>
          </div>
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
            <div className="row" style={{ gap: 6, marginBottom: 8 }}>
              <span className="badge brass dot">Upcoming</span>
              <PlatformBadges platforms={['steam','xbox']}/>
            </div>
            <div className="serif-display" style={{ fontSize: 22, color: 'var(--t-100)', lineHeight: 1.15 }}>Linebattle: Coastal Advance</div>
            <div className="row" style={{ gap: 10, marginTop: 6, fontSize: 11.5, color: 'var(--t-300)' }}>
              <Icons.Calendar style={{ width: 12, height: 12 }}/>Sat 31 May · 20:00 GMT
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 16px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--t-300)', margin: 0, lineHeight: 1.6 }}>
            Formation drill at 19:30 GMT. Linebattle commences at 20:00 sharp. Cavalry expected — square drill mandatory.
          </p>

          <SectionHead title="Server"/>
          <div className="panel" style={{ padding: 12 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="admin-label" style={{ fontSize: 9.5 }}>Name</span>
              <span style={{ fontSize: 12, color: 'var(--t-100)' }}>EU · Holdfast Official 4</span>
            </div>
            <div className="row between">
              <span className="admin-label" style={{ fontSize: 9.5 }}>Password</span>
              <button className="btn ghost sm" style={{ height: 26 }}><Icons.Eye style={{ width: 12, height: 12 }}/>Reveal</button>
            </div>
          </div>

          <SectionHead title="Attendees · 24"/>
          <div className="row" style={{ gap: -8, paddingLeft: 8 }}>
            {[1,2,3,4,5,6].map(i => (
              <Avatar key={i} name={"User " + i} size={28}/>
            ))}
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--t-400)' }}>+18 more</span>
          </div>
        </div>
      </div>

      {/* Sticky RSVP */}
      <div style={{ borderTop: '1px solid var(--rule)', background: 'var(--ink-850)', padding: 12 }}>
        <div className="admin-label brass" style={{ fontSize: 9.5, marginBottom: 6 }}>RSVP</div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn primary sm" style={{ flex: 1 }}>Interested</button>
          <button className="btn ghost sm" style={{ flex: 1 }}>Tentative</button>
          <button className="btn ghost sm" style={{ flex: 1 }}>Declined</button>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ───────── Mobile Gallery ─────────
function MobileGallery() {
  return (
    <PhoneFrame>
      <PhoneStatus light/>
      <PhoneHeader title="Gallery" sub="Archive · 312 dispatches"
        left={<Icons.Filter style={{ width: 18, height: 18, color: 'var(--t-300)' }}/>}
        right={<Icons.Plus style={{ width: 18, height: 18, color: 'var(--brass-300)' }}/>}/>
      <div style={{ padding: '10px 14px', display: 'flex', gap: 6, overflow: 'auto' }}>
        {['All','Linebattles','Drill','Clips','Portraits'].map((t, i) => (
          <span key={t} className="badge" style={{
            padding: '4px 10px',
            background: i === 0 ? 'rgba(176,132,54,.16)' : 'var(--ink-700)',
            color: i === 0 ? 'var(--brass-300)' : 'var(--t-300)',
            borderColor: i === 0 ? 'var(--brass-500)' : 'var(--rule-3)',
          }}>{t}</span>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 14px' }}>
        <div style={{ columnCount: 2, columnGap: 8 }}>
          {[
            { b: 'bg-1.jpg', t: 'Fort Halen', l: 24, ar: '4/5' },
            { b: 'bg-2.jpg', t: 'Bayonet charge', l: 41, ar: '4/3' },
            { b: 'banner.png', t: 'Volley at dusk', l: 18, ar: '4/3' },
            { b: 'bg-1.jpg', t: 'Officers’ mess', l: 12, ar: '4/5' },
            { b: 'bg-2.jpg', t: 'Color party', l: 31, ar: '4/3' },
            { b: 'banner.png', t: 'Drill at dawn', l: 9, ar: '4/3' },
          ].map((g, i) => (
            <div key={i} className="panel" style={{ breakInside: 'avoid', marginBottom: 8, padding: 0, overflow: 'hidden', position: 'relative' }}>
              <div style={{ aspectRatio: g.ar, background: `url(assets/${g.b}) center/cover` }}/>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(11,14,20,.95))' }}/>
              <div style={{ position: 'absolute', left: 8, right: 8, bottom: 6 }}>
                <div style={{ fontSize: 10.5, color: 'var(--t-100)' }}>{g.t}</div>
                <div className="row" style={{ gap: 3, color: 'var(--oxblood-300)', fontSize: 10, marginTop: 2 }}>
                  <Icons.Heart style={{ width: 9, height: 9 }}/>{g.l}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BNav active="gallery"/>
    </PhoneFrame>
  );
}

// ───────── Mobile Profile ─────────
function MobileProfile() {
  return (
    <PhoneFrame>
      <PhoneStatus light/>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ height: 130, position: 'relative' }}>
          <img src="assets/banner.png" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.5)' }}/>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,14,20,.2), var(--ink-900))' }}/>
        </div>
        <div style={{ padding: '0 18px 14px', marginTop: -40, position: 'relative', zIndex: 1 }}>
          <div className="row" style={{ gap: 14, alignItems: 'flex-end' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 4,
              border: '2px solid var(--brass-500)',
              background: 'oklch(0.32 0.04 220)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--brass-100)', fontWeight: 600,
            }}>JN</div>
            <div style={{ paddingBottom: 4 }}>
              <div className="admin-label brass" style={{ fontSize: 9 }}>Lt. Nolt · Officer</div>
              <div className="serif-display" style={{ fontSize: 20, color: 'var(--t-100)' }}>Jameson Nolt</div>
            </div>
          </div>
          <div className="row" style={{ gap: 10, marginTop: 10, fontSize: 11.5, color: 'var(--t-400)' }}>
            <span className="row" style={{ gap: 6 }}><Chevrons n={2}/>Lieutenant</span>
            <span>·</span><span>Moderator</span>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn ghost sm" style={{ flex: 1 }}><Icons.Discord style={{ width: 12, height: 12 }}/>DM</button>
            <button className="btn ghost sm" style={{ flex: 1 }}>Record</button>
            <button className="btn ghost sm icon"><Icons.Dots style={{ width: 13, height: 13 }}/></button>
          </div>

          <SectionHead title="Honors · 4"/>
          <div className="row" style={{ gap: 12, padding: '4px 0' }}>
            <Medal ribbon="blue" letter="L"/>
            <Medal ribbon="red" letter="V"/>
            <Medal ribbon="gold" letter="★"/>
            <Medal ribbon="green" letter="D"/>
          </div>

          <SectionHead title="Gallery · 12"/>
          <div className="grid-3" style={{ gap: 6 }}>
            {['bg-1.jpg','bg-2.jpg','banner.png','bg-2.jpg','bg-1.jpg','banner.png'].map((b, i) => (
              <div key={i} style={{ aspectRatio: '1', background: `url(assets/${b}) center/cover`, border: '1px solid var(--rule-2)' }}/>
            ))}
          </div>
        </div>
      </div>
      <BNav active="me"/>
    </PhoneFrame>
  );
}

// ───────── Mobile Applications ─────────
function MobileApplications() {
  return (
    <PhoneFrame>
      <PhoneStatus light/>
      <PhoneHeader title="Applications" sub="7 awaiting review"
        left={<Icons.ChevL style={{ width: 18, height: 18, color: 'var(--t-300)' }}/>}
        right={<Icons.Filter style={{ width: 18, height: 18, color: 'var(--t-300)' }}/>}/>
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px 14px' }}>
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: '1px solid var(--rule)' }}>
            <div className="row" style={{ gap: 12 }}>
              <Avatar name="Mara Erskine" size={40}/>
              <div style={{ flex: 1 }}>
                <div className="serif-display" style={{ fontSize: 16, color: 'var(--t-100)' }}>Mara Erskine</div>
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  <span className="badge brass" style={{ padding: '1px 5px', fontSize: 9 }}>Applicant</span>
                  <span style={{ fontSize: 11, color: 'var(--t-400)' }}>2h ago</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: 14, fontSize: 12.5, color: 'var(--t-300)', lineHeight: 1.6 }}>
            <div className="admin-label brass" style={{ fontSize: 9 }}>Why join the regiment?</div>
            <div className="parchment" style={{ padding: 10, marginTop: 6, fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--parch-900)', lineHeight: 1.5 }}>
              "Want a regiment that takes drill seriously without the cosplay. Saw the Lords hold against cavalry at Fort Halen — that's the discipline I'm after."
            </div>
            <div className="admin-label brass" style={{ fontSize: 9, marginTop: 12 }}>Previous</div>
            <div style={{ marginTop: 4 }}>92nd Highlanders (2024) — Pte. Left amicably.</div>
          </div>
          <div className="row" style={{ gap: 6, padding: 12, borderTop: '1px solid var(--rule)' }}>
            <button className="btn destructive sm" style={{ flex: 1 }}><Icons.X style={{ width: 12, height: 12 }}/>Decline</button>
            <button className="btn primary sm" style={{ flex: 1 }}><Icons.Check style={{ width: 12, height: 12 }}/>Approve</button>
          </div>
        </div>

        <div className="row between" style={{ marginTop: 14, color: 'var(--t-400)', fontSize: 11.5 }}>
          <span>1 of 7</span>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm icon"><Icons.ChevL style={{ width: 12, height: 12 }}/></button>
            <button className="btn ghost sm icon"><Icons.ChevR style={{ width: 12, height: 12 }}/></button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

Object.assign(window, {
  MobileLanding, MobileDashboard, MobileMembers, MobileEvent, MobileGallery, MobileProfile, MobileApplications,
});
