import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { MembersService } from '../../../core/services/members.service';
import { ApplicationsService } from '../../../core/services/applications.service';
import { EventsService } from '../../../core/services/events.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { DiscordService } from '../../../core/services/discord.service';
import { Member, MemberMedalAward } from '../../../core/models/member.model';
import { MedalComponent } from '../../../shared/components/medal/medal.component';
import { RankIconComponent } from '../../../shared/components/rank-icon/rank-icon.component';

function award(i: number): MemberMedalAward {
    return {
        id: `a${i}`,
        medalId: `m${i}`,
        title: `Medal ${i}`,
        glyph: 'M',
        imageUrl: null,
        awardedAt: '2026-01-0' + ((i % 9) + 1),
    };
}

function member(medalCount: number): Member {
    return {
        id: 'u1',
        discordTag: 'lord#0001',
        inGameName: 'Lord Cornwallis',
        rank: 'Colour Sergeant',
        rankImageUrl: null,
        medalAwards: Array.from({ length: medalCount }, (_, i) => award(i)),
        role: 'Member',
        discordLinked: true,
        status: 'Active',
        lastSeen: '2026-07-20T10:00:00.000Z',
    };
}

const user: CurrentUser = {
    id: 'u1',
    inGameName: 'Lord Cornwallis',
    rank: 'Colour Sergeant',
    role: 'Member',
    discordTag: 'lord#0001',
    discordLinked: true,
    avatarUrl: null,
    isMember: true,
    capabilities: [],
};

/**
 * The honours strip's mobile layout is pure CSS, and Karma's own viewport is
 * fixed — so each case renders the component inside an iframe of a known width.
 * An iframe carries its own viewport, so the component's media queries are
 * evaluated for real at 390px / 768px / desktop instead of being asserted from
 * the stylesheet text (T-0252).
 */
class Viewport {
    private readonly frame: HTMLIFrameElement;
    readonly doc: Document;

    constructor(width: number, host: HTMLElement) {
        this.frame = document.createElement('iframe');
        this.frame.style.cssText = `width:${width}px;height:1400px;border:0`;
        document.body.appendChild(this.frame);

        // Write a doctype so the frame lays out in standards mode.
        const doc = this.frame.contentDocument as Document;
        doc.open();
        doc.write('<!doctype html><meta charset="utf-8">');
        doc.close();
        this.doc = doc;

        // Copy the rules (not the nodes) of every same-origin sheet: the global
        // layer plus the emulated-encapsulation styles Angular injected for the
        // components under test. Copying rule text keeps this synchronous.
        const style = doc.createElement('style');
        style.textContent = Array.from(document.styleSheets)
            .map((sheet) => {
                try {
                    return Array.from(sheet.cssRules)
                        .map((rule) => rule.cssText)
                        .join('\n');
                } catch {
                    // Cross-origin sheet — nothing this app owns.
                    return '';
                }
            })
            .join('\n');
        doc.head.appendChild(style);

        // No body gutter: the real page adds 16px of its own, so measuring
        // against the bare frame width is the stricter overflow test.
        doc.body.style.margin = '0';
        doc.body.appendChild(host); // appendChild adopts across documents
    }

    query(selector: string): HTMLElement {
        const el = this.doc.querySelector(selector);
        if (!el) {
            throw new Error(`missing element: ${selector}`);
        }
        return el as HTMLElement;
    }

    styleOf(selector: string): CSSStyleDeclaration {
        return this.doc.defaultView!.getComputedStyle(this.query(selector));
    }

    /** Rounded viewport-relative left edge of an element. */
    leftOf(selector: string): number {
        return Math.round(this.query(selector).getBoundingClientRect().left);
    }

    destroy(): void {
        this.frame.remove();
    }
}

describe('DashboardComponent — honours strip', () => {
    let fixture: ComponentFixture<DashboardComponent>;
    let frames: Viewport[];

    function setup(medalCount: number): void {
        const auth = {
            currentUser: signal<CurrentUser | null>(user),
            isAdmin: () => false,
            hasCapability: () => false,
        } as unknown as AuthService;

        const members = jasmine.createSpyObj<MembersService>('MembersService', ['getById']);
        members.getById.and.returnValue(of(member(medalCount)));

        const events = jasmine.createSpyObj<EventsService>('EventsService', ['getAllMine']);
        events.getAllMine.and.returnValue(of([]));

        const gallery = jasmine.createSpyObj<GalleryService>('GalleryService', [
            'getAll',
            'pendingSummary',
        ]);
        gallery.getAll.and.returnValue(of([]));
        gallery.pendingSummary.and.returnValue(of([]));

        const applications = jasmine.createSpyObj<ApplicationsService>('ApplicationsService', [
            'getAll',
        ]);
        applications.getAll.and.returnValue(of([]));

        const discord = jasmine.createSpyObj<DiscordService>('DiscordService', ['getStatus']);

        TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [DashboardComponent, MedalComponent, RankIconComponent],
            providers: [
                { provide: AuthService, useValue: auth },
                { provide: MembersService, useValue: members },
                { provide: EventsService, useValue: events },
                { provide: GalleryService, useValue: gallery },
                { provide: ApplicationsService, useValue: applications },
                { provide: DiscordService, useValue: discord },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(DashboardComponent);
        fixture.detectChanges();
    }

    /** Render the dashboard at `width` and hand back the framed document. */
    function renderAt(width: number, medalCount = 4): Viewport {
        TestBed.resetTestingModule();
        setup(medalCount);
        const frame = new Viewport(width, fixture.nativeElement);
        frames.push(frame);
        return frame;
    }

    beforeEach(() => {
        frames = [];
    });

    afterEach(() => {
        frames.forEach((f) => f.destroy());
    });

    it('stacks rank and decorations on one left edge, with no divider, on a phone', () => {
        const view = renderAt(390);

        expect(view.styleOf('.honors-row').flexDirection).toBe('column');
        expect(view.styleOf('.honors-divider').display).toBe('none');

        // Every block in the stack starts at the strip's own left edge — the
        // strip must not centre its children (the pre-T-0252 defect).
        const edge = view.leftOf('.honors-row');
        expect(view.leftOf('.field-label--rank')).toBe(edge);
        expect(view.leftOf('hf-rank-icon')).toBe(edge);
        expect(view.leftOf('.field-label--medals')).toBe(edge);
        expect(view.leftOf('.honor-row-medals')).toBe(edge);
    });

    it('stacks the same way across the whole mobile band, not just narrow phones', () => {
        // 768px sat between the strip's old 640px breakpoint and the app's 820px
        // mobile breakpoint, so it kept a horizontal row around an orphan divider.
        const view = renderAt(768);

        expect(view.styleOf('.honors-row').flexDirection).toBe('column');
        expect(view.styleOf('.honors-divider').display).toBe('none');
        expect(view.leftOf('.field-label--medals')).toBe(view.leftOf('.field-label--rank'));
    });

    it('keeps the horizontal, divided strip on desktop', () => {
        const view = renderAt(1280);

        expect(view.styleOf('.honors-row').flexDirection).toBe('row');
        expect(view.styleOf('.honors-row').alignItems).toBe('center');
        expect(view.styleOf('.honors-divider').display).not.toBe('none');
        // Rank and decorations sit side by side, not stacked.
        expect(view.leftOf('.field-label--medals')).toBeGreaterThan(
            view.leftOf('.field-label--rank'),
        );
    });

    it('wraps a heavily decorated member instead of scrolling the page sideways', () => {
        const view = renderAt(390, 12);

        const page = view.doc.documentElement;
        expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth + 1);

        // Wrapped, i.e. taller than the single 30px medal tile.
        expect(view.query('.honor-row-medals').getBoundingClientRect().height).toBeGreaterThan(30);
    });

    it('shrinks the decorations block rather than wrapping the strip around its divider', () => {
        // Above the mobile breakpoint the divider is still drawn, so the strip
        // itself must stay on one line — a wrapped strip strands it mid-air.
        const view = renderAt(900, 40);

        const page = view.doc.documentElement;
        expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth + 1);

        const rank = view.query('.field-label--rank').getBoundingClientRect();
        const medals = view.query('.honor-block--medals').getBoundingClientRect();
        expect(medals.top).toBeLessThan(rank.bottom);
    });

    it('shows the empty hint without reserving more room than a real decoration', () => {
        const empty = renderAt(390, 0);
        const emptyHeight = empty.query('.honor-block--medals').getBoundingClientRect().height;
        expect(empty.query('.field-hint').textContent).toContain('No decorations yet.');

        const filled = renderAt(390, 1);
        const filledHeight = filled.query('.honor-block--medals').getBoundingClientRect().height;

        expect(emptyHeight).toBeLessThanOrEqual(filledHeight);
    });
});
