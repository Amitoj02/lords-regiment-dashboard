import { Component, OnInit } from '@angular/core';
import { RegimentEvent } from '../../../core/models/event.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { EventsService } from '../../../core/services/events.service';
import { GalleryService } from '../../../core/services/gallery.service';

@Component({
  selector: 'hf-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  standalone: false,
})
export class LandingComponent implements OnInit {
  upcomingEvents: RegimentEvent[] = [];
  galleryItems: GalleryItem[] = [];

  stats = [
    { value: '84', label: 'Active Members' },
    { value: '312', label: 'Events Fielded' },
    { value: '11', label: 'Campaigns Won' },
  ];

  officers = [
    { name: 'Alistair Holcombe', rank: 'Colonel', chevrons: 6, initials: 'AH' },
    { name: 'Diego Vasquez', rank: 'Major', chevrons: 5, initials: 'DV' },
    { name: 'Rhett Asher', rank: 'Captain', chevrons: 4, initials: 'RA' },
    { name: 'Jameson Nolt', rank: 'Lieutenant', chevrons: 3, initials: 'JN' },
  ];

  constructor(
    private eventsService: EventsService,
    private galleryService: GalleryService,
  ) {}

  ngOnInit(): void {
    this.eventsService.getAll().subscribe(events => {
      this.upcomingEvents = events.filter(e => e.status === 'upcoming').slice(0, 3);
    });
    this.galleryService.getAll().subscribe(items => {
      this.galleryItems = items.filter(i => i.status === 'approved' && i.thumbnailUrl).slice(0, 3);
    });
  }
}
