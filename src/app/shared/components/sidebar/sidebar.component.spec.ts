import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
    let component: SidebarComponent;

    beforeEach(() => {
        component = new SidebarComponent();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('routes Events to the in-shell member surface and is member-visible', () => {
        const events = component.navItems.find((i) => i.key === 'events');
        expect(events?.route).toBe('/app/dashboard/events');
        expect(events?.adminOnly).toBe(false);
    });

    it('routes Gallery to /app/gallery and makes it member-visible (T-0110)', () => {
        const gallery = component.navItems.find((i) => i.key === 'gallery');
        expect(gallery?.route).toBe('/app/gallery');
        expect(gallery?.adminOnly).toBe(false);
    });

    it('hides admin-only items from non-admins but keeps member-visible Events + Gallery', () => {
        component.isAdmin = false;
        const keys = component.visibleItems.map((i) => i.key);
        expect(keys).toContain('dashboard');
        expect(keys).toContain('roster');
        // Events + Gallery are now member-visible (T-0086/T-0110).
        expect(keys).toContain('events');
        expect(keys).toContain('gallery');
        expect(keys).not.toContain('apps');
        expect(keys).not.toContain('audit');
    });

    it('shows admin-only items to admins', () => {
        component.isAdmin = true;
        const keys = component.visibleItems.map((i) => i.key);
        expect(keys).toContain('events');
        expect(keys).toContain('gallery');
        expect(keys).toContain('apps');
        expect(keys).toContain('audit');
    });

    /**
     * The Settings entry is the one administrative link driven by capabilities
     * rather than the coarse `isAdmin` role flag: `settingsAccessGuard` owns the
     * route, so a role-only link would send a Moderator holding neither
     * capability into a panel the API 403s end to end.
     */
    describe('Settings entry — capability-gated (T-0265)', () => {
        function keysFor(isAdmin: boolean, capabilities: string[]): string[] {
            component.isAdmin = isAdmin;
            component.capabilities = capabilities;
            return component.visibleItems.map((i) => i.key);
        }

        it('hides Settings from an admin holding neither settings capability', () => {
            const keys = keysFor(true, ['manage_events', 'view_audit_log']);
            expect(keys).not.toContain('settings');
            // The other administrative entries are untouched by this change.
            expect(keys).toContain('apps');
            expect(keys).toContain('ranks');
            expect(keys).toContain('audit');
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

        it('drops the Administrative heading when nothing in it survives', () => {
            component.isAdmin = false;
            component.capabilities = [];
            expect(component.visibleSections.map((s) => s.id)).not.toContain('administrative');
        });

        it('keeps the Administrative heading for an admin without settings capabilities', () => {
            component.isAdmin = true;
            component.capabilities = [];
            const admin = component.visibleSections.find((s) => s.id === 'administrative');
            expect(admin?.items.map((i) => i.key)).toEqual(['apps', 'ranks', 'audit']);
        });
    });

    it('emits the route on navigation', () => {
        const emitted: string[] = [];
        component.navigate.subscribe((r) => emitted.push(r));
        component.onNavigate('/app/admin/events');
        expect(emitted).toEqual(['/app/admin/events']);
    });
});
