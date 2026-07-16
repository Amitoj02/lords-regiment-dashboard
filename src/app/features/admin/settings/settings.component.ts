import { Component, DestroyRef, OnInit, inject } from '@angular/core';
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

interface NavItem {
    id: string;
    label: string;
    group: string;
}

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    standalone: false,
})
export class SettingsComponent implements OnInit {
    activeSection = 'profile';

    navItems: NavItem[] = [
        { id: 'profile', label: 'Profile & visibility', group: 'Regiment' },
        { id: 'discord', label: 'Discord & Adjutant', group: 'Regiment' },
        { id: 'roles', label: 'Roles & permissions', group: 'Regiment' },
    ];
    navGroups = ['Regiment'];

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

    ngOnInit(): void {
        this.settingsService
            .getSettings()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (settings) => (this.settings = settings),
                error: (err) => console.error('Failed to load settings', err),
            });

        this.settingsService
            .getPermissions()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (matrix) => (this.matrix = this.normalizeMatrix(matrix)),
                error: (err) => console.error('Failed to load permissions', err),
            });

        this.loadDiscord();
    }

    getNavByGroup(group: string): NavItem[] {
        return this.navItems.filter((n) => n.group === group);
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
                next: (settings) => (this.botSettings = settings),
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

    saveBotSettings(): void {
        if (!this.botSettings || this.savingBot || !this.can('manage_settings')) {
            return;
        }
        // Mirror the backend guard: applyBanRoleOnBan needs a configured Ban role.
        if (this.banRoleMissing) {
            this.botFlash = 'Pick a Ban role before enabling "Apply Ban role on ban".';
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
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (settings) => {
                    this.botSettings = settings;
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
