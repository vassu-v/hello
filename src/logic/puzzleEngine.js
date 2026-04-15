/**
 * Puzzle Engine for Blueprint
 *
 * Logic to handle grid, zones (rectangles), and clue verification.
 */

export const CLUE_TYPES = {
  NUMBER: 'NUMBER',
  SQUARE: 'SQUARE',
  TALL: 'TALL',
  WIDE: 'WIDE',
  ANY: 'ANY'
};

/**
 * Validates if a rectangle (zone) satisfies a specific clue.
 * @param {Object} zone - { x1, y1, x2, y2 }
 * @param {Object} clue - { type, value }
 * @returns {boolean}
 */
export function validateZone(zone, clue) {
  const width = Math.abs(zone.x2 - zone.x1) + 1;
  const height = Math.abs(zone.y2 - zone.y1) + 1;
  const area = width * height;

  switch (clue.type) {
    case CLUE_TYPES.NUMBER:
      return area === clue.value;
    case CLUE_TYPES.SQUARE:
      return width === height && (clue.value ? area === clue.value : true);
    case CLUE_TYPES.TALL:
      return height > width && (clue.value ? area === clue.value : true);
    case CLUE_TYPES.WIDE:
      return width > height && (clue.value ? area === clue.value : true);
    case CLUE_TYPES.ANY:
      return clue.value ? area === clue.value : true;
    default:
      return false;
  }
}

/**
 * Checks if two rectangles overlap.
 */
export function doZonesOverlap(z1, z2) {
  return !(z1.x2 < z2.x1 || z1.x1 > z2.x2 || z1.y2 < z2.y1 || z1.y1 > z2.y2);
}

/**
 * Checks if the entire grid is covered by non-overlapping zones.
 */
export function isGridComplete(gridSize, zones) {
  const totalCells = gridSize * gridSize;
  let coveredArea = 0;

  for (let i = 0; i < zones.length; i++) {
    const z1 = zones[i];
    const width = Math.abs(z1.x2 - z1.x1) + 1;
    const height = Math.abs(z1.y2 - z1.y1) + 1;
    coveredArea += width * height;

    for (let j = i + 1; j < zones.length; j++) {
      if (doZonesOverlap(z1, zones[j])) return false;
    }
  }

  return coveredArea === totalCells;
}

/**
 * Full puzzle validation.
 */
export function validatePuzzle(gridSize, clues, zones) {
  // 1. Each clue must be inside exactly one zone
  // 2. Each zone must contain exactly one clue
  // 3. Each zone must satisfy its clue
  // 4. Grid must be full and no overlaps

  if (clues.length !== zones.length) return false;

  for (const clue of clues) {
    const containingZone = zones.find(z =>
      clue.x >= Math.min(z.x1, z.x2) &&
      clue.x <= Math.max(z.x1, z.x2) &&
      clue.y >= Math.min(z.y1, z.y2) &&
      clue.y <= Math.max(z.y1, z.y2)
    );

    if (!containingZone) return false;
    if (!validateZone(containingZone, clue)) return false;
  }

  return isGridComplete(gridSize, zones);
}
