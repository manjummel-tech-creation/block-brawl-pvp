// ================= ENEMY HEALTH NUMBER ONCE YOU HIT THEM =================
// Hit someone and their health floats over their head as a number for 15 s, refreshed by every hit of yours:
// 20, 19, 18 ... 1 (each number is half a heart). Nothing shows when THEY hit YOU.
const _dealDamageFoeHP = dealDamage;
dealDamage = function (t, amt, src) {
  const r = _dealDamageFoeHP(t, amt, src);
  const a = src && src.att;
  if (a === player && player && amt > 0 && t !== player) t._hpShow = tick + 300;
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
    const hp = Math.max(0, Math.ceil(m.health + m.absorption - 1e-6)), k = clamp(m.health / 20, 0, 1);
    const col = m.absorption > 0 ? '#ffd23a' : k > 0.6 ? '#7dff6a' : k > 0.3 ? '#ffe45a' : '#ff5a5a', size = d < 9 ? 34 : d < 24 ? 26 : 20;
    g.globalAlpha = d > 30 ? 0.65 : 1; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${size}px VT323, monospace`;
    g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(String(hp), sp.x, sp.y - 10);
    g.fillStyle = col; g.fillText(String(hp), sp.x, sp.y - 10);
    g.globalAlpha = 1; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  }
};
const _startGameFoeHP = startGame;
startGame = function () { _startGameFoeHP(); for (const m of mobs) m._hpShow = 0; };
G.startGame = startGame;
