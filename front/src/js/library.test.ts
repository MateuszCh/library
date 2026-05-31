import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./listing/records/records-listing', () => ({
    RecordsListing: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
        this['init'] = vi.fn().mockResolvedValue(undefined);
    })
}));

import { Library } from './library';
import { RecordsListing } from './listing/records/records-listing';

afterEach(() => {
    vi.mocked(RecordsListing).mockClear();
});

describe('Library', () => {
    it('creates a RecordsListing instance on init()', async () => {
        const lib = new Library();
        await lib.init();
        expect(RecordsListing).toHaveBeenCalledOnce();
    });

    it('calls init() on the created RecordsListing', async () => {
        const lib = new Library();
        await lib.init();
        const instance = vi.mocked(RecordsListing).mock.instances[0] as unknown as Record<string, unknown>;
        expect(vi.mocked(instance['init'] as ReturnType<typeof vi.fn>)).toHaveBeenCalledOnce();
    });
});
