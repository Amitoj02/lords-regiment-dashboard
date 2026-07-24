import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
    standalone: false,
    selector: 'hf-topbar',
    templateUrl: './topbar.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent {
    @Input() crumbs: string[] = [];

    /** Emitted when the mobile hamburger is tapped (opens the sidebar drawer). */
    @Output() menu = new EventEmitter<void>();

    get crumbPairs(): { label: string; isLast: boolean }[] {
        return this.crumbs.map((label, i) => ({
            label,
            isLast: i === this.crumbs.length - 1,
        }));
    }
}
