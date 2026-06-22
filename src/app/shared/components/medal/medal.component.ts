import { Component, Input } from '@angular/core';
import { MedalRibbon } from '../../../core/models/member.model';

interface RibbonColors {
    top: string;
    bottom: string;
    stripes?: string[];
}

const RIBBON_MAP: Record<MedalRibbon, RibbonColors> = {
    blue: { top: '#2b5fa8', bottom: '#1a3d6e' },
    red: { top: '#a63028', bottom: '#6e1c17' },
    gold: { top: '#c69a45', bottom: '#7a5a1a' },
    green: { top: '#4a7a3a', bottom: '#2c4a22' },
    tricolor: { top: '#1a3d6e', bottom: '#6e1c17', stripes: ['#1a3d6e', '#f0f0f0', '#a63028'] },
};

@Component({
    standalone: false,
    selector: 'hf-medal',
    templateUrl: './medal.component.html',
    styleUrls: ['./medal.component.scss'],
})
export class MedalComponent {
    @Input() ribbon: MedalRibbon = 'blue';
    @Input() letter = '';
    @Input() title = '';

    get ribbonColors(): RibbonColors {
        return RIBBON_MAP[this.ribbon] ?? RIBBON_MAP.blue;
    }

    get ribbonStyle(): string {
        const c = this.ribbonColors;
        if (this.ribbon === 'tricolor' && c.stripes) {
            const thirds = 100 / c.stripes.length;
            const stops = c.stripes
                .map((s, i) => `${s} ${i * thirds}%, ${s} ${(i + 1) * thirds}%`)
                .join(', ');
            return `linear-gradient(90deg, ${stops})`;
        }
        return `linear-gradient(180deg, ${c.top}, ${c.bottom})`;
    }
}
