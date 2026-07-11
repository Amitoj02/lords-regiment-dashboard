import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent } from '../../../core/models/event.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { Application } from '../../../core/models/application.model';
import { MedalRibbon } from '../../../core/models/member.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService } from '../../../core/services/auth.service';
import { MembersService } from '../../../core/services/members.service';

interface HonorMedal {
    letter: string;
    ribbon: MedalRibbon;
    title: string;
}

@Component({
    selector: 'hf-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    standalone: false,
})
export class DashboardComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    private readonly membersService = inject(MembersService);
    private readonly applicationsService = inject(ApplicationsService);
    private readonly PREVIEW_COUNT = 3;

    // Events + Gallery are MVP-deferred (T-0026): kept empty so the widgets show
    // their empty state rather than fabricated data. They wire up post-MVP.
    upcomingEvents: RegimentEvent[] = [];
    recentGallery: GalleryItem[] = [];
    // Field Dispatches (notifications) are also deferred.
    dispatches: { tone: string; title: string; body: string; time: string }[] = [];
    pendingApplications: Application[] = [];

    // The signed-in member's real honors (hydrated from /auth/me + /members/:id).
    currentMember: {
        name: string;
        rank: string;
        chevrons: number;
        attendanceRate: number;
        medals: HonorMedal[];
    } = { name: '', rank: '—', chevrons: 0, attendanceRate: 0, medals: [] };

    ngOnInit(): void {
        const user = this.auth.currentUser();
        if (user) {
            this.currentMember.name = user.name;
            this.currentMember.rank = user.rank ?? '—';
        }

        // Load the caller's own roster record for chevrons/attendance/medals.
        if (user?.isMember) {
            this.membersService
                .getById(user.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((m) => {
                    this.currentMember = {
                        name: m.name,
                        rank: m.rank || '—',
                        chevrons: m.chevrons,
                        attendanceRate: m.attendanceRate ?? 0,
                        medals: (m.medalAwards ?? []).map((a) => ({
                            letter: a.glyph,
                            ribbon: a.ribbon,
                            title: a.title,
                        })),
                    };
                });
        }

        // Recruitment review preview — only meaningful for staff who can manage it.
        if (this.auth.hasCapability('manage_applications')) {
            this.applicationsService
                .getAll('pending')
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((apps) => {
                    this.pendingApplications = apps.slice(0, this.PREVIEW_COUNT);
                });
        }
    }
}
