// ================= COBWEBS ABSORB HITS =================
// If the ray to your target passes through a cobweb (e.g. they're standing in one), the web takes the hit:
// you swing into the web (and start cutting it) instead of hitting the player.
const _pickEntity = pickEntity;
pickEntity = function (e, reach, dir) {
  const r = _pickEntity(e, reach, dir);
  if (!r) return r;
  const d = dir || e.look();
  const bh = rayBlocks(e.x, e.y + e.eyeH, e.z, d[0], d[1], d[2], r.dist + 0.6);
  if (bh && bh.id === B.WEB && bh.dist <= r.dist + 0.5) { e._webBlock = { x: bh.x, y: bh.y, z: bh.z, id: B.WEB, t: tick }; return null; }
  return r;
};
// a click that lands in a web gives a chunk of cutting progress (holding the button keeps cutting)
const _attackClickWeb = playerControl;
playerControl = function (p) {
  const clicks = clickQ;
  _attackClickWeb(p);
  if (clicks > 0 && p._webBlock && p._webBlock.t === tick && !mouseHeld(KB.break)) { tickMining(p, p._webBlock); sfx('dig', p._webBlock.x + 0.5, p._webBlock.y + 0.5, p._webBlock.z + 0.5); }
};
function mouseHeld(code) { return !!keys[code]; }
// bots blocked by a web cut through it to get to you
const _botTickWeb = botTick;
botTick = function (b) {
  _botTickWeb(b);
  const w = b._webBlock;
  if (w && w.t === tick && getB(w.x, w.y, w.z) === B.WEB && !b.using) {
    const sw = b.inv.findIndex(it => it && it.k === 'sword');
    if (sw >= 0 && b.sel !== sw) { b.sel = sw; setHeldVisual(b); }
    if (tick % 4 === 0) swing(b);
    tickMining(b, w);
  }
};

// bots don't reach for the water bucket instantly when webbed: they struggle for 2-4 s first
const _botWaterSlow = botWater;
botWater = function (b, X) {
  if (b.inWeb) { b._webT = (b._webT || 0) + 1; if (b._webT < 16 + (1 - b.skill) * 16) return; }
  else b._webT = 0;
  _botWaterSlow(b, X);
};

// ---- bots: realistic reach (2.55 – 2.9 blocks depending on skill, players keep 3.0) ----
// ---- anyone standing in a 2-tall (2x1) cobweb can't be hit until the webs are cut ----
const _pickEntityReach = pickEntity;
pickEntity = function (e, reach, dir) {
  // (reach is equal for everyone now — see b4-fair.js)
  const r = _pickEntityReach(e, reach, dir);
  if (!r) return r;
  const t = r.m, fx = Math.floor(t.x), fy = Math.floor(t.y + 0.01), fz = Math.floor(t.z);
  const feet = getB(fx, fy, fz) === B.WEB, head = getB(fx, fy + 1, fz) === B.WEB;
  if (feet && head) {
    // cut the web nearest the attacker's aim first
    const d = dir || e.look(), aimY = e.y + e.eyeH + d[1] * r.dist;
    const y = aimY >= fy + 1 ? fy + 1 : fy;
    e._webBlock = { x: fx, y, z: fz, id: B.WEB, t: tick };
    return null;
  }
  return r;
};

// ---- cobwebs take 1.5 s to cut with a sword (sword speed 15 / hardness 15 / 30 = 1/30 per tick) ----
BL[B.WEB].hard = 6; // ~0.6 s with a sword

// ---- a bot caught in a cobweb can't attack; after 1-2 s it starts cutting itself free ----
const _attackWebbed = attack;
attack = function (a, t, reach) {
  if (!a.isPlayer && a.inWeb) return false;
  return _attackWebbed(a, t, reach);
};
const _botTickStuck = botTick;
botTick = function (b) {
  if (!b.inWeb) { b._stuckT = 0; b._stuckWait = 0; return _botTickStuck(b); }
  if (!b._stuckWait) b._stuckWait = 15; // 0.75 s stun when webbed
  b._stuckT = (b._stuckT || 0) + 1;
  _botTickStuck(b);
  if (b._stuckT < b._stuckWait) return; // struggling
  // cut out: head-level web first so we can see, then feet
  const fx = Math.floor(b.x), fy = Math.floor(b.y + 0.01), fz = Math.floor(b.z);
  const box = b.box(); let cell = null;
  for (let y = Math.floor(box[4] - 0.01); y >= fy && !cell; y--)
    for (let x = Math.floor(box[0]); x <= Math.floor(box[3] - 0.001) && !cell; x++)
      for (let z = Math.floor(box[2]); z <= Math.floor(box[5] - 0.001) && !cell; z++)
        if (getB(x, y, z) === B.WEB) cell = { x, y, z, id: B.WEB };
  if (!cell) return;
  if (b.using) { b.using = null; b.useT = 0; }
  const sw = b.inv.findIndex(it => it && it.k === 'sword');
  if (sw >= 0 && b.sel !== sw) { b.sel = sw; setHeldVisual(b); }
  b.in = { f: 0, s: 0, jump: false };
  if (tick % 4 === 0) swing(b);
  tickMining(b, cell);
};
// cutting a web never gets the "in the air / in water = 5x slower" penalty (you're usually stuck mid-air in one)
const _tickMiningWeb = tickMining;
tickMining = function (e, hit) {
  if (hit && hit.id === B.WEB) { const g = e.onGround, w = e.inWater; e.onGround = true; e.inWater = false; _tickMiningWeb(e, hit); e.onGround = g; e.inWater = w; return; }
  _tickMiningWeb(e, hit);
};
