// ================= BOTS HUNT YOU DOWN · REALISTIC ESCAPE TUNNELS =================

// ---------- 1) you hid underground / boxed yourself in -> every bot comes for you, digging fast ----------
function youAreHiding() {
  if (!player || player.dead) return false;
  const x = Math.floor(player.x), z = Math.floor(player.z), y = ffloor(player.y);
  // really hiding = roofed over AND walled in on most sides (standing under a tree or overhang doesn't count)
  let walls = 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isSolid(getB(x + dx, y, z + dz)) || isSolid(getB(x + dx, y + 1, z + dz))) walls++;
  let roof = false; for (let k = 2; k <= 5; k++) { const id = getB(x, y + k, z); if (isSolid(id) && id !== B.LEAVES) { roof = true; break; } }
  return (roof && walls >= 3) || walls === 4;
}
let hidingNow = false;
const _gameTickHunt = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickHunt();
  if (tick === t0 || !game || tick % 10) return;
  hidingNow = youAreHiding();
  if (!hidingNow) return;
  for (const b of mobs) {
    if (b.isPlayer || b.dead || !b.ai || b.team === player.team || !b.ai.x) continue;
    if (Math.hypot(b.x - player.x, b.z - player.z) > 40) continue;
    const X = b.ai.x;
    b.ai.t = player; b.ai.retarget = 60; X.rt = 60;
    if (b.health + b.absorption < 6 && b.slotOf('gapple') >= 0) continue;  // let them heal first
    const hd = Math.hypot(b.x - player.x, b.z - player.z);
    if (hd < 6 && hasLOS(b, player)) continue;           // it can already see / reach you: just fight
    if (hd > 4.5 && b.y >= player.y - 0.5) {            // far away: sprint over the surface to right above you first
      if (X.plan === 'seek' && X.seek && X.seek.hunt) { X.seek = null; }
      X.plan = 'fight'; X.planT = 12; X.hide = null; X.tower = null; X.dig = null; b.ai.mode = 'fight'; b.ai.state = 'approach';
    } else if (X.plan !== 'seek') { X.plan = 'seek'; X.seek = { t: 0, hunt: true }; X.planT = 40; X.dig = null; X.hide = null; X.tower = null; }
    else if (X.seek) { X.seek.hunt = true; X.seek.t = Math.min(X.seek.t, 200); } // don't give up while you're hiding
    b._hunting = tick;
  }
};
// hunting bots dig like they have Efficiency V: a block every 2 ticks, any pickaxe-able block
const _botDigHunt = botDig;
botDig = function (b, x, y, z) {
  if (tick - (b._hunting || -999) < 40) {
    const id = getB(x, y, z);
    if (!id || id === B.WATER || (PLANTS && PLANTS.has(id))) return true;
    if (id === 255 || BL[id].hard < 0) return 'stuck';
    lookAt(b, x + 0.5, y + 0.5, z + 0.5, 40);
    if ((b._hDigT || 0) > tick) return false;
    b._hDigT = tick + 2; swing(b);
    setB(x, y, z, 0);
    sfx('brk', x + 0.5, y + 0.5, z + 0.5);
    burst(x + 0.5, y + 0.5, z + 0.5, 12, BL[id].color, 2.4, 0.5, 0.08, 12);
    return true;
  }
  return _botDigHunt(b, x, y, z);
};
// once they break in, they fight at full aggression
const _botTickHunt = botTick;
botTick = function (b) {
  _botTickHunt(b);
  if (!b.ai || b.dead || tick - (b._hunting || -999) > 40 || !player || player.dead) return;
  const d = Math.hypot(player.x - b.x, player.y - b.y, player.z - b.z);
  if (d < 3.2 && b.ai.x && b.ai.x.plan === 'seek' && hasLOS(b, player)) { b.ai.x.plan = 'fight'; b.ai.x.seek = null; b.ai.x.planT = 30; b.ai.mode = 'fight'; }
};

// ---------- 2) realistic escape: staircase down, tunnel away, block the path, heal, come back ----------
function awayAxis(b, t) { const dx = b.x - t.x, dz = b.z - t.z; return Math.abs(dx) >= Math.abs(dz) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dz) || 1]; }
doHide = function (b, t, X) {
  const fx = Math.floor(b.x), fy = ffloor(b.y), fz = Math.floor(b.z);
  if (!X.hide) {
    const [sx, sz] = awayAxis(b, t);
    X.hide = { phase: 'stairs', surfY: fy, t: 0, sx, sz, depth: 4 + ((Math.random() * 3) | 0), len: 7 + ((Math.random() * 7) | 0), walked: 0, sealed: [] };
  }
  const H = X.hide; H.t++;
  const done = () => { X.hide = null; X.plan = 'fight'; X.planT = 40; if (b.using === 'eat') b.using = null; return false; };
  if (H.t > 1200) H.phase = 'out';
  const cx = fx + H.sx, cz = fz + H.sz;
  const face = () => { b.yaw += clamp(wrapDeg(Math.atan2(-(cx + 0.5 - b.x), cz + 0.5 - b.z) / DEG - b.yaw), -30, 30); };
  const dig = (x, y, z) => { const id = getB(x, y, z); if (isSolid(id) || id === B.WEB) { const r = botDig(b, x, y, z); if (r === 'stuck') { H.phase = H.phase === 'stairs' ? 'tunnel' : 'wait'; } setIn(b, 0, 0); return true; } return false; };
  const seal = (x, y, z) => { if (!getB(x, y, z) || PLANTS.has(getB(x, y, z))) botPlace(b, x, y, z); };
  if (H.phase === 'stairs') {                       // dig a staircase down, away from the enemy
    if (fy <= H.surfY - H.depth) { H.phase = 'tunnel'; return true; }
    face();
    if (dig(cx, fy + 1, cz) || dig(cx, fy, cz) || dig(cx, fy - 1, cz)) return true;
    if (!isSolid(getB(cx, fy - 2, cz))) botPlace(b, cx, fy - 2, cz);        // keep a floor under the next step
    setIn(b, 1, 0, false); b.sprinting = false;
    // seal the stairs above us once we're a couple of steps down
    if (fy <= H.surfY - 2) { seal(fx - H.sx, fy + 2, fz - H.sz); }
    return true;
  }
  if (H.phase === 'tunnel') {                       // 2-high tunnel straight away from them
    face();
    if (dig(cx, fy + 1, cz) || dig(cx, fy, cz)) return true;
    if (!isSolid(getB(cx, fy - 1, cz))) botPlace(b, cx, fy - 1, cz);
    const before = fx * 1000 + fz;
    setIn(b, 1, 0, false); b.sprinting = false;
    if (H.lastCell !== before) {
      H.lastCell = before; H.walked++;
      // block the path behind us every few blocks
      if (H.walked % 3 === 0) { const bx = fx - H.sx * 2, bz = fz - H.sz * 2; seal(bx, fy, bz); seal(bx, fy + 1, bz); }
    }
    if (H.walked >= H.len) { seal(fx - H.sx, fy, fz - H.sz); seal(fx - H.sx, fy + 1, fz - H.sz); H.phase = 'wait'; }
    return true;
  }
  if (H.phase === 'wait') {                         // heal in the dark
    eatIfPossible(b);
    if (b.slotOf('pot') < 0 && b.pots > 0 && b.health < 12 && typeof throwPot === 'function' && tick % 40 === 0) { b.pitch = 85; throwPot(b); }
    setIn(b, 0, 0, false, false, true);
    if (b.health + b.absorption >= 16) { H.phase = 'out'; if (b.using === 'eat') b.using = null; }
    return true;
  }
  if (H.phase === 'out') {                          // staircase back up toward the fight
    if (fy >= H.surfY) return done();
    const tx = t ? Math.sign(t.x - b.x) : -H.sx, tz = t ? Math.sign(t.z - b.z) : -H.sz;
    const ax = Math.abs(t ? t.x - b.x : 1) >= Math.abs(t ? t.z - b.z : 0) ? [tx || 1, 0] : [0, tz || 1];
    const ox = fx + ax[0], oz = fz + ax[1];
    b.yaw += clamp(wrapDeg(Math.atan2(-(ox + 0.5 - b.x), oz + 0.5 - b.z) / DEG - b.yaw), -30, 30);
    if (dig(fx, fy + 2, fz) || dig(ox, fy + 1, oz) || dig(ox, fy + 2, oz)) return true;
    if (!isSolid(getB(ox, fy, oz))) botPlace(b, ox, fy, oz);              // make the step
    setIn(b, 1, 0, b.onGround);
    return true;
  }
  return done();
};
// a bot that is low and has a pickaxe now prefers digging an escape tunnel over just running (when there's ground to dig)
const _choosePlanHunt = choosePlan;
choosePlan = function (b, t, X) {
  const p = _choosePlanHunt(b, t, X);
  if (p === 'flee' && CFG.botBuild && !X.hide && slotWhere(b, it => it.k === 'pick') >= 0 && canDigDown(b) && Math.random() < 0.6 && tick >= (X.noHideUntil || 0)) return 'hide';
  return p;
};
// plants in the way of building/digging plans get trampled (otherwise towers / pillars can't place under feet)
const BUILD_PLANS = { pillar: 1, tower: 1, seek: 1, hide: 1, tunnel: 1, bridge: 1 };
const _botTickTrample = botTick;
botTick = function (b) {
  const X = b.ai && b.ai.x;
  if (X && BUILD_PLANS[X.plan]) {
    const fx = Math.floor(b.x), fz = Math.floor(b.z), fy = ffloor(b.y);
    for (const y of [fy - 1, fy, fy + 1]) if (PLANTS.has(getB(fx, y, fz))) setB(fx, y, fz, 0);
  }
  _botTickTrample(b);
};
// low bots: prefer a real escape tunnel over towering when they can dig
const _choosePlanTunnelPref = choosePlan;
choosePlan = function (b, t, X) {
  const p = _choosePlanTunnelPref(b, t, X);
  if (p === 'tower' && !X.tower && CFG.botBuild && slotWhere(b, it => it.k === 'pick') >= 0 && canDigDown(b) && Math.random() < 0.65 && tick >= (X.noHideUntil || 0)) return 'hide';
  return p;
};
// while a bot is actively digging its escape (stairs / tunnel), it only aborts if someone is right on it (< 3 blocks)
const _botTickEscapeKeep = botTick;
botTick = function (b) {
  const X = b.ai && b.ai.x, H = X && X.hide, ph = H && H.phase;
  _botTickEscapeKeep(b);
  if (!X || !H || X.hide || (ph !== 'stairs' && ph !== 'tunnel') || b.dead) return;
  let d = 1e9; for (const o of mobs) if (!o.dead && o.team !== b.team) d = Math.min(d, Math.hypot(o.x - b.x, o.y - b.y, o.z - b.z));
  if (d >= 3 && b.health + b.absorption < 14) { X.hide = H; X.plan = 'hide'; X.planT = 40; X.noHideUntil = 0; }
};
