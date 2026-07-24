import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    standalone: false,
    selector: 'hf-toast',
    templateUrl: './toast.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./toast.component.scss'],
})
export class ToastComponent {
    protected readonly toastService = inject(ToastService);
}
