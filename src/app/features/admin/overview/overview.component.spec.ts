import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { OverviewComponent } from './overview.component';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuditService } from '../../../core/services/audit.service';
import { EventsService } from '../../../core/services/events.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { DiscordService } from '../../../core/services/discord.service';
import { Application } from '../../../core/models/application.model';
import { AuditLog } from '../../../core/models/audit-log.model';
import { RegimentEvent } from '../../../core/models/event.model';

function application(): Application {
    return {
        id: 'app1',
        applicantName: 'Ensign Blake',
        discordTag: 'blake#0001',
        inGameName: 'Blake',
        applicantType: 'Member',
        currentRegiment: 'None',
        howFound: 'Discord',
        preferredClasses: 'Line',
        skillsToImprove: 'Drill',
        interestConfirmed: true,
        submittedAt: '2026-07-01T10:00:00.000Z',
        status: 'pending',
    };
}

function event(): RegimentEvent {
    return {
        id: 'ev1',
        title: 'Line Battle',
        description: 'Fall in.',
        serverName: 'LR #1',
        date: '2026-08-07',
        startTime: '19:30',
        endTime: '22:00',
        timezone: 'UTC',
        platforms: ['steam'],
        status: 'upcoming',
        tags: ['line-battle'],
        rsvpCounts: { interested: 2, tentative: 1, declined: 1, neutral: 0 },
    };
}

function auditLog(): AuditLog {
    return {
        id: 'log1',
        timestamp: '2026-08-03T09:00:00.000Z',
        actor: 'Colonel Hale',
        action: 'member.promote',
        detail: 'Promoted Blake to Corporal',
        severity: 'info',
    };
}

const user: CurrentUser = {
    id: 'u1',
    inGameName: 'Colonel Hale',
    username: 'hale',
    rank: 'Colonel',
    role: 'Admin',
    discordTag: 'hale#0001',
    discordLinked: true,
    avatarUrl: null,
    isMember: true,
    capabilities: [],
    // The guild gate is off in these specs (CONTRACT §1 — the API never omits
    // these four).
    guildMember: true,
    discordInviteUrl: null,
    guildGateEnabled: false,
    guildGateExempt: false,
};

/**
 * The overview is a STAFF console page now (T-0287), so what it must get right
 * is (a) which panels a given set of capabilities may see, and (b) that every
 * link out points at a route that still exists — the console moved up a level
 * and the event detail page left for the public site entirely.
 */
describe('OverviewComponent', () => {
    let fixture: ComponentFixture<OverviewComponent>;
    let component: OverviewComponent;
    let applications: jasmine.SpyObj<ApplicationsService>;
    let audit: jasmine.SpyObj<AuditService>;
    let gallery: jasmine.SpyObj<GalleryService>;
    let discord: jasmine.SpyObj<DiscordService>;

    function setup(capabilities: string[], role: CurrentUser['role'] = 'Admin'): void {
        // Explicit, so a single spec can re-render the page under a second set
        // of capabilities without tripping "module already instantiated".
        TestBed.resetTestingModule();

        const auth = {
            currentUser: signal<CurrentUser | null>({ ...user, role, capabilities }),
            isAdmin: () => role === 'Owner' || role === 'Admin' || role === 'Moderator',
            hasCapability: (c: string) => capabilities.includes(c),
        } as unknown as AuthService;

        const events = jasmine.createSpyObj<EventsService>('EventsService', ['getAllMine']);
        events.getAllMine.and.returnValue(of([event()]));

        applications = jasmine.createSpyObj<ApplicationsService>('ApplicationsService', ['getAll']);
        applications.getAll.and.returnValue(of([application()]));

        audit = jasmine.createSpyObj<AuditService>('AuditService', ['getAll']);
        audit.getAll.and.returnValue(of([auditLog()]));

        gallery = jasmine.createSpyObj<GalleryService>('GalleryService', ['pendingSummary']);
        gallery.pendingSummary.and.returnValue(
            of([{ id: 'g1', title: 'Charge at dawn', submitterUsername: 'blake' }]),
        );

        discord = jasmine.createSpyObj<DiscordService>('DiscordService', ['getStatus']);
        discord.getStatus.and.returnValue(
            of({
                connected: true,
                connectionStatus: 'connected',
                botVersion: '1.0.0',
                membersVisible: 42,
                totalRoles: 9,
                wsPing: 31,
                uptimeMs: 3_600_000,
                memoryBytes: 134_217_728,
                cpu: 4,
                readyAt: null,
                lastHeartbeatAt: null,
                lastFullSyncAt: null,
            }),
        );

        TestBed.configureTestingModule({
            imports: [CommonModule, RouterModule.forRoot([])],
            declarations: [OverviewComponent],
            providers: [
                { provide: AuthService, useValue: auth },
                { provide: EventsService, useValue: events },
                { provide: ApplicationsService, useValue: applications },
                { provide: AuditService, useValue: audit },
                { provide: GalleryService, useValue: gallery },
                { provide: DiscordService, useValue: discord },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(OverviewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    function hrefs(): string[] {
        return Array.from(
            fixture.nativeElement.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>,
        ).map((a) => a.getAttribute('href') ?? '');
    }

    it('links out to the console at its new depth, and to the PUBLIC event detail', () => {
        setup(['manage_applications', 'manage_events', 'view_audit_log']);
        const links = hrefs();

        expect(links).toContain('/app/events');
        expect(links).toContain('/app/applications');
        expect(links).toContain('/app/audit');
        expect(links).toContain('/app/gallery/moderation');
        // The staff-only event detail page is gone — its rows go to the public one.
        expect(links).toContain('/events/ev1');
        expect(links.filter((h) => h.startsWith('/app/dashboard'))).toEqual([]);
        expect(links.filter((h) => h.startsWith('/app/admin'))).toEqual([]);
    });

    it('shows a queue only to the capability that can act on it', () => {
        setup(['manage_applications'], 'Member');

        expect(applications.getAll).toHaveBeenCalled();
        expect(audit.getAll).not.toHaveBeenCalled();
        expect(gallery.pendingSummary).not.toHaveBeenCalled();
        expect(discord.getStatus).not.toHaveBeenCalled();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Awaiting Review');
        expect(text).not.toContain('Gallery submissions');
        expect(text).not.toContain('Recent Activity');
        expect(text).not.toContain('Lord Adjutant');
    });

    it('gates the bot widget on the role GET /discord/status itself requires', () => {
        // A Member holding manage_events is staff, but the status endpoint is
        // role-guarded — showing the widget would render a permanent error box.
        setup(['manage_events'], 'Member');
        expect(discord.getStatus).not.toHaveBeenCalled();
        expect(component.canViewBotStatus).toBeFalse();

        setup(['manage_events'], 'Moderator');
        expect(discord.getStatus).toHaveBeenCalled();
    });

    it('drops the aside entirely when none of its panels are permitted', () => {
        setup(['edit_ranks_medals'], 'Member');
        expect(component.hasAside).toBeFalse();
        expect(fixture.nativeElement.querySelector('.dashboard-aside')).toBeNull();
        expect(fixture.nativeElement.querySelector('.dashboard-grid--full')).toBeTruthy();
    });

    it('summarises an event by how many have answered, not by the viewer own RSVP', () => {
        setup(['manage_events'], 'Moderator');
        expect(component.rsvpTotal(event())).toBe(4);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('4 RSVPs');
    });
});
