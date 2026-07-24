import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export type BadgeVariant = 'brass' | 'laurel' | 'ox' | 'blue' | 'parch' | 'solid' | '';

@Component({
    standalone: false,
    selector: 'hf-badge',
    templateUrl: './badge.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./badge.component.scss'],
})
export class BadgeComponent {
    @Input() variant: BadgeVariant = '';
    @Input() dot = false;
    @Input() text = '';
}
