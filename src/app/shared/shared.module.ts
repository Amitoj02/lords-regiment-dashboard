import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AvatarComponent } from './components/avatar/avatar.component';
import { BadgeComponent } from './components/badge/badge.component';
import { NoticeComponent } from './components/notice/notice.component';
import { MedalComponent } from './components/medal/medal.component';
import { RankIconComponent } from './components/rank-icon/rank-icon.component';
import { CrestDividerComponent } from './components/crest-divider/crest-divider.component';
import { PlatformBadgesComponent } from './components/platform-badges/platform-badges.component';
import { EventStatusComponent } from './components/event-status/event-status.component';
import { StatTileComponent } from './components/stat-tile/stat-tile.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';
import { ComingSoonComponent } from './components/coming-soon/coming-soon.component';
import { GalleryCardComponent } from './components/gallery-card/gallery-card.component';
import { ToastComponent } from './components/toast/toast.component';

const SHARED_COMPONENTS = [
    AvatarComponent,
    BadgeComponent,
    NoticeComponent,
    MedalComponent,
    RankIconComponent,
    CrestDividerComponent,
    PlatformBadgesComponent,
    EventStatusComponent,
    StatTileComponent,
    AppShellComponent,
    SidebarComponent,
    TopbarComponent,
    BottomNavComponent,
    ComingSoonComponent,
    GalleryCardComponent,
    ToastComponent,
];

@NgModule({
    declarations: SHARED_COMPONENTS,
    imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
    exports: [...SHARED_COMPONENTS, CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
})
export class SharedModule {}
