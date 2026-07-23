import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { RegimentPresentation, RegimentProfile } from '../../../core/models/api.model';
import { AuthService } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { LoginPageComponent } from './login.component';
import { LOGIN_DEFAULTS } from './login.defaults';

function makeProfile(presentation?: Partial<RegimentPresentation>): RegimentProfile {
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
        presentation: presentation
            ? {
                  heroBannerUrl: null,
                  loginBannerUrl: null,
                  charterQuote: null,
                  charterQuoteAttribution: null,
                  loginQuote: null,
                  loginQuoteAttribution: null,
                  heroOverlayDensity: null,
                  loginOverlayDensity: null,
                  ...presentation,
              }
            : undefined,
    };
}

/**
 * T-0239. This page is reached SIGNED OUT, so every one of these specs is also a
 * statement that the branding reads off the anonymous regiment profile —
 * `GET /settings/presentation` would 401 for the visitor who needs this page.
 */
describe('LoginPageComponent — presentation (T-0239)', () => {
    let fixture: ComponentFixture<LoginPageComponent>;
    let profile$: Observable<RegimentProfile | null>;

    beforeEach(async () => {
        profile$ = of(makeProfile());
        await TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [LoginPageComponent],
            providers: [
                {
                    provide: AuthService,
                    useValue: { initiateDiscordLogin: jasmine.createSpy('initiateDiscordLogin') },
                },
                { provide: RegimentService, useValue: { getProfile: () => profile$ } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(LoginPageComponent);
    });

    function panel(): HTMLElement {
        return fixture.nativeElement.querySelector('.login-left');
    }
    function quote(): string {
        return (fixture.nativeElement.querySelector('.login-quote')?.textContent ?? '').replace(
            /\s+/g,
            ' ',
        );
    }
    function attribution(): HTMLElement | null {
        return fixture.nativeElement.querySelector('.login-attribution');
    }

    it('renders the shipped panel when the profile carries no presentation', () => {
        fixture.detectChanges();
        expect(panel().style.backgroundImage).toContain(LOGIN_DEFAULTS.loginBannerUrl);
        expect(quote()).toContain(LOGIN_DEFAULTS.loginQuote);
        expect(attribution()!.textContent).toContain(LOGIN_DEFAULTS.loginQuoteAttribution);
    });

    it('still renders the shipped panel when the profile request fails', () => {
        // The Discord button is the one thing on this page that has to work; a
        // dead API must not leave a black rectangle where the branding was.
        profile$ = throwError(() => new Error('offline'));
        fixture.detectChanges();
        expect(panel().style.backgroundImage).toContain(LOGIN_DEFAULTS.loginBannerUrl);
        expect(quote()).toContain(LOGIN_DEFAULTS.loginQuote);
        expect(fixture.nativeElement.querySelector('.login-discord-btn')).not.toBeNull();
    });

    it('uses the configured banner, quote and attribution', () => {
        profile$ = of(
            makeProfile({
                loginBannerUrl: 'https://cdn.example/login.webp',
                loginQuote: "The regiment's word is its bond.",
                loginQuoteAttribution: "Sgt. O'Malley",
            }),
        );
        fixture.detectChanges();
        expect(panel().style.backgroundImage).toContain('https://cdn.example/login.webp');
        expect(quote()).toContain("The regiment's word is its bond.");
        expect(attribution()!.textContent).toContain("Sgt. O'Malley");
    });

    it('drops the attribution line for a custom quote with none set', () => {
        profile$ = of(makeProfile({ loginQuote: 'Fall in.', loginQuoteAttribution: null }));
        fixture.detectChanges();
        expect(attribution()).toBeNull();
    });

    it('treats overlay density 0 as "no scrim", not as unset', () => {
        profile$ = of(makeProfile({ loginOverlayDensity: 0 }));
        fixture.detectChanges();
        expect(panel().style.getPropertyValue('--login-scrim')).toBe('0');
    });

    it('falls back to the shipped density when it is unset', () => {
        fixture.detectChanges();
        expect(panel().style.getPropertyValue('--login-scrim')).toBe(
            String(LOGIN_DEFAULTS.loginOverlayDensity / 100),
        );
    });

    it('titles the panel with the regiment name from the profile', () => {
        profile$ = of({ ...makeProfile(), name: 'The Iron Brigade' });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.login-title').textContent).toContain(
            'The Iron Brigade',
        );
    });
});
