import { Component, Input } from '@angular/core';

@Component({
    standalone: false,
    selector: 'hf-chevrons',
    templateUrl: './chevrons.component.html',
    styleUrls: ['./chevrons.component.scss'],
})
export class ChevronsComponent {
    @Input() count = 0;

    get pips(): number[] {
        return Array.from({ length: Math.max(0, this.count) }, (_, i) => i);
    }
}
