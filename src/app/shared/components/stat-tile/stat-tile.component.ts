import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'hf-stat-tile',
  templateUrl: './stat-tile.component.html',
  styleUrls: ['./stat-tile.component.scss'],
})
export class StatTileComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() foot = '';
  @Input() accent = '';
}
