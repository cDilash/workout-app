/**
 * SVG Path Data for Front Body View
 *
 * Minimalist human silhouette with distinct muscle regions.
 * ViewBox: 0 0 200 400 (width: 200, height: 400)
 *
 * Each region maps to muscle groups used in exercise filtering.
 */

export interface MuscleRegionPath {
  id: string;
  path: string;
  label: string;
  /** Maps to muscleGroup filter keys */
  filterKeys: string[];
  /** Center point for label positioning */
  center: { x: number; y: number };
}

// SVG viewBox dimensions
export const BODY_VIEWBOX = {
  width: 200,
  height: 400,
};

/**
 * Front view muscle regions
 * Simplified anatomical shapes for touch targets
 */
export const FRONT_VIEW_REGIONS: MuscleRegionPath[] = [
  // HEAD (not tappable, just for silhouette)
  {
    id: 'head',
    path: 'M100 10 C120 10, 130 30, 130 50 C130 70, 120 85, 100 85 C80 85, 70 70, 70 50 C70 30, 80 10, 100 10 Z',
    label: '',
    filterKeys: [],
    center: { x: 100, y: 47 },
  },

  // NECK
  {
    id: 'neck',
    path: 'M90 85 L110 85 L112 105 L88 105 Z',
    label: '',
    filterKeys: [],
    center: { x: 100, y: 95 },
  },

  // TRAPS (upper back, visible from front)
  {
    id: 'traps',
    path: 'M70 105 L88 105 L88 120 L70 130 Z M130 105 L112 105 L112 120 L130 130 Z',
    label: 'Traps',
    filterKeys: ['Back', 'Shoulders'],
    center: { x: 100, y: 115 },
  },

  // SHOULDERS - Left
  {
    id: 'shoulder_l',
    path: 'M45 110 C35 115, 30 130, 35 145 L55 145 L60 120 C55 110, 50 108, 45 110 Z',
    label: 'Delts',
    filterKeys: ['Shoulders'],
    center: { x: 45, y: 128 },
  },

  // SHOULDERS - Right
  {
    id: 'shoulder_r',
    path: 'M155 110 C165 115, 170 130, 165 145 L145 145 L140 120 C145 110, 150 108, 155 110 Z',
    label: 'Delts',
    filterKeys: ['Shoulders'],
    center: { x: 155, y: 128 },
  },

  // CHEST
  {
    id: 'chest',
    path: 'M60 120 L140 120 L145 145 L140 170 L130 175 L100 180 L70 175 L60 170 L55 145 Z',
    label: 'Chest',
    filterKeys: ['Chest'],
    center: { x: 100, y: 150 },
  },

  // BICEPS - Left
  {
    id: 'bicep_l',
    path: 'M35 148 L55 148 L55 195 L40 200 L30 195 L30 160 Z',
    label: 'Biceps',
    filterKeys: ['Biceps'],
    center: { x: 42, y: 172 },
  },

  // BICEPS - Right
  {
    id: 'bicep_r',
    path: 'M165 148 L145 148 L145 195 L160 200 L170 195 L170 160 Z',
    label: 'Biceps',
    filterKeys: ['Biceps'],
    center: { x: 158, y: 172 },
  },

  // TRICEPS - Left (outer arm, partially visible)
  {
    id: 'tricep_l',
    path: 'M30 148 L35 148 L30 160 L25 175 L20 160 Z',
    label: 'Triceps',
    filterKeys: ['Triceps'],
    center: { x: 27, y: 160 },
  },

  // TRICEPS - Right
  {
    id: 'tricep_r',
    path: 'M170 148 L165 148 L170 160 L175 175 L180 160 Z',
    label: 'Triceps',
    filterKeys: ['Triceps'],
    center: { x: 173, y: 160 },
  },

  // FOREARMS - Left
  {
    id: 'forearm_l',
    path: 'M25 195 L45 200 L50 245 L40 255 L20 245 Z',
    label: 'Forearms',
    filterKeys: ['Biceps'],
    center: { x: 35, y: 225 },
  },

  // FOREARMS - Right
  {
    id: 'forearm_r',
    path: 'M175 195 L155 200 L150 245 L160 255 L180 245 Z',
    label: 'Forearms',
    filterKeys: ['Biceps'],
    center: { x: 165, y: 225 },
  },

  // ABS / CORE
  {
    id: 'abs',
    path: 'M70 175 L130 175 L135 200 L130 250 L115 260 L85 260 L70 250 L65 200 Z',
    label: 'Core',
    filterKeys: ['Core'],
    center: { x: 100, y: 218 },
  },

  // QUADS - Left
  {
    id: 'quad_l',
    path: 'M65 260 L90 260 L85 320 L80 350 L55 350 L50 310 Z',
    label: 'Quads',
    filterKeys: ['Quads'],
    center: { x: 70, y: 305 },
  },

  // QUADS - Right
  {
    id: 'quad_r',
    path: 'M135 260 L110 260 L115 320 L120 350 L145 350 L150 310 Z',
    label: 'Quads',
    filterKeys: ['Quads'],
    center: { x: 130, y: 305 },
  },

  // CALVES - Left
  {
    id: 'calf_l',
    path: 'M55 355 L80 355 L75 400 L55 400 L50 380 Z',
    label: 'Calves',
    filterKeys: ['Calves'],
    center: { x: 65, y: 378 },
  },

  // CALVES - Right
  {
    id: 'calf_r',
    path: 'M145 355 L120 355 L125 400 L145 400 L150 380 Z',
    label: 'Calves',
    filterKeys: ['Calves'],
    center: { x: 135, y: 378 },
  },
];

/**
 * Body outline for the background silhouette
 */
export const BODY_OUTLINE = `
  M100 10
  C125 10, 135 35, 135 55
  C135 75, 120 90, 110 95
  L115 105
  C145 105, 175 120, 180 150
  L185 200
  L180 250
  L160 255
  L155 245
  L170 195
  L170 155
  L165 150
  L145 150
  L140 175
  L140 250
  L150 315
  L150 360
  L145 400
  L120 400
  L120 360
  L115 315
  L115 265
  L100 265
  L85 265
  L85 315
  L80 360
  L80 400
  L55 400
  L50 360
  L50 315
  L60 250
  L60 175
  L55 150
  L35 150
  L30 155
  L30 195
  L45 245
  L40 255
  L20 250
  L15 200
  L20 150
  C25 120, 55 105, 85 105
  L90 95
  C80 90, 65 75, 65 55
  C65 35, 75 10, 100 10
  Z
`;

/**
 * Get region by ID
 */
export function getRegionById(id: string): MuscleRegionPath | undefined {
  return FRONT_VIEW_REGIONS.find((r) => r.id === id);
}

/**
 * Get regions by filter key (muscle group)
 */
export function getRegionsByFilter(filterKey: string): MuscleRegionPath[] {
  return FRONT_VIEW_REGIONS.filter((r) => r.filterKeys.includes(filterKey));
}

/**
 * Get all unique filter keys
 */
export function getAllFilterKeys(): string[] {
  const keys = new Set<string>();
  for (const region of FRONT_VIEW_REGIONS) {
    for (const key of region.filterKeys) {
      keys.add(key);
    }
  }
  return Array.from(keys);
}
