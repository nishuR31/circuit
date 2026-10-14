/**
 * High-performance image encoder for PNG and Animated GIF.
 * Powered by sharp for vector rasterization and gifenc for lightweight, buttery GIF loops.
 * Written in TypeScript (ESM) for Bun.
 */

import * as gifencModule from 'gifenc';

const gifenc = (
  gifencModule as unknown as {
    default?: {
      GIFEncoder: () => {
        writeFrame: (
          index: Uint8Array,
          width: number,
          height: number,
          options: {
            palette: number[][];
            delay: number;
            repeat: number;
          }
        ) => void;
        finish: () => void;
        bytes: () => Uint8Array;
      };
      quantize: (rgba: Uint8Array, maxColors: number) => number[][];
      applyPalette: (rgba: Uint8Array, palette: number[][]) => Uint8Array;
    };
  }
).default;

if (!gifenc) {
  throw new Error('gifenc exports could not be loaded');
}

const { GIFEncoder, quantize, applyPalette } = gifenc;


import sharp from 'sharp';
import { renderCircuitSvg, type CircuitOptions } from './circuit-renderer.ts';
import type { ContributionDay } from './github.ts';

export const imageCache = new Map<string, { time: number; data: Buffer }>();
const CACHE_MAX_ENTRIES = 150;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a high-resolution PNG of the circuit board
 */
export async function generatePng(days: ContributionDay[], options: CircuitOptions = {}): Promise<Buffer> {
  const cacheKey = getCacheKey('png', options);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const svgString = renderCircuitSvg(days, options, null);
  const svgBuffer = Buffer.from(svgString);

  const scale = Number(options.scale) || 1;
  let pipeline = sharp(svgBuffer);

  if (scale > 1) {
    pipeline = sharp(svgBuffer, { density: Math.round(72 * scale) });
  }

  const pngBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
  setCache(cacheKey, pngBuffer);
  return pngBuffer;
}

/**
 * Generate an animated GIF of the circuit board with electron pulses and glowing LEDs
 */
export async function generateGif(days: ContributionDay[], options: CircuitOptions = {}): Promise<Buffer> {
  const cacheKey = getCacheKey('gif', options);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const totalFrames = Math.min(16, Math.max(6, Number(options.frames) || 10));

  let delay = 90;
  if (options.speed === 'fast') delay = 60;
  else if (options.speed === 'slow') delay = 130;
  else if (Number(options.speed)) delay = Math.max(30, Math.min(500, Number(options.speed)));

  const gif = GIFEncoder();
  let commonPalette: number[][] | null = null;

  for (let i = 0; i < totalFrames; i++) {
    const frameSvg = renderCircuitSvg(days, options, i, totalFrames);
    const svgBuffer = Buffer.from(frameSvg);

    const { data, info } = await sharp(svgBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (!commonPalette || i === 0) {
      commonPalette = quantize(data, 128);
    }

    const index = applyPalette(data, commonPalette);
    gif.writeFrame(index, info.width, info.height, {
      palette: commonPalette,
      delay,
      repeat: 0
    });
  }

  gif.finish();
  const gifBuffer = Buffer.from(gif.bytes());
  setCache(cacheKey, gifBuffer);
  return gifBuffer;
}

/**
 * Generate standalone vector SVG
 */
export function generateSvg(days: ContributionDay[], options: CircuitOptions = {}): string {
  return renderCircuitSvg(days, options, null);
}

function getCacheKey(format: string, options: CircuitOptions): string {
  const user = (options.username || 'octocat').toLowerCase();
  const year = (options.year || 'last').toLowerCase();
  const theme = (options.theme || 'breadboard').toLowerCase();
  const wireMode = (options.wireMode || 'hybrid').toLowerCase();
  const nodeStyle = (options.nodeStyle || 'led').toLowerCase();
  const density = options.density || '2';
  const glow = options.glow ?? '70';
  const wireColors = options.wireColors || '';
  const scale = options.scale || '1';
  const customColor = options.color || options.accent || '';

  return `${format}:${user}:${year}:${theme}:${wireMode}:${nodeStyle}:${density}:${glow}:${wireColors}:${scale}:${customColor}`;
}

function getFromCache(key: string): Buffer | null {
  const item = imageCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > CACHE_TTL_MS) {
    imageCache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key: string, data: Buffer): void {
  if (imageCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) imageCache.delete(oldestKey);
  }
  imageCache.set(key, { time: Date.now(), data });
}
