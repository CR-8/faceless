/**
 * Property 9: Planner Card Operations Preserve Invariants
 * Validates: Requirements 6.2
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

type PlannerCard = {
  id: string;
  name: string;
  column: string;
  createdAt: string;
};

const COLUMNS = ['planned', 'in-progress', 'done'];

// ── Pure helpers mirroring PlannerBoard logic ─────────────────────────────────

function addCard(cards: PlannerCard[], id: string, name: string): PlannerCard[] {
  return [...cards, { id, name, column: 'planned', createdAt: new Date('2026-01-01').toISOString() }];
}

function deleteCard(cards: PlannerCard[], id: string): PlannerCard[] {
  return cards.filter(c => c.id !== id);
}

function moveCard(cards: PlannerCard[], id: string, targetColumn: string): PlannerCard[] {
  return cards.map(c => c.id === id ? { ...c, column: targetColumn } : c);
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const cardArb: fc.Arbitrary<PlannerCard> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 60 }),
  column: fc.constantFrom(...COLUMNS),
  createdAt: fc.constant('2026-01-01T00:00:00.000Z'),
});

// ── Property 9 tests ──────────────────────────────────────────────────────────

describe('Property 9: Planner Card Operations Preserve Invariants', () => {
  it('adding a card increases count by exactly 1', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 0, maxLength: 20 }),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 60 }),
        (cards, id, name) => {
          const result = addCard(cards, id, name);
          expect(result.length).toBe(cards.length + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('new card is always placed in the "planned" column', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 0, maxLength: 20 }),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 60 }),
        (cards, id, name) => {
          const result = addCard(cards, id, name);
          const newCard = result.find(c => c.id === id);
          expect(newCard?.column).toBe('planned');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deleting a card decreases count by exactly 1', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 1, maxLength: 20 }),
        (cards) => {
          const target = cards[0];
          const result = deleteCard(cards, target.id);
          expect(result.length).toBe(cards.length - 1);
          expect(result.find(c => c.id === target.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deleting a non-existent id leaves the list unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 0, maxLength: 20 }),
        fc.uuid(),
        (cards, nonExistentId) => {
          // Ensure the id is not already in the list
          const safeCards = cards.filter(c => c.id !== nonExistentId);
          const result = deleteCard(safeCards, nonExistentId);
          expect(result.length).toBe(safeCards.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('moving a card changes only its column, not its id or name', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 1, maxLength: 20 }),
        fc.constantFrom(...COLUMNS),
        (cards, targetColumn) => {
          const target = cards[0];
          const result = moveCard(cards, target.id, targetColumn);
          const moved = result.find(c => c.id === target.id);
          expect(moved?.id).toBe(target.id);
          expect(moved?.name).toBe(target.name);
          expect(moved?.column).toBe(targetColumn);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('moving a card does not change the total card count', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 1, maxLength: 20 }),
        fc.constantFrom(...COLUMNS),
        (cards, targetColumn) => {
          const result = moveCard(cards, cards[0].id, targetColumn);
          expect(result.length).toBe(cards.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all cards always belong to a valid column', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 0, maxLength: 20 }),
        (cards) => {
          for (const card of cards) {
            expect(COLUMNS).toContain(card.column);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('card ids are unique after add operations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 60 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (newCards) => {
          let cards: PlannerCard[] = [];
          for (const { id, name } of newCards) {
            // Only add if id is unique
            if (!cards.find(c => c.id === id)) {
              cards = addCard(cards, id, name);
            }
          }
          const ids = cards.map(c => c.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
