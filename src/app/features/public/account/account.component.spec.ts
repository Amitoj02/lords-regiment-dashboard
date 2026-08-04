import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import {
    AccountComponent,
    USERNAME_PROBE_DEBOUNCE_MS,
    UsernameAvailability,
} from './account.component';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { MembersService } from '../../../core/services/members.service';
import { SeoService } from '../../../core/services/seo.service';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../core/services/storage.service';
import { ToastService } from '../../../core/services/toast.service';
import { Member } from '../../../core/models/member.model';

const AVAILABILITY_URL = '/api/members/me/username-available';

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
        avatarUrl: null,
        bannerUrl: null,
        ...overrides,
    };
}

function currentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
    return {
        id: 'm1',
        inGameName: 'Jameson Nolt',
        username: null,
        rank: 'Sergeant',
        role: 'Member',
        discordTag: 'nolt#0001',
        discordLinked: true,
        avatarUrl: null,
        isMember: true,
        capabilities: ['view_members_directory'],
        guildMember: true,
        discordInviteUrl: null,
        guildGateEnabled: false,
        guildGateExempt: false,
        ...overrides,
    };
}

describe('AccountComponent (T-0287)', () => {
    let fixture: ComponentFixture<AccountComponent>;
    let component: AccountComponent;
    let httpMock: HttpTestingController;
    let toast: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };
    let loadCurrentUser: jasmine.Spy;

    function setup(me: CurrentUser = currentUser()): HTMLElement {
        const user = signal<CurrentUser | null>(me);
        loadCurrentUser = jasmine.createSpy('loadCurrentUser').and.returnValue(of(me));
        const auth = {
            currentUser: user,
            isMember: () => me.isMember,
            loadCurrentUser,
        } as unknown as AuthService;
        const members = {
            getById: () => of(member({ id: me.id, inGameName: me.inGameName })),
        } as unknown as MembersService;
        const storage = {
            getPolicy: () => of(DEFAULT_STORAGE_POLICY),
            upload: () => of('members/avatar/key.png'),
        } as unknown as StorageService;
        toast = {
            success: jasmine.createSpy('success'),
            error: jasmine.createSpy('error'),
            info: jasmine.createSpy('info'),
        };

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [AccountComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: AuthService, useValue: auth },
                { provide: MembersService, useValue: members },
                { provide: StorageService, useValue: storage },
                { provide: ToastService, useValue: toast },
                {
                    provide: SeoService,
                    useValue: { apply: () => undefined, reset: () => undefined },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(AccountComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    /** Answer the pending availability probe for `username`. */
    function answerProbe(username: string, verdict: UsernameAvailability): void {
        const req = httpMock.expectOne(
            (r) => r.url === AVAILABILITY_URL && r.params.get('username') === username,
        );
        req.flush(verdict);
    }

    function verdictLine(el: HTMLElement): string {
        return el.querySelector('.account-verdict')?.textContent?.trim() ?? '';
    }

    afterEach(() => httpMock.verify());

    describe('availability probe', () => {
        it('debounces the keystrokes into a single request', fakeAsync(() => {
            setup();

            component.onUsernameInput('pan');
            tick(150);
            component.onUsernameInput('pand');
            tick(150);
            component.onUsernameInput('panda');
            // Still inside the debounce window: nothing has been asked yet.
            httpMock.expectNone(AVAILABILITY_URL);
            expect(component.handleVerdict).toBe('checking');

            tick(USERNAME_PROBE_DEBOUNCE_MS);
            answerProbe('panda', { available: true });

            expect(component.handleVerdict).toBe('available');
            expect(component.handleMessage).toBe('@panda is available');
        }));

        it('renders the available verdict in the live region', fakeAsync(() => {
            const el = setup();

            component.onUsernameInput('panda');
            tick(USERNAME_PROBE_DEBOUNCE_MS);
            answerProbe('panda', { available: true });
            fixture.detectChanges();

            expect(verdictLine(el)).toBe('@panda is available');
            expect(el.querySelector('.account-verdict')?.classList).toContain('is-ok');
        }));

        it('maps `taken` to its copy', fakeAsync(() => {
            const el = setup();

            component.onUsernameInput('panda');
            tick(USERNAME_PROBE_DEBOUNCE_MS);
            answerProbe('panda', { available: false, reason: 'taken' });
            fixture.detectChanges();

            expect(component.handleVerdict).toBe('unavailable');
            expect(verdictLine(el)).toBe('That username is already taken');
            expect(el.querySelector('.account-verdict')?.classList).toContain('is-bad');
        }));

        it('maps `reserved` to its copy', fakeAsync(() => {
            setup();

            component.onUsernameInput('support');
            tick(USERNAME_PROBE_DEBOUNCE_MS);
            answerProbe('support', { available: false, reason: 'reserved' });

            expect(component.handleMessage).toBe('That username is not available');
        }));

        it('maps `cooldown_target` to its copy', fakeAsync(() => {
            setup();

            component.onUsernameInput('panda');
            tick(USERNAME_PROBE_DEBOUNCE_MS);
            answerProbe('panda', { available: false, reason: 'cooldown_target' });

            expect(component.handleMessage).toBe(
                'That username was released recently and is not available yet',
            );
        }));

        it('folds `retryAfter` into the `cooldown_actor` copy', fakeAsync(() => {
            setup();

            component.onUsernameInput('panda');
            tick(USERNAME_PROBE_DEBOUNCE_MS);
            answerProbe('panda', {
                available: false,
                reason: 'cooldown_actor',
                retryAfter: '2026-08-12T00:00:00.000Z',
            });

            // The date is formatted for a reader, never shown as an ISO string.
            expect(component.handleMessage).toContain('You can change your username again after');
            expect(component.handleMessage).toContain('2026');
            expect(component.handleMessage).not.toContain('T00:00:00');
        }));

        it('normalises the typed value and never stores the sigil', fakeAsync(() => {
            setup();

            component.onUsernameInput('  @Panda ');
            expect(component.username).toBe('panda');

            tick(USERNAME_PROBE_DEBOUNCE_MS);
            answerProbe('panda', { available: true });
            expect(component.profileUrlPreview).toBe('lordsofholdfast.com/u/@panda');
        }));

        it('asks nothing about the handle the member already holds', fakeAsync(() => {
            setup(currentUser({ username: 'panda' }));

            component.onUsernameInput('panda');
            tick(USERNAME_PROBE_DEBOUNCE_MS);

            httpMock.expectNone(AVAILABILITY_URL);
            expect(component.handleVerdict).toBe('current');
        }));

        it('keeps the save open when the probe itself fails', fakeAsync(() => {
            setup();

            component.onUsernameInput('panda');
            tick(USERNAME_PROBE_DEBOUNCE_MS);
            httpMock
                .expectOne((r) => r.url === AVAILABILITY_URL)
                .error(new ProgressEvent('network'));

            // Advisory only: a check that could not run is not a refusal.
            expect(component.handleVerdict).toBe('idle');
            expect(component.usernameBlocked).toBe(false);
            expect(component.canSave).toBe(true);
        }));
    });

    describe('a handle that cannot be claimed blocks the save', () => {
        it('refuses a handle that fails the shape rule, without asking the API', fakeAsync(() => {
            setup();

            component.onUsernameInput('ab');
            expect(component.handleMessage).toBe(
                '3-20 characters, lowercase letters, numbers and underscore',
            );
            expect(component.usernameBlocked).toBe(true);
            expect(component.canSave).toBe(false);

            tick(USERNAME_PROBE_DEBOUNCE_MS);
            httpMock.expectNone(AVAILABILITY_URL);

            component.save();
            httpMock.expectNone('/api/members/m1');
        }));

        it('refuses a handle the API said was taken', fakeAsync(() => {
            setup();

            component.onUsernameInput('panda');
            tick(USERNAME_PROBE_DEBOUNCE_MS);
            answerProbe('panda', { available: false, reason: 'taken' });

            expect(component.canSave).toBe(false);
        }));

        it('still saves the rest of the form when the handle is left alone', fakeAsync(() => {
            setup();

            component.inGameName = 'Jameson N.';
            component.save();

            const req = httpMock.expectOne('/api/members/m1');
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ inGameName: 'Jameson N.' });
            req.flush({ id: 'm1', inGameName: 'Jameson N.', medals: [] });

            expect(toast.success).toHaveBeenCalled();
            expect(loadCurrentUser).toHaveBeenCalled();
        }));
    });

    describe('save conflicts', () => {
        it('surfaces the server message from a 409', fakeAsync(() => {
            setup();

            component.onUsernameInput('panda');
            tick(USERNAME_PROBE_DEBOUNCE_MS);
            answerProbe('panda', { available: true });

            expect(component.canSave).toBe(true);
            component.save();

            const req = httpMock.expectOne('/api/members/m1');
            expect(req.request.body).toEqual({
                inGameName: 'Jameson Nolt',
                username: 'panda',
            });
            // The probe is advisory; the unique index is what decides.
            req.flush(
                { statusCode: 409, message: 'That username is already taken' },
                { status: 409, statusText: 'Conflict' },
            );

            expect(component.saving).toBe(false);
            expect(component.saveError).toBe('That username is already taken');
            expect(toast.error).toHaveBeenCalledWith('That username is already taken');
            // The field is put back into a refused state, so the button that just
            // failed is not immediately offered again as though it would work.
            expect(component.handleVerdict).toBe('unavailable');
            expect(component.handleMessage).toBe('That username is already taken');
            expect(component.usernameBlocked).toBe(true);
            expect(loadCurrentUser).not.toHaveBeenCalled();
        }));

        it('falls back to its own message when the server sends none', fakeAsync(() => {
            setup();

            component.inGameName = 'Jameson N.';
            component.save();
            httpMock
                .expectOne('/api/members/m1')
                .flush(null, { status: 500, statusText: 'Server Error' });

            expect(component.saveError).toBe('Could not save your account. Please try again.');
        }));
    });

    describe('releasing a handle', () => {
        it('confirms first, then PATCHes username: null', fakeAsync(() => {
            setup(currentUser({ username: 'panda' }));

            component.startRemove();
            expect(component.removeConfirming).toBe(true);

            component.removeUsername();
            const req = httpMock.expectOne('/api/members/m1');
            expect(req.request.body).toEqual({ username: null });
            // The component re-reads the session after a successful write, and in
            // production that read returns the handle it just released — i.e.
            // null. Reflect that here, or the stub hands back the pre-change
            // session and the assertions below test a fiction.
            loadCurrentUser.and.returnValue(of(currentUser({ username: null })));
            req.flush({ id: 'm1', inGameName: 'Jameson Nolt', medals: [] });

            expect(component.currentUsername).toBeNull();
            expect(component.username).toBe('');
            expect(component.profileUrlPreview).toBe('lordsofholdfast.com/u/m1');
            expect(toast.success).toHaveBeenCalled();
        }));

        it('never releases the handle just because the field was cleared', fakeAsync(() => {
            setup(currentUser({ username: 'panda' }));

            component.onUsernameInput('');
            component.inGameName = 'Jameson N.';
            component.save();

            const req = httpMock.expectOne('/api/members/m1');
            expect(req.request.body).toEqual({ inGameName: 'Jameson N.' });
            req.flush({ id: 'm1', inGameName: 'Jameson N.', medals: [] });

            tick(USERNAME_PROBE_DEBOUNCE_MS);
        }));
    });

    it('offers nothing to edit to an identity-only session', () => {
        const el = setup(currentUser({ isMember: false, role: 'Applicant' }));

        expect(el.querySelector('.account-savebar')).toBeNull();
        expect(el.querySelector('#acct-username')).toBeNull();
    });
});
