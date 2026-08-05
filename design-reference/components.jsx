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

// Small monogram crest (regiment logo). The mark is inlined as a data URI so the
// component renders from any host; the old relative "assets/regiment-logo.png"
// only resolved on a page served from this folder. Pass `src` to override.
const CREST_SRC = "data:image/webp;base64,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";
function Crest({ size = 40, src = CREST_SRC }) {
  return <img src={src} width={size} height={size} alt="" style={{ borderRadius: 999, display:'block' }}/>;
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
