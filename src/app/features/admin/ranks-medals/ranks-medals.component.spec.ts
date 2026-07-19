import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
        ]);

        ranksService.getAll.and.returnValue(of(ranks));
        ranksService.create.and.returnValue(of(rank()));
        ranksService.update.and.returnValue(of(rank()));
        ranksService.delete.and.returnValue(of(undefined));
        ranksService.reorder.and.returnValue(of(ranks));
        ranksService.linkDiscord.and.returnValue(of(rank()));
        ranksService.unlinkDiscord.and.returnValue(
            of(rank({ discordLinked: false, discordRoleId: null })),
        );

        medalsService.getAll.and.returnValue(of(medals));
        medalsService.create.and.returnValue(of(medal()));
        medalsService.update.and.returnValue(of(medal()));
        medalsService.delete.and.returnValue(of(undefined));
        medalsService.reorder.and.returnValue(of(medals));
        medalsService.linkDiscord.and.returnValue(of(medal()));
        medalsService.unlinkDiscord.and.returnValue(
            of(medal({ discordLinked: false, discordRoleId: null })),
        );

        discord.getRoles.and.returnValue(of(roles));
        discord.getConnection.and.returnValue(of(connection));
        discord.resync.and.returnValue(of(3));

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
        setup([rank({ id: 'r1', discordRoleId: null, discordLinked: false })]);
        component.selectRankEdit(component.ranks[0]);
        component.onRoleSelect('d2');
        expect(ranksService.linkDiscord).toHaveBeenCalledWith('r1', 'd2', 'Captain');

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
});
