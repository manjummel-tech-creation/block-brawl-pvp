// ================= REPLAYS SHOW THE ITEM HELD AT THAT MOMENT =================
// Before, the kill-cam never changed anyone's held item (everyone showed whatever they held at the kill), and the
// full replay looked the slot up in the END-of-match inventory. Now the held item itself is recorded every tick and
// shown on the model, plus a small "holding" label for whoever you are watching.
function rpiShow(m, it) {
  const p = m.parts; if (!p || !p.held) return;
  const ic = it ? itemIcon(it) : null;
  if (!ic) { p.held.visible = false; return; }
  p.held.visible = true;
  const tex = canvasTex(ic);
  if (p.held.material.map !== tex) { p.held.material.map = tex; p.held.material.needsUpdate = true; }
  p.held.scale.setScalar(it.k === 'block' || it.k === 'gapple' ? 0.6 : 1);
}
function rpiLabel(it, who, top) {
  const g = hctx, x = W / 2, y = top ? 58 : H * 0.09 + 10;
  const name = it ? String(itemName(it)).split(' (')[0] : 'Empty hand';
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x - 150, y, 300, 44);
  const ic = it ? itemIcon(it) : null;
  if (ic) { const s = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(ic, x - 142, y + 6, 32, 32); g.imageSmoothingEnabled = s; }
  txt(`${who}: ${name}`, x - 100, y + 29, 20, '#ffffff');
}
// ---- record ----
const _gameTickRPI = gameTick;
gameTick = function () {
  const t0 = tick;
  _gameTickRPI();
  if (tick === t0) return;
  if (typeof kcBuf !== 'undefined' && kcBuf.length) { const s = kcBuf[kcBuf.length - 1]; if (!s.h) s.h = mobs.map(m => m.held || null); }
  if (REC && REC.on) {
    if (!REC.held) REC.held = mobs.map(() => []);
    const fi = REC.frames.length - 1;
    mobs.forEach((m, k) => { const L = REC.held[k]; if (!L) return; const it = m.held || null; if (!L.length || L[L.length - 1][1] !== it) L.push([fi, it]); });
  }
};
function rpiAt(k, fi) {                       // item mob k held at replay frame fi
  const L = REC && REC.held && REC.held[k]; if (!L || !L.length) return undefined;
  let lo = 0, hi = L.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (L[mid][0] <= fi) lo = mid; else hi = mid - 1; }
  return L[lo][1];
}
function rpiKcHeld() {                        // held items for the kill-cam frame on screen
  const F = killcam.frames, A = kcFrame().A;
  if (A.h) return A.h;
  for (let i = F.length - 1; i >= 0; i--) if (F[i].h) return F[i].h;
  return null;
}
// ---- show ----
let _rpiWas = false;
const _updateModelsRPI = updateModels;
updateModels = function (alpha) {
  _updateModelsRPI(alpha);
  const kc = typeof killcam !== 'undefined' && killcam;
  if (kc) { const h = rpiKcHeld(); if (h) mobs.forEach((m, k) => { if (h[k] !== undefined) rpiShow(m, h[k]); }); }
  else if (RP) { const fi = Math.floor(clamp(RP.t, 0, REC.frames.length - 1)); mobs.forEach((m, k) => { const it = rpiAt(k, fi); if (it !== undefined) rpiShow(m, it); }); }
  const on = !!(kc || RP);
  if (_rpiWas && !on) for (const m of mobs) setHeldVisual(m);     // back to the live items
  _rpiWas = on;
};
const _drawHUDRPI = drawHUD;
drawHUD = function (al) {
  _drawHUDRPI(al);
  hctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (typeof killcam !== 'undefined' && killcam) {
    const h = rpiKcHeld(), k = mobs.indexOf(player);
    if (h && k >= 0 && k !== killcam.idx) rpiLabel(h[k], 'You were holding');
    else if (h && killcam.victim && killcam.victim.lastAttacker) { const a = killcam.victim.lastAttacker, j = mobs.indexOf(a); if (j >= 0) rpiLabel(h[j], a.name + ' was holding'); }
  } else if (RP && RP.cam.mode !== 'free' && RP.cam.idx >= 0) {
    const m = mobs[RP.cam.idx], it = rpiAt(RP.cam.idx, Math.floor(clamp(RP.t, 0, REC.frames.length - 1)));
    if (m && it !== undefined) rpiLabel(it, m.isPlayer ? 'Holding' : m.name, true);
  }
};
