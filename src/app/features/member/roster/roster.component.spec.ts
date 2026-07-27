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
            member({ id: 'owner-1', inGameName: 'The Colonel', permittedActions: nonePermitted() }),
        ]);

        const buttons = actionButtons(el);
        expect(buttons.length).toBe(1);
        expect(buttons[0].getAttribute('aria-label')).toBe('Member actions for Jameson Nolt');
    });

    it('hides the button on the Owner’s row and on the caller’s own row', () => {
        // Both are rows the API refuses every action on, so both come back with an
        // empty permittedActions block.
        const el = setup([
            member({ id: 'owner-1', role: 'Owner', permittedActions: nonePermitted() }),
            member({ id: 'admin-1', role: 'Admin', permittedActions: nonePermitted() }),
        ]);
        expect(actionButtons(el).length).toBe(0);
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
