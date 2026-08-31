/**
 * The single source of truth for the PELAGIA descent.
 *
 * Every asset path, every line of scene copy, every depth reading and every
 * foreground placement lives here. Components read from this file; they never
 * hard-code a path or a string.
 */

import { mediaUrl } from '@/config/media';

export type SceneAlignment = 'left' | 'center' | 'right';

/** Parallax bands. Values are the % of a scroll pass the object travels. */
export type ParallaxDepth = 'far' | 'mid' | 'near';

export interface ForegroundPlacement {
  /** Key into FOREGROUND_ASSETS. */
  asset: ForegroundAssetKey;
  /** Parallax band — far drifts least, near drifts most. */
  depth: ParallaxDepth;
  /** Percentage offsets relative to the stage, used as CSS `left`/`top`. */
  x: number;
  y: number;
  /** Rendered width as a percentage of stage width. */
  width: number;
  opacity: number;
  /** Base rotation in degrees; the animation adds at most a few more. */
  rotate?: number;
  /** Mirror horizontally. */
  flip?: boolean;
  blur?: number;
  /** Stacking within the foreground layer. */
  z?: number;
  /** Accessible description; an empty string marks the object as decorative. */
  alt: string;
}

export interface SceneDefinition {
  id: string;
  number: number;
  name: string;
  eyebrow: string;
  headline: string;
  description: string;
  depth: number;
  poster: string;
  idleVideo: string;
  accent: string;
  alignment: SceneAlignment;
  foregrounds?: string[];
  transitionToNext?: string;
  /** Short label for the right-hand scene navigator. */
  shortName: string;
  /** Alt text for the poster still. */
  posterAlt: string;
  /** Foreground composition for the fixed media stage. */
  composition?: ForegroundPlacement[];
  /** Extra scroll length (vh) appended to this hold for editorial inserts. */
  editorialHeight?: number;
}

/* ------------------------------------------------------------------ *
 * Foreground cutouts — transparent PNGs, exact filenames as found on disk.
 * ------------------------------------------------------------------ */
export const FOREGROUND_ASSETS = {
  blueRock: '/sea/foregrounds/blue_rock.webp',
  denseFishSchool: '/sea/foregrounds/dense_fish_school_final.webp',
  orangeTubeCoral: '/sea/foregrounds/orange_tube_coral.webp',
  pinkBranchingCoral: '/sea/foregrounds/pink_branching_coral.webp',
  biolabVessel: '/sea/foregrounds/regenerated_biolab_vessel.webp',
  diver: '/sea/foregrounds/regenerated_diver.webp',
  jellyfish: '/sea/foregrounds/regenerated_jellyfish.webp',
  submersible: '/sea/foregrounds/regenerated_submersible.webp',
  ringFishSchool: '/sea/foregrounds/ring_fish_school_final.webp',
  scatteredFishSchool: '/sea/foregrounds/scattered_fish_school_final.webp',
  seagrass: '/sea/foregrounds/seagrass.webp',
  turquoiseDomeDevice: '/sea/foregrounds/turquoise_dome_device.webp',
} as const;

export type ForegroundAssetKey = keyof typeof FOREGROUND_ASSETS;

/** Movement range per parallax band, as a % of viewport height. */
export const PARALLAX_RANGE: Record<ParallaxDepth, number> = {
  far: 6,
  mid: 13,
  near: 23,
};

/* ------------------------------------------------------------------ *
 * Editorial insert heights (vh).
 *
 * Shared by the section components and by the lazy-loading slots that reserve
 * their space, so a code-split chunk arriving late cannot shift the layout.
 * ------------------------------------------------------------------ */
export const EDITORIAL_VH = {
  mission: 66,
  researchCard: 62,
  impact: 78,
  journal: 84,
  finalCta: 80,
} as const;

/* ------------------------------------------------------------------ *
 * Scenes
 * ------------------------------------------------------------------ */
type SceneSeed = Omit<SceneDefinition, 'foregrounds'>;

const SCENE_SEEDS: SceneSeed[] = [
  {
    id: 'surface',
    number: 1,
    name: 'Surface Expedition',
    shortName: 'Surface',
    eyebrow: 'EXPEDITION 07 / NORTH PACIFIC',
    headline: 'The ocean is still\nmostly unknown.',
    description:
      'PELAGIA develops new ways to explore, understand and protect the living systems beneath the surface.',
    depth: 0,
    poster: '/sea/posters/scene-01-surface.webp',
    posterAlt: 'A research vessel on a calm North Pacific surface at first light.',
    idleVideo: '/sea/idle/scene-01-surface.mp4',
    accent: '#55E6EA',
    alignment: 'left',
    transitionToNext: 'transition-01-02',
  },
  {
    id: 'midwater',
    number: 2,
    name: 'Open Midwater',
    shortName: 'Midwater',
    eyebrow: '01 / THE OPEN OCEAN',
    headline: 'Between sunlight\nand the unknown.',
    description:
      'The open ocean supports an immense network of life, much of it still undocumented and unprotected.',
    depth: 80,
    poster: '/sea/posters/scene-02-midwater.webp',
    posterAlt: 'A sunlit open midwater column crossed by drifting schools of fish.',
    idleVideo: '/sea/idle/scene-02-midwater.mp4',
    accent: '#55E6EA',
    alignment: 'center',
    transitionToNext: 'transition-02-03',
    editorialHeight: EDITORIAL_VH.mission,
    composition: [
      {
        asset: 'scatteredFishSchool',
        depth: 'far',
        x: 6,
        y: 14,
        width: 34,
        opacity: 0.4,
        blur: 2.5,
        z: 1,
        alt: '',
      },
      {
        asset: 'denseFishSchool',
        depth: 'near',
        x: 60,
        y: 50,
        width: 46,
        opacity: 0.76,
        rotate: -2,
        z: 3,
        alt: 'A dense school of fish turning through open midwater.',
      },
    ],
  },
  {
    id: 'canyon',
    number: 3,
    name: 'Twilight Canyon',
    shortName: 'Canyon',
    eyebrow: '02 / TWILIGHT ZONE',
    headline: 'Following signals\ninto deeper water.',
    description:
      'Autonomous systems map fragile habitats without disturbing the environments they were built to study.',
    depth: 420,
    poster: '/sea/posters/scene-03-canyon.webp',
    posterAlt: 'A twilight-zone canyon wall descending into darker water.',
    idleVideo: '/sea/idle/scene-03-canyon.mp4',
    accent: '#0B68E8',
    alignment: 'left',
    transitionToNext: 'transition-03-04',
    editorialHeight: EDITORIAL_VH.researchCard,
    composition: [
      {
        asset: 'blueRock',
        depth: 'far',
        x: -8,
        y: 44,
        width: 42,
        opacity: 0.48,
        blur: 3,
        z: 1,
        alt: '',
      },
      {
        asset: 'diver',
        depth: 'mid',
        x: 64,
        y: 38,
        width: 34,
        opacity: 0.86,
        rotate: 2,
        z: 3,
        alt: 'A research diver descending along the canyon wall.',
      },
    ],
  },
  {
    id: 'bioluminescent',
    number: 4,
    name: 'Bioluminescent Discovery',
    shortName: 'Bioluminescent',
    eyebrow: '03 / LIVING LIGHT',
    headline: 'Life has invented\nits own language.',
    description:
      'Bioluminescent organisms reveal biological systems shaped by darkness, pressure and time.',
    depth: 780,
    poster: '/sea/posters/scene-04-bioluminescent.webp',
    posterAlt: 'Bioluminescent organisms glowing in near-total darkness.',
    idleVideo: '/sea/idle/scene-04-bioluminescent.mp4',
    accent: '#55E6EA',
    alignment: 'right',
    transitionToNext: 'transition-04-05',
    editorialHeight: EDITORIAL_VH.researchCard,
    composition: [
      {
        asset: 'ringFishSchool',
        depth: 'far',
        x: 2,
        y: 20,
        width: 36,
        opacity: 0.36,
        blur: 2,
        z: 1,
        alt: '',
      },
      {
        asset: 'jellyfish',
        depth: 'near',
        x: 4,
        y: 46,
        width: 40,
        opacity: 0.88,
        rotate: -3,
        z: 3,
        alt: 'A translucent jellyfish pulsing with its own light.',
      },
    ],
  },
  {
    id: 'nursery',
    number: 5,
    name: 'Coral Restoration Nursery',
    shortName: 'Nursery',
    eyebrow: '04 / RESTORATION',
    headline: 'Research that\nreturns life.',
    description:
      'Our nurseries combine environmental monitoring with coral cultivation to support long-term reef recovery.',
    depth: 1050,
    poster: '/sea/posters/scene-05-nursery.webp',
    posterAlt: 'A coral restoration nursery with cultivated fragments on frames.',
    idleVideo: '/sea/idle/scene-05-nursery.mp4',
    accent: '#FF796B',
    alignment: 'left',
    transitionToNext: 'transition-05-06',
    editorialHeight: EDITORIAL_VH.researchCard,
    composition: [
      {
        asset: 'seagrass',
        depth: 'near',
        x: 56,
        y: 60,
        width: 52,
        opacity: 0.7,
        rotate: 2,
        z: 3,
        alt: '',
      },
      {
        asset: 'pinkBranchingCoral',
        depth: 'mid',
        x: -6,
        y: 54,
        width: 38,
        opacity: 0.84,
        flip: true,
        z: 2,
        alt: 'Pink branching coral cultivated on a restoration frame.',
      },
    ],
  },
  {
    id: 'laboratory',
    number: 6,
    name: 'Seafloor Laboratory',
    shortName: 'Laboratory',
    eyebrow: '05 / PERMANENT RESEARCH',
    headline: 'A laboratory built\ninside the ecosystem.',
    description:
      'Long-duration observation gives researchers a clearer view of how ocean systems respond to change.',
    depth: 1480,
    poster: '/sea/posters/scene-06-laboratory.webp',
    posterAlt: 'A permanent seafloor laboratory lit against the surrounding dark.',
    idleVideo: '/sea/idle/scene-06-laboratory.mp4',
    accent: '#0B68E8',
    alignment: 'right',
    transitionToNext: 'transition-06-07',
    editorialHeight: EDITORIAL_VH.impact,
    composition: [
      {
        asset: 'biolabVessel',
        depth: 'mid',
        x: 0,
        y: 48,
        width: 36,
        opacity: 0.8,
        rotate: -2,
        z: 2,
        alt: 'A scientific submersible docked beside the seafloor laboratory.',
      },
    ],
  },
  {
    id: 'hydrothermal',
    number: 7,
    name: 'Hydrothermal Station',
    shortName: 'Hydrothermal',
    eyebrow: '06 / EXTREME ENVIRONMENTS',
    headline: 'At the edge\nof possible life.',
    description:
      'Hydrothermal ecosystems show how living systems survive without sunlight under extreme heat and pressure.',
    depth: 2700,
    poster: '/sea/posters/scene-07-hydrothermal.webp',
    posterAlt: 'A hydrothermal vent field venting mineral-rich plumes.',
    idleVideo: '/sea/idle/scene-07-hydrothermal.mp4',
    accent: '#FF796B',
    alignment: 'left',
    transitionToNext: 'transition-07-08',
    editorialHeight: EDITORIAL_VH.journal,
    composition: [
      {
        asset: 'blueRock',
        depth: 'near',
        x: 58,
        y: 58,
        width: 50,
        opacity: 0.62,
        flip: true,
        rotate: 3,
        z: 3,
        alt: '',
      },
    ],
  },
  {
    id: 'observatory',
    number: 8,
    name: 'Abyssal Observatory',
    shortName: 'Observatory',
    eyebrow: '07 / THE LONG VIEW',
    headline: 'The ocean is not\nan empty frontier.',
    description:
      'It is a connected living system—and understanding it may determine how successfully we protect our future.',
    depth: 3900,
    poster: '/sea/posters/scene-08-observatory.webp',
    posterAlt: 'An abyssal observatory holding station in the deep dark.',
    idleVideo: '/sea/idle/scene-08-observatory.mp4',
    accent: '#55E6EA',
    alignment: 'center',
    editorialHeight: EDITORIAL_VH.finalCta,
  },
];

/**
 * `foregrounds` is derived from `composition` so the preloader and the
 * renderer can never drift apart.
 */
export const scenes: SceneDefinition[] = SCENE_SEEDS.map((seed) => ({
  ...seed,
  poster: mediaUrl(seed.poster),
  idleVideo: mediaUrl(seed.idleVideo),
  foregrounds: seed.composition?.map((placement) => mediaUrl(FOREGROUND_ASSETS[placement.asset])),
}));

export const sceneCount = scenes.length;

export const transitionIds: string[] = scenes
  .map((scene) => scene.transitionToNext)
  .filter((id): id is string => Boolean(id));

/* ------------------------------------------------------------------ *
 * Hero + closing actions
 * ------------------------------------------------------------------ */
export const heroActions = [
  { label: 'Begin the descent', href: '#scene-midwater', primary: true },
  { label: 'View our mission', href: '#mission', primary: false },
] as const;

export const observatoryAction = {
  label: 'Support the next expedition',
  href: '#final-cta',
} as const;

/* ------------------------------------------------------------------ *
 * Header navigation — every target is a section of this one page.
 * ------------------------------------------------------------------ */
export const primaryNav = [
  { label: 'Mission', href: '#mission' },
  { label: 'Expeditions', href: '#scene-canyon' },
  { label: 'Research', href: '#research' },
  { label: 'Impact', href: '#impact' },
  { label: 'Journal', href: '#journal' },
] as const;

/* ------------------------------------------------------------------ *
 * Editorial content woven into the descent
 * ------------------------------------------------------------------ */
export const missionStatement =
  'We explore the ocean not to claim it, but to understand what its survival requires.';

export interface ResearchCard {
  id: string;
  category: string;
  title: string;
  description: [string, string];
  index: string;
  asset: ForegroundAssetKey;
  alt: string;
  accent: string;
  /** Scene id during whose hold this card is revealed. */
  scene: string;
}

export const researchCards: ResearchCard[] = [
  {
    id: 'habitat-mapping',
    category: 'AUTONOMOUS SYSTEMS',
    title: 'Autonomous Habitat Mapping',
    description: [
      'Free-swimming vehicles survey canyon walls on repeat passes,',
      'building centimetre-scale models without ever touching the habitat.',
    ],
    index: 'AHM-02 / 412–640 m',
    asset: 'submersible',
    alt: 'An autonomous survey submersible used for habitat mapping.',
    accent: '#0B68E8',
    scene: 'canyon',
  },
  {
    id: 'light-research',
    category: 'BIOLOGICAL OPTICS',
    title: 'Biological Light Research',
    description: [
      'Low-noise optical arrays record emission spectra in place,',
      'resolving signals far below the threshold of the human eye.',
    ],
    index: 'BLR-03 / 690–840 m',
    asset: 'turquoiseDomeDevice',
    alt: 'A turquoise optical dome instrument used to record bioluminescence.',
    accent: '#55E6EA',
    scene: 'bioluminescent',
  },
  {
    id: 'coral-systems',
    category: 'RESTORATION SCIENCE',
    title: 'Regenerative Coral Systems',
    description: [
      'Cultivated fragments are matched to donor genotype and thermal history,',
      'then returned to the reef under continuous environmental monitoring.',
    ],
    index: 'RCS-01 / 12–1,050 m',
    asset: 'orangeTubeCoral',
    alt: 'Orange tube coral cultivated in a restoration nursery.',
    accent: '#FF796B',
    scene: 'nursery',
  },
];

export interface ImpactStat {
  value: string;
  unit: string;
  label: string;
  note: string;
}

export const impactStats: ImpactStat[] = [
  {
    value: '38',
    unit: 'sites',
    label: 'Active monitoring sites',
    note: 'Continuous instrumentation across six ocean basins.',
  },
  {
    value: '14',
    unit: 'habitats',
    label: 'Restoration habitats',
    note: 'Reef systems under active cultivation and review.',
  },
  {
    value: '2.8',
    unit: 'million',
    label: 'Environmental observations',
    note: 'Openly published readings since the first expedition.',
  },
  {
    value: '11',
    unit: 'partners',
    label: 'International research partners',
    note: 'Shared instrumentation, shared data, shared authorship.',
  },
];

export interface JournalEntry {
  date: string;
  depth: string;
  location: string;
  title: string;
  description: string;
}

export const journalEntries: JournalEntry[] = [
  {
    date: '14 March',
    depth: '812 m',
    location: 'Cascadia Margin',
    title: 'A signal that repeats',
    description:
      'Three nights of optical recording returned the same emission interval. We are still not certain what is answering.',
  },
  {
    date: '02 April',
    depth: '1,486 m',
    location: 'Station Kepler-6',
    title: 'Nine months on the seafloor',
    description:
      'The laboratory closed its first full monitoring year. Sediment temperature has climbed 0.4°C since deployment.',
  },
  {
    date: '27 May',
    depth: '2,704 m',
    location: 'Endeavour Field',
    title: 'Heat, pressure, and company',
    description:
      'A vent that mapped as dormant last season is active again, already carrying a dense community along its base.',
  },
];

export const finalCta = {
  headline: 'THE DEEPEST DISCOVERIES\nARE STILL AHEAD.',
  actions: [
    { label: 'Support the expedition', primary: true },
    { label: 'Read the field journal', primary: false },
  ],
} as const;

export const footerLinks = {
  navigate: [
    { label: 'Mission', href: '#mission' },
    { label: 'Research', href: '#research' },
    { label: 'Expeditions', href: '#scene-canyon' },
    { label: 'Journal', href: '#journal' },
  ],
  connect: [
    { label: 'Contact', href: '#final-cta' },
    { label: 'Instagram', href: '#final-cta' },
    { label: 'Vimeo', href: '#final-cta' },
    { label: 'Privacy', href: '#final-cta' },
  ],
} as const;

/* ------------------------------------------------------------------ *
 * Scroll timeline geometry — must match src/styles/globals.css
 * ------------------------------------------------------------------ */
export const HOLD_VH = 100;
export const TRANSITION_VH = 70;

/** Media spine only: 8 holds + 7 transitions. */
export const mediaSpineVh = sceneCount * HOLD_VH + transitionIds.length * TRANSITION_VH;

/** Full document height in vh, including the editorial inserts. */
export const totalTimelineVh =
  mediaSpineVh + scenes.reduce((sum, scene) => sum + (scene.editorialHeight ?? 0), 0);
