import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiRegimentDocument } from '../../../core/models/api.model';
import { SeoService } from '../../../core/services/seo.service';
import { SettingsService } from '../../../core/services/settings.service';
import { MarkdownService } from '../../../shared/services/markdown.service';

export type LegalDoc = 'terms' | 'privacy' | 'guidelines';

/** Page headings, rendered by the component so a page is never untitled. */
const DOC_TITLES: Record<LegalDoc, string> = {
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    guidelines: 'Community Guidelines',
};

/**
 * Meta descriptions. Deliberately NOT derived from the admin-authored body: the
 * body is markdown that may not have landed yet (or at all), and a legal page's
 * one-line summary does not change when its clauses do.
 */
const DOC_DESCRIPTIONS: Record<LegalDoc, string> = {
    terms: 'The terms this community dashboard is offered under.',
    privacy: 'What this community dashboard does with your Discord identity, and what it does not.',
    guidelines: 'What the regiment expects from members using the dashboard and its gallery.',
};

/**
 * Public legal pages: Terms, Privacy, and Community Guidelines. One component
 * renders all three, selected by the route's `data.doc`.
 *
 * ## Admin-authored content over a shipped fallback (T-0241)
 * The body comes from the ANONYMOUS `GET /regiment/documents` and is rendered
 * through {@link MarkdownService} — the same instance the admin editor previews
 * with, so preview and published page cannot drift.
 *
 * The shipped `<article>` copy stays in the template as the fallback and is used
 * whenever the stored document is unset OR the request fails. That is not
 * politeness: serving a privacy policy is a Discord Developer ToS obligation, so
 * "the API is down" must still produce a real, compliant page. The fetch is
 * therefore fire-and-forget with `catchError` — nothing about this page waits on
 * it, and there is no auth or app-shell dependency, so a cold deep link to
 * `/privacy` in a fresh anonymous session renders immediately.
 */
@Component({
    selector: 'hf-legal',
    templateUrl: './legal.component.html',
    styleUrls: ['./legal.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class LegalComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly settings = inject(SettingsService);
    private readonly markdown = inject(MarkdownService);
    private readonly seo = inject(SeoService);
    private readonly destroyRef = inject(DestroyRef);

    /** Rendered HTML of the admin-authored body; '' means "use the shipped copy". */
    documentHtml = '';
    /** ISO timestamp of the last edit, when the document is admin-authored. */
    updatedAt: string | null = null;

    get doc(): LegalDoc {
        return (this.route.snapshot.data['doc'] as LegalDoc) ?? 'terms';
    }

    get title(): string {
        return DOC_TITLES[this.doc];
    }

    ngOnInit(): void {
        // One component serves three routes, so the slug is both the heading and
        // the canonical path — /terms, /privacy, /guidelines.
        this.seo.apply({
            title: this.title,
            description: DOC_DESCRIPTIONS[this.doc],
            canonicalPath: `/${this.doc}`,
        });

        this.settings
            .getPublicDocuments()
            .pipe(
                catchError(() => of([] as ApiRegimentDocument[])),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((documents) => {
                const document = documents.find((d) => d.slug === this.doc);
                // `render` returns '' for a null/blank body, so this single
                // assignment covers "never edited", "cleared" and "request failed"
                // — all three land on the shipped fallback.
                this.documentHtml = this.markdown.render(document?.body);
                this.updatedAt = this.documentHtml ? (document?.updatedAt ?? null) : null;
            });
    }
}
