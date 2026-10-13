/**
 * High-definition electronic circuit board renderer.
 * Produces standalone SVG with realistic PCB traces, breadboard jumper wires (Red, Blue, Green, Yellow),
 * silkscreen markings, IC chips, and electron pulse animations.
 * Written in TypeScript (ESM) for Bun.
 */

import { getTheme, type Theme } from './themes.ts';
import type { ContributionDay } from './github.ts';

export interface CircuitOptions {
  username?: string;
  year?: string;
  theme?: string;
  wireMode?: 'hybrid' | 'jumper' | 'pcb' | 'bus' | 'streak' | string;
  nodeStyle?: 'led' | 'smd' | 'pad' | 'hex' | string;
  density?: string | number;
  glow?: string | number;
  showMonths?: boolean | string;
  showDays?: boolean | string;
  showStats?: boolean | string;
  showLegend?: boolean | string;
  showChip?: boolean | string;
  animate?: boolean | string;
  wireColors?: string;
  speed?: string;
  frames?: string | number;
  scale?: string | number;
  color?: string;
  accent?: string;
  bg?: string;
  boardBg?: string;
}

interface CircuitNode {
  index: number;
  date: string;
  count: number;
  level: number;
  w: number;
  dow: number;
  x: number;
  y: number;
}

interface WireTrace {
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  opacity: number;
  showPins: boolean;
  hasPulse: boolean;
  phase: number;
  duration: string;
  pulseRadius?: number;
}

/**
 * Render a complete circuit board SVG.
 */
export function renderCircuitSvg(
  days: ContributionDay[],
  options: CircuitOptions = {},
  frameIndex: number | null = null,
  totalFrames: number = 10
): string {
  const username = (options.username || 'octocat').replace(/^@/, '');
  const year = options.year || 'last';
  const theme: Theme = getTheme(options.theme || 'breadboard', options);

  const wireMode = options.wireMode || 'hybrid';
  const nodeStyle = options.nodeStyle || 'led';
  const density = parseDensity(options.density);
  const glow = Math.min(100, Math.max(0, Number(options.glow ?? 70)));
  const showMonths = options.showMonths !== false && options.showMonths !== 'false';
  const showDays = options.showDays !== false && options.showDays !== 'false';
  const showStats = options.showStats !== false && options.showStats !== 'false';
  const showLegend = options.showLegend !== false && options.showLegend !== 'false';
  const showChip = options.showChip !== false && options.showChip !== 'false';
  const animated = options.animate !== false && options.animate !== 'false';

  if (!days || !days.length) {
    days = [{ date: new Date().toISOString().split('T')[0], count: 0, level: 0 }];
  }

  const firstDate = new Date(days[0].date + 'T00:00:00Z');
  const lastDate = new Date(days[days.length - 1].date + 'T00:00:00Z');
  const start = new Date(firstDate);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const totalDays = Math.ceil((lastDate.getTime() - start.getTime()) / 86400000) + 1;
  const weeks = Math.min(54, Math.max(52, Math.ceil(totalDays / 7)));

  const cell = 10;
  const gap = 3.5;
  const step = cell + gap;

  const leftMargin = showDays ? 44 : 26;
  const topHeaderHeight = showStats ? 48 : 22;
  const topGrid = topHeaderHeight + (showMonths ? 18 : 6);
  const gridWidth = weeks * step;
  const gridHeight = 7 * step;

  const rightMargin = 28;
  const bottomMargin = showLegend ? 34 : 16;

  const totalWidth = leftMargin + gridWidth + rightMargin;
  const totalHeight = topGrid + gridHeight + bottomMargin;

  const coords: CircuitNode[] = [];
  let maxCount = 0;
  let totalCount = 0;
  let activeDays = 0;

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const count = Number(d.count) || 0;
    totalCount += count;
    if (count > 0) activeDays++;
    if (count > maxCount) maxCount = count;

    const dt = new Date(d.date + 'T00:00:00Z');
    const offset = Math.floor((dt.getTime() - start.getTime()) / 86400000);
    const w = Math.floor(offset / 7);
    const dow = dt.getUTCDay();

    if (w < 0 || w >= weeks) continue;

    // Logic Levels: 0=idle, 1=1-2 Blue, 2=3-5 Yellow, 3=6-8 Green, 4=9+ Red
    let level = 0;
    if (count > 0) {
      if (count <= 2) level = 1;
      else if (count <= 5) level = 2;
      else if (count <= 8) level = 3;
      else level = 4;
    }

    coords.push({
      index: i,
      date: d.date,
      count,
      level,
      w,
      dow,
      x: leftMargin + w * step + cell / 2,
      y: topGrid + dow * step + cell / 2
    });
  }

  // Deterministic PRNG
  let seed = Array.from(username + year).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 42);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const traces = generateWires(coords, weeks, step, topGrid, leftMargin, density, wireMode, theme, rand);

  const isGifFrame = frameIndex !== null;
  const frameProgress = isGifFrame ? (frameIndex / totalFrames) : 0;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" role="img" aria-label="Commit Circuit for ${escapeXml(username)}">`;

  svg += `<defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.boardBg}"/>
      <stop offset="100%" stop-color="${theme.bg}"/>
    </linearGradient>
    <linearGradient id="chipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#242b35"/>
      <stop offset="100%" stop-color="#12171e"/>
    </linearGradient>
    <pattern id="pcbGrid" width="15" height="15" patternUnits="userSpaceOnUse">
      <circle cx="7.5" cy="7.5" r="0.6" fill="${theme.gridLine}" opacity="0.8"/>
    </pattern>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>`;

  // Base PCB Board
  svg += `<rect width="${totalWidth}" height="${totalHeight}" fill="${theme.bg}"/>`;
  svg += `<rect x="5" y="5" width="${totalWidth - 10}" height="${totalHeight - 10}" rx="12" fill="url(#bgGrad)" stroke="${theme.boardBorder}" stroke-width="1.5"/>`;
  svg += `<rect x="7" y="7" width="${totalWidth - 14}" height="${totalHeight - 14}" rx="10" fill="url(#pcbGrid)" opacity="0.65"/>`;

  // Mounting Holes
  const mountingHoles = [
    [16, 16],
    [totalWidth - 16, 16],
    [16, totalHeight - 16],
    [totalWidth - 16, totalHeight - 16]
  ];
  for (const [mx, my] of mountingHoles) {
    svg += `<circle cx="${mx}" cy="${my}" r="5.5" fill="none" stroke="${theme.copper}" stroke-width="1.2" opacity="0.75"/>`;
    svg += `<circle cx="${mx}" cy="${my}" r="3" fill="${theme.bg}" stroke="${theme.boardBorder}" stroke-width="0.8"/>`;
  }

  // Header
  if (showStats) {
    svg += renderSilkscreenHeader(username, year, totalCount, activeDays, maxCount, theme, showChip, leftMargin, topHeaderHeight, totalWidth, isGifFrame, frameProgress);
  }

  // Months
  if (showMonths) {
    let lastMonth = '';
    const monthsGroup: string[] = [];
    for (let w = 0; w < weeks; w++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + w * 7);
      const m = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
      if (m !== lastMonth && w < weeks - 1) {
        monthsGroup.push(`<text x="${leftMargin + w * step + 2}" y="${topGrid - 7}" fill="${theme.silkscreen}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="8.5" font-weight="600" letter-spacing="0.08em" opacity="0.85">${m}</text>`);
        lastMonth = m;
      }
    }
    svg += `<g class="months">${monthsGroup.join('')}</g>`;
  }

  // Day labels
  if (showDays) {
    const daysMeta: [string, number][] = [
      ['MON', 1],
      ['WED', 3],
      ['FRI', 5]
    ];
    let daysSvg = '';
    for (const [label, dow] of daysMeta) {
      daysSvg += `<text x="13" y="${topGrid + dow * step + cell / 2 + 3}" fill="${theme.textMuted}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="7.5" font-weight="600" opacity="0.9">${label}</text>`;
    }
    svg += `<g class="days">${daysSvg}</g>`;
  }

  // Dual Rail Bus: +5V (Red) & GND (Blue)
  const busYTop = topGrid - 15;
  const busYBottom = topGrid + 7 * step + 8;
  const railStartX = leftMargin - 10;
  const railEndX = leftMargin + weeks * step + 6;

  svg += `<path d="M${railStartX} ${busYTop} H${railEndX}" stroke="${theme.wireLevels[4]}" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>`;
  svg += `<text x="${railStartX - 2}" y="${busYTop + 2.5}" fill="${theme.wireLevels[4]}" font-family="monospace" font-size="6.5" font-weight="bold" text-anchor="end">+5V</text>`;

  svg += `<path d="M${railStartX} ${busYBottom} H${railEndX}" stroke="${theme.wireLevels[1]}" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>`;
  svg += `<text x="${railStartX - 2}" y="${busYBottom + 2.5}" fill="${theme.wireLevels[1]}" font-family="monospace" font-size="6.5" font-weight="bold" text-anchor="end">GND</text>`;

  // Traces & Wires
  svg += `<g class="traces" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
  for (const wire of traces) {
    svg += `<path d="${wire.d}" stroke="${wire.color}" stroke-width="${wire.width}" opacity="${wire.opacity}" />`;

    if (wire.showPins) {
      svg += `<circle cx="${wire.x1}" cy="${wire.y1}" r="1.6" fill="${wire.color}" opacity="0.9"/>`;
      svg += `<circle cx="${wire.x2}" cy="${wire.y2}" r="1.6" fill="${wire.color}" opacity="0.9"/>`;
    }

    if (animated && wire.hasPulse) {
      if (isGifFrame) {
        const pt = getPointAlongPath(wire, (frameProgress + wire.phase) % 1.0);
        if (pt) {
          svg += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${wire.pulseRadius || 2}" fill="${wire.color}" opacity="0.95" />`;
          svg += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${(wire.pulseRadius || 2) * 1.8}" fill="${wire.color}" opacity="0.3" />`;
        }
      } else {
        svg += `<circle r="${wire.pulseRadius || 1.8}" fill="${wire.color}" opacity="0.9">
          <animateMotion path="${wire.d}" dur="${wire.duration || '2.2s'}" repeatCount="indefinite" begin="${wire.phase * 2}s" />
        </circle>`;
      }
    }
  }
  svg += `</g>`;

  // Nodes
  svg += `<g class="nodes">`;
  for (const n of coords) {
    const isNodeActive = n.count > 0;
    const nodeColor = theme.wireLevels[n.level];

    let activePulseScale = 1;
    let nodeGlowOpacity = glow / 100;
    if (isGifFrame && isNodeActive) {
      const pulseWave = Math.sin((frameProgress * Math.PI * 2) + (n.index * 0.15));
      activePulseScale = 1 + pulseWave * 0.12;
      nodeGlowOpacity *= (0.7 + pulseWave * 0.3);
    }

    const x = n.x - cell / 2;
    const y = n.y - cell / 2;

    if (nodeStyle === 'smd') {
      if (isNodeActive && glow > 0) {
        svg += `<rect x="${(x - 2).toFixed(1)}" y="${(y - 2).toFixed(1)}" width="${cell + 4}" height="${cell + 4}" rx="2" fill="${nodeColor}" opacity="${(nodeGlowOpacity * 0.35).toFixed(2)}" filter="url(#neonGlow)"/>`;
      }
      svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${nodeColor}" opacity="${isNodeActive ? 0.95 : 0.4}" stroke="${isNodeActive ? nodeColor : theme.boardBorder}" stroke-width="0.8" data-date="${n.date}" data-count="${n.count}"/>`;
      if (isNodeActive) {
        svg += `<rect x="${n.x - 1.5}" y="${n.y - 1.5}" width="3" height="3" rx="0.5" fill="#ffffff" opacity="0.85"/>`;
      }
    } else if (nodeStyle === 'pad') {
      const radius = (cell / 2) * activePulseScale;
      if (isNodeActive && glow > 0) {
        svg += `<circle cx="${n.x}" cy="${n.y}" r="${radius + 3}" fill="${nodeColor}" opacity="${(nodeGlowOpacity * 0.3).toFixed(2)}"/>`;
      }
      svg += `<circle cx="${n.x}" cy="${n.y}" r="${radius}" fill="${isNodeActive ? nodeColor : theme.wireLevels[0]}" stroke="${isNodeActive ? theme.copper : theme.boardBorder}" stroke-width="1.2" data-date="${n.date}" data-count="${n.count}"/>`;
      svg += `<circle cx="${n.x}" cy="${n.y}" r="${radius * 0.35}" fill="${theme.bg}"/>`;
    } else if (nodeStyle === 'hex') {
      const r = (cell / 2) * activePulseScale;
      const hexPoints = getHexPoints(n.x, n.y, r);
      if (isNodeActive && glow > 0) {
        svg += `<polygon points="${hexPoints}" fill="${nodeColor}" opacity="${(nodeGlowOpacity * 0.3).toFixed(2)}"/>`;
      }
      svg += `<polygon points="${hexPoints}" fill="${nodeColor}" opacity="${isNodeActive ? 0.95 : 0.4}" stroke="${isNodeActive ? '#ffffff' : theme.boardBorder}" stroke-width="0.6" data-date="${n.date}" data-count="${n.count}"/>`;
    } else {
      // Default: 'led'
      if (isNodeActive && glow > 0) {
        svg += `<circle cx="${n.x}" cy="${n.y}" r="${(cell * 0.7 * activePulseScale).toFixed(1)}" fill="${nodeColor}" opacity="${(nodeGlowOpacity * 0.38).toFixed(2)}" filter="url(#neonGlow)"/>`;
      }
      svg += `<circle cx="${n.x}" cy="${n.y}" r="${cell / 2}" fill="${theme.boardBg}" stroke="${isNodeActive ? nodeColor : theme.boardBorder}" stroke-width="0.9" data-date="${n.date}" data-count="${n.count}"/>`;
      svg += `<circle cx="${n.x}" cy="${n.y}" r="${(cell / 2 - 1.5) * activePulseScale}" fill="${nodeColor}" opacity="${isNodeActive ? 0.98 : 0.3}"/>`;
      if (isNodeActive) {
        svg += `<circle cx="${(n.x - 1.2).toFixed(1)}" cy="${(n.y - 1.2).toFixed(1)}" r="1" fill="#ffffff" opacity="0.8"/>`;
      }
    }
  }
  svg += `</g>`;

  if (showLegend) {
    svg += renderSilkscreenLegend(theme, leftMargin, busYBottom + 16, gridWidth);
  }

  svg += `</svg>`;
  return svg;
}

function generateWires(
  nodes: CircuitNode[],
  weeks: number,
  step: number,
  topGrid: number,
  leftMargin: number,
  densityLevel: number,
  wireMode: string,
  theme: Theme,
  rand: () => number
): WireTrace[] {
  const traces: WireTrace[] = [];
  const activeNodes = nodes.filter(n => n.count > 0);
  if (!activeNodes.length) return traces;

  const chanceMap: Record<number, number> = { 1: 0.18, 2: 0.36, 3: 0.58, 4: 0.85 };
  const wireChance = chanceMap[densityLevel] || 0.36;

  // 1. Bus drops: High activity connect to +5V (Red), low activity connect to GND (Blue)
  for (const n of activeNodes) {
    if (rand() < 0.22) {
      if (n.level >= 3) {
        const wireColor = theme.wireLevels[4];
        const yTop = topGrid - 15;
        const d = `M${n.x} ${n.y} V${yTop}`;
        traces.push({
          d, x1: n.x, y1: n.y, x2: n.x, y2: yTop,
          color: wireColor, width: 1.1, opacity: 0.65,
          showPins: true, hasPulse: true, phase: rand(), duration: '1.8s'
        });
      } else if (n.level === 1) {
        const wireColor = theme.wireLevels[1];
        const yBottom = topGrid + 7 * step + 8;
        const d = `M${n.x} ${n.y} V${yBottom}`;
        traces.push({
          d, x1: n.x, y1: n.y, x2: n.x, y2: yBottom,
          color: wireColor, width: 1.1, opacity: 0.6,
          showPins: true, hasPulse: true, phase: rand(), duration: '2.4s'
        });
      }
    }
  }

  // 2. Sequential Streak Wires
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    if (a.count > 0 && b.count > 0 && rand() < 0.75) {
      const wireColor = selectWireColor(a, b, theme);
      let d = '';
      if (wireMode === 'jumper') {
        const midX = (a.x + b.x) / 2;
        const midY = Math.min(a.y, b.y) - 6;
        d = `M${a.x} ${a.y} Q${midX} ${midY} ${b.x} ${b.y}`;
      } else {
        d = `M${a.x} ${a.y} L${b.x} ${b.y}`;
      }
      traces.push({
        d, x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        color: wireColor, width: 1.3, opacity: 0.75,
        showPins: false, hasPulse: true, phase: rand(), duration: '1.6s'
      });
    }
  }

  // 3. Inter-week Circuit Traces
  const usedPairs = new Set<string>();
  for (let i = 0; i < activeNodes.length; i++) {
    if (rand() > wireChance) continue;

    const a = activeNodes[i];
    const jump = 1 + Math.floor(rand() * 4);
    const j = i + jump;
    if (j >= activeNodes.length) continue;

    const b = activeNodes[j];
    const key = `${a.index}:${b.index}`;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);

    const wireColor = selectWireColor(a, b, theme);
    let d = '';

    if (wireMode === 'jumper') {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const arcHeight = Math.min(24, 7 + dist * 0.12);
      const cx1 = a.x + (b.x - a.x) * 0.3;
      const cy1 = Math.min(a.y, b.y) - arcHeight;
      const cx2 = a.x + (b.x - a.x) * 0.7;
      const cy2 = Math.min(a.y, b.y) - arcHeight;
      d = `M${a.x} ${a.y} C${cx1} ${cy1}, ${cx2} ${cy2}, ${b.x} ${b.y}`;
    } else if (wireMode === 'pcb') {
      const midX = (a.x + b.x) / 2;
      d = `M${a.x} ${a.y} H${midX} V${b.y} H${b.x}`;
    } else {
      const dx = Math.abs(b.x - a.x);
      if (dx > 30 && rand() > 0.4) {
        const cx1 = a.x + (b.x - a.x) * 0.35;
        const cy1 = Math.min(a.y, b.y) - (8 + rand() * 12);
        const cx2 = a.x + (b.x - a.x) * 0.65;
        const cy2 = cy1;
        d = `M${a.x} ${a.y} C${cx1} ${cy1}, ${cx2} ${cy2}, ${b.x} ${b.y}`;
      } else {
        const laneY = Math.min(a.y, b.y) - 5 - (Math.floor(rand() * 2) * 4);
        d = `M${a.x} ${a.y} V${laneY} H${b.x} V${b.y}`;
      }
    }

    traces.push({
      d, x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      color: wireColor,
      width: Math.max(a.level, b.level) >= 3 ? 1.5 : 1.1,
      opacity: 0.72,
      showPins: wireMode === 'jumper',
      hasPulse: true,
      phase: rand(),
      duration: (1.5 + rand() * 1.5).toFixed(1) + 's',
      pulseRadius: Math.max(a.level, b.level) >= 4 ? 2.4 : 1.8
    });
  }

  return traces;
}

function selectWireColor(a: CircuitNode, b: CircuitNode, theme: Theme): string {
  const maxLvl = Math.max(a.level, b.level);
  if (maxLvl >= 4) return theme.wireLevels[4]; // Red
  if (maxLvl === 3) return theme.wireLevels[3]; // Green
  if (maxLvl === 2) return theme.wireLevels[2]; // Yellow
  return theme.wireLevels[1];                    // Blue
}

function getPointAlongPath(wire: WireTrace, t: number): { x: number; y: number } | null {
  const { x1, y1, x2, y2 } = wire;
  if (!x1 || !x2) return null;

  const midX = (x1 + x2) / 2;
  const midY = Math.min(y1, y2) - 10;

  const oneMinusT = 1 - t;
  const x = oneMinusT * oneMinusT * x1 + 2 * oneMinusT * t * midX + t * t * x2;
  const y = oneMinusT * oneMinusT * y1 + 2 * oneMinusT * t * midY + t * t * y2;

  return { x, y };
}

function renderSilkscreenHeader(
  username: string,
  year: string,
  total: number,
  activeDays: number,
  peak: number,
  theme: Theme,
  showChip: boolean,
  leftMargin: number,
  topH: number,
  totalWidth: number,
  isGif: boolean,
  frameProgress: number
): string {
  let hSvg = `<g class="header">`;

  if (showChip) {
    const chipX = 20;
    const chipY = 14;
    const chipW = 72;
    const chipH = 26;

    hSvg += `<rect x="${chipX}" y="${chipY}" width="${chipW}" height="${chipH}" rx="3" fill="url(#chipGrad)" stroke="#384352" stroke-width="0.9"/>`;
    hSvg += `<path d="M${chipX} ${chipY + chipH / 2 - 4} A4 4 0 0 1 ${chipX} ${chipY + chipH / 2 + 4}" fill="${theme.bg}" stroke="#384352" stroke-width="0.6"/>`;
    hSvg += `<text x="${chipX + chipW / 2 + 2}" y="${chipY + 13}" fill="${theme.silkscreen}" font-family="monospace" font-size="7" font-weight="bold" text-anchor="middle" letter-spacing="0.06em">GH-MCU</text>`;
    hSvg += `<text x="${chipX + chipW / 2 + 2}" y="${chipY + 21}" fill="${theme.textMuted}" font-family="monospace" font-size="5.5" text-anchor="middle">REV 3.2</text>`;

    const pinCount = 6;
    for (let p = 0; p < pinCount; p++) {
      const px = chipX + 10 + p * 9.5;
      hSvg += `<rect x="${px}" y="${chipY - 3.5}" width="3.5" height="4" fill="#a0aec0" rx="0.5"/>`;
      hSvg += `<rect x="${px}" y="${chipY + chipH - 0.5}" width="3.5" height="4" fill="#a0aec0" rx="0.5"/>`;
    }

    const ledGlow = isGif ? (0.4 + Math.sin(frameProgress * Math.PI * 4) * 0.4).toFixed(2) : '0.8';
    hSvg += `<circle cx="${chipX + chipW - 6}" cy="${chipY + 6}" r="1.6" fill="${theme.wireLevels[4]}" opacity="${ledGlow}"/>`;
  }

  const textX = showChip ? 104 : leftMargin;
  hSvg += `<text x="${textX}" y="23" fill="${theme.silkscreen}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" font-weight="800" letter-spacing="-0.02em">commit<tspan fill="${theme.traceAccent}">.circuit</tspan></text>`;
  hSvg += `<text x="${textX}" y="36" fill="${theme.textMuted}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="8.5" font-weight="600">@${escapeXml(username)} · ${escapeXml(year)}</text>`;

  const statsStartX = totalWidth - 280;
  if (statsStartX > textX + 160) {
    const statItems = [
      { label: 'SIGNAL COMMITS', val: total.toLocaleString(), color: theme.traceAccent },
      { label: 'ACTIVE DAYS', val: activeDays.toLocaleString(), color: theme.wireLevels[3] },
      { label: 'PEAK FREQ', val: peak + ' /day', color: theme.wireLevels[4] }
    ];

    for (let i = 0; i < statItems.length; i++) {
      const sx = statsStartX + i * 86;
      hSvg += `<g transform="translate(${sx}, 14)">`;
      hSvg += `<rect x="0" y="0" width="80" height="26" rx="4" fill="${theme.bg}" stroke="${theme.boardBorder}" stroke-width="0.8"/>`;
      hSvg += `<text x="7" y="9" fill="${theme.textMuted}" font-family="monospace" font-size="5.5" font-weight="bold" letter-spacing="0.08em">${statItems[i].label}</text>`;
      hSvg += `<text x="7" y="21" fill="${statItems[i].color}" font-family="monospace" font-size="10" font-weight="bold">${statItems[i].val}</text>`;
      hSvg += `</g>`;
    }
  }

  hSvg += `</g>`;
  return hSvg;
}

function renderSilkscreenLegend(theme: Theme, startX: number, startY: number, width: number): string {
  let lSvg = `<g class="legend" transform="translate(${startX}, ${startY})">`;
  lSvg += `<text x="0" y="8" fill="${theme.textMuted}" font-family="monospace" font-size="7.5" font-weight="600" letter-spacing="0.04em">CIRCUIT BUS HIERARCHY:</text>`;

  const levels = [
    { label: '0 IDLE', color: theme.wireLevels[0] },
    { label: '1-2 LOW (BLUE)', color: theme.wireLevels[1] },
    { label: '3-5 CLK (YELLOW)', color: theme.wireLevels[2] },
    { label: '6-8 DATA (GREEN)', color: theme.wireLevels[3] },
    { label: '9+ PWR (RED)', color: theme.wireLevels[4] }
  ];

  let curX = 130;
  for (const lvl of levels) {
    lSvg += `<rect x="${curX}" y="2" width="7" height="7" rx="1.5" fill="${lvl.color}" stroke="${theme.boardBorder}" stroke-width="0.5"/>`;
    lSvg += `<text x="${curX + 11}" y="8" fill="${theme.silkscreen}" font-family="monospace" font-size="7" font-weight="600">${lvl.label}</text>`;
    curX += lvl.label.length * 4.6 + 22;
  }

  lSvg += `<text x="${width}" y="8" fill="${theme.textMuted}" font-family="monospace" font-size="7" text-anchor="end">JUMPER WIRE SCHEMATIC</text>`;
  lSvg += `</g>`;
  return lSvg;
}

function parseDensity(val: any): number {
  if (typeof val === 'number') return Math.min(4, Math.max(1, val));
  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    if (lower === 'sparse' || lower === '1') return 1;
    if (lower === 'medium' || lower === '2') return 2;
    if (lower === 'dense' || lower === '3') return 3;
    if (lower === 'ultra' || lower === '4') return 4;
  }
  return 2;
}

function getHexPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = (cx + r * Math.cos(angle)).toFixed(1);
    const py = (cy + r * Math.sin(angle)).toFixed(1);
    points.push(`${px},${py}`);
  }
  return points.join(' ');
}

function escapeXml(unsafe: any): string {
  return String(unsafe).replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
