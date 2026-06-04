/* eslint-disable */
// Holdfast — shared icons, primitives, sidebar, topbar
// All globals attached to window at bottom.

const { useState, useEffect, useRef, useMemo, Fragment } = React;

// ───────── Icons (simple line, 1.6 stroke) ─────────
const ic = (path, opts = {}) => (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={opts.sw || 1.6}
       strokeLinecap="round" strokeLinejoin="round" {...props}>
    {typeof path === 'string' ? <path d={path} /> : path}
  </svg>
);

const IconHome = ic(<><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></>);
const IconEvents = ic(<><rect x="3.5" y="5" width="17" height="15" rx="1"/><path d="M3.5 9.5h17"/><path d="M8 3v4M16 3v4"/><path d="M7.5 13.5h3M7.5 16.5h6"/></>);
const IconGallery = ic(<><rect x="3.5" y="4.5" width="17" height="14" rx="1"/><circle cx="9" cy="10" r="1.5"/><path d="m4 18 5-5 4 4 3-3 4 4"/></>);
const IconRoster = ic(<><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.4 2.7-6 6-6s6 2.6 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M14.2 19c0-2.5 1.8-4.5 4.3-4.5 1 0 1.9.3 2.5.8"/></>);
const IconApps = ic(<><path d="M5 3h11l3 3v15H5z"/><path d="M16 3v3h3"/><path d="M9 11h6M9 14h6M9 17h4"/></>);
const IconRanks = ic(<><path d="M4 4h7l-2 4 2 4H4z"/><path d="M4 4v16"/><circle cx="17" cy="14" r="3.5"/><path d="m15.5 17 -1 4 2.5 -1.5 2.5 1.5 -1 -4"/></>);
const IconAudit = ic(<><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h8M8 11h8M8 15h5"/><circle cx="17" cy="17" r="2.5"/><path d="m19 19 2 2"/></>);
const IconSettings = ic(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);
const IconProfile = ic(<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>);
const IconSearch = ic(<><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></>);
const IconBell = ic(<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2.5h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></>);
const IconPlus = ic("M5 12h14M12 5v14");
const IconChevD = ic("m6 9 6 6 6-6");
const IconChevR = ic("m9 6 6 6-6 6");
const IconChevL = ic("m15 6-6 6 6 6");
const IconCheck = ic("M4 12.5 9.5 18 20 6.5");
const IconX = ic("M6 6l12 12M18 6 6 18");
const IconFilter = ic("M4 5h16l-6 8v6l-4-2v-4z");
const IconLink = ic(<><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></>);
const IconHeart = ic("M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z");
const IconShield = ic(<><path d="M12 3 5 5.5v6c0 4.6 3 8.6 7 9.5 4-1 7-5 7-9.5v-6L12 3z"/></>);
const IconSwords = ic(<><path d="m6 20 8.5-8.5"/><path d="M3 17v4h4l1.5-1.5"/><path d="m14.5 5.5 4 4L20 8l-3.5-3.5z"/><path d="m18 20 -3 -3"/><path d="M21 17v4h-4l-1.5-1.5"/><path d="M9.5 14.5l-4-4L4 12l3.5 3.5z"/></>);
const IconFlag = ic("M5 21V4h13l-2 4 2 4H5");
const IconDoc = ic(<><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v4h5"/></>);
const IconUpload = ic(<><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></>);
const IconLogout = ic(<><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4"/><path d="M16 16l4-4-4-4"/><path d="M20 12H9"/></>);
const IconCalendar = ic(<><rect x="3.5" y="5" width="17" height="15" rx="1"/><path d="M3.5 9.5h17"/><path d="M8 3v4M16 3v4"/></>);
const IconClock = ic(<><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>);
const IconLock = ic(<><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>);
const IconEye = ic(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
const IconEyeOff = ic(<><path d="M3 3l18 18"/><path d="M10.5 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.4 4.1"/><path d="M6.2 7.8A17.2 17.2 0 0 0 2 12s3.5 6 10 6c1.2 0 2.3-.2 3.3-.5"/><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"/></>);
const IconDots = ic("M5 12h.01M12 12h.01M19 12h.01", { sw: 2.2 });
const IconGrip = ic(<><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></>);
const IconExt = ic(<><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v6H4V4h6"/></>);
const IconArrow = ic("M5 12h14m-6-6 6 6-6 6");
const IconDiscord = ic(<><path d="M8 11h.01M16 11h.01"/><path d="M17 6a13 13 0 0 0-4-1l-.5 1.5a9 9 0 0 0-3 0L9 5a13 13 0 0 0-4 1L4 8c-1 3-1 6-.5 9a14 14 0 0 0 4 2l1-1.5a8 8 0 0 1-2-1l.5-.5a11 11 0 0 0 10 0l.5.5a8 8 0 0 1-2 1L16 19a14 14 0 0 0 4-2c.5-3 .5-6-.5-9z"/></>);
const IconSteam = ic(<><circle cx="12" cy="12" r="9"/><circle cx="16" cy="9" r="2.4"/><circle cx="9" cy="14" r="1.8"/><path d="m3 13 4 1.5"/><path d="M14 9 9.5 14"/></>);
const IconXbox = ic(<><circle cx="12" cy="12" r="9"/><path d="M6 5c3 1 5 4 6 7 1-3 3-6 6-7"/><path d="M6 19c3-1 5-4 6-7 1 3 3 6 6 7"/></>);
const IconPS = ic(<><path d="M9 3v18l4 1V11l5 1.5v-3z"/><path d="M16 19 8 21v-3l8-1.5z"/></>);
const IconReload = ic(<><path d="M20 11A8 8 0 1 0 7 18l-2 2"/><path d="M20 5v6h-6"/></>);
const IconBan = ic(<><circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/></>);
const IconTrash = ic(<><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/><path d="M10 11v6M14 11v6"/></>);
const IconArchive = ic(<><rect x="3.5" y="4" width="17" height="4" rx="1"/><path d="M5 8v12h14V8"/><path d="M10 13h4"/></>);

const Icons = {
  Home: IconHome, Events: IconEvents, Gallery: IconGallery, Roster: IconRoster, Apps: IconApps,
  Ranks: IconRanks, Audit: IconAudit, Settings: IconSettings, Profile: IconProfile,
  Search: IconSearch, Bell: IconBell, Plus: IconPlus, ChevD: IconChevD, ChevR: IconChevR, ChevL: IconChevL,
  Check: IconCheck, X: IconX, Filter: IconFilter, Link: IconLink, Heart: IconHeart, Shield: IconShield,
  Swords: IconSwords, Flag: IconFlag, Doc: IconDoc, Upload: IconUpload, Logout: IconLogout,
  Calendar: IconCalendar, Clock: IconClock, Lock: IconLock, Eye: IconEye, EyeOff: IconEyeOff,
  Dots: IconDots, Grip: IconGrip, Ext: IconExt, Arrow: IconArrow, Discord: IconDiscord,
  Steam: IconSteam, Xbox: IconXbox, PS: IconPS, Reload: IconReload, Ban: IconBan, Trash: IconTrash,
  Archive: IconArchive,
};

// ───────── Crest motif (tiny inline svg) ─────────
function Fleur({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-1 2-3 3-3 5 0 1 .6 2 1.5 2.4-.8.6-1.5 1.5-1.5 2.6 0 1.7 1.3 3 3 3s3-1.3 3-3c0-1.1-.7-2-1.5-2.6.9-.4 1.5-1.4 1.5-2.4 0-2-2-3-3-5zm-5 11c-2 1-4 2-4 4 1 1 3 1 5 0-1 1-2 3-1 5 2 0 4-2 4-4-1 2 0 4 1 5 1-1 2-3 1-5 2 2 4 2 5 0 0-2-2-3-4-4 1 2 0 4-1 5-1-1-2-3-1-5-2-1-3-1-5 0z"/>
    </svg>
  );
}

function CrestDivider({ children }) {
  return (
    <div className="crest-divider">
      <Fleur />
      {children && <span className="admin-label brass">{children}</span>}
      <Fleur />
    </div>
  );
}

// ───────── Medal & rank visuals ─────────
function Medal({ ribbon = "blue", letter = "L", title }) {
  const ribbons = {
    blue:   `repeating-linear-gradient(90deg, var(--regblue-500) 0 4px, var(--ink-700) 4px 8px)`,
    red:    `repeating-linear-gradient(90deg, var(--oxblood-500) 0 3px, var(--ink-800) 3px 6px)`,
    green:  `repeating-linear-gradient(90deg, var(--laurel-500) 0 3px, var(--ink-700) 3px 6px)`,
    gold:   `repeating-linear-gradient(90deg, var(--brass-500) 0 3px, var(--brass-700) 3px 6px)`,
    tricolor: `linear-gradient(90deg, var(--regblue-500) 0 33%, #d8d2c2 33% 66%, var(--oxblood-500) 66% 100%)`,
  };
  return (
    <span className="medal" title={title}>
      <span className="rib" style={{ background: ribbons[ribbon] || ribbons.blue }}/>
      <span className="disk">{letter}</span>
    </span>
  );
}

function Chevrons({ n = 1 }) {
  return (
    <span className="chevs">
      {Array.from({ length: n }).map((_, i) => <span className="chev" key={i}/>)}
    </span>
  );
}

// Small monogram crest (uses regiment logo)
function Crest({ size = 40 }) {
  return <img src="assets/regiment-logo.png" width={size} height={size} alt="" style={{ borderRadius: 999, display:'block' }}/>;
}

// ───────── Avatar ─────────
function Avatar({ name = "??", size = 32, online }) {
  const initials = name.split(" ").map(s => s[0]).slice(0, 2).join("");
  // Deterministic hue
  const h = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span className="avatar" style={{ width: size, height: size, background: `oklch(0.32 0.04 ${h})`, fontSize: size * 0.36 }}>
      {initials}
      {online && <span className="status-dot discord-on" style={{ position: 'absolute', right: -1, bottom: -1, border: '2px solid var(--ink-800)', width: 9, height: 9 }}/>}
    </span>
  );
}

// ───────── Sidebar ─────────
function Sidebar({ active = "home", onNav, user, isAdmin = true }) {
  const items = [
    { id: 'home',   label: 'Home',          Icon: Icons.Home,   count: null },
    { id: 'events', label: 'Events',        Icon: Icons.Events, count: 3 },
    { id: 'gallery',label: 'Gallery',       Icon: Icons.Gallery,count: null },
    { id: 'roster', label: 'Members',       Icon: Icons.Roster, count: 84 },
    { id: 'apps',   label: 'Applications',  Icon: Icons.Apps,   count: 7, admin: true },
    { id: 'ranks',  label: 'Ranks & Medals',Icon: Icons.Ranks,  count: null, admin: true },
    { id: 'audit',  label: 'Audit Ledger',  Icon: Icons.Audit,  count: null, admin: true },
    { id: 'settings', label: 'Settings',    Icon: Icons.Settings, count: null, admin: true },
    { id: 'profile',label: 'Profile',       Icon: Icons.Profile,count: null },
  ];
  const main = items.filter(i => !i.admin);
  const admin = items.filter(i => i.admin);

  return (
    <aside className="sidebar grain">
      <div className="brand">
        <Crest size={36}/>
        <div>
          <div className="b-name">Lord Regiment</div>
          <div className="b-sub">Est. MMXXIV · Holdfast</div>
        </div>
      </div>

      <div className="nav-group">
        <div className="n-h">Regiment</div>
        {main.map(i => (
          <div key={i.id} onClick={() => onNav?.(i.id)}
               className={"nav-item " + (active === i.id ? "active" : "")}>
            <i.Icon className="n-i"/>
            <span>{i.label}</span>
            {i.count != null && <span className="n-c">{i.count}</span>}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="nav-group">
          <div className="n-h">Command</div>
          {admin.map(i => (
            <div key={i.id} onClick={() => onNav?.(i.id)}
                 className={"nav-item " + (active === i.id ? "active" : "")}>
              <i.Icon className="n-i"/>
              <span>{i.label}</span>
              {i.count != null && <span className="n-c">{i.count}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="footer">
        <Avatar name={user?.name || "JN"} size={30}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: 'var(--t-100)', fontWeight: 500 }}>{user?.name || "Jameson Nolt"}</div>
          <div style={{ fontSize: 10.5, color: 'var(--t-400)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{user?.rank || "Lieutenant"}</div>
        </div>
        <Icons.Logout style={{ width: 16, height: 16, color: 'var(--t-400)' }}/>
      </div>
    </aside>
  );
}

// ───────── Topbar ─────────
function Topbar({ crumbs = [], actions, search = true }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            <span className={i === crumbs.length - 1 ? "here" : ""}>{c}</span>
            {i < crumbs.length - 1 && <span className="sep">›</span>}
          </Fragment>
        ))}
      </div>
      <div className="sp"/>
      {search && (
        <div className="input-wrap" style={{ width: 240 }}>
          <Icons.Search style={{ width: 14, height: 14 }}/>
          <input className="input has-icon" placeholder="Search roster, events…" style={{ height: 32, fontSize: 12.5 }}/>
        </div>
      )}
      <button className="btn icon ghost" title="Notices"><Icons.Bell style={{ width: 16, height: 16 }}/></button>
      {actions}
    </header>
  );
}

// ───────── Page scaffolding ─────────
function PageHead({ title, sub, actions, eyebrow }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="admin-label brass" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

function SectionHead({ title, right }) {
  return (
    <div className="section-head">
      <span className="s-title">{title}</span>
      <span className="s-rule"/>
      {right}
    </div>
  );
}

// Universal app shell
function AppShell({ active, onNav, crumbs, children, topActions, user }) {
  return (
    <div className="app-root" style={{ height: '100%', minHeight: '100%' }}>
      <div className="appshell">
        <Sidebar active={active} onNav={onNav} user={user}/>
        <main className="appmain">
          <Topbar crumbs={crumbs} actions={topActions}/>
          <div className="appscroll grain">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ───────── Discord button helper ─────────
function DiscordBtn({ children = "Continue with Discord", size }) {
  return (
    <button className={"btn discord " + (size === 'lg' ? 'lg' : '')}>
      <Icons.Discord style={{ width: 16, height: 16 }}/>
      {children}
    </button>
  );
}

// ───────── Platform badges ─────────
function PlatformBadges({ platforms = ["steam"] }) {
  const m = {
    steam: { Ic: Icons.Steam, l: "Steam" },
    xbox:  { Ic: Icons.Xbox,  l: "Xbox" },
    ps:    { Ic: Icons.PS,    l: "PlayStation" },
  };
  return (
    <span className="row" style={{ gap: 4 }}>
      {platforms.map(p => {
        const it = m[p]; if (!it) return null;
        return (
          <span key={p} className="badge" style={{ padding: '2px 6px', gap: 4 }} title={it.l}>
            <it.Ic style={{ width: 11, height: 11 }}/>
            {it.l}
          </span>
        );
      })}
    </span>
  );
}

// ───────── Rank visualization ─────────
function RankPip({ name = "Lieutenant", n = 2 }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <Chevrons n={n}/>
      <span style={{ fontSize: 12.5, color: 'var(--t-200)' }}>{name}</span>
    </span>
  );
}

// ───────── Status pill for events ─────────
function EventStatus({ state }) {
  if (state === 'ongoing') {
    return <span className="badge ox dot" style={{ background: 'rgba(166,77,68,.15)' }}>Ongoing</span>;
  }
  if (state === 'upcoming') {
    return <span className="badge brass dot">Upcoming</span>;
  }
  return <span className="badge dot" style={{ color: 'var(--t-400)' }}>Previous</span>;
}

// ───────── Stat tile (member dashboard) ─────────
function StatTile({ label, value, foot, accent }) {
  return (
    <div className="panel" style={{ padding: 14 }}>
      <div className="admin-label">{label}</div>
      <div className="serif-display" style={{ fontSize: 26, color: accent || 'var(--t-100)', marginTop: 4 }}>{value}</div>
      {foot && <div style={{ fontSize: 11.5, color: 'var(--t-400)', marginTop: 4 }}>{foot}</div>}
    </div>
  );
}

// Expose
Object.assign(window, {
  Icons, Fleur, CrestDivider, Medal, Chevrons, Crest, Avatar,
  Sidebar, Topbar, PageHead, SectionHead, AppShell, DiscordBtn,
  PlatformBadges, RankPip, EventStatus, StatTile,
});
