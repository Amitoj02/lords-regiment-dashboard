import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export type NoticeVariant = 'warn' | 'err' | 'ok' | 'info' | '';

@Component({
    standalone: false,
    selector: 'hf-notice',
    templateUrl: './notice.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./notice.component.scss'],
})
export class NoticeComponent {
    @Input() variant: NoticeVariant = '';
    @Input() title = '';
    @Input() body = '';
}
