// Adapter entry for /design-sync — NOT a reimplementation.
//
// design-reference/components.jsx is the regiment design kit as its authors wrote
// it: loaded as <script type="text/babel"> in the kit's own page, it reads React
// off the global and publishes its components with Object.assign(window, {…}).
//
// The converter externalises "react" to window.React and bundles this entry into
// an IIFE, so importing the kit here runs it under exactly the contract it already
// relies on. Everything below is a re-export of the kit's own components.

import "../../design-reference/components.jsx";

const g = globalThis;

// ── Components ──────────────────────────────────────────────────────────────
export const Icons = g.Icons;
export const Fleur = g.Fleur;
export const CrestDivider = g.CrestDivider;
export const Medal = g.Medal;
export const Chevrons = g.Chevrons;
export const Crest = g.Crest;
export const Avatar = g.Avatar;
export const Sidebar = g.Sidebar;
export const Topbar = g.Topbar;
export const PageHead = g.PageHead;
export const SectionHead = g.SectionHead;
export const AppShell = g.AppShell;
export const DiscordBtn = g.DiscordBtn;
export const PlatformBadges = g.PlatformBadges;
export const RankPip = g.RankPip;
export const EventStatus = g.EventStatus;
export const StatTile = g.StatTile;

// ── Icons ───────────────────────────────────────────────────────────────────
// Also exposed as the `Icons` record above (`<Icons.Shield/>`); these named
// aliases let the usual `import { IconShield }` idiom work too.
export const IconHome = g.Icons.Home;
export const IconEvents = g.Icons.Events;
export const IconGallery = g.Icons.Gallery;
export const IconRoster = g.Icons.Roster;
export const IconApps = g.Icons.Apps;
export const IconRanks = g.Icons.Ranks;
export const IconAudit = g.Icons.Audit;
export const IconSettings = g.Icons.Settings;
export const IconProfile = g.Icons.Profile;
export const IconSearch = g.Icons.Search;
export const IconBell = g.Icons.Bell;
export const IconPlus = g.Icons.Plus;
export const IconChevD = g.Icons.ChevD;
export const IconChevR = g.Icons.ChevR;
export const IconChevL = g.Icons.ChevL;
export const IconCheck = g.Icons.Check;
export const IconX = g.Icons.X;
export const IconFilter = g.Icons.Filter;
export const IconLink = g.Icons.Link;
export const IconHeart = g.Icons.Heart;
export const IconShield = g.Icons.Shield;
export const IconSwords = g.Icons.Swords;
export const IconFlag = g.Icons.Flag;
export const IconDoc = g.Icons.Doc;
export const IconUpload = g.Icons.Upload;
export const IconLogout = g.Icons.Logout;
export const IconCalendar = g.Icons.Calendar;
export const IconClock = g.Icons.Clock;
export const IconLock = g.Icons.Lock;
export const IconEye = g.Icons.Eye;
export const IconEyeOff = g.Icons.EyeOff;
export const IconDots = g.Icons.Dots;
export const IconGrip = g.Icons.Grip;
export const IconExt = g.Icons.Ext;
export const IconArrow = g.Icons.Arrow;
export const IconDiscord = g.Icons.Discord;
export const IconSteam = g.Icons.Steam;
export const IconXbox = g.Icons.Xbox;
export const IconPS = g.Icons.PS;
export const IconReload = g.Icons.Reload;
export const IconBan = g.Icons.Ban;
export const IconTrash = g.Icons.Trash;
export const IconArchive = g.Icons.Archive;
