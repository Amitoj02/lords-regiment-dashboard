import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiAdminRegimentDocument, RegimentDocumentSlug } from '../../../../core/models/api.model';
import { AuthService } from '../../../../core/services/auth.service';
import { DOCUMENT_MAX_LENGTH, SettingsService } from '../../../../core/services/settings.service';
import { MarkdownService } from '../../../../shared/services/markdown.service';
import { HasUnsavedChanges } from '../unsaved-changes.guard';

/** Tab labels, in the order the public footer links them. */
const DOCUMENT_TABS: { slug: RegimentDocumentSlug; label: string; route: string }[] = [
    { slug: 'terms', label: 'Terms & Conditions', route: '/terms' },
    { slug: 'privacy', label: 'Privacy Policy', route: '/privacy' },
    { slug: 'guidelines', label: 'Community Guidelines', route: '/guidelines' },
];

/**
 * Legal-document editor (T-0240): Terms, Privacy and Community Guidelines.
 *
 * ## Preview fidelity is the whole point
 * The preview renders through the SAME injected {@link MarkdownService} the
 * public `/terms`, `/privacy` and `/guidelines` pages use — not a second
 * renderer, not a "close enough" one. A divergence between what an author
 * previews and what visitors read is precisely the failure this requirement
 * exists to prevent, and sharing the instance is the only way to make that
 * structurally impossible.
 *
 * Its output is bound with plain `[innerHTML]` so Angular's sanitiser runs as an
 * independent second layer. Do not reach for `bypassSecurityTrustHtml`.
 *
 * ## Clearing a document
 * Saving a BLANK body is allowed, not blocked, and is the documented way to
 * revert to the shipped copy: the backend projects a blank body back as
 * `body: null`, which every reader renders as its own fallback. Blocking it
 * would leave an author who pasted something wrong with no way back to a known
 * good, legally-adequate policy. Because it is destructive it goes through an
 * explicit confirm and the button relabels itself.
 */
@Component({
    selector: 'hf-legal-editor',
    templateUrl: './legal-editor.component.html',
    styleUrls: ['./legal-editor.component.scss'],
    standalone: false,
})
export class LegalEditorComponent implements OnInit, HasUnsavedChanges {
    private readonly destroyRef = inject(DestroyRef);
    private readonly settingsService = inject(SettingsService);
    private readonly auth = inject(AuthService);
    private readonly markdown = inject(MarkdownService);

    readonly tabs = DOCUMENT_TABS;
    readonly maxLength = DOCUMENT_MAX_LENGTH;

    activeSlug: RegimentDocumentSlug = 'terms';
    /** Loaded documents by slug; empty until the fetch lands. */
    documents: Partial<Record<RegimentDocumentSlug, ApiAdminRegimentDocument>> = {};
    /** The editable body per slug (`''` = "cleared / never edited"). */
    drafts: Partial<Record<RegimentDocumentSlug, string>> = {};
    /** Serialised loaded bodies, for the dirty check. */
    private baseline: Partial<Record<RegimentDocumentSlug, string>> = {};

    showPreview = true;
    loadError = '';
    saving = false;
    flash = '';

    /** Owner + Admin only — see RegimentPresentationComponent for the gap this closes. */
    get canEdit(): boolean {
        return this.auth.hasCapability('manage_regiment_details');
    }

    ngOnInit(): void {
        if (!this.canEdit) {
            return;
        }
        this.settingsService
            .getDocuments()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (documents) => {
                    for (const doc of documents) {
                        this.documents[doc.slug] = doc;
                        this.drafts[doc.slug] = doc.body ?? '';
                        this.baseline[doc.slug] = doc.body ?? '';
                    }
                },
                error: (err) => {
                    console.error('Failed to load legal documents', err);
                    this.loadError = 'Could not load the legal documents — reload to retry.';
                },
            });
    }

    // ── Dirty tracking ───────────────────────────────────────────────────────
    hasUnsavedChanges(): boolean {
        return this.tabs.some(
            ({ slug }) => (this.drafts[slug] ?? '') !== (this.baseline[slug] ?? ''),
        );
    }

    /**
     * The in-app CanDeactivate guard cannot see a tab close or a reload, so the
     * native prompt covers that half. Modern browsers ignore the message string
     * and show their own — `preventDefault` is what actually arms the dialog.
     */
    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent): void {
        if (this.hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    /** True when the currently open tab differs from what was loaded. */
    get activeDirty(): boolean {
        return (this.drafts[this.activeSlug] ?? '') !== (this.baseline[this.activeSlug] ?? '');
    }

    // ── Editing ──────────────────────────────────────────────────────────────
    get body(): string {
        return this.drafts[this.activeSlug] ?? '';
    }

    set body(value: string) {
        this.drafts[this.activeSlug] = value;
        this.flash = '';
    }

    get activeTab(): { slug: RegimentDocumentSlug; label: string; route: string } {
        return this.tabs.find((tab) => tab.slug === this.activeSlug) ?? this.tabs[0];
    }

    get activeDocument(): ApiAdminRegimentDocument | undefined {
        return this.documents[this.activeSlug];
    }

    /** Rendered preview HTML — the identical pipeline the public page runs. */
    get previewHtml(): string {
        return this.markdown.render(this.body);
    }

    /** True when saving now would clear the document back to the shipped copy. */
    get clearsDocument(): boolean {
        return !this.body.trim();
    }

    /** Tab switching is free — every draft is held, so nothing is lost. */
    selectTab(slug: RegimentDocumentSlug): void {
        this.activeSlug = slug;
        this.flash = '';
    }

    revert(): void {
        this.drafts[this.activeSlug] = this.baseline[this.activeSlug] ?? '';
        this.flash = '';
    }

    save(): void {
        if (!this.canEdit || this.saving) {
            return;
        }
        const slug = this.activeSlug;
        const body = this.body;
        // Destructive and irreversible from the UI's point of view — the previous
        // text is gone once this lands, so make the author say it out loud.
        if (
            this.clearsDocument &&
            !confirm(
                `Clear the ${this.activeTab.label} document? The page will fall back to the ` +
                    'copy that ships with the site.',
            )
        ) {
            return;
        }
        this.saving = true;
        this.flash = '';
        this.settingsService
            .updateDocument(slug, body)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (doc) => {
                    this.documents[slug] = doc;
                    // Re-baseline from the SERVER's projection, not from what was
                    // typed: a blank save comes back as null, and baselining the
                    // typed value would leave the editor permanently "dirty".
                    this.drafts[slug] = doc.body ?? '';
                    this.baseline[slug] = doc.body ?? '';
                    this.saving = false;
                    this.flash = doc.body
                        ? `${this.tabLabel(slug)} saved.`
                        : `${this.tabLabel(slug)} cleared — the shipped copy is live again.`;
                },
                error: (err) => {
                    console.error('Failed to save legal document', err);
                    this.saving = false;
                    this.flash = 'Could not save — try again.';
                },
            });
    }

    private tabLabel(slug: RegimentDocumentSlug): string {
        return this.tabs.find((tab) => tab.slug === slug)?.label ?? slug;
    }
}
