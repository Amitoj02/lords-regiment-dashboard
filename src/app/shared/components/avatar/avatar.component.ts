import { Component, Input } from '@angular/core';

@Component({
    standalone: false,
    selector: 'hf-avatar',
    templateUrl: './avatar.component.html',
    styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent {
    @Input() name = '';
    @Input() size = 32;
    @Input() online = false;

    get initials(): string {
        return this.name
            .split(' ')
            .map((s) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    get bg(): string {
        const h = Array.from(this.name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
        return `oklch(0.32 0.04 ${h})`;
    }

    get hostStyle(): Record<string, string> {
        return {
            width: `${this.size}px`,
            height: `${this.size}px`,
            'min-width': `${this.size}px`,
            'font-size': `${Math.round(this.size * 0.38)}px`,
        };
    }

    get dotSize(): number {
        return Math.max(7, Math.round(this.size * 0.26));
    }
}
