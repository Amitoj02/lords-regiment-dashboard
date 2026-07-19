import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    variant: 'error' | 'success' | 'info';
    message: string;
}

/**
 * Lightweight signal-based toast queue. Components read `toasts()` and render a
 * stack; anything can enqueue via error()/success()/info(). Each toast
 * auto-dismisses after `ttl` ms, or immediately via dismiss(id).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
    readonly toasts = signal<Toast[]>([]);

    private seq = 0;

    private push(variant: Toast['variant'], message: string, ttl = 4500): void {
        const id = ++this.seq;
        this.toasts.update((list) => [...list, { id, variant, message }]);
        setTimeout(() => this.dismiss(id), ttl);
    }

    error(message: string): void {
        this.push('error', message);
    }

    success(message: string): void {
        this.push('success', message);
    }

    info(message: string): void {
        this.push('info', message);
    }

    dismiss(id: number): void {
        this.toasts.update((list) => list.filter((t) => t.id !== id));
    }
}
