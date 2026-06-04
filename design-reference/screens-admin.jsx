/* eslint-disable */
// Holdfast — Admin screens: Applications, Ranks/Medals, Events admin, Gallery mod, Audit, Settings, Bot, GDPR

// ───────── Applications Review ─────────
function ApplicationsReview() {
  const apps = [
    { id: 'app-014', n: 'Mara Erskine', tag: '@erskine', t: 'Applicant', src: 'Public server', d: '2h ago', prev: false, sel: true },
    { id: 'app-013', n: 'Konstantin Soto', tag: '@kasoto', t: 'Mercenary', src: 'Friend invite', d: '6h ago', prev: false },
    { id: 'app-012', n: 'Yusuf Bey', tag: '@ybey', t: 'Applicant', src: 'Twitch VOD', d: '1d ago', prev: false },
    { id: 'app-011', n: 'Helena Park', tag: '@hpark', t: 'Applicant', src: 'Discord recommendation', d: '2d ago', prev: true },
    { id: 'app-010', n: 'Otto Reinhart', tag: '@oreinhart', t: 'Applicant', src: 'Other', d: '3d ago', prev: false },
  ];
  return (
    <AppShell active="apps" crumbs={["Command", "Applications"]}>
      <div className="page" style={{ maxWidth: 'none', padding: '22px 24px 40px' }}>
        <PageHead eyebrow="Awaiting Review · 7 papers" title="Applications" sub="Each application is logged to the audit ledger upon decision." />

        <div className="row" style={{ gap: 10, marginBottom: 14 }}>
          <div className="tabs" style={{ marginBottom: 0, border: 'none' }}>
            <span className="tab active">Pending · 7</span>
            <span className="tab">Approved · 142</span>
            <span className="tab">Declined · 28</span>
            <span className="tab">Re-applications · 4</span>
          </div>
          <span className="sp"/>
          <select className="select" style={{ width: 140, height: 32, fontSize: 12.5 }}><option>Newest first</option></select>
          <select className="select" style={{ width: 140, height: 32, fontSize: 12.5 }}><option>All types</option></select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18, alignItems: 'flex-start' }}>
          {/* Queue */}
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-header"><span className="panel-title">Queue</span><span className="badge brass">7</span></div>
            <div>
              {apps.map((a, i) => (
                <div key={a.id} className="row" style={{
                  padding: '12px 14px', gap: 12, cursor: 'pointer',
                  borderBottom: i < apps.length - 1 ? '1px solid var(--rule)' : 'none',
                  borderLeft: a.sel ? '2px solid var(--brass-400)' : '2px solid transparent',
                  background: a.sel ? 'rgba(176,132,54,.06)' : 'transparent',
                }}>
                  <Avatar name={a.n} size={34}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row between">
                      <span style={{ fontSize: 13, color: 'var(--t-100)', fontWeight: 500 }}>{a.n}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--t-500)' }}>{a.d}</span>
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 4 }}>
                      <span className={"badge " + (a.t === 'Applicant' ? 'brass' : 'parch')} style={{ padding: '1px 5px', fontSize: 9.5 }}>{a.t}</span>
                      <span style={{ fontSize: 11, color: 'var(--t-400)' }}>{a.tag}</span>
                      {a.prev && <span className="badge ox" style={{ padding: '1px 5px', fontSize: 9.5 }}>Re-apply</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="panel">
            <div className="panel-header">
              <div className="row" style={{ gap: 12 }}>
                <Avatar name="Mara Erskine" size={36}/>
                <div>
                  <div className="serif-display" style={{ fontSize: 18, color: 'var(--t-100)' }}>Mara Erskine <span className="badge brass" style={{ marginLeft: 6 }}>Applicant</span></div>
                  <div style={{ fontSize: 11.5, color: 'var(--t-400)' }}>@erskine · Filed 2h ago · From public server</div>
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn ghost sm"><Icons.Discord style={{ width: 13, height: 13 }}/>Open in Discord</button>
                <button className="btn ghost sm icon"><Icons.Dots style={{ width: 14, height: 14 }}/></button>
              </div>
            </div>

            <div className="panel-body">
              <div className="grid-2" style={{ marginBottom: 18 }}>
                <div className="panel" style={{ padding: 12, background: 'var(--ink-850)' }}>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>In-game name</div>
                  <div style={{ color: 'var(--t-100)', fontSize: 14, marginTop: 2 }}>MEr_NL</div>
                </div>
                <div className="panel" style={{ padding: 12, background: 'var(--ink-850)' }}>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>Discord verification</div>
                  <div className="row" style={{ gap: 8, marginTop: 4 }}>
                    <span className="status-dot discord-on"/>
                    <span style={{ color: 'var(--t-100)', fontSize: 13 }}>In server · 4 mutual events</span>
                  </div>
                </div>
                <div className="panel" style={{ padding: 12, background: 'var(--ink-850)' }}>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>Platform</div>
                  <div style={{ color: 'var(--t-100)', fontSize: 13, marginTop: 2 }}>Steam (PC)</div>
                </div>
                <div className="panel" style={{ padding: 12, background: 'var(--ink-850)' }}>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>Time zone</div>
                  <div style={{ color: 'var(--t-100)', fontSize: 13, marginTop: 2 }}>GMT</div>
                </div>
              </div>

              <CrestDivider>Enlistment Answers</CrestDivider>

              <div className="col" style={{ gap: 18, marginTop: 18 }}>
                {[
                  { q: 'Why do you want to join the Lord Regiment?',
                    a: `I've been playing line-battle servers for about a year and want a regiment that takes drill seriously without the cosplay. Saw the Lords hold against a cavalry charge at Fort Halen last week — that's the discipline I'm after. Happy to start at the bottom and earn my place.` },
                  { q: 'How did you find the regiment?',
                    a: 'Public Holdfast Official 4 server, after the Fort Halen action. A Cpl. asked if I had a regiment and pointed me here.' },
                  { q: 'Previous regiment experience',
                    a: '92nd Highlanders (2024) — Pte. Left amicably; group went inactive after their officer corps drifted. No drama, no bans.' },
                ].map((p, i) => (
                  <div key={i}>
                    <div className="admin-label brass">Q.{i+1} — {p.q}</div>
                    <div className="parchment" style={{ padding: 14, marginTop: 6, lineHeight: 1.65, fontFamily: 'var(--serif)', fontSize: 15.5, color: 'var(--parch-900)' }}>
                      {p.a}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rule-ornament" style={{ margin: '24px 0 20px' }}><span className="pip"/></div>

              <div className="grid-2" style={{ gap: 14 }}>
                <div>
                  <label className="field-label">Moderator note (private)</label>
                  <textarea className="textarea" placeholder="Optional note for the audit log…" defaultValue="Calm tone, realistic expectations. Recommend approve."/>
                </div>
                <div>
                  <label className="field-label">Discord DM message</label>
                  <textarea className="textarea" defaultValue={`Welcome to the Lord Regiment, Mara. Your application has been approved. You'll find a #drill-hall channel in the server with this week's schedule.`}/>
                </div>
              </div>

              <div className="notice info" style={{ marginTop: 14 }}>
                <Icons.Discord style={{ width: 16, height: 16, color: 'var(--regblue-300)', flex: 'none', marginTop: 1 }}/>
                <div>
                  <div className="n-title">A Discord DM will be sent on decision</div>
                  <div className="n-body">Quartermaster bot will message Mara with the outcome and assign the Applicant role if approved.</div>
                </div>
              </div>

              <div className="row between" style={{ marginTop: 18 }}>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn muted"><Icons.ChevL style={{ width: 13, height: 13 }}/>Previous</button>
                  <button className="btn muted">Next<Icons.ChevR style={{ width: 13, height: 13 }}/></button>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <button className="btn destructive"><Icons.X style={{ width: 14, height: 14 }}/>Decline</button>
                  <button className="btn ghost">Hold for committee</button>
                  <button className="btn primary"><Icons.Check style={{ width: 14, height: 14 }}/>Approve & enlist</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Ranks & Medals ─────────
function RanksMedals() {
  const ranks = [
    { n: 'Colonel',      c: 5, holders: 1,  role: 'Lords · Colonel',   linked: true },
    { n: 'Major',        c: 4, holders: 1,  role: 'Lords · Major',     linked: true },
    { n: 'Captain',      c: 3, holders: 2,  role: 'Lords · Captain',   linked: true },
    { n: 'Lieutenant',   c: 2, holders: 3,  role: 'Lords · Lt.',       linked: true },
    { n: 'Sergeant',     c: 2, holders: 6,  role: 'Lords · Sgt.',      linked: true },
    { n: 'Corporal',     c: 1, holders: 11, role: 'Lords · Cpl.',      linked: true },
    { n: 'Private',      c: 0, holders: 54, role: 'Lords · Pvt.',      linked: true },
    { n: 'Mercenary',    c: 0, holders: 4,  role: 'Lords · Mercenary', linked: true },
    { n: 'Applicant',    c: 0, holders: 2,  role: '— not synced —',    linked: false },
  ];
  const medals = [
    { l: 'L', r: 'blue',  n: 'Linebattle Veteran',    d: 'Fielded 10+ events',          h: 41, linked: true },
    { l: 'V', r: 'red',   n: 'Valor on the Line',     d: 'Awarded for conspicuous bravery', h: 12, linked: true },
    { l: '★', r: 'gold',  n: 'Marksman, First Class', d: 'Top 5% accuracy, 3 events',   h: 6,  linked: true },
    { l: 'D', r: 'green', n: 'Drill Master',          d: 'Led 20+ drill sessions',      h: 4,  linked: false },
    { l: 'S', r: 'tricolor', n: 'Standard Bearer',    d: 'Held the colors in 5+ events',h: 3,  linked: true },
  ];
  return (
    <AppShell active="ranks" crumbs={["Command", "Ranks & Medals"]}>
      <div className="page" style={{ maxWidth: 'none' }}>
        <PageHead
          eyebrow="The Ladder"
          title="Ranks & Medals"
          sub="Drag to reorder. Changes propagate to Discord role positions when synced."
          actions={<>
            <button className="btn ghost"><Icons.Reload style={{ width: 14, height: 14 }}/>Sync with Discord</button>
            <button className="btn primary"><Icons.Plus style={{ width: 14, height: 14 }}/>New</button>
          </>}
        />

        <div className="notice warn" style={{ marginBottom: 18 }}>
          <Icons.Shield style={{ width: 16, height: 16, color: 'var(--brass-400)', flex: 'none', marginTop: 1 }}/>
          <div>
            <div className="n-title">Ranks and medals are titles, not permissions</div>
            <div className="n-body">For moderator/admin permissions, use <span style={{ color: 'var(--t-200)' }}>Settings → Roles</span>. Changing rank order will not modify what a member can do — only what they are called.</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          {/* Ranks */}
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-header">
              <div>
                <span className="panel-title">Rank Ladder</span>
                <div style={{ fontSize: 11, color: 'var(--t-400)', marginTop: 2 }}>Order from senior (top) to junior</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn ghost sm"><Icons.Plus style={{ width: 13, height: 13 }}/>Add rank</button>
              </div>
            </div>
            <div>
              {ranks.map((r, i) => (
                <div key={r.n} className="row" style={{
                  padding: '12px 14px', gap: 12,
                  borderBottom: i < ranks.length - 1 ? '1px solid var(--rule)' : 'none',
                  cursor: 'grab',
                }}>
                  <Icons.Grip style={{ width: 14, height: 14, color: 'var(--t-500)' }}/>
                  <div className="row" style={{ gap: 10, width: 130 }}>
                    {r.c > 0 && <Chevrons n={r.c}/>}
                    <span style={{ color: 'var(--t-100)', fontSize: 13, fontWeight: 500 }}>{r.n}</span>
                  </div>
                  <div style={{ flex: 1, fontSize: 11.5, color: 'var(--t-400)' }}>
                    <span>{r.holders} holder{r.holders !== 1 ? 's' : ''}</span>
                    <span style={{ margin: '0 6px', color: 'var(--t-500)' }}>·</span>
                    <span className={r.linked ? '' : ''} style={{ color: r.linked ? 'var(--t-300)' : 'var(--t-500)' }}>
                      {r.linked ? '↔ ' + r.role : 'Not linked to Discord'}
                    </span>
                  </div>
                  <button className="btn ghost sm icon"><Icons.Dots style={{ width: 13, height: 13 }}/></button>
                </div>
              ))}
            </div>
          </div>

          {/* Medals */}
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-header">
              <div>
                <span className="panel-title">Medal Cabinet</span>
                <div style={{ fontSize: 11, color: 'var(--t-400)', marginTop: 2 }}>Ordered by precedence</div>
              </div>
              <button className="btn ghost sm"><Icons.Plus style={{ width: 13, height: 13 }}/>Add medal</button>
            </div>
            <div>
              {medals.map((m, i) => (
                <div key={m.n} className="row" style={{
                  padding: '12px 14px', gap: 14,
                  borderBottom: i < medals.length - 1 ? '1px solid var(--rule)' : 'none', cursor: 'grab',
                }}>
                  <Icons.Grip style={{ width: 14, height: 14, color: 'var(--t-500)' }}/>
                  <Medal ribbon={m.r} letter={m.l}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--t-100)', fontSize: 13, fontWeight: 500 }}>{m.n}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--t-400)', marginTop: 2 }}>{m.d}</div>
                  </div>
                  <div style={{ fontSize: 11, color: m.linked ? 'var(--t-300)' : 'var(--t-500)' }}>
                    {m.linked ? <span className="row" style={{ gap: 4 }}><Icons.Link style={{ width: 11, height: 11 }}/>Linked</span> : 'Not linked'}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--t-400)', minWidth: 38, textAlign: 'right' }}>{m.h} held</span>
                  <button className="btn ghost sm icon"><Icons.Dots style={{ width: 13, height: 13 }}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor panel */}
        <SectionHead title="Editor — Marksman, First Class"/>
        <div className="panel">
          <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '180px 1fr 280px', gap: 28 }}>
            <div className="col" style={{ alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 18, border: '1px solid var(--rule-2)', background: 'var(--ink-850)' }}>
                <Medal ribbon="gold" letter="★"/>
              </div>
              <div className="admin-label">Preview</div>
              <div className="row" style={{ gap: 6 }}>
                {['blue','red','gold','green','tricolor'].map(r => (
                  <button key={r} className="panel" style={{ padding: 4, background: 'var(--ink-850)' }}>
                    <Medal ribbon={r} letter="★"/>
                  </button>
                ))}
              </div>
            </div>
            <div className="col" style={{ gap: 14 }}>
              <div className="grid-2">
                <div>
                  <label className="field-label">Title</label>
                  <input className="input" defaultValue="Marksman, First Class"/>
                </div>
                <div>
                  <label className="field-label">Disk letter / glyph</label>
                  <input className="input" defaultValue="★" style={{ maxWidth: 80 }}/>
                </div>
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea className="textarea" defaultValue="Awarded for finishing in the top 5% by accuracy across three or more events. Verified from server logs."/>
              </div>
              <div>
                <label className="field-label">Precedence</label>
                <div className="row" style={{ gap: 8 }}>
                  <input className="input" defaultValue="3" style={{ width: 70 }}/>
                  <span style={{ fontSize: 12, color: 'var(--t-400)' }}>Displayed third in a member's row of medals</span>
                </div>
              </div>
            </div>
            <div className="col" style={{ gap: 14 }}>
              <div className="panel" style={{ padding: 12, background: 'var(--ink-850)' }}>
                <div className="admin-label">Discord role link</div>
                <div className="row between" style={{ marginTop: 8 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <Icons.Discord style={{ width: 14, height: 14, color: '#7f8df4' }}/>
                    <span style={{ fontSize: 12.5, color: 'var(--t-100)' }}>Lords · Marksman ★</span>
                  </div>
                  <span className="badge laurel dot">Synced</span>
                </div>
                <div className="divider"/>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn ghost sm">Re-link</button>
                  <button className="btn ghost sm">Create new role</button>
                </div>
              </div>
              <div className="notice info">
                <div>
                  <div className="n-title">Visible to 6 members</div>
                  <div className="n-body">Changes apply on save. Discord roles will be updated in batches of ~25/min.</div>
                </div>
              </div>
              <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn ghost">Discard</button>
                <button className="btn primary">Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Event Detail (member view, with RSVP) ─────────
function EventDetail() {
  return (
    <AppShell active="events" crumbs={["Regiment", "Events", "Linebattle: Coastal Advance"]}>
      <div className="page">
        <div style={{ height: 280, position: 'relative', overflow: 'hidden', borderRadius: 4, marginBottom: 26, border: '1px solid var(--rule-2)' }}>
          <img src="assets/bg-1.jpg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.6) saturate(.85)' }}/>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,14,20,.2), rgba(11,14,20,.95))' }}/>
          <div style={{ position: 'absolute', left: 26, right: 26, bottom: 22 }}>
            <div className="row" style={{ gap: 10, marginBottom: 10 }}>
              <span className="badge brass dot">Upcoming · in 5 days</span>
              <PlatformBadges platforms={['steam','xbox']}/>
              <span className="badge"><Icons.Reload style={{ width: 11, height: 11 }}/>Weekly · Saturdays</span>
            </div>
            <h1 className="serif-display" style={{ fontSize: 42, color: 'var(--t-100)', lineHeight: 1.05 }}>Linebattle: Coastal Advance</h1>
            <div className="row" style={{ gap: 18, marginTop: 8, color: 'var(--t-300)', fontSize: 14 }}>
              <span className="row" style={{ gap: 6 }}><Icons.Calendar style={{ width: 14, height: 14 }}/>Saturday 31 May 2026</span>
              <span className="row" style={{ gap: 6 }}><Icons.Clock style={{ width: 14, height: 14 }}/>20:00–22:30 GMT</span>
              <span className="row" style={{ gap: 6 }}><Icons.Flag style={{ width: 14, height: 14 }}/>EU · Holdfast Official 4</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
          <div className="col" style={{ gap: 20 }}>
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Orders of the Day</span></div>
              <div className="panel-body" style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--t-200)' }}>
                <p style={{ marginTop: 0 }}>
                  Formation drill at <span className="bright">19:30 GMT</span>. Linebattle commences at 20:00 sharp.
                  We are deployed on the western beach, supporting the 33rd's right flank. Officers in voice on Drill Hall channel; muskets primed before the gate opens.
                </p>
                <p>
                  Cavalry are expected at the second engagement — square drill is mandatory before
                  you take the line. Recruits will fall in behind Sgt. Wren for the duration.
                </p>
                <p>Useful: <span className="row" style={{ gap: 6, display: 'inline-flex' }}><Icons.Link style={{ width: 11, height: 11, color: 'var(--brass-400)' }}/><a style={{ color: 'var(--brass-300)' }}>Map briefing (Twitch VOD)</a></span></p>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Server Details</span>
                <span className="badge ox" style={{ padding: '2px 6px' }}><Icons.Lock style={{ width: 10, height: 10 }}/>Members only</span>
              </div>
              <div className="panel-body grid-2">
                <div>
                  <div className="admin-label">Server Name</div>
                  <div style={{ fontSize: 14, color: 'var(--t-100)', marginTop: 4 }}>EU · Holdfast Official 4</div>
                </div>
                <div>
                  <div className="admin-label">Server Password</div>
                  <div className="row" style={{ gap: 8, marginTop: 4 }}>
                    <span className="mono" style={{ background: 'var(--ink-700)', padding: '4px 10px', border: '1px solid var(--rule-3)', color: 'var(--brass-300)', fontSize: 13, letterSpacing: '.1em' }}>★ ★ ★ ★ ★ ★ ★ ★</span>
                    <button className="btn ghost sm"><Icons.Eye style={{ width: 13, height: 13 }}/>Reveal</button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t-400)', marginTop: 6 }}>Disclosed only to verified members. Do not share.</div>
                </div>
                <div>
                  <div className="admin-label">Notify Before</div>
                  <div style={{ fontSize: 14, color: 'var(--t-100)', marginTop: 4 }}>30 minutes &amp; 5 minutes</div>
                </div>
                <div>
                  <div className="admin-label">Tags</div>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <span className="badge" style={{ padding: '2px 6px' }}>#linebattle</span>
                    <span className="badge" style={{ padding: '2px 6px' }}>#weekly</span>
                    <span className="badge" style={{ padding: '2px 6px' }}>#coastal</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><span className="panel-title">Attendees · 24 of expected 30</span></div>
              <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {['A. Holcombe','D. Vasquez','R. Asher','J. Nolt','S. Wren','M. Erskine','B. Trager','P. Calder'].map(n => (
                  <div key={n} className="row" style={{ gap: 8 }}>
                    <Avatar name={n} size={26} online/>
                    <div>
                      <div style={{ fontSize: 12.5, color: 'var(--t-100)' }}>{n}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--t-400)' }}>Interested</div>
                    </div>
                  </div>
                ))}
                <div className="row" style={{ gap: 8, color: 'var(--t-400)', fontSize: 12 }}>
                  + 16 more
                </div>
              </div>
            </div>
          </div>

          <div className="col" style={{ gap: 20 }}>
            <div className="panel" style={{ padding: 20 }}>
              <div className="admin-label brass">Your RSVP</div>
              <div className="serif-display" style={{ fontSize: 22, color: 'var(--t-100)', marginTop: 6 }}>Will you stand in the line?</div>
              <div className="col" style={{ gap: 8, marginTop: 16 }}>
                {[
                  { id: 'int', l: 'Interested',  d: '24 members', Ic: Icons.Check, sel: true,  color: 'var(--ok)' },
                  { id: 'ten', l: 'Tentative',   d: '5 members',  Ic: Icons.Clock, color: 'var(--brass-400)' },
                  { id: 'dec', l: 'Declined',    d: '3 members',  Ic: Icons.X,     color: 'var(--err)' },
                  { id: 'neu', l: 'Neutral',     d: 'no signal',  Ic: Icons.Dots,  color: 'var(--t-400)' },
                ].map(o => (
                  <button key={o.id} className="row between" style={{
                    width: '100%', padding: '10px 14px', textAlign: 'left',
                    background: o.sel ? 'rgba(176,132,54,.08)' : 'var(--ink-700)',
                    border: o.sel ? '1px solid var(--brass-500)' : '1px solid var(--rule-2)',
                    borderRadius: 3, cursor: 'pointer', color: 'var(--t-100)',
                  }}>
                    <span className="row" style={{ gap: 10 }}>
                      <o.Ic style={{ width: 14, height: 14, color: o.color }}/>
                      <span style={{ fontSize: 13.5 }}>{o.l}</span>
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--t-400)' }}>{o.d}</span>
                  </button>
                ))}
              </div>
              <div className="divider"/>
              <div className="row between">
                <span style={{ fontSize: 11.5, color: 'var(--t-400)' }}>Reminder set · 30m before</span>
                <button className="btn ghost sm">Change</button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><span className="panel-title">Roll-up</span></div>
              <div className="panel-body col" style={{ gap: 10 }}>
                {[
                  ['Interested', 24, 'var(--ok)'],
                  ['Tentative',   5, 'var(--brass-400)'],
                  ['Declined',    3, 'var(--err)'],
                  ['No reply',   22, 'var(--t-500)'],
                ].map(([l, v, c], i) => (
                  <div key={i} className="row between">
                    <span className="row" style={{ gap: 8 }}><span style={{ width: 8, height: 8, background: c }}/><span style={{ fontSize: 12.5, color: 'var(--t-200)' }}>{l}</span></span>
                    <span className="serif-display" style={{ fontSize: 14, color: 'var(--t-100)' }}>{v}</span>
                  </div>
                ))}
                <div className="divider" style={{ margin: '8px 0' }}/>
                <div className="row between" style={{ fontSize: 12.5 }}>
                  <span style={{ color: 'var(--t-300)' }}>Goal</span>
                  <span style={{ color: 'var(--t-100)' }}>30 muskets</span>
                </div>
              </div>
            </div>

            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost sm"><Icons.Archive style={{ width: 13, height: 13 }}/>Archive</button>
              <button className="btn ghost sm"><Icons.Trash style={{ width: 13, height: 13 }}/>Delete</button>
              <span className="sp"/>
              <button className="btn ghost sm"><Icons.Doc style={{ width: 13, height: 13 }}/>Edit orders</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Event Create / Edit ─────────
function EventCreate() {
  return (
    <AppShell active="events" crumbs={["Events", "New event"]}>
      <div className="page">
        <PageHead eyebrow="Article of Order" title="Draft an Event" sub="Members will be notified once you publish."/>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <div className="col" style={{ gap: 20 }}>
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Particulars</span></div>
              <div className="panel-body col" style={{ gap: 16 }}>
                <div>
                  <label className="field-label">Title</label>
                  <input className="input" defaultValue="Linebattle: Coastal Advance"/>
                </div>
                <div>
                  <label className="field-label">Orders of the day</label>
                  <textarea className="textarea" rows={5} defaultValue={`Formation drill at 19:30 GMT. Linebattle commences at 20:00 sharp. Cavalry expected — square drill mandatory before taking the line.`}/>
                  <div className="row" style={{ gap: 6, marginTop: 8 }}>
                    <button className="btn ghost sm">Bold</button>
                    <button className="btn ghost sm">Italic</button>
                    <button className="btn ghost sm">Link</button>
                    <button className="btn ghost sm">Mention</button>
                  </div>
                </div>
                <div>
                  <label className="field-label">Banner (image or animated GIF)</label>
                  <div className="panel" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 96, height: 54, background: 'url(assets/bg-1.jpg) center/cover', border: '1px solid var(--rule-2)' }}/>
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--t-300)' }}>
                      <div style={{ color: 'var(--t-100)' }}>coastal-advance.jpg</div>
                      <div style={{ fontSize: 11, color: 'var(--t-400)' }}>1920 × 720 · 184 KB · Recommended 16:9</div>
                    </div>
                    <button className="btn ghost sm"><Icons.Upload style={{ width: 13, height: 13 }}/>Replace</button>
                    <button className="btn ghost sm icon"><Icons.X style={{ width: 13, height: 13 }}/></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><span className="panel-title">When</span></div>
              <div className="panel-body grid-2" style={{ gap: 16 }}>
                <div>
                  <label className="field-label">Starts</label>
                  <div className="row" style={{ gap: 8 }}>
                    <input className="input" defaultValue="Sat 31 May 2026" style={{ flex: 2 }}/>
                    <input className="input" defaultValue="20:00" style={{ flex: 1 }}/>
                  </div>
                </div>
                <div>
                  <label className="field-label">Ends</label>
                  <div className="row" style={{ gap: 8 }}>
                    <input className="input" defaultValue="Sat 31 May 2026" style={{ flex: 2 }}/>
                    <input className="input" defaultValue="22:30" style={{ flex: 1 }}/>
                  </div>
                </div>
                <div>
                  <label className="field-label">Time zone</label>
                  <select className="select"><option>GMT (Western Europe)</option></select>
                </div>
                <div>
                  <label className="field-label">Recurring</label>
                  <select className="select"><option>Weekly — Saturdays</option><option>None</option></select>
                </div>
                <div>
                  <label className="field-label">Notify before</label>
                  <div className="row" style={{ gap: 6 }}>
                    {['30m','15m','5m','0m'].map(t => (
                      <span key={t} className="badge" style={{
                        padding: '4px 10px',
                        background: (t === '30m' || t === '5m') ? 'rgba(176,132,54,.16)' : 'var(--ink-700)',
                        borderColor: (t === '30m' || t === '5m') ? 'var(--brass-500)' : 'var(--rule-3)',
                        color: (t === '30m' || t === '5m') ? 'var(--brass-300)' : 'var(--t-300)',
                        cursor: 'pointer',
                      }}>{t}</span>
                    ))}
                    <span className="badge" style={{ padding: '4px 10px', cursor: 'pointer' }}>+ Add</span>
                  </div>
                </div>
                <div>
                  <label className="field-label">Tags</label>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="badge brass">#linebattle</span>
                    <span className="badge brass">#weekly</span>
                    <span className="badge" style={{ cursor: 'pointer' }}>+ Add tag</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><span className="panel-title">Server Details</span></div>
              <div className="panel-body col" style={{ gap: 14 }}>
                <div className="grid-2">
                  <div>
                    <label className="field-label">Server name</label>
                    <input className="input" defaultValue="EU · Holdfast Official 4"/>
                  </div>
                  <div>
                    <label className="field-label">Server password</label>
                    <div className="input-wrap">
                      <Icons.Lock style={{ width: 13, height: 13 }}/>
                      <input className="input has-icon" type="password" defaultValue="redcoat31"/>
                    </div>
                  </div>
                </div>
                <div className="notice warn">
                  <Icons.Eye style={{ width: 16, height: 16, color: 'var(--brass-400)', flex: 'none', marginTop: 1 }}/>
                  <div>
                    <div className="n-title">Password visible to all signed-in members</div>
                    <div className="n-body">Do not enter a password you re-use elsewhere. Audit log will record reveals.</div>
                  </div>
                </div>
                <div>
                  <label className="field-label">Platforms</label>
                  <div className="row" style={{ gap: 8 }}>
                    {[
                      { id: 'steam', l: 'Steam',  Ic: Icons.Steam, sel: true },
                      { id: 'xbox',  l: 'Xbox',   Ic: Icons.Xbox,  sel: true },
                      { id: 'ps',    l: 'PlayStation', Ic: Icons.PS },
                    ].map(o => (
                      <button key={o.id} className="row" style={{
                        gap: 8, padding: '8px 14px',
                        background: o.sel ? 'rgba(176,132,54,.10)' : 'var(--ink-700)',
                        border: o.sel ? '1px solid var(--brass-500)' : '1px solid var(--rule-2)',
                        color: o.sel ? 'var(--brass-300)' : 'var(--t-300)',
                        borderRadius: 2, cursor: 'pointer', fontSize: 12.5,
                      }}>
                        <o.Ic style={{ width: 14, height: 14 }}/>{o.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right sticky preview */}
          <div className="col" style={{ gap: 16, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
            <div className="admin-label">Preview · Event card</div>
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 100, background: 'url(assets/bg-1.jpg) center/cover', filter: 'brightness(.7)' }}/>
              <div style={{ padding: 14 }}>
                <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                  <span className="badge brass dot">Upcoming</span>
                  <span className="badge"><Icons.Reload style={{ width: 10, height: 10 }}/>Weekly</span>
                </div>
                <div className="serif-display" style={{ fontSize: 16, color: 'var(--t-100)' }}>Linebattle: Coastal Advance</div>
                <div className="row" style={{ gap: 8, marginTop: 6, color: 'var(--t-400)', fontSize: 11.5 }}>
                  <Icons.Clock style={{ width: 11, height: 11 }}/>Sat 20:00 GMT
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <PlatformBadges platforms={['steam','xbox']}/>
                </div>
              </div>
            </div>

            <div className="divider"/>
            <button className="btn ghost block">Save draft</button>
            <button className="btn primary block">Publish event</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Gallery Submission ─────────
function GallerySubmit() {
  return (
    <AppShell active="gallery" crumbs={["Gallery", "Submit"]}>
      <div className="page" style={{ maxWidth: 1000 }}>
        <PageHead eyebrow="Field Dispatches" title="Submit to the Archive" sub="Approved items appear in the public gallery. Pending items are visible only to you."/>

        <div className="tabs">
          <span className="tab active">Images / Videos</span>
          <span className="tab">Link (YouTube · Medal · Twitch)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <div className="col" style={{ gap: 18 }}>
            <div className="panel" style={{ padding: 30, textAlign: 'center', borderStyle: 'dashed', borderWidth: 1, background: 'var(--ink-850)' }}>
              <Icons.Upload style={{ width: 28, height: 28, color: 'var(--brass-400)', margin: '0 auto 12px' }}/>
              <div className="serif-display" style={{ fontSize: 20, color: 'var(--t-100)' }}>Drag dispatches here</div>
              <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 4 }}>JPG, PNG, WEBP up to 12 MB · MP4 up to 80 MB · max 10 items per dispatch</div>
              <button className="btn primary" style={{ marginTop: 14 }}>Choose files</button>
            </div>

            <div className="col" style={{ gap: 10 }}>
              {[
                { bg: 'assets/bg-1.jpg', n: 'fort-halen-line-001.jpg', s: '2.1 MB · 3024×1700', tag: 'image' },
                { bg: 'assets/bg-2.jpg', n: 'cavalry-charge.mp4',     s: '38 MB · 24s · 1080p', tag: 'video' },
                { bg: 'assets/banner.png', n: 'volley-dusk.jpg',      s: '1.7 MB · 2880×1620', tag: 'image' },
              ].map((f, i) => (
                <div key={i} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 10 }}>
                  <div style={{ width: 64, height: 48, background: `url(${f.bg}) center/cover`, border: '1px solid var(--rule-2)', flex: 'none', position: 'relative' }}>
                    {f.tag === 'video' && <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 0, height: 0, borderLeft: '8px solid var(--t-100)', borderTop: '5px solid transparent', borderBottom: '5px solid transparent' }}/>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--t-100)' }}>{f.n}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-400)' }}>{f.s}</div>
                  </div>
                  <input className="input" placeholder="Caption (optional)" style={{ width: 220, height: 30, fontSize: 12 }}/>
                  <button className="btn ghost sm icon"><Icons.Trash style={{ width: 13, height: 13 }}/></button>
                </div>
              ))}
            </div>

            <div className="panel">
              <div className="panel-header"><span className="panel-title">Dispatch metadata</span></div>
              <div className="panel-body col" style={{ gap: 14 }}>
                <div>
                  <label className="field-label">Title for this dispatch</label>
                  <input className="input" defaultValue="Fort Halen — the line holds"/>
                </div>
                <div className="grid-2">
                  <div>
                    <label className="field-label">Event</label>
                    <select className="select"><option>Campaign III — Fort Halen · 7 May</option></select>
                  </div>
                  <div>
                    <label className="field-label">Tag members</label>
                    <input className="input" placeholder="@jnolt, @rasher…" defaultValue="@rasher, @swren"/>
                  </div>
                </div>
                <div>
                  <label className="field-label">Tags</label>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="badge brass">#linebattle</span>
                    <span className="badge brass">#victory</span>
                    <span className="badge" style={{ cursor: 'pointer' }}>+ Add tag</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col" style={{ gap: 16 }}>
            <div className="panel" style={{ padding: 18 }}>
              <div className="admin-label brass">Submission Notice</div>
              <div className="serif-display" style={{ fontSize: 16, color: 'var(--t-100)', marginTop: 6 }}>A moderator will review your dispatch</div>
              <p style={{ fontSize: 12.5, color: 'var(--t-300)', lineHeight: 1.6, marginTop: 6 }}>
                You'll receive a Discord DM when it's approved or declined, typically within 24 hours.
                You may edit pending submissions; approved ones are locked but can be deleted.
              </p>
            </div>
            <div className="panel" style={{ padding: 14 }}>
              <div className="admin-label">Allowed types</div>
              <div className="col" style={{ gap: 6, marginTop: 8, fontSize: 12.5, color: 'var(--t-300)' }}>
                <div className="row between"><span>Images</span><span style={{ color: 'var(--t-400)' }}>jpg · png · webp</span></div>
                <div className="row between"><span>Videos</span><span style={{ color: 'var(--t-400)' }}>mp4 · webm</span></div>
                <div className="row between"><span>Links</span><span style={{ color: 'var(--t-400)' }}>YouTube · Medal · Twitch</span></div>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost block">Save draft</button>
              <button className="btn primary block">Submit · 3 files</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Gallery Moderation ─────────
function GalleryMod() {
  const items = [
    { bg: 'assets/bg-1.jpg', t: 'Fort Halen — the line holds', a: 'Cpt. Asher', n: 3, tags: ['linebattle','victory'], sel: true },
    { bg: 'assets/bg-2.jpg', t: 'Bayonet charge across redoubt', a: 'Lt. Nolt', n: 1, tags: ['campaign','clip'] },
    { bg: 'assets/banner.png', t: 'Volley at dusk', a: 'Sgt. Wren', n: 1, tags: ['drill'] },
    { bg: 'assets/bg-2.jpg', t: 'Twitch VOD — full match', a: 'Pvt. Calder', n: 1, tags: ['vod','link'] },
  ];
  return (
    <AppShell active="gallery" crumbs={["Gallery", "Moderation"]}>
      <div className="page" style={{ maxWidth: 'none' }}>
        <PageHead eyebrow="Sentry Duty" title="Gallery Moderation"
          sub="9 dispatches awaiting approval. Approve, decline with reason, or strike."
          actions={<>
            <button className="btn ghost">Filter</button>
            <button className="btn secondary">Auto-approve trusted members <span className="toggle on" style={{ marginLeft: 6 }}/></button>
          </>}/>
        <div className="tabs">
          <span className="tab active">Pending · 9</span>
          <span className="tab">Recently approved · 41</span>
          <span className="tab">Declined · 6</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>
          <div className="grid-2" style={{ gap: 12 }}>
            {items.map((it, i) => (
              <div key={i} className="panel" style={{
                padding: 0, position: 'relative',
                borderColor: it.sel ? 'var(--brass-500)' : 'var(--rule)',
                outline: it.sel ? '1px solid var(--brass-500)' : 'none',
              }}>
                <div style={{ aspectRatio: '16/10', background: `url(${it.bg}) center/cover` }}/>
                <div style={{ padding: 12 }}>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <span className="serif-display" style={{ fontSize: 13.5, color: 'var(--t-100)' }}>{it.t}</span>
                    <span className="badge" style={{ padding: '1px 5px', fontSize: 9.5 }}>{it.n} file{it.n !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="row between">
                    <div className="row" style={{ gap: 6, color: 'var(--t-400)', fontSize: 11 }}>
                      <Avatar name={it.a} size={18}/>{it.a}
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn ghost sm icon" title="Approve"><Icons.Check style={{ width: 13, height: 13, color: 'var(--ok)' }}/></button>
                      <button className="btn ghost sm icon" title="Decline"><Icons.X style={{ width: 13, height: 13, color: 'var(--err)' }}/></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="row" style={{ gap: 12 }}>
                <Avatar name="Cpt Asher" size={28}/>
                <div>
                  <div className="serif-display" style={{ fontSize: 15, color: 'var(--t-100)' }}>Fort Halen — the line holds</div>
                  <div style={{ fontSize: 11, color: 'var(--t-400)' }}>By @rasher · Submitted 4h ago · 3 files</div>
                </div>
              </div>
              <span className="badge brass">Pending</span>
            </div>
            <div className="panel-body">
              <div style={{ aspectRatio: '16/9', background: 'url(assets/bg-1.jpg) center/cover', border: '1px solid var(--rule-2)', borderRadius: 3 }}/>
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ flex: 1, aspectRatio: '4/3', background: `url(assets/bg-${i === 2 ? 2 : 1}.jpg) center/cover`, border: '1px solid var(--rule-2)', opacity: i === 1 ? 1 : .55 }}/>
                ))}
              </div>

              <div className="divider"/>
              <div className="grid-2" style={{ gap: 10 }}>
                <div>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>Caption</div>
                  <div style={{ color: 'var(--t-200)', fontSize: 13, marginTop: 4 }}>"Second round of muskets — when their cavalry committed."</div>
                </div>
                <div>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>Event linked</div>
                  <div style={{ color: 'var(--t-200)', fontSize: 13, marginTop: 4 }}>Campaign III · Fort Halen · 7 May</div>
                </div>
                <div>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>Tags</div>
                  <div className="row" style={{ gap: 4, marginTop: 4 }}>
                    <span className="badge brass">#linebattle</span>
                    <span className="badge brass">#victory</span>
                  </div>
                </div>
                <div>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>Tagged members</div>
                  <div className="row" style={{ gap: 4, marginTop: 4 }}>
                    <span className="badge">@rasher</span>
                    <span className="badge">@swren</span>
                  </div>
                </div>
              </div>

              <div className="divider"/>
              <label className="field-label">Decline reason (optional · sent to submitter)</label>
              <textarea className="textarea" placeholder="e.g., Image too dark to make out the action — please re-upload an exposure-corrected version." rows={3}/>

              <div className="row between" style={{ marginTop: 14 }}>
                <button className="btn destructive"><Icons.X style={{ width: 13, height: 13 }}/>Decline</button>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn ghost">Skip</button>
                  <button className="btn primary"><Icons.Check style={{ width: 13, height: 13 }}/>Approve · publish</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Audit Logs ─────────
function AuditLogs() {
  const rows = [
    { d: 'Today 14:22', a: 'A. Holcombe', act: 'rank.change', t: '@btrager: Private → Corporal', sev: 'info', sel: true },
    { d: 'Today 13:01', a: 'Quartermaster', act: 'discord.sync', t: '4 rank changes synced to Discord', sev: 'info' },
    { d: 'Today 11:48', a: 'D. Vasquez', act: 'medal.award', t: 'Awarded Marksman ★ to @jnolt', sev: 'info' },
    { d: 'Today 09:14', a: 'R. Asher', act: 'application.approve', t: 'Approved @erskine', sev: 'info' },
    { d: 'Yest 22:08', a: 'A. Holcombe', act: 'user.ban', t: 'Suspended @xhand for 7d (cheating)', sev: 'warn' },
    { d: 'Yest 19:30', a: 'Quartermaster', act: 'event.publish', t: 'Published "Linebattle: Coastal Advance"', sev: 'info' },
    { d: 'Yest 17:02', a: 'D. Vasquez', act: 'event.password.reveal', t: 'Revealed server password (event #312)', sev: 'warn' },
    { d: 'Yest 14:00', a: 'A. Holcombe', act: 'rank.delete', t: 'Removed rank "Provost"', sev: 'err' },
    { d: '2d 18:11', a: 'J. Nolt', act: 'application.decline', t: 'Declined @duncanT — incomplete', sev: 'info' },
    { d: '2d 12:22', a: 'A. Holcombe', act: 'role.permission.change', t: 'Granted Moderator → events.delete', sev: 'warn' },
    { d: '3d 09:00', a: 'System', act: 'backup.complete', t: 'Nightly backup · 412 MB', sev: 'info' },
  ];
  const sevTone = { info: '', warn: 'brass', err: 'ox' };
  return (
    <AppShell active="audit" crumbs={["Command", "Audit Ledger"]}>
      <div className="page" style={{ maxWidth: 'none' }}>
        <PageHead eyebrow="Ledger of Record" title="Audit Ledger" sub="Immutable log of administrative actions. Retained for 13 months."
          actions={<>
            <button className="btn ghost"><Icons.Doc style={{ width: 14, height: 14 }}/>Export CSV</button>
            <button className="btn ghost"><Icons.Filter style={{ width: 14, height: 14 }}/>Filters</button>
          </>}/>

        <div className="row" style={{ gap: 10, marginBottom: 14 }}>
          <div className="input-wrap" style={{ width: 280 }}>
            <Icons.Search style={{ width: 13, height: 13 }}/>
            <input className="input has-icon" placeholder="Search by user, action, free text…" style={{ height: 32, fontSize: 12.5 }}/>
          </div>
          <select className="select" style={{ width: 160, height: 32, fontSize: 12.5 }}><option>All actors</option></select>
          <select className="select" style={{ width: 160, height: 32, fontSize: 12.5 }}><option>All actions</option></select>
          <select className="select" style={{ width: 140, height: 32, fontSize: 12.5 }}><option>Last 7 days</option></select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
          <div className="panel" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr><th>When</th><th>Actor</th><th>Action</th><th>Target / Detail</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: r.sel ? 'rgba(176,132,54,.06)' : 'transparent', cursor: 'pointer', borderLeft: r.sel ? '2px solid var(--brass-400)' : '2px solid transparent' }}>
                    <td className="mono" style={{ fontSize: 11.5, color: 'var(--t-400)', width: 110 }}>{r.d}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <Avatar name={r.a} size={22}/>
                        <span style={{ fontSize: 12.5 }}>{r.a}</span>
                      </div>
                    </td>
                    <td><span className={"badge " + sevTone[r.sev]} style={{ fontFamily: 'var(--mono)', padding: '2px 6px' }}>{r.act}</span></td>
                    <td style={{ fontSize: 12.5 }}>{r.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Drawer */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Entry · #18432</span>
              <span className="badge">rank.change</span>
            </div>
            <div className="panel-body col" style={{ gap: 14 }}>
              <div className="row" style={{ gap: 12 }}>
                <Avatar name="A Holcombe" size={36}/>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--t-100)' }}>Alistair Holcombe</div>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>Owner · Today 14:22 GMT</div>
                </div>
              </div>
              <div className="parchment" style={{ padding: 12, fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--parch-900)', lineHeight: 1.5 }}>
                Promoted <strong>@btrager</strong> from <em>Private</em> to <em>Corporal</em> following the trial drill of 21 May. Discord role <code>Lords · Cpl.</code> assigned automatically.
              </div>

              <div className="grid-2" style={{ gap: 10, fontSize: 12 }}>
                <div className="panel" style={{ padding: 10, background: 'var(--ink-850)' }}>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>Before</div>
                  <div style={{ color: 'var(--t-200)', marginTop: 4 }}>Private</div>
                </div>
                <div className="panel" style={{ padding: 10, background: 'var(--ink-850)' }}>
                  <div className="admin-label" style={{ fontSize: 9.5 }}>After</div>
                  <div style={{ color: 'var(--brass-300)', marginTop: 4 }}>Corporal</div>
                </div>
              </div>

              <div className="col" style={{ gap: 6, fontSize: 12, color: 'var(--t-300)' }}>
                <div className="row between"><span className="admin-label" style={{ fontSize: 9.5 }}>Target user</span><span>@btrager</span></div>
                <div className="row between"><span className="admin-label" style={{ fontSize: 9.5 }}>Actor IP</span><span className="mono" style={{ color: 'var(--t-400)' }}>176.×××.×××.221</span></div>
                <div className="row between"><span className="admin-label" style={{ fontSize: 9.5 }}>Discord sync</span><span className="badge laurel dot" style={{ padding: '1px 5px', fontSize: 9.5 }}>Applied</span></div>
                <div className="row between"><span className="admin-label" style={{ fontSize: 9.5 }}>Request ID</span><span className="mono" style={{ color: 'var(--t-400)' }}>req-9a4f-cb12</span></div>
              </div>

              <div className="divider"/>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn ghost sm" style={{ flex: 1 }}>View target profile</button>
                <button className="btn ghost sm" style={{ flex: 1 }}>All entries by actor</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Settings ─────────
function SettingsPage() {
  return (
    <AppShell active="settings" crumbs={["Settings"]}>
      <div className="page" style={{ maxWidth: 'none', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, padding: '22px 24px 40px' }}>
        <aside className="col" style={{ gap: 4, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
          <div className="admin-label brass" style={{ padding: '4px 8px' }}>Regiment</div>
          {[
            { l: 'Profile', a: true },
            { l: 'Discord connection' },
            { l: 'Quartermaster bot' },
            { l: 'Roles & permissions' },
          ].map(i => <div key={i.l} className={"nav-item " + (i.a ? 'active' : '')}>{i.l}</div>)}

          <div className="admin-label brass" style={{ padding: '12px 8px 4px' }}>Operations</div>
          {[
            'Gallery limits',
            'Event defaults',
            'Holdfast server (optional)',
            'Backups & exports',
          ].map(l => <div key={l} className="nav-item">{l}</div>)}

          <div className="admin-label brass" style={{ padding: '12px 8px 4px' }}>Compliance</div>
          {[
            'Privacy & GDPR',
            'Transfer Discord server',
            'Transfer ownership',
          ].map(l => <div key={l} className="nav-item">{l}</div>)}
        </aside>

        <div className="col" style={{ gap: 22 }}>
          <PageHead title="Settings — Regiment Profile" sub="Edits are recorded to the audit ledger."/>

          <div className="panel">
            <div className="panel-header"><span className="panel-title">Identity</span></div>
            <div className="panel-body grid-2" style={{ gap: 18 }}>
              <div><label className="field-label">Regiment Name</label><input className="input" defaultValue="Lord Regiment"/></div>
              <div><label className="field-label">Short Tag</label><input className="input" defaultValue="Lords"/></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Mission Statement</label>
                <textarea className="textarea" defaultValue="A line-infantry company in Holdfast: Nations at War. We drill three nights a week, field 30–60 muskets on event nights, and conduct ourselves like men who intend to still be standing at the end of the line."/>
              </div>
              <div>
                <label className="field-label">Crest</label>
                <div className="panel" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ink-850)' }}>
                  <Crest size={42}/><div style={{ flex: 1, fontSize: 12, color: 'var(--t-300)' }}>regiment-logo.png · 256×256</div>
                  <button className="btn ghost sm">Replace</button>
                </div>
              </div>
              <div>
                <label className="field-label">Banner</label>
                <div className="panel" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ink-850)' }}>
                  <div style={{ width: 56, height: 32, background: 'url(assets/banner.png) center/cover' }}/><div style={{ flex: 1, fontSize: 12, color: 'var(--t-300)' }}>field-banner.png</div>
                  <button className="btn ghost sm">Replace</button>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span className="panel-title">Visibility</span></div>
            <div className="panel-body col" style={{ gap: 14 }}>
              {[
                { l: 'Public landing page', d: 'Show the regiment on the open web', on: true },
                { l: 'Public events listing', d: 'Show upcoming and ongoing events to visitors', on: true },
                { l: 'Public gallery', d: 'Display approved dispatches publicly', on: true },
                { l: 'Officers’ Mess on landing', d: 'List officer ranks on the public landing', on: true },
                { l: 'Allow mercenaries', d: 'Players may join short-term without applying', on: false },
              ].map(r => (
                <div key={r.l} className="row between">
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--t-100)' }}>{r.l}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--t-400)' }}>{r.d}</div>
                  </div>
                  <span className={"toggle " + (r.on ? 'on' : '')}/>
                </div>
              ))}
            </div>
          </div>

          {/* Permission matrix */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Permission Matrix</span>
              <button className="btn ghost sm"><Icons.Plus style={{ width: 13, height: 13 }}/>Custom role</button>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: '36%' }}>Capability</th>
                    <th>Owner</th><th>Admin</th><th>Moderator</th><th>Member</th><th>Mercenary</th><th>Applicant</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Manage events',           [1,1,1,0,0,0]],
                    ['Approve gallery',          [1,1,1,0,0,0]],
                    ['Review applications',      [1,1,1,0,0,0]],
                    ['Award medals',             [1,1,0,0,0,0]],
                    ['Change rank',              [1,1,0,0,0,0]],
                    ['Manage roles & permissions',[1,0,0,0,0,0]],
                    ['Transfer ownership',       [1,0,0,0,0,0]],
                    ['Reveal event passwords',   [1,1,1,1,0,0]],
                    ['Submit to gallery',        [1,1,1,1,1,0]],
                    ['View members directory',   [1,1,1,1,1,0]],
                  ].map(([cap, row], i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13, color: 'var(--t-200)' }}>{cap}</td>
                      {row.map((v, j) => (
                        <td key={j}>
                          {j === 0 ? (
                            <span className="row" style={{ gap: 6, color: 'var(--brass-300)' }}><Icons.Check style={{ width: 13, height: 13 }}/><span className="admin-label" style={{ fontSize: 9.5 }}>Locked</span></span>
                          ) : v ? (
                            <span className="check on" style={{ width: 14, height: 14 }}/>
                          ) : (
                            <span className="check" style={{ width: 14, height: 14 }}/>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance section */}
          <div className="panel" style={{ borderColor: 'var(--oxblood-700)' }}>
            <div className="panel-header">
              <span className="panel-title" style={{ color: 'var(--oxblood-300)' }}>Hazardous Operations</span>
              <span className="badge ox">Irreversible</span>
            </div>
            <div className="panel-body col" style={{ gap: 12 }}>
              {[
                { t: 'Transfer ownership',    d: 'Hand command of the regiment to another member.', cta: 'Begin transfer' },
                { t: 'Move to a different Discord server', d: 'Re-bind the website to a new Discord server while preserving members.', cta: 'Begin migration' },
                { t: 'Self-destruct the regiment', d: 'Permanently delete this regiment, all data, and revoke the bot.', cta: 'Open dissolution form', danger: true },
              ].map(r => (
                <div key={r.t} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--rule)' }}>
                  <div>
                    <div style={{ color: r.danger ? 'var(--oxblood-300)' : 'var(--t-100)', fontSize: 13.5 }}>{r.t}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--t-400)', marginTop: 2 }}>{r.d}</div>
                  </div>
                  <button className={"btn " + (r.danger ? 'destructive' : 'ghost')}>{r.cta}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="row between" style={{ padding: '0 0 18px' }}>
            <span style={{ fontSize: 12, color: 'var(--t-400)' }}>Last saved 2 minutes ago by Alistair Holcombe.</span>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn ghost">Discard</button>
              <button className="btn primary">Save changes</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ───────── Discord Bot Status ─────────
function BotStatus() {
  return (
    <AppShell active="settings" crumbs={["Settings", "Quartermaster bot"]}>
      <div className="page" style={{ maxWidth: 1080 }}>
        <PageHead eyebrow="System Health" title="Quartermaster Bot"
          sub="The bot that manages Discord role syncing, application notifications, and event reminders."
          actions={<>
            <button className="btn ghost"><Icons.Reload style={{ width: 14, height: 14 }}/>Resync now</button>
            <button className="btn ghost">Re-invite</button>
          </>}/>

        <div className="grid-3" style={{ gap: 14, marginBottom: 22 }}>
          <StatTile label="Connection" value={<span style={{ color: 'var(--ok)' }}>Online</span>} foot="Uptime 11d 4h"/>
          <StatTile label="Server members visible" value="84 / 84" foot="Last full sync 6m ago"/>
          <StatTile label="Roles under bot's authority" value="9" foot="Out of 14 total roles"/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Recent operations</span><span className="badge laurel dot">All healthy</span></div>
            <div>
              {[
                { d: '14:22', op: 'Assigned role Lords · Cpl. to @btrager', ok: true },
                { d: '13:55', op: 'Sent DM to @erskine — application approved', ok: true },
                { d: '13:01', op: 'Resync batch · 4 rank changes applied', ok: true },
                { d: '11:48', op: 'Assigned role Lords · Marksman ★ to @jnolt', ok: true },
                { d: '11:30', op: 'Posted event reminder · #drill-hall', ok: true },
                { d: '08:14', op: 'Could not edit role Lords · Colonel — bot below in role order', ok: false },
                { d: '06:00', op: 'Cleaned up 3 orphaned roles in Discord', ok: true },
              ].map((r, i, a) => (
                <div key={i} className="row" style={{ padding: '10px 16px', gap: 12, borderBottom: i < a.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--t-400)', width: 56 }}>{r.d}</span>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: r.ok ? 'var(--ok)' : 'var(--err)', flex: 'none' }}/>
                  <span style={{ fontSize: 12.5, color: r.ok ? 'var(--t-200)' : 'var(--oxblood-300)', flex: 1 }}>{r.op}</span>
                  {!r.ok && <button className="btn ghost sm">Resolve</button>}
                </div>
              ))}
            </div>
          </div>

          <div className="col" style={{ gap: 16 }}>
            <div className="panel" style={{ padding: 18, background: 'rgba(43,62,85,.16)', borderColor: 'var(--regblue-700)' }}>
              <Icons.Discord style={{ width: 28, height: 28, color: '#7f8df4' }}/>
              <div className="serif-display" style={{ fontSize: 18, color: 'var(--t-100)', marginTop: 8 }}>Quartermaster v3.4</div>
              <div className="col" style={{ gap: 6, marginTop: 10, fontSize: 12 }}>
                <div className="row between"><span className="admin-label" style={{ fontSize: 9.5 }}>Server</span><span style={{ color: 'var(--t-200)' }}>Lord Regiment HQ</span></div>
                <div className="row between"><span className="admin-label" style={{ fontSize: 9.5 }}>Server ID</span><span className="mono" style={{ color: 'var(--t-400)' }}>1107…29421</span></div>
                <div className="row between"><span className="admin-label" style={{ fontSize: 9.5 }}>Bot role position</span><span style={{ color: 'var(--brass-300)' }}>#2 of 14</span></div>
                <div className="row between"><span className="admin-label" style={{ fontSize: 9.5 }}>Last heartbeat</span><span style={{ color: 'var(--t-200)' }}>4 seconds ago</span></div>
              </div>
            </div>

            <div className="notice warn">
              <Icons.Shield style={{ width: 16, height: 16, color: 'var(--brass-400)', flex: 'none', marginTop: 1 }}/>
              <div>
                <div className="n-title">One role is above the bot</div>
                <div className="n-body">The role <span style={{ color: 'var(--t-200)' }}>Lords · Colonel</span> sits above the bot in Discord. The bot cannot assign or revoke it.</div>
                <button className="btn ghost sm" style={{ marginTop: 10 }}>Open Discord role list</button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><span className="panel-title">Permissions check</span></div>
              <div className="panel-body col" style={{ gap: 8, fontSize: 12.5 }}>
                {[
                  ['View channels', 1], ['Send messages', 1], ['Manage roles', 1], ['View server members', 1], ['Send DMs to members', 1], ['Add reactions', 0],
                ].map(([k, ok], i) => (
                  <div key={i} className="row between">
                    <span style={{ color: 'var(--t-300)' }}>{k}</span>
                    {ok ? <span className="row" style={{ gap: 4, color: 'var(--ok)' }}><Icons.Check style={{ width: 13, height: 13 }}/>Granted</span>
                        : <span className="row" style={{ gap: 4, color: 'var(--t-500)' }}><Icons.X style={{ width: 13, height: 13 }}/>Missing</span>}
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

// ───────── GDPR Self-Delete ─────────
function GdprDelete() {
  return (
    <AppShell active="profile" crumbs={["Profile", "Self-destruction"]}>
      <div style={{ maxWidth: 720, margin: '36px auto', padding: '0 28px 40px' }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="wax" style={{ background: 'radial-gradient(circle at 35% 30%, #5e1e16, #2c0b07 70%)', borderColor: '#1a0604' }}>Sealed<br/>Order</div>
          <div>
            <div className="admin-label" style={{ color: 'var(--oxblood-300)' }}>Solemn Notice · Article XIV</div>
            <h1 className="serif-display" style={{ fontSize: 32, color: 'var(--t-100)', marginTop: 4 }}>Discharge & destruction of your account</h1>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 24, padding: 22, borderColor: 'var(--oxblood-700)' }}>
          <div className="parchment" style={{ padding: 22, fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--parch-900)', lineHeight: 1.65 }}>
            <em>"Be it known: the bearer requests honorable discharge from the regiment, and the
            permanent destruction of all records held in their name. This act, once executed,
            cannot be undone."</em>
            <div style={{ fontSize: 12, color: 'var(--t-on-parch-2)', marginTop: 14, letterSpacing: '.08em', textTransform: 'uppercase' }}>— Privacy Charter, in compliance with GDPR Art. 17</div>
          </div>

          <CrestDivider>What will be destroyed</CrestDivider>

          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', color: 'var(--t-200)', fontSize: 13.5, lineHeight: 1.9 }}>
            <li className="row" style={{ gap: 10 }}><Icons.X style={{ width: 13, height: 13, color: 'var(--oxblood-300)' }}/>Your account, profile, in-game name, and Discord linkage</li>
            <li className="row" style={{ gap: 10 }}><Icons.X style={{ width: 13, height: 13, color: 'var(--oxblood-300)' }}/>All gallery submissions, drafts, and tagged appearances</li>
            <li className="row" style={{ gap: 10 }}><Icons.X style={{ width: 13, height: 13, color: 'var(--oxblood-300)' }}/>Your RSVPs and attendance records</li>
            <li className="row" style={{ gap: 10 }}><Icons.X style={{ width: 13, height: 13, color: 'var(--oxblood-300)' }}/>All Discord roles assigned by Quartermaster</li>
            <li className="row" style={{ gap: 10 }}><Icons.Check style={{ width: 13, height: 13, color: 'var(--t-400)' }}/><span style={{ color: 'var(--t-400)' }}>Audit ledger entries about your account remain, by law, for 13 months</span></li>
          </ul>

          <CrestDivider>To execute</CrestDivider>

          <div className="col" style={{ gap: 16, marginTop: 14 }}>
            <div>
              <label className="field-label" style={{ color: 'var(--oxblood-300)' }}>Type <span className="mono">DELETE</span> to confirm</label>
              <input className="input mono" placeholder="DELETE" style={{ letterSpacing: '.2em', fontSize: 14, borderColor: 'var(--oxblood-600)' }}/>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span className="check"/>
              <span style={{ fontSize: 13, color: 'var(--t-200)' }}>I understand this is permanent and cannot be reversed.</span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span className="check"/>
              <span style={{ fontSize: 13, color: 'var(--t-200)' }}>I have downloaded a copy of my data, if I wish to keep it.</span>
            </div>

            <div className="panel" style={{ padding: 14, background: 'var(--ink-850)' }}>
              <div className="admin-label">Final step</div>
              <div className="row between" style={{ marginTop: 8 }}>
                <div className="row" style={{ gap: 10 }}>
                  <Icons.Discord style={{ width: 18, height: 18, color: '#7f8df4' }}/>
                  <span style={{ fontSize: 13, color: 'var(--t-200)' }}>Re-authenticate with Discord to authorize the dissolution.</span>
                </div>
                <DiscordBtn>Re-authenticate</DiscordBtn>
              </div>
            </div>
          </div>

          <div className="rule-ornament" style={{ margin: '22px 0 14px' }}><span className="pip"/></div>

          <div className="row between">
            <button className="btn ghost">Download my data first</button>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn muted">Return to Profile</button>
              <button className="btn destructive" disabled style={{ opacity: .6, cursor: 'not-allowed' }}><Icons.Trash style={{ width: 14, height: 14 }}/>Execute discharge</button>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 16, color: 'var(--t-500)', fontSize: 11.5, justifyContent: 'center' }}>
          <Icons.Shield style={{ width: 12, height: 12 }}/>
          A confirmation will be DM'd to you on Discord before execution.
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, {
  ApplicationsReview, RanksMedals, EventDetail, EventCreate,
  GallerySubmit, GalleryMod, AuditLogs, SettingsPage, BotStatus, GdprDelete,
});
