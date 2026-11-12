// ================= KILL-CAM: DAMAGE HEARTS + HEALTH BARS =================
// The replay now also records everyone's health and every hit. During a kill-cam you see:
//  - "-2.5 ♥" damage popups over whoever got hit, the moment they got hit
//  - a heart bar (plus gold absorption hearts) over every fighter in view
//  - the viewer's own hearts along the bottom, like the normal HUD
let KC_PEND = [];
const _kcSnapHearts = kcSnap;
kcSnap = function () {
  _kcSnapHearts();
  const f = kcBuf[kcBuf.length - 1]; if (!f) return;
  f.hp = mobs.map(m => [m.health, m.absorption || 0]);
  if (KC_PEND.length) { f.dmg = (f.dmg || []).concat(KC_PEND); KC_PEND = []; }
};
const _dealDamageKCH = dealDamage;
dealDamage = function (t, amt, src) {
  const before = t.health + (t.absorption || 0);
  _dealDamageKCH(t, amt, src);
  const lost = before - (t.health + (t.absorption || 0));
  if (lost <= 0.01) return;
  const crit = !!(src && src.crit);
  KC_PEND.push({ i: mobs.indexOf(t), amt: lost, crit });
  // the killing blow: die() already took the snapshot this tick, so attach it to that frame
  const f = kcBuf[kcBuf.length - 1];
  if (f && f.t === tick && t.dead) { f.dmg = (f.dmg || []).concat(KC_PEND); KC_PEND = []; }
};
const _startGameKCH = startGame;
startGame = function () { KC_PEND = []; _startGameKCH(); };
G.startGame = startGame;

const _kcV = new THREE.Vector3();
function kcProject(x, y, z) {
  camera.updateMatrixWorld();
  _kcV.set(x, y, z).project(camera);
  if (_kcV.z > 1 || _kcV.z < -1) return null;
  return { x: (_kcV.x + 1) / 2 * W, y: (1 - _kcV.y) / 2 * H };
}
function kcHeartRow(g, cx, y, hp, ab, s, max) {
  const n = 10, w = n * 8 * s, x0 = Math.round(cx - w / 2), pts = Math.ceil(hp);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 8 * s;
    g.drawImage(HC.empty, x, y, 9 * s, 8 * s);
    const v = pts - i * 2;
    if (v >= 2) g.drawImage(HC.full, x, y, 9 * s, 8 * s); else if (v === 1) g.drawImage(HC.half, x, y, 9 * s, 8 * s);
  }
  if (ab > 0) {
    const a = Math.ceil(ab), rows = Math.min(Math.ceil(a / 2), max || 10);
    for (let i = 0; i < rows; i++) g.drawImage(a - i * 2 >= 2 ? HC.gfull : HC.ghalf, x0 + i * 8 * s, y - 10 * s, 9 * s, 8 * s);
  }
  return w;
}
function kcFmt(h) { const v = Math.round(h * 2) / 2; return (v % 1 ? v.toFixed(1) : String(v)); }

const _drawHUDKCH = drawHUD;
drawHUD = function (al) {
  _drawHUDKCH(al);
  if (!killcam) return;
  const F = killcam.frames; if (!F || !F.length) return;
  const { A, Bf, a } = kcFrame();
  const i = F.indexOf(A); if (i < 0 || !A.hp) return;
  const g = hctx; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.imageSmoothingEnabled = false;
  const gs = clamp(Math.floor(Math.min(W / 300, H / 230)), 2, 4);
  const cam = camera.position;

  // heart bars over every fighter in view
  A.m.forEach((p, k) => {
    if (k === killcam.idx || p[7] || !A.hp[k]) return;
    const q = Bf.m[k] || p, x = lerp(p[0], q[0], a), y = lerp(p[1], q[1], a), z = lerp(p[2], q[2], a);
    const d = Math.hypot(x - cam.x, y - cam.y, z - cam.z); if (d > 40) return;
    const s = d < 6 ? 2 : 1;
    const sp = kcProject(x, y + 2.35, z); if (!sp) return;
    const hp = A.hp[k][0], ab = A.hp[k][1];
    g.globalAlpha = d > 25 ? 0.6 : 0.95;
    kcHeartRow(g, sp.x, sp.y - 8 * s, hp, ab, s, 10);
    txt(kcFmt(hp / 2) + ' ♥', sp.x, sp.y - 10 * s - (ab > 0 ? 10 * s : 0), 9 * s + 6, '#ff6b6b', 'center');
    g.globalAlpha = 1;
  });

  // damage popups: "-2.5 ♥" rising over whoever got hit (shown for 1.2 s of replay)
  for (let j = Math.max(0, i - 24); j <= i; j++) {
    const fr = F[j]; if (!fr.dmg) continue;
    const age = (i - j + a) / 24;
    for (const e of fr.dmg) {
      const p = fr.m[e.i]; if (!p) continue;
      let sp, scale = 1;
      if (e.i === killcam.idx) sp = { x: W / 2 + 60, y: H / 2 - 30 };            // the viewer got hit: popup next to the crosshair
      else {
        const d = Math.hypot(p[0] - cam.x, p[1] - cam.y, p[2] - cam.z);
        sp = kcProject(p[0], p[1] + 2.6, p[2]); scale = clamp(8 / Math.max(1, d), 0.7, 1.4);
      }
      if (!sp) continue;
      const big = e.amt >= 6 || e.crit, size = Math.round((big ? 34 : 26) * scale);
      g.globalAlpha = clamp(1.4 - age * 1.4, 0, 1);
      txt('-' + kcFmt(e.amt / 2) + ' ♥', sp.x, sp.y - age * 50, size, big ? '#ffdd44' : '#ff4040', 'center');
      g.globalAlpha = 1;
    }
  }

  // the viewer's own health along the bottom
  const me = A.hp[killcam.idx];
  if (me) {
    const y = H * 0.91 - 12 * gs;
    kcHeartRow(g, W / 2, y, me[0], me[1], gs, 10);
    txt(`${killcam.victim.name}: ${kcFmt(me[0] / 2)} ♥`, W / 2, y - (me[1] > 0 ? 12 * gs : 2 * gs) - 4, 8 * gs, '#ffffff', 'center');
  }
};
