import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { RegimentProfile } from '../../../core/models/api.model';
import { RegimentService } from '../../../core/services/regiment.service';
import { PublicFooterComponent } from './public-footer.component';

/**
 * The footer's "Discord Server" link is profile-driven (T-0234): it points at
 * the regiment's configured invite, and is dropped from the Join column
 * entirely when no invite exists — a footer link that goes nowhere is worse
 * than one absent link.
 */
function makeProfile(discordInviteUrl: string | null): RegimentProfile {
    return {
        id: 'r1',
        name: 'Lord Regiment',
        missionStatement: null,
        accentTone: 'brass',
        crestUrl: null,
        bannerUrl: null,
        establishedYear: 2019,
        establishedAt: null,
        discordInviteUrl,
        discordServerName: null,
        setupComplete: true,
        memberCount: 42,
    };
}

describe('PublicFooterComponent (Discord invite link)', () => {
    let fixture: ComponentFixture<PublicFooterComponent>;
    /** Read lazily by the mock, so a spec can swap it before the first CD. */
    let profile$: Observable<RegimentProfile | null>;

    beforeEach(async () => {
        profile$ = of(makeProfile('https://discord.gg/lords'));
        await TestBed.configureTestingModule({
            imports: [CommonModule, RouterModule.forRoot([])],
            declarations: [PublicFooterComponent],
            providers: [{ provide: RegimentService, useValue: { getProfile: () => profile$ } }],
        }).compileComponents();

        fixture = TestBed.createComponent(PublicFooterComponent);
    });

    function discordLink(): HTMLAnchorElement | null {
        return fixture.nativeElement.querySelector('.footer-link-discord');
    }

    /** Every href rendered in the footer, dead ones included. */
    function hrefs(): string[] {
        const nodes: NodeListOf<HTMLAnchorElement> =
            fixture.nativeElement.querySelectorAll('a.footer-link');
        return Array.from(nodes).map((a) => a.getAttribute('href') ?? '');
    }

    it('points the Discord Server link at the configured invite, in a new tab', () => {
        fixture.detectChanges();
        const link = discordLink();
        expect(link).not.toBeNull();
        expect(link!.getAttribute('href')).toBe('https://discord.gg/lords');
        expect(link!.getAttribute('target')).toBe('_blank');
        expect(link!.getAttribute('rel')).toBe('noopener noreferrer');
        expect((link!.textContent ?? '').trim()).toBe('Discord Server');
    });

    it('drops the link when no invite is configured', () => {
        profile$ = of(makeProfile(null));
        fixture.detectChanges();
        expect(discordLink()).toBeNull();
        // The invariant: no footer link is ever a placeholder anchor.
        expect(hrefs()).not.toContain('#discord');
        expect(hrefs().every((h) => h !== '' && h !== '#')).toBeTrue();
    });

    it('treats a blank invite as unconfigured', () => {
        profile$ = of(makeProfile('  '));
        fixture.detectChanges();
        expect(discordLink()).toBeNull();
    });

    it('renders the rest of the footer when the profile fetch fails', () => {
        profile$ = throwError(() => new Error('network'));
        fixture.detectChanges();
        expect(discordLink()).toBeNull();
        expect(hrefs()).toContain('/guidelines');
    });
});
