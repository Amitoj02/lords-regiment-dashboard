import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { DiscordService } from '../../../core/services/discord.service';
import { SettingsService } from '../../../core/services/settings.service';
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
