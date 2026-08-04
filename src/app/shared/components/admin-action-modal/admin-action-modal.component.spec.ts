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

/**
 * Every action permitted — what the API sends when the caller holds both
 * capabilities AND outranks the target.
 */
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
        deriveFromDiscord: true,
        ...overrides,
    };
}

/**
 * Nothing permitted — what the API sends to a caller holding neither capability
 * (T-0266).
 *
 * ⚠️ NOT what a peer, a superior or your OWN record looks like any more — those
 * all carry the four rank/medal flags. See {@link ranksMedalsOnly}.
 */
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
        deriveFromDiscord: false,
    });
}

/**
 * The shape a peer, a superior, the regiment owner or the caller's OWN record
 * now arrives in for a caller holding both capabilities (backend T-0211): the
 * moderation half refused, the rank/medal half permitted because a decoration is
 * not authority.
 */
function ranksMedalsOnly(): MemberPermittedActions {
    return allPermitted({
        changeRole: false,
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
        // Vanity handle backing `/u/@handle` (T-0287); unclaimed by default.
        username: null,
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
            'deriveFromDiscord',
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

    it('⚠️ lets a rank or medal write through on your OWN record', () => {
        // The self-promotion path, permitted deliberately (backend T-0211). The
        // dialog opens on your own row now, offers Rank/Medals/Derive, and only
        // Suspend and Ban stay dead — which is the state the hints above explain.
        setup(currentUser({ id: 'm1' }));
        const self = member({ id: 'm1', permittedActions: ranksMedalsOnly() });
        members.changeRank.and.returnValue(of(self));
        component.member = self;
        component.selectedRankId = 'r1';

        component.changeRank();

        expect(members.changeRank).toHaveBeenCalledWith('m1', 'r1');
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('still shows the Suspend and Ban hints on your own record, now that it opens', () => {
        setup(currentUser({ id: 'm1' }));
        const el = open(member({ id: 'm1', permittedActions: ranksMedalsOnly() }));

        expect(buttonLabelled(el, 'Suspend member').disabled).toBe(true);
        expect(buttonLabelled(el, 'Ban member').disabled).toBe(true);
        expect(el.querySelectorAll('.aam-self-hint').length).toBe(2);
        // ...and the rank section is offered alongside them. (Its button waits on
        // a rank being picked, so presence is the assertion, not enabledness.)
        expect(component.canChangeRank).toBe(true);
        expect(buttonLabelled(el, 'Change rank')).toBeTruthy();
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

    /** Labels of the gated controls, one per section, in the order they render. */
    const RANK = 'Change rank';
    const ROLE = 'Change role';
    const AWARD = 'Award';
    const DERIVE = 'Derive data from Discord';
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
            'deriveFromDiscord',
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
        return [RANK, ROLE, AWARD, DERIVE, SUSPEND, BAN].filter((l) => control(el, l) !== null);
    }

    /**
     * The "nothing at all" notice specifically. `.notice.info` is not unique —
     * the partial-lockout notice and the derive outcome share the class — so both
     * are excluded rather than matched by position.
     */
    function noPermissionNotice(el: HTMLElement): Element | null {
        return el.querySelector('.notice.info:not(.aam-partial):not(.aam-derive-outcome)');
    }

    /** The partial-lockout notice: rank/medals on offer, moderation withheld. */
    function partialNotice(el: HTMLElement): Element | null {
        return el.querySelector('.aam-partial');
    }

    it('offers an Admin the rank and medal half on the Owner', () => {
        // The owner pointer guards the SEAT. Their rank and medals are a record
        // of what they did, so an edit_ranks_medals holder keeps writing it
        // (backend T-0211) — this dialog used to be empty.
        setup(currentUser({ role: 'Admin' }));
        const el = open(
            member({ id: 'owner-1', role: 'Owner', permittedActions: ranksMedalsOnly() }),
        );

        expect(labels(el)).toEqual([RANK, AWARD, DERIVE]);
        expect(component.hasAnyPermittedAction).toBe(true);
        expect(noPermissionNotice(el)).toBeNull();
    });

    it('offers a Moderator the rank and medal half on an Admin', () => {
        // The case the exemption exists for: a Moderator trusted with the service
        // record was refused against every peer and superior on the roster.
        setup(currentUser({ id: 'mod-1', role: 'Moderator' }));
        const el = open(
            member({ id: 'adm-2', role: 'Admin', permittedActions: ranksMedalsOnly() }),
        );

        expect(labels(el)).toEqual([RANK, AWARD, DERIVE]);
        expect(noPermissionNotice(el)).toBeNull();
    });

    /**
     * The reported confusion. Appointing a peer is allowed and moderating one is
     * not, so an Admin who promotes a Moderator to Admin gets a success toast and,
     * in the SAME tick, a projection whose moderation flags are all false — and
     * the dialog used to answer that with "You don't have permission to manage
     * this member", which reads as the promotion having been rejected. It was not.
     *
     * Since backend T-0211 the lockout is PARTIAL: the rank and medal controls are
     * still on screen, so the sentence has to name the half that is missing rather
     * than the record as a whole.
     */
    it('explains the peer-appointment lockout beside the controls that still work', () => {
        setup(currentUser({ id: 'adm-1', role: 'Admin' }));
        const el = open(
            member({
                id: 'adm-2',
                inGameName: 'Nolt',
                role: 'Admin',
                permittedActions: ranksMedalsOnly(),
            }),
        );

        expect(component.moderationLockedOut).toBe(true);
        const notice = partialNotice(el)?.textContent ?? '';
        expect(notice).toContain('Nolt is an Admin');
        // "someone who outranks them", NOT "only the Owner": the server rule is
        // strict precedence (`outranks`), so an Admin may still act on this
        // Moderator-appointed-Moderator case. Naming the Owner would be wrong
        // for every target below Admin.
        expect(notice).toContain('outranks them');
        expect(notice).not.toContain("don't have permission");
        // ...and it must be about the moderation half only, because the rank and
        // medal controls are visibly right there.
        expect(notice).toContain('role, suspension and ban');
        expect(notice).toContain('rank and medals are still yours');
        expect(labels(el)).toEqual([RANK, AWARD, DERIVE]);
    });

    it('keeps the empty dialog for a caller who only ever held manage_roles', () => {
        // No edit_ranks_medals, so nothing survives the standing rule and the
        // all-or-nothing notice is still the right answer.
        setup(currentUser({ id: 'adm-1', role: 'Admin', capabilities: ['manage_roles'] }));
        const el = open(
            member({ id: 'adm-2', role: 'Admin', permittedActions: ranksMedalsOnly() }),
        );

        expect(labels(el)).toEqual([]);
        expect(component.hasAnyPermittedAction).toBe(false);
        expect(component.moderationLockedOut).toBe(false);
        expect(partialNotice(el)).toBeNull();
        expect(noPermissionNotice(el)?.textContent).toContain('equal standing to you or above it');
    });

    it('raises no standing notice when the caller could not moderate anyone anyway', () => {
        // edit_ranks_medals only: they never held the moderation half, so telling
        // them it is withheld on standing is noise about a rule they are not
        // subject to.
        setup(currentUser({ id: 'mod-1', role: 'Moderator', capabilities: ['edit_ranks_medals'] }));
        const el = open(
            member({ id: 'adm-2', role: 'Admin', permittedActions: ranksMedalsOnly() }),
        );

        expect(labels(el)).toEqual([RANK, AWARD, DERIVE]);
        expect(component.moderationLockedOut).toBe(false);
        expect(partialNotice(el)).toBeNull();
    });

    it('raises no standing notice on a member the caller CAN moderate', () => {
        setup(currentUser({ id: 'mod-1', role: 'Moderator' }));
        const el = open(member({ id: 'm1', role: 'Member' }));

        expect(component.moderationLockedOut).toBe(false);
        expect(partialNotice(el)).toBeNull();
    });

    it('falls back to the generic notice when standing is not the reason', () => {
        // A Moderator with neither capability on an ordinary Member: the server
        // withheld every flag on CAPABILITY, not on hierarchy, so the standing
        // sentence would be a lie.
        setup(currentUser({ id: 'mod-1', role: 'Moderator', capabilities: [] }));
        const el = open(member({ id: 'm1', role: 'Member', permittedActions: nonePermitted() }));

        expect(noPermissionNotice(el)?.textContent).toContain("don't have permission");
    });

    it('offers a Moderator the full set on an ordinary Member', () => {
        setup(currentUser({ id: 'mod-1', role: 'Moderator' }));
        const el = open(member({ id: 'm1', role: 'Member' }));

        expect(labels(el)).toEqual([RANK, ROLE, AWARD, DERIVE, SUSPEND, BAN]);
        expect(noPermissionNotice(el)).toBeNull();
    });

    it('offers the Owner every action against anyone, including an Admin', () => {
        setup(currentUser({ id: 'owner-1', role: 'Owner' }));
        const el = open(member({ id: 'adm-2', role: 'Admin' }));

        expect(labels(el)).toEqual([RANK, ROLE, AWARD, DERIVE, SUSPEND, BAN]);
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

        expect(labels(el)).toEqual([RANK, AWARD, DERIVE]);
    });

    it('shows only the section whose flag is set', () => {
        setup(currentUser({ role: 'Owner' }));
        const el = open(member({ permittedActions: { ...nonePermitted(), changeRank: true } }));
        expect(labels(el)).toEqual([RANK]);
    });

    it('never calls the API for an action the server did not permit', () => {
        // A deliberately IMPOSSIBLE block — the server would send ranksMedalsOnly()
        // for this caller and target. That is the point: this pins the
        // belt-and-braces re-check against a stale projection, which by definition
        // is a shape the API is no longer producing.
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

    it('refuses the withheld half of a mixed block and lets the permitted half through', () => {
        // The block genuinely mixes true and false now, so the belt-and-braces
        // re-check has to read it per action rather than treating one flag as the
        // verdict for the record.
        setup(currentUser({ role: 'Admin' }));
        const target = member({ id: 'adm-2', role: 'Admin', permittedActions: ranksMedalsOnly() });
        members.changeRank.and.returnValue(of(target));
        component.member = target;
        component.suspendUntil = '2099-01-01T12:00';
        component.selectedRankId = 'r1';
        component.selectedRole = 'Member';

        component.changeRank();
        component.suspend();
        component.changeRole();
        component.startBan();

        expect(members.changeRank).toHaveBeenCalledWith('adm-2', 'r1');
        expect(members.suspend).not.toHaveBeenCalled();
        expect(members.changeRole).not.toHaveBeenCalled();
        expect(component.banConfirming).toBe(false);
    });

    it('offers the caller’s own tier, but never one above it (T-0283)', () => {
        // Holding manage_roles is what lets an Admin appoint another Admin; what
        // stays shut is escalation, and Owner has its own flow entirely.
        setup(currentUser({ role: 'Admin' }));
        component.member = member();
        expect(component.assignableRoles).toEqual([
            'Admin',
            'Moderator',
            'Member',
            'Mercenary',
            'Applicant',
        ]);
        expect(component.assignableRoles).not.toContain('Owner');
    });

    it('narrows the role list further for a Moderator', () => {
        setup(currentUser({ role: 'Moderator' }));
        component.member = member();
        expect(component.assignableRoles).toEqual([
            'Moderator',
            'Member',
            'Mercenary',
            'Applicant',
        ]);
        // A Moderator appoints Moderators, never Admins — the ceiling is the
        // caller's own tier, not the whole ladder.
        expect(component.assignableRoles).not.toContain('Admin');
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
        // A Moderator opening an Admin: 'Admin' is above their ceiling, so the
        // select seeds blank rather than showing a label it cannot offer.
        setup(currentUser({ role: 'Moderator' }));
        component.member = member({ role: 'Admin' });
        expect(component.selectedRole).toBe('');
    });

    it('preselects the target’s own tier once the caller may assign it (T-0283)', () => {
        // The peer entry is now in the list, so an Admin opening a Moderator sees
        // that member's actual role selected — not a blank control.
        setup(currentUser({ role: 'Admin' }));
        component.member = member({ role: 'Moderator' });
        expect(component.selectedRole).toBe('Moderator');
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

/**
 * T-0284 — every admin action confirms itself.
 *
 * These dialogs sit over a page the change is not visible on, and several
 * actions leave no mark inside the modal either: a role change swaps a value in
 * a select that already showed it, a medal removal takes away a chip nobody was
 * looking at. Before this, a completed action and a click that silently did
 * nothing were indistinguishable — failures raised a toast (T-0246) and
 * successes raised nothing at all.
 */
describe('AdminActionModalComponent (T-0284 action confirmations)', () => {
    let fixture: ComponentFixture<AdminActionModalComponent>;
    let component: AdminActionModalComponent;
    let members: jasmine.SpyObj<MembersService>;
    let toast: jasmine.SpyObj<ToastService>;

    function setup(me: CurrentUser = currentUser()): void {
        members = jasmine.createSpyObj<MembersService>('MembersService', [
            'changeRank',
            'changeRole',
            'awardMedal',
            'removeMedal',
            'suspend',
            'unsuspend',
            'ban',
            'unban',
            'deriveFromDiscord',
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

    /** The message of the single success toast raised, or null if none was. */
    function successMessage(): string | null {
        return toast.success.calls.count() === 1
            ? (toast.success.calls.mostRecent().args[0] as string)
            : null;
    }

    it('confirms a rank change with the rank the SERVER came back with', () => {
        // Built from the response, not the form: if the server applied something
        // other than what was asked for, the confirmation says what landed.
        setup();
        members.changeRank.and.returnValue(of(member({ rank: 'Captain' })));
        component.member = member({ rank: 'Sergeant' });
        component.selectedRankId = 'r9';
        component.changeRank();

        expect(successMessage()).toBe('Jameson Nolt is now Captain.');
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('confirms a role change', () => {
        setup();
        members.changeRole.and.returnValue(of(member({ role: 'Moderator' })));
        component.member = member({ role: 'Member' });
        component.selectedRole = 'Moderator';
        component.changeRole();

        expect(successMessage()).toBe('Jameson Nolt is now a Moderator.');
    });

    it('names the medal it awarded, though the select is cleared by then', () => {
        setup();
        members.awardMedal.and.returnValue(of(member()));
        component.member = member();
        component.medals = [{ id: 'md1', letter: 'V', title: 'Medal of Valor', description: '' }];
        component.selectedMedalId = 'md1';
        component.awardMedal();

        expect(successMessage()).toBe('Awarded Medal of Valor to Jameson Nolt.');
        // The select is empty again — which is exactly why the title was read first.
        expect(component.selectedMedalId).toBe('');
    });

    it('names the medal it removed, though the chip is gone by then', () => {
        setup();
        members.removeMedal.and.returnValue(of(member({ medalAwards: [] })));
        component.member = member({
            medalAwards: [
                {
                    id: 'a1',
                    medalId: 'md1',
                    title: 'Medal of Valor',
                    glyph: 'V',
                    awardedAt: '2026-01-01T00:00:00Z',
                },
            ],
        });
        component.removeMedal('md1');

        expect(successMessage()).toBe('Removed Medal of Valor from Jameson Nolt.');
    });

    it('confirms a suspension, a lift, a ban and an unban', () => {
        setup();
        const target = member();
        members.suspend.and.returnValue(of(target));
        members.unsuspend.and.returnValue(of(target));
        members.ban.and.returnValue(of(target));
        members.unban.and.returnValue(of(target));

        component.member = target;
        component.suspendUntil = '2099-01-01T12:00';
        component.suspend();
        expect(toast.success.calls.mostRecent().args[0]).toContain('is suspended until');

        component.member = member({ suspendedUntil: '2099-01-01T12:00:00Z' });
        component.unsuspend();
        expect(toast.success.calls.mostRecent().args[0]).toContain('suspension is lifted');

        component.member = target;
        component.confirmBan();
        expect(toast.success.calls.mostRecent().args[0]).toContain('is banned');

        component.member = member({ bannedAt: '2026-06-01T00:00:00Z' });
        component.unban();
        expect(toast.success.calls.mostRecent().args[0]).toContain('ban is lifted');

        expect(toast.success.calls.count()).toBe(4);
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('raises no success toast when the action fails', () => {
        // The failure path is unchanged (T-0246) and must not gain a second,
        // contradictory notification.
        setup();
        members.ban.and.returnValue(throwError(() => ({ status: 409, error: { message: 'No' } })));
        component.member = member();
        component.confirmBan();

        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('No');
    });
});

/** T-0284 / backend T-0204 — the repair button. */
describe('AdminActionModalComponent (T-0284 derive from Discord)', () => {
    let fixture: ComponentFixture<AdminActionModalComponent>;
    let component: AdminActionModalComponent;
    let members: jasmine.SpyObj<MembersService>;
    let toast: jasmine.SpyObj<ToastService>;

    function setup(me: CurrentUser = currentUser()): void {
        members = jasmine.createSpyObj<MembersService>('MembersService', [
            'changeRank',
            'changeRole',
            'awardMedal',
            'removeMedal',
            'suspend',
            'unsuspend',
            'ban',
            'unban',
            'deriveFromDiscord',
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

    it('offers the button with the hint that says what it will do', () => {
        setup();
        const el = open(member());

        const button = Array.from(el.querySelectorAll('button')).find(
            (b) => (b.textContent ?? '').trim() === 'Derive data from Discord',
        );
        expect(button).toBeTruthy();
        // An action whose effect the admin cannot predict has to explain itself
        // BEFORE it is pressed, not only after.
        const hint = el.querySelector('#aam-derive-hint');
        expect(hint?.textContent?.trim()).toBe(
            'It will derive rank and medals already assigned on Discord side.',
        );
        expect(button?.getAttribute('aria-describedby')).toBe('aam-derive-hint');
    });

    it('hides the button on a member the server did not permit it for', () => {
        // Fail closed on the server's own flag, whatever the reason for it — the
        // modal never re-derives why. Since backend T-0211 the server sets it
        // false only when the caller lacks the capability, so the fixture is what
        // a stale or narrowed projection looks like.
        setup(currentUser({ id: 'adm-1' }));
        const el = open(
            member({ id: 'm1', permittedActions: { ...allPermitted(), deriveFromDiscord: false } }),
        );

        expect(el.querySelector('#aam-derive-hint')).toBeNull();
        expect(component.canDeriveFromDiscord).toBe(false);
    });

    it('⚠️ offers it on your OWN record — the self-derive the server now permits', () => {
        setup(currentUser({ id: 'm1' }));
        const el = open(member({ id: 'm1', permittedActions: ranksMedalsOnly() }));

        expect(el.querySelector('#aam-derive-hint')).not.toBeNull();
        expect(component.canDeriveFromDiscord).toBe(true);
    });

    it('offers it on a superior, where the server now permits it', () => {
        setup(currentUser({ id: 'adm-1', role: 'Admin' }));
        const el = open(
            member({ id: 'owner-1', role: 'Owner', permittedActions: ranksMedalsOnly() }),
        );

        expect(el.querySelector('#aam-derive-hint')).not.toBeNull();
        expect(component.canDeriveFromDiscord).toBe(true);
    });

    it('shows what it derived as a toast AND leaves it in the dialog', () => {
        setup();
        members.deriveFromDiscord.and.returnValue(
            of({
                member: member({ rank: 'Captain' }),
                rank: 'Captain',
                medals: ['Medal of Valor'],
                summary:
                    'Derived from Discord: Jameson Nolt promoted to Captain and awarded Medal of Valor.',
            }),
        );
        component.member = member();
        component.deriveFromDiscord();
        fixture.detectChanges();

        const summary =
            'Derived from Discord: Jameson Nolt promoted to Captain and awarded Medal of Valor.';
        expect(toast.success).toHaveBeenCalledWith(summary);
        // The toast lasts 4.5 seconds; the list of medals that came across is
        // worth reading twice, so it stays in the section too.
        expect(component.deriveOutcome).toBe(summary);
        expect(
            (fixture.nativeElement as HTMLElement).querySelector('.aam-derive-outcome')
                ?.textContent,
        ).toContain('promoted to Captain');
        expect(component.deriveBusy).toBe(false);
    });

    it('reports finding nothing in the neutral tone, not as an achievement', () => {
        setup();
        members.deriveFromDiscord.and.returnValue(
            of({
                member: member(),
                rank: null,
                medals: [],
                summary: 'Nothing to derive — their Discord roles are already reflected.',
            }),
        );
        component.member = member();
        component.deriveFromDiscord();

        expect(toast.info).toHaveBeenCalledWith(
            'Nothing to derive — their Discord roles are already reflected.',
        );
        expect(toast.success).not.toHaveBeenCalled();
    });

    it('surfaces a refusal from the server, like every other action', () => {
        setup();
        members.deriveFromDiscord.and.returnValue(
            throwError(() => ({
                status: 409,
                error: { message: 'Jameson Nolt has not linked a Discord account' },
            })),
        );
        component.member = member();
        component.deriveFromDiscord();

        expect(toast.error).toHaveBeenCalledWith('Jameson Nolt has not linked a Discord account');
        expect(component.error).toBe('Jameson Nolt has not linked a Discord account');
        expect(component.deriveBusy).toBe(false);
        expect(component.deriveOutcome).toBeNull();
    });

    it('never calls the API when the server did not permit it', () => {
        setup();
        component.member = member({
            permittedActions: { ...allPermitted(), deriveFromDiscord: false },
        });
        component.deriveFromDiscord();

        expect(members.deriveFromDiscord).not.toHaveBeenCalled();
        expect(component.error).toContain("don't have permission");
    });
});
