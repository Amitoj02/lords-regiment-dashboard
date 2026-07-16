import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

export type LegalDoc = 'terms' | 'privacy' | 'guidelines';

/**
 * Public legal pages (T-0124): Terms, Privacy, and Community Guidelines. Content
 * is deliberately obligation-free — it makes no data-collection promises and no
 * warranties, so operating the dashboard creates no privacy/T&C obligations. One
 * component renders all three, selected by the route's `data.doc`.
 */
@Component({
    selector: 'hf-legal',
    templateUrl: './legal.component.html',
    styleUrls: ['./legal.component.scss'],
    standalone: false,
})
export class LegalComponent {
    private readonly route = inject(ActivatedRoute);

    get doc(): LegalDoc {
        return (this.route.snapshot.data['doc'] as LegalDoc) ?? 'terms';
    }
}
