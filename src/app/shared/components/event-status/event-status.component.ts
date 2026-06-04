import { Component, Input } from '@angular/core';
import { EventStatus } from '../../../core/models/event.model';

@Component({
  standalone: false,
  selector: 'hf-event-status',
  templateUrl: './event-status.component.html',
  styleUrls: ['./event-status.component.scss'],
})
export class EventStatusComponent {
  @Input() status: EventStatus = 'upcoming';

  get variant(): string {
    switch (this.status) {
      case 'ongoing':  return 'laurel';
      case 'upcoming': return 'blue';
      case 'previous': return 'ox';
      default:         return '';
    }
  }

  get label(): string {
    switch (this.status) {
      case 'ongoing':  return 'Live';
      case 'upcoming': return 'Upcoming';
      case 'previous': return 'Concluded';
      default:         return '';
    }
  }
}
