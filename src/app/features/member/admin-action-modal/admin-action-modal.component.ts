import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'hf-admin-action-modal',
  templateUrl: './admin-action-modal.component.html',
  styleUrls: ['./admin-action-modal.component.scss'],
  standalone: false,
})
export class AdminActionModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() confirmClass = 'btn-destructive';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  confirm(): void {
    this.confirmed.emit();
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
