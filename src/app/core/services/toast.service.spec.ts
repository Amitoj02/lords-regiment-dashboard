import { fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        service = new ToastService();
    });

    it('starts with an empty queue', () => {
        expect(service.toasts()).toEqual([]);
    });

    it('error()/success()/info() append toasts with the right variant', () => {
        service.error('boom');
        service.success('yay');
        service.info('fyi');
        const toasts = service.toasts();
        expect(toasts.map((t) => t.variant)).toEqual(['error', 'success', 'info']);
        expect(toasts.map((t) => t.message)).toEqual(['boom', 'yay', 'fyi']);
    });

    it('assigns monotonically increasing ids', () => {
        service.info('a');
        service.info('b');
        const [first, second] = service.toasts();
        expect(second.id).toBeGreaterThan(first.id);
    });

    it('dismiss(id) removes only the matching toast', () => {
        service.info('a');
        service.info('b');
        const id = service.toasts()[0].id;
        service.dismiss(id);
        expect(service.toasts().map((t) => t.message)).toEqual(['b']);
    });

    it('auto-dismisses after the ttl', fakeAsync(() => {
        service.error('gone soon');
        expect(service.toasts().length).toBe(1);
        tick(4500);
        expect(service.toasts().length).toBe(0);
    }));
});
