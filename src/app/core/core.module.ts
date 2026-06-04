import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from './services/auth.service';
import { MembersService } from './services/members.service';
import { EventsService } from './services/events.service';
import { ApplicationsService } from './services/applications.service';
import { GalleryService } from './services/gallery.service';
import { AuditService } from './services/audit.service';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

@NgModule({
  imports: [CommonModule],
  providers: [
    AuthService,
    MembersService,
    EventsService,
    ApplicationsService,
    GalleryService,
    AuditService,
    AuthGuard,
    AdminGuard,
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it in AppModule only.');
    }
  }
}
