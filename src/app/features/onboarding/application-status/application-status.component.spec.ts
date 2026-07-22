import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ApplicationStatusComponent } from './application-status.component';
import { ApplicationsService } from '../../../core/services/applications.service';
import { ApplicantApplication, MyApplication } from '../../../core/models/application.model';

function applicantApplication(overrides: Partial<ApplicantApplication> = {}): ApplicantApplication {
    return {
        id: 'a1',
        applicantName: 'Jane Doe',
        discordTag: 'jane#0001',
        inGameName: 'Jane',
        applicantType: 'Member',
        currentRegiment: 'None',
        howFound: 'A friend',
        preferredClasses: 'Line Infantry',
        skillsToImprove: 'Melee',
        interestConfirmed: true,
        submittedAt: '2026-07-18T00:00:00.000Z',
        status: 'pending',
        userMessage: null,
        ...overrides,
    };
}

describe('ApplicationStatusComponent', () => {
    let fixture: ComponentFixture<ApplicationStatusComponent>;
    let router: jasmine.SpyObj<Router>;

    function setup(mine: MyApplication): void {
        const applications = jasmine.createSpyObj<ApplicationsService>('ApplicationsService', [
            'getMine',
        ]);
        applications.getMine.and.returnValue(of(mine));
        router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);

        TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [ApplicationStatusComponent],
            providers: [
                { provide: ApplicationsService, useValue: applications },
                { provide: Router, useValue: router },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(ApplicationStatusComponent);
        fixture.detectChanges();
    }

    /** The whole rendered page, whitespace-collapsed, for leak assertions. */
    function pageText(): string {
        return (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    }

    // ── The applicant sees the officer's message and nothing else (T-0249) ──────

    it('shows the officer’s message on a declined application', () => {
        setup({
            application: applicantApplication({
                status: 'declined',
                userMessage: 'Not this time — do reapply in a month.',
                decidedAt: '2026-07-19T12:00:00.000Z',
            }),
            blocked: false,
        });

        expect(pageText()).toContain('Not this time — do reapply in a month.');
    });

    it('shows the officer’s message on a held application', () => {
        setup({
            application: applicantApplication({
                status: 'held',
                userMessage: 'We need a reference before we can proceed.',
            }),
            blocked: false,
        });

        expect(pageText()).toContain('We need a reference before we can proceed.');
        expect(pageText()).toContain('On hold');
    });

    it('renders no internal text when a decision carries no message for the applicant', () => {
        // The decision DID carry a moderator note server-side; the applicant
        // projection simply does not contain it, so nothing surfaces here. This
        // is the invariant — not "the note happens to be blank" (T-0249).
        setup({
            application: applicantApplication({
                status: 'declined',
                userMessage: null,
                decidedAt: '2026-07-19T12:00:00.000Z',
            }),
            blocked: false,
        });

        expect(pageText()).toContain('Not accepted');
        expect(pageText()).not.toContain('Officer note');
        expect(pageText()).not.toContain('Reason:');
        expect(pageText()).not.toContain('Message from the officers');
    });

    it('still tells a blocked applicant they cannot reapply, after the message', () => {
        setup({
            application: applicantApplication({
                status: 'declined',
                userMessage: 'This is not a fit.',
            }),
            blocked: true,
        });

        const text = pageText();
        expect(text).toContain('This is not a fit.');
        expect(text).toContain('You are no longer able to submit further applications.');
        // The message reads before the dead end, not after it.
        expect(text.indexOf('This is not a fit.')).toBeLessThan(
            text.indexOf('You are no longer able to submit further applications.'),
        );
    });

    it('shows a pending application with no decision text at all', () => {
        setup({ application: applicantApplication({ status: 'pending' }), blocked: false });

        expect(pageText()).toContain('Under review');
        expect(pageText()).not.toContain('Message from the officers');
    });

    // ── Routing (unchanged behaviour, pinned) ───────────────────────────────────

    it('sends an approved applicant on to the dashboard rather than rendering', () => {
        setup({ application: applicantApplication({ status: 'approved' }), blocked: false });

        expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
    });

    it('sends someone with no application to the blank apply form', () => {
        setup({ application: null, blocked: false });

        expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding/apply');
    });
});
