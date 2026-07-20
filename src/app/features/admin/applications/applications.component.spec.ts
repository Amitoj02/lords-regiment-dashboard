import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
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
            imports: [CommonModule, RouterModule.forRoot([])],
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
});
