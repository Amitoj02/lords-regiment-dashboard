import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RanksMedalsComponent } from './ranks-medals.component';
import { RanksService } from '../../../core/services/ranks.service';
import { MedalsService } from '../../../core/services/medals.service';
import {
    DiscordConnection,
    DiscordRole,
    DiscordService,
    RoleRelinkProgress,
} from '../../../core/services/discord.service';
import { Medal, Rank } from '../../../core/models/member.model';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../core/services/storage.service';

function rank(overrides: Partial<Rank> = {}): Rank {
    return {
        id: 'r1',
        name: 'Sergeant',
        imageUrl: null,
        holders: 8,
        discordRole: '@Sergeant',
        discordRoleId: 'd1',
        discordLinked: true,
        order: 5,
        ...overrides,
    };
}

function medal(overrides: Partial<Medal> = {}): Medal {
    return {
        id: 'm1',
        letter: 'M',
        imageUrl: null,
        title: 'Marksman, First Class',
        description: 'Exceptional accuracy.',
        holders: 7,
        awards: 9,
        precedence: 2,
        discordRoleId: 'd1',
        discordLinked: true,
        ...overrides,
    };
}

const roles: DiscordRole[] = [
    { id: 'd1', name: 'Sergeant', position: 1 },
    { id: 'd2', name: 'Captain', position: 2 },
];

/** One poll answer for the bulk re-link progress endpoint. */
function progress(overrides: Partial<RoleRelinkProgress> = {}): RoleRelinkProgress {
    return {
        batchId: 'b1',
        state: 'running',
        subject: 'rank',
        subjectLabel: 'Sergeant',
        outgoingRoleId: 'd1',
        incomingRoleId: 'd2',
        expanding: false,
        total: 8,
        applied: 4,
        pending: 4,
        failed: 0,
        cancelled: 0,
        failures: { permanent: 0, exhausted: 0, retrying: 0, samples: [] },
        startedAt: '2026-07-22T10:00:00Z',
        finishedAt: null,
        ...overrides,
    };
}

const connection: DiscordConnection = {
    connected: true,
    connectionStatus: 'connected',
    botVersion: null,
    totalRoles: 2,
    botRolePosition: null,
    membersVisible: null,
    lastHeartbeatAt: null,
    lastFullSyncAt: null,
};

describe('RanksMedalsComponent', () => {
    let fixture: ComponentFixture<RanksMedalsComponent>;
    let component: RanksMedalsComponent;
    let ranksService: jasmine.SpyObj<RanksService>;
    let medalsService: jasmine.SpyObj<MedalsService>;
    let discord: jasmine.SpyObj<DiscordService>;
    let storage: jasmine.SpyObj<StorageService>;

    function setup(ranks: Rank[] = [rank()], medals: Medal[] = [medal()]): void {
        ranksService = jasmine.createSpyObj<RanksService>('RanksService', [
            'getAll',
            'create',
            'update',
            'delete',
            'reorder',
            'linkDiscord',
            'unlinkDiscord',
        ]);
        medalsService = jasmine.createSpyObj<MedalsService>('MedalsService', [
            'getAll',
            'create',
            'update',
            'delete',
            'reorder',
            'linkDiscord',
            'unlinkDiscord',
        ]);
        discord = jasmine.createSpyObj<DiscordService>('DiscordService', [
            'getRoles',
            'getConnection',
            'resync',
            'getRelinkProgress',
            'cancelRelink',
        ]);

        ranksService.getAll.and.returnValue(of(ranks));
        ranksService.create.and.returnValue(of(rank()));
        ranksService.update.and.returnValue(of(rank()));
        ranksService.delete.and.returnValue(of(undefined));
        ranksService.reorder.and.returnValue(of(ranks));
        // Default: the change queued nothing (no holders / bot off), so no poll.
        ranksService.linkDiscord.and.returnValue(of({ entity: rank(), relinkBatchId: null }));
        ranksService.unlinkDiscord.and.returnValue(
            of({
                entity: rank({ discordLinked: false, discordRoleId: null }),
                relinkBatchId: null,
            }),
        );

        medalsService.getAll.and.returnValue(of(medals));
        medalsService.create.and.returnValue(of(medal()));
        medalsService.update.and.returnValue(of(medal()));
        medalsService.delete.and.returnValue(of(undefined));
        medalsService.reorder.and.returnValue(of(medals));
        medalsService.linkDiscord.and.returnValue(of({ entity: medal(), relinkBatchId: null }));
        medalsService.unlinkDiscord.and.returnValue(
            of({
                entity: medal({ discordLinked: false, discordRoleId: null }),
                relinkBatchId: null,
            }),
        );

        discord.getRoles.and.returnValue(of(roles));
        discord.getConnection.and.returnValue(of(connection));
        discord.resync.and.returnValue(of(3));
        discord.getRelinkProgress.and.returnValue(of(progress()));
        discord.cancelRelink.and.returnValue(of(progress({ state: 'partial', pending: 0 })));

        storage = jasmine.createSpyObj<StorageService>('StorageService', ['getPolicy', 'upload']);
        storage.getPolicy.and.returnValue(of(DEFAULT_STORAGE_POLICY));
        storage.upload.and.returnValue(of('ranks/reg/icon.png'));

        TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [RanksMedalsComponent],
            providers: [
                { provide: RanksService, useValue: ranksService },
                { provide: MedalsService, useValue: medalsService },
                { provide: DiscordService, useValue: discord },
                { provide: StorageService, useValue: storage },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(RanksMedalsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('loads live ranks + medals and renders a row per entry', () => {
        setup([rank({ id: 'r1' }), rank({ id: 'r2', name: 'Corporal' })], [medal()]);
        expect(ranksService.getAll).toHaveBeenCalled();
        expect(medalsService.getAll).toHaveBeenCalled();
        expect(component.ranks.length).toBe(2);
        expect(component.medals.length).toBe(1);
        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelectorAll('.rank-row').length).toBe(2);
        expect(el.querySelectorAll('.medal-row').length).toBe(1);
    });

    it('populates the role picker and connection on init', () => {
        setup();
        expect(component.roles.length).toBe(2);
        expect(component.botConnected).toBeTrue();
        expect(component.rolesUnavailable).toBeFalse();
    });

    it('selectRankEdit opens the rank editor from the row; saveRank updates by id', () => {
        setup([rank({ id: 'r7', name: 'Major', order: 3 })]);
        component.selectRankEdit(component.ranks[0]);
        expect(component.editorMode).toBe('rank');
        expect(component.editingRankId).toBe('r7');
        expect(component.editRankName).toBe('Major');
        expect(component.editRankPrecedence).toBe(3);

        component.saveRank();
        expect(ranksService.update).toHaveBeenCalledWith(
            'r7',
            jasmine.objectContaining({ name: 'Major', precedence: 3 }),
        );
        // Refetched after the mutation (once on init, once after save).
        expect(ranksService.getAll.calls.count()).toBe(2);
        expect(component.editorMode).toBeNull();
    });

    it('newRank + saveRank creates a rank', () => {
        setup();
        component.newRank();
        expect(component.editorMode).toBe('rank');
        expect(component.editingRankId).toBeNull();
        component.editRankName = 'Recruit';
        component.saveRank();
        expect(ranksService.create).toHaveBeenCalled();
    });

    it('deleteRank surfaces a friendly message on a 409 conflict', () => {
        setup([rank({ id: 'r1', name: 'Private' })]);
        ranksService.delete.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 409 })),
        );
        component.deleteRank(component.ranks[0]);
        expect(component.rowWarn).toBeTrue();
        expect(component.rowFlash).toContain('still has holders');
    });

    it('selectMedalEdit populates precedence AND discordRoleId (the fix)', () => {
        setup([rank()], [medal({ id: 'm1', precedence: 4, discordRoleId: 'd2' })]);
        component.selectMedalEdit(component.medals[0]);
        expect(component.editorMode).toBe('medal');
        expect(component.editingMedalId).toBe('m1');
        expect(component.editPrecedence).toBe(4);
        expect(component.editDiscordRoleId).toBe('d2');
    });

    it('discardMedal resets the medal form from the loaded medal', () => {
        setup([rank()], [medal({ id: 'm1', title: 'Marksman' })]);
        component.selectMedalEdit(component.medals[0]);
        component.editTitle = 'edited';
        component.discardMedal();
        expect(component.editTitle).toBe('Marksman');
    });

    it('onRoleSelect links the Discord role for the edited rank; unlink calls unlinkDiscord', () => {
        // Zero holders: neither direction has anyone to re-role, so no confirmation.
        setup([rank({ id: 'r1', discordRoleId: null, discordLinked: false, holders: 0 })]);
        component.selectRankEdit(component.ranks[0]);
        component.onRoleSelect('d2');
        expect(ranksService.linkDiscord).toHaveBeenCalledWith('r1', 'd2', 'Captain');
        expect(component.relinkPrompt).toBeNull();

        component.unlinkCurrentRole();
        expect(ranksService.unlinkDiscord).toHaveBeenCalledWith('r1');
    });

    it('links a medal role through the shared editor', () => {
        setup([rank()], [medal({ id: 'm1', discordRoleId: null, discordLinked: false })]);
        component.selectMedalEdit(component.medals[0]);
        component.onRoleSelect('d1');
        expect(medalsService.linkDiscord).toHaveBeenCalledWith('m1', 'd1', 'Sergeant');
    });

    it('onRankDrop reorders and posts the new id order', () => {
        setup([rank({ id: 'r1' }), rank({ id: 'r2' }), rank({ id: 'r3' })]);
        component.onRankDragStart(0);
        component.onRankDrop(2);
        expect(ranksService.reorder).toHaveBeenCalledWith(['r2', 'r3', 'r1']);
    });

    it('onMedalDrop reorders the medal cabinet', () => {
        setup([rank()], [medal({ id: 'm1' }), medal({ id: 'm2' })]);
        component.onMedalDragStart(1);
        component.onMedalDrop(0);
        expect(medalsService.reorder).toHaveBeenCalledWith(['m2', 'm1']);
    });

    it('guards against a second reorder while one is in flight', () => {
        setup([rank({ id: 'r1' }), rank({ id: 'r2' })]);
        component.reordering = true;
        component.onRankDragStart(0);
        component.onRankDrop(1);
        expect(ranksService.reorder).not.toHaveBeenCalled();
    });

    it('syncWithDiscord resyncs when the bot is connected', () => {
        setup();
        component.syncWithDiscord();
        expect(discord.resync).toHaveBeenCalled();
        expect(component.syncFlash).toContain('Sync queued');
        const hasSyncBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).some((b) =>
            (b as HTMLElement).textContent?.includes('Sync with Discord'),
        );
        expect(hasSyncBtn).toBeTrue();
    });

    it('hides the sync button and no-ops resync when the bot is disconnected', () => {
        setup();
        component.connection = { ...connection, connected: false };
        discord.resync.calls.reset();
        fixture.detectChanges();
        component.syncWithDiscord();
        expect(discord.resync).not.toHaveBeenCalled();
        const hasSyncBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).some((b) =>
            (b as HTMLElement).textContent?.includes('Sync with Discord'),
        );
        expect(hasSyncBtn).toBeFalse();
    });

    it('shows a per-panel empty state when there are no ranks or medals', () => {
        setup([], []);
        expect(fixture.nativeElement.querySelectorAll('.empty').length).toBe(2);
    });

    // ── Bulk Discord role re-link (T-0254) ───────────────────────────────────────
    describe('bulk role re-link', () => {
        /** Open the rank editor on a rank that is already linked to @Sergeant (d1). */
        function editLinkedRank(holders = 8): void {
            setup([rank({ id: 'r1', discordRoleId: 'd1', discordLinked: true, holders })]);
            component.selectRankEdit(component.ranks[0]);
        }

        it('warns with the holder count and BOTH role names before re-linking', () => {
            editLinkedRank(8);
            component.onRoleSelect('d2');

            // Nothing is submitted until the admin answers.
            expect(ranksService.linkDiscord).not.toHaveBeenCalled();
            expect(component.relinkPrompt).toEqual(
                jasmine.objectContaining({
                    holders: 8,
                    fromRoleName: 'Sergeant',
                    toRoleName: 'Captain',
                    nextRoleId: 'd2',
                }),
            );
        });

        it('skips the warning when there is no old role to strip', () => {
            setup([rank({ id: 'r1', discordRoleId: null, discordLinked: false, holders: 8 })]);
            component.selectRankEdit(component.ranks[0]);
            component.onRoleSelect('d2');
            expect(component.relinkPrompt).toBeNull();
            expect(ranksService.linkDiscord).toHaveBeenCalled();
        });

        it('warns before an unlink too — every holder loses the role', () => {
            editLinkedRank(8);
            component.unlinkCurrentRole();
            expect(ranksService.unlinkDiscord).not.toHaveBeenCalled();
            expect(component.relinkPrompt?.nextRoleId).toBeNull();
            expect(component.relinkPrompt?.fromRoleName).toBe('Sergeant');
        });

        it('backing out of the warning restores the still-linked role', () => {
            editLinkedRank();
            component.onRoleSelect('d2');
            component.cancelRelinkPrompt();
            expect(component.relinkPrompt).toBeNull();
            expect(component.editDiscordRoleId).toBe('d1');
            expect(ranksService.linkDiscord).not.toHaveBeenCalled();
        });

        it('confirming submits the change and follows the batch to 100%', fakeAsync(() => {
            editLinkedRank();
            ranksService.linkDiscord.and.returnValue(of({ entity: rank(), relinkBatchId: 'b1' }));
            discord.getRelinkProgress.and.returnValues(
                of(progress({ applied: 4, pending: 4 })),
                of(progress({ state: 'completed', applied: 8, pending: 0, finishedAt: 'now' })),
            );

            component.onRoleSelect('d2');
            component.confirmRelink();

            expect(ranksService.linkDiscord).toHaveBeenCalledWith('r1', 'd2', 'Captain');
            tick(0); // timer(0, …) still needs a turn of the clock to emit
            expect(component.relink?.applied).toBe(4);
            expect(component.relinkPercent).toBe(50);
            expect(component.relinkPolling).toBeTrue();

            tick(2000);
            expect(component.relink?.state).toBe('completed');
            expect(component.relinkPercent).toBe(100);
            // Terminal — the poll must have retired itself.
            expect(component.relinkPolling).toBeFalse();
            tick(10000);
            expect(discord.getRelinkProgress.calls.count()).toBe(2);
        }));

        it('does not poll at all when the change queued nothing', fakeAsync(() => {
            editLinkedRank();
            ranksService.linkDiscord.and.returnValue(of({ entity: rank(), relinkBatchId: null }));
            component.onRoleSelect('d2');
            component.confirmRelink();
            tick(10000);
            expect(discord.getRelinkProgress).not.toHaveBeenCalled();
            expect(component.relinkPolling).toBeFalse();
        }));

        it('stops polling when the editor panel closes — not only on destroy', fakeAsync(() => {
            editLinkedRank();
            ranksService.linkDiscord.and.returnValue(of({ entity: rank(), relinkBatchId: 'b1' }));
            discord.getRelinkProgress.and.returnValue(of(progress()));

            component.onRoleSelect('d2');
            component.confirmRelink();
            tick(0);
            expect(component.relinkPolling).toBeTrue();
            const pollsWhileOpen = discord.getRelinkProgress.calls.count();

            component.closeEditor();
            expect(component.relinkPolling).toBeFalse();
            expect(component.relink).toBeNull();

            // The interval must be gone, not merely hidden.
            tick(20000);
            expect(discord.getRelinkProgress.calls.count()).toBe(pollsWhileOpen);
        }));

        it('reports a cancelled run as partial and honestly refuses to claim a rollback', fakeAsync(() => {
            editLinkedRank();
            ranksService.linkDiscord.and.returnValue(of({ entity: rank(), relinkBatchId: 'b1' }));
            discord.getRelinkProgress.and.returnValue(of(progress()));
            discord.cancelRelink.and.returnValue(
                of(progress({ state: 'partial', applied: 4, pending: 0, cancelled: 4 })),
            );

            component.onRoleSelect('d2');
            component.confirmRelink();
            tick(0);
            component.cancelRelinkRun();

            expect(discord.cancelRelink).toHaveBeenCalledWith('b1');
            expect(component.relink?.state).toBe('partial');
            expect(component.relinkSummary).toContain('no rollback');
            expect(component.relinkVariant).toBe('warn');
            // A stop is terminal for the poll as much as a completion is.
            expect(component.relinkPolling).toBeFalse();
            tick(20000);
        }));

        it("surfaces the server's failure reason (e.g. bot role hierarchy)", fakeAsync(() => {
            editLinkedRank();
            ranksService.linkDiscord.and.returnValue(of({ entity: rank(), relinkBatchId: 'b1' }));
            discord.getRelinkProgress.and.returnValue(
                of(
                    progress({
                        state: 'completed',
                        applied: 5,
                        pending: 0,
                        failed: 3,
                        failures: {
                            permanent: 3,
                            exhausted: 0,
                            retrying: 0,
                            samples: ['Missing Permissions: bot role is below @Captain'],
                        },
                    }),
                ),
            );

            component.onRoleSelect('d2');
            component.confirmRelink();
            tick(0);

            expect(component.relinkFailureReason).toContain('bot role is below @Captain');
            expect(component.relinkVariant).toBe('err');
            tick(20000);
        }));

        it('stops polling and explains when the progress endpoint itself fails', fakeAsync(() => {
            editLinkedRank();
            ranksService.linkDiscord.and.returnValue(of({ entity: rank(), relinkBatchId: 'b1' }));
            discord.getRelinkProgress.and.returnValue(
                throwError(() => new HttpErrorResponse({ status: 500 })),
            );

            component.onRoleSelect('d2');
            component.confirmRelink();
            tick(0);

            expect(component.relinkError).toContain('still running on the server');
            expect(component.relinkPolling).toBeFalse();
            tick(20000);
            expect(discord.getRelinkProgress.calls.count()).toBe(1);
        }));
    });

    // ── Icon validation (T-0194/T-0195; WebP accept added T-0215) ────────────────
    describe('icon validation', () => {
        const RealImage = window.Image;

        /** Swap in a fake Image whose load fires with the given natural dimensions. */
        function stubImage(width: number, height: number, fail = false): void {
            class FakeImage {
                naturalWidth = width;
                naturalHeight = height;
                onload: (() => void) | null = null;
                onerror: (() => void) | null = null;
                private _src = '';
                set src(value: string) {
                    this._src = value;
                    // Fire on the next microtask, after onload/onerror are attached.
                    void Promise.resolve().then(() => (fail ? this.onerror?.() : this.onload?.()));
                }
            }
            (window as unknown as { Image: unknown }).Image = FakeImage;
            spyOn(URL, 'createObjectURL').and.returnValue('blob:icon');
            spyOn(URL, 'revokeObjectURL');
        }

        afterEach(() => {
            (window as unknown as { Image: typeof Image }).Image = RealImage;
        });

        /** Reach the private validator directly (raster path stubbed above). */
        function validate(file: File): Promise<string | null> {
            return (
                component as unknown as { validateIconFile(f: File): Promise<string | null> }
            ).validateIconFile(file);
        }

        it('rejects a non-allowed type with copy naming PNG, SVG, and WebP', async () => {
            setup();
            const err = await validate(new File([''], 'icon.gif', { type: 'image/gif' }));
            expect(err).toContain('PNG');
            expect(err).toContain('SVG');
            expect(err).toContain('WebP');
        });

        it('accepts a WebP within the 250px cap', async () => {
            setup();
            stubImage(200, 200);
            expect(await validate(new File([''], 'icon.webp', { type: 'image/webp' }))).toBeNull();
        });

        it('rejects a WebP larger than 250px on a side with the cap message', async () => {
            setup();
            stubImage(300, 120);
            const err = await validate(new File([''], 'big.webp', { type: 'image/webp' }));
            expect(err).toContain('250px');
        });

        it('exempts an SVG from the pixel cap (vector has no raster dimension)', async () => {
            setup();
            expect(
                await validate(new File([''], 'icon.svg', { type: 'image/svg+xml' })),
            ).toBeNull();
        });
    });
});
