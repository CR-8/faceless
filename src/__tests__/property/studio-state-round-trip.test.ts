/**
 * Property 3: Studio State Round-Trip
 * Validates: Requirements 3.4, 13.2, 13.3
 *
 * Any valid StudioStatePayload survives JSON serialization/deserialization
 * without data loss — critical for JSONB storage in Supabase.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { StudioStatePayload } from '@/types/db';

// Arbitrary for StudioStatePayload
const studioStateArb: fc.Arbitrary<StudioStatePayload> = fc.record({
  bgId: fc.string({ minLength: 1, maxLength: 50 }),
  leftCharId: fc.string({ minLength: 1, maxLength: 50 }),
  rightCharId: fc.string({ minLength: 1, maxLength: 50 }),
  script: fc.string({ maxLength: 5000 }),
  format: fc.constantFrom('9:16', '16:9', '1:1'),
  duration: fc.integer({ min: 1, max: 600 }),
  voiceL: fc.string({ minLength: 1, maxLength: 50 }),
  voiceR: fc.string({ minLength: 1, maxLength: 50 }),
  subAlign: fc.constantFrom('left', 'center', 'right'),
  subSize: fc.integer({ min: 8, max: 72 }),
  subPos: fc.integer({ min: 0, max: 100 }),
  subColor: fc.stringMatching(/^[0-9a-f]{6}$/).map(h => `#${h}`),
  subFont: fc.string({ minLength: 1, maxLength: 50 }),
  charSize: fc.integer({ min: 50, max: 300 }),
  charPosV: fc.integer({ min: 0, max: 100 }),
});

describe('Property 3: Studio State Round-Trip', () => {
  it('StudioStatePayload survives JSON serialization round-trip', () => {
    fc.assert(
      fc.property(studioStateArb, (payload) => {
        const serialized = JSON.stringify(payload);
        const deserialized = JSON.parse(serialized) as StudioStatePayload;
        expect(deserialized).toEqual(payload);
      }),
      { numRuns: 100 }
    );
  });

  it('all required fields are preserved after round-trip', () => {
    fc.assert(
      fc.property(studioStateArb, (payload) => {
        const roundTripped = JSON.parse(JSON.stringify(payload)) as StudioStatePayload;
        const requiredKeys: (keyof StudioStatePayload)[] = [
          'bgId', 'leftCharId', 'rightCharId', 'script', 'format',
          'duration', 'voiceL', 'voiceR', 'subAlign', 'subSize',
          'subPos', 'subColor', 'subFont', 'charSize', 'charPosV',
        ];
        for (const key of requiredKeys) {
          expect(roundTripped).toHaveProperty(key);
          expect(roundTripped[key]).toStrictEqual(payload[key]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('format field only accepts valid values after round-trip', () => {
    fc.assert(
      fc.property(studioStateArb, (payload) => {
        const roundTripped = JSON.parse(JSON.stringify(payload)) as StudioStatePayload;
        expect(['9:16', '16:9', '1:1']).toContain(roundTripped.format);
      }),
      { numRuns: 100 }
    );
  });
});
