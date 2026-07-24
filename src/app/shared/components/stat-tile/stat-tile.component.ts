import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    standalone: false,
    selector: 'hf-stat-tile',
    templateUrl: './stat-tile.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./stat-tile.component.scss'],
})
export class StatTileComponent {
    @Input() label = '';
    @Input() value = '';
    @Input() foot = '';
    @Input() accent = '';
}
