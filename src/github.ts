/**
 * Inbuilt GitHub Contributions Scraper.
 * Incorporated directly from nishur31/github-contributions-api (grubersjoe fork).
 * Scrapes GitHub profile contributions directly without third-party API dependencies.
 */

import * as cheerio from 'cheerio';

export type Level = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  date: string;
  count: number;
  level: Level;
}

export interface ContributionStats {
  total: number;
  activeDays: number;
  peakCount: number;
  peakDate: string;
  longestStreak: number;
  currentStreak: number;
  signalActivityRatio: number;
  daysCount: number;
}

export interface ContributionResult {
  username: string;
  year: string;
  contributions: ContributionDay[];
  total: number;
  stats: ContributionStats;
  fromCache: boolean;
  isFallback?: boolean;
  errorMessage?: string;
}

const cache = new Map<string, { timestamp: number; data: ContributionResult }>();
const inFlight = new Map<string, Promise<ContributionResult>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch contribution history directly from GitHub HTML using Cheerio
 */
export async function fetchContributions(username: string = 'octocat', year: string = 'last'): Promise<ContributionResult> {
  const cleanUser = String(username).trim().replace(/^@/, '');
  const cleanYear = String(year).trim().toLowerCase();
  const cacheKey = `${cleanUser.toLowerCase()}:${cleanYear}`;

  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return { ...cached.data, fromCache: true };
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const url = cleanYear === 'last'
        ? `https://github.com/users/${encodeURIComponent(cleanUser)}/contributions`
        : `https://github.com/users/${encodeURIComponent(cleanUser)}/contributions?tab=overview&from=${encodeURIComponent(cleanYear)}-12-01&to=${encodeURIComponent(cleanYear)}-12-31`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`GitHub profile returned HTTP ${res.status}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      const dayElements = $('.js-calendar-graph-table .ContributionCalendar-day, table.ContributionCalendar-grid td.ContributionCalendar-day');
      if (!dayElements.length) {
        throw new Error('No contribution calendar elements found in GitHub response');
      }

      // Map tooltips by their 'for' attribute ID to get exact commit counts
      const tooltipsByDayId = new Map<string, string>();
      $('tool-tip').each((_, el) => {
        const forId = $(el).attr('for');
        if (forId) {
          tooltipsByDayId.set(forId, $(el).text().trim());
        }
      });

      const days: ContributionDay[] = [];
      dayElements.each((_, el) => {
        const date = $(el).attr('data-date');
        const levelStr = $(el).attr('data-level');
        const dayId = $(el).attr('id');

        if (!date) return;

        let level = (parseInt(levelStr || '0', 10) || 0) as Level;
        if (level < 0) level = 0;
        if (level > 4) level = 4;

        let count = 0;
        if (dayId && tooltipsByDayId.has(dayId)) {
          const tipText = tooltipsByDayId.get(dayId)!;
          const match = /^(\d+)\s+contribution/i.exec(tipText);
          if (match) {
            count = parseInt(match[1], 10);
          } else if (/no contribution/i.test(tipText)) {
            count = 0;
          }
        }

        // Proportional fallback count if tooltip is missing
        if (count === 0 && level > 0) {
          count = level === 1 ? 1 : level === 2 ? 3 : level === 3 ? 6 : 10;
        }

        days.push({ date, count, level });
      });

      days.sort((a, b) => a.date.localeCompare(b.date));

      const stats = calculateStats(days);
      const resultData: ContributionResult = {
        username: cleanUser,
        year: cleanYear,
        contributions: days,
        total: stats.total,
        stats,
        fromCache: false
      };

      cache.set(cacheKey, { timestamp: Date.now(), data: resultData });
      return resultData;
    } catch (err: any) {
      console.warn(`[GitHub Scraper] Direct fetch failed for ${cleanUser} (${cleanYear}): ${err.message}. Using synthetic fallback data.`);
      const fallback = generateFallbackData(cleanUser, cleanYear);
      return {
        ...fallback,
        fromCache: false,
        isFallback: true,
        errorMessage: err.message
      };
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}

export function calculateStats(days: ContributionDay[]): ContributionStats {
  let total = 0;
  let activeDays = 0;
  let peakDay = { count: 0, date: '' };
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < days.length; i++) {
    const count = Number(days[i].count) || 0;
    total += count;
    if (count > 0) {
      activeDays++;
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      if (count > peakDay.count) {
        peakDay = { count, date: days[i].date };
      }
    } else {
      tempStreak = 0;
    }
  }

  for (let i = days.length - 1; i >= 0; i--) {
    const count = Number(days[i].count) || 0;
    if (count > 0) {
      currentStreak++;
    } else if (i === days.length - 1) {
      continue;
    } else {
      break;
    }
  }

  const signalActivityRatio = days.length ? Math.round((activeDays / days.length) * 100) : 0;

  return {
    total,
    activeDays,
    peakCount: peakDay.count,
    peakDate: peakDay.date,
    longestStreak,
    currentStreak,
    signalActivityRatio,
    daysCount: days.length
  };
}

export function generateFallbackData(username: string, year: string): ContributionResult {
  let seed = Array.from(username + year).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 1337);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const days: ContributionDay[] = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - 364);

  for (let i = 0; i < 365; i++) {
    const cur = new Date(startDate);
    cur.setUTCDate(cur.getUTCDate() + i);
    const dateStr = cur.toISOString().split('T')[0];

    const isWeekend = cur.getUTCDay() === 0 || cur.getUTCDay() === 6;
    const activeChance = isWeekend ? 0.25 : 0.65;
    let count = 0;
    let level: Level = 0;

    if (rand() < activeChance) {
      const r = rand();
      if (r < 0.45) { count = Math.floor(rand() * 2) + 1; level = 1; }
      else if (r < 0.75) { count = Math.floor(rand() * 3) + 3; level = 2; }
      else if (r < 0.92) { count = Math.floor(rand() * 3) + 6; level = 3; }
      else { count = Math.floor(rand() * 8) + 9; level = 4; }
    }

    days.push({ date: dateStr, count, level });
  }

  const stats = calculateStats(days);
  return {
    username,
    year,
    contributions: days,
    total: stats.total,
    stats,
    fromCache: false,
    isFallback: true
  };
}
