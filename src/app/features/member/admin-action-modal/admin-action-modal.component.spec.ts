import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AdminActionModalComponent } from './admin-action-modal.component';
import { MembersService } from '../../../core/services/members.service';
import { RanksService } from '../../../core/services/ranks.service';
import { MedalsService } from '../../../core/services/medals.service';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Member, MemberPermittedActions } from '../../../core/models/member.model';

/** Every action permitted — what the API sends when the caller outranks the target. */
function allPermitted(overrides: Partial<MemberPermittedActions> = {}): MemberPermittedActions {
    return {
        changeRole: true,
        changeRank: true,
        awardMedal: true,
        removeMedal: true,
        suspend: true,
        unsuspend: true,
        ban: true,
        unban: true,
        ...overrides,
    };
}

/** Nothing permitted — what the API sends for a peer or a superior (T-0266). */
function nonePermitted(): MemberPermittedActions {
    return allPermitted({
        changeRole: false,
        changeRank: false,
        awardMedal: false,
        removeMedal: false,
        suspend: false,
        unsuspend: false,
        ban: false,
        unban: false,
    });
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
        lastSeen: '2026-07-01T12:00:00',
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

describe('AdminActionModalComponent (T-0246 no self-suspend/self-ban)', () => {
    let fixture: ComponentFixture<AdminActionModalComponent>;
    let component: AdminActionModalComponent;
    let members: jasmine.SpyObj<MembersService>;
    let toast: jasmine.SpyObj<ToastService>;
    let user: ReturnType<typeof signal<CurrentUser | null>>;

    function setup(me: CurrentUser | null = currentUser()): void {
        members = jasmine.createSpyObj<MembersService>('MembersService', [
            'changeRank',
            'changeRole',
            'awardMedal',
            'removeMedal',
            'suspend',
            'unsuspend',
            'ban',
            'unban',
        ]);
        toast = jasmine.createSpyObj<ToastService>('ToastService', ['error', 'success', 'info']);
        user = signal<CurrentUser | null>(me);
        const auth = {
            currentUser: user,
            // Faithful stub: the real service reads the capability list off the
            // signed-in user, so a test that changes the role gets the matching
            // capabilities too.
            hasCapability: (capability: string) =>
                user()?.capabilities?.includes(capability) ?? false,
        } as unknown as AuthService;
        const ranks = { getAll: () => of([]) } as unknown as RanksService;
        const medals = { getAll: () => of([]) } as unknown as MedalsService;

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [AdminActionModalComponent],
            providers: [
                { provide: MembersService, useValue: members },
                { provide: RanksService, useValue: ranks },
                { provide: MedalsService, useValue: medals },
                { provide: AuthService, useValue: auth },
                { provide: ToastService, useValue: toast },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(AdminActionModalComponent);
        component = fixture.componentInstance;
    }

    function open(target: Member): HTMLElement {
        component.member = target;
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    function buttonLabelled(el: HTMLElement, label: string): HTMLButtonElement {
        const match = Array.from(el.querySelectorAll('button')).find((b) =>
            (b.textContent ?? '').includes(label),
        );
        expect(match).withContext(`button "${label}"`).toBeTruthy();
        return match as HTMLButtonElement;
    }

    it('identifies your own record by member id', () => {
        setup(currentUser({ id: 'm1' }));
        component.member = member({ id: 'm1' });
        expect(component.isSelf).toBe(true);
    });

    it('does not treat a same-named different member as yourself', () => {
        // Names collide; ids do not. Matching on the name would lock an admin out
        // of a legitimate moderation action.
        setup(currentUser({ id: 'admin-1', inGameName: 'Jameson Nolt' }));
        component.member = member({ id: 'm1', inGameName: 'Jameson Nolt' });
        expect(component.isSelf).toBe(false);
    });

    it('does not treat an identity-only viewer as yourself on an id collision', () => {
        setup(currentUser({ id: 'm1', isMember: false }));
        component.member = member({ id: 'm1' });
        expect(component.isSelf).toBe(false);
    });

    it('disables Suspend and Ban with a stated reason on your own record', () => {
        setup(currentUser({ id: 'm1' }));
        const el = open(member({ id: 'm1' }));
        expect(buttonLabelled(el, 'Suspend member').disabled).toBe(true);
        expect(buttonLabelled(el, 'Ban member').disabled).toBe(true);
        // The reason must be discoverable, not just implied by a dead control.
        const hints = el.querySelectorAll('.aam-self-hint');
        expect(hints.length).toBe(2);
        expect(hints[0].textContent).toContain('your own record');
    });

    it('leaves Suspend and Ban usable on any other member', () => {
        setup(currentUser({ id: 'admin-1' }));
        const el = open(member({ id: 'm1' }));
        expect(buttonLabelled(el, 'Suspend member').disabled).toBe(false);
        expect(buttonLabelled(el, 'Ban member').disabled).toBe(false);
        expect(el.querySelector('.aam-self-hint')).toBeNull();
    });

    it('never calls the API for a self-targeted suspend, even from a stale click', () => {
        setup(currentUser({ id: 'm1' }));
        component.member = member({ id: 'm1' });
        component.suspendUntil = '2099-01-01T12:00';
        component.suspend();
        expect(members.suspend).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('You cannot suspend your own account.');
    });

    it('never opens the ban confirmation for your own record', () => {
        setup(currentUser({ id: 'm1' }));
        component.member = member({ id: 'm1' });
        component.startBan();
        expect(component.banConfirming).toBe(false);
        component.confirmBan();
        expect(members.ban).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('You cannot ban your own account.');
    });

    it('still suspends another member normally', () => {
        setup(currentUser({ id: 'admin-1' }));
        const target = member({ id: 'm1' });
        members.suspend.and.returnValue(of(target));
        component.member = target;
        component.suspendUntil = '2099-01-01T12:00';
        component.suspend();
        expect(members.suspend).toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('raises a toast when the API rejects an action, so it is never a silent no-op', () => {
        setup(currentUser({ id: 'admin-1' }));
        const target = member({ id: 'm1' });
        members.ban.and.returnValue(
            throwError(() => ({ error: { message: 'You cannot ban your own account' } })),
        );
        component.member = target;
        component.confirmBan();
        expect(toast.error).toHaveBeenCalledWith('You cannot ban your own account');
        expect(component.error).toBe('You cannot ban your own account');
        expect(component.banBusy).toBe(false);
    });
});

describe('AdminActionModalComponent (T-0266 role hierarchy)', () => {
    let fixture: ComponentFixture<AdminActionModalComponent>;
    let component: AdminActionModalComponent;
    let members: jasmine.SpyObj<MembersService>;
    let toast: jasmine.SpyObj<ToastService>;

    /** Labels of the five gated controls, one per section. */
    const RANK = 'Change rank';
    const ROLE = 'Change role';
    const AWARD = 'Award';
    const SUSPEND = 'Suspend member';
    const BAN = 'Ban member';

    function setup(me: CurrentUser): void {
        members = jasmine.createSpyObj<MembersService>('MembersService', [
            'changeRank',
            'changeRole',
            'awardMedal',
            'removeMedal',
            'suspend',
            'unsuspend',
            'ban',
            'unban',
        ]);
        toast = jasmine.createSpyObj<ToastService>('ToastService', ['error', 'success', 'info']);
        const user = signal<CurrentUser | null>(me);
        const auth = {
            currentUser: user,
            hasCapability: (capability: string) =>
                user()?.capabilities?.includes(capability) ?? false,
        } as unknown as AuthService;

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [AdminActionModalComponent],
            providers: [
                { provide: MembersService, useValue: members },
                { provide: RanksService, useValue: { getAll: () => of([]) } },
                { provide: MedalsService, useValue: { getAll: () => of([]) } },
                { provide: AuthService, useValue: auth },
                { provide: ToastService, useValue: toast },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(AdminActionModalComponent);
        component = fixture.componentInstance;
    }

    function open(target: Member): HTMLElement {
        component.member = target;
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    /** Exact-label lookup: 'Award' must not match the 'Awarding…' busy state. */
    function control(el: HTMLElement, label: string): HTMLButtonElement | null {
        return (
            Array.from(el.querySelectorAll('button')).find(
                (b) => (b.textContent ?? '').trim() === label,
            ) ?? null
        );
    }

    function labels(el: HTMLElement): string[] {
        return [RANK, ROLE, AWARD, SUSPEND, BAN].filter((l) => control(el, l) !== null);
    }

    function noPermissionNotice(el: HTMLElement): Element | null {
        return el.querySelector('.notice.info');
    }

    it('offers an Admin nothing at all on the Owner', () => {
        // The backend's strictly-outranks guard refuses every one of these, so the
        // modal must not put a single control on screen.
        setup(currentUser({ role: 'Admin' }));
        const el = open(
            member({ id: 'owner-1', role: 'Owner', permittedActions: nonePermitted() }),
        );

        expect(labels(el)).toEqual([]);
        expect(el.querySelectorAll('.aam-section').length).toBe(0);
        expect(component.hasAnyPermittedAction).toBe(false);
        expect(noPermissionNotice(el)?.textContent).toContain("don't have permission");
    });

    it('offers a Moderator nothing on an Admin', () => {
        setup(currentUser({ id: 'mod-1', role: 'Moderator' }));
        const el = open(member({ id: 'adm-2', role: 'Admin', permittedActions: nonePermitted() }));

        expect(labels(el)).toEqual([]);
        expect(noPermissionNotice(el)).not.toBeNull();
    });

    it('offers a Moderator the full set on an ordinary Member', () => {
        setup(currentUser({ id: 'mod-1', role: 'Moderator' }));
        const el = open(member({ id: 'm1', role: 'Member' }));

        expect(labels(el)).toEqual([RANK, ROLE, AWARD, SUSPEND, BAN]);
        expect(noPermissionNotice(el)).toBeNull();
    });

    it('offers the Owner every action against anyone, including an Admin', () => {
        setup(currentUser({ id: 'owner-1', role: 'Owner' }));
        const el = open(member({ id: 'adm-2', role: 'Admin' }));

        expect(labels(el)).toEqual([RANK, ROLE, AWARD, SUSPEND, BAN]);
        expect(noPermissionNotice(el)).toBeNull();
    });

    it('offers nothing when the member arrives with no permittedActions block', () => {
        // Fail closed: a projection without the block is "nothing permitted",
        // never "everything permitted".
        setup(currentUser({ role: 'Owner' }));
        const el = open(member({ permittedActions: undefined }));

        expect(labels(el)).toEqual([]);
        expect(component.hasAnyPermittedAction).toBe(false);
        expect(noPermissionNotice(el)).not.toBeNull();
    });

    it('still gates on the global capability, not only the per-target flag', () => {
        // The API would not send a permitted flag without the capability, but the
        // modal ANDs both so a stale capability list can only ever narrow the UI.
        setup(currentUser({ role: 'Owner', capabilities: ['edit_ranks_medals'] }));
        const el = open(member({ id: 'm1' }));

        expect(labels(el)).toEqual([RANK, AWARD]);
    });

    it('shows only the section whose flag is set', () => {
        setup(currentUser({ role: 'Owner' }));
        const el = open(member({ permittedActions: { ...nonePermitted(), changeRank: true } }));
        expect(labels(el)).toEqual([RANK]);
    });

    it('never calls the API for an action the server did not permit', () => {
        setup(currentUser({ role: 'Admin' }));
        component.member = member({ role: 'Owner', permittedActions: nonePermitted() });
        component.suspendUntil = '2099-01-01T12:00';
        component.selectedRankId = 'r1';
        component.selectedRole = 'Member';

        component.suspend();
        component.changeRank();
        component.changeRole();
        component.startBan();

        expect(members.suspend).not.toHaveBeenCalled();
        expect(members.changeRank).not.toHaveBeenCalled();
        expect(members.changeRole).not.toHaveBeenCalled();
        expect(component.banConfirming).toBe(false);
        expect(component.error).toContain("don't have permission");
    });

    it('never offers a role at or above the caller’s own', () => {
        setup(currentUser({ role: 'Admin' }));
        component.member = member();
        expect(component.assignableRoles).toEqual([
            'Moderator',
            'Member',
            'Mercenary',
            'Applicant',
        ]);
        expect(component.assignableRoles).not.toContain('Admin');
        expect(component.assignableRoles).not.toContain('Owner');
    });

    it('narrows the role list further for a Moderator', () => {
        setup(currentUser({ role: 'Moderator' }));
        component.member = member();
        expect(component.assignableRoles).toEqual(['Member', 'Mercenary', 'Applicant']);
    });

    it('opens the role list to the Owner, but never offers Owner itself', () => {
        setup(currentUser({ role: 'Owner' }));
        component.member = member();
        expect(component.assignableRoles).toEqual([
            'Admin',
            'Moderator',
            'Member',
            'Mercenary',
            'Applicant',
        ]);
        // Ownership moves through its own flow, never this dropdown.
        expect(component.assignableRoles).not.toContain('Owner');
    });

    it('does not preselect a role the caller cannot re-assign', () => {
        setup(currentUser({ role: 'Admin' }));
        component.member = member({ role: 'Admin' });
        expect(component.selectedRole).toBe('');
    });

    it('renders a readable error and folds the controls away on a 403 race', () => {
        // Permissions changed mid-session: the projection said "allowed", the API
        // says otherwise. That must read as a rule, not as a broken button.
        setup(currentUser({ role: 'Admin' }));
        members.suspend.and.returnValue(
            throwError(() => ({ status: 403, error: { message: 'Forbidden' } })),
        );
        const el = open(member({ id: 'm1' }));
        expect(control(el, SUSPEND)).not.toBeNull();

        component.suspendUntil = '2099-01-01T12:00';
        component.suspend();
        fixture.detectChanges();

        expect(component.error).toContain('permissions may have changed');
        expect(component.error).toContain('Reload the page');
        expect(toast.error).toHaveBeenCalledWith(component.error as string);
        expect(component.suspendBusy).toBe(false);
        // Fail closed after the refusal — no second rejected click on offer.
        expect(component.hasAnyPermittedAction).toBe(false);
        expect(labels(fixture.nativeElement as HTMLElement)).toEqual([]);
    });

    it('names the member when a 403 carries no server message', () => {
        setup(currentUser({ role: 'Admin' }));
        members.unban.and.returnValue(throwError(() => ({ status: 403 })));
        component.member = member({ inGameName: 'Jameson Nolt', bannedAt: '2026-06-01T00:00:00' });
        component.unban();
        expect(component.error).toContain('Jameson Nolt');
        expect(component.error).toContain('permissions may have changed');
    });

    it('leaves a non-403 failure on the server’s own message', () => {
        setup(currentUser({ role: 'Admin' }));
        members.ban.and.returnValue(
            throwError(() => ({ status: 409, error: { message: 'Already banned' } })),
        );
        component.member = member();
        component.confirmBan();
        expect(component.error).toBe('Already banned');
        // A 409 says nothing about permissions, so the controls stay.
        expect(component.hasAnyPermittedAction).toBe(true);
    });
});
