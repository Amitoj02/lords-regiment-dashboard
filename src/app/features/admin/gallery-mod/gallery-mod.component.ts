import { Component, OnInit } from '@angular/core';

interface GalleryModItem {
  id: string;
  thumbnailColor: string;
  caption: string;
  submittedBy: string;
  submittedAt: string;
  event: string;
  tags: string[];
  taggedMembers: string[];
  thumbnails: string[];
}

@Component({
  selector: 'app-gallery-mod',
  templateUrl: './gallery-mod.component.html',
  styleUrls: ['./gallery-mod.component.scss'],
  standalone: false,
})
export class GalleryModComponent implements OnInit {
  activeTab: 'pending' | 'approved' | 'declined' = 'pending';
  selectedId = 'gm1';
  declineReason = '';

  items: GalleryModItem[] = [
    {
      id: 'gm1',
      thumbnailColor: '#3a4a5c',
      caption: 'Siege Defense — Northern Wall, June 2026',
      submittedBy: 'Mara Erskine',
      submittedAt: '2026-06-04T06:00:00Z',
      event: 'Grand Autumn Campaign',
      tags: ['siege', 'defense', 'june-2026'],
      taggedMembers: ['Jameson Nolt', 'Alistair Holcombe', 'Sade Wren'],
      thumbnails: ['#3a4a5c', '#4a3a2c', '#2c3a4a'],
    },
    {
      id: 'gm2',
      thumbnailColor: '#4a3a2c',
      caption: 'Charge at Left Flank — dawn assault',
      submittedBy: 'Conrad Ashe',
      submittedAt: '2026-06-03T20:00:00Z',
      event: 'May Grand Campaign',
      tags: ['charge', 'flank'],
      taggedMembers: ['Diego Vasquez', 'Rhett Asher'],
      thumbnails: ['#4a3a2c', '#3c4a3c'],
    },
    {
      id: 'gm3',
      thumbnailColor: '#2c3a2c',
      caption: 'Artillery volley — morning fog',
      submittedBy: 'Theo Kiran',
      submittedAt: '2026-06-02T12:00:00Z',
      event: 'Officer Training Drill',
      tags: ['artillery', 'morning'],
      taggedMembers: [],
      thumbnails: ['#2c3a2c'],
    },
    {
      id: 'gm4',
      thumbnailColor: '#4a2c2c',
      caption: 'Flag capture — eastern tower',
      submittedBy: 'Yusuf Bey',
      submittedAt: '2026-06-01T18:00:00Z',
      event: 'Grand Autumn Campaign',
      tags: ['capture', 'tower'],
      taggedMembers: ['Mara Erskine'],
      thumbnails: ['#4a2c2c', '#3a2c4a'],
    },
  ];

  get selected(): GalleryModItem | undefined {
    return this.items.find(i => i.id === this.selectedId);
  }

  constructor() {}

  ngOnInit(): void {}

  approve(id: string): void {
    // TODO: approve item
  }

  decline(id: string): void {
    // TODO: decline item
  }

  skip(): void {
    const idx = this.items.findIndex(i => i.id === this.selectedId);
    if (idx < this.items.length - 1) {
      this.selectedId = this.items[idx + 1].id;
    }
  }
}
