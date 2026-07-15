import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Placeholder for MVP-deferred surfaces (events, gallery, audit, settings, bot).
 * These screens are designed but not yet wired to the API, so — rather than ship
 * fabricated/stub data at go-live — their routes render this until the feature
 * lands. The feature name comes from the route's `data.feature`.
 */
@Component({
    selector: 'hf-coming-soon',
    standalone: false,
    template: `
        <div class="coming-soon">
            <div class="panel coming-soon__card">
                <div class="coming-soon__badge">Coming soon</div>
                <h1>{{ feature }}</h1>
                <p>
                    This section is part of a later milestone and isn't available yet. The core
                    dashboard — roster, recruitment, ranks &amp; medals — is live now.
                </p>
                <a routerLink="/app/dashboard" class="btn btn-secondary btn-sm"
                    >Back to dashboard</a
                >
            </div>
        </div>
    `,
    styles: [
        `
            .coming-soon {
                min-height: 60vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }
            .coming-soon__card {
                max-width: 34rem;
                text-align: center;
                padding: 2.5rem 2rem;
            }
            .coming-soon__badge {
                display: inline-block;
                font-family: var(--mono, monospace);
                font-size: 0.7rem;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--t-300);
                border: 1px solid var(--rule-2);
                border-radius: var(--r-2, 6px);
                padding: 0.25rem 0.6rem;
                margin-bottom: 1rem;
            }
            .coming-soon__card h1 {
                font-family: var(--serif);
                margin: 0 0 0.75rem;
            }
            .coming-soon__card p {
                color: var(--t-300);
                margin-bottom: 1.5rem;
            }
        `,
    ],
})
export class ComingSoonComponent {
    private readonly route = inject(ActivatedRoute);
    readonly feature: string = (this.route.snapshot.data['feature'] as string) ?? 'This section';
}
