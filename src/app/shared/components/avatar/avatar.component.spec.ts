import { AvatarComponent } from './avatar.component';

describe('AvatarComponent (T-0119/T-0122)', () => {
    let component: AvatarComponent;

    beforeEach(() => {
        component = new AvatarComponent();
        component.name = 'Jane Doe';
    });

    it('derives two-letter initials from the name', () => {
        expect(component.initials).toBe('JD');
    });

    it('shows the image when an avatarUrl is set and it has not failed', () => {
        component.avatarUrl = 'https://cdn/a.png';
        expect(component.showImage).toBe(true);
    });

    it('falls back to initials when there is no avatarUrl', () => {
        component.avatarUrl = null;
        expect(component.showImage).toBe(false);
    });

    it('falls back to initials when the image fails to load', () => {
        component.avatarUrl = 'https://cdn/broken.png';
        component.onImgError();
        expect(component.showImage).toBe(false);
    });

    it('emits avatarClick only when clickable (T-0122)', () => {
        const spy = jasmine.createSpy('click');
        component.avatarClick.subscribe(spy);
        component.onClick();
        expect(spy).not.toHaveBeenCalled();
        component.clickable = true;
        component.onClick();
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
