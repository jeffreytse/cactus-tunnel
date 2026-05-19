// ── Theme toggle (dark → light → auto → dark) ──
var ICONS = {
  dark:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  auto:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
};
var LABELS = { dark: 'Dark mode', light: 'Light mode', auto: 'System mode' };
var CYCLE  = { dark: 'light', light: 'auto', auto: 'dark' };

var btn  = document.getElementById('theme-toggle');
var root = document.documentElement;

function applyTheme(t) {
  root.dataset.theme = t;
  btn.innerHTML = ICONS[t];
  btn.title = LABELS[t] + ' — click to switch';
  if (t === 'auto') {
    localStorage.removeItem('cactus-theme');
  } else {
    localStorage.setItem('cactus-theme', t);
  }
}

btn.addEventListener('click', function() {
  applyTheme(CYCLE[root.dataset.theme] || 'dark');
});

// Init icon (theme already applied by head script)
var stored = root.dataset.theme || 'auto';
btn.innerHTML = ICONS[stored] || ICONS.auto;
btn.title = (LABELS[stored] || LABELS.auto) + ' — click to switch';

// Sync auto mode when OS preference changes at runtime
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function() {
  if (root.dataset.theme === 'auto') {
    root.dataset.theme = '';
    requestAnimationFrame(function() { root.dataset.theme = 'auto'; });
  }
});

// ── Speed history chart ──
(function() {
  var MAX_BUF    = 3600; // 60 min × 60 s — always keep full history
  var activeSpan = 600;  // current view window (samples)
  var sendH = [], recvH = [];
  var prevS = null, prevR = null;

  var X_LABELS = {
    600:  ['−10m', '−5m',  'now'],
    1800: ['−30m', '−15m', 'now'],
    3600: ['−60m', '−30m', 'now'],
  };

  // Span selector buttons
  document.querySelectorAll('.span-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      activeSpan = parseInt(btn.dataset.span, 10);
      document.querySelectorAll('.span-btn').forEach(function(b) {
        b.classList.toggle('active', b === btn);
      });
      draw();
    });
  });

  function hb(v) {
    if (v <= 0) return '0 B';
    var k = 1024, i = Math.min(3, Math.floor(Math.log(Math.max(1, v)) / Math.log(k)));
    return (v / Math.pow(k, i)).toFixed(i ? 1 : 0) + ['B', 'KB', 'MB', 'GB'][i];
  }

  function hexRgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')';
  }

  function draw() {
    var canvas = document.getElementById('speed-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.offsetWidth, H = canvas.offsetHeight;
    if (!W || !H) return;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    var cs       = getComputedStyle(document.documentElement);
    var cSurface = cs.getPropertyValue('--surface').trim();
    var cBorder  = cs.getPropertyValue('--border').trim();
    var cMuted   = cs.getPropertyValue('--muted').trim();
    var cAccent  = cs.getPropertyValue('--accent').trim();
    var cBlue    = cs.getPropertyValue('--blue').trim();
    var fMono    = cs.getPropertyValue('--font-mono').trim();

    var pL = W < 400 ? 36 : 46, pR = 10, pT = 10, pB = 20;
    var cW = W - pL - pR, cH = H - pT - pB;

    ctx.fillStyle = cSurface;
    ctx.fillRect(0, 0, W, H);

    // max scale — scoped to the active view window
    var viewS = sendH.slice(-activeSpan), viewR = recvH.slice(-activeSpan);
    var all  = viewS.concat(viewR).filter(function(v) { return v > 0; });
    var raw  = all.length ? Math.max.apply(null, all) : 1024;
    var mag  = Math.pow(10, Math.floor(Math.log10(raw)));
    var maxV = Math.ceil(raw / mag) * mag;

    // grid + y-axis labels
    ctx.font = '9px ' + fMono;
    var ROWS = 4;
    for (var gi = 0; gi <= ROWS; gi++) {
      var gy = pT + cH * gi / ROWS;
      ctx.strokeStyle = cBorder; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pL, gy); ctx.lineTo(pL + cW, gy); ctx.stroke();
      if (gi < ROWS) {
        ctx.fillStyle = cMuted; ctx.textAlign = 'right';
        ctx.fillText(hb(maxV * (1 - gi / ROWS)), pL - 4, gy + 3);
      }
    }

    // x-axis labels
    var xl = X_LABELS[activeSpan] || X_LABELS[600];
    ctx.fillStyle = cMuted;
    ctx.textAlign = 'left';   ctx.fillText(xl[0], pL,          H - 4);
    ctx.textAlign = 'center'; ctx.fillText(xl[1], pL + cW / 2, H - 4);
    ctx.textAlign = 'right';  ctx.fillText(xl[2], pL + cW,     H - 4);

    function series(data, color) {
      data = data.slice(-activeSpan);
      var n = data.length;
      if (n < 2) return;
      function px(i) { return pL + ((activeSpan - n + i) / (activeSpan - 1)) * cW; }
      function py(i) { return pT + cH - Math.min(data[i] / maxV, 1) * cH; }

      ctx.beginPath();
      ctx.moveTo(px(0), pT + cH);
      ctx.lineTo(px(0), py(0));
      for (var j = 1; j < n; j++) ctx.lineTo(px(j), py(j));
      ctx.lineTo(px(n - 1), pT + cH);
      ctx.closePath();
      ctx.fillStyle = hexRgba(color, 0.1);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(px(0), py(0));
      for (var j = 1; j < n; j++) ctx.lineTo(px(j), py(j));
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    series(recvH, cBlue);
    series(sendH, cAccent);
  }

  setInterval(function() {
    var meta = window.bridgeMeta;
    var s = meta && meta.statics ? (meta.statics.send || 0) : 0;
    var r = meta && meta.statics ? (meta.statics.recv || 0) : 0;
    sendH.push(prevS !== null ? Math.max(0, s - prevS) : 0);
    recvH.push(prevR !== null ? Math.max(0, r - prevR) : 0);
    prevS = s; prevR = r;
    if (sendH.length > MAX_BUF) sendH.shift();
    if (recvH.length > MAX_BUF) recvH.shift();
    draw();
  }, 1000);

  window.addEventListener('resize', draw);
  new MutationObserver(draw).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });
  requestAnimationFrame(draw);
})();

// ── Status dot sync + connection uptime ──
var statusWrap  = document.querySelector('.tunnel-status');
var statusVal   = statusWrap && statusWrap.querySelector('.value');
var uptimeEl    = document.getElementById('conn-uptime');
var connectedAt = null;
var uptimeTimer = null;

function fmtUptime(ms) {
  var s  = Math.floor(ms / 1000);
  var h  = Math.floor(s / 3600);
  var m  = Math.floor((s % 3600) / 60);
  var sc = s % 60;
  var mm = m  < 10 ? '0' + m  : '' + m;
  var ss = sc < 10 ? '0' + sc : '' + sc;
  return h > 0 ? h + ':' + mm + ':' + ss : mm + ':' + ss;
}

function startUptime() {
  connectedAt = Date.now();
  if (uptimeEl) uptimeEl.textContent = '00:00';
  uptimeTimer = setInterval(function() {
    if (uptimeEl) uptimeEl.textContent = fmtUptime(Date.now() - connectedAt);
  }, 1000);
}

function stopUptime() {
  if (uptimeTimer) { clearInterval(uptimeTimer); uptimeTimer = null; }
  connectedAt = null;
  if (uptimeEl) uptimeEl.textContent = '—';
}

if (statusVal) {
  var sync = function() {
    var s = statusVal.textContent.trim().toLowerCase();
    statusWrap.dataset.status = s;
    if (s === 'connected' && !connectedAt) startUptime();
    else if (s !== 'connected' && connectedAt) stopUptime();
  };
  sync();
  new MutationObserver(sync).observe(statusVal, {
    childList: true, subtree: true, characterData: true
  });
}
