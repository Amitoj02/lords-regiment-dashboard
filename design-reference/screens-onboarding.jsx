/* eslint-disable */
// Holdfast — Onboarding: Owner setup wizard, Application form
const { useState: useOB } = React;

// ───────── Owner Setup Wizard ─────────
function OwnerSetup({ initStep = 2 }) {
  const [step, setStep] = useOB(initStep);
  const steps = [
    { n: 1, l: 'Sign in' },
    { n: 2, l: 'Regiment' },
    { n: 3, l: 'Discord' },
    { n: 4, l: 'Roles' },
    { n: 5, l: 'Review' },
  ];

  return (
    <div className="app-root grain" style={{ height: '100%', display: 'flex', background: 'var(--ink-900)' }}>
      {/* Side strip */}
      <div style={{ width: 320, background: 'var(--ink-850)', borderRight: '1px solid var(--rule)', padding: '40px 32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'url(assets/bg-1.jpg) center/cover', opacity: .08, filter: 'saturate(.4)' }}/>
        <div style={{ position: 'relative' }}>
          <div className="row" style={{ gap: 12, marginBottom: 36 }}>
            <Crest size={42}/>
            <div>
              <div className="serif" style={{ fontSize: 18, color: 'var(--brass-300)', fontWeight: 600 }}>Holdfast Command</div>
              <div className="admin-label" style={{ fontSize: 9.5 }}>Charter of Establishment</div>
            </div>
          </div>

          <div className="admin-label brass">Onboarding · 5 articles</div>
          <h2 className="serif-display" style={{ fontSize: 26, color: 'var(--t-100)', marginTop: 8, lineHeight: 1.2 }}>
            Establish your regiment's<br/>command post.
          </h2>
          <p style={{ fontSize: 13, color: 'var(--t-300)', lineHeight: 1.6, marginTop: 14 }}>
            We'll provision your instance, link your Discord, and seed the default rank ladder.
            You can revise everything later.
          </p>

          <div className="col" style={{ gap: 4, marginTop: 36 }}>
            {steps.map((s, i) => {
              const done = step > s.n;
              const cur  = step === s.n;
              return (
                <div key={s.n} className="row" style={{ gap: 12, padding: '10px 4px', borderLeft: cur ? '2px solid var(--brass-400)' : '2px solid transparent', paddingLeft: 12, marginLeft: -14 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 999,
                    border: '1px solid ' + (cur || done ? 'var(--brass-500)' : 'var(--rule-3)'),
                    background: done ? 'var(--brass-500)' : 'transparent',
                    color: done ? '#1a1306' : (cur ? 'var(--brass-300)' : 'var(--t-500)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, flex: 'none',
                  }}>
                    {done ? <Icons.Check style={{ width: 12, height: 12 }}/> : s.n}
                  </div>
                  <div>
                    <div className="admin-label" style={{ fontSize: 9 }}>Article {String(s.n).padStart(2,'0')}</div>
                    <div style={{ fontSize: 13, color: cur ? 'var(--t-100)' : (done ? 'var(--t-200)' : 'var(--t-400)') }}>{s.l}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sp" style={{ flex: 1, minHeight: 40 }}/>
          <div className="wax" style={{ width: 64, height: 64, fontSize: 9, marginTop: 32 }}>Char-<br/>tering</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '48px 64px', overflow: 'auto' }}>
        <CrestDivider>Article II · Regiment Details</CrestDivider>

        <div style={{ maxWidth: 720, marginTop: 18 }}>
          <h1 className="serif-display" style={{ fontSize: 38, color: 'var(--t-100)', lineHeight: 1.1 }}>
            Inscribe the colors of your regiment.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--t-300)', lineHeight: 1.6, marginTop: 10, maxWidth: 580 }}>
            These details appear on the public noticeboard and on every dispatch the regiment publishes.
            Choose deliberately — they're easier to draft now than to revise later.
          </p>

          <div className="col" style={{ gap: 22, marginTop: 36 }}>
            <div className="grid-2">
              <div>
                <label className="field-label">Regiment Name</label>
                <input className="input" defaultValue="Lord Regiment"/>
                <div className="field-hint">Appears in page titles, Discord messages, and audit entries.</div>
              </div>
              <div>
                <label className="field-label">Short Tag</label>
                <input className="input" defaultValue="Lords"/>
                <div className="field-hint">Used in event roll-calls and ledger entries.</div>
              </div>
            </div>

            <div>
              <label className="field-label">Mission Statement</label>
              <textarea className="textarea" defaultValue={`A line-infantry company in Holdfast: Nations at War. We drill three nights a week, field 30–60 muskets on event nights, and conduct ourselves like men who intend to still be standing at the end of the line.`}/>
              <div className="field-hint">Plain text. Up to 400 characters. Shown on the public landing page.</div>
            </div>

            <div className="grid-2" style={{ gap: 22 }}>
              <div>
                <label className="field-label">Regiment Crest</label>
                <div className="panel" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Crest size={56}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--t-200)' }}>regiment-logo.png</div>
                    <div style={{ fontSize: 11, color: 'var(--t-400)', marginTop: 2 }}>256×256 · 105 KB · Replace recommended at 512×512+</div>
                  </div>
                  <button className="btn ghost sm"><Icons.Upload style={{ width: 13, height: 13 }}/>Replace</button>
                </div>
              </div>
              <div>
                <label className="field-label">Banner Image</label>
                <div className="panel" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 72, height: 40, background: 'url(assets/banner.png) center/cover', border: '1px solid var(--rule-2)' }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--t-200)' }}>field-banner.png</div>
                    <div style={{ fontSize: 11, color: 'var(--t-400)', marginTop: 2 }}>1920×640 · 861 KB</div>
                  </div>
                  <button className="btn ghost sm"><Icons.Upload style={{ width: 13, height: 13 }}/>Replace</button>
                </div>
              </div>
            </div>

            <div>
              <label className="field-label">Charter Accent · Brass Tone</label>
              <div className="row" style={{ gap: 8 }}>
                {[
                  { l: 'Antique Brass',  c: '#b08436', sel: true },
                  { l: 'Bronze',         c: '#8d6724' },
                  { l: 'Steel',          c: '#6b7280' },
                  { l: 'Oxblood',        c: '#8a382f' },
                  { l: 'Laurel',         c: '#556b48' },
                  { l: 'Parchment',      c: '#c9b98e' },
                ].map(o => (
                  <button key={o.l} className="panel" style={{
                    background: 'var(--ink-800)', padding: 8, display: 'flex', alignItems: 'center', gap: 8,
                    border: o.sel ? '1px solid var(--brass-400)' : '1px solid var(--rule-2)', cursor: 'pointer',
                  }}>
                    <span style={{ width: 14, height: 14, background: o.c, border: '1px solid rgba(0,0,0,.4)' }}/>
                    <span style={{ fontSize: 11.5, color: o.sel ? 'var(--brass-300)' : 'var(--t-300)' }}>{o.l}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rule-ornament" style={{ marginTop: 44 }}><span className="pip"/></div>

          <div className="row between" style={{ marginTop: 24 }}>
            <button className="btn ghost"><Icons.ChevL style={{ width: 14, height: 14 }}/>Back to Sign-in</button>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn muted">Save & exit</button>
              <button className="btn primary">Inscribe & continue<Icons.ChevR style={{ width: 14, height: 14 }}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── Owner Setup · Step 3 Discord ─────────
function OwnerSetupDiscord() {
  return (
    <div className="app-root grain" style={{ height: '100%', display: 'flex', background: 'var(--ink-900)' }}>
      <div style={{ width: 320, background: 'var(--ink-850)', borderRight: '1px solid var(--rule)', padding: 32 }}>
        <div className="row" style={{ gap: 12, marginBottom: 28 }}>
          <Crest size={40}/>
          <div>
            <div className="serif" style={{ fontSize: 17, color: 'var(--brass-300)', fontWeight: 600 }}>Holdfast Command</div>
            <div className="admin-label" style={{ fontSize: 9.5 }}>Article III</div>
          </div>
        </div>
        <div className="admin-label brass">Step 3 of 5</div>
        <h2 className="serif-display" style={{ fontSize: 24, color: 'var(--t-100)', marginTop: 6 }}>Bind to Discord</h2>
        <p style={{ fontSize: 13, color: 'var(--t-300)', lineHeight: 1.6, marginTop: 10 }}>
          The regiment's Discord server is the source of truth for membership and role assignments.
          Invite the bot, then post a permanent invite link below.
        </p>

        <div className="divider"/>
        <div className="col" style={{ gap: 10 }}>
          {['Owner authentication','Regiment chartered','Discord server (in progress)','Default rank ladder','Final review & launch'].map((s, i) => (
            <div key={i} className="row" style={{ gap: 10, fontSize: 12.5, color: i < 2 ? 'var(--t-200)' : (i === 2 ? 'var(--brass-300)' : 'var(--t-500)') }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: i < 2 ? 'var(--ok)' : (i === 2 ? 'var(--brass-400)' : 'var(--rule-3)') }}/>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: 56, overflow: 'auto' }}>
        <div style={{ maxWidth: 740 }}>
          <h1 className="serif-display" style={{ fontSize: 36, color: 'var(--t-100)', lineHeight: 1.1 }}>
            Invite the Quartermaster bot.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--t-300)', marginTop: 8, lineHeight: 1.6 }}>
            The bot syncs Discord roles to ranks and medals, validates membership on sign-in, and
            posts event announcements at the times you schedule.
          </p>

          <div className="panel" style={{ marginTop: 30, padding: 22 }}>
            <div className="row between">
              <div className="row" style={{ gap: 14 }}>
                <div style={{ width: 56, height: 56, background: 'var(--ink-700)', border: '1px solid var(--rule-3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icons.Discord style={{ width: 28, height: 28, color: '#7f8df4' }}/>
                </div>
                <div>
                  <div className="serif-display" style={{ fontSize: 18, color: 'var(--t-100)' }}>Quartermaster · v3.4</div>
                  <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 2 }}>Requires: Manage Roles, Send Messages, View Server Members</div>
                </div>
              </div>
              <button className="btn discord">Invite to Discord <Icons.Ext style={{ width: 13, height: 13 }}/></button>
            </div>

            <div className="divider"/>

            <div className="col" style={{ gap: 16 }}>
              <div>
                <label className="field-label">Permanent Invite Link</label>
                <div className="input-wrap">
                  <Icons.Link style={{ width: 14, height: 14 }}/>
                  <input className="input has-icon" defaultValue="https://discord.gg/lord-regiment"/>
                </div>
                <div className="field-hint">This appears on the public landing page. Use a permanent invite — temporary invites will silently expire.</div>
              </div>

              <div className="grid-2">
                <div>
                  <label className="field-label">Server ID</label>
                  <input className="input mono" defaultValue="000000000000000000"/>
                </div>
                <div>
                  <label className="field-label">Bot connection status</label>
                  <div className="panel" style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(106,139,78,.06)', borderColor: 'var(--laurel-600)' }}>
                    <span className="status-dot discord-on"/>
                    <span style={{ fontSize: 12.5, color: 'var(--t-200)' }}>Connected to <span className="bright">Lord Regiment HQ</span></span>
                    <span className="sp"/>
                    <span style={{ fontSize: 11, color: 'var(--t-400)' }}>84 members visible</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="notice warn" style={{ marginTop: 18 }}>
            <Icons.Shield style={{ width: 16, height: 16, color: 'var(--brass-400)', flex: 'none', marginTop: 1 }}/>
            <div>
              <div className="n-title">The bot requires a high role position</div>
              <div className="n-body">
                Drag the Quartermaster role above any rank/medal role you want it to manage in your Discord server's role list. Discord forbids bots from editing roles above their own.
              </div>
            </div>
          </div>

          <div className="rule-ornament" style={{ marginTop: 36 }}><span className="pip"/></div>
          <div className="row between" style={{ marginTop: 20 }}>
            <button className="btn ghost"><Icons.ChevL style={{ width: 14, height: 14 }}/>Back</button>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn muted">Skip — finish later</button>
              <button className="btn primary">Confirm & continue<Icons.ChevR style={{ width: 14, height: 14 }}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── Applicant Application Form ─────────
function ApplicationForm() {
  return (
    <div className="app-root grain" style={{ minHeight: '100%' }}>
      <PublicNav/>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '36px 32px 64px' }}>
        <div className="row between" style={{ marginBottom: 28 }}>
          <div>
            <div className="admin-label brass">Roll Call · Enlistment Papers</div>
            <h1 className="serif-display" style={{ fontSize: 38, color: 'var(--t-100)', marginTop: 6 }}>Application to the Lord Regiment</h1>
            <p style={{ fontSize: 14, color: 'var(--t-300)', marginTop: 8, maxWidth: 580, lineHeight: 1.6 }}>
              Answer honestly. Applications are reviewed within 48 hours by a moderator and the
              outcome is sent to you by Discord DM.
            </p>
          </div>
          <div className="wax">Roll<br/>Call</div>
        </div>

        <div className="panel" style={{ padding: 24 }}>
          <div className="row" style={{ gap: 14, paddingBottom: 18, borderBottom: '1px solid var(--rule)' }}>
            <Avatar name="New Recruit" size={48}/>
            <div>
              <div style={{ fontSize: 13, color: 'var(--t-300)' }}>Signed in as</div>
              <div className="serif-display" style={{ fontSize: 18, color: 'var(--t-100)' }}>@Calder_NL <span className="badge" style={{ marginLeft: 6 }}>Discord verified</span></div>
            </div>
            <span className="sp"/>
            <button className="btn muted sm">Use different account</button>
          </div>

          <div className="col" style={{ gap: 22, marginTop: 24 }}>
            <div className="grid-2">
              <div>
                <label className="field-label">In-game name</label>
                <input className="input" defaultValue="Calder NL"/>
                <div className="field-hint">As it appears in Holdfast.</div>
              </div>
              <div>
                <label className="field-label">Primary platform</label>
                <select className="select"><option>Steam (PC)</option><option>Xbox</option><option>PlayStation</option></select>
              </div>
            </div>

            <div>
              <label className="field-label">Joining as</label>
              <div className="row" style={{ gap: 10 }}>
                {[
                  { id: 'app', t: 'Applicant', s: 'Reviewed by a moderator. Goes through trial drill.', sel: true },
                  { id: 'mrc', t: 'Mercenary', s: 'Plays alongside the regiment without applying. Limited access.' },
                ].map(o => (
                  <div key={o.id} className="panel" style={{
                    flex: 1, padding: 14, cursor: 'pointer',
                    borderColor: o.sel ? 'var(--brass-500)' : 'var(--rule-2)',
                    background: o.sel ? 'rgba(176,132,54,.06)' : 'var(--ink-800)',
                  }}>
                    <div className="row between">
                      <span className="serif-display" style={{ fontSize: 16, color: o.sel ? 'var(--brass-300)' : 'var(--t-100)' }}>{o.t}</span>
                      <span style={{ width: 14, height: 14, borderRadius: 999, border: '1.5px solid ' + (o.sel ? 'var(--brass-400)' : 'var(--rule-3)'), background: o.sel ? 'var(--brass-400)' : 'transparent', flex: 'none', boxShadow: o.sel ? 'inset 0 0 0 3px var(--ink-800)' : 'none' }}/>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 6 }}>{o.s}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rule-ornament"><span className="pip"/></div>

            <div>
              <label className="field-label">Why do you want to join the Lord Regiment?</label>
              <textarea className="textarea" placeholder="Speak plainly. We're more interested in attitude than rhetoric." defaultValue={`I've been playing line-battle servers for about a year and want a regiment that takes drill seriously without the cosplay. Saw the Lords hold against a cavalry charge at Fort Halen last week — that's the discipline I'm after.`}/>
            </div>

            <div>
              <label className="field-label">How did you find the regiment?</label>
              <select className="select"><option>Saw you on a public server</option><option>Twitch / YouTube</option><option>Discord recommendation</option><option>Personal invite from a member</option><option>Other</option></select>
            </div>

            <div>
              <label className="field-label">Previous regiment experience</label>
              <textarea className="textarea" placeholder="List previous regiments, ranks held, and reason for leaving. Write 'None' if this is your first." defaultValue={`92nd Highlanders (2024) — Pte. Left amicably; group went inactive.`}/>
            </div>

            <div className="grid-2">
              <div>
                <label className="field-label">Time zone</label>
                <select className="select"><option>GMT (Western Europe)</option></select>
              </div>
              <div>
                <label className="field-label">Age confirmation</label>
                <div className="row" style={{ gap: 10, padding: '10px 0' }}>
                  <span className="check on"/>
                  <span style={{ fontSize: 13, color: 'var(--t-200)' }}>I am 16 or older.</span>
                </div>
              </div>
            </div>

            <div className="notice info">
              <Icons.Doc style={{ width: 16, height: 16, color: 'var(--regblue-300)', flex: 'none', marginTop: 1 }}/>
              <div>
                <div className="n-title">What happens next</div>
                <div className="n-body">A moderator reviews your application within 48 hours. If approved, you'll receive a Discord DM with drill schedule and a temporary Applicant role.</div>
              </div>
            </div>
          </div>

          <div className="rule-ornament" style={{ marginTop: 28 }}><span className="pip"/></div>
          <div className="row between" style={{ marginTop: 18 }}>
            <button className="btn muted">Cancel</button>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn ghost">Save draft</button>
              <button className="btn primary">Submit Papers</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OwnerSetup, OwnerSetupDiscord, ApplicationForm });
