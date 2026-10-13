/**
 * Circuit board themes and wire color palettes.
 * Written in TypeScript (ESM) for Bun.
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  bg: string;
  boardBg: string;
  boardBorder: string;
  gridLine: string;
  silkscreen: string;
  textMuted: string;
  traceBase: string;
  traceAccent: string;
  copper: string;
  // Levels: 0=idle pad, 1=low (Blue), 2=clk (Yellow), 3=data (Green), 4=pwr (Red)
  wireLevels: string[];
  wireColors: string[];
  pulseColor: string;
}

export const THEMES: Record<string, Theme> = {
  breadboard: {
    id: 'breadboard',
    name: 'Breadboard Wire',
    description: 'Realistic electronics jumper wire colors: Red, Blue, Green, Yellow',
    bg: '#070b0e',
    boardBg: '#0e1720',
    boardBorder: '#1c2e40',
    gridLine: '#142230',
    silkscreen: '#8ea3b5',
    textMuted: '#587084',
    traceBase: '#1a2c3d',
    traceAccent: '#38bdf8',
    copper: '#e28743',
    wireLevels: [
      '#162330', // Inactive pad
      '#2563eb', // 1-2 commits: Logic Low (Blue jumper wire)
      '#eab308', // 3-5 commits: Clock / Signal (Yellow jumper wire)
      '#22c55e', // 6-8 commits: Data Flow (Green jumper wire)
      '#ef4444'  // 9+ commits: High Power VCC (Red jumper wire)
    ],
    wireColors: ['#ef4444', '#2563eb', '#22c55e', '#eab308', '#f97316', '#a855f7'],
    pulseColor: '#60a5fa'
  },
  pcb: {
    id: 'pcb',
    name: 'Classic Green PCB',
    description: 'Industrial FR4 solder mask with gold ENIG pads and copper traces',
    bg: '#030b06',
    boardBg: '#07180e',
    boardBorder: '#113520',
    gridLine: '#0a2314',
    silkscreen: '#86efac',
    textMuted: '#447a56',
    traceBase: '#133e24',
    traceAccent: '#4ade80',
    copper: '#eab308',
    wireLevels: [
      '#0d2617',
      '#15803d',
      '#16a34a',
      '#22c55e',
      '#4ade80'
    ],
    wireColors: ['#22c55e', '#4ade80', '#eab308', '#86efac', '#15803d'],
    pulseColor: '#86efac'
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'High-contrast neon cyan, hot pink, and ultraviolet signals',
    bg: '#07030d',
    boardBg: '#120921',
    boardBorder: '#29144d',
    gridLine: '#1c0d36',
    silkscreen: '#c084fc',
    textMuted: '#7853a8',
    traceBase: '#2d1652',
    traceAccent: '#ec4899',
    copper: '#f43f5e',
    wireLevels: [
      '#1f1038',
      '#06b6d4', // Cyan
      '#ec4899', // Hot Pink
      '#eab308', // Amber
      '#a855f7'  // Purple
    ],
    wireColors: ['#06b6d4', '#ec4899', '#a855f7', '#eab308', '#3b82f6'],
    pulseColor: '#f472b6'
  },
  amber: {
    id: 'amber',
    name: 'Vintage Amber CRT',
    description: '1980s phosphor CRT oscilloscope and retro vacuum tube circuitry',
    bg: '#0a0602',
    boardBg: '#160e05',
    boardBorder: '#301f0c',
    gridLine: '#211508',
    silkscreen: '#f59e0b',
    textMuted: '#855318',
    traceBase: '#331e0a',
    traceAccent: '#fbbf24',
    copper: '#d97706',
    wireLevels: [
      '#241508',
      '#78350f',
      '#b45309',
      '#d97706',
      '#f59e0b'
    ],
    wireColors: ['#f59e0b', '#d97706', '#b45309', '#fbbf24', '#f97316'],
    pulseColor: '#fde68a'
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix Digital Rain',
    description: 'Pure terminal green hacker aesthetic with digital bus conduits',
    bg: '#010803',
    boardBg: '#041308',
    boardBorder: '#0b2b13',
    gridLine: '#081f0e',
    silkscreen: '#22c55e',
    textMuted: '#2f693e',
    traceBase: '#0c2e15',
    traceAccent: '#4ade80',
    copper: '#16a34a',
    wireLevels: [
      '#071c0c',
      '#15803d',
      '#16a34a',
      '#22c55e',
      '#4ade80'
    ],
    wireColors: ['#22c55e', '#4ade80', '#86efac', '#16a34a', '#10b981'],
    pulseColor: '#bbf7d0'
  },
  solarized: {
    id: 'solarized',
    name: 'Solarized Dark',
    description: 'Precision engineered Ethan Schoonover color system for circuits',
    bg: '#00212b',
    boardBg: '#073642',
    boardBorder: '#0e4a5a',
    gridLine: '#093c4a',
    silkscreen: '#93a1a1',
    textMuted: '#586e75',
    traceBase: '#0c4958',
    traceAccent: '#2aa198',
    copper: '#b58900',
    wireLevels: [
      '#0a404f',
      '#268bd2',
      '#b58900',
      '#2aa198',
      '#cb4b16'
    ],
    wireColors: ['#268bd2', '#2aa198', '#b58900', '#cb4b16', '#859900'],
    pulseColor: '#93a1a1'
  },
  monochrome: {
    id: 'monochrome',
    name: 'Stealth Titanium',
    description: 'Sleek matte-dark board with titanium traces and white LEDs',
    bg: '#08080a',
    boardBg: '#141418',
    boardBorder: '#27272e',
    gridLine: '#1a1a20',
    silkscreen: '#a1a1aa',
    textMuted: '#52525b',
    traceBase: '#272730',
    traceAccent: '#e4e4e7',
    copper: '#71717a',
    wireLevels: [
      '#1f1f26',
      '#52525b',
      '#71717a',
      '#a1a1aa',
      '#f4f4f5'
    ],
    wireColors: ['#f4f4f5', '#a1a1aa', '#71717a', '#d4d4d8', '#e4e4e7'],
    pulseColor: '#ffffff'
  }
};

export function getTheme(themeName: string = 'breadboard', customOptions: any = {}): Theme {
  const base = THEMES[themeName.toLowerCase()] || THEMES.breadboard;
  const merged: Theme = { ...base, wireLevels: [...base.wireLevels], wireColors: [...base.wireColors] };

  if (customOptions.bg) merged.bg = normalizeHex(customOptions.bg);
  if (customOptions.boardBg) merged.boardBg = normalizeHex(customOptions.boardBg);
  if (customOptions.accent) {
    merged.traceAccent = normalizeHex(customOptions.accent);
    merged.pulseColor = normalizeHex(customOptions.accent);
  }
  if (customOptions.trace) merged.traceBase = normalizeHex(customOptions.trace);

  if (customOptions.wireColors) {
    const list = String(customOptions.wireColors)
      .split(',')
      .map(c => normalizeHex(c.trim()))
      .filter(Boolean);
    if (list.length >= 4) {
      merged.wireLevels = [merged.wireLevels[0], ...list.slice(0, 4)];
      merged.wireColors = list;
    }
  }

  return merged;
}

export function normalizeHex(str: string): string {
  if (!str) return str;
  str = str.trim();
  if (!str.startsWith('#') && /^[0-9a-f]{3,8}$/i.test(str)) {
    return '#' + str;
  }
  return str;
}
