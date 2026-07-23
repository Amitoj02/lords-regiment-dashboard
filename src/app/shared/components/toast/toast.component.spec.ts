import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '../../../core/services/toast.service';
import { ToastComponent } from './toast.component';

/**
 * T-0270 — the toast shipped `background: var(--parch-100)` with `color:
 * var(--t-200)`: a parchment card carrying the palette's LIGHT body text, about
 * 1.1:1. Every toast the app had ever raised was invisible.
 *
 * A class-name assertion would not have caught that and would not catch it
 * coming back — both sides were valid tokens, just from opposite halves of the
 * palette. So these specs read the COMPUTED colours out of the browser and
 * measure the real WCAG ratio. Karma loads `src/styles.scss` (see angular.json),
 * so the design tokens resolve exactly as they do in the app.
 *
 * `scripts/check-contrast.mjs` is the static half of the same guard and covers
 * every other surface in the app; this is the half that proves the rendered
 * result rather than the source.
 */

/** WCAG 2.1 AA for normal-size body text. */
const AA_NORMAL = 4.5;

function parseRgb(value: string): [number, number, number] {
    const nums = value.match(/[\d.]+/g);
    if (!nums || nums.length < 3) throw new Error(`Unreadable colour: "${value}"`);
    return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
    const channel = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: string, bg: string): number {
    const [hi, lo] = [relativeLuminance(parseRgb(fg)), relativeLuminance(parseRgb(bg))].sort(
        (a, b) => b - a,
    );
    return (hi + 0.05) / (lo + 0.05);
}

describe('ToastComponent (T-0270)', () => {
    let fixture: ComponentFixture<ToastComponent>;
    let toasts: ToastService;

    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ declarations: [ToastComponent] });
        toasts = TestBed.inject(ToastService);
        toasts.toasts.set([]);
        fixture = TestBed.createComponent(ToastComponent);
        fixture.detectChanges();
    });

    afterEach(() => {
        toasts.toasts.set([]);
        fixture.destroy();
    });

    /** Render one toast of each variant and hand back the rendered cards. */
    function renderAllVariants(): HTMLElement[] {
        toasts.error('The line has broken.');
        toasts.success('The colours are secured.');
        toasts.info('Muster at first light.');
        fixture.detectChanges();
        return Array.from(fixture.nativeElement.querySelectorAll('.toast')) as HTMLElement[];
    }

    it('renders one card per queued toast', () => {
        expect(renderAllVariants().length).toBe(3);
    });

    it('clears WCAG AA for body text in every variant', () => {
        for (const card of renderAllVariants()) {
            const style = getComputedStyle(card);
            const ratio = contrastRatio(style.color, style.backgroundColor);
            expect(ratio)
                .withContext(`${card.className} → ${style.color} on ${style.backgroundColor}`)
                .toBeGreaterThanOrEqual(AA_NORMAL);
        }
    });

    it('is a dark surface, not parchment — the pairing that caused the bug', () => {
        // The specific regression: a light text token on a light parchment card.
        // Asserting the surface is DARK is what stops the pairing returning by a
        // different route than the exact two tokens that were there before.
        for (const card of renderAllVariants()) {
            const luminance = relativeLuminance(parseRgb(getComputedStyle(card).backgroundColor));
            expect(luminance).withContext(card.className).toBeLessThan(0.2);
        }
    });

    it('keeps a distinct left accent per variant', () => {
        const [error, success, info] = renderAllVariants().map(
            (c) => getComputedStyle(c).borderLeftColor,
        );
        expect(new Set([error, success, info]).size).toBe(3);
    });

    it('keeps the dismiss glyph legible at its resting opacity', () => {
        // `color: inherit` with an opacity is the easy way to fail AA on a control
        // that passed as text — so it is measured against the same floor, with the
        // opacity folded in.
        const card = renderAllVariants()[0];
        const button = card.querySelector('.toast-dismiss') as HTMLElement;
        const cardStyle = getComputedStyle(card);
        const opacity = Number(getComputedStyle(button).opacity);
        const [fr, fg, fb] = parseRgb(getComputedStyle(button).color);
        const [br, bg, bb] = parseRgb(cardStyle.backgroundColor);
        const blended: [number, number, number] = [
            fr * opacity + br * (1 - opacity),
            fg * opacity + bg * (1 - opacity),
            fb * opacity + bb * (1 - opacity),
        ];
        const ratio = contrastRatio(`rgb(${blended.join(',')})`, cardStyle.backgroundColor);

        expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    });

    it('dismisses the card the user closes and leaves the rest standing', () => {
        renderAllVariants();
        const dismiss = fixture.nativeElement.querySelector('.toast-dismiss') as HTMLElement;

        dismiss.click();
        fixture.detectChanges();

        const remaining = fixture.nativeElement.querySelectorAll('.toast');
        expect(remaining.length).toBe(2);
        expect((remaining[0] as HTMLElement).textContent).toContain('colours are secured');
    });
});
