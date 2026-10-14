/**
 * Commit Circuit — interactive workbench + customization playground.
 * Same API contract as server (imageHandler.ts): user, year, theme,
 * wireMode, nodeStyle, density, glow, speed, frames, scale,
 * accent, bg, boardBg, wireColors, stats/months/days/legend/chip.
 */
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const THEMES_META = [
  { id: 'breadboard', name: 'Breadboard Pro', desc: 'Classic jumper wires — red power, blue logic, green data, yellow clock.', levels: ['#162330', '#2563eb', '#eab308', '#22c55e', '#ef4444'] },
  { id: 'pcb', name: 'Industrial PCB', desc: 'FR4 green solder-mask with copper traces and ENIG pads.', levels: ['#0d2617', '#15803d', '#16a34a', '#22c55e', '#4ade80'] },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', desc: 'Cyan, hot pink and ultraviolet signals on deep violet.', levels: ['#1f1038', '#06b6d4', '#ec4899', '#eab308', '#a855f7'] },
  { id: 'amber', name: 'Vintage Amber CRT', desc: '1980s phosphor glow — warm vacuum-tube circuitry.', levels: ['#241508', '#78350f', '#b45309', '#d97706', '#f59e0b'] },
  { id: 'matrix', name: 'Matrix Rain', desc: 'Pure terminal green hacker aesthetic.', levels: ['#071c0c', '#15803d', '#16a34a', '#22c55e', '#4ade80'] },
  { id: 'solarized', name: 'Solarized Dark', desc: 'Precision Ethan Schoonover palette, teal engineering.', levels: ['#0a404f', '#268bd2', '#b58900', '#2aa198', '#cb4b16'] },
  { id: 'monochrome', name: 'Stealth Titanium', desc: 'Matte dark board, silver traces, white LEDs.', levels: ['#1f1f26', '#52525b', '#71717a', '#a1a1aa', '#f4f4f5'] },
];

const PRESETS = {
  'midnight-lab': { theme: 'breadboard', wireMode: 'hybrid', nodeStyle: 'led', density: '2', glow: 70, speed: 'normal', frames: '10', scale: '1' },
  'neon-arcade': { theme: 'cyberpunk', wireMode: 'jumper', nodeStyle: 'hex', density: '3', glow: 90, speed: 'fast', frames: '12', scale: '1' },
  'fab-floor': { theme: 'pcb', wireMode: 'pcb', nodeStyle: 'smd', density: '3', glow: 50, speed: 'normal', frames: '10', scale: '2' },
  'phosphor': { theme: 'amber', wireMode: 'streak', nodeStyle: 'pad', density: '2', glow: 80, speed: 'slow', frames: '8', scale: '1' },
  'ghost': { theme: 'monochrome', wireMode: 'bus', nodeStyle: 'smd', density: '1', glow: 30, speed: 'slow', frames: '8', scale: '1' },
  'matrix-rain': { theme: 'matrix', wireMode: 'bus', nodeStyle: 'led', density: '4', glow: 100, speed: 'fast', frames: '14', scale: '1' },
};

const DEFAULTS = {
  user: 'octocat', year: 'last', theme: 'breadboard', wireMode: 'hybrid',
  nodeStyle: 'led', density: '2', glow: 70, format: 'gif', speed: 'normal',
  frames: '10', scale: '1', stats: true, months: true, days: true,
  legend: true, chip: true, embedTab: 'markdown',
  accent: '', bg: '', boardBg: '', wireColors: '',
};

const state = { ...DEFAULTS };
let zoom = 1;
let debounceTimer = null;
let currentRequestId = 0;

// ---------- element refs ----------
const el = {};
function cacheDom() {
  ['userInput', 'yearSelect', 'themeSelect', 'wireModeSelect', 'nodeStyleSelect',
   'densityRange', 'densityVal', 'glowRange', 'glowVal', 'speedSelect',
   'framesRange', 'framesVal', 'scaleSelect', 'toggleStats', 'toggleMonths',
   'toggleDays', 'toggleLegend', 'toggleChip', 'previewImg', 'previewSvgWrap',
   'previewLoading', 'previewErrorWrap', 'previewErrorMsg', 'previewRetryBtn',
   'snippetText', 'toast', 'statTotal', 'statActive',
   'statPeak', 'statRatio', 'liveUserBadge', 'downloadBtn', 'themeName',
   'customAccent', 'customBg', 'customBoard', 'customWires', 'liveUrl',
   'zoomVal', 'viewport', 'heroUser', 'themeGallery', 'controlsDeck', 'previewCard'
  ].forEach((id) => { el[id] = document.getElementById(id); });
}

// ---------- init ----------
function init() {
  cacheDom();
  readUrlParams();
  buildThemeSwatches();
  buildThemeGallery();
  syncInputsFromState();
  updateWireLegend();
  setupEvents();
  setupDeckHeightObserver();
  startHeroCanvas();
  refresh();
}

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  const get = (k) => p.get(k);
  if (get('user')) state.user = get('user').replace(/^@/, '');
  if (get('year')) state.year = get('year');
  if (get('theme')) state.theme = get('theme');
  if (get('wireMode') || get('wire')) state.wireMode = get('wireMode') || get('wire');
  if (get('nodeStyle') || get('node')) state.nodeStyle = get('nodeStyle') || get('node');
  if (get('density')) state.density = get('density');
  if (get('glow') !== null && get('glow') !== undefined && get('glow') !== '') state.glow = Number(get('glow')) || 70;
  if (get('format')) state.format = get('format');
  if (get('speed')) state.speed = get('speed');
  if (get('frames')) state.frames = get('frames');
  if (get('scale')) state.scale = get('scale');
  if (get('accent')) state.accent = normHex(get('accent'));
  if (get('bg')) state.bg = normHex(get('bg'));
  if (get('boardBg')) state.boardBg = normHex(get('boardBg'));
  if (get('wireColors') || get('wires')) state.wireColors = get('wireColors') || get('wires');
  ['stats', 'months', 'days', 'legend', 'chip'].forEach((k) => {
    if (get(k) === '0' || get(k) === 'false') state[k] = false;
  });
}

function normHex(s) {
  if (!s) return '';
  s = String(s).trim();
  return s.startsWith('#') ? s : '#' + s;
}
function hexNoHash(s) {
  return String(s || '').replace(/^#/, '');
}

// ---------- theme swatches + gallery ----------
function buildThemeSwatches() {
  const wrap = $('#themeSwatches');
  if (!wrap) return;
  wrap.innerHTML = '';
  THEMES_META.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (t.id === state.theme ? ' active' : '');
    b.dataset.theme = t.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', t.id === state.theme ? 'true' : 'false');
    b.title = `${t.name} — ${t.desc}`;
    b.innerHTML = `<span class="swatch-dots">${t.levels.slice(1).map((c) => `<i style="background:${c}"></i>`).join('')}</span><small>${t.name}</small>`;
    b.addEventListener('click', () => {
      state.theme = t.id;
      syncInputsFromState();
      updateWireLegend();
      refresh();
    });
    wrap.appendChild(b);
  });
}

function buildThemeGallery() {
  const g = el.themeGallery;
  if (!g) return;
  g.innerHTML = '';
  THEMES_META.forEach((t) => {
    const [idle, low, clk, data, pwr] = t.levels;
    const card = document.createElement('div');
    card.className = 'theme-card' + (t.id === state.theme ? ' active' : '');
    card.dataset.theme = t.id;
    card.innerHTML = `
      <div class="theme-preview" style="--c1:${low};--c2:${clk};--c3:${data};--c4:${pwr};background:linear-gradient(135deg, ${idle}, #0a1017);"></div>
      <strong>${t.name}</strong><p>${t.desc}</p>
      <button type="button" class="mini-btn">
        <span>Apply theme</span>
        <svg class="lucide lucide-arrow-right" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </button>`;
    card.querySelector('button').addEventListener('click', () => {
      state.theme = t.id;
      syncInputsFromState();
      updateWireLegend();
      refresh();
      document.getElementById('workbench').scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast(`Theme: ${t.name}`);
    });
    g.appendChild(card);
  });
}

function markActiveGroups() {
  $$('#themeSwatches .swatch').forEach((b) => {
    const on = b.dataset.theme === state.theme;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  $$('#wireModes .pill').forEach((b) => b.classList.toggle('active', b.dataset.wire === state.wireMode));
  $$('#nodeStyles .pill').forEach((b) => b.classList.toggle('active', b.dataset.node === state.nodeStyle));
  $$('#themeGallery .theme-card').forEach((c) => c.classList.toggle('active', c.dataset.theme === state.theme));
  $$('.sample-chip').forEach((c) => c.classList.toggle('active', c.dataset.user === state.user));
  $$('.format-tab').forEach((t) => t.classList.toggle('active', t.dataset.format === state.format));
  const meta = THEMES_META.find((t) => t.id === state.theme);
  if (el.themeName && meta) el.themeName.textContent = meta.name;
}

// ---------- sync ----------
function syncInputsFromState() {
  el.userInput.value = state.user;
  el.yearSelect.value = state.year;
  el.themeSelect.value = state.theme;
  el.wireModeSelect.value = state.wireMode;
  el.nodeStyleSelect.value = state.nodeStyle;
  el.densityRange.value = state.density;
  el.densityVal.textContent = { 1: 'Sparse', 2: 'Medium', 3: 'Dense', 4: 'Ultra' }[state.density] || 'Medium';
  el.glowRange.value = state.glow;
  el.glowVal.textContent = state.glow + '%';
  el.speedSelect.value = state.speed;
  el.framesRange.value = state.frames;
  el.framesVal.textContent = state.frames;
  el.scaleSelect.value = state.scale;
  el.toggleStats.checked = state.stats;
  el.toggleMonths.checked = state.months;
  el.toggleDays.checked = state.days;
  el.toggleLegend.checked = state.legend;
  el.toggleChip.checked = state.chip;
  if (el.heroUser) el.heroUser.value = state.user === 'octocat' ? '' : state.user;
  if (el.liveUserBadge) el.liveUserBadge.textContent = `@${state.user}`;
  // custom colors
  if (state.accent) el.customAccent.value = state.accent;
  if (state.bg) el.customBg.value = state.bg;
  if (state.boardBg) el.customBoard.value = state.boardBg;
  if (state.wireColors) el.customWires.value = state.wireColors;
  syncColorLabels();
  markActiveGroups();
}

function syncColorLabels() {
  [['customAccent', state.accent || el.customAccent.value],
   ['customBg', state.bg || el.customBg.value],
   ['customBoard', state.boardBg || el.customBoard.value]].forEach(([id, v]) => {
    const label = document.querySelector(`[data-for="${id}"]`);
    if (label && v) label.textContent = v;
  });
}

// ---------- events ----------
function setupEvents() {
  $('#workbenchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.user = el.userInput.value.trim().replace(/^@/, '') || 'octocat';
    syncInputsFromState();
    refresh();
    showToast(`Compiled @${state.user}`);
  });

  $('#heroQuick').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = el.heroUser.value.trim().replace(/^@/, '');
    if (v) {
      state.user = v;
      syncInputsFromState();
      refresh();
    }
    document.getElementById('workbench').scrollIntoView({ behavior: 'smooth' });
  });
  $('#heroSurprise').addEventListener('click', () => {
    const pool = ['torvalds', 'yyx990803', 'antfu', 'shadcn', 'leerob', 'sindresorhus', 'nishur31', 'octocat'];
    state.user = pool[Math.floor(Math.random() * pool.length)];
    randomize(false);
    syncInputsFromState();
    refresh();
    document.getElementById('workbench').scrollIntoView({ behavior: 'smooth' });
  });

  el.userInput.addEventListener('input', () => {
    state.user = el.userInput.value.trim().replace(/^@/, '') || 'octocat';
    el.liveUserBadge.textContent = `@${state.user}`;
    markActiveGroups();
    refreshDebounced();
  });

  el.yearSelect.addEventListener('change', () => { state.year = el.yearSelect.value; refresh(); });
  el.scaleSelect.addEventListener('change', () => { state.scale = el.scaleSelect.value; refresh(); });

  $$('#wireModes .pill').forEach((b) => b.addEventListener('click', () => {
    state.wireMode = b.dataset.wire;
    el.wireModeSelect.value = state.wireMode;
    markActiveGroups();
    refresh();
  }));
  $$('#nodeStyles .pill').forEach((b) => b.addEventListener('click', () => {
    state.nodeStyle = b.dataset.node;
    el.nodeStyleSelect.value = state.nodeStyle;
    markActiveGroups();
    refresh();
  }));

  el.densityRange.addEventListener('input', () => {
    state.density = el.densityRange.value;
    el.densityVal.textContent = { 1: 'Sparse', 2: 'Medium', 3: 'Dense', 4: 'Ultra' }[state.density];
    refreshDebounced();
  });
  el.glowRange.addEventListener('input', () => {
    state.glow = Number(el.glowRange.value);
    el.glowVal.textContent = state.glow + '%';
    refreshDebounced();
  });
  el.speedSelect.addEventListener('change', () => { state.speed = el.speedSelect.value; refresh(); });
  el.framesRange.addEventListener('input', () => {
    state.frames = el.framesRange.value;
    el.framesVal.textContent = state.frames;
    refreshDebounced();
  });

  // custom playground
  const customRefresh = () => { syncColorLabels(); refreshDebounced(); };
  el.customAccent.addEventListener('input', () => { state.accent = el.customAccent.value; customRefresh(); });
  el.customBg.addEventListener('input', () => { state.bg = el.customBg.value; customRefresh(); });
  el.customBoard.addEventListener('input', () => { state.boardBg = el.customBoard.value; customRefresh(); });
  el.customWires.addEventListener('input', () => { state.wireColors = el.customWires.value.trim(); refreshDebounced(); });
  $('#clearCustom').addEventListener('click', () => {
    state.accent = ''; state.bg = ''; state.boardBg = ''; state.wireColors = '';
    el.customWires.value = '';
    el.customAccent.value = '#38bdf8'; el.customBg.value = '#070b0e'; el.customBoard.value = '#0e1720';
    syncColorLabels();
    refresh();
    showToast('Custom colors cleared');
  });

  [['toggleStats', 'stats'], ['toggleMonths', 'months'], ['toggleDays', 'days'], ['toggleLegend', 'legend'], ['toggleChip', 'chip']]
    .forEach(([id, key]) => el[id].addEventListener('change', () => { state[key] = el[id].checked; refresh(); }));

  $$('.format-tab').forEach((t) => t.addEventListener('click', () => {
    state.format = t.dataset.format;
    markActiveGroups();
    refresh();
  }));
  $$('.embed-tab').forEach((t) => t.addEventListener('click', () => {
    $$('.embed-tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    state.embedTab = t.dataset.type;
    updateSnippet();
  }));
  $$('.sample-chip').forEach((c) => c.addEventListener('click', () => {
    state.user = c.dataset.user;
    syncInputsFromState();
    refresh();
  }));

  $$('.preset-card').forEach((c) => c.addEventListener('click', () => {
    const p = PRESETS[c.dataset.preset];
    if (!p) return;
    Object.assign(state, p);
    state.accent = ''; state.bg = ''; state.boardBg = ''; state.wireColors = '';
    el.customWires.value = '';
    syncInputsFromState();
    updateWireLegend();
    refresh();
    document.getElementById('workbench').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`Preset: ${c.querySelector('strong').textContent.trim()}`);
  }));

  $('#randomBtn').addEventListener('click', () => { randomize(true); });
  $('#resetBtn').addEventListener('click', () => {
    const user = state.user;
    Object.assign(state, DEFAULTS, { user });
    el.customWires.value = '';
    syncInputsFromState();
    updateWireLegend();
    refresh();
    showToast('Workbench reset');
  });
  $('#shareBtn').addEventListener('click', copyShareLink);

  $('#copySnippetBtn').addEventListener('click', async () => {
    const text = el.snippetText.textContent;
    try { await navigator.clipboard.writeText(text); showToast('Snippet copied'); }
    catch { fallbackCopy(text); }
  });
  $$('.copy-btn').forEach((b) => b.addEventListener('click', async () => {
    const url = window.location.origin + b.dataset.copy;
    try { await navigator.clipboard.writeText(url); showToast('Copied ' + url); }
    catch { fallbackCopy(url); }
  }));

  el.downloadBtn.addEventListener('click', downloadCurrent);
  $('#openFullBtn').addEventListener('click', () => window.open(buildApiUrl(), '_blank'));
  $('#zoomIn').addEventListener('click', () => setZoom(zoom + 0.25));
  $('#zoomOut').addEventListener('click', () => setZoom(zoom - 0.25));
  if (el.previewRetryBtn) el.previewRetryBtn.addEventListener('click', () => refresh());

  // mobile nav
  const burger = $('#navBurger'), links = $('#navLinks');
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) links.classList.remove('open');
  });

  // Smooth scroll for internal anchor links while keeping manual side scrollbar native
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      if (href === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // keyboard: press "/" to focus username
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      el.userInput.focus();
      el.userInput.select();
    }
  });
}

function randomize(announce) {
  const themes = THEMES_META.map((t) => t.id);
  const wires = ['hybrid', 'jumper', 'pcb', 'bus', 'streak'];
  const nodes = ['led', 'smd', 'pad', 'hex'];
  state.theme = themes[Math.floor(Math.random() * themes.length)];
  state.wireMode = wires[Math.floor(Math.random() * wires.length)];
  state.nodeStyle = nodes[Math.floor(Math.random() * nodes.length)];
  state.density = String(1 + Math.floor(Math.random() * 4));
  state.glow = 30 + Math.floor(Math.random() * 71);
  syncInputsFromState();
  updateWireLegend();
  refresh();
  if (announce) showToast(`Random: ${state.theme} / ${state.wireMode} / ${state.nodeStyle}`);
}

function setZoom(z) {
  zoom = Math.min(2, Math.max(0.5, Math.round(z * 100) / 100));
  el.zoomVal.textContent = Math.round(zoom * 100) + '%';
  el.previewImg.style.transform = `scale(${zoom})`;
  const svg = el.previewSvgWrap.querySelector('svg');
  if (svg) svg.style.transform = `scale(${zoom})`;
}

function refreshDebounced() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(refresh, 350);
}

// ---------- URL builders ----------
function buildApiUrl(overrideFormat) {
  const fmt = overrideFormat || state.format;
  const url = new URL(`${window.location.origin}/api/circuit.${fmt}`);
  url.searchParams.set('user', state.user);
  url.searchParams.set('year', state.year);
  url.searchParams.set('theme', state.theme);
  url.searchParams.set('wireMode', state.wireMode);
  url.searchParams.set('nodeStyle', state.nodeStyle);
  url.searchParams.set('density', state.density);
  url.searchParams.set('glow', String(state.glow));
  url.searchParams.set('scale', state.scale);
  if (fmt === 'gif') {
    url.searchParams.set('speed', state.speed);
    url.searchParams.set('frames', state.frames);
  }
  if (state.accent) url.searchParams.set('accent', hexNoHash(state.accent));
  if (state.bg) url.searchParams.set('bg', hexNoHash(state.bg));
  if (state.boardBg) url.searchParams.set('boardBg', hexNoHash(state.boardBg));
  if (state.wireColors) url.searchParams.set('wireColors', state.wireColors);
  if (!state.stats) url.searchParams.set('stats', '0');
  if (!state.months) url.searchParams.set('months', '0');
  if (!state.days) url.searchParams.set('days', '0');
  if (!state.legend) url.searchParams.set('legend', '0');
  if (!state.chip) url.searchParams.set('chip', '0');
  return url.toString();
}

function buildShareUrl() {
  const url = new URL(window.location.href.split('?')[0]);
  ['user', 'year', 'theme', 'format'].forEach((k) => url.searchParams.set(k, state[k]));
  url.searchParams.set('wireMode', state.wireMode);
  url.searchParams.set('nodeStyle', state.nodeStyle);
  url.searchParams.set('density', state.density);
  url.searchParams.set('glow', String(state.glow));
  if (state.accent) url.searchParams.set('accent', hexNoHash(state.accent));
  if (state.bg) url.searchParams.set('bg', hexNoHash(state.bg));
  if (state.boardBg) url.searchParams.set('boardBg', hexNoHash(state.boardBg));
  if (state.wireColors) url.searchParams.set('wireColors', state.wireColors);
  return url.toString();
}

// ---------- refresh ----------
async function refresh() {
  const reqId = ++currentRequestId;
  el.previewLoading.classList.add('active');
  if (el.previewErrorWrap) el.previewErrorWrap.hidden = true;
  el.liveUserBadge.textContent = `@${state.user}`;
  markActiveGroups();
  updateSnippet();
  window.history.replaceState({}, '', buildShareUrl());

  const apiUrl = buildApiUrl();
  if (state.format === 'svg') {
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svgText = await res.text();
      if (reqId !== currentRequestId) return;
      el.previewImg.style.display = 'none';
      if (el.previewErrorWrap) el.previewErrorWrap.hidden = true;
      el.previewSvgWrap.hidden = false;
      el.previewSvgWrap.innerHTML = svgText;
      const svg = el.previewSvgWrap.querySelector('svg');
      if (svg) { svg.style.maxWidth = '100%'; svg.style.transform = `scale(${zoom})`; }
      attachSvgHover();
      syncControlDeckHeight();
    } catch (err) {
      if (reqId !== currentRequestId) return;
      console.error('SVG load failed', err);
      showPreviewError(`Unable to render SVG for @${state.user}.`);
    } finally {
      if (reqId === currentRequestId) {
        el.previewLoading.classList.remove('active');
        syncControlDeckHeight();
      }
    }
  } else {
    el.previewSvgWrap.hidden = true;
    const tmp = new Image();
    tmp.onload = () => {
      if (reqId !== currentRequestId) return;
      if (el.previewErrorWrap) el.previewErrorWrap.hidden = true;
      el.previewImg.src = tmp.src;
      el.previewImg.style.display = 'block';
      el.previewImg.style.transform = `scale(${zoom})`;
      el.previewLoading.classList.remove('active');
      syncControlDeckHeight();
    };
    tmp.onerror = () => {
      if (reqId !== currentRequestId) return;
      el.previewLoading.classList.remove('active');
      showPreviewError(`Unable to render circuit for @${state.user}. Check username or try SVG.`);
      showToast('Error loading image — check username');
      syncControlDeckHeight();
    };
    tmp.src = apiUrl;
  }
  fetchTelemetry();
}

function syncControlDeckHeight() {
  if (window.innerWidth <= 1080) {
    if (el.controlsDeck) el.controlsDeck.style.maxHeight = '';
    return;
  }
  const preview = el.previewCard || document.getElementById('previewCard') || document.querySelector('.preview-card');
  if (preview && el.controlsDeck) {
    const h = Math.max(340, preview.offsetHeight);
    el.controlsDeck.style.maxHeight = `${h}px`;
  }
}

function setupDeckHeightObserver() {
  const preview = el.previewCard || document.getElementById('previewCard') || document.querySelector('.preview-card');
  if (!preview || typeof ResizeObserver === 'undefined') return;
  const ro = new ResizeObserver(() => syncControlDeckHeight());
  ro.observe(preview);
  window.addEventListener('resize', syncControlDeckHeight);
}

function showPreviewError(msg) {
  if (el.previewErrorWrap) {
    el.previewImg.style.display = 'none';
    el.previewSvgWrap.hidden = true;
    el.previewErrorWrap.hidden = false;
    if (el.previewErrorMsg) el.previewErrorMsg.textContent = msg;
  }
}

async function fetchTelemetry() {
  try {
    const res = await fetch(`/api/data?user=${encodeURIComponent(state.user)}&year=${encodeURIComponent(state.year)}`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.stats) {
      el.statTotal.textContent = Number(json.stats.total).toLocaleString();
      el.statActive.textContent = Number(json.stats.activeDays).toLocaleString();
      el.statPeak.textContent = `${json.stats.peakCount}/day`;
      el.statRatio.textContent = `${json.stats.signalActivityRatio}%`;
    }
  } catch (err) { /* offline — keep placeholders */ }
}

function updateSnippet() {
  const gifUrl = buildApiUrl('gif');
  const pngUrl = buildApiUrl('png');
  const target = `https://github.com/${state.user}`;
  let code = '';
  if (state.embedTab === 'html') code = `<a href="${target}">\n  <img src="${gifUrl}" alt="${state.user}'s contribution circuit" width="100%" />\n</a>`;
  else if (state.embedTab === 'direct') code = buildApiUrl();
  else if (state.embedTab === 'png') code = `[![${state.user}'s contribution circuit](${pngUrl})](${target})`;
  else code = `[![${state.user}'s contribution circuit](${gifUrl})](${target})`;
  el.snippetText.textContent = code;
  if (el.liveUrl) el.liveUrl.textContent = buildApiUrl();
}

function updateWireLegend() {
  const meta = THEMES_META.find((t) => t.id === state.theme) || THEMES_META[0];
  // order in strip: VCC(4), DATA(3), CLOCK(2), LOGIC(1), IDLE(0)
  const order = [4, 3, 2, 1, 0];
  $$('#wire-guide .wire-indicator').forEach((dot, i) => {
    const c = meta.levels[order[i]];
    dot.style.background = c;
    dot.style.color = c;
  });
}

// ---------- download / share ----------
async function downloadCurrent() {
  const url = buildApiUrl();
  const file = `commit-circuit-${state.user}-${state.year}.${state.format}`;
  showToast(`Downloading ${state.format.toUpperCase()}…`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch { window.open(url, '_blank'); }
}

async function copyShareLink() {
  const url = buildShareUrl();
  try { await navigator.clipboard.writeText(url); showToast('Share link copied'); }
  catch { fallbackCopy(url); }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showToast('Copied to clipboard'); } catch { showToast('Copy failed — select manually'); }
  ta.remove();
}

function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.toast.classList.remove('show'), 2400);
}

// ---------- svg tooltip ----------
function attachSvgHover() {
  const svg = el.previewSvgWrap.querySelector('svg');
  if (!svg) return;
  let tip = document.querySelector('.circuit-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'circuit-tooltip';
    tip.style.cssText = 'position:fixed;display:none;background:#0d1822;border:1px solid #38bdf8;color:#f0f6fc;padding:6px 10px;border-radius:8px;font-family:monospace;font-size:11px;pointer-events:none;z-index:999;box-shadow:0 8px 24px rgba(0,0,0,.6);max-width:220px;';
    document.body.appendChild(tip);
  }
  svg.querySelectorAll('[data-date]').forEach((n) => {
    n.addEventListener('mouseenter', () => {
      const d = n.getAttribute('data-date'), c = n.getAttribute('data-count');
      if (d) { tip.style.display = 'block'; tip.innerHTML = `<strong>${c} commit${c === '1' ? '' : 's'}</strong><br><span style="color:#8b9eb0">${d}</span>`; }
    });
    n.addEventListener('mousemove', (e) => {
      tip.style.left = `${Math.min(window.innerWidth - 200, e.clientX + 14)}px`;
      tip.style.top = `${Math.min(window.innerHeight - 70, e.clientY + 14)}px`;
    });
    n.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
}

// ---------- ambient hero canvas ----------
function startHeroCanvas() {
  const cv = document.getElementById('heroCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, pulses = [];
  function resize() {
    w = cv.width = cv.offsetWidth * devicePixelRatio;
    h = cv.height = cv.offsetHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener('resize', resize);
  const COLORS = ['#38bdf8', '#22c55e', '#eab308', '#ef4444', '#a855f7'];
  for (let i = 0; i < 26; i++) {
    pulses.push({
      x: Math.random(), y: Math.random() * 0.6, len: 0.05 + Math.random() * 0.12,
      speed: 0.0006 + Math.random() * 0.0016, c: COLORS[i % COLORS.length], o: 0.25 + Math.random() * 0.5,
    });
  }
  if (reduced) return; // static bg
  (function tick() {
    ctx.clearRect(0, 0, w, h);
    pulses.forEach((p) => {
      p.x += p.speed;
      if (p.x - p.len > 1) { p.x = -p.len; p.y = Math.random() * 0.6; }
      const x0 = p.x * w, x1 = (p.x - p.len) * w, y = p.y * h;
      const g = ctx.createLinearGradient(x0, y, x1, y);
      g.addColorStop(0, p.c);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha = p.o;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5 * devicePixelRatio;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 - 18 * devicePixelRatio, y);
      ctx.lineTo(x0 - 30 * devicePixelRatio, y + 14 * devicePixelRatio);
      ctx.lineTo(x1, y + 14 * devicePixelRatio);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    requestAnimationFrame(tick);
  })();
}

document.addEventListener('DOMContentLoaded', init);
