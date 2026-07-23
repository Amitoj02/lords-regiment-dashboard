import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { MembersService, ServiceRecordEntry } from '../../../core/services/members.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../core/services/storage.service';
import { Member } from '../../../core/models/member.model';

function member(overrides: Partial<Member> = {}): Member {
    return {
        id: 'm1',
        discordTag: 'nolt#0001',
        inGameName: 'Jameson Nolt',
        rank: 'Sergeant',
        role: 'Member',
        discordLinked: true,
        status: 'Active',
        lastSeen: '2026-07-01T12:00:00',
        ...overrides,
    };
}

function entry(type: string, id = type): ServiceRecordEntry {
    return {
        id,
        occurredAt: '2026-06-01T12:00:00',
        type,
        event: `Event for ${type}`,
        note: null,
    };
}

function currentUser(): CurrentUser {
    return {
        id: 'm1',
        inGameName: 'Jameson Nolt',
        rank: 'Sergeant',
        role: 'Member',
        discordTag: 'nolt#0001',
        discordLinked: true,
        avatarUrl: null,
        isMember: true,
        capabilities: [],
        // The gate is off in these specs, so the session behaves exactly as it
        // did before T-0261 (CONTRACT §1 — the API never omits these four).
        guildMember: true,
        discordInviteUrl: null,
        guildGateEnabled: false,
        guildGateExempt: false,
    };
}

describe('ProfileComponent service record (T-0253)', () => {
    let fixture: ComponentFixture<ProfileComponent>;
    let component: ProfileComponent;

    function setup(record: ServiceRecordEntry[] = []): void {
        const members = {
            getById: () => of(member()),
            getEvents: () => of([]),
            getRsvps: () => of([]),
            getServiceRecord: () => of(record),
        } as unknown as MembersService;
        const auth = {
            isAdmin: () => false,
            currentUser: signal<CurrentUser | null>(currentUser()),
            loadCurrentUser: () => of(currentUser()),
        } as unknown as AuthService;
        const storage = {
            getPolicy: () => of(DEFAULT_STORAGE_POLICY),
        } as unknown as StorageService;

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [ProfileComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap({ id: 'm1' })) },
                },
                { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
                { provide: Location, useValue: { back: () => undefined } },
                { provide: MembersService, useValue: members },
                { provide: GalleryService, useValue: { getAll: () => of([]) } },
                { provide: AuthService, useValue: auth },
                { provide: StorageService, useValue: storage },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(ProfileComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('gives a demotion its own class, distinct from a promotion', () => {
        setup();
        expect(component.serviceEntryClass('demotion')).toBe('is-demotion');
        expect(component.serviceEntryClass('promotion')).not.toBe('is-demotion');
    });

    it('leaves promotion on the rank class', () => {
        setup();
        expect(component.serviceEntryClass('promotion')).toBe('is-rank');
        expect(component.serviceEntryClass('rank')).toBe('is-rank');
    });

    it('renders an unrecognised type neutrally, never as a promotion', () => {
        // The old `default: return ''` inherited .timeline-dot's brass, which is
        // exactly .is-rank — an unknown type silently claimed a promotion.
        setup();
        const unknown = component.serviceEntryClass('conscription');
        expect(unknown).toBe('is-neutral');
        expect(unknown).not.toBe(component.serviceEntryClass('promotion'));
        expect(unknown).not.toBe('');
    });

    it('renders enlistment neutrally (the API writes it on approval)', () => {
        setup();
        expect(component.serviceEntryClass('enlistment')).toBe('is-neutral');
    });

    it('keeps the existing role / award / suspension classes', () => {
        setup();
        expect(component.serviceEntryClass('role')).toBe('is-role');
        expect(component.serviceEntryClass('award')).toBe('is-medal');
        expect(component.serviceEntryClass('medal')).toBe('is-medal');
        expect(component.serviceEntryClass('suspension')).toBe('is-suspension');
        expect(component.serviceEntryClass('ban')).toBe('is-suspension');
    });

    it('applies the type class to the tag as well as the dot', () => {
        setup([entry('demotion'), entry('enlistment')]);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const tags = el.querySelectorAll('.timeline-type');
        const dots = el.querySelectorAll('.timeline-dot');
        expect(tags.length).toBe(2);
        expect(tags[0].classList).toContain('is-demotion');
        expect(dots[0].classList).toContain('is-demotion');
        expect(tags[1].classList).toContain('is-neutral');
        expect(dots[1].classList).toContain('is-neutral');
    });
});
