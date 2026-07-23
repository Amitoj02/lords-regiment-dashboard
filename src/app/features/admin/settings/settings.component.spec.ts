import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
    DiscordBotSettings,
    DiscordConnection,
    DiscordService,
} from '../../../core/services/discord.service';
import {
    PermissionsMatrix,
    SettingsDto,
    SettingsService,
} from '../../../core/services/settings.service';
import { SettingsComponent } from './settings.component';
import { UNSAVED_CHANGES_PROMPT } from './unsaved-changes.guard';

/**
 * The sidebar is an in-component switch, not a router outlet — so leaving the
 * "Legal documents" section DESTROYS its editor and every draft in it without
 * the CanDeactivate guard ever running. These specs pin that the same prompt
 * covers both exits.
 */
describe('SettingsComponent — section switching (T-0240)', () => {
    let component: SettingsComponent;

    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            declarations: [SettingsComponent],
            providers: [
                {
                    provide: SettingsService,
                    useValue: {
                        // Errors are swallowed by the component; the point here is
                        // only that construction does not depend on the network.
                        getSettings: () => throwError(() => new Error('n/a')),
                        getPermissions: () => throwError(() => new Error('n/a')),
                    },
                },
                {
                    provide: DiscordService,
                    useValue: {
                        getConnection: () => of(null),
                        getSettings: () => of(null),
                        getOperations: () => of([]),
                    },
                },
                { provide: AuthService, useValue: { hasCapability: () => true } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        component = TestBed.createComponent(SettingsComponent).componentInstance;
    });

    it('exposes the public-pages sections in their own nav group', () => {
        expect(component.navGroups).toContain('Public pages');
        expect(component.getNavByGroup('Public pages').map((n) => n.id)).toEqual([
            'presentation',
            'legal',
        ]);
    });

    it('switches freely when no child editor is dirty', () => {
        const confirmSpy = spyOn(window, 'confirm');
        component.setSection('legal');
        expect(component.activeSection).toBe('legal');
        expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('warns before a switch that would discard unsaved edits', () => {
        const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
        component.legalEditor = { hasUnsavedChanges: () => true } as never;
        component.setSection('legal');
        component.activeSection = 'legal';
        component.setSection('profile');
        expect(confirmSpy).toHaveBeenCalledWith(UNSAVED_CHANGES_PROMPT);
        expect(component.activeSection).toBe('legal');
    });

    it('switches once the user accepts losing the edits', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        component.legalEditor = { hasUnsavedChanges: () => true } as never;
        component.activeSection = 'legal';
        component.setSection('profile');
        expect(component.activeSection).toBe('profile');
    });

    it("reports the presentation editor's dirt to the CanDeactivate guard too", () => {
        expect(component.hasUnsavedChanges()).toBeFalse();
        component.presentationEditor = { hasUnsavedChanges: () => true } as never;
        expect(component.hasUnsavedChanges()).toBeTrue();
    });
});

/** The five capabilities behind the five sections, for readable specs below. */
const OWNER_CAPS = ['manage_settings', 'manage_regiment_details'];

interface Harness {
    component: SettingsComponent;
    settingsService: jasmine.SpyObj<SettingsService>;
    discord: jasmine.SpyObj<DiscordService>;
}

function makeMatrix(): PermissionsMatrix {
    return {
        roles: ['Owner', 'Admin', 'Moderator'],
        capabilities: ['manage_settings', 'manage_regiment_details', 'manage_events'],
        matrix: {
            Owner: { manage_settings: true, manage_regiment_details: true, manage_events: true },
            Admin: { manage_settings: true, manage_regiment_details: true, manage_events: true },
            Moderator: { manage_events: true },
        },
    };
}

function build(capabilities: string[]): Harness {
    const settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', [
        'getSettings',
        'getPermissions',
        'updatePermissions',
    ]);
    settingsService.getSettings.and.returnValue(
        of({ name: 'The Lords' } as unknown as SettingsDto),
    );
    settingsService.getPermissions.and.returnValue(of(makeMatrix()));
    settingsService.updatePermissions.and.returnValue(of(makeMatrix()));

    const discord = jasmine.createSpyObj<DiscordService>('DiscordService', [
        'getConnection',
        'getSettings',
        'getOperations',
    ]);
    discord.getConnection.and.returnValue(of(null as unknown as DiscordConnection));
    discord.getSettings.and.returnValue(of(null as unknown as DiscordBotSettings));
    discord.getOperations.and.returnValue(of([]));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        declarations: [SettingsComponent],
        providers: [
            { provide: SettingsService, useValue: settingsService },
            { provide: DiscordService, useValue: discord },
            {
                provide: AuthService,
                useValue: { hasCapability: (c: string) => capabilities.includes(c) },
            },
        ],
        schemas: [NO_ERRORS_SCHEMA],
    });
    return {
        component: TestBed.createComponent(SettingsComponent).componentInstance,
        settingsService,
        discord,
    };
}

/**
 * The reported bug: `/app/admin/settings` was guarded by the ROLE-based
 * `adminGuard`, so a Moderator without `manage_settings` saw the whole panel and
 * all five sections while every request behind them 403'd — empty chrome plus a
 * console full of errors on load.
 */
describe('SettingsComponent — capability gating (T-0265)', () => {
    it('shows all five sections, in order, to a caller holding both capabilities', () => {
        const { component } = build(OWNER_CAPS);
        component.ngOnInit();
        expect(component.visibleGroups).toEqual(['Regiment', 'Public pages']);
        expect(component.permittedNavItems.map((n) => n.id)).toEqual([
            'profile',
            'discord',
            'roles',
            'presentation',
            'legal',
        ]);
        expect(component.activeSection).toBe('profile');
    });

    it('shows a manage_settings-only caller the Regiment group alone', () => {
        const { component } = build(['manage_settings']);
        component.ngOnInit();
        expect(component.visibleGroups).toEqual(['Regiment']);
        expect(component.getNavByGroup('Public pages')).toEqual([]);
        expect(component.activeSection).toBe('profile');
    });

    it('shows a manage_regiment_details-only caller the Public pages group alone', () => {
        const { component } = build(['manage_regiment_details']);
        component.ngOnInit();
        expect(component.visibleGroups).toEqual(['Public pages']);
        expect(component.getNavByGroup('Regiment')).toEqual([]);
    });

    it('defaults to the first PERMITTED section, not the hardcoded profile pane', () => {
        const { component } = build(['manage_regiment_details']);
        component.ngOnInit();
        expect(component.activeSection).toBe('presentation');
        expect(component.permittedNavItems[0].label).toBe('Landing & sign-in');
    });

    it('refuses to open a section the caller has no capability for', () => {
        const { component } = build(['manage_regiment_details']);
        component.ngOnInit();
        component.setSection('roles');
        expect(component.activeSection).toBe('presentation');
    });

    it('fires no settings request for a section the caller cannot see', () => {
        const { component, settingsService, discord } = build(['manage_regiment_details']);
        component.ngOnInit();
        expect(settingsService.getSettings).not.toHaveBeenCalled();
        expect(settingsService.getPermissions).not.toHaveBeenCalled();
        expect(discord.getConnection).not.toHaveBeenCalled();
        expect(discord.getSettings).not.toHaveBeenCalled();
        expect(discord.getOperations).not.toHaveBeenCalled();
    });

    it('still loads every Regiment section for a manage_settings holder', () => {
        const { component, settingsService, discord } = build(['manage_settings']);
        component.ngOnInit();
        expect(settingsService.getSettings).toHaveBeenCalledTimes(1);
        expect(settingsService.getPermissions).toHaveBeenCalledTimes(1);
        expect(discord.getConnection).toHaveBeenCalledTimes(1);
        expect(discord.getSettings).toHaveBeenCalledTimes(1);
        expect(discord.getOperations).toHaveBeenCalledTimes(1);
    });

    it('renders no nav and no section for a caller holding neither capability', () => {
        // Unreachable behind settingsAccessGuard, but the page must not turn
        // into empty chrome if the matrix changes under a live session.
        const { component, settingsService } = build([]);
        component.ngOnInit();
        expect(component.visibleGroups).toEqual([]);
        expect(component.permittedNavItems).toEqual([]);
        expect(component.activeSection).toBe('');
        expect(settingsService.getSettings).not.toHaveBeenCalled();
    });
});

/**
 * Transfer Ownership is gone from the API (T-0264). The matrix renders straight
 * from the capabilities array, so the row disappears on its own — what has to be
 * proven is that saving still round-trips every REMAINING capability untouched.
 */
describe('SettingsComponent — permission matrix after the transfer retirement (T-0264)', () => {
    it('renders exactly the capabilities the API returns', () => {
        const { component } = build(OWNER_CAPS);
        component.ngOnInit();
        expect(component.matrix?.capabilities).toEqual([
            'manage_settings',
            'manage_regiment_details',
            'manage_events',
        ]);
        expect(component.matrix?.capabilities).not.toContain('transfer_ownership');
    });

    it('sends only the toggled cell and leaves every other capability unchanged', () => {
        const { component, settingsService } = build(OWNER_CAPS);
        component.ngOnInit();
        component.onPermissionToggle('Moderator', 'manage_regiment_details', true);
        component.savePermissions();

        expect(settingsService.updatePermissions).toHaveBeenCalledWith([
            { role: 'Moderator', capability: 'manage_regiment_details', granted: true },
        ]);
        // Every capability survives the round trip, normalised to a boolean.
        expect(component.matrix?.matrix['Moderator']).toEqual({
            manage_settings: false,
            manage_regiment_details: false,
            manage_events: true,
        });
        expect(component.permissionsFlash).toBe('Permission matrix updated.');
    });
});

/**
 * The guild-membership gate ships FEATURE-FLAGGED DEFAULT OFF (CONTRACT §1/§6),
 * and until now nothing in the app exposed the flag — it could only be flipped
 * by hand-calling PATCH /discord/settings. It lives beside the other Lord
 * Adjutant switches, and it is treated as sensitive for the same reason
 * `applyBanRoleOnBan` is: turning it on changes what OTHER people can reach.
 */
describe('SettingsComponent — guild-membership gate switch (T-0261)', () => {
    function bot(overrides: Partial<DiscordBotSettings> = {}): DiscordBotSettings {
        return {
            botEnabled: true,
            welcomeChannelId: null,
            welcomeMessage: null,
            enlistmentChannelId: null,
            enlistmentChannelName: null,
            auditLogChannelId: null,
            auditLogChannelName: null,
            eventAnnouncementChannelId: null,
            eventAnnouncementChannelName: null,
            joinRoleId: null,
            joinRoleName: '',
            banRoleId: null,
            banRoleName: null,
            syncRolesOnChange: true,
            applyBanRoleOnBan: false,
            guildGateEnabled: false,
            ...overrides,
        };
    }

    interface GateHarness {
        component: SettingsComponent;
        discord: jasmine.SpyObj<DiscordService>;
        el: HTMLElement;
        detect: () => void;
    }

    /**
     * Renders the Discord section directly. `activeSection` is forced rather
     * than navigated to, because the no-capability case is exactly the one
     * T-0265 hides the nav entry for — and the point here is that the CONTROL
     * itself is disabled, not merely unreachable.
     */
    function render(capabilities: string[], settings: DiscordBotSettings): GateHarness {
        const settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', [
            'getSettings',
            'getPermissions',
        ]);
        settingsService.getSettings.and.returnValue(
            of({ name: 'The Lords' } as unknown as SettingsDto),
        );
        settingsService.getPermissions.and.returnValue(of(makeMatrix()));

        const discord = jasmine.createSpyObj<DiscordService>('DiscordService', [
            'getConnection',
            'getSettings',
            'getOperations',
            'updateSettings',
        ]);
        discord.getConnection.and.returnValue(of(null as unknown as DiscordConnection));
        discord.getSettings.and.returnValue(of(settings));
        discord.getOperations.and.returnValue(of([]));
        discord.updateSettings.and.returnValue(of(settings));

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            declarations: [SettingsComponent],
            providers: [
                { provide: SettingsService, useValue: settingsService },
                { provide: DiscordService, useValue: discord },
                {
                    provide: AuthService,
                    useValue: { hasCapability: (c: string) => capabilities.includes(c) },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(SettingsComponent);
        fixture.detectChanges();
        const component = fixture.componentInstance;
        component.activeSection = 'discord';
        component.botSettings = settings;
        fixture.detectChanges();
        return {
            component,
            discord,
            el: fixture.nativeElement as HTMLElement,
            detect: () => fixture.detectChanges(),
        };
    }

    function toggle(el: HTMLElement): HTMLInputElement | null {
        return el.querySelector<HTMLInputElement>('#guild-gate-enabled');
    }

    it('renders the switch in the Lord Adjutant panel', () => {
        const { el } = render(['manage_settings'], bot());
        const input = toggle(el);
        expect(input).not.toBeNull();
        expect(input!.type).toBe('checkbox');
        expect(el.textContent).toContain('Require Discord server membership');
    });

    it('leaves the switch enabled for a manage_settings holder', () => {
        const { el } = render(['manage_settings'], bot());
        expect(toggle(el)!.disabled).toBeFalse();
    });

    it('disables the switch for a caller without manage_settings', () => {
        const { el } = render([], bot());
        expect(toggle(el)!.disabled).toBeTrue();
    });

    it('spells out the lock-out consequence while the gate is on', () => {
        const { el } = render(['manage_settings'], bot({ guildGateEnabled: true }));
        const copy = el.textContent ?? '';
        expect(copy).toContain('This switch can lock members out.');
        expect(copy).toContain("not in the regiment's server loses the dashboard");
        expect(copy).toContain('Anyone holding manage_settings is exempt');
        expect(copy).toContain('Only turn it on once the bot is connected and verified');
    });

    it('warns against switching the gate on before the bot is connected', () => {
        // getConnection resolves to null here, so the bot is not verified.
        const { component, el } = render(['manage_settings'], bot({ guildGateEnabled: true }));
        expect(component.guildGateBotUnverified).toBeTrue();
        expect(el.textContent).toContain('Do not turn this on yet.');
    });

    it('says nothing about an unverified bot while the gate stays off', () => {
        const { component, el } = render(['manage_settings'], bot());
        expect(component.guildGateBotUnverified).toBeFalse();
        expect(el.textContent).not.toContain('Do not turn this on yet.');
    });

    it('round-trips the flag through the save payload', () => {
        const { component, discord } = render(['manage_settings'], bot());
        component.botSettings!.guildGateEnabled = true;
        component.saveBotSettings();

        expect(discord.updateSettings).toHaveBeenCalledTimes(1);
        expect(discord.updateSettings.calls.mostRecent().args[0]).toEqual(
            jasmine.objectContaining({ guildGateEnabled: true }),
        );
    });

    it('sends the flag off again when it is switched back off', () => {
        const { component, discord } = render(['manage_settings'], bot({ guildGateEnabled: true }));
        component.botSettings!.guildGateEnabled = false;
        component.saveBotSettings();

        expect(discord.updateSettings.calls.mostRecent().args[0]).toEqual(
            jasmine.objectContaining({ guildGateEnabled: false }),
        );
    });

    it('refuses to save the flag for a caller without manage_settings', () => {
        const { component, discord } = render([], bot());
        component.botSettings!.guildGateEnabled = true;
        component.saveBotSettings();

        expect(discord.updateSettings).not.toHaveBeenCalled();
    });

    // ── T-0272: the welcome-message editor ──────────────────────────────────────
    //
    // Reuses the harness above: same section, same capability gate, same save
    // path — which is the point, since the risk on this task is that a new field
    // rides the SHARED bot-settings payload and dirty-check incorrectly.
    describe('welcome-message editor (T-0272)', () => {
        const box = (el: HTMLElement) => el.querySelector<HTMLTextAreaElement>('#welcome-message');

        it('renders a textarea beside the welcome channel picker, holding the stored value', () => {
            const { el } = render(['manage_settings'], bot({ welcomeMessage: 'Fall in!' }));

            const textarea = box(el);
            expect(textarea).not.toBeNull();
            expect(el.querySelector('#welcome-channel')).not.toBeNull();
            expect(el.querySelector('label[for="welcome-message"]')?.textContent).toContain(
                'Welcome message',
            );
        });

        it('enforces the backend’s 512-character limit on the control', () => {
            const { component, el } = render(['manage_settings'], bot());
            expect(component.welcomeMessageMaxLength).toBe(512);
            expect(box(el)?.getAttribute('maxlength')).toBe('512');
        });

        it('counts the stored message against that limit', () => {
            const { el } = render(['manage_settings'], bot({ welcomeMessage: 'Fall in!' }));
            expect(el.textContent).toContain('8 / 512');
        });

        it('blocks a save that would exceed the limit instead of taking a 400', () => {
            const { component, discord } = render(['manage_settings'], bot());
            component.botSettings!.welcomeMessage = 'x'.repeat(513);

            component.saveBotSettings();

            expect(discord.updateSettings).not.toHaveBeenCalled();
            expect(component.botFlash).toContain('512');
        });

        it('states that a blank message falls back to the house default', () => {
            const { el } = render(['manage_settings'], bot({ welcomeMessage: null }));
            expect(el.textContent).toContain('the adjutant will send the default welcome');
        });

        it('lists exactly the placeholders the API expands, and no others', () => {
            const { component, el } = render(
                ['manage_settings'],
                bot({ welcomeMessage: 'Hello {user}' }),
            );

            expect(component.welcomeTokens.map((t) => t.token)).toEqual(['{user}', '{regiment}']);
            expect(el.textContent).toContain('{user}');
            expect(el.textContent).toContain('{regiment}');
        });

        it('normalises a cleared box to null, so it round-trips against the API', () => {
            // The API stores blank as NULL and returns NULL. Keeping '' in the
            // model would leave the section permanently dirty the first time an
            // admin clears the greeting.
            const { component } = render(['manage_settings'], bot({ welcomeMessage: 'Fall in!' }));

            component.setWelcomeMessage('   ');

            expect(component.botSettings!.welcomeMessage).toBeNull();
        });

        it('carries welcomeMessage on the shared save payload without disturbing the rest', () => {
            const settings = bot({ welcomeChannelId: '123', joinRoleName: 'Guest' });
            const { component, discord } = render(['manage_settings'], settings);
            component.setWelcomeMessage('Welcome {user}!');

            component.saveBotSettings();

            const payload = discord.updateSettings.calls.mostRecent().args[0] as Record<
                string,
                unknown
            >;
            expect(payload['welcomeMessage']).toBe('Welcome {user}!');
            // Pin the whole key set: a renamed or dropped key silently loses a
            // setting, which is exactly the recorded risk on this task.
            expect(Object.keys(payload).sort()).toEqual([
                'applyBanRoleOnBan',
                'auditLogChannelId',
                'auditLogChannelName',
                'banRoleId',
                'banRoleName',
                'botEnabled',
                'enlistmentChannelId',
                'enlistmentChannelName',
                'eventAnnouncementChannelId',
                'eventAnnouncementChannelName',
                'guildGateEnabled',
                'joinRoleId',
                'joinRoleName',
                'syncRolesOnChange',
                'welcomeChannelId',
                'welcomeMessage',
            ]);
        });

        it('disables the control for a caller without manage_settings', () => {
            const { el } = render([], bot());
            expect(box(el)?.disabled).toBeTrue();
        });

        it('marks the section dirty once the greeting is edited, and clean again after save', () => {
            // Before this the page had no free-text bot control, so nothing on it
            // could be lost — a typed greeting would have been discarded silently
            // by the section-switch confirm and the CanDeactivate guard.
            const { component } = render(['manage_settings'], bot({ welcomeMessage: 'Fall in!' }));
            expect(component.hasUnsavedChanges()).toBeFalse();

            component.setWelcomeMessage('Fall in, lads!');
            expect(component.botSettingsDirty).toBeTrue();
            expect(component.hasUnsavedChanges()).toBeTrue();

            component.saveBotSettings();
            expect(component.hasUnsavedChanges()).toBeFalse();
        });
    });
});
