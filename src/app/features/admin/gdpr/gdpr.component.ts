import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-gdpr',
  templateUrl: './gdpr.component.html',
  styleUrls: ['./gdpr.component.scss'],
  standalone: false,
})
export class GdprComponent implements OnInit {
  confirmText = '';
  checkbox1 = false;
  checkbox2 = false;

  get canExecute(): boolean {
    return this.confirmText === 'DELETE' && this.checkbox1 && this.checkbox2;
  }

  constructor() {}

  ngOnInit(): void {}

  downloadData(): void {
    // TODO: trigger data export
  }

  execute(): void {
    if (this.canExecute) {
      // TODO: initiate GDPR erasure flow
    }
  }
}
