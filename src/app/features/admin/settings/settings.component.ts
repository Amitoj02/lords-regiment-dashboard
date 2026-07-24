import {
    Component,
    DestroyRef,
    OnInit,
    ViewChild,
    inject,
    ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MemberRole } from '../../../core/models/member.model';
import { AuthService } from '../../../core/services/auth.service';
import {
    PermissionChange,
    PermissionsMatrix,
    SettingsDto,
    SettingsService,
    UpdateSettingsPayload,
} from '../../../core/services/settings.service';
import {
    BotOperation,
    DiscordBotSettings,
    DiscordChannel,
    DiscordConnection,
    DiscordRole,
    DiscordService,
} from '../../../core/services/discord.service';
import { LegalEditorComponent } from './legal-editor/legal-editor.component';
import { RegimentPresentationComponent } from './regiment-presentation/regiment-presentation.component';
import { HasUnsavedChanges, UNSAVED_CHANGES_PROMPT } from './unsaved-changes.guard';

interface NavItem {
    id: string;
    label: string;
    group: string;
    /**
     * The capability the API enforces behind this section. It drives three
     * things at once (T-0265): whether the nav entry renders, whether the
     * section may become `activeSection`, and whether its data is fetched at
     * all — so a caller who cannot see a section never fires a request for it.
     */
    capability: string;
}

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class SettingsComponent implements OnInit, HasUnsavedChanges {
    /**
     * Empty until `ngOnInit` picks the first section the caller may actually
     * see. It used to default to the hardcoded `'profile'`, which handed a
     * `manage_regiment_details`-only caller a blank pane they had no way to
     * leave except by guessing at the nav (T-0265).
     */
    activeSection = '';

    navItems: NavItem[] = [
        {
            id: 'profile',
            label: 'Profile & visibility',
            group: 'Regiment',
            capability: 'manage_settings',
        },
        {
            id: 'discord',
            label: 'Discord & Adjutant',
            group: 'Regiment',
            capability: 'manage_settings',
        },
        {
            id: 'roles',
            label: 'Roles & permissions',
            group: 'Regiment',
            capability: 'manage_settings',
        },
        // Public-facing copy (T-0238..T-0240). Its own group because it is gated
        // on a different capability (manage_regiment_details) from everything
        // above, and because it is the only place in the app that edits pages
        // anonymous visitors read.
        {
            id: 'presentation',
            label: 'Landing & sign-in',
            group: 'Public pages',
            capability: 'manage_regiment_details',
        },
        {
            id: 'legal',
            label: 'Legal documents',
            group: 'Public pages',
            capability: 'manage_regiment_details',
        },
    ];
    navGroups = ['Regiment', 'Public pages'];

    /**
     * The two child editors, so this routed component can answer the
     * CanDeactivate guard on their behalf — they are rendered inside it, not
     * routed to, so the guard cannot see them directly.
     */
    @ViewChild(RegimentPresentationComponent)
    presentationEditor?: RegimentPresentationComponent;
    @ViewChild(LegalEditorComponent) legalEditor?: LegalEditorComponent;

    hasUnsavedChanges(): boolean {
        return (
            !!this.presentationEditor?.hasUnsavedChanges() ||
            !!this.legalEditor?.hasUnsavedChanges() ||
            this.botSettingsDirty
        );
    }

    /** True once the Lord Adjutant form differs from what the server last sent. */
    get botSettingsDirty(): boolean {
        if (!this.botSettings || this.botSettingsSnapshot === null) return false;
        return JSON.stringify(this.botSettings) !== this.botSettingsSnapshot;
    }

    // ── Regiment profile + visibility ────────────────────────────────────────
    settings: SettingsDto | null = null;
    savingProfile = false;
    profileFlash = '';

    // ── Permission matrix ────────────────────────────────────────────────────
    matrix: PermissionsMatrix | null = null;
    savingPermissions = false;
    permissionsFlash = '';
    private readonly permissionChanges = new Map<string, PermissionChange>();

    // ── Invite (T-0017) ──────────────────────────────────────────────────────
    inviteCopied = false;
    savingInvite = false;
    inviteFlash = '';

    // ── Discord + Lord Adjutant bot (T-0024) ─────────────────────────────────
    connection: DiscordConnection | null = null;
    botSettings: DiscordBotSettings | null = null;
    operations: BotOperation[] = [];
    // Guild roles + channels for the pickers — populated by verifyConnection().
    roles: DiscordRole[] = [];
    channels: DiscordChannel[] = [];
    verifying = false;
    resyncing = false;
    savingBot = false;
    botFlash = '';

    /**
     * The backend's `@MaxLength(512)` on `welcomeMessage`. Mirrored so the box
     * stops at the limit instead of letting the admin type a paragraph that comes
     * back as a 400 (lords-dashboard-backend T-0184).
     */
    readonly welcomeMessageMaxLength = 512;

    /**
     * The placeholder contract, verbatim from the API's own documentation of it
     * (lords-dashboard-backend `WELCOME_TOKENS`). Anything not on this list is
     * left as literal text by the composer, so the hint must not promise more.
     */
    readonly welcomeTokens: readonly { token: string; renders: string }[] = [
        { token: '{user}', renders: 'the joining member' },
        { token: '{regiment}', renders: 'the regiment name' },
    ];

    /**
     * The bot settings exactly as the server last gave them, so a section switch
     * or a route change can tell "typed and not saved" from "untouched". The
     * welcome message is the first free-text control on this page — every other
     * field is a picker or a toggle, which is why nothing needed this before.
     */
    private botSettingsSnapshot: string | null = null;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private settingsService: SettingsService,
        private discord: DiscordService,
        private auth: AuthService,
    ) {}

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    /** Whether the caller holds the capability a given section is gated on. */
    canSection(id: string): boolean {
        const item = this.navItems.find((n) => n.id === id);
        return !!item && this.can(item.capability);
    }

    /** Every section the caller may open, in the declared order. */
    get permittedNavItems(): NavItem[] {
        return this.navItems.filter((n) => this.can(n.capability));
    }

    /** Group headings that still have at least one visible item under them. */
    get visibleGroups(): string[] {
        return this.navGroups.filter((group) => this.getNavByGroup(group).length > 0);
    }

    /**
     * Every load is conditional on the capability its section needs (T-0265).
     * This used to fire five GETs unconditionally, so a caller who could see
     * only the Public pages group filled the console with 403s on arrival —
     * `RegimentPresentationComponent` already does the right thing and is the
     * precedent this follows.
     */
    ngOnInit(): void {
        this.activeSection = this.permittedNavItems[0]?.id ?? '';

        // GET /settings backs both the Profile section and the Discord section's
        // invite-link panel, so either one is reason enough to fetch it.
        if (this.canSection('profile') || this.canSection('discord')) {
            this.settingsService
                .getSettings()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (settings) => (this.settings = settings),
                    error: (err) => console.error('Failed to load settings', err),
                });
        }

        if (this.canSection('roles')) {
            this.settingsService
                .getPermissions()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (matrix) => (this.matrix = this.normalizeMatrix(matrix)),
                    error: (err) => console.error('Failed to load permissions', err),
                });
        }

        if (this.canSection('discord')) {
            this.loadDiscord();
        }
    }

    getNavByGroup(group: string): NavItem[] {
        return this.permittedNavItems.filter((n) => n.group === group);
    }

    /**
     * Switch sections, warning first if that would destroy unsaved edits.
     *
     * The sidebar is an in-component switch, not a router outlet, so leaving the
     * "Legal documents" section DESTROYS the editor and its drafts without the
     * CanDeactivate guard ever running. Same prompt, same wording — the user
     * cannot tell (or care) which mechanism caught them.
     *
     * Sections the caller lacks the capability for are refused outright, so a
     * stale id can never open a pane whose nav entry is hidden (T-0265).
     */
    setSection(id: string): void {
        if (id === this.activeSection || !this.canSection(id)) {
            return;
        }
        if (this.hasUnsavedChanges() && !confirm(UNSAVED_CHANGES_PROMPT)) {
            return;
        }
        this.activeSection = id;
    }

    // ── Profile + visibility ─────────────────────────────────────────────────
    /**
     * The Identity "Established" control is a month input (YYYY-MM), but the
     * backend stores a full date — persist the first of the month.
     */
    get establishedMonth(): string {
        return this.settings?.establishedAt ? this.settings.establishedAt.slice(0, 7) : '';
    }

    set establishedMonth(value: string) {
        if (!this.settings) {
            return;
        }
        this.settings.establishedAt = value ? `${value}-01` : null;
    }

    saveProfile(): void {
        if (!this.settings || this.savingProfile) {
            return;
        }
        const s = this.settings;
        const payload: UpdateSettingsPayload = {
            name: s.name,
            missionStatement: s.missionStatement,
            establishedAt: s.establishedAt,
            publicGallery: s.publicGallery,
            publicEvents: s.publicEvents,
            publicStats: s.publicStats,
            openRecruitment: s.openRecruitment,
            allowMercenaries: s.allowMercenaries,
        };
        this.savingProfile = true;
        this.profileFlash = '';
        this.settingsService
            .updateSettings(payload)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (settings) => {
                    this.settings = settings;
                    this.savingProfile = false;
                    this.profileFlash = 'Settings saved.';
                },
                error: (err) => {
                    console.error('Failed to save settings', err);
                    this.savingProfile = false;
                    this.profileFlash = 'Could not save — try again.';
                },
            });
    }

    // ── Invite ───────────────────────────────────────────────────────────────
    get inviteUrl(): string {
        return this.settings?.discordInviteUrl ?? '';
    }

    copyInvite(): void {
        const url = this.inviteUrl;
        if (!url || !navigator.clipboard) {
            return;
        }
        navigator.clipboard.writeText(url).then(
            () => {
                this.inviteCopied = true;
                setTimeout(() => (this.inviteCopied = false), 2000);
            },
            () => console.error('Clipboard write was blocked'),
        );
    }

    /** Persist the Discord invite link (regiment settings row) — T-0156. */
    saveInviteUrl(): void {
        if (!this.settings || this.savingInvite || !this.can('manage_settings')) {
            return;
        }
        this.savingInvite = true;
        this.inviteFlash = '';
        this.settingsService
            .updateSettings({ discordInviteUrl: this.settings.discordInviteUrl?.trim() || null })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (settings) => {
                    this.settings = settings;
                    this.savingInvite = false;
                    this.inviteFlash = 'Invite link saved.';
                },
                error: (err) => {
                    console.error('Failed to save invite link', err);
                    this.savingInvite = false;
                    this.inviteFlash = 'Could not save — try again.';
                },
            });
    }

    // ── Permission matrix ────────────────────────────────────────────────────
    private normalizeMatrix(matrix: PermissionsMatrix): PermissionsMatrix {
        const grid = matrix.matrix;
        for (const role of matrix.roles) {
            const row = grid[role] ?? {};
            for (const cap of matrix.capabilities) {
                row[cap] = !!row[cap];
            }
            grid[role] = row;
        }
        return matrix;
    }

    isGranted(role: MemberRole, capability: string): boolean {
        return this.matrix?.matrix[role]?.[capability] ?? false;
    }

    onPermissionToggle(role: MemberRole, capability: string, granted: boolean): void {
        if (!this.matrix) {
            return;
        }
        this.matrix.matrix[role][capability] = granted;
        this.permissionChanges.set(`${role}:${capability}`, { role, capability, granted });
    }

    savePermissions(): void {
        if (!this.matrix || this.savingPermissions || this.permissionChanges.size === 0) {
            return;
        }
        const changes = [...this.permissionChanges.values()];
        this.savingPermissions = true;
        this.permissionsFlash = '';
        this.settingsService
            .updatePermissions(changes)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (matrix) => {
                    this.matrix = this.normalizeMatrix(matrix);
                    this.permissionChanges.clear();
                    this.savingPermissions = false;
                    this.permissionsFlash = 'Permission matrix updated.';
                },
                error: (err) => {
                    console.error('Failed to update permissions', err);
                    this.savingPermissions = false;
                    this.permissionsFlash = 'Could not update the matrix — try again.';
                },
            });
    }

    /** Humanise a capability/role key ('manage_settings' → 'Manage settings'). */
    label(key: string): string {
        const spaced = key.replace(/_/g, ' ');
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    }

    // ── Discord + Lord Adjutant (T-0024) ─────────────────────────────────────
    private loadDiscord(): void {
        this.discord
            .getConnection()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (connection) => (this.connection = connection),
                error: (err) => console.error('Failed to load bot connection', err),
            });
        this.discord
            .getSettings()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (settings) => this.adoptBotSettings(settings),
                error: (err) => console.error('Failed to load bot settings', err),
            });
        this.discord
            .getOperations()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (operations) => (this.operations = operations),
                error: (err) => console.error('Failed to load bot operations', err),
            });
    }

    verifyConnection(): void {
        if (this.verifying || !this.can('manage_settings')) {
            return;
        }
        this.verifying = true;
        this.discord
            .verifyConnection()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (connection) => {
                    this.connection = connection;
                    this.roles = connection.roles ?? [];
                    this.channels = connection.channels ?? [];
                    this.verifying = false;
                },
                error: (err) => {
                    console.error('Failed to verify connection', err);
                    this.verifying = false;
                },
            });
    }

    /** Whether a role/channel id is present in the loaded picker lists. */
    roleLoaded(id: string | null): boolean {
        return !!id && this.roles.some((r) => r.id === id);
    }

    channelLoaded(id: string | null): boolean {
        return !!id && this.channels.some((c) => c.id === id);
    }

    private roleName(id: string): string | null {
        return this.roles.find((r) => r.id === id)?.name ?? null;
    }

    private channelName(id: string): string | null {
        return this.channels.find((c) => c.id === id)?.name ?? null;
    }

    // ── Picker handlers: set both the id and its cached display name ──────────
    setJoinRole(id: string): void {
        if (!this.botSettings) return;
        this.botSettings.joinRoleId = id || null;
        this.botSettings.joinRoleName = id
            ? (this.roleName(id) ?? this.botSettings.joinRoleName)
            : '';
    }

    setBanRole(id: string): void {
        if (!this.botSettings) return;
        this.botSettings.banRoleId = id || null;
        this.botSettings.banRoleName = id ? this.roleName(id) : null;
    }

    setWelcomeChannel(id: string): void {
        if (!this.botSettings) return;
        this.botSettings.welcomeChannelId = id || null;
    }

    setEnlistmentChannel(id: string): void {
        if (!this.botSettings) return;
        this.botSettings.enlistmentChannelId = id || null;
        this.botSettings.enlistmentChannelName = id ? this.channelName(id) : null;
    }

    setAuditLogChannel(id: string): void {
        if (!this.botSettings) return;
        this.botSettings.auditLogChannelId = id || null;
        this.botSettings.auditLogChannelName = id ? this.channelName(id) : null;
    }

    setEventAnnouncementChannel(id: string): void {
        if (!this.botSettings) return;
        this.botSettings.eventAnnouncementChannelId = id || null;
        this.botSettings.eventAnnouncementChannelName = id ? this.channelName(id) : null;
    }

    /** The backend rejects applyBanRoleOnBan unless a Ban role is configured. */
    get banRoleMissing(): boolean {
        return !!this.botSettings?.applyBanRoleOnBan && !this.botSettings?.banRoleId;
    }

    /**
     * True when the guild gate is switched on while the bot cannot actually
     * answer "is this identity in the guild?". Nothing blocks saving it — the
     * gate fails open server-side — but turning it on before the bot is
     * connected and verified is the one way this switch causes real harm, so it
     * is called out loudly rather than left to be discovered by locked-out
     * members.
     */
    get guildGateBotUnverified(): boolean {
        return (
            !!this.botSettings?.guildGateEnabled &&
            !(this.botSettings.botEnabled && this.connection?.connected)
        );
    }

    resync(): void {
        if (this.resyncing || !this.can('manage_settings')) {
            return;
        }
        this.resyncing = true;
        this.discord
            .resync()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.resyncing = false;
                    this.reloadOperations();
                },
                error: (err) => {
                    console.error('Failed to enqueue resync', err);
                    this.resyncing = false;
                },
            });
    }

    private reloadOperations(): void {
        this.discord
            .getOperations()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (operations) => (this.operations = operations),
                error: (err) => console.error('Failed to reload operations', err),
            });
    }

    resolveOperation(id: string): void {
        this.discord
            .resolveOperation(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (op) => {
                    const idx = this.operations.findIndex((o) => o.id === id);
                    if (idx > -1) {
                        this.operations[idx] = op;
                    }
                },
                error: (err) => console.error('Failed to resolve operation', err),
            });
    }

    /**
     * Take the server's copy as the new baseline. Every assignment to
     * `botSettings` goes through here so the dirty-check can never be left
     * comparing against a stale snapshot.
     */
    private adoptBotSettings(settings: DiscordBotSettings): void {
        this.botSettings = settings;
        this.botSettingsSnapshot = JSON.stringify(settings);
    }

    /** Characters typed into the welcome box, for the counter. */
    get welcomeMessageLength(): number {
        return this.botSettings?.welcomeMessage?.length ?? 0;
    }

    /**
     * A cleared box is NULL, not `''`. The API stores blank as NULL and returns
     * NULL, so keeping `''` in the model would leave the form permanently dirty
     * against the response the very first time an admin clears the greeting.
     */
    setWelcomeMessage(value: string): void {
        if (!this.botSettings) return;
        this.botSettings.welcomeMessage = value.trim() === '' ? null : value;
    }

    saveBotSettings(): void {
        if (!this.botSettings || this.savingBot || !this.can('manage_settings')) {
            return;
        }
        // Mirror the backend guard: applyBanRoleOnBan needs a configured Ban role.
        if (this.banRoleMissing) {
            this.botFlash = 'Pick a Ban role before enabling "Apply Ban role on ban".';
            return;
        }
        // The textarea's maxlength stops typing at the limit, but not a paste
        // into a stale model or a value that arrived over the wire.
        if (this.welcomeMessageLength > this.welcomeMessageMaxLength) {
            this.botFlash = `The welcome message must be ${this.welcomeMessageMaxLength} characters or fewer.`;
            return;
        }
        const b = this.botSettings;
        this.savingBot = true;
        this.botFlash = '';
        this.discord
            .updateSettings({
                botEnabled: b.botEnabled,
                welcomeChannelId: b.welcomeChannelId,
                welcomeMessage: b.welcomeMessage,
                enlistmentChannelId: b.enlistmentChannelId,
                enlistmentChannelName: b.enlistmentChannelName,
                auditLogChannelId: b.auditLogChannelId,
                auditLogChannelName: b.auditLogChannelName,
                eventAnnouncementChannelId: b.eventAnnouncementChannelId,
                eventAnnouncementChannelName: b.eventAnnouncementChannelName,
                joinRoleId: b.joinRoleId,
                joinRoleName: b.joinRoleName,
                banRoleId: b.banRoleId,
                banRoleName: b.banRoleName,
                syncRolesOnChange: b.syncRolesOnChange,
                applyBanRoleOnBan: b.applyBanRoleOnBan,
                guildGateEnabled: b.guildGateEnabled,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (settings) => {
                    this.adoptBotSettings(settings);
                    this.savingBot = false;
                    this.botFlash = 'Lord Adjutant settings saved.';
                },
                error: (err) => {
                    console.error('Failed to save bot settings', err);
                    this.savingBot = false;
                    this.botFlash = err?.error?.message ?? 'Could not save — try again.';
                },
            });
    }

    get connectionLabel(): string {
        switch (this.connection?.connectionStatus) {
            case 'connected':
                return 'Online';
            case 'checking':
                return 'Checking…';
            case 'error':
                return 'Error';
            default:
                return 'Offline';
        }
    }
}
