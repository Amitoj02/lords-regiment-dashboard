import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../../core/services/seo.service';

/**
 * A real 404 (T-0287).
 *
 * ── WHY THIS IS AN SEO FIX AND NOT A NICETY ─────────────────────────────────
 * The wildcard route used to be `{ path: '**', redirectTo: '/home' }`, and
 * nginx 200s every path so the SPA can handle it. Between them, every typo,
 * every renamed handle and every deleted profile returned `200 OK` with the
 * landing page — a soft-404. Google treats a URL pattern that behaves that way
 * as untrustworthy and de-prioritises the whole pattern, which for `/u/*` would
 * have meant the profiles were the thing that stopped being indexed.
 *
 * This page cannot itself return a 404 status — no client-side route can — so
 * it does the two things it CAN do: say plainly that the page does not exist,
 * and carry `noindex`. The honest status codes come from the crawler shell at
 * `/api/seo/*`, which is what search engines are rewritten to and which
 * propagates the API's real 404 and 410.
 */
@Component({
    selector: 'hf-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class NotFoundComponent implements OnInit {
    private readonly seo = inject(SeoService);

    ngOnInit(): void {
        this.seo.apply({
            title: 'Page not found',
            description: 'That page is no longer here.',
            noIndex: true,
        });
    }
}
