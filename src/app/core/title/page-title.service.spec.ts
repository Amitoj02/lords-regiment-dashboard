import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { PageTitleService } from './page-title.service';

describe('PageTitleService', () => {
    let service: PageTitleService;
    let title: Title;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PageTitleService);
        title = TestBed.inject(Title);
        spyOn(title, 'setTitle');
    });

    it('suffixes a named page with the site name', () => {
        expect(service.format('Gallery')).toBe('Gallery | Lords Regiment');
    });

    it('falls back to the bare base title when a page has no name', () => {
        // The invariant is "never a dangling separator and never blank" — an absent
        // name must yield the site name alone, whichever empty-ish form it arrives in.
        expect(service.format(undefined)).toBe('Lords Regiment');
        expect(service.format(null)).toBe('Lords Regiment');
        expect(service.format('')).toBe('Lords Regiment');
        expect(service.format('   ')).toBe('Lords Regiment');
    });

    it('trims a page name rather than embedding its whitespace', () => {
        expect(service.format('  Events  ')).toBe('Events | Lords Regiment');
    });

    it('writes the formatted title through the platform Title service', () => {
        service.setPageTitle('Siege of Ostend');
        expect(title.setTitle).toHaveBeenCalledWith('Siege of Ostend | Lords Regiment');
    });

    it('writes the base title when asked to set an empty page name', () => {
        service.setPageTitle(null);
        expect(title.setTitle).toHaveBeenCalledWith('Lords Regiment');
    });
});
