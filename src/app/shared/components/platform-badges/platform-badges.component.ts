import { Component, Input } from '@angular/core';

interface PlatformConfig {
    key: string;
    label: string;
    color: string;
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
    { key: 'steam', label: 'Steam', color: '#1b2838' },
    { key: 'xbox', label: 'Xbox', color: '#107c10' },
    { key: 'ps', label: 'PS', color: '#003791' },
];

@Component({
    standalone: false,
    selector: 'hf-platform-badges',
    templateUrl: './platform-badges.component.html',
    styleUrls: ['./platform-badges.component.scss'],
})
export class PlatformBadgesComponent {
    @Input() platforms: string[] = [];

    get activePlatforms(): PlatformConfig[] {
        return PLATFORM_CONFIGS.filter((p) => this.platforms.includes(p.key));
    }
}
