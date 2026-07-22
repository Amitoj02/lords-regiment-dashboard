import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { RegimentPresentation } from '../../../../core/models/api.model';
import { AuthService } from '../../../../core/services/auth.service';
import {
    SettingsService,
    UpdatePresentationPayload,
} from '../../../../core/services/settings.service';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../../core/services/storage.service';
import { LANDING_DEFAULTS } from '../../../public/landing/landing.defaults';
import { RegimentPresentationComponent } from './regiment-presentation.component';

const EMPTY_PRESENTATION: RegimentPresentation = {
    heroBannerUrl: null,
    loginBannerUrl: null,
    charterQuote: null,
    charterQuoteAttribution: null,
    loginQuote: null,
    loginQuoteAttribution: null,
    heroOverlayDensity: null,
    loginOverlayDensity: null,
};

/** A File of an arbitrary byte length, for the client-side size pre-flight. */
function fileOfMb(mb: number, type = 'image/png'): File {
    return new File([new Uint8Array(Math.round(mb * 1024 * 1024))], 'banner.png', { type });
}

function changeEvent(file: File | null): Event {
    const input = document.createElement('input');
    input.type = 'file';
    const transfer = new DataTransfer();
    if (file) {
        transfer.items.add(file);
    }
    input.files = transfer.files;
    return { target: input } as unknown as Event;
}

describe('RegimentPresentationComponent (T-0238/T-0239)', () => {
    let fixture: ComponentFixture<RegimentPresentationComponent>;
    let component: RegimentPresentationComponent;
    let capabilities: string[];
    let presentation$: Observable<RegimentPresentation>;
    let getPresentation: jasmine.Spy;
    let updatePresentation: jasmine.Spy;
    let upload: jasmine.Spy;

    async function build(): Promise<void> {
        getPresentation = jasmine.createSpy('getPresentation').and.callFake(() => presentation$);
        updatePresentation = jasmine
            .createSpy('updatePresentation')
            .and.callFake(() => of(EMPTY_PRESENTATION));
        upload = jasmine.createSpy('upload').and.returnValue(of('regiment/hero/abc.png'));

        await TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [RegimentPresentationComponent],
            providers: [
                {
                    provide: AuthService,
                    useValue: { hasCapability: (c: string) => capabilities.includes(c) },
                },
                {
                    provide: SettingsService,
                    useValue: { getPresentation, updatePresentation },
                },
                {
                    provide: StorageService,
                    useValue: { getPolicy: () => of(DEFAULT_STORAGE_POLICY), upload },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
        fixture = TestBed.createComponent(RegimentPresentationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
        capabilities = ['manage_regiment_details'];
        presentation$ = of(EMPTY_PRESENTATION);
    });

    /**
     * The real gating gap: adminGuard admits Moderators to /app/admin/settings,
     * but the API grants manage_regiment_details to Owner + Admin only.
     */
    describe('without manage_regiment_details', () => {
        beforeEach(async () => {
            capabilities = ['manage_settings'];
            await build();
        });

        it('never asks the API for settings it cannot have', () => {
            expect(getPresentation).not.toHaveBeenCalled();
        });

        it('offers no controls to a Moderator who would 403 on save', () => {
            expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
            expect(fixture.nativeElement.querySelector('input[type=file]')).toBeNull();
        });

        it('refuses to submit even if save() is reached some other way', () => {
            component.save();
            expect(updatePresentation).not.toHaveBeenCalled();
        });
    });

    describe('with the capability', () => {
        beforeEach(() => build());

        it('starts clean, so leaving immediately never prompts', () => {
            expect(component.hasUnsavedChanges()).toBeFalse();
        });

        it('renders a preview, an upload, a quote and a slider for BOTH surfaces', () => {
            const el = fixture.nativeElement;
            expect(el.querySelectorAll('.pres-preview').length).toBe(2);
            expect(el.querySelectorAll('input[type=file]').length).toBe(2);
            expect(el.querySelectorAll('textarea').length).toBe(2);
            expect(el.querySelectorAll('input[type=range]').length).toBe(2);
        });

        it('drives the preview scrim from the slider, live', () => {
            const scrim = () =>
                (fixture.nativeElement.querySelector('.pres-preview-scrim') as HTMLElement).style
                    .opacity;
            fixture.detectChanges();
            expect(scrim()).toBe(String(LANDING_DEFAULTS.heroOverlayDensity / 100));
            component.setDensity('hero', 30);
            fixture.detectChanges();
            expect(scrim()).toBe('0.3');
        });

        it('shows the shipped copy as the preview for an unset surface', () => {
            expect(component.effectiveQuote('hero')).toBe(LANDING_DEFAULTS.charterQuote);
            expect(component.effectiveAttribution('hero')).toBe(
                LANDING_DEFAULTS.charterQuoteAttribution,
            );
            expect(component.bannerUrl('hero')).toBe(LANDING_DEFAULTS.heroBannerUrl);
        });

        it('previews a custom quote with no attribution as having none at all', () => {
            component.setQuote('hero', 'Hold the line.');
            expect(component.effectiveQuote('hero')).toBe('Hold the line.');
            // Must NOT borrow the shipped charter's author.
            expect(component.effectiveAttribution('hero')).toBe('');
        });

        it('parks the slider on the shipped density while the field is unset', () => {
            expect(component.density('hero')).toBeNull();
            expect(component.sliderValue('hero')).toBe(LANDING_DEFAULTS.heroOverlayDensity);
        });

        it('keeps 0 as a real density rather than collapsing it to unset', () => {
            component.setDensity('hero', 0);
            expect(component.density('hero')).toBe(0);
            expect(component.scrim('hero')).toBe(0);
            expect(component.hasUnsavedChanges()).toBeTrue();
        });

        it('resets a density back to null on demand', () => {
            component.setDensity('login', 10);
            component.setDensity('login', null);
            expect(component.density('login')).toBeNull();
        });

        // ── The PATCH body ───────────────────────────────────────────────────
        function payload(): UpdatePresentationPayload {
            return updatePresentation.calls.mostRecent().args[0];
        }

        it('sends blank quotes as null so they revert to the shipped copy', () => {
            component.setQuote('hero', '   ');
            component.setAttribution('hero', '');
            component.save();
            expect(payload().charterQuote).toBeNull();
            expect(payload().charterQuoteAttribution).toBeNull();
        });

        it('sends a 0 density as 0, not as null', () => {
            component.setDensity('hero', 0);
            component.save();
            expect(payload().heroOverlayDensity).toBe(0);
        });

        it('omits the banner keys entirely when no banner was touched', () => {
            component.save();
            expect('heroBannerKey' in payload()).toBeFalse();
            expect('loginBannerKey' in payload()).toBeFalse();
        });

        it('never sends a read-side URL field the API would reject', () => {
            // The API is forbidNonWhitelisted: heroBannerUrl is a 400, not a no-op.
            component.save();
            expect('heroBannerUrl' in payload()).toBeFalse();
            expect('loginBannerUrl' in payload()).toBeFalse();
        });

        it('sends the uploaded storage KEY, not the object URL', () => {
            component.onBannerSelected('hero', changeEvent(fileOfMb(1)));
            expect(upload).toHaveBeenCalledWith('regiment-hero-banner', jasmine.any(File));
            component.save();
            expect(payload().heroBannerKey).toBe('regiment/hero/abc.png');
        });

        it('sends null to clear a banner', () => {
            component.removeBanner('login');
            component.save();
            expect(payload().loginBannerKey).toBeNull();
        });

        // ── Client-side pre-flight ───────────────────────────────────────────
        it('rejects an oversized file before uploading, quoting the policy limit', () => {
            const limit = StorageService.targetPolicy(
                DEFAULT_STORAGE_POLICY,
                'regiment-hero-banner',
            ).maxImageMb;
            component.onBannerSelected('hero', changeEvent(fileOfMb(limit + 4)));
            expect(upload).not.toHaveBeenCalled();
            // The number shown has to be the number the API enforces.
            expect(component.uploadError.hero).toContain(`${limit} MB`);
        });

        it('rejects a file type outside the target policy', () => {
            component.onBannerSelected('login', changeEvent(fileOfMb(1, 'image/gif')));
            expect(upload).not.toHaveBeenCalled();
            expect(component.uploadError.login).toContain('not accepted');
        });

        it('accepts a file inside the limit', () => {
            component.onBannerSelected('hero', changeEvent(fileOfMb(1)));
            expect(component.uploadError.hero).toBe('');
            expect(upload).toHaveBeenCalled();
        });

        it('prints a hint carrying the same cap it enforces', () => {
            const limit = StorageService.targetPolicy(
                DEFAULT_STORAGE_POLICY,
                'regiment-hero-banner',
            ).maxImageMb;
            expect(component.hint('hero')).toContain(`max ${limit} MB`);
        });
    });
});
