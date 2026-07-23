import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiRegimentDocument, RegimentDocumentSlug } from '../../../core/models/api.model';
import { SettingsService } from '../../../core/services/settings.service';
import { MarkdownService } from '../../../shared/services/markdown.service';
import { LegalComponent, LegalDoc } from './legal.component';

function doc(slug: RegimentDocumentSlug, body: string | null): ApiRegimentDocument {
    return { slug, body, updatedAt: body ? '2026-07-01T10:00:00.000Z' : null };
}

/**
 * T-0241. The load-bearing property of these pages is that they ALWAYS render a
 * real document: an unset body, a cleared body and an unreachable API must all
 * land on the shipped copy, because serving a privacy policy is a Discord
 * Developer ToS obligation rather than a nicety.
 */
describe('LegalComponent (T-0241)', () => {
    let fixture: ComponentFixture<LegalComponent>;
    let documents$: Observable<ApiRegimentDocument[]>;
    let route: LegalDoc;

    async function build(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [LegalComponent],
            providers: [
                MarkdownService,
                { provide: SettingsService, useValue: { getPublicDocuments: () => documents$ } },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { data: { doc: route } } },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
        fixture = TestBed.createComponent(LegalComponent);
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
        route = 'privacy';
        documents$ = of([]);
    });

    function authored(): HTMLElement | null {
        return fixture.nativeElement.querySelector('.legal-doc--authored');
    }
    function text(): string {
        return (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    }

    it('renders the shipped copy when the document has never been edited', async () => {
        documents$ = of([doc('privacy', null)]);
        await build();
        expect(authored()).toBeNull();
        expect(text()).toContain('A community project — minimal by design.');
    });

    it('renders the shipped copy when the request fails outright', async () => {
        // Blocking the request is the exact scenario the fallback exists for.
        documents$ = throwError(() => new Error('network down'));
        await build();
        expect(authored()).toBeNull();
        expect(text()).toContain('A community project — minimal by design.');
    });

    it('renders the admin-authored body instead of the shipped copy', async () => {
        documents$ = of([doc('privacy', '## What we keep\n\nOnly your Discord id.')]);
        await build();
        const article = authored();
        expect(article).not.toBeNull();
        expect(article!.querySelector('h2')!.textContent).toBe('What we keep');
        expect(article!.textContent).toContain('Only your Discord id.');
        // The shipped copy must be GONE, not merely pushed below the fold.
        expect(text()).not.toContain('A community project — minimal by design.');
    });

    it('picks the document that matches its own route', async () => {
        route = 'guidelines';
        documents$ = of([
            doc('terms', '# Terms body'),
            doc('privacy', '# Privacy body'),
            doc('guidelines', 'Be kind to each other.'),
        ]);
        await build();
        expect(authored()!.textContent).toContain('Be kind to each other.');
        expect(text()).not.toContain('Privacy body');
    });

    it('always prints the route heading, so the page is never untitled', async () => {
        route = 'terms';
        documents$ = of([doc('terms', 'Body with no heading of its own.')]);
        await build();
        expect(authored()!.querySelector('.legal-title')!.textContent).toBe('Terms & Conditions');
    });

    it('renders author markup as inert text, never as live HTML', async () => {
        documents$ = of([
            doc('privacy', 'Careful: <img src=x onerror="alert(1)"> and <b>bold</b>.'),
        ]);
        await build();
        const article = authored()!;
        // Escaped by MarkdownService, then bound with plain [innerHTML] so
        // Angular's sanitiser is a second, independent layer.
        expect(article.querySelector('img')).toBeNull();
        expect(article.querySelector('b')).toBeNull();
        expect(article.textContent).toContain('<img src=x onerror="alert(1)">');
    });

    it('renders through the same MarkdownService the admin preview uses', async () => {
        documents$ = of([doc('privacy', '- one\n- two')]);
        await build();
        const rendered = TestBed.inject(MarkdownService).render('- one\n- two');
        expect(authored()!.innerHTML).toContain(rendered);
    });
});
