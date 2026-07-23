import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentPresentation } from '../../../../core/models/api.model';
import { AuthService } from '../../../../core/services/auth.service';
import {
    OVERLAY_DENSITY_MAX,
    QUOTE_ATTRIBUTION_MAX_LENGTH,
    QUOTE_MAX_LENGTH,
    SettingsService,
    UpdatePresentationPayload,
} from '../../../../core/services/settings.service';
import {
    DEFAULT_STORAGE_POLICY,
    StorageService,
    StorageTarget,
} from '../../../../core/services/storage.service';
import { LANDING_DEFAULTS } from '../../../public/landing/landing.defaults';
import { LOGIN_DEFAULTS } from '../../../public/login/login.defaults';
import { HasUnsavedChanges } from '../unsaved-changes.guard';

/** The two surfaces this editor configures. */
export type PresentationSurface = 'hero' | 'login';

/**
 * The editable working copy. Quotes are held as `''` rather than null because
 * that is what a bound `<textarea>` produces; `toPayload()` maps blank back to
 * null so a cleared field really does reset to the shipped copy.
 */
interface PresentationDraft {
    heroBannerUrl: string | null;
    loginBannerUrl: string | null;
    charterQuote: string;
    charterQuoteAttribution: string;
    loginQuote: string;
    loginQuoteAttribution: string;
    heroOverlayDensity: number | null;
    loginOverlayDensity: number | null;
}

/**
 * Landing + sign-in presentation editor (T-0238 / T-0239).
 *
 * Extracted as its own component rather than appended to `SettingsComponent`,
 * which was already 466 lines of TypeScript against a 603-line template. It owns
 * one API pair (`GET`/`PATCH /settings/presentation`) and one capability.
 *
 * ## The capability gap this component has to close
 * `/app/admin/*` is behind `adminGuard` = Owner | Admin | Moderator, but the API
 * grants `manage_regiment_details` to Owner + Admin only. A Moderator therefore
 * REACHES this page and would 403 on save. So the controls are disabled and the
 * initial GET is not even attempted without the capability — the same shape the
 * rest of the settings page uses for `manage_settings`.
 *
 * ## `null` is not `0`
 * Every field is nullable and null means "render the shipped default", but `0`
 * is a meaningful overlay density (a fully transparent scrim). Every branch here
 * is `== null`, never truthiness.
 */
@Component({
    selector: 'hf-regiment-presentation',
    templateUrl: './regiment-presentation.component.html',
    styleUrls: ['./regiment-presentation.component.scss'],
    standalone: false,
})
export class RegimentPresentationComponent implements OnInit, HasUnsavedChanges {
    private readonly destroyRef = inject(DestroyRef);
    private readonly settingsService = inject(SettingsService);
    private readonly storage = inject(StorageService);
    private readonly auth = inject(AuthService);

    /** Caps mirrored from the backend DTO, surfaced to the template. */
    readonly quoteMaxLength = QUOTE_MAX_LENGTH;
    readonly attributionMaxLength = QUOTE_ATTRIBUTION_MAX_LENGTH;
    readonly densityMax = OVERLAY_DENSITY_MAX;

    /** Shipped copy — placeholder text, preview fallback and "reset" target. */
    readonly landingDefaults = LANDING_DEFAULTS;
    readonly loginDefaults = LOGIN_DEFAULTS;

    draft: PresentationDraft | null = null;
    loadError = '';
    saving = false;
    flash = '';

    /**
     * Accepted-types + max-size hints, seeded from the static policy then
     * refreshed from GET /storage/policy so the numbers we print and the numbers
     * we enforce are the ones the API actually enforces (T-0187).
     */
    heroHint = StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'regiment-hero-banner');
    loginHint = StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'regiment-login-banner');

    /** Per-surface upload state. */
    uploading: Record<PresentationSurface, boolean> = { hero: false, login: false };
    uploadError: Record<PresentationSurface, string> = { hero: '', login: '' };

    /** Storage keys of freshly uploaded banners; null = "clear this banner". */
    private pendingKey: Record<PresentationSurface, string | null | undefined> = {
        hero: undefined,
        login: undefined,
    };

    /** Serialised snapshot of the loaded state, for the dirty check. */
    private baseline = '';

    /** Live effective policy caps, used for the client-side pre-flight reject. */
    private maxMb: Record<PresentationSurface, number> = {
        hero: StorageService.targetPolicy(DEFAULT_STORAGE_POLICY, 'regiment-hero-banner')
            .maxImageMb,
        login: StorageService.targetPolicy(DEFAULT_STORAGE_POLICY, 'regiment-login-banner')
            .maxImageMb,
    };
    private acceptedTypes: Record<PresentationSurface, string[]> = {
        hero: StorageService.targetPolicy(DEFAULT_STORAGE_POLICY, 'regiment-hero-banner')
            .acceptedMimeTypes,
        login: StorageService.targetPolicy(DEFAULT_STORAGE_POLICY, 'regiment-login-banner')
            .acceptedMimeTypes,
    };

    /**
     * The two surfaces, described once. The template loops over these rather than
     * repeating a 60-line panel twice — the failure mode of the duplicated version
     * is a fix landing on the hero and not the sign-in page.
     */
    readonly surfaces: { key: PresentationSurface; title: string; blurb: string }[] = [
        {
            key: 'hero',
            title: 'Landing hero',
            blurb: 'The full-bleed banner at the top of the public home page.',
        },
        {
            key: 'login',
            title: 'Sign-in page',
            blurb: 'The branding panel beside the Discord sign-in button.',
        },
    ];

    /** Whoever may edit the public copy. Owner + Admin, never Moderator. */
    get canEdit(): boolean {
        return this.auth.hasCapability('manage_regiment_details');
    }

    // ── Quote + attribution, addressed by surface ────────────────────────────
    quote(surface: PresentationSurface): string {
        return (surface === 'hero' ? this.draft?.charterQuote : this.draft?.loginQuote) ?? '';
    }

    setQuote(surface: PresentationSurface, value: string): void {
        if (!this.draft) return;
        if (surface === 'hero') {
            this.draft.charterQuote = value;
        } else {
            this.draft.loginQuote = value;
        }
    }

    attribution(surface: PresentationSurface): string {
        return (
            (surface === 'hero'
                ? this.draft?.charterQuoteAttribution
                : this.draft?.loginQuoteAttribution) ?? ''
        );
    }

    setAttribution(surface: PresentationSurface, value: string): void {
        if (!this.draft) return;
        if (surface === 'hero') {
            this.draft.charterQuoteAttribution = value;
        } else {
            this.draft.loginQuoteAttribution = value;
        }
    }

    /** The copy the public page will actually print — draft value, else shipped. */
    effectiveQuote(surface: PresentationSurface): string {
        return (
            this.quote(surface).trim() ||
            (surface === 'hero' ? LANDING_DEFAULTS.charterQuote : LOGIN_DEFAULTS.loginQuote)
        );
    }

    /**
     * The attribution the public page will print — and it must agree with what
     * the public pages do, so the rule lives here in one sentence:
     *
     * an attribution belongs to ITS quote. Once the quote is custom, a blank
     * attribution means "no attribution", and the line is dropped rather than
     * printing a bare "—" or borrowing the shipped charter's author. Only a
     * wholly unconfigured surface (no quote either) falls back to the shipped
     * pair, because blank and unset are the same null over the wire.
     */
    effectiveAttribution(surface: PresentationSurface): string {
        const attribution = this.attribution(surface).trim();
        if (attribution) {
            return attribution;
        }
        return this.quote(surface).trim() ? '' : this.defaultAttribution(surface);
    }

    defaultQuote(surface: PresentationSurface): string {
        return surface === 'hero' ? LANDING_DEFAULTS.charterQuote : LOGIN_DEFAULTS.loginQuote;
    }

    defaultAttribution(surface: PresentationSurface): string {
        return surface === 'hero'
            ? LANDING_DEFAULTS.charterQuoteAttribution
            : LOGIN_DEFAULTS.loginQuoteAttribution;
    }

    ngOnInit(): void {
        // A Moderator would 403 here, and a console full of 403s trains people to
        // ignore real errors — so do not ask for what we know we cannot have.
        if (this.canEdit) {
            this.settingsService
                .getPresentation()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (presentation) => this.load(presentation),
                    error: (err) => {
                        console.error('Failed to load presentation settings', err);
                        this.loadError =
                            'Could not load the presentation settings — reload to retry.';
                    },
                });
        }

        this.storage
            .getPolicy()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((policy) => {
                this.heroHint = StorageService.uploadHint(policy, 'regiment-hero-banner');
                this.loginHint = StorageService.uploadHint(policy, 'regiment-login-banner');
                const hero = StorageService.targetPolicy(policy, 'regiment-hero-banner');
                const login = StorageService.targetPolicy(policy, 'regiment-login-banner');
                this.maxMb = { hero: hero.maxImageMb, login: login.maxImageMb };
                this.acceptedTypes = {
                    hero: hero.acceptedMimeTypes,
                    login: login.acceptedMimeTypes,
                };
            });
    }

    private load(presentation: RegimentPresentation): void {
        this.draft = {
            heroBannerUrl: presentation.heroBannerUrl,
            loginBannerUrl: presentation.loginBannerUrl,
            charterQuote: presentation.charterQuote ?? '',
            charterQuoteAttribution: presentation.charterQuoteAttribution ?? '',
            loginQuote: presentation.loginQuote ?? '',
            loginQuoteAttribution: presentation.loginQuoteAttribution ?? '',
            heroOverlayDensity: presentation.heroOverlayDensity,
            loginOverlayDensity: presentation.loginOverlayDensity,
        };
        this.pendingKey = { hero: undefined, login: undefined };
        this.baseline = JSON.stringify(this.draft);
    }

    hasUnsavedChanges(): boolean {
        if (!this.draft) {
            return false;
        }
        return (
            JSON.stringify(this.draft) !== this.baseline ||
            this.pendingKey.hero !== undefined ||
            this.pendingKey.login !== undefined
        );
    }

    // ── Overlay density ──────────────────────────────────────────────────────
    /**
     * The value the slider sits at. An UNSET density still needs a position, so
     * it borrows the shipped default — which is exactly the density that
     * reproduces the shipped look, so the handle never lies about the result.
     */
    sliderValue(surface: PresentationSurface): number {
        const density = this.density(surface);
        return density == null ? this.defaultDensity(surface) : density;
    }

    density(surface: PresentationSurface): number | null {
        return surface === 'hero'
            ? (this.draft?.heroOverlayDensity ?? null)
            : (this.draft?.loginOverlayDensity ?? null);
    }

    /**
     * "No density configured". A predicate rather than an inline `== null`
     * because `0` is a real density and the template lint forbids the loose
     * comparison that would otherwise be needed to keep it distinct from null.
     */
    densityUnset(surface: PresentationSurface): boolean {
        return this.density(surface) === null;
    }

    defaultDensity(surface: PresentationSurface): number {
        return surface === 'hero'
            ? LANDING_DEFAULTS.heroOverlayDensity
            : LOGIN_DEFAULTS.loginOverlayDensity;
    }

    setDensity(surface: PresentationSurface, value: number | null): void {
        if (!this.draft) {
            return;
        }
        // `type=range` hands back a number via RangeValueAccessor, but a template
        // can also pass a string; normalise rather than persisting '65'.
        const density = value == null ? null : Math.round(Number(value));
        if (surface === 'hero') {
            this.draft.heroOverlayDensity = density;
        } else {
            this.draft.loginOverlayDensity = density;
        }
    }

    /**
     * The scrim alpha the preview renders at — `0` really is transparent, which
     * is why this branches on `== null` and not on falsiness.
     */
    scrim(surface: PresentationSurface): number {
        return this.sliderValue(surface) / 100;
    }

    // ── Banners ──────────────────────────────────────────────────────────────
    /** The image the preview shows: pending upload → saved banner → shipped default. */
    bannerUrl(surface: PresentationSurface): string {
        const pending = this.previewUrl[surface];
        if (pending) {
            return pending;
        }
        if (this.pendingKey[surface] === null) {
            // Explicitly cleared but not saved yet — preview the shipped default.
            return this.defaultBannerUrl(surface);
        }
        const saved = surface === 'hero' ? this.draft?.heroBannerUrl : this.draft?.loginBannerUrl;
        return saved || this.defaultBannerUrl(surface);
    }

    defaultBannerUrl(surface: PresentationSurface): string {
        return surface === 'hero' ? LANDING_DEFAULTS.heroBannerUrl : LOGIN_DEFAULTS.loginBannerUrl;
    }

    /** True when a custom banner is in force (saved or pending), so we can offer "Remove". */
    hasCustomBanner(surface: PresentationSurface): boolean {
        if (this.pendingKey[surface] === null) {
            return false;
        }
        if (this.pendingKey[surface]) {
            return true;
        }
        return !!(surface === 'hero' ? this.draft?.heroBannerUrl : this.draft?.loginBannerUrl);
    }

    /** Object-URL previews of a just-picked file, shown before the save lands. */
    previewUrl: Record<PresentationSurface, string | null> = { hero: null, login: null };

    hint(surface: PresentationSurface): string {
        return surface === 'hero' ? this.heroHint : this.loginHint;
    }

    onBannerSelected(surface: PresentationSurface, event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        this.uploadError[surface] = '';

        // Pre-flight against the LIVE policy, not a hard-coded number: a 40 MB
        // photograph should be refused here rather than after a long upload that
        // the API rejects anyway.
        const limitMb = this.maxMb[surface];
        const accepted = this.acceptedTypes[surface];
        if (accepted.length && !accepted.includes(file.type)) {
            this.uploadError[surface] =
                `That file type is not accepted — use ${this.hint(surface)}.`;
            input.value = '';
            return;
        }
        if (file.size > limitMb * 1024 * 1024) {
            const actual = (file.size / (1024 * 1024)).toFixed(1);
            this.uploadError[surface] =
                `That image is ${actual} MB — the limit is ${limitMb} MB. Pick a smaller file.`;
            input.value = '';
            return;
        }

        this.previewUrl[surface] = URL.createObjectURL(file);
        this.uploading[surface] = true;
        this.storage
            .upload(this.target(surface), file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (key) => {
                    this.pendingKey[surface] = key;
                    this.uploading[surface] = false;
                },
                error: (err) => {
                    this.uploading[surface] = false;
                    this.previewUrl[surface] = null;
                    this.uploadError[surface] = StorageService.uploadErrorMessage(
                        err,
                        'Banner upload failed. Please try again.',
                    );
                },
            });
        input.value = '';
    }

    /** Queue a clear; the banner really goes on save (the API takes `null`). */
    removeBanner(surface: PresentationSurface): void {
        this.pendingKey[surface] = null;
        this.previewUrl[surface] = null;
        this.uploadError[surface] = '';
    }

    private target(surface: PresentationSurface): StorageTarget {
        return surface === 'hero' ? 'regiment-hero-banner' : 'regiment-login-banner';
    }

    // ── Save ─────────────────────────────────────────────────────────────────
    get canSave(): boolean {
        return !!this.draft && !this.saving && !this.uploading.hero && !this.uploading.login;
    }

    /**
     * Build the PATCH body. The API runs `forbidNonWhitelisted`, so this may only
     * ever contain keys the DTO declares — notably `heroBannerKey`, never
     * `heroBannerUrl`, which is a read-side field.
     */
    private toPayload(draft: PresentationDraft): UpdatePresentationPayload {
        const payload: UpdatePresentationPayload = {
            charterQuote: draft.charterQuote.trim() || null,
            charterQuoteAttribution: draft.charterQuoteAttribution.trim() || null,
            loginQuote: draft.loginQuote.trim() || null,
            loginQuoteAttribution: draft.loginQuoteAttribution.trim() || null,
            heroOverlayDensity: draft.heroOverlayDensity,
            loginOverlayDensity: draft.loginOverlayDensity,
        };
        // undefined = untouched, so the key is omitted entirely; null = clear.
        if (this.pendingKey.hero !== undefined) {
            payload.heroBannerKey = this.pendingKey.hero;
        }
        if (this.pendingKey.login !== undefined) {
            payload.loginBannerKey = this.pendingKey.login;
        }
        return payload;
    }

    save(): void {
        if (!this.draft || !this.canSave || !this.canEdit) {
            return;
        }
        this.saving = true;
        this.flash = '';
        this.settingsService
            .updatePresentation(this.toPayload(this.draft))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (presentation) => {
                    this.previewUrl = { hero: null, login: null };
                    this.load(presentation);
                    this.saving = false;
                    this.flash = 'Presentation saved.';
                },
                error: (err) => {
                    console.error('Failed to save presentation', err);
                    this.saving = false;
                    this.flash = StorageService.uploadErrorMessage(
                        err,
                        'Could not save — try again.',
                    );
                },
            });
    }
}
