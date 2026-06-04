/* eslint-disable */
// Holdfast — Design system showcase

function DesignSystem() {
  return (
    <div className="app-root grain" style={{ background: 'var(--ink-900)', minHeight: '100%', padding: '32px 36px 56px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div className="row" style={{ gap: 14, marginBottom: 28 }}>
          <Crest size={60}/>
          <div>
            <div className="admin-label brass">Holdfast Command · Design System</div>
            <h1 className="serif-display" style={{ fontSize: 38, color: 'var(--t-100)', marginTop: 6 }}>Plate One — Visual Order</h1>
            <p style={{ fontSize: 13, color: 'var(--t-400)', marginTop: 6, maxWidth: 700 }}>The constituent parts of the regimental interface. Restrained, structural, and built for daylight reading on the parade ground.</p>
          </div>
        </div>

        {/* Color */}
        <SectionHead title="Color · Surfaces & Accents"/>
        <div className="grid-4" style={{ gap: 10 }}>
          {[
            ['Ink 900', '#0b0e14', 'Page'],
            ['Ink 850', '#10141c', 'Canvas'],
            ['Ink 800', '#161b25', 'Panel'],
            ['Ink 750', '#1b212c', 'Raised'],
            ['Brass 400', '#c69a45', 'Primary accent'],
            ['Brass 500', '#b08436', 'Solid brass'],
            ['Oxblood 500', '#8a382f', 'Destructive'],
            ['Laurel 500', '#556b48', 'Affirmative'],
            ['Regblue 500', '#4f6b8a', 'Information'],
            ['Parch 100', '#ebe2c8', 'Parchment'],
            ['Steel 400', '#525a6a', 'Muted'],
            ['Rule', '#2a3142', 'Divider'],
          ].map(([n, c, role]) => (
            <div key={n} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 64, background: c }}/>
              <div style={{ padding: 10 }}>
                <div className="row between"><span style={{ fontSize: 12, color: 'var(--t-100)' }}>{n}</span><span className="mono" style={{ fontSize: 10.5, color: 'var(--t-400)' }}>{c}</span></div>
                <div style={{ fontSize: 11, color: 'var(--t-500)', marginTop: 2 }}>{role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Type */}
        <SectionHead title="Typography · Cormorant + Inter"/>
        <div className="panel" style={{ padding: 28 }}>
          <div className="grid-2" style={{ gap: 32 }}>
            <div>
              <div className="admin-label brass">Display · Serif</div>
              <div className="serif" style={{ fontSize: 56, color: 'var(--t-100)', lineHeight: 1, fontWeight: 600 }}>Aa Bb Cc</div>
              <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 6 }}>Cormorant Garamond · 600</div>
              <div className="divider"/>
              <div className="col" style={{ gap: 14 }}>
                {[
                  { l: 'Page title — 32', s: 'serif-display', sz: 32 },
                  { l: 'Panel title — 18', s: 'serif-display', sz: 18 },
                  { l: 'Body — 14',         s: '',           sz: 14 },
                  { l: 'Caption — 12.5',    s: '',           sz: 12.5 },
                ].map(t => (
                  <div key={t.l}>
                    <div className="admin-label" style={{ fontSize: 9.5 }}>{t.l}</div>
                    <div className={t.s} style={{ fontSize: t.sz, color: 'var(--t-100)', marginTop: 2 }}>The line forms at dawn and holds till the colors fall.</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="admin-label brass">Body · Sans</div>
              <div style={{ fontSize: 56, color: 'var(--t-100)', lineHeight: 1, fontWeight: 500 }}>Aa Bb Cc</div>
              <div style={{ fontSize: 12, color: 'var(--t-400)', marginTop: 6 }}>Inter · 400 / 500 / 600</div>
              <div className="divider"/>
              <div className="col" style={{ gap: 10, fontSize: 14 }}>
                <div style={{ color: 'var(--t-100)' }}>Bright · Officers were posted at the four corners.</div>
                <div style={{ color: 'var(--t-200)' }}>Body · The regiment fielded thirty muskets that evening.</div>
                <div style={{ color: 'var(--t-300)' }}>Secondary · Twenty-two of which were veteran.</div>
                <div style={{ color: 'var(--t-400)' }}>Muted · The remainder were applicants on trial.</div>
                <div style={{ color: 'var(--t-500)' }}>Faint · A handful did not arrive.</div>
                <div className="divider"/>
                <div className="admin-label">Administrative Label · 11 / .14em / uppercase</div>
                <div className="admin-label brass">Brass administrative label</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--t-300)' }}>JetBrains Mono · 12 · ID req-9a4f-cb12</div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <SectionHead title="Buttons & Inputs"/>
        <div className="grid-2" style={{ gap: 18, alignItems: 'flex-start' }}>
          <div className="panel" style={{ padding: 22 }}>
            <div className="admin-label brass">Buttons</div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <button className="btn primary">Issue Order</button>
              <button className="btn secondary">Secondary</button>
              <button className="btn ghost">Ghost</button>
              <button className="btn muted">Muted</button>
              <button className="btn destructive">Decline</button>
              <button className="btn discord"><Icons.Discord style={{ width: 14, height: 14 }}/>Discord</button>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 14 }}>
              <button className="btn primary lg">Large primary</button>
              <button className="btn primary sm">Small</button>
              <button className="btn ghost icon"><Icons.Plus style={{ width: 14, height: 14 }}/></button>
              <button className="btn primary" disabled style={{ opacity: .5, cursor: 'not-allowed' }}>Disabled</button>
            </div>
          </div>

          <div className="panel" style={{ padding: 22 }}>
            <div className="admin-label brass">Inputs</div>
            <div className="col" style={{ gap: 14, marginTop: 14 }}>
              <div>
                <label className="field-label">Text input</label>
                <input className="input" defaultValue="Lord Regiment"/>
              </div>
              <div>
                <label className="field-label">With icon</label>
                <div className="input-wrap"><Icons.Search style={{ width: 13, height: 13 }}/><input className="input has-icon" placeholder="Search…"/></div>
              </div>
              <div>
                <label className="field-label">Select</label>
                <select className="select"><option>Linebattle</option></select>
              </div>
              <div>
                <label className="field-label">Textarea</label>
                <textarea className="textarea" rows={2} defaultValue="Hold the line."/>
              </div>
              <div className="row" style={{ gap: 18 }}>
                <span className="row" style={{ gap: 6 }}><span className="check on"/><span style={{ fontSize: 12.5 }}>Checked</span></span>
                <span className="row" style={{ gap: 6 }}><span className="check"/><span style={{ fontSize: 12.5 }}>Unchecked</span></span>
                <span className="row" style={{ gap: 6 }}><span className="toggle on"/><span style={{ fontSize: 12.5 }}>On</span></span>
                <span className="row" style={{ gap: 6 }}><span className="toggle"/><span style={{ fontSize: 12.5 }}>Off</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <SectionHead title="Badges, Ranks, Medals"/>
        <div className="panel" style={{ padding: 22 }}>
          <div className="admin-label brass">Status badges</div>
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span className="badge dot">Default</span>
            <span className="badge brass dot">Brass · Upcoming</span>
            <span className="badge laurel dot">Laurel · Active</span>
            <span className="badge ox dot">Oxblood · In Progress</span>
            <span className="badge blue dot">Blue · Synced</span>
            <span className="badge parch">Parchment</span>
            <span className="badge solid">Solid Brass</span>
          </div>

          <div className="divider"/>
          <div className="admin-label brass">Role badges</div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <span className="badge brass">Owner</span>
            <span className="badge ox">Admin</span>
            <span className="badge blue">Moderator</span>
            <span className="badge laurel">Member</span>
            <span className="badge parch">Mercenary</span>
            <span className="badge">Applicant</span>
          </div>

          <div className="divider"/>
          <div className="row" style={{ gap: 28, marginTop: 8 }}>
            <div>
              <div className="admin-label brass">Rank chevrons</div>
              <div className="col" style={{ gap: 8, marginTop: 10 }}>
                {[['Private',0],['Corporal',1],['Sergeant',2],['Lieutenant',2],['Captain',3],['Major',4],['Colonel',5]].map(([n, c]) => (
                  <div key={n} className="row" style={{ gap: 10 }}>
                    <span style={{ width: 90, fontSize: 12, color: 'var(--t-300)' }}>{n}</span>
                    {c > 0 ? <Chevrons n={c}/> : <span style={{ color: 'var(--t-500)', fontSize: 12 }}>—</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="admin-label brass">Medals</div>
              <div className="row" style={{ gap: 16, marginTop: 10 }}>
                <div className="col" style={{ alignItems: 'center', gap: 4 }}><Medal ribbon="blue" letter="L"/><span style={{ fontSize: 10, color: 'var(--t-400)' }}>Linebattle</span></div>
                <div className="col" style={{ alignItems: 'center', gap: 4 }}><Medal ribbon="red" letter="V"/><span style={{ fontSize: 10, color: 'var(--t-400)' }}>Valor</span></div>
                <div className="col" style={{ alignItems: 'center', gap: 4 }}><Medal ribbon="gold" letter="★"/><span style={{ fontSize: 10, color: 'var(--t-400)' }}>Marksman</span></div>
                <div className="col" style={{ alignItems: 'center', gap: 4 }}><Medal ribbon="green" letter="D"/><span style={{ fontSize: 10, color: 'var(--t-400)' }}>Drill</span></div>
                <div className="col" style={{ alignItems: 'center', gap: 4 }}><Medal ribbon="tricolor" letter="S"/><span style={{ fontSize: 10, color: 'var(--t-400)' }}>Standard</span></div>
              </div>
            </div>
            <div>
              <div className="admin-label brass">Ornaments</div>
              <div className="col" style={{ gap: 14, marginTop: 10 }}>
                <CrestDivider>Article II</CrestDivider>
                <div className="archive-label">Folder · #014</div>
                <div className="rule-ornament"><span className="pip"/></div>
                <div className="row" style={{ gap: 12 }}>
                  <div className="wax">Lord<br/>Regt.</div>
                  <span style={{ fontSize: 12, color: 'var(--t-400)' }}>Wax seal · used on completed dispatches</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notices & empty */}
        <SectionHead title="Notices · Empty states"/>
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="col" style={{ gap: 10 }}>
            <div className="notice info">
              <Icons.Doc style={{ width: 16, height: 16, color: 'var(--regblue-300)', flex: 'none', marginTop: 1 }}/>
              <div>
                <div className="n-title">Informational notice</div>
                <div className="n-body">For confirming routine events the user expected.</div>
              </div>
            </div>
            <div className="notice ok">
              <Icons.Check style={{ width: 16, height: 16, color: 'var(--ok)', flex: 'none', marginTop: 1 }}/>
              <div>
                <div className="n-title">Operation succeeded</div>
                <div className="n-body">4 rank changes applied to Discord.</div>
              </div>
            </div>
            <div className="notice warn">
              <Icons.Shield style={{ width: 16, height: 16, color: 'var(--brass-400)', flex: 'none', marginTop: 1 }}/>
              <div>
                <div className="n-title">Worth a second look</div>
                <div className="n-body">Password will be visible to all members.</div>
              </div>
            </div>
            <div className="notice err">
              <Icons.X style={{ width: 16, height: 16, color: 'var(--err)', flex: 'none', marginTop: 1 }}/>
              <div>
                <div className="n-title">Something refused</div>
                <div className="n-body">Discord bot is missing the Manage Roles permission.</div>
              </div>
            </div>
          </div>
          <div className="empty">
            <Icons.Doc style={{ width: 28, height: 28, color: 'var(--t-500)', margin: '0 auto 10px' }}/>
            <div className="e-title">No dispatches yet</div>
            <div className="e-body">When members submit images, video, or links, they appear here for moderation.</div>
            <button className="btn ghost" style={{ marginTop: 14 }}>Open submission rules</button>
          </div>
        </div>

        {/* Panels & parchment */}
        <SectionHead title="Panels & Surfaces"/>
        <div className="grid-3" style={{ gap: 14 }}>
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Dark panel</span><span className="badge">default</span></div>
            <div className="panel-body" style={{ fontSize: 13, color: 'var(--t-300)' }}>The default surface. Sits on the page; carries lists, tables, forms.</div>
          </div>
          <div className="panel raised">
            <div className="panel-header"><span className="panel-title">Raised panel</span><span className="badge brass">elevated</span></div>
            <div className="panel-body" style={{ fontSize: 13, color: 'var(--t-300)' }}>Slightly brighter. Used to lift detail from a list, e.g. a focused entry.</div>
          </div>
          <div className="parchment" style={{ padding: 18 }}>
            <div className="admin-label parch">Parchment</div>
            <div className="serif" style={{ fontSize: 17, color: 'var(--parch-900)', marginTop: 4, lineHeight: 1.35 }}>For applicant answers, charter quotes, and ceremonial copy.</div>
          </div>
        </div>

        {/* Footer */}
        <div className="row" style={{ gap: 18, color: 'var(--t-500)', fontSize: 11.5, marginTop: 36, justifyContent: 'center' }}>
          <Crest size={20}/>
          <span>Holdfast Command · Plate One · 27 components, 18 screens</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DesignSystem });
