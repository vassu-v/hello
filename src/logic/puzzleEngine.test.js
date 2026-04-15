import { describe, it, expect } from 'vitest';
import { validateZone, CLUE_TYPES, doZonesOverlap, isGridComplete, validatePuzzle } from './puzzleEngine';

describe('Puzzle Engine', () => {
  describe('validateZone', () => {
    it('validates NUMBER clues correctly', () => {
      const clue = { type: CLUE_TYPES.NUMBER, value: 4 };
      expect(validateZone({ x1: 0, y1: 0, x2: 1, y2: 1 }, clue)).toBe(true);
      expect(validateZone({ x1: 0, y1: 0, x2: 0, y2: 3 }, clue)).toBe(true);
      expect(validateZone({ x1: 0, y1: 0, x2: 2, y2: 2 }, clue)).toBe(false);
    });

    it('validates SQUARE clues correctly', () => {
      const clue = { type: CLUE_TYPES.SQUARE };
      expect(validateZone({ x1: 0, y1: 0, x2: 1, y2: 1 }, clue)).toBe(true);
      expect(validateZone({ x1: 0, y1: 0, x2: 1, y2: 2 }, clue)).toBe(false);
    });

    it('validates TALL clues correctly', () => {
      const clue = { type: CLUE_TYPES.TALL };
      expect(validateZone({ x1: 0, y1: 0, x2: 0, y2: 2 }, clue)).toBe(true);
      expect(validateZone({ x1: 0, y1: 0, x2: 1, y2: 1 }, clue)).toBe(false);
    });
  });

  describe('doZonesOverlap', () => {
    it('detects overlapping zones', () => {
      const z1 = { x1: 0, y1: 0, x2: 2, y2: 2 };
      const z2 = { x1: 2, y1: 2, x2: 4, y2: 4 };
      expect(doZonesOverlap(z1, z2)).toBe(true);
    });

    it('detects non-overlapping zones', () => {
      const z1 = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const z2 = { x1: 2, y1: 0, x2: 3, y2: 1 };
      expect(doZonesOverlap(z1, z2)).toBe(false);
    });
  });

  describe('isGridComplete', () => {
    it('checks for full coverage', () => {
      const zones = [
        { x1: 0, y1: 0, x2: 1, y2: 1 },
        { x1: 0, y1: 2, x2: 1, y2: 2 }
      ];
      // 2x3 grid, but only 2x2 area covered + 1 cell gap. Actually 2x3 needs 6 cells.
      // 0,0 to 1,1 is 4 cells. 0,2 to 1,2 is 2 cells. Total 6.
      // Wait, 0,0 to 1,1 covers (0,0),(1,0),(0,1),(1,1).
      // 0,2 to 1,2 covers (0,2),(1,2).
      // Total 6 cells. Grid size 3? No, gridSize 2x3 is not supported here, it's square.
      // If gridSize is 2, area is 4.
      expect(isGridComplete(2, [{ x1: 0, y1: 0, x2: 1, y2: 1 }])).toBe(true);
    });
  });
});
