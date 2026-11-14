// ================= BOTS USE THE DEEP FLOOR TO HIDE =================
// With the deeper floor (YOFF layers below the old bottom) a bot that runs for cover with a pickaxe digs its staircase much
// deeper: 10-18 blocks instead of 4-6 (never closer than 4 blocks to bedrock), then tunnels away, seals the path behind it,
// heals in the dark and climbs back out. Better players dig deeper. Shallow maps (Sky Bridges, House) are unchanged.
const _doHideDeep = doHide;
doHide = function (b, t, X) {
  const fresh = !X.hide;
  // a deep bot climbs back out by digging straight up (the angled staircase out takes minutes from 15 blocks down)
  const H0 = X.hide;
  if (H0 && H0.phase === 'out' && typeof YOFF !== 'undefined' && YOFF > 0) {
    H0.outT = (H0.outT || 0) + 1;
    if (ffloor(b.y) < H0.surfY) { if (digUp(b, X, H0.surfY)) return true; }
    if (H0.outT > 700 && ffloor(b.y) < H0.surfY) { X.hide = null; X.plan = 'fight'; X.planT = 40; return false; }   // still stuck down there: give up hiding
  }
  const r = _doHideDeep(b, t, X);
  if (fresh && X.hide && typeof YOFF !== 'undefined' && YOFF > 0) {
    const H = X.hide, room = Math.floor(b.y) + YOFF - 4;                    // blocks of solid ground left to dig through
    // a staircase goes one block sideways per block down, so pick the direction with the most room (away from the enemy if it's a tie)
    const fx = Math.floor(b.x), fz = Math.floor(b.z), runs = [[-1, 0, fx - 1], [1, 0, WX - 2 - fx], [0, -1, fz - 1], [0, 1, WZ - 2 - fz]];
    const away = t ? Math.hypot(t.x - b.x, t.z - b.z) || 1 : 1;
    let best = null, bs = -1e9;
    for (const [sx, sz, run] of runs) { const sc = Math.min(run, 36) + (t ? -((t.x - b.x) * sx + (t.z - b.z) * sz) / away * 12 : 0); if (sc > bs) { bs = sc; best = [sx, sz, run]; } }
    H.sx = best[0]; H.sz = best[1];
    if (room > H.depth) H.depth = Math.max(H.depth, Math.min(room, best[2] - 4, 10 + ((Math.random() * 6) | 0) + Math.round((b.skill || 0.5) * 3)));
    H.len = Math.max(0, Math.min(H.len, best[2] - H.depth - 3));            // keep the tunnel away from the world edge (brick wall: can't dig up there)
  }
  return r;
};

// ---- hiding is a SOMETIMES thing: ~30% of low-health moments, then a cool-down, so bots keep coming at you ----
const _choosePlanSome = choosePlan;
choosePlan = function (b, t, X) {
  const p = _choosePlanSome(b, t, X);
  if (p !== 'hide' || X.hide) return p;
  if (tick < (X.noHideUntil || 0)) return 'flee';
  if (tick > (X._hideRollT || 0)) { X._hideRollT = tick + 600; X._hideOK = Math.random() < 0.3; }     // one roll per 30 s, not one per decision
  return X._hideOK ? p : 'flee';
};
const _botTickHideCool = botTick;
botTick = function (b) {
  const X = b.ai && b.ai.x, had = X && X.hide;
  _botTickHideCool(b);
  if (had && X && !X.hide) { X.noHideUntil = tick + 1800 + ((Math.random() * 1200) | 0); X._hideOK = false; }   // came back up: no hiding again for 1.5-2.5 min
};
