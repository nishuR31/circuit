/**
 * Commit Circuit Interactive Workbench & Studio Application Logic.
 */

// State
const state = {
  user: 'octocat',
  year: 'last',
  theme: 'breadboard',
  wireMode: 'hybrid',
  nodeStyle: 'led',
  density: '2',
  glow: 70,
  format: 'gif',
  speed: 'normal',
  frames: '10',
  stats: true,
  months: true,
  days: true,
  legend: true,
  chip: true,
  embedTab: 'markdown'
};

// DOM Elements
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const userInput = $('#userInput');
const yearSelect = $('#yearSelect');
const themeSelect = $('#themeSelect');
const wireModeSelect = $('#wireModeSelect');
const nodeStyleSelect = $('#nodeStyleSelect');
const densityRange = $('#densityRange');
const densityVal = $('#densityVal');
const glowRange = $('#glowRange');
const glowVal = $('#glowVal');
const speedSelect = $('#speedSelect');
const framesRange = $('#framesRange');
const framesVal = $('#framesVal');

const toggleStats = $('#toggleStats');
const toggleMonths = $('#toggleMonths');
const toggleDays = $('#toggleDays');
const toggleLegend = $('#toggleLegend');
const toggleChip = $('#toggleChip');

const previewImg = $('#previewImg');
const previewSvgWrap = $('#previewSvgWrap');
const previewLoading = $('#previewLoading');
const copySnippetBtn = $('#copySnippetBtn');
const snippetText = $('#snippetText');
const toastEl = $('#toast');

const statTotal = $('#statTotal');
const statActive = $('#statActive');
const statPeak = $('#statPeak');
const statRatio = $('#statRatio');
const liveUserBadge = $('#liveUserBadge');

const downloadBtn = $('#downloadBtn');

/**
 * Initialize workbench from URL params or defaults
 */
function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('user')) state.user = params.get('user');
  if (params.has('year')) state.year = params.get('year');
  if (params.has('theme')) state.theme = params.get('theme');
  if (params.has('wireMode')) state.wireMode = params.get('wireMode');
  if (params.has('nodeStyle')) state.nodeStyle = params.get('nodeStyle');
  if (params.has('density')) state.density = params.get('density');
  if (params.has('glow')) state.glow = parseInt(params.get('glow'), 10) || 70;
  if (params.has('format')) state.format = params.get('format');
  if (params.has('speed')) state.speed = params.get('speed');
  if (params.has('frames')) state.frames = params.get('frames');

  // Populate UI inputs
  userInput.value = state.user;
  yearSelect.value = state.year;
  themeSelect.value = state.theme;
  wireModeSelect.value = state.wireMode;
  nodeStyleSelect.value = state.nodeStyle;
  densityRange.value = state.density;
  updateDensityLabel();
  glowRange.value = state.glow;
  glowVal.textContent = state.glow + '%';
  speedSelect.value = state.speed;
  framesRange.value = state.frames;
  framesVal.textContent = state.frames + ' frames';

  toggleStats.checked = state.stats;
  toggleMonths.checked = state.months;
  toggleDays.checked = state.days;
  toggleLegend.checked = state.legend;
  toggleChip.checked = state.chip;

  // Format tabs
  $$('.format-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.format === state.format);
  });

  // Attach event listeners
  setupEvents();

  // Load preview & telemetry
  refresh();
}

function updateDensityLabel() {
  const labels = { '1': 'Sparse', '2': 'Medium', '3': 'Dense', '4': 'Ultra' };
  densityVal.textContent = labels[state.density] || 'Medium';
}

function setupEvents() {
  // Input changes
  $('#workbenchForm').addEventListener('submit', e => {
    e.preventDefault();
    state.user = userInput.value.trim().replace(/^@/, '') || 'octocat';
    refresh();
  });

  yearSelect.addEventListener('change', () => { state.year = yearSelect.value; refresh(); });
  themeSelect.addEventListener('change', () => { state.theme = themeSelect.value; refresh(); });
  wireModeSelect.addEventListener('change', () => { state.wireMode = wireModeSelect.value; refresh(); });
  nodeStyleSelect.addEventListener('change', () => { state.nodeStyle = nodeStyleSelect.value; refresh(); });

  densityRange.addEventListener('input', () => {
    state.density = densityRange.value;
    updateDensityLabel();
    refreshDebounced();
  });

  glowRange.addEventListener('input', () => {
    state.glow = glowRange.value;
    glowVal.textContent = state.glow + '%';
    refreshDebounced();
  });

  speedSelect.addEventListener('change', () => { state.speed = speedSelect.value; refresh(); });
  framesRange.addEventListener('input', () => {
    state.frames = framesRange.value;
    framesVal.textContent = state.frames + ' frames';
    refreshDebounced();
  });

  toggleStats.addEventListener('change', () => { state.stats = toggleStats.checked; refresh(); });
  toggleMonths.addEventListener('change', () => { state.months = toggleMonths.checked; refresh(); });
  toggleDays.addEventListener('change', () => { state.days = toggleDays.checked; refresh(); });
  toggleLegend.addEventListener('change', () => { state.legend = toggleLegend.checked; refresh(); });
  toggleChip.addEventListener('change', () => { state.chip = toggleChip.checked; refresh(); });

  // Format Tabs
  $$('.format-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.format-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.format = tab.dataset.format;
      refresh();
    });
  });

  // Embed Snippet Tabs
  $$('.embed-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.embed-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.embedTab = tab.dataset.type;
      updateSnippet();
    });
  });

  // Sample User Chips
  $$('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      userInput.value = chip.dataset.user;
      state.user = chip.dataset.user;
      refresh();
    });
  });

  // Copy Snippet Button
  copySnippetBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(snippetText.value);
      showToast('Copied code snippet to clipboard!');
    } catch {
      snippetText.select();
      document.execCommand('copy');
      showToast('Copied code snippet to clipboard!');
    }
  });

  // Download Button
  downloadBtn.addEventListener('click', () => {
    const url = buildApiUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = `commit-circuit-${state.user}-${state.year}.${state.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloading ${state.format.toUpperCase()}...`);
  });
}

let debounceTimer = null;
function refreshDebounced() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => refresh(), 300);
}

/**
 * Construct URL query string
 */
function buildApiUrl(overrideFormat = null) {
  const fmt = overrideFormat || state.format;
  const url = new URL(`${window.location.origin}/api/circuit.${fmt}`);
  url.searchParams.set('user', state.user);
  url.searchParams.set('year', state.year);
  url.searchParams.set('theme', state.theme);
  url.searchParams.set('wireMode', state.wireMode);
  url.searchParams.set('nodeStyle', state.nodeStyle);
  url.searchParams.set('density', state.density);
  url.searchParams.set('glow', state.glow);

  if (fmt === 'gif') {
    url.searchParams.set('speed', state.speed);
    url.searchParams.set('frames', state.frames);
  }

  if (!state.stats) url.searchParams.set('stats', '0');
  if (!state.months) url.searchParams.set('months', '0');
  if (!state.days) url.searchParams.set('days', '0');
  if (!state.legend) url.searchParams.set('legend', '0');
  if (!state.chip) url.searchParams.set('chip', '0');

  return url.toString();
}

/**
 * Refresh preview image and fetch telemetry
 */
async function refresh() {
  previewLoading.classList.add('active');
  liveUserBadge.textContent = `@${state.user}`;

  // Update browser URL query
  const pageUrl = new URL(window.location.href);
  pageUrl.searchParams.set('user', state.user);
  pageUrl.searchParams.set('year', state.year);
  pageUrl.searchParams.set('theme', state.theme);
  pageUrl.searchParams.set('format', state.format);
  window.history.replaceState({}, '', pageUrl.toString());

  updateSnippet();

  const apiUrl = buildApiUrl();

  if (state.format === 'svg') {
    // Render SVG inline for interactive hover
    try {
      const res = await fetch(apiUrl);
      const svgText = await res.text();
      previewImg.style.display = 'none';
      previewSvgWrap.style.display = 'block';
      previewSvgWrap.innerHTML = svgText;
      attachSvgHoverEffects();
    } catch (err) {
      console.error('Failed to load SVG:', err);
    } finally {
      previewLoading.classList.remove('active');
    }
  } else {
    // GIF or PNG
    previewSvgWrap.style.display = 'none';
    previewImg.style.display = 'block';

    const tempImg = new Image();
    tempImg.onload = () => {
      previewImg.src = tempImg.src;
      previewLoading.classList.remove('active');
    };
    tempImg.onerror = () => {
      previewLoading.classList.remove('active');
      showToast('Error loading circuit image.');
    };
    tempImg.src = apiUrl;
  }

  // Fetch telemetry in background
  fetchTelemetry();
}

async function fetchTelemetry() {
  try {
    const res = await fetch(`/api/data?user=${encodeURIComponent(state.user)}&year=${encodeURIComponent(state.year)}`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.stats) {
      statTotal.textContent = json.stats.total.toLocaleString();
      statActive.textContent = json.stats.activeDays.toLocaleString();
      statPeak.textContent = `${json.stats.peakCount}/day`;
      statRatio.textContent = `${json.stats.signalActivityRatio}%`;
    }
  } catch (err) {
    console.warn('Telemetry fetch error:', err);
  }
}

function updateSnippet() {
  const origin = window.location.origin;
  const gifUrl = buildApiUrl('gif');
  const pngUrl = buildApiUrl('png');
  const svgUrl = buildApiUrl('svg');

  const cleanUser = state.user;
  const targetUrl = `https://github.com/${cleanUser}`;

  let code = '';
  switch (state.embedTab) {
    case 'markdown':
      code = `[![${cleanUser}'s GitHub Contribution Circuit](${gifUrl})](${targetUrl})`;
      break;
    case 'html':
      code = `<a href="${targetUrl}">\n  <img src="${gifUrl}" alt="${cleanUser}'s GitHub Contribution Circuit" width="100%" />\n</a>`;
      break;
    case 'direct':
      code = buildApiUrl();
      break;
    case 'png':
      code = `[![${cleanUser}'s GitHub Contribution Circuit](${pngUrl})](${targetUrl})`;
      break;
    default:
      code = gifUrl;
  }

  snippetText.value = code;
}

function attachSvgHoverEffects() {
  const svg = previewSvgWrap.querySelector('svg');
  if (!svg) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'circuit-tooltip';
  tooltip.style.cssText = 'position:fixed;display:none;background:#0d1822;border:1px solid #38bdf8;color:#f0f6fc;padding:6px 10px;border-radius:6px;font-family:monospace;font-size:11px;pointer-events:none;z-index:999;box-shadow:0 8px 24px rgba(0,0,0,0.6);';
  document.body.appendChild(tooltip);

  svg.querySelectorAll('.cell, rect, circle').forEach(el => {
    el.addEventListener('mouseenter', e => {
      const date = el.getAttribute('data-date');
      const count = el.getAttribute('data-count');
      if (date) {
        tooltip.style.display = 'block';
        tooltip.innerHTML = `<strong>${count} commit${count === '1' ? '' : 's'}</strong><br><span style="color:#8b9eb0">${date}</span>`;
      }
    });

    el.addEventListener('mousemove', e => {
      tooltip.style.left = `${e.clientX + 14}px`;
      tooltip.style.top = `${e.clientY + 14}px`;
    });

    el.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// Start
document.addEventListener('DOMContentLoaded', init);
