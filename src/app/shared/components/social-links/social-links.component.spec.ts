import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { SocialLinksComponent } from './social-links.component';
import { MemberSocialLink } from '../../../core/models/social-link.model';

function link(overrides: Partial<MemberSocialLink> = {}): MemberSocialLink {
    return {
        platform: 'twitch',
        label: 'Twitch',
        handle: 'jamesonnolt',
        url: 'https://www.twitch.tv/jamesonnolt',
        ...overrides,
    };
}

describe('SocialLinksComponent (T-0289)', () => {
    let fixture: ComponentFixture<SocialLinksComponent>;
    let el: HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [SocialLinksComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(SocialLinksComponent);
        el = fixture.nativeElement as HTMLElement;
    });

    function render(links: MemberSocialLink[] = [], discordTag: string | null = null): void {
        fixture.componentInstance.links = links;
        fixture.componentInstance.discordTag = discordTag;
        fixture.detectChanges();
    }

    function chips(): HTMLElement[] {
        return Array.from(el.querySelectorAll('.social-chip'));
    }

    it('renders one chip per link, in the order the API sent them', () => {
        // The API sorts by precedence; this component adds no sort of its own, so
        // a client-side sort creeping in later fails here.
        render([
            link({ platform: 'medal', label: 'Medal.tv', handle: 'panda' }),
            link({ platform: 'twitch' }),
        ]);
        expect(chips().length).toBe(2);
        expect(chips()[0].classList).toContain('social-chip--medal');
        expect(chips()[1].classList).toContain('social-chip--twitch');
    });

    it('sends every outbound link through a new tab, safely and unendorsed', () => {
        // `noopener noreferrer` stops the opened tab reaching back through
        // window.opener; `nofollow ugc` is what stops a public profile becoming
        // a link farm worth spamming.
        render([link()]);
        const anchor = el.querySelector('a.social-chip') as HTMLAnchorElement;
        expect(anchor.getAttribute('href')).toBe('https://www.twitch.tv/jamesonnolt');
        expect(anchor.getAttribute('target')).toBe('_blank');
        expect(anchor.getAttribute('rel')).toBe('noopener noreferrer nofollow ugc');
    });

    it('uses the URL the SERVER built, never one assembled here', () => {
        // The whole handles-not-URLs decision rests on this: if the client ever
        // starts composing the href, a handle that slipped past validation gets
        // a second chance to become an arbitrary destination.
        render([link({ url: 'https://www.twitch.tv/someone_else' })]);
        expect((el.querySelector('a.social-chip') as HTMLAnchorElement).getAttribute('href')).toBe(
            'https://www.twitch.tv/someone_else',
        );
    });

    it('shows the handle beside the mark', () => {
        render([link()]);
        expect(el.querySelector('.social-chip-handle')!.textContent!.trim()).toBe('jamesonnolt');
    });

    it('drops the handles when asked for marks only', () => {
        fixture.componentInstance.showHandles = false;
        render([link()]);
        expect(el.querySelector('.social-chip-handle')).toBeNull();
        expect(el.querySelector('.social-chip-mark')).not.toBeNull();
    });

    it('renders the Discord chip as a span — a tag is a name, not an address', () => {
        render([], 'nolt#0001');
        const chip = el.querySelector('.social-chip--discord') as HTMLElement;
        expect(chip.tagName).toBe('SPAN');
        expect(chip.getAttribute('href')).toBeNull();
        expect(chip.textContent).toContain('nolt#0001');
    });

    it('draws no Discord chip when the viewer was given no tag', () => {
        // The gate lives in the PARENT, on a field an anonymous reader never
        // receives. This component does no gating of its own and must not
        // invent a chip from nothing.
        render([link()]);
        expect(el.querySelector('.social-chip--discord')).toBeNull();
    });

    it('puts Discord last, after the public links', () => {
        render([link()], 'nolt#0001');
        expect(chips().length).toBe(2);
        expect(chips()[1].classList).toContain('social-chip--discord');
    });

    it('renders nothing at all when there is nothing to show', () => {
        render();
        expect(chips().length).toBe(0);
        expect(fixture.componentInstance.hasAny).toBeFalse();
    });

    it('titles each chip so the platform is readable without the brand mark', () => {
        // The mark alone is the only label in marks-only mode, and a brand glyph
        // is not a name to anyone using a screen reader.
        render([link()], 'nolt#0001');
        expect(chips()[0].getAttribute('title')).toBe('Twitch · jamesonnolt');
        expect(chips()[1].getAttribute('title')).toBe('Discord · nolt#0001');
    });

    it('hides the decorative marks from assistive technology', () => {
        render([link()]);
        expect(el.querySelector('.social-chip-mark')!.getAttribute('aria-hidden')).toBe('true');
    });
});
