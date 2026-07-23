import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { ApiAdminRegimentDocument, RegimentDocumentSlug } from '../../../../core/models/api.model';
import { AuthService } from '../../../../core/services/auth.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { MarkdownService } from '../../../../shared/services/markdown.service';
import { LegalEditorComponent } from './legal-editor.component';

function doc(slug: RegimentDocumentSlug, body: string | null): ApiAdminRegimentDocument {
    return {
        slug,
        body,
        updatedAt: body ? '2026-07-01T10:00:00.000Z' : null,
        updatedByName: body ? 'Amitoj' : null,
    };
}

describe('LegalEditorComponent (T-0240)', () => {
    let fixture: ComponentFixture<LegalEditorComponent>;
    let component: LegalEditorComponent;
    let capabilities: string[];
    let documents: ApiAdminRegimentDocument[];
    let getDocuments: jasmine.Spy;
    let updateDocument: jasmine.Spy;

    async function build(): Promise<void> {
        getDocuments = jasmine.createSpy('getDocuments').and.callFake(() => of(documents));
        updateDocument = jasmine
            .createSpy('updateDocument')
            .and.callFake((slug: RegimentDocumentSlug, body: string | null) =>
                of(doc(slug, body && body.trim() ? body : null)),
            );

        await TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule, RouterModule.forRoot([])],
            declarations: [LegalEditorComponent],
            providers: [
                MarkdownService,
                {
                    provide: AuthService,
                    useValue: { hasCapability: (c: string) => capabilities.includes(c) },
                },
                { provide: SettingsService, useValue: { getDocuments, updateDocument } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
        fixture = TestBed.createComponent(LegalEditorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
        capabilities = ['manage_regiment_details'];
        documents = [doc('terms', null), doc('privacy', null), doc('guidelines', null)];
    });

    describe('without manage_regiment_details', () => {
        beforeEach(async () => {
            capabilities = ['manage_settings'];
            await build();
        });

        it('does not open the editor', () => {
            expect(fixture.nativeElement.querySelector('#doc-body')).toBeNull();
            expect(getDocuments).not.toHaveBeenCalled();
        });

        it('cannot submit even if save() is reached some other way', () => {
            component.body = 'sneaky';
            component.save();
            expect(updateDocument).not.toHaveBeenCalled();
        });
    });

    describe('with the capability', () => {
        beforeEach(() => build());

        it('renders one tab per document plus the source/preview panes', () => {
            expect(getDocuments).toHaveBeenCalled();
            expect(fixture.nativeElement.querySelectorAll('.doc-tab').length).toBe(3);
            expect(fixture.nativeElement.querySelector('#doc-body')).not.toBeNull();
            expect(fixture.nativeElement.querySelector('.doc-preview')).not.toBeNull();
        });

        it('shows the rendered preview in the DOM, not the raw markdown', () => {
            component.body = '## Section one';
            fixture.detectChanges();
            const preview = fixture.nativeElement.querySelector('.doc-preview');
            expect(preview.querySelector('h2')!.textContent).toBe('Section one');
            expect(preview.textContent).not.toContain('##');
        });

        it('starts clean and goes dirty on the first keystroke', () => {
            expect(component.hasUnsavedChanges()).toBeFalse();
            component.body = 'Something new';
            expect(component.hasUnsavedChanges()).toBeTrue();
        });

        it('keeps a draft alive while the author looks at another tab', () => {
            component.body = 'Draft terms';
            component.selectTab('privacy');
            expect(component.body).toBe('');
            component.selectTab('terms');
            expect(component.body).toBe('Draft terms');
            expect(component.hasUnsavedChanges()).toBeTrue();
        });

        it('reverts the open tab back to what was loaded', () => {
            component.body = 'Draft terms';
            component.revert();
            expect(component.body).toBe('');
            expect(component.hasUnsavedChanges()).toBeFalse();
        });

        /**
         * The requirement this component exists to satisfy: preview and the
         * published page cannot diverge, because they are literally the same
         * renderer instance.
         */
        it('previews through the same MarkdownService the public page uses', () => {
            component.body = '## Section\n\nBody with **bold**.';
            const expected = TestBed.inject(MarkdownService).render(component.body);
            expect(component.previewHtml).toBe(expected);
            expect(component.previewHtml).toContain('<h2>Section</h2>');
        });

        it('renders author markup as inert text in the preview too', () => {
            component.body = '<script>alert(1)</script>';
            expect(component.previewHtml).not.toContain('<script>');
            expect(component.previewHtml).toContain('&lt;script&gt;');
        });

        it('saves the markdown body for the open tab', () => {
            component.selectTab('privacy');
            component.body = 'We keep your Discord id.';
            component.save();
            expect(updateDocument).toHaveBeenCalledWith('privacy', 'We keep your Discord id.');
            expect(component.hasUnsavedChanges()).toBeFalse();
        });

        it('asks before clearing a document back to the shipped copy', () => {
            const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
            component.body = '   ';
            component.save();
            expect(confirmSpy).toHaveBeenCalled();
            expect(updateDocument).not.toHaveBeenCalled();
        });

        it('clears the document when the author confirms', () => {
            spyOn(window, 'confirm').and.returnValue(true);
            component.body = '';
            component.save();
            expect(updateDocument).toHaveBeenCalledWith('terms', '');
        });

        it('re-baselines from the server projection, not from what was typed', () => {
            // A blank save comes back as body: null. Baselining the typed '   '
            // would leave the editor permanently dirty and prompt on every exit.
            spyOn(window, 'confirm').and.returnValue(true);
            component.body = '   ';
            component.save();
            expect(component.body).toBe('');
            expect(component.hasUnsavedChanges()).toBeFalse();
        });

        it('arms the native reload prompt only while there are edits', () => {
            const clean = new Event('beforeunload') as BeforeUnloadEvent;
            const cleanSpy = spyOn(clean, 'preventDefault');
            component.onBeforeUnload(clean);
            expect(cleanSpy).not.toHaveBeenCalled();

            component.body = 'draft';
            const dirty = new Event('beforeunload') as BeforeUnloadEvent;
            const dirtySpy = spyOn(dirty, 'preventDefault');
            component.onBeforeUnload(dirty);
            expect(dirtySpy).toHaveBeenCalled();
        });
    });
});
