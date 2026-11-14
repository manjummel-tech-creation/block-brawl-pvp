// ================= ENEMY HEARTS ONCE A FIGHT STARTS =================
// Hit someone (or get hit by them) and their hearts float over their head for 15 s, refreshed by every hit.
const _dealDamageFoeHP = dealDamage;
dealDamage = function (t, amt, src) {
  const r = _dealDamageFoeHP(t, amt, src);
  const a = src && src.att;
  if (a && player && amt > 0) { if (a === player && t !== player) t._hpShow = tick + 300; else if (t === player && a !== player) a._hpShow = tick + 300; }
  return r;
};
const _drawHUDFoeHP = drawHUD;
drawHUD = function (al) {
  _drawHUDFoeHP(al);
  if (state !== 'play' || !player || (typeof killcam !== 'undefined' && killcam) || (typeof RP !== 'undefined' && RP)) return;
  const g = hctx, cam = camera.position; let set = false;
  for (const m of mobs) {
    if (!(m._hpShow > tick) || m.dead || m === player || !m.parts) continue;
    const q = m.parts.root.position, d = Math.hypot(q.x - cam.x, q.y - cam.y, q.z - cam.z); if (d > 48) continue;
    const sp = kcProject(q.x, q.y + 2.55, q.z); if (!sp || sp.x < -60 || sp.x > W + 60 || sp.y < -40 || sp.y > H + 40) continue;
    if (!set) { set = true; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.imageSmoothingEnabled = false; }
    const s = d < 9 ? 2 : 1;
    g.globalAlpha = d > 30 ? 0.65 : 1;
    kcHeartRow(g, sp.x, sp.y - 8 * s, m.health, m.absorption, s, 10);
    g.globalAlpha = 1;
  }
};
const _startGameFoeHP = startGame;
startGame = function () { _startGameFoeHP(); for (const m of mobs) m._hpShow = 0; };
G.startGame = startGame;
