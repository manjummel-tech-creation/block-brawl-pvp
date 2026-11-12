// ================= BOTS HUNT DOWN HIDING PLAYERS (underground / boxed in) =================
// If a bot can't reach its target (target dug in, walled up, roofed over, or the bot is making no progress),
// it switches to "seek": it mines a staircase tunnel straight to them, building steps where needed.
function isRoofed(m) { const x = Math.floor(m.x), y = ffloor(m.y), z = Math.floor(m.z); for (let k = 2; k <= 4; k++) if (isSolid(getB(x, y + k, z))) return true; return false; }
function isBoxed(m) {
  const x = Math.floor(m.x), y = ffloor(m.y), z = Math.floor(m.z);
  let walls = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isSolid(getB(x + dx, y, z + dz)) || isSolid(getB(x + dx, y + 1, z + dz))) walls++;
  return walls === 4 || (walls >= 3 && isRoofed(m));
}
function shouldSeek(b, t, X) {
  if (!t || !CFG.botBuild) return false;
  const hd = Math.hypot(t.x - b.x, t.z - b.z), dy = t.y - b.y;
  if (hd < 7 && dy < -1.5 && isRoofed(t)) return true;                // they're underground below us
  if (hd < 8 && isBoxed(t) && (X.n % 10 === 0 ? (X.los = hasLOS(b, t)) : X.los) === false) return true; // walled in
  return (X.stuck || 0) >= 2;                                         // we just aren't getting anywhere
}
function doSeek(b, t, X) {
  const S = X.seek; S.t++;
  const done = () => { X.seek = null; X.stuck = 0; X.plan = 'fight'; X.planT = 20; return false; };
  if (!t || t.dead || S.t > 600) return done();
  const fx = Math.floor(b.x), fy = ffloor(b.y), fz = Math.floor(b.z);
  const dx = t.x - b.x, dz = t.z - b.z, hd = Math.hypot(dx, dz), dy = ffloor(t.y) - fy;
  if (Math.hypot(dx, t.y - b.y, dz) < 2.8 && pickEntity(b, 3)) return done(); // in reach: fight
  if (b.using) { b.using = null; b.useT = 0; }
  if (hd < 0.9 && dy !== 0) {
    b.vx += (fx + 0.5 - b.x) * 0.08; b.vz += (fz + 0.5 - b.z) * 0.08;
    if (dy < 0) { if (botDig(b, fx, fy - 1, fz) === 'stuck') return done(); setIn(b, 0, 0); return true; }
    if (isSolid(getB(fx, fy + 2, fz)) && b.onGround) { if (botDig(b, fx, fy + 2, fz) === 'stuck') return done(); setIn(b, 0, 0); return true; }
    if (!b.onGround && getB(fx, Math.floor(b.y) - 1, fz) === 0 && b.y - Math.floor(b.y) < 0.9) botPlace(b, fx, Math.floor(b.y) - 1, fz);
    b.pitch = lerp(b.pitch, 80, 0.3); setIn(b, 0, 0, true); return true;
  }
  // step along the dominant axis toward them (keeps the tunnel clean)
  let sx = Math.abs(dx) >= Math.abs(dz) ? Math.sign(dx) : 0, sz = sx ? 0 : Math.sign(dz);
  if (S.flip) { const k = sx; sx = sz ? Math.sign(dx) || 1 : 0; sz = k ? Math.sign(dz) || 1 : 0; if (!sx && !sz) sx = 1; }
  const cx = fx + sx, cz = fz + sz;
  b.yaw += clamp(wrapDeg(Math.atan2(-(cx + 0.5 - b.x), cz + 0.5 - b.z) / DEG - b.yaw), -25, 25);
  const need = dy < 0 ? [[cx, fy + 1, cz], [cx, fy, cz], [cx, fy - 1, cz]]
    : dy > 0 ? [[fx, fy + 2, fz], [cx, fy + 2, cz], [cx, fy + 1, cz]]
    : [[cx, fy + 1, cz], [cx, fy, cz]];
  for (const c of need) {
    const id = getB(c[0], c[1], c[2]);
    if (isSolid(id) || id === B.WEB) {
      const r = botDig(b, c[0], c[1], c[2]);
      if (r === 'stuck') { if (S.flip) return done(); S.flip = true; }
      setIn(b, 0, 0); return true;
    }
  }
  S.flip = false;
  b.pitch = lerp(b.pitch, dy < 0 ? 35 : dy > 0 ? -15 : 10, 0.3);
  if (dy > 0) { if (!isSolid(getB(cx, fy, cz))) botPlace(b, cx, fy, cz); setIn(b, 1, 0, b.onGround); }
  else { if (dy === 0 && !isSolid(getB(cx, fy - 1, cz))) botPlace(b, cx, fy - 1, cz); setIn(b, 1, 0, false); }
  return true;
}
const _choosePlanSeek = choosePlan;
choosePlan = function (b, t, X) {
  const p = _choosePlanSeek(b, t, X);
  if (p !== 'fight' && p !== 'tunnel') { X.seek = null; return p; } // fleeing / healing / towering wins
  if (X.seek) return 'seek';
  if (shouldSeek(b, t, X)) { X.seek = { t: 0 }; return 'seek'; }
  return p;
};
const _botTickSeek = botTick;
botTick = function (b) {
  const X = b.ai && b.ai.x;
  if (X) {
    X.n = (X.n || 0) + 1;
    const t = b.ai.t && !b.ai.t.dead ? b.ai.t : null;
    // progress watchdog: every 2 s, are we any closer or landing hits?
    if (t && X.n % 40 === 0) {
      const d3 = Math.hypot(t.x - b.x, t.y - b.y, t.z - b.z);
      if (X.lastD !== undefined && d3 > X.lastD - 0.5 && d3 > 3 && b.hits === X.lastHitsS && X.plan === 'fight') X.stuck = (X.stuck || 0) + 1;
      else X.stuck = 0;
      X.lastD = d3; X.lastHitsS = b.hits;
    }
    if (X.plan === 'seek' && game.countdown <= 0 && !b.inWeb && X.seek) {
      if (doSeek(b, t, X)) { b.ai.n++; return; }
    }
  }
  _botTickSeek(b);
};
// every bot gets a pickaxe and some cobble so it can dig you out
const _startGameSeek = startGame;
startGame = function () {
  _startGameSeek();
  if (!game || !CFG.botBuild) return;
  for (const m of mobs) {
    if (m.isPlayer) continue;
    const add = it => { const k = m.inv.findIndex(s => !s); if (k >= 0) m.inv[k] = it; };
    if (!m.inv.some(i => i && i.k === 'pick')) add({ k: 'pick', tier: 'iron' });
    if (!m.inv.some(i => i && i.k === 'block' && i.id !== B.WEB)) add({ k: 'block', id: B.COBBLE, n: 32 });
    m.kitProto = JSON.parse(JSON.stringify({ inv: m.inv, arrows: m.arrows }));
  }
};
G.startGame = startGame;
