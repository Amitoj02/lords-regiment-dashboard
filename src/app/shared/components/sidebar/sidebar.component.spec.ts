import { SidebarComponent } from './sidebar.component';

/**
 * The sidebar is the staff console's nav (T-0287). Its entries are almost all
 * capability-gated rather than role-gated, because `staffGuard` lets in anyone
 * holding ANY one staff capability — so a Moderator with only `moderate_gallery`
 * is legitimately in this shell and must not be offered links the API 403s.
 */
describe('SidebarComponent', () => {
    let component: SidebarComponent;

    beforeEach(() => {
        component = new SidebarComponent();
    });

    /** Visible keys for a caller with the given role flag + capability set. */
    function keysFor(isAdmin: boolean, capabilities: string[]): string[] {
        component.isAdmin = isAdmin;
        component.capabilities = capabilities;
        return component.visibleItems.map((i) => i.key);
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('destinations (T-0287)', () => {
        it('points every entry at a live /app route', () => {
            expect(component.navItems.map((i) => ({ key: i.key, route: i.route }))).toEqual([
                { key: 'overview', route: '/app/overview' },
                { key: 'events', route: '/app/events' },
                { key: 'gallery', route: '/app/gallery/moderation' },
                { key: 'apps', route: '/app/applications' },
                { key: 'ranks', route: '/app/ranks' },
                { key: 'audit', route: '/app/audit' },
                { key: 'settings', route: '/app/settings' },
                { key: 'bot', route: '/app/bot' },
            ]);
        });

        it('drops the member-facing surfaces that moved to the public site', () => {
            // Roster, profiles and the gallery ARCHIVE are public pages now;
            // linking them from here would send a moderator back out of /app
            // through a URL that no longer exists.
            const keys = component.navItems.map((i) => i.key);
            expect(keys).not.toContain('roster');
            expect(keys).not.toContain('profile');
            expect(component.navItems.every((i) => i.route.startsWith('/app/'))).toBeTrue();
        });

        it('sends the footer user card to the public profile the shell resolved', () => {
            component.user = {
                id: 'u1',
                name: 'Test',
                rank: 'Private',
                profilePath: '/u/@lordy',
            };
            expect(component.profileRoute).toBe('/u/@lordy');
        });

        it('falls back to the roster when there is no resolved profile path', () => {
            expect(component.profileRoute).toBe('/roster');
        });
    });

    describe('capability gating', () => {
        it('shows a full-capability admin everything', () => {
            const keys = keysFor(true, [
                'manage_events',
                'moderate_gallery',
                'manage_applications',
                'edit_ranks_medals',
                'view_audit_log',
                'manage_settings',
            ]);
            expect(keys).toEqual([
                'overview',
                'events',
                'gallery',
                'apps',
                'ranks',
                'audit',
                'settings',
                'bot',
            ]);
        });

        it('gives a gallery-only Moderator the queue and nothing else to click', () => {
            expect(keysFor(false, ['moderate_gallery'])).toEqual(['overview', 'gallery']);
        });

        it('gives an events-only Moderator the events screen and nothing else', () => {
            expect(keysFor(false, ['manage_events'])).toEqual(['overview', 'events']);
        });

        it('hides Applications, Ranks and Audit from an admin lacking their capabilities', () => {
            // The role flag alone is not enough for a capability-gated entry:
            // the routes behind them are enforced per capability by the API.
            const keys = keysFor(true, []);
            expect(keys).not.toContain('apps');
            expect(keys).not.toContain('ranks');
            expect(keys).not.toContain('audit');
            expect(keys).not.toContain('settings');
            // Discord Bot has no capability of its own, so it keeps the role gate.
            expect(keys).toContain('bot');
        });

        it('keeps Discord Bot off a non-admin', () => {
            expect(keysFor(false, ['moderate_gallery'])).not.toContain('bot');
        });

        it('drops the Administrative heading when nothing in it survives', () => {
            component.isAdmin = false;
            component.capabilities = ['moderate_gallery'];
            expect(component.visibleSections.map((s) => s.id)).toEqual(['general']);
        });
    });

    /**
     * Settings stays driven by the guard's own capability list rather than a
     * restated copy, so the link and the route can never disagree (T-0265).
     */
    describe('Settings entry — capability-gated (T-0265)', () => {
        it('hides Settings from an admin holding neither settings capability', () => {
            expect(keysFor(true, ['view_audit_log'])).not.toContain('settings');
        });

        it('shows Settings to a caller holding manage_settings', () => {
            expect(keysFor(true, ['manage_settings'])).toContain('settings');
        });

        it('shows Settings to a caller holding only manage_regiment_details', () => {
            expect(keysFor(true, ['manage_regiment_details'])).toContain('settings');
        });

        it('ignores the role flag entirely for Settings', () => {
            // Capabilities win in BOTH directions: granted without the role flag
            // still shows, and the role flag alone no longer does.
            expect(keysFor(false, ['manage_settings'])).toContain('settings');
            expect(keysFor(true, [])).not.toContain('settings');
        });
    });

    it('emits the route on navigation', () => {
        const emitted: string[] = [];
        component.navigate.subscribe((r) => emitted.push(r));
        component.onNavigate('/app/events');
        expect(emitted).toEqual(['/app/events']);
    });
});
