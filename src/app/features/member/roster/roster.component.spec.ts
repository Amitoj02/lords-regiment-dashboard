import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { RosterComponent } from './roster.component';
import { MembersService } from '../../../core/services/members.service';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { Member, MemberPermittedActions } from '../../../core/models/member.model';

function allPermitted(): MemberPermittedActions {
    return {
        changeRole: true,
        changeRank: true,
        awardMedal: true,
        removeMedal: true,
        suspend: true,
        unsuspend: true,
        ban: true,
        unban: true,
        deriveFromDiscord: true,
    };
}

/**
 * Nothing permitted — the caller's OWN row, or a caller holding neither
 * capability. NOT what a peer or a superior looks like any more: see
 * {@link ranksMedalsOnly}.
 */
function nonePermitted(): MemberPermittedActions {
    return {
        changeRole: false,
        changeRank: false,
        awardMedal: false,
        removeMedal: false,
        suspend: false,
        unsuspend: false,
        ban: false,
        unban: false,
        deriveFromDiscord: false,
    };
}

/**
 * A peer, a superior or the regiment owner, for a caller holding both
 * capabilities: the moderation half refused on standing, the rank/medal half
 * permitted (backend T-0211).
 */
function ranksMedalsOnly(): MemberPermittedActions {
    return {
        ...allPermitted(),
        changeRole: false,
        suspend: false,
        unsuspend: false,
        ban: false,
        unban: false,
    };
}

function member(overrides: Partial<Member> = {}): Member {
    return {
        id: 'm1',
        discordTag: 'nolt#0001',
        inGameName: 'Jameson Nolt',
        rank: 'Sergeant',
        role: 'Member',
        discordLinked: true,
        status: 'Active',
        lastSeen: new Date().toISOString(),
        permittedActions: allPermitted(),
        ...overrides,
    };
}

function currentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
    return {
        id: 'admin-1',
        inGameName: 'Admin One',
        rank: 'Captain',
        role: 'Admin',
        discordTag: 'admin#0001',
        discordLinked: true,
        avatarUrl: null,
        isMember: true,
        capabilities: ['manage_roles', 'edit_ranks_medals'],
        // The gate is off in these specs, so the session behaves exactly as it
        // did before T-0261 (CONTRACT §1 — the API never omits these four).
        guildMember: true,
        discordInviteUrl: null,
        guildGateEnabled: false,
        guildGateExempt: false,
        ...overrides,
    };
}

describe('RosterComponent row actions (T-0266)', () => {
    let fixture: ComponentFixture<RosterComponent>;
    let component: RosterComponent;

    function setup(rows: Member[], me: CurrentUser = currentUser()): HTMLElement {
        const user = signal<CurrentUser | null>(me);
        const members = { getAll: () => of(rows) } as unknown as MembersService;
        const auth = {
            currentUser: user,
            hasCapability: (capability: string) =>
                user()?.capabilities?.includes(capability) ?? false,
            isOwnerOrAdmin: () => me.role === 'Owner' || me.role === 'Admin',
        } as unknown as AuthService;

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [RosterComponent],
            providers: [
                { provide: MembersService, useValue: members },
                { provide: AuthService, useValue: auth },
                { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(RosterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    function actionButtons(el: HTMLElement): HTMLButtonElement[] {
        return Array.from(el.querySelectorAll<HTMLButtonElement>('.col-actions button'));
    }

    it('shows the row action button only where an action is permitted', () => {
        const el = setup([
            member({ id: 'm1', inGameName: 'Jameson Nolt' }),
            member({ id: 'admin-1', inGameName: 'Admin One', permittedActions: nonePermitted() }),
        ]);

        const buttons = actionButtons(el);
        expect(buttons.length).toBe(1);
        expect(buttons[0].getAttribute('aria-label')).toBe('Member actions for Jameson Nolt');
    });

    it('shows it on a row where only the rank and medal half is permitted', () => {
        const el = setup([
            member({
                id: 'adm-2',
                inGameName: 'Nolt',
                role: 'Admin',
                permittedActions: ranksMedalsOnly(),
            }),
        ]);
        expect(actionButtons(el).length).toBe(1);
    });

    it('hides the button on the caller’s own row', () => {
        // The one row the API refuses every action on, so it comes back with an
        // empty permittedActions block. It is now the ONLY such row for a caller
        // holding a capability (backend T-0211).
        const el = setup([
            member({ id: 'admin-1', role: 'Admin', permittedActions: nonePermitted() }),
        ]);
        expect(actionButtons(el).length).toBe(0);
    });

    it('shows it on the Owner’s row, for the rank and medal actions', () => {
        // The Owner used to be untouchable from every angle. Their rank and medals
        // are not: an edit_ranks_medals holder keeps the whole service record, so
        // the `···` belongs on that row (backend T-0211).
        const el = setup([
            member({ id: 'owner-1', role: 'Owner', permittedActions: ranksMedalsOnly() }),
        ]);
        expect(actionButtons(el).length).toBe(1);
    });

    it('shows no action button at all to a caller with no capabilities', () => {
        const el = setup([member()], currentUser({ role: 'Member', capabilities: [] }));
        expect(actionButtons(el).length).toBe(0);
    });

    it('treats a member with no permittedActions block as untouchable', () => {
        // Fail closed: an older projection must not re-open the `···`.
        const el = setup([member({ permittedActions: undefined })]);
        expect(actionButtons(el).length).toBe(0);
        expect(component.canActOn(member({ permittedActions: undefined }))).toBe(false);
    });

    it('shows the button to the Owner on every row', () => {
        const el = setup(
            [member({ id: 'm1' }), member({ id: 'adm-2', role: 'Admin' })],
            currentUser({ id: 'owner-1', role: 'Owner' }),
        );
        expect(actionButtons(el).length).toBe(2);
    });

    it('refuses to open the modal for a member nothing is permitted on', () => {
        setup([member({ id: 'owner-1', permittedActions: nonePermitted() })]);
        component.openActions(member({ id: 'owner-1', permittedActions: nonePermitted() }));
        expect(component.selectedMember).toBeNull();
    });

    it('opens the modal for a member an action is permitted on', () => {
        setup([member()]);
        const target = member();
        component.openActions(target);
        expect(component.selectedMember).toBe(target);
    });

    describe('last-seen column', () => {
        it('renders "Never" for a member the API has no lastSeenAt for', () => {
            // mapMember turns a null lastSeenAt into '', and `new Date('')` is an
            // Invalid Date — which used to reach the column as the literal text
            // "Invalid Date" for every member between approval and first sign-in.
            setup([member()]);
            expect(component.formatLastSeen('')).toBe('Never');
        });

        it('renders "Never" rather than "Invalid Date" for an unparseable value', () => {
            setup([member()]);
            expect(component.formatLastSeen('not-a-date')).toBe('Never');
        });

        it('still formats a real timestamp', () => {
            setup([member()]);
            expect(component.formatLastSeen(new Date().toISOString())).toBe('Today');
        });
    });
});
