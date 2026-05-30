import { describe, it, expect, afterEach } from 'vitest';
import { RecordsListing } from './records-listing';
import { RecordModel } from './record';
import type { IFilterGroupConfig } from '../filter-group/filter-group';

afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
});

describe('RecordsListing', () => {
    it('has type "record"', () => {
        const r = new RecordsListing();
        expect(r.type).toBe('record');
    });

    it('has title "Records"', () => {
        const r = new RecordsListing();
        expect((r as any).title).toBe('Records');
    });

    it('uses RecordModel as modelConstructor', () => {
        const r = new RecordsListing();
        expect((r as any).modelConstructor).toBe(RecordModel);
    });

    it('has 6 sort option configs', () => {
        const r = new RecordsListing();
        expect((r as any).sortOptionsConfigs).toHaveLength(6);
    });

    it('sort config labels are correct', () => {
        const r = new RecordsListing();
        const labels: string[] = (r as any).sortOptionsConfigs.map(
            (c: { label: string }) => c.label
        );
        expect(labels).toContain('Recent purchases');
        expect(labels).toContain('Oldest purchases');
        expect(labels).toContain('Newest');
        expect(labels).toContain('Oldest');
        expect(labels).toContain('A-Z');
        expect(labels).toContain('Z-A');
    });

    it('exactly one config is marked as default', () => {
        const r = new RecordsListing();
        const defaults = (r as any).sortOptionsConfigs.filter(
            (c: { default?: boolean }) => c.default
        );
        expect(defaults).toHaveLength(1);
        expect(defaults[0].label).toBe('Recent purchases');
    });

    it('has 4 filter group configs', () => {
        const r = new RecordsListing();
        expect((r as any).filterGroupsConfigs).toHaveLength(4);
    });

    it('filter config codes cover genre, artist, release_date, purchase_date', () => {
        const r = new RecordsListing();
        const codes = (r as any).filterGroupsConfigs.map(
            (c: IFilterGroupConfig) => c.code
        );
        expect(codes).toContain('genre');
        expect(codes).toContain('artist');
        expect(codes).toContain('release_date');
        expect(codes).toContain('purchase_date');
    });

    it('genre filter has type string[]', () => {
        const r = new RecordsListing();
        const genre = (r as any).filterGroupsConfigs.find(
            (c: IFilterGroupConfig) => c.code === 'genre'
        );
        expect(genre?.type).toBe('string[]');
    });

    it('artist filter has type string', () => {
        const r = new RecordsListing();
        const artist = (r as any).filterGroupsConfigs.find(
            (c: IFilterGroupConfig) => c.code === 'artist'
        );
        expect(artist?.type).toBe('string');
    });

    it('year filters have type year', () => {
        const r = new RecordsListing();
        const configs: IFilterGroupConfig[] = (r as any).filterGroupsConfigs;
        const yearConfigs = configs.filter(c => c.type === 'year');
        expect(yearConfigs).toHaveLength(2);
    });
});
