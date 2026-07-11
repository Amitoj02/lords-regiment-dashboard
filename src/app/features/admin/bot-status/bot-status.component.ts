import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    BotOperation,
    DiscordConnection,
    DiscordService,
} from '../../../core/services/discord.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-bot-status',
    templateUrl: './bot-status.component.html',
    styleUrls: ['./bot-status.component.scss'],
    standalone: false,
})
export class BotStatusComponent implements OnInit {
    crumbs = ['Settings', 'Quartermaster bot'];

    connection: DiscordConnection | null = null;
    operations: BotOperation[] = [];
    verifying = false;
    resyncing = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private discord: DiscordService,
        private auth: AuthService,
    ) {}

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    ngOnInit(): void {
        this.loadConnection();
        this.loadOperations();
    }

    private loadConnection(): void {
        this.discord
            .getConnection()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (connection) => (this.connection = connection),
                error: (err) => console.error('Failed to load bot connection', err),
            });
    }

    private loadOperations(): void {
        this.discord
            .getOperations()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (operations) => (this.operations = operations),
                error: (err) => console.error('Failed to load bot operations', err),
            });
    }

    verify(): void {
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
                    this.verifying = false;
                },
                error: (err) => {
                    console.error('Failed to verify bot connection', err);
                    this.verifying = false;
                },
            });
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
                    this.loadOperations();
                },
                error: (err) => {
                    console.error('Failed to enqueue resync', err);
                    this.resyncing = false;
                },
            });
    }

    resolve(id: string): void {
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

    get membersLabel(): string {
        return this.connection?.membersVisible != null
            ? String(this.connection.membersVisible)
            : '—';
    }

    get rolesLabel(): string {
        return this.connection?.totalRoles != null ? String(this.connection.totalRoles) : '—';
    }

    get connectionLabel(): string {
        const status = this.connection?.connectionStatus;
        switch (status) {
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

    formatTime(iso: string | null): string {
        if (!iso) {
            return '—';
        }
        return new Date(iso).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}
