import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApplicationsComponent } from './applications.component';
import { ApplicationsService } from '../../../core/services/applications.service';
import { Application } from '../../../core/models/application.model';

function application(overrides: Partial<Application> = {}): Application {
    return {
        id: 'a1',
        applicantName: 'Jameson Nolt',
        discordTag: 'jameson#0001',
        inGameName: 'Nolt',
        applicantType: 'Member',
        currentRegiment: 'None',
        howFound: 'Steam group',
        preferredClasses: 'Line infantry',
        skillsToImprove: 'Melee',
        interestConfirmed: true,
        submittedAt: '2026-06-07T19:30:00',
        status: 'pending',
        ...overrides,
    };
}

/** Trimmed text of every badge rendered inside `el`. */
function badgeTexts(el: Element): string[] {
    return Array.from(el.querySelectorAll('.badge')).map((b) => (b.textContent ?? '').trim());
}

describe('ApplicationsComponent', () => {
    let fixture: ComponentFixture<ApplicationsComponent>;
    let component: ApplicationsComponent;
    let applicationsService: jasmine.SpyObj<ApplicationsService>;

    function setup(applications: Application[]): void {
        applicationsService = jasmine.createSpyObj<ApplicationsService>('ApplicationsService', [
            'getAll',
            'approve',
            'decline',
            'hold',
        ]);
        applicationsService.getAll.and.returnValue(of(applications));
        applicationsService.approve.and.returnValue(of(applications[0]));
        applicationsService.decline.and.returnValue(of(applications[0]));
        applicationsService.hold.and.returnValue(of(applications[0]));

        TestBed.configureTestingModule({
            // FormsModule so the decision textareas are really bound — the
            // prefill/reset behaviour under test is only observable through them.
            imports: [CommonModule, FormsModule, RouterModule.forRoot([])],
            declarations: [ApplicationsComponent],
            providers: [{ provide: ApplicationsService, useValue: applicationsService }],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(ApplicationsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    /** The name row of the detail header — status badge + enlistment-track pill. */
    function detailNameRow(): HTMLElement {
        return fixture.nativeElement.querySelector('.detail-header__name');
    }

    function queueRows(): HTMLElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('.queue-item'));
    }

    // ── Detail pane (T-0227) ────────────────────────────────────────────────────

    it('renders a Mercenary pill beside the status badge in the detail header', () => {
        setup([application({ applicantType: 'Mercenary' })]);

        const row = detailNameRow();
        const pill = row.querySelector('.applicant-type') as HTMLElement;
        expect(pill).withContext('the detail header renders an enlistment-track pill').toBeTruthy();
        expect(pill.textContent?.trim()).toBe('Mercenary');
        // `parch` is the only semantic badge colour not claimed by a status, so the
        // pill can never collide with the status badge sitting next to it.
        expect(pill.classList).toContain('parch');
        expect(badgeTexts(row)).toEqual(['Pending', 'Mercenary']);
    });

    it('marks a Member application with the neutral pill, never the Mercenary one', () => {
        setup([application({ applicantType: 'Member' })]);

        const row = detailNameRow();
        const pill = row.querySelector('.applicant-type') as HTMLElement;
        expect(pill.textContent?.trim()).toBe('Member');
        expect(pill.classList).not.toContain('parch');
        expect(badgeTexts(row)).not.toContain('Mercenary');
    });

    // ── Queue rows (T-0228) ─────────────────────────────────────────────────────

    it('pills only the Mercenary queue rows — Member is the unmarked default', () => {
        setup([
            application({ id: 'a1', applicantName: 'Member One', applicantType: 'Member' }),
            application({ id: 'a2', applicantName: 'Merc One', applicantType: 'Mercenary' }),
        ]);

        const [memberRow, mercRow] = queueRows();
        expect(queueRows().length).toBe(2);
        expect(memberRow.querySelector('.applicant-type')).toBeFalsy();
        expect(badgeTexts(memberRow)).toEqual(['Pending']);

        const pill = mercRow.querySelector('.applicant-type') as HTMLElement;
        expect(pill.textContent?.trim()).toBe('Mercenary');
        expect(pill.classList).toContain('parch');
    });

    it('shows the Mercenary pill alongside the Re-apply badge on one wrapping row', () => {
        setup([application({ applicantType: 'Mercenary', isPreviousApplicant: true })]);

        const tags = queueRows()[0].querySelector('.queue-item__tags') as HTMLElement;
        expect(tags).withContext('both pills share a single tags row').toBeTruthy();
        expect(badgeTexts(tags)).toEqual(['Mercenary', 'Re-apply']);
    });

    it('keeps the tags row out of the DOM for an unmarked Member row', () => {
        setup([application({ applicantType: 'Member', isPreviousApplicant: false })]);

        expect(queueRows()[0].querySelector('.queue-item__tags')).toBeFalsy();
        expect(component.queue.length).toBe(1);
    });

    // ── Refused decisions ───────────────────────────────────────────────────────

    /** The notice rendered when the server refuses a decision, if present. */
    function decisionError(): HTMLElement | null {
        return fixture.nativeElement.querySelector('.decision-error');
    }

    function clickApprove(): void {
        const btn = fixture.nativeElement.querySelector(
            '.decisions-row .action-btns .btn-primary',
        ) as HTMLButtonElement;
        expect(btn).withContext('the detail pane renders an approve button').toBeTruthy();
        btn.click();
        fixture.detectChanges();
    }

    /** A rejected HTTP call carrying a NestJS error body. */
    function refusal(status: number, message: string) {
        return throwError(() => ({ status, error: { statusCode: status, message } }));
    }

    const TRACK_CLOSED =
        'The mercenary track is currently closed - this application cannot be approved onto it';

    it("renders the server's reason when approving is refused with a 403", () => {
        setup([application({ applicantType: 'Mercenary' })]);
        spyOn(console, 'error');
        applicationsService.approve.and.returnValue(refusal(403, TRACK_CLOSED));

        expect(decisionError()).withContext('no error before the decision').toBeFalsy();

        clickApprove();

        const notice = decisionError();
        expect(notice).withContext('the refusal is surfaced in the detail pane').toBeTruthy();
        expect(notice!.textContent?.trim()).toBe(TRACK_CLOSED);
    });

    it('falls back to a generic line when the refusal carries no message', () => {
        setup([application()]);
        spyOn(console, 'error');
        applicationsService.approve.and.returnValue(throwError(() => ({ status: 500 })));

        clickApprove();

        expect(decisionError()?.textContent?.trim()).toBe(
            'This application could not be approved. Please try again.',
        );
    });

    it('surfaces a refused decline the same way it surfaces a refused approve', () => {
        setup([application()]);
        spyOn(console, 'error');
        applicationsService.decline.and.returnValue(refusal(403, 'Declining is locked right now'));

        const btn = fixture.nativeElement.querySelector(
            '.decisions-row .action-btns .btn-destructive',
        ) as HTMLButtonElement;
        btn.click();
        fixture.detectChanges();

        expect(decisionError()?.textContent?.trim()).toBe('Declining is locked right now');
    });

    it('clears the error when the moderator opens a different application', () => {
        setup([
            application({ id: 'a1', applicantName: 'Merc One', applicantType: 'Mercenary' }),
            application({ id: 'a2', applicantName: 'Member Two', applicantType: 'Member' }),
        ]);
        spyOn(console, 'error');
        applicationsService.approve.and.returnValue(refusal(403, TRACK_CLOSED));

        clickApprove();
        expect(decisionError()?.textContent?.trim()).toBe(TRACK_CLOSED);

        // Selecting the second application must not carry the first one's refusal.
        queueRows()[1].click();
        fixture.detectChanges();

        expect(decisionError())
            .withContext('a stale refusal never bleeds across applications')
            .toBeFalsy();
    });

    it('clears the error once a later decision succeeds', () => {
        setup([application({ applicantType: 'Mercenary' })]);
        spyOn(console, 'error');
        applicationsService.approve.and.returnValue(refusal(403, TRACK_CLOSED));

        clickApprove();
        expect(decisionError()).toBeTruthy();

        applicationsService.approve.and.returnValue(of(application()));
        clickApprove();

        expect(decisionError()).toBeFalsy();
    });

    // ── Decision text: two boxes, two audiences (T-0247 / T-0248) ───────────────

    /**
     * Read a decision textarea. `tick()` first: ngModel writes the model into the
     * DOM on a microtask, so a bare detectChanges leaves the box looking empty.
     */
    function textarea(id: string): HTMLTextAreaElement {
        tick();
        fixture.detectChanges();
        const el = fixture.nativeElement.querySelector(`#${id}`) as HTMLTextAreaElement;
        expect(el).withContext(`the decision pane renders #${id}`).toBeTruthy();
        return el;
    }

    /** The label element bound to a decision textarea. */
    function labelFor(id: string): HTMLElement {
        return fixture.nativeElement.querySelector(`label[for="${id}"]`);
    }

    it('names the applicant-facing box "User message" and marks the note staff-only', fakeAsync(() => {
        setup([application()]);

        expect(labelFor('user-message').textContent?.trim()).toBe('User message');
        // Whose eyes each box reaches must be stated in the UI, not just implied
        // by the field name — the two are one word apart and opposite in effect.
        const userHint = textarea('user-message').parentElement!.querySelector('.field-hint');
        expect(userHint?.textContent).toContain('applicant receives this');

        const noteLabel = labelFor('moderator-note');
        expect(noteLabel.textContent).toContain('Moderator note');
        expect(noteLabel.querySelector('.note-audience')?.textContent?.trim()).toBe('Staff only');
    }));

    it('declines with the note staff-side and the message applicant-side', () => {
        setup([application()]);

        component.moderatorNote = 'Internal: no-showed twice';
        component.userMessage = 'Not this time — do reapply.';

        const btn = fixture.nativeElement.querySelector(
            '.decisions-row .action-btns .btn-destructive',
        ) as HTMLButtonElement;
        btn.click();

        // Argument ORDER is the invariant: the note must never travel in the
        // applicant-visible slot (T-0248).
        expect(applicationsService.decline).toHaveBeenCalledWith(
            'a1',
            'Internal: no-showed twice',
            'Not this time — do reapply.',
        );
    });

    it('re-fills both boxes from the stored values when an application is selected', fakeAsync(() => {
        setup([
            application({
                id: 'a1',
                status: 'declined',
                moderatorNote: 'Internal: no-showed twice',
                userMessage: 'Not this time — do reapply.',
            }),
        ]);
        component.setTab('declined');
        fixture.detectChanges();

        expect(textarea('moderator-note').value).toBe('Internal: no-showed twice');
        expect(textarea('user-message').value).toBe('Not this time — do reapply.');
    }));

    it('swaps cleanly between applications instead of carrying text across', fakeAsync(() => {
        setup([
            application({
                id: 'a1',
                applicantName: 'Decided One',
                status: 'declined',
                moderatorNote: 'Internal note for a1',
                userMessage: 'Message for a1',
            }),
            application({ id: 'a2', applicantName: 'Pending Two', status: 'declined' }),
        ]);
        component.setTab('declined');
        fixture.detectChanges();
        expect(component.selectedId).toBe('a1');

        queueRows()[1].click();
        fixture.detectChanges();

        // a2 stored nothing, so both boxes are empty and their placeholders show —
        // a partial reset here is what used to leak a1's text onto a2.
        expect(textarea('moderator-note').value).toBe('');
        expect(textarea('user-message').value).toBe('');

        queueRows()[0].click();
        fixture.detectChanges();
        expect(textarea('moderator-note').value).toBe('Internal note for a1');
        expect(textarea('user-message').value).toBe('Message for a1');
    }));

    it('leaves a pending application with empty boxes', fakeAsync(() => {
        setup([application({ status: 'pending' })]);

        expect(textarea('moderator-note').value).toBe('');
        expect(textarea('user-message').value).toBe('');
        expect(textarea('user-message').placeholder).toContain('applicant');
    }));

    // ── Decision attribution (T-0250) ──────────────────────────────────────────

    function attribution(): HTMLElement | null {
        return fixture.nativeElement.querySelector('.decision-by');
    }

    it('shows who declined an application and when', () => {
        setup([
            application({
                status: 'declined',
                decidedByName: 'Colonel Hale',
                decidedByAvatarUrl: 'https://cdn/hale.png',
                decidedAt: '2026-07-19T12:00:00.000Z',
            }),
        ]);
        component.setTab('declined');
        fixture.detectChanges();

        const text = attribution()?.textContent?.replace(/\s+/g, ' ').trim();
        expect(text).toContain('Declined by Colonel Hale');
        expect(text).toContain('Jul 19, 2026');
    });

    it('attributes a HELD application even though it has no decision timestamp', () => {
        setup([
            application({
                status: 'held',
                decidedByName: 'Sergeant Rook',
                decidedAt: undefined,
            }),
        ]);
        component.setTab('held');
        fixture.detectChanges();

        // A hold is not a final decision, so `decidedAt` stays null — driving the
        // block off the timestamp would silently drop the held case.
        const text = attribution()?.textContent?.replace(/\s+/g, ' ').trim();
        expect(text).toContain('Held by Sergeant Rook');
    });

    it('renders the date alone when the decider’s member row was removed', () => {
        setup([
            application({
                status: 'declined',
                decidedByName: null,
                decidedByAvatarUrl: null,
                decidedAt: '2026-07-19T12:00:00.000Z',
            }),
        ]);
        component.setTab('declined');
        fixture.detectChanges();

        const el = attribution();
        expect(el).withContext('the decision itself is still reported').toBeTruthy();
        expect(el!.textContent).not.toContain('null');
        // No name → no avatar to render initials from.
        expect(el!.querySelector('hf-avatar')).toBeFalsy();
        expect(el!.textContent?.replace(/\s+/g, ' ')).toContain('Declined');
    });

    it('shows no attribution block on a pending application', () => {
        setup([application({ status: 'pending' })]);

        expect(attribution()).toBeFalsy();
        expect(component.decisionAttribution).toBeNull();
    });
});
