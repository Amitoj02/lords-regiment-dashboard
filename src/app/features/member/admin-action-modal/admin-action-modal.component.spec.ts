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
            hasCapability: () => true,
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
