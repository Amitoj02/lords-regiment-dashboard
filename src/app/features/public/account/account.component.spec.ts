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

    function setup(me: CurrentUser = currentUser(), row: Partial<Member> = {}): HTMLElement {
        const user = signal<CurrentUser | null>(me);
        loadCurrentUser = jasmine.createSpy('loadCurrentUser').and.returnValue(of(me));
        const auth = {
            currentUser: user,
            isMember: () => me.isMember,
            loadCurrentUser,
        } as unknown as AuthService;
        const members = {
            getById: () => of(member({ id: me.id, inGameName: me.inGameName, ...row })),
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
        // The bio and the linked accounts are inside the same @else branch. An
        // applicant has no member row, so a form here would 403 on save.
        expect(el.querySelector('#acct-bio')).toBeNull();
        expect(el.querySelector('#acct-s-twitch')).toBeNull();
    });

    /**
     * Bio and linked accounts (T-0289). Both are optional, both are PUBLIC, and
     * both are wholesale-replaced by the save rather than patched field by
     * field — so the interesting cases are all about "what did the PATCH body
     * actually contain".
     */
    describe('bio and linked accounts', () => {
        /** Take the one pending PATCH and return its body. */
        function flushSave(): Record<string, unknown> {
            const req = httpMock.expectOne(
                (r) => r.method === 'PATCH' && r.url === '/api/members/m1',
            );
            const body = req.request.body as Record<string, unknown>;
            req.flush({
                id: 'm1',
                inGameName: 'Jameson Nolt',
                role: 'Member',
                status: 'Active',
                rank: 'Sergeant',
                rankId: 'r1',
                rankImageUrl: null,
                rankPrecedence: 5,
                discordTag: 'nolt#0001',
                discordLinked: true,
                publicProfile: true,
                avatarUrl: null,
                bannerUrl: null,
                bio: (body['bio'] as string | null) ?? null,
                socialLinks: [],
                standing: null,
                joinedAt: null,
                lastSeenAt: null,
                eventsAttended: 0,
                suspendedUntil: null,
                bannedAt: null,
                medals: [],
            });
            return body;
        }

        it('seeds both from the member the API returned', () => {
            setup(currentUser(), {
                bio: 'Runs the Tuesday drill.',
                socialLinks: [
                    {
                        platform: 'twitch',
                        label: 'Twitch',
                        handle: 'jamesonnolt',
                        url: 'https://www.twitch.tv/jamesonnolt',
                    },
                ],
            });
            expect(component.bio).toBe('Runs the Tuesday drill.');
            expect(component.socialHandles['twitch']).toBe('jamesonnolt');
            expect(component.socialHandles['youtube']).toBe('');
            // Seeded, not edited — the savebar must not be lit on arrival.
            expect(component.dirty).toBeFalse();
        });

        it('sends the bio only when it changed, and null to clear it', () => {
            setup(currentUser(), { bio: 'Old.' });
            component.bio = '';
            component.save();
            expect(flushSave()['bio']).toBeNull();
        });

        it('leaves the bio out of the body entirely when it was not touched', () => {
            // A PATCH that resends an unchanged field is a PATCH that can lose a
            // concurrent edit for no reason.
            setup(currentUser(), { bio: 'Unchanged.' });
            component.inGameName = 'Someone Else';
            component.save();
            expect('bio' in flushSave()).toBeFalse();
        });

        it('trims the bio before sending it', () => {
            setup(currentUser());
            component.bio = '   Runs the drill.  ';
            component.save();
            expect(flushSave()['bio']).toBe('Runs the drill.');
        });

        it('treats a whitespace-only bio as a clear, not as content', () => {
            setup(currentUser(), { bio: 'Old.' });
            component.bio = '    ';
            component.save();
            expect(flushSave()['bio']).toBeNull();
        });

        it('sends the WHOLE link set whenever any of it changed', () => {
            // The server replaces wholesale, so a partial payload deletes the
            // links it omits — dropping one link means resending the rest.
            setup(currentUser(), {
                socialLinks: [
                    {
                        platform: 'twitch',
                        label: 'Twitch',
                        handle: 'nolt',
                        url: 'https://www.twitch.tv/nolt',
                    },
                    {
                        platform: 'medal',
                        label: 'Medal.tv',
                        handle: 'panda',
                        url: 'https://medal.tv/u/panda',
                    },
                ],
            });
            component.onSocialInput('medal', '');
            component.save();
            expect(flushSave()['socialLinks']).toEqual([{ platform: 'twitch', handle: 'nolt' }]);
        });

        it('sends an empty array when every link is cleared', () => {
            setup(currentUser(), {
                socialLinks: [
                    {
                        platform: 'twitch',
                        label: 'Twitch',
                        handle: 'nolt',
                        url: 'https://www.twitch.tv/nolt',
                    },
                ],
            });
            component.onSocialInput('twitch', '');
            component.save();
            expect(flushSave()['socialLinks']).toEqual([]);
        });

        it('sends handles in the registry order, not the order they were typed', () => {
            setup(currentUser());
            component.onSocialInput('medal', 'panda');
            component.onSocialInput('twitch', 'nolt');
            component.save();
            expect(flushSave()['socialLinks']).toEqual([
                { platform: 'twitch', handle: 'nolt' },
                { platform: 'medal', handle: 'panda' },
            ]);
        });

        it('normalises a typed handle on the way in', () => {
            setup(currentUser());
            component.onSocialInput('twitch', ' @jamesonnolt/ ');
            expect(component.socialHandles['twitch']).toBe('jamesonnolt');
        });

        it('takes the handle out of a pasted profile URL', () => {
            // "Paste your channel link" is what people actually do, and refusing
            // it with "letters and numbers only" is correct and useless.
            setup(currentUser());
            component.onSocialInput('twitch', 'https://www.twitch.tv/jamesonnolt');
            expect(component.socialHandles['twitch']).toBe('jamesonnolt');

            component.onSocialInput('youtube', 'https://youtube.com/@NoltPlays');
            expect(component.socialHandles['youtube']).toBe('NoltPlays');

            component.onSocialInput('steam', 'https://steamcommunity.com/id/jamesonnolt');
            expect(component.socialHandles['steam']).toBe('jamesonnolt');

            component.onSocialInput('medal', 'medal.tv/u/panda');
            expect(component.socialHandles['medal']).toBe('panda');

            component.onSocialInput('tiktok', 'https://www.tiktok.com/@noltplays?lang=en');
            expect(component.socialHandles['tiktok']).toBe('noltplays');
        });

        it('does not mistake a dotted handle for a URL', () => {
            setup(currentUser());
            component.onSocialInput('instagram', 'jameson.nolt');
            expect(component.socialHandles['instagram']).toBe('jameson.nolt');
        });

        it('blocks the save on a handle the platform would refuse', () => {
            setup(currentUser());
            component.onSocialInput('twitch', 'ab'); // Twitch needs 4+
            expect(component.socialError('twitch')).not.toBeNull();
            expect(component.socialsBlocked).toBeTrue();
            expect(component.canSave).toBeFalse();
        });

        it('says nothing about an empty row — blank means "not linked"', () => {
            setup(currentUser());
            expect(component.socialError('twitch')).toBeNull();
            expect(component.socialsBlocked).toBeFalse();
        });

        it('puts both back on Discard', () => {
            setup(currentUser(), { bio: 'Original.' });
            component.bio = 'Edited.';
            component.onSocialInput('twitch', 'nolt');
            expect(component.dirty).toBeTrue();

            component.revert();
            expect(component.bio).toBe('Original.');
            expect(component.socialHandles['twitch']).toBe('');
            expect(component.dirty).toBeFalse();
        });

        it('re-seeds from the response so the savebar goes quiet after a save', () => {
            setup(currentUser());
            component.bio = 'New bio.';
            expect(component.dirty).toBeTrue();
            component.save();
            flushSave();
            expect(component.dirty).toBeFalse();
        });

        it('renders a field for every platform, and none for Discord', () => {
            // Discord is linked through OAuth and is signed-in-only; a handle box
            // for it would imply both that it is editable and that it is public.
            const el = setup();
            expect(el.querySelector('#acct-s-twitch')).not.toBeNull();
            expect(el.querySelector('#acct-s-youtube')).not.toBeNull();
            expect(el.querySelector('#acct-s-instagram')).not.toBeNull();
            expect(el.querySelector('#acct-s-tiktok')).not.toBeNull();
            expect(el.querySelector('#acct-s-x')).not.toBeNull();
            expect(el.querySelector('#acct-s-steam')).not.toBeNull();
            expect(el.querySelector('#acct-s-medal')).not.toBeNull();
            expect(el.querySelector('#acct-s-discord')).toBeNull();
        });

        it('caps the bio box at the length the server enforces', () => {
            const el = setup();
            const box = el.querySelector('#acct-bio') as HTMLTextAreaElement;
            expect(box.getAttribute('maxlength')).toBe(String(component.bioMaxLength));
            expect(component.bioMaxLength).toBe(280);
        });
    });
});
