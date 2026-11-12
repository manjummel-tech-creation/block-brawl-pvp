// ================= LESS LAG: auto resolution · view distance · effect budgets =================
// Graphics option: Fancy (default, full quality), Auto (drops render resolution only if FPS dips), Fast (always light).
if (CFG.gfx === undefined || !CFG._v9) { CFG.gfx = 'fancy'; CFG._v9 = 1; saveCfg(); } DEF.gfx = 'fancy'; // full quality by default; the lag fixes below don't touch the look

// 1) in-game overlays used backdrop blur over the 3D view (re-blurred every frame = big GPU cost). Flat glass instead.
document.head.appendChild(Object.assign(document.createElement('style'), { textContent:
  `#feed div,#score,#endStats{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
   #feed div{background:rgba(10,12,20,.78)!important}
   #gl{image-rendering:pixelated}` }));

// 2) dynamic resolution
const PERF = { scale: 1, ema: 16.7, good: 0, lastAdj: 0, view: 999 };
function applyScale(s) {
  PERF.scale = Math.round(clamp(s, 0.5, 1) * 100) / 100;
  renderer.setPixelRatio(PERF.scale); renderer.setSize(W, H, false);
}
const _resizePerf2 = resize;
resize = function () {
  _resizePerf2();
  if (CFG.gfx === 'fast') { DPR = 1; hud.width = W; hud.height = H; }
  renderer.setPixelRatio(PERF.scale || 1); renderer.setSize(W, H, false);
};
window.addEventListener('resize', () => resize());
function gfxPreset() {
  if (CFG.gfx === 'fast') { applyScale(0.7); PERF.view = 80; }
  else if (CFG.gfx === 'fancy') { applyScale(1); PERF.view = 999; }
  else { applyScale(1); PERF.view = 999; }
  resize();
}
function perfFrame(dt) {
  if (state !== 'play' || paused || dt <= 0 || dt > 0.2) return;
  PERF.ema = PERF.ema * 0.93 + dt * 1000 * 0.07;
  if (CFG.gfx !== 'auto') return;
  const now = performance.now(); if (now - PERF.lastAdj < 1000) return;
  if (PERF.ema > 21) {                       // below ~48 FPS: lighter first on resolution, then view distance
    PERF.lastAdj = now; PERF.good = 0;
    if (PERF.scale > 0.55) applyScale(PERF.scale - 0.1);
    else if (PERF.view > 64) PERF.view = PERF.view > 200 ? 120 : PERF.view - 24;
  } else if (PERF.ema < 17.8) {
    if (++PERF.good >= 3) {                  // smooth for ~3 s: give quality back
      PERF.lastAdj = now; PERF.good = 0;
      if (PERF.view < 999) PERF.view = PERF.view >= 120 ? 999 : PERF.view + 24;
      else if (PERF.scale < 1) applyScale(PERF.scale + 0.1);
    } else PERF.lastAdj = now;
  }
}

// 3) view distance: chunks past it are hidden (and fog pulled in so it doesn't pop)
let _fogSaved = null;
function cullChunks() {
  const v = PERF.view, cx = camera.position.x, cz = camera.position.z;
  if (v >= 999) {
    if (_fogSaved) { scene.fog.near = _fogSaved[0]; scene.fog.far = _fogSaved[1]; _fogSaved = null; }
    for (const ch of chunks) for (const k of ['mo', 'mw', 'mx']) if (ch[k] && !ch[k].visible) ch[k].visible = true;
    return;
  }
  if (!_fogSaved) _fogSaved = [scene.fog.near, scene.fog.far];
  scene.fog.far = Math.min(_fogSaved[1], v - 4); scene.fog.near = Math.min(_fogSaved[0], scene.fog.far * 0.45);
  for (const ch of chunks) {
    const vis = Math.hypot(ch.cx * 16 + 8 - cx, ch.cz * 16 + 8 - cz) < v + 12;
    for (const k of ['mo', 'mw', 'mx']) if (ch[k]) ch[k].visible = vis;
  }
}
const _stepAndRenderPerf2 = stepAndRender;
stepAndRender = function (dt) {
  perfFrame(dt);
  if (state === 'play') cullChunks();
  _stepAndRenderPerf2(dt);
};
G.stepAndRender = stepAndRender;

// 4) particle budget: big fights stop flooding the particle pool
const _burstPerf = burst;
burst = function (x, y, z, n, col, spd, life, size, grav, up) {
  let k = CFG.gfx === 'fast' ? 0.5 : 1;
  if (P.n > 550) k *= 0.4; else if (P.n > 350) k *= 0.7;
  if (camera && Math.hypot(x - camera.position.x, z - camera.position.z) > 40) k *= 0.4;
  _burstPerf(x, y, z, Math.max(1, Math.round(n * k)), col, spd, life, size, grav, up);
};

// 5) sound voice cap: 40 bots fighting made hundreds of audio nodes per second
const SFXW = { t: 0, n: 0, per: {} };
const _sfxPerf = sfx;
sfx = function (name, x, y, z, vm) {
  const now = performance.now();
  if (now - SFXW.t > 70) { SFXW.t = now; SFXW.n = 0; SFXW.per = {}; }
  const near = x === undefined || !listener || Math.hypot(x - listener.x, z - listener.z) < 6;
  if (!near && (SFXW.n >= 7 || (SFXW.per[name] || 0) >= 2)) return;
  SFXW.n++; SFXW.per[name] = (SFXW.per[name] || 0) + 1;
  _sfxPerf(name, x, y, z, vm);
};

// 6) particle update without per-particle array allocations
updateParticles = function (dt) {
  let i = 0; const X = P.x, Y = P.y, Z = P.z, VX = P.vx, VY = P.vy, VZ = P.vz, L = P.life, S = P.s, Gr = P.g;
  let colDirty = false;
  while (i < P.n) {
    L[i] -= dt;
    if (L[i] <= 0) {
      const j = --P.n;
      X[i] = X[j]; Y[i] = Y[j]; Z[i] = Z[j]; VX[i] = VX[j]; VY[i] = VY[j]; VZ[i] = VZ[j]; L[i] = L[j]; S[i] = S[j]; Gr[i] = Gr[j];
      P.mesh.getColorAt(j, _pc); P.mesh.setColorAt(i, _pc); colDirty = true;
      continue;
    }
    VY[i] -= Gr[i] * dt; VX[i] *= 0.98; VZ[i] *= 0.98;
    let nx = X[i] + VX[i] * dt, ny = Y[i] + VY[i] * dt, nz = Z[i] + VZ[i] * dt;
    if (isSolid(getB(nx, ny, nz))) { VX[i] *= -0.2; VY[i] = 0; VZ[i] *= -0.2; nx = X[i]; ny = Y[i]; nz = Z[i]; }
    X[i] = nx; Y[i] = ny; Z[i] = nz;
    const s = S[i] * Math.min(1, L[i] * 3);
    _pm.makeScale(s, s, s); _pm.setPosition(nx, ny, nz); P.mesh.setMatrixAt(i, _pm);
    i++;
  }
  if (colDirty) P.mesh.instanceColor.needsUpdate = true;
  P.mesh.count = P.n; P.mesh.instanceMatrix.needsUpdate = true;
};

// 7) FPS readout (top-left, small) when Show FPS is on
if (CFG.showFps === undefined) CFG.showFps = false; DEF.showFps = false;
const _drawHUDPerf = drawHUD;
drawHUD = function (a) {
  _drawHUDPerf(a);
  if (CFG.showFps && state === 'play' && game) txt(`${Math.round(fps)} FPS · res ${Math.round(PERF.scale * 100)}%${PERF.view < 999 ? ' · view ' + PERF.view : ''}`, W / 2, 16, 16, '#9fe89f', 'center');
};

// menu
(function () {
  const rows = MENU[2].rows, i = rows.findIndex(x => x[0] === 'fov');
  rows.splice(i + 1, 0,
    ['gfx', 'Graphics', 'ch', [['fancy', 'Fancy (full quality)'], ['auto', 'Auto (lowers resolution only if it lags)'], ['fast', 'Fast (smoothest)']]],
    ['showFps', 'Show FPS', 'tg']);
})();
buildMenu();
const _startGamePerf = startGame;
startGame = function () { _startGamePerf(); gfxPreset(); };
G.startGame = startGame;
gfxPreset();
