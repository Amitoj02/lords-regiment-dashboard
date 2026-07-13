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
        expect(events?.route).toBe('/dashboard/events');
        expect(events?.adminOnly).toBe(false);
    });

    it('routes Gallery to the in-shell admin surface and marks it admin-only', () => {
        const gallery = component.navItems.find((i) => i.key === 'gallery');
        expect(gallery?.route).toBe('/admin/gallery');
        expect(gallery?.adminOnly).toBe(true);
    });

    it('hides admin-only items from non-admins but keeps member-visible Events', () => {
        component.isAdmin = false;
        const keys = component.visibleItems.map((i) => i.key);
        expect(keys).toContain('dashboard');
        expect(keys).toContain('roster');
        // Events are now member-visible (T-0086).
        expect(keys).toContain('events');
        expect(keys).not.toContain('gallery');
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
        component.onNavigate('/admin/events');
        expect(emitted).toEqual(['/admin/events']);
    });
});
