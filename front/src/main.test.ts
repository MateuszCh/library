import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./js/library', () => ({
    Library: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
        this['init'] = vi.fn().mockResolvedValue(undefined);
    })
}));

describe('main.ts', () => {
    let observerCallback: IntersectionObserverCallback;
    const mockObserve = vi.fn();

    beforeEach(() => {
        vi.resetModules();
        mockObserve.mockClear();
        vi.stubGlobal(
            'IntersectionObserver',
            vi.fn().mockImplementation(function (
                this: Record<string, unknown>,
                cb: IntersectionObserverCallback
            ) {
                observerCallback = cb;
                this['observe'] = mockObserve;
            })
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    it('creates Library and calls init()', async () => {
        document.body.innerHTML = '';
        await import('./main');
        const { Library } = await import('./js/library');
        expect(Library).toHaveBeenCalled();
        const instance = vi.mocked(Library).mock.instances[0] as Record<string, unknown>;
        expect(vi.mocked(instance['init'] as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });

    it('sets up IntersectionObserver when tools element exists', async () => {
        document.body.innerHTML = '<div id="tools"></div>';
        await import('./main');
        expect(mockObserve).toHaveBeenCalled();
    });

    it('adds is-sticky class when sentinel scrolls above viewport', async () => {
        document.body.innerHTML = '<div id="tools"></div>';
        await import('./main');
        const formPanel = document.getElementById('tools')!;
        observerCallback(
            [{ boundingClientRect: { top: -10 }, isIntersecting: false } as IntersectionObserverEntry],
            {} as IntersectionObserver
        );
        expect(formPanel.classList.contains('is-sticky')).toBe(true);
    });

    it('removes is-sticky class when sentinel is back in view', async () => {
        document.body.innerHTML = '<div id="tools"></div>';
        await import('./main');
        const formPanel = document.getElementById('tools')!;
        observerCallback(
            [{ boundingClientRect: { top: -10 }, isIntersecting: false } as IntersectionObserverEntry],
            {} as IntersectionObserver
        );
        observerCallback(
            [{ boundingClientRect: { top: 10 }, isIntersecting: false } as IntersectionObserverEntry],
            {} as IntersectionObserver
        );
        expect(formPanel.classList.contains('is-sticky')).toBe(false);
    });

    it('removes is-sticky when entry is intersecting', async () => {
        document.body.innerHTML = '<div id="tools"></div>';
        await import('./main');
        const formPanel = document.getElementById('tools')!;
        observerCallback(
            [{ boundingClientRect: { top: -10 }, isIntersecting: false } as IntersectionObserverEntry],
            {} as IntersectionObserver
        );
        observerCallback(
            [{ boundingClientRect: { top: -10 }, isIntersecting: true } as IntersectionObserverEntry],
            {} as IntersectionObserver
        );
        expect(formPanel.classList.contains('is-sticky')).toBe(false);
    });

    it('does not set up observer when tools element is absent', async () => {
        document.body.innerHTML = '';
        await import('./main');
        expect(mockObserve).not.toHaveBeenCalled();
    });

    it('does not throw when IntersectionObserver is unavailable', async () => {
        vi.unstubAllGlobals();
        vi.stubGlobal('IntersectionObserver', undefined);
        document.body.innerHTML = '<div id="tools"></div>';
        await expect(import('./main')).resolves.toBeDefined();
    });
});
