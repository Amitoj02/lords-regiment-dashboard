import { TestBed } from '@angular/core/testing';
import { VideoPosterService } from './video-poster.service';

/**
 * The load-bearing property here is NOT that a poster is produced — it is that a
 * failure to produce one is always survivable. A rejected promise or a thrown
 * error would take the member's actual upload down with it, to save a thumbnail.
 */
describe('VideoPosterService', () => {
    let service: VideoPosterService;

    const fileOfType = (type: string): File =>
        new File([new Uint8Array([0, 1, 2, 3])], 'clip', { type });

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(VideoPosterService);
    });

    it('ignores a non-video file without touching the DOM', async () => {
        const created = spyOn(document, 'createElement').and.callThrough();
        await expectAsync(service.capture(fileOfType('image/png'))).toBeResolvedTo(null);
        expect(created).not.toHaveBeenCalledWith('video');
    });

    it('resolves null — never rejects — when the video cannot be decoded', async () => {
        // A codec the browser cannot decode is an ordinary outcome, not an error
        // the submit flow should ever see.
        const video = document.createElement('video');
        spyOn(document, 'createElement').and.returnValue(video);
        queueMicrotask(() => video.onerror?.(new Event('error')));

        await expectAsync(service.capture(fileOfType('video/mp4'))).toBeResolvedTo(null);
    });

    it('resolves null when the video reports no decodable dimensions', async () => {
        const video = document.createElement('video');
        spyOn(document, 'createElement').and.returnValue(video);
        // videoWidth/videoHeight stay 0 on a detached element with no real source.
        queueMicrotask(() => video.onloadedmetadata?.(new Event('loadedmetadata')));

        await expectAsync(service.capture(fileOfType('video/webm'))).toBeResolvedTo(null);
    });

    it('releases the object URL even on the failure path', async () => {
        const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
        const video = document.createElement('video');
        spyOn(document, 'createElement').and.returnValue(video);
        queueMicrotask(() => video.onerror?.(new Event('error')));

        await service.capture(fileOfType('video/mp4'));

        // Without this the buffer for every rejected clip stays alive for the
        // lifetime of the tab.
        expect(revoke).toHaveBeenCalled();
    });
});
