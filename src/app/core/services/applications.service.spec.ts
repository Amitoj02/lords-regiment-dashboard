import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationsService } from './applications.service';
import { ApiApplicantApplication, ApiApplication } from '../models/api.model';
import { ApplicantApplication, Application, MyApplication } from '../models/application.model';

function apiApplication(overrides: Partial<ApiApplication> = {}): ApiApplication {
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
        representativeNote: null,
        status: 'pending',
        isReapplication: false,
        mutualEventsCount: 0,
        moderatorNote: null,
        declineReason: null,
        promotedMemberId: null,
        currentDisplayName: null,
        currentAvatarUrl: null,
        decidedByMemberId: null,
        submittedAt: '2026-07-18T00:00:00.000Z',
        decidedAt: null,
        createdAt: '2026-07-18T00:00:00.000Z',
        ...overrides,
    };
}

function apiApplicantApplication(
    overrides: Partial<ApiApplicantApplication> = {},
): ApiApplicantApplication {
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
        representativeNote: null,
        status: 'pending',
        isReapplication: false,
        userMessage: null,
        submittedAt: '2026-07-18T00:00:00.000Z',
        decidedAt: null,
        createdAt: '2026-07-18T00:00:00.000Z',
        ...overrides,
    };
}

describe('ApplicationsService', () => {
    let service: ApplicationsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ApplicationsService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(ApplicationsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    // ── Decisions (T-0248) ──────────────────────────────────────────────────────

    it('posts the moderator note as `note` and the applicant text as the DM body', () => {
        service.decline('a1', 'Timewaster — third attempt', 'Thanks for applying.').subscribe();

        const req = httpMock.expectOne('/api/applications/a1/decline');
        expect(req.request.method).toBe('POST');
        // The exact body matters: `forbidNonWhitelisted` 400s an undeclared key,
        // and posting the note as `reason` is what used to leak it to the
        // applicant's status page.
        expect(req.request.body).toEqual({
            note: 'Timewaster — third attempt',
            discordDmMessage: 'Thanks for applying.',
        });
        req.flush(apiApplication({ status: 'declined' }));
    });

    it('never posts the moderator note as the applicant-visible `reason`', () => {
        service.decline('a1', 'Known troll', undefined).subscribe();

        const req = httpMock.expectOne('/api/applications/a1/decline');
        const body = req.request.body as Record<string, unknown>;
        expect(body['reason']).toBeUndefined();
        expect(body['note']).toBe('Known troll');
        req.flush(apiApplication());
    });

    it('keeps sending the hold note where the hold endpoint expects it', () => {
        service.hold('a1', 'Waiting on a reference', 'We need a little longer.').subscribe();

        const req = httpMock.expectOne('/api/applications/a1/hold');
        expect(req.request.body).toEqual({
            note: 'Waiting on a reference',
            discordDmMessage: 'We need a little longer.',
        });
        req.flush(apiApplication({ status: 'held' }));
    });

    it('sends the block reason where the block endpoint expects it', () => {
        service.blockApplicant('a1', 'Repeat offender').subscribe();

        const req = httpMock.expectOne('/api/applications/a1/block');
        expect(req.request.body).toEqual({ reason: 'Repeat offender' });
        req.flush(apiApplication({ blocked: true }));
    });

    it('sends only the applicant-visible message on approve', () => {
        // Approve had no request-body coverage at all, and it is the branch where
        // the shared note field is deliberately dropped — so it is the branch
        // most likely to grow an extra key unnoticed.
        service.approve('a1', 'Welcome aboard!').subscribe();

        const req = httpMock.expectOne('/api/applications/a1/approve');
        expect(req.request.body).toEqual({ discordDmMessage: 'Welcome aboard!' });
        req.flush(apiApplication({ status: 'approved' }));
    });

    /**
     * T-0273 — the standing guard on the console's half of the promise.
     *
     * The moderator note is badged "Staff only" in the decision pane. The API now
     * keeps that promise (lords-dashboard-backend T-0182 deleted the embed field
     * that used to DM the note to the applicant), and this pins the console's
     * side: the note may travel as `note` and nowhere else. Asserting the exact
     * KEY SET rather than one key is what makes it a guard — a stray `reason`, or
     * a note copied into `discordDmMessage`, fails here rather than in a DM to a
     * real applicant.
     *
     * Scoped to approve/decline/hold on purpose: `blockApplicant` legitimately
     * sends `reason`, because the block endpoint's reason is staff-side.
     */
    it('never lets the staff note reach an applicant-visible key on any decision', () => {
        const STAFF_NOTE = 'Suspected sock puppet — do not tell them';

        service.approve('a1', 'Welcome aboard!').subscribe();
        service.decline('a2', STAFF_NOTE, 'Not this time.').subscribe();
        service.hold('a3', STAFF_NOTE, 'Sit tight.').subscribe();

        const approve = httpMock.expectOne('/api/applications/a1/approve');
        const decline = httpMock.expectOne('/api/applications/a2/decline');
        const hold = httpMock.expectOne('/api/applications/a3/hold');
        const bodies = {
            approve: approve.request.body as Record<string, unknown>,
            decline: decline.request.body as Record<string, unknown>,
            hold: hold.request.body as Record<string, unknown>,
        };

        expect(Object.keys(bodies.approve).sort()).toEqual(['discordDmMessage']);
        expect(Object.keys(bodies.decline).sort()).toEqual(['discordDmMessage', 'note']);
        expect(Object.keys(bodies.hold).sort()).toEqual(['discordDmMessage', 'note']);

        for (const body of Object.values(bodies)) {
            expect(body['reason']).toBeUndefined();
            expect(body['discordDmMessage']).not.toBe(STAFF_NOTE);
        }

        approve.flush(apiApplication({ status: 'approved' }));
        decline.flush(apiApplication({ status: 'declined' }));
        hold.flush(apiApplication({ status: 'held' }));
    });

    // ── Staff projection (T-0247 / T-0250) ──────────────────────────────────────

    it('carries the user message and the decision attribution into the staff model', () => {
        let decided: Application | undefined;
        service.getById('a1').subscribe((a) => (decided = a));

        httpMock.expectOne('/api/applications/a1').flush(
            apiApplication({
                status: 'declined',
                moderatorNote: 'Internal: no-show twice',
                userMessage: 'Not this time — do reapply in a month.',
                decidedByName: 'Colonel Hale',
                decidedByAvatarUrl: 'https://cdn/hale.png',
                decidedByMemberId: 'mem-hale',
                decidedAt: '2026-07-19T12:00:00.000Z',
            }),
        );

        expect(decided).toEqual(
            jasmine.objectContaining({
                moderatorNote: 'Internal: no-show twice',
                userMessage: 'Not this time — do reapply in a month.',
                decidedByName: 'Colonel Hale',
                decidedByAvatarUrl: 'https://cdn/hale.png',
                // The id the officer chip deep-links with (T-0274).
                decidedByMemberId: 'mem-hale',
            }),
        );
    });

    it('nulls the attribution rather than dropping it when the decider is gone', () => {
        let decided: Application | undefined;
        service.getById('a1').subscribe((a) => (decided = a));

        // decidedByName/AvatarUrl absent from the payload entirely (older server
        // build) must still land as an explicit null, not `undefined`.
        httpMock
            .expectOne('/api/applications/a1')
            .flush(apiApplication({ status: 'declined', decidedAt: '2026-07-19T12:00:00.000Z' }));

        expect(decided!.decidedByName).toBeNull();
        expect(decided!.decidedAt).toBe('2026-07-19T12:00:00.000Z');
    });

    // ── Applicant projection (T-0249) ───────────────────────────────────────────

    it('maps /mine through the applicant projection and exposes only the user message', () => {
        let mine: MyApplication | undefined;
        service.getMine().subscribe((m) => (mine = m));

        httpMock.expectOne('/api/applications/mine').flush({
            application: apiApplicantApplication({
                status: 'declined',
                userMessage: 'Not this time.',
                decidedAt: '2026-07-19T12:00:00.000Z',
            }),
            blocked: false,
        });

        const app = mine!.application as unknown as Record<string, unknown>;
        expect(app['userMessage']).toBe('Not this time.');
        // The staff fields are not merely blank here — they are absent, which is
        // the invariant that stops a template ever binding them (T-0249).
        expect('moderatorNote' in app).toBe(false);
        expect('declineReason' in app).toBe(false);
        expect('decidedByName' in app).toBe(false);
    });

    it('passes a null user message through as null, not as an empty string', () => {
        let mine: MyApplication | undefined;
        service.getMine().subscribe((m) => (mine = m));

        httpMock
            .expectOne('/api/applications/mine')
            .flush({ application: apiApplicantApplication(), blocked: false });

        expect(mine!.application!.userMessage).toBeNull();
    });

    it('reports a blocked applicant who has never applied', () => {
        let mine: MyApplication | undefined;
        service.getMine().subscribe((m) => (mine = m));

        httpMock.expectOne('/api/applications/mine').flush({ application: null, blocked: true });

        expect(mine).toEqual({ application: null, blocked: true });
    });

    it('maps the applicant projection returned by POST /applications', () => {
        let created: ApplicantApplication | undefined;
        service
            .submit({
                applicantName: 'Jane Doe',
                inGameName: 'Jane',
                currentRegiment: 'None',
                howFound: 'A friend',
                preferredClasses: 'Line Infantry',
                skillsToImprove: 'Melee',
                interestConfirmed: true,
            })
            .subscribe((a) => (created = a));

        httpMock.expectOne('/api/applications').flush(apiApplicantApplication());

        expect(created!.inGameName).toBe('Jane');
        expect(created!.userMessage).toBeNull();
    });
});
