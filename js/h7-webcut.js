// ================= COBWEB CUTTING FIX · HEAD WEBS · BOTS NEVER STALL NEXT TO YOU =================

// ---------- 1) bots really cut webs: progress is remembered per web block ----------
// (before, a bot switching between the top and bottom web of a 2-tall web reset its progress every time,
//  so it swung forever and never broke either one)
const WEBPROG = new Map();               // "x,y,z" -> { p, t }
const BOT_CRACKS = [];                   // crack overlays for blocks bots are breaking
for (let i = 0; i < 8; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), crackMat.clone());
  m.visible = false; scene.add(m); BOT_CRACKS.push({ m, key: '', until: 0 });
}
function showBotCrack(hit, prog) {
  const key = hit.x + ',' + hit.y + ',' + hit.z;
  const c = BOT_CRACKS.find(c => c.key === key) || BOT_CRACKS.find(c => tick > c.until) || BOT_CRACKS[0];
  c.key = key; c.until = tick + 3; c.m.visible = true; c.m.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  const st = clamp((prog * 10) | 0, 0, 9);
  if (c.m.material.map !== crackTex[st]) { c.m.material.map = crackTex[st]; c.m.material.needsUpdate = true; }
}
const _tickMiningCut = tickMining;
tickMining = function (e, hit) {
  if (!hit || e.isPlayer) return _tickMiningCut(e, hit);
  const key = hit.x + ',' + hit.y + ',' + hit.z;
  if (e._mineTick === tick && e.mineKey === key) return;          // only one bite per block per tick
  if (hit.id === B.WEB && e.mineKey !== key) { const s = WEBPROG.get(key); e.mineKey = key; e.mineProg = s && tick - s.t < 100 ? s.p : 0; }
  e._mineTick = tick;
  _tickMiningCut(e, hit);
  if (getB(hit.x, hit.y, hit.z) === hit.id) {
    if (hit.id === B.WEB) WEBPROG.set(key, { p: e.mineProg, t: tick });
    // Minecraft-style hit particles flying off the block while it's being broken
    const col = BL[hit.id] && BL[hit.id].color || '#ccc';
    for (let i = 0; i < 2; i++) spawnP(hit.x + 0.15 + Math.random() * 0.7, hit.y + 0.15 + Math.random() * 0.7, hit.z + 0.15 + Math.random() * 0.7,
      (Math.random() - 0.5) * 1.6, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.6, col, 0.45, 0.06, 9);
    showBotCrack(hit, e.mineProg);
  } else { WEBPROG.delete(key); const c = BOT_CRACKS.find(c => c.key === key); if (c) { c.m.visible = false; c.key = ''; } }
};
const _gameTickCracks = gameTick;
gameTick = function () {
  _gameTickCracks();
  for (const c of BOT_CRACKS) if (c.m.visible && tick > c.until) { c.m.visible = false; c.key = ''; }
  if (tick % 200 === 0) for (const [k, s] of WEBPROG) if (tick - s.t > 200) WEBPROG.delete(k);
};

// ---------- 2) head webs: a web only at head height can't be cut — bots keep fighting, then drop out or water it ----------
function webSpots(m) {
  const box = m.box(), fy = Math.floor(m.y + 0.01); let feet = false, head = false;
  for (let x = Math.floor(box[0]); x <= Math.floor(box[3] - 0.001); x++)
    for (let z = Math.floor(box[2]); z <= Math.floor(box[5] - 0.001); z++) {
      if (getB(x, fy, z) === B.WEB) feet = true;
      if (getB(x, fy + 1, z) === B.WEB) head = true;
    }
  return { feet, head };
}
function headOnlyWeb(m) { if (!m.inWeb) return false; const s = webSpots(m); return s.head && !s.feet; }
const _attackHeadWeb = attack;
attack = function (a, t, reach) {
  if (!a.isPlayer && headOnlyWeb(a)) { a.inWeb = false; try { return _attackHeadWeb(a, t, reach); } finally { a.inWeb = true; } }
  return _attackHeadWeb(a, t, reach);
};
const _botTickHeadWeb = botTick;
botTick = function (b) {
  if (b.dead || !b.ai || !headOnlyWeb(b)) { b._headWebT = 0; b._headWebFor = 0; return _botTickHeadWeb(b); }
  b._headWebT = (b._headWebT || 0) + 1;
  if (!b._headWebFor) b._headWebFor = 60 + ((Math.random() * 30) | 0);   // stuck for 3-4.5 s: a head web is really hard to get out of
  b.inWeb = false;                                   // fight normally: no cutting, no panic
  try { _botTickHeadWeb(b); } finally { b.inWeb = true; }
  if (b._headWebT < b._headWebFor) { b.in = { f: 0, s: 0, jump: false }; b.sprinting = false; return; }   // can swing if you're in reach, can't walk out
  b.in = { f: b.in.f * 0.5, s: b.in.s * 0.5, jump: false };                // then only a slow drag out
  // after a moment, wash it out with water (if they have it) or just keep walking out of it
  if (b._headWebT > b._headWebFor && b._headWebT % 10 === 0 && Math.random() < 0.3) {
    const full = slotWhere(b, it => it.k === 'bucket' && it.full);
    const x = Math.floor(b.x), y = Math.floor(b.y + 0.01) + 1, z = Math.floor(b.z);
    if (full >= 0 && getB(x, y, z) === B.WEB && placeWater(x, y, z)) { holdSlot(b, full); b.inv[full].full = false; setHeldVisual(b); swing(b); }
  }
};

// ---------- 3) watchdog: a bot right next to you with a full bar always swings ----------
const _attackLastHit = attack;
attack = function (a, t, reach) { const r = _attackLastHit(a, t, reach); if (r && !a.isPlayer) a._lastHitT = tick; return r; };
const _botTickWatchH7 = botTick;
botTick = function (b) {
  _botTickWatchH7(b);
  const t = b.ai && b.ai.t;
  if (b.dead || !t || t.dead || game.countdown > 0 || b.using || (b.stunT > tick) || (b.inWeb && !headOnlyWeb(b))) { b._idleNear = 0; return; }
  const d = Math.hypot(t.x - b.x, t.z - b.z);
  if (d > 2.8 || Math.abs(t.y - b.y) > 1.2 || cooldown(b) < 0.95) { b._idleNear = 0; return; }
  if (tick - (b._lastHitT || -999) < 40) { b._idleNear = 0; return; }
  if (++b._idleNear < 30) return;                    // stood next to you for 1.5 s+ with a full bar and no hit: unstick
  lookAt(b, t.x, t.y + 1.1, t.z, 60);
  const hit = pickEntity(b, 3);
  if (hit && hit.m === t) { swing(b); attack(b, t, hit.dist); b._idleNear = 0; }
  else if (b._webBlock && b._webBlock.t === tick && getB(b._webBlock.x, b._webBlock.y, b._webBlock.z) === B.WEB) tickMining(b, b._webBlock);
};

// ---------- 4) a web in a bot's own face doesn't block its swing (it can't cut it, so it hits through it) ----------
const _pickEntityHeadWeb = pickEntity;
pickEntity = function (e, reach, dir) {
  if (e.isPlayer || !headOnlyWeb(e)) return _pickEntityHeadWeb(e, reach, dir);
  const box = e.box(), y = Math.floor(e.y + 0.01) + 1, cells = [];
  for (let x = Math.floor(box[0]); x <= Math.floor(box[3] - 0.001); x++) for (let z = Math.floor(box[2]); z <= Math.floor(box[5] - 0.001); z++)
    if (getB(x, y, z) === B.WEB) { cells.push([x, z]); rawSet(x, y, z, 0); }
  try { return _pickEntityHeadWeb(e, reach, dir); } finally { for (const [x, z] of cells) rawSet(x, y, z, B.WEB); }
};

// ---------- 5) you're in a 2-tall web (can't be hit): bots next to you cut the top web straight away ----------
const _botTickCutTarget = botTick;
botTick = function (b) {
  _botTickCutTarget(b);
  const t = b.ai && b.ai.t;
  if (b.dead || !t || t.dead || !t.inWeb || b.using || game.countdown > 0 || (b.stunT > tick) || (b.inWeb && !headOnlyWeb(b))) return;
  if (b.maf && !b.maf.alert) return;
  const d = Math.hypot(t.x - b.x, t.z - b.z); if (d > 3.3 || Math.abs(t.y - b.y) > 1.5) return;
  const s = webSpots(t); if (!(s.feet && s.head)) return;
  const fy = Math.floor(t.y + 0.01) + 1, box = t.box(); let cell = null;
  for (let x = Math.floor(box[0]); x <= Math.floor(box[3] - 0.001) && !cell; x++) for (let z = Math.floor(box[2]); z <= Math.floor(box[5] - 0.001) && !cell; z++)
    if (getB(x, fy, z) === B.WEB) cell = { x, y: fy, z, id: B.WEB };
  if (!cell) return;
  const sw = b.inv.findIndex(it => it && it.k === 'sword'); if (sw >= 0 && b.sel !== sw) { b.sel = sw; setHeldVisual(b); }
  lookAt(b, cell.x + 0.5, cell.y + 0.5, cell.z + 0.5, 40);
  tickMining(b, cell);
};
