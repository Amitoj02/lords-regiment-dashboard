import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { RegimentProfile } from '../../../core/models/api.model';
import { ApplicantApplication, MyApplication } from '../../../core/models/application.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { ApplicationFormComponent } from './application-form.component';

/**
 * The "Joining as" gate (T-0229). The Mercenary track can be closed
 * regiment-wide; the API then rejects a Mercenary application with 403, so the
 * form must stop OFFERING the card. The gate reads `allowMercenaries` off the
 * PUBLIC profile (GET /regiment) — an Applicant cannot read GET /settings.
 */

function profile(overrides: Partial<RegimentProfile> = {}): RegimentProfile {
    return {
        id: 'r1',
        name: 'Lord Regiment',
        missionStatement: null,
        accentTone: 'brass',
        crestUrl: null,
        bannerUrl: null,
        establishedYear: 2019,
        establishedAt: null,
        discordInviteUrl: null,
        discordServerName: null,
        setupComplete: true,
        memberCount: 42,
        ...overrides,
    };
}

/**
 * Builds the APPLICANT projection, which is what every self-service route
 * actually returns (lords-dashboard-backend:T-0154). Building a staff
 * `Application` here would let a staff-only field into a test fixture and
 * quietly assert a shape the applicant can never receive.
 */
function application(overrides: Partial<ApplicantApplication> = {}): ApplicantApplication {
    return {
        id: 'a1',
        applicantName: 'Test User',
        discordTag: 'recruit#0000',
        inGameName: 'Rhett_Asher',
        applicantType: 'Member',
        currentRegiment: 'None',
        howFound: 'Discord',
        preferredClasses: 'Line Infantry',
        skillsToImprove: 'Melee',
        interestConfirmed: true,
        submittedAt: '2026-07-01T12:00:00.000Z',
        status: 'pending',
        userMessage: null,
        ...overrides,
    };
}

class MockAuthService {
    readonly currentUser = signal<CurrentUser | null>(null);
}

// Shared across both describes below — the age-confirmation specs need the same
// fully-mocked form as the applicant-type ones.
let fixture: ComponentFixture<ApplicationFormComponent>;
let component: ApplicationFormComponent;

/**
 * Defaults to a blank form for someone who has never applied. `edit` flips
 * the ?edit=1 query param on, which pre-fills from `mine`.
 */
function setup(
    options: {
        profile$?: Observable<RegimentProfile>;
        mine?: MyApplication;
        edit?: boolean;
    } = {},
): void {
    const mine: MyApplication = options.mine ?? { application: null, blocked: false };
    const applications = {
        getMine: () => of(mine),
        submit: () => of(application()),
        updateMine: () => of(application()),
    };
    const regiment = { getProfile: () => options.profile$ ?? of(profile()) };
    const route = {
        snapshot: { queryParamMap: { get: () => (options.edit ? '1' : null) } },
    };

    TestBed.configureTestingModule({
        imports: [CommonModule, ReactiveFormsModule, RouterModule.forRoot([])],
        declarations: [ApplicationFormComponent],
        providers: [
            { provide: ApplicationsService, useValue: applications },
            { provide: AuthService, useValue: new MockAuthService() },
            { provide: RegimentService, useValue: regiment },
            { provide: ActivatedRoute, useValue: route },
        ],
        schemas: [NO_ERRORS_SCHEMA],
    });
    fixture = TestBed.createComponent(ApplicationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
}

describe('ApplicationFormComponent (applicant-type cards)', () => {
    function cardTitles(): string[] {
        const nodes: NodeListOf<HTMLElement> =
            fixture.nativeElement.querySelectorAll('.type-card-title');
        return Array.from(nodes).map((n) => (n.textContent ?? '').trim());
    }

    function applicantType(): string {
        return component.form.get('applicantType')?.value;
    }

    function text(el: HTMLElement | null): string | null {
        return el ? (el.textContent ?? '').replace(/\s+/g, ' ').trim() : null;
    }

    /** The rendered closed-track banner, or null when it is absent from the DOM. */
    function warningText(): string | null {
        return text(fixture.nativeElement.querySelector('.type-card-warning'));
    }

    /** The explanatory line under "Joining as". */
    function typeCardHint(): string | null {
        return text(fixture.nativeElement.querySelector('.type-card-hint'));
    }

    function clickCard(index: number): void {
        const cards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.type-card');
        cards[index].click();
        fixture.detectChanges();
    }

    it('offers both tracks by default', () => {
        setup();
        expect(cardTitles()).toEqual(['Member', 'Mercenary']);
    });

    it('carries the approved card copy', () => {
        setup();
        const nodes: NodeListOf<HTMLElement> =
            fixture.nativeElement.querySelectorAll('.type-card-desc');
        const copy = Array.from(nodes).map((n) =>
            (n.textContent ?? '').replace(/\s+/g, ' ').trim(),
        );
        expect(copy[0]).toBe(
            'Enlist as a regiment member. Participate in rankings and earn medals.',
        );
        expect(copy[1]).toBe(
            'Play alongside the regiment, share memorable experiences, and participate in select events.',
        );
    });

    it('hides the Mercenary card when the track is closed', () => {
        setup({ profile$: of(profile({ allowMercenaries: false })) });
        expect(cardTitles()).toEqual(['Member']);
        expect(applicantType()).toBe('Member');
    });

    it('keeps offering both cards when the profile fetch fails', () => {
        setup({ profile$: throwError(() => new Error('network')) });
        expect(component.mercenariesAllowed).toBeTrue();
        expect(cardTitles()).toEqual(['Member', 'Mercenary']);
    });

    it('keeps offering both cards when the API omits allowMercenaries', () => {
        setup({ profile$: of(profile()) });
        expect(cardTitles()).toEqual(['Member', 'Mercenary']);
    });

    it('sets applicantType when a card is clicked', () => {
        setup();
        const cards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.type-card');
        cards[1].click();
        fixture.detectChanges();
        expect(applicantType()).toBe('Mercenary');
        expect(cards[1].classList).toContain('type-card--active');

        cards[0].click();
        fixture.detectChanges();
        expect(applicantType()).toBe('Member');
    });

    it('snaps a fresh Mercenary selection back to Member if the profile lands late and closed', () => {
        // The profile response outraces nothing here — the applicant picks
        // Mercenary while GET /regiment is still in flight.
        const late = new Subject<RegimentProfile>();
        setup({ profile$: late });
        component.form.get('applicantType')?.setValue('Mercenary');

        late.next(profile({ allowMercenaries: false }));
        fixture.detectChanges();

        expect(applicantType()).toBe('Member');
        expect(cardTitles()).toEqual(['Member']);
    });

    it('preserves a pre-filled Mercenary application rather than rewriting it', () => {
        setup({
            edit: true,
            profile$: of(profile({ allowMercenaries: false })),
            mine: {
                application: application({ applicantType: 'Mercenary', status: 'pending' }),
                blocked: false,
            },
        });
        // Their stored answer survives; the card stays so the state is visible.
        expect(applicantType()).toBe('Mercenary');
        expect(cardTitles()).toEqual(['Member', 'Mercenary']);
        // The banner is the ONLY thing telling them the save would 403 — assert
        // the rendered element, not the getter behind it.
        expect(warningText()).toBe(
            'The mercenary track has closed since you applied. Switch to Member to resubmit — saving this as a mercenary application will be rejected.',
        );
    });

    it('dismisses the closed-track banner once the applicant switches to Member', () => {
        setup({
            edit: true,
            profile$: of(profile({ allowMercenaries: false })),
            mine: {
                application: application({ applicantType: 'Mercenary', status: 'pending' }),
                blocked: false,
            },
        });
        expect(warningText()).not.toBeNull();

        // Acting on the banner's own instruction must clear the banner.
        clickCard(0);
        expect(applicantType()).toBe('Member');
        expect(warningText()).toBeNull();

        // …and switching back re-arms it, so the warning tracks the live choice.
        clickCard(1);
        expect(applicantType()).toBe('Mercenary');
        expect(warningText()).not.toBeNull();
    });

    it('never shows the closed-track banner on a fresh application', () => {
        setup({ profile$: of(profile({ allowMercenaries: false })) });
        expect(warningText()).toBeNull();
    });

    it('explains the single card when the track is closed', () => {
        setup({ profile$: of(profile({ allowMercenaries: false })) });
        expect(typeCardHint()).toBe(
            'The mercenary track is closed right now, so applications are for full regiment membership.',
        );
    });

    it('explains the choice when both tracks are open', () => {
        setup();
        expect(typeCardHint()).toBe(
            'Officers review every application. Choose the track you want to be considered for.',
        );
    });

    it('does not paint the applicant-type cards until the profile has settled', () => {
        // GET /applications/mine wins the race; the cards must not paint and then
        // lose the Mercenary card when GET /regiment lands closed.
        const late = new Subject<RegimentProfile>();
        setup({ profile$: late });
        expect(cardTitles()).toEqual([]);

        late.next(profile({ allowMercenaries: false }));
        fixture.detectChanges();
        expect(cardTitles()).toEqual(['Member']);
    });

    it('renders the form even when the profile fetch fails', () => {
        // A failed gate lookup must never deadlock the form behind a spinner.
        setup({ profile$: throwError(() => new Error('network')) });
        expect(cardTitles()).toEqual(['Member', 'Mercenary']);
    });
});

/**
 * The age-confirmation gate (T-0245). Its label used to carry two `href="#"`
 * placeholders sitting INSIDE the <label>, so clicking either one both toggled
 * the checkbox and pushed `#` onto the URL. It now carries a single real link
 * to the public guidelines page, opened in a new tab so a half-filled form is
 * never navigated away from.
 */
describe('ApplicationFormComponent (age confirmation)', () => {
    // The Confirmation panel holds TWO .age-confirm-row blocks (interest + age),
    // so anchor every lookup on the ageConfirm label itself.
    function labelEl(): HTMLLabelElement {
        return fixture.nativeElement.querySelector('label[for="ageConfirm"]') as HTMLLabelElement;
    }

    function ageConfirmRow(): HTMLElement {
        return labelEl().parentElement as HTMLElement;
    }

    function labelText(): string {
        return (labelEl().textContent ?? '').replace(/\s+/g, ' ').trim();
    }

    function guidelinesLink(): HTMLAnchorElement {
        return ageConfirmRow().querySelector('a') as HTMLAnchorElement;
    }

    function ageConfirm(): boolean {
        return component.form.get('ageConfirm')?.value;
    }

    it('reads as one sentence pointing at the community guidelines', () => {
        setup();
        expect(labelText()).toBe(
            "I confirm that I am 18 years of age or older and agree to abide by the regiment's community guidelines.",
        );
    });

    it('leaves no dead href in the label', () => {
        setup();
        const hrefs = Array.from(ageConfirmRow().querySelectorAll('a')).map((a) =>
            a.getAttribute('href'),
        );
        // Exactly one link, and it resolves somewhere real.
        expect(hrefs).toEqual(['/guidelines']);
    });

    it('opens the guidelines in a new tab, safely', () => {
        setup();
        const link = guidelinesLink();
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('does not toggle the checkbox when the link is clicked', () => {
        setup();
        expect(ageConfirm()).toBeFalse();

        // target="_blank" keeps the karma page put, so this is a real click,
        // not a simulated one.
        guidelinesLink().click();
        fixture.detectChanges();
        expect(ageConfirm()).toBeFalse();

        // …and the same holds in the other direction: a confirmed applicant
        // reading the guidelines must not silently un-confirm.
        component.form.get('ageConfirm')?.setValue(true);
        guidelinesLink().click();
        fixture.detectChanges();
        expect(ageConfirm()).toBeTrue();
    });

    it('never lets the link click reach the label at all', () => {
        // The stronger form of the rule above, and the one that does not depend
        // on the browser's own "don't forward clicks from interactive content"
        // rule: the label — the element whose activation flips the box, and
        // which a future refactor could easily bind something else to — must
        // simply never see this click.
        setup();
        const seen = jasmine.createSpy('label click');
        labelEl().addEventListener('click', seen);

        guidelinesLink().click();
        expect(seen).not.toHaveBeenCalled();
    });

    it('keeps click-to-toggle working for the rest of the label', () => {
        setup();
        labelEl().click();
        fixture.detectChanges();
        expect(ageConfirm()).toBeTrue();

        labelEl().click();
        fixture.detectChanges();
        expect(ageConfirm()).toBeFalse();
    });

    it('preserves in-progress answers across the link click', () => {
        setup();
        component.form.patchValue({
            inGameName: 'Rhett_Asher',
            currentRegiment: 'None',
            skillsToImprove: 'Melee',
        });

        guidelinesLink().click();
        fixture.detectChanges();

        expect(component.form.get('inGameName')?.value).toBe('Rhett_Asher');
        expect(component.form.get('currentRegiment')?.value).toBe('None');
        expect(component.form.get('skillsToImprove')?.value).toBe('Melee');
        // Nothing submitted the form on the way past.
        expect(component.submitted).toBeFalse();
        expect(component.submitting).toBeFalse();
    });

    it('still gates submission on the confirmation', () => {
        setup();
        const control = component.form.get('ageConfirm');
        expect(control?.hasError('required')).toBeTrue();
        expect(component.form.valid).toBeFalse();

        control?.setValue(true);
        expect(control?.hasError('required')).toBeFalse();
    });
});
