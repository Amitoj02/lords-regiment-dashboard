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

    it('emits the route on navigation', () => {
        const emitted: string[] = [];
        component.navigate.subscribe((r) => emitted.push(r));
        component.onNavigate('/app/admin/events');
        expect(emitted).toEqual(['/app/admin/events']);
    });
});
