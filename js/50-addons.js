// ================= ADD-ONS v2 (hooks into the existing systems, nothing above is rewritten) =================
// mouse capture · crit toggle/reminder · speed · weight · charged ground-hit knockback · armour strength
// water bucket (counters cobwebs, MLG) · bot roster (names / type / difficulty) · bots that build, bridge, dig & tunnel

// ---------- new settings ----------
const NEW_DEF = { crits: true, moveSpeed: 85, weight: 70, chargedKb: 100, armorBoost: 140, bucket: true, botGapples: 3, botWebs: 4, botBuild: true };
for (const k in NEW_DEF) { DEF[k] = NEW_DEF[k]; if (CFG[k] === undefined) CFG[k] = NEW_DEF[k]; }
if (!CFG._v2) { if (!CFG.webs) CFG.webs = 8; CFG._v2 = 1; saveCfg(); }

// ---------- cute bot names ----------
const CUTE = ['Cute Panda', 'Sleepy Fox', 'Fluffy Bunny', 'Mochi Cat', 'Captain Waffles', 'Tiny Dragon', 'Bubble Tea', 'Peanut Butter', 'Sir Noodle',
  'Happy Penguin', 'Coco Bean', 'Maple Syrup', 'Dizzy Duck', 'Lucky Clover', 'Pixel Pup', 'Mango Muffin', 'Snowy Owl', 'Jelly Bean', 'Marshmallow',
  'Honey Bear', 'Pumpkin Pie', 'Sprinkles', 'Chicken Nugget', 'Baby Yeti', 'Cinnamon Roll', 'Lil Taco', 'Kiwi Bird', 'Gummy Bear', 'Potato Prince', 'Sunny Otter'];
BOT_NAMES.length = 0; BOT_NAMES.push(...CUTE);

// ---------- bot types ----------
const BOT_TYPES = {
  balanced:  { n: 'Balanced',            aggro: 0,    fleeHp: 5,  build: true,  dig: false, webs: true,  kite: false, ambush: false },
  pvp:       { n: 'Sweaty PvPer',        aggro: 0.2,  fleeHp: 3,  build: false, dig: false, webs: true,  kite: false, ambush: false },
  builder:   { n: 'Builder / Bridger',   aggro: 0,    fleeHp: 6,  build: true,  dig: false, webs: false, kite: false, ambush: false },
  miner:     { n: 'Miner / Tunneler',    aggro: -0.1, fleeHp: 8,  build: true,  dig: true,  webs: false, kite: false, ambush: true },
  archer:    { n: 'Archer',              aggro: -0.2, fleeHp: 6,  build: true,  dig: false, webs: true,  kite: true,  ambush: false },
  coward:    { n: 'Runner (hit & run)',  aggro: -0.4, fleeHp: 12, build: true,  dig: true,  webs: true,  kite: false, ambush: false },
  berserker: { n: 'Berserker',           aggro: 0.4,  fleeHp: 0,  build: false, dig: false, webs: false, kite: false, ambush: false },
  random:    { n: 'Random' }
};
const DIFFS = { easy: ['Easy', 0.25], normal: ['Normal', 0.5], hard: ['Hard', 0.75], insane: ['Insane', 0.95], slider: ['Slider %', null] };
function uniqueName(skip) {
  const used = new Set((CFG.roster || []).filter(r => r !== skip).map(r => r.name));
  const free = CUTE.filter(n => !used.has(n));
  return free.length ? free[(Math.random() * free.length) | 0] : 'Bot ' + ((CFG.roster || []).length + 1);
}
function syncRoster() {
  if (!Array.isArray(CFG.roster)) CFG.roster = [];
  const want = clamp(CFG.bots | 0, 1, 15);
  while (CFG.roster.length < want) CFG.roster.push({ name: uniqueName(), type: 'balanced', diff: 'slider' });
  CFG.roster.length = want;
}

// ---------- 1. mouse capture: lock on click, stay locked until Esc ----------
let lockErrors = 0;
lockMouse = function () {
  if (document.pointerLockElement === glCanvas) return;
  try { const r = glCanvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
};
document.addEventListener('pointerlockerror', () => { lockErrors++; freeLook = lockErrors >= 3; });
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement === glCanvas) { lockErrors = 0; freeLook = false; } });
document.addEventListener('mousedown', e => {
  if (state === 'play' && !paused && game && !game.over && !locked && e.target === glCanvas) lockMouse();
}, true);
// the match waits while the mouse isn't captured (so you never fight with a loose cursor)
const _gameTick = gameTick;
gameTick = function () {
  if (!G.noLockCheck && !freeLook && state === 'play' && !locked && game && !game.over && player && !(player.dead && game.win === 'last')) return;
  _gameTick();
};

// ---------- 2. movement speed ----------
const _moveRelative = moveRelative;
moveRelative = function (e, strafe, forward, factor) {
  if (e.onGround && !e.inWater) factor *= CFG.moveSpeed / 100;
  _moveRelative(e, strafe, forward, factor);
};

// ---------- 3. heavier players: less knockback ----------
const _knockback = knockback;
knockback = function (t, strength, xr, zr) { _knockback(t, strength * CFG.weight / 100, xr, zr); };

// ---------- 4. armour makes you die less quickly ----------
const _afterArmor = afterArmor;
afterArmor = function (dmg, pts, tough) {
  let r = _afterArmor(dmg, pts, tough);
  if (pts > 0) r *= 1 - clamp((CFG.armorBoost / 100 - 1) * (pts / 20) * 0.4, 0, 0.7);
  return r;
};

// ---------- 5. crits toggle + charged ground-hit knockback ----------
let critPopT = -1e9, kbPopT = -1e9;
isCrit = function (a, strong) {
  if (!CFG.crits) return false;
  const spr = a._sprintSave !== undefined ? a._sprintSave : a.sprinting;
  return (COMBAT18 || strong) && a.fallDistance > 0 && !a.onGround && !a.inWater && !a.inWeb && !(spr && !COMBAT18);
};
const _attack = attack;
attack = function (a, t, reach) {
  const cd = cooldown(a), crit = isCrit(a, cd > 0.9), spr = a.sprinting;
  // 1.9+: knockback bonus comes from a fully charged hit on the ground, not from sprinting
  if (!COMBAT18) { a._sprintSave = spr; a.sprinting = false; }
  const r = _attack(a, t, reach);
  if (!COMBAT18) { a.sprinting = spr; delete a._sprintSave; }
  if (!r) return r;
  const w = CFG.weight / 100, s = 1 - t.kbRes;
  if (COMBAT18 && spr) { // scale 1.8's sprint bonus by weight too
    t.vx -= -Math.sin(a.yaw * DEG) * 0.5 * s * (1 - w); t.vz -= Math.cos(a.yaw * DEG) * 0.5 * s * (1 - w);
  }
  if (!COMBAT18 && cd >= 0.95 && a.onGround && !t.dead) {
    const k = s * w * CFG.chargedKb / 100;
    t.vx += -Math.sin(a.yaw * DEG) * 0.5 * k; t.vz += Math.cos(a.yaw * DEG) * 0.5 * k; t.vy += 0.1 * k;
    a.vx *= 0.6; a.vz *= 0.6; a.sprinting = false; a.dtap = false;
    if (a === player) kbPopT = performance.now();
  }
  if (crit && a === player) critPopT = performance.now();
  return r;
};

// ---------- 6. water bucket ----------
const waterFlows = new Map();
function placeWater(x, y, z) {
  const c = getB(x, y, z);
  if (c === 255 || (c && c !== B.WEB && c !== B.WATER)) return false;
  setB(x, y, z, B.WATER);
  const flows = [];
  let yy = y - 1;
  for (let n = 0; n < 12 && yy >= 0; n++, yy--) { const id = getB(x, yy, z); if (id === 0 || id === B.WEB) { setB(x, yy, z, B.WATER); flows.push([x, yy, z]); } else break; }
  const by = yy + 1;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const id = getB(x + dx, by, z + dz);
    if ((id === 0 || id === B.WEB) && isSolid(getB(x + dx, by - 1, z + dz))) { setB(x + dx, by, z + dz, B.WATER); flows.push([x + dx, by, z + dz]); }
    if (getB(x + dx, y, z + dz) === B.WEB) setB(x + dx, y, z + dz, 0); // water washes nearby webs away
  }
  waterFlows.set(x + ',' + y + ',' + z, flows);
  sfx('splash', x + 0.5, y + 0.5, z + 0.5);
  burst(x + 0.5, y + 0.8, z + 0.5, 14, ['#3a6ae0', '#8ab0ff', '#ffffff'], 2.5, 0.5, 0.07, 9);
  return true;
}
function pickupWater(x, y, z) {
  if (getB(x, y, z) !== B.WATER) return false;
  setB(x, y, z, 0);
  const k = x + ',' + y + ',' + z, flows = waterFlows.get(k);
  if (flows) for (const [a, b, c] of flows) if (getB(a, b, c) === B.WATER) setB(a, b, c, 0);
  waterFlows.delete(k);
  sfx('splash', x + 0.5, y + 0.5, z + 0.5, 0.6);
  return true;
}
function rayAny(e, maxD, want) { // step the look ray and return the first cell matching want(id)
  const d = e.look(); let px = NaN, py = NaN, pz = NaN;
  for (let t = 0; t <= maxD; t += 0.05) {
    const x = Math.floor(e.x + d[0] * t), y = Math.floor(e.y + e.eyeH + d[1] * t), z = Math.floor(e.z + d[2] * t);
    if (x === px && y === py && z === pz) continue;
    const id = getB(x, y, z);
    if (want(id)) return { x, y, z, prev: [px, py, pz] };
    if (isSolid(id)) return null;
    px = x; py = y; pz = z;
  }
  return null;
}
function useBucket(e) {
  const it = e.held; if (!it || it.k !== 'bucket') return false;
  if (it.full) {
    const web = rayAny(e, 4.5, id => id === B.WEB);
    if (web && placeWater(web.x, web.y, web.z)) { it.full = false; swing(e); setHeldVisual(e); return true; }
    const d = e.look(), h = rayBlocks(e.x, e.y + e.eyeH, e.z, d[0], d[1], d[2], 4.5);
    if (h && isSolid(h.id) && placeWater(h.x + h.face[0], h.y + h.face[1], h.z + h.face[2])) { it.full = false; swing(e); setHeldVisual(e); return true; }
  } else {
    const w = rayAny(e, 4.5, id => id === B.WATER);
    if (w && pickupWater(w.x, w.y, w.z)) { it.full = true; swing(e); setHeldVisual(e); return true; }
  }
  return false;
}
const bucketIcon = full => pxArt(px => {
  line(px, 3, 6, 5, 2, '#5a5a5a'); line(px, 5, 2, 10, 2, '#5a5a5a'); line(px, 10, 2, 12, 6, '#5a5a5a');
  for (let y = 6; y < 15; y++) {
    const l = Math.round(3 + (y - 6) * 0.3), r = Math.round(12 - (y - 6) * 0.3);
    for (let x = l; x <= r; x++) px(x, y, x === l || x === r || y === 14 ? '#3a3a3a' : (full && y < 9) ? (y === 6 ? '#8ab0ff' : '#3a6ae0') : y === 6 ? '#555' : '#a8a8a8');
  }
});
ICON.bucketFull = bucketIcon(true); ICON.bucketEmpty = bucketIcon(false);
const _itemIcon = itemIcon;
itemIcon = function (it) { if (it && it.k === 'bucket') return it.full ? ICON.bucketFull : ICON.bucketEmpty; return _itemIcon(it); };
const _itemName = itemName;
itemName = function (it) { if (it && it.k === 'bucket') return it.full ? 'Water Bucket (counters cobwebs, breaks falls)' : 'Bucket (right click water to refill)'; return _itemName(it); };
const _playerControl = playerControl;
playerControl = function (p) {
  if (p.held && p.held.k === 'bucket' && (placePress || usePress)) { useBucket(p); placePress = usePress = false; }
  _playerControl(p);
};

// ---------- 7. HUD: crit reminder, mouse hint ----------
const _drawHUD = drawHUD;
drawHUD = function (alpha) {
  _drawHUD(alpha);
  const hint = $('#lockhint');
  if (state !== 'play' || !game || !player) { hint.classList.add('hidden'); return; }
  const needLock = !locked && !freeLook && !paused && !game.over && !(player.dead && game.win === 'last') && !G.noLockCheck;
  hint.textContent = 'Click to play — the mouse stays captured until you press Esc';
  hint.classList.toggle('hidden', !needLock);
  if (!showDebug) $('#dbg').textContent += `\nCrits: ${CFG.crits ? 'ON  (jump hits + full-bar hits = x1.5)' : 'OFF'}`;
  const now = performance.now();
  if (now - critPopT < 700) txt('CRITICAL HIT!', W / 2, H / 2 - 34, 30, '#ffdd55', 'center');
  if (now - kbPopT < 450) txt('KNOCKBACK!', W / 2, H / 2 + 62, 22, '#9fe0ff', 'center');
  if (CFG.crits && !player.dead && !player.onGround && player.fallDistance > 0 && !player.inWater) txt('✦', W / 2 + 20, H / 2 + 8, 24, '#ffdd55', 'center');
};
const _centerMsg = centerMsg;
centerMsg = function (big, small) { if (small === 'Get ready') small = `Get ready  ·  Crits ${CFG.crits ? 'ON' : 'OFF'}`; _centerMsg(big, small); };

// ---------- 8. match setup: roster names / types / difficulty, extra kit ----------
const _startGame = startGame;
startGame = function () {
  syncRoster();
  _startGame();
  if (!game) return;
  const addTo = (m, it) => { const k = m.inv.findIndex(s => !s); if (k >= 0) m.inv[k] = it; };
  // player
  if (CFG.bucket) addTo(player, { k: 'bucket', full: true });
  player.kitProto = JSON.parse(JSON.stringify({ inv: player.inv, arrows: player.arrows }));
  // bots
  const bots = mobs.filter(m => !m.isPlayer);
  const types = Object.keys(BOT_TYPES).filter(k => k !== 'random');
  bots.forEach((m, i) => {
    const R = CFG.roster[i] || { name: uniqueName(), type: 'balanced', diff: 'slider' };
    const type = R.type === 'random' || !BOT_TYPES[R.type] ? types[(Math.random() * types.length) | 0] : R.type;
    const T2 = BOT_TYPES[type];
    let name = R.name || uniqueName(); if (mobs.some(o => o !== m && o.name === name)) name += ' ' + (i + 1);
    if (m.team === m.name) m.team = name;
    m.name = name; m.type = type;
    const base = DIFFS[R.diff] && DIFFS[R.diff][1] != null ? DIFFS[R.diff][1] : CFG.skill / 100;
    m.skill = clamp(base + (Math.random() - 0.5) * 0.06, 0, 1);
    m.aggro = clamp(CFG.aggro / 100 + T2.aggro + (Math.random() - 0.5) * 0.1, 0, 1);
    // golden apples
    let g = m.inv.find(it => it && it.k === 'gapple');
    if (g) g.n = CFG.botGapples; else if (CFG.botGapples > 0) addTo(m, { k: 'gapple', n: CFG.botGapples });
    if (T2.kite && m.slotOf('bow') < 0) { addTo(m, { k: 'bow', power: CFG.power }); }
    if (T2.kite) m.arrows = Math.max(m.arrows, 32);
    if (CFG.botBuild && T2.build) addTo(m, { k: 'block', id: m.team === 'red' ? B.WOOL_R : m.team === 'blue' ? B.WOOL_B : B.COBBLE, n: 64 });
    if (CFG.botBuild && (T2.dig || T2.build)) addTo(m, { k: 'pick', tier: 'iron' });
    if (T2.webs && CFG.botWebs > 0) addTo(m, { k: 'block', id: B.WEB, n: CFG.botWebs });
    if (CFG.botBuild) addTo(m, { k: 'bucket', full: true });
    m.kitProto = JSON.parse(JSON.stringify({ inv: m.inv, arrows: m.arrows }));
    m.ai.thr = newThreshold(m);
    m.ai.x = { plan: 'fight', planT: 0, webCD: 60 + ((Math.random() * 60) | 0), wallCD: 0, rt: 0, lastHits: 0 };
    drawTag(m);
  });
};

// ---------- 9. smarter bots: decision layer on top of the combat AI ----------
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const slotWhere = (b, fn) => b.inv.findIndex(it => it && fn(it));
const blockSlot = b => slotWhere(b, it => it.k === 'block' && it.id !== B.WEB && it.n > 0);
const ffloor = v => Math.floor(v + 0.001);
function cellFreeOfMobs(x, y, z) {
  for (const m of mobs) { if (m.dead) continue; const b = m.box(); if (b[0] < x + 1 && b[3] > x && b[1] < y + 1 && b[4] > y && b[2] < z + 1 && b[5] > z) return false; }
  return true;
}
function holdSlot(b, i) { if (i >= 0 && b.sel !== i) { b.sel = i; b.mineProg = 0; b.mineKey = null; setHeldVisual(b); } }
function botPlace(b, x, y, z, web) {
  if (y < 0 || y >= WY || b.useCD > 0) return false;
  const cur = getB(x, y, z);
  if (cur !== 0 && !(cur === B.WATER && !web)) return false;
  if (!N6.some(([dx, dy, dz]) => isSolid(getB(x + dx, y + dy, z + dz)))) return false;
  const slot = web ? slotWhere(b, it => it.k === 'block' && it.id === B.WEB && it.n > 0) : blockSlot(b);
  if (slot < 0) return false;
  if (!web && !cellFreeOfMobs(x, y, z)) return false;
  const it = b.inv[slot];
  holdSlot(b, slot);
  setB(x, y, z, it.id); it.n--; b.useCD = 2;
  swing(b); sfx('place', x + 0.5, y + 0.5, z + 0.5);
  return true;
}
function lookAt(b, x, y, z, rate) {
  const ax = x - b.x, ay = y - (b.y + b.eyeH), az = z - b.z;
  b.yaw += clamp(wrapDeg(Math.atan2(-ax, az) / DEG - b.yaw), -(rate || 25), rate || 25);
  b.pitch = clamp(b.pitch + clamp(-Math.atan2(ay, Math.hypot(ax, az)) / DEG - b.pitch, -(rate || 25), rate || 25), -90, 90);
}
function botDig(b, x, y, z) { // false = still digging, true = passable, 'stuck' = can't
  const id = getB(x, y, z);
  if (!id || id === B.WATER) return true;
  if (id === 255 || BL[id].hard < 0 || BL[id].hard > 5) return 'stuck';
  const tool = BL[id].tool === 'pick' ? slotWhere(b, it => it.k === 'pick') : BL[id].tool === 'axe' ? slotWhere(b, it => it.k === 'axe') : BL[id].tool === 'sword' ? slotWhere(b, it => it.k === 'sword') : -1;
  if (tool >= 0) holdSlot(b, tool);
  lookAt(b, x + 0.5, y + 0.5, z + 0.5, 30);
  tickMining(b, { x, y, z, id });
  return false;
}
function setIn(b, f, s, jump, sprint, sneak) {
  b.in = { f, s, jump: !!jump }; b.sneaking = !!sneak; b.sprinting = !!sprint && f >= 0.8 && !b.using;
}
function canDigDown(b) {
  const x = ffloor(b.x), y = ffloor(b.y), z = ffloor(b.z);
  for (let k = 1; k <= 3; k++) { const id = getB(x, y - k, z); if (!isSolid(id) || id === 255 || BL[id].hard < 0 || BL[id].hard > 3) return false; }
  return isSolid(getB(x, y - 4, z)) && getB(x, y - 4, z) !== B.WATER;
}
function needBridge(b, t) {
  const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz);
  if (t.y < b.y - 3) return false;
  const n = Math.min(14, Math.floor(d) - 1);
  for (let i = 1; i <= n; i++) if (!hasGroundBelow(b.x + dx / d * i, b.y, b.z + dz / d * i, 4)) return true;
  return false;
}
function pathBlocked(b, t) {
  const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz) || 1;
  const cx = Math.floor(b.x + dx / d * 0.9), cz = Math.floor(b.z + dz / d * 0.9), y = ffloor(b.y);
  return (isSolid(getB(cx, y, cz)) && isSolid(getB(cx, y + 1, cz))) || b.ai.unreach > 30;
}
function choosePlan(b, t, X) {
  const T2 = BOT_TYPES[b.type], hp = b.health + b.absorption, sk = b.skill, ag = b.aggro;
  X.hitRun = false;
  if (!t) return 'fight';
  if (X.dig) return 'tunnel';
  if (X.hide) return 'hide';
  const dx = t.x - b.x, dz = t.z - b.z, dist = Math.hypot(dx, dz), dy = t.y - b.y;
  const hasGap = b.slotOf('gapple') >= 0;
  // golden apple time: let the combat AI's heal routine run (it backs off, then eats)
  if (b.ai.mode === 'heal' || (hasGap && b.absorption <= 0 && b.regenFx <= 0 && hp < 6 + 6 * (1 - ag) + 3 * sk)) return 'fight';
  // low and nothing to eat: run away or dig in
  if (hp < T2.fleeHp && b.regenFx <= 0) return T2.dig && CFG.botBuild && canDigDown(b) && dist > 3 ? 'hide' : 'flee';
  if ((X.plan === 'flee') && hp < 15 && (X.fleeT || 0) < 200) return 'flee';
  if (dist < 3.4 && Math.abs(dy) < 2) return 'fight';
  if (!CFG.botBuild) return T2.kite && b.arrows > 0 && b.slotOf('bow') >= 0 && dist > 4.5 && dist < 30 ? 'kite' : 'fight';
  const blocks = blockSlot(b) >= 0;
  if (T2.build && blocks && (dy > 2.2 || (X.plan === 'pillar' && dy > 0.6)) && dist < 7 && b.fallDistance < 2) return 'pillar';
  if (T2.build && blocks && dist > 3.5 && needBridge(b, t)) return 'bridge';
  if (T2.dig && slotWhere(b, it => it.k === 'pick') >= 0 && dist > 5 && (pathBlocked(b, t) || (T2.ambush && dist > 14 && sk > 0.3 && canDigDown(b) && Math.random() < 0.15))) return 'tunnel';
  if (T2.kite && b.arrows > 0 && b.slotOf('bow') >= 0 && dist > 4.5 && dist < 30) return 'kite';
  return 'fight';
}
function doPillar(b, t, X) {
  if (blockSlot(b) < 0 || t.y <= b.y + 0.3) { X.planT = 0; return false; }
  const fx = Math.floor(b.x), fz = Math.floor(b.z), fy = ffloor(b.y);
  if (isSolid(getB(fx, fy + 2, fz)) && b.onGround) { if (botDig(b, fx, fy + 2, fz) === 'stuck') { X.planT = 0; return false; } setIn(b, 0, 0); return true; }
  b.pitch = lerp(b.pitch, 85, 0.4);
  if (!b.onGround && getB(fx, Math.floor(b.y) - 1, fz) === 0 && b.y - Math.floor(b.y) < 0.9) botPlace(b, fx, Math.floor(b.y) - 1, fz);
  // drift to the centre of the block so we land on what we placed
  const cx = fx + 0.5 - b.x, cz = fz + 0.5 - b.z; b.vx += cx * 0.05; b.vz += cz * 0.05;
  setIn(b, 0, 0, true);
  return true;
}
function doBridge(b, t, X) {
  const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz);
  if (d < 3.5 || blockSlot(b) < 0) { X.planT = 0; return false; }
  b.yaw += clamp(wrapDeg(Math.atan2(-dx, dz) / DEG - b.yaw), -20, 20); b.pitch = lerp(b.pitch, 76, 0.3);
  const ux = -Math.sin(b.yaw * DEG), uz = Math.cos(b.yaw * DEG), fy = ffloor(b.y) - 1;
  for (const k of [0.6, 1.1]) {
    const cx = Math.floor(b.x + ux * k), cz = Math.floor(b.z + uz * k);
    if (!isSolid(getB(cx, fy, cz))) {
      botPlace(b, cx, fy, cz) || botPlace(b, cx, fy, Math.floor(b.z)) || botPlace(b, Math.floor(b.x), fy, cz);
      break;
    }
  }
  setIn(b, 1, 0, false, false, true);
  if (!b.onGround) b.sneaking = false;
  return true;
}
function digUp(b, X, surfY) { // dig the roof and pillar up to the surface. returns true while busy
  const fx = Math.floor(b.x), fz = Math.floor(b.z), fy = ffloor(b.y);
  if (fy >= surfY) return false;
  if (isSolid(getB(fx, fy + 2, fz)) && b.onGround) { if (botDig(b, fx, fy + 2, fz) === 'stuck') return false; setIn(b, 0, 0); return true; }
  if (!b.onGround && getB(fx, Math.floor(b.y) - 1, fz) === 0 && b.y - Math.floor(b.y) < 0.9) botPlace(b, fx, Math.floor(b.y) - 1, fz);
  b.pitch = lerp(b.pitch, 80, 0.3);
  setIn(b, 0, 0, true);
  return true;
}
function digDown(b) { // returns true while busy
  const fx = Math.floor(b.x), fz = Math.floor(b.z), fy = ffloor(b.y);
  b.vx += (fx + 0.5 - b.x) * 0.08; b.vz += (fz + 0.5 - b.z) * 0.08;
  const r = botDig(b, fx, fy - 1, fz);
  setIn(b, 0, 0);
  return r !== 'stuck';
}
function doTunnel(b, t, X) {
  X.tunT = (X.tunT || 0) + 1;
  const fy = ffloor(b.y);
  const finish = () => { X.dig = null; X.tunT = 0; X.plan = 'fight'; X.planT = 40; return false; };
  if (X.tunT > 500) return finish();
  if (!X.dig) X.dig = { phase: BOT_TYPES[b.type].ambush && canDigDown(b) && Math.hypot(t.x - b.x, t.z - b.z) > 10 ? 'down' : 'across', surfY: fy, clear: 0 };
  const D = X.dig;
  if (D.phase === 'down') {
    if (fy <= D.surfY - 2 || !canDigDown(b) && fy < D.surfY) D.phase = 'across';
    else if (!digDown(b)) D.phase = 'across';
    else return true;
  }
  if (D.phase === 'across') {
    const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz);
    if (d < 2.2) D.phase = fy < D.surfY ? 'up' : 'done';
    else {
      b.yaw += clamp(wrapDeg(Math.atan2(-dx, dz) / DEG - b.yaw), -15, 15);
      const ux = -Math.sin(b.yaw * DEG), uz = Math.cos(b.yaw * DEG);
      const cx = Math.floor(b.x + ux * 0.75), cz = Math.floor(b.z + uz * 0.75);
      for (const yy of [fy + 1, fy]) {
        const id = getB(cx, yy, cz);
        if (isSolid(id) || id === B.WEB) {
          const r = botDig(b, cx, yy, cz);
          if (r === 'stuck') return finish();
          D.clear = 0; setIn(b, 0, 0); return true;
        }
      }
      if (!isSolid(getB(cx, fy - 1, cz))) botPlace(b, cx, fy - 1, cz);
      if (fy >= D.surfY && ++D.clear > 12) return finish();
      b.pitch = lerp(b.pitch, 10, 0.2);
      setIn(b, 1, 0, false, false, false);
      return true;
    }
  }
  if (D.phase === 'up') { if (digUp(b, X, D.surfY)) return true; D.phase = 'done'; }
  return finish();
}
function eatIfPossible(b) {
  const g = b.slotOf('gapple');
  if (g < 0 || b.absorption > 0 || b.health >= 18) { if (b.using === 'eat') { b.using = null; b.useT = 0; } return; }
  holdSlot(b, g);
  if (b.using !== 'eat') { b.using = 'eat'; b.useT = 0; } else b.useT++;
  if (b.useT % 4 === 0) sfx('eat', b.x, b.y, b.z, 0.7);
  if (b.useT >= 32) eatGapple(b);
}
function doHide(b, t, X) {
  const fy = ffloor(b.y), fx = Math.floor(b.x), fz = Math.floor(b.z);
  if (!X.hide) { if (!canDigDown(b)) return false; X.hide = { phase: 'down', surfY: fy, t: 0 }; }
  const H2 = X.hide; H2.t++;
  const done = () => { X.hide = null; X.plan = 'fight'; X.planT = 40; if (b.using === 'eat') b.using = null; return false; };
  if (H2.t > 700) H2.phase = 'up';
  if (H2.phase === 'down') {
    if (fy <= H2.surfY - 3) H2.phase = 'seal';
    else if (!digDown(b)) H2.phase = 'seal';
    else return true;
  }
  if (H2.phase === 'seal') {
    // close the hole above our head and wait it out
    if (getB(fx, fy + 2, fz) === 0) { b.pitch = -80; botPlace(b, fx, fy + 2, fz); }
    if (b.onGround) H2.phase = 'wait';
    setIn(b, 0, 0); return true;
  }
  if (H2.phase === 'wait') {
    eatIfPossible(b);
    setIn(b, 0, 0, false, false, true);
    if (b.health + b.absorption >= 16) { H2.phase = 'up'; if (b.using === 'eat') b.using = null; }
    return true;
  }
  if (H2.phase === 'up') { if (digUp(b, X, H2.surfY)) return true; }
  return done();
}
function doFlee(b, t, X) {
  X.fleeT = (X.fleeT || 0) + 1;
  const T2 = BOT_TYPES[b.type];
  if (!X.hitRun && (b.health + b.absorption >= 15 || X.fleeT > 200)) { X.fleeT = 0; X.planT = 0; X.plan = 'fight'; return false; }
  const dx = b.x - t.x, dz = b.z - t.z, d = Math.hypot(dx, dz) || 1;
  let ang = Math.atan2(-dx, dz) / DEG + Math.sin(X.fleeT * 0.08) * 25;
  for (const off of [0, 40, -40, 80, -80, 130, -130, 180]) {
    const a = (ang + off) * DEG;
    if (hasGroundBelow(b.x - Math.sin(a) * 1.3, b.y, b.z + Math.cos(a) * 1.3, 3)) { ang += off; break; }
  }
  if (b.using && b.using !== 'eat') { b.using = null; b.useT = 0; }
  b.yaw += clamp(wrapDeg(ang - b.yaw), -35, 35); b.pitch = lerp(b.pitch, 0, 0.2);
  // block the chaser off with a wall, or web them
  X.wallCD = (X.wallCD || 0) - 1;
  if (T2.build && CFG.botBuild && d < 3.5 && X.wallCD <= 0) {
    const wx = Math.floor(b.x - dx / d * 1.2), wz = Math.floor(b.z - dz / d * 1.2), wy = ffloor(b.y);
    if (botPlace(b, wx, wy, wz)) { botPlace(b, wx, wy + 1, wz); X.wallCD = 40; }
  }
  if (T2.webs && d < 3 && X.webCD <= 0 && t.onGround && botPlace(b, Math.floor(t.x), ffloor(t.y), Math.floor(t.z), true)) X.webCD = 120;
  setIn(b, 1, 0, (b.hc && b.onGround) || (b.onGround && Math.random() < 0.04), true);
  return true;
}
function doKite(b, t, X) {
  const bi = b.slotOf('bow');
  const dx = t.x - b.x, dz = t.z - b.z, dist = Math.hypot(dx, dz), dy = t.y - b.y;
  if (bi < 0 || b.arrows <= 0 || dist < 4) { if (b.using === 'bow') { b.using = null; b.useT = 0; } X.planT = 0; return false; }
  if (b.sel !== bi) b.select(bi);
  const flight = Math.hypot(dist, dy) / 2.9, drop = 0.05 * flight * flight * 0.55;
  const err = aimAt(b, t.x + t.vx * flight * b.skill, t.y + 1.2 + drop, t.z + t.vz * flight * b.skill, true);
  if (b.using !== 'bow') { b.using = 'bow'; b.useT = 0; } else b.useT++;
  if (b.useT === 7) setHeldVisual(b);
  if (b.useT >= (b.skill > 0.6 ? 20 : 14) && err < 3 + (1 - b.skill) * 6) releaseBow(b);
  if (--X.kiteT <= 0 || !X.kiteDir) { X.kiteDir = Math.random() < 0.5 ? -1 : 1; X.kiteT = 20 + ((Math.random() * 30) | 0); }
  let f = dist < 9 ? -1 : dist > 22 ? 1 : 0, s = X.kiteDir;
  const yr = b.yaw * DEG, mx = s * Math.cos(yr) - f * Math.sin(yr), mz = f * Math.cos(yr) + s * Math.sin(yr), ml = Math.hypot(mx, mz);
  if (ml > 0.01 && b.onGround && !hasGroundBelow(b.x + mx / ml * 0.8, b.y, b.z + mz / ml * 0.8, 3)) { f = 0; s = -s; X.kiteDir = s; }
  setIn(b, f, s, b.hc && b.onGround);
  return true;
}
function botWater(b, X) {
  const full = slotWhere(b, it => it.k === 'bucket' && it.full), empty = slotWhere(b, it => it.k === 'bucket' && !it.full);
  const fx = Math.floor(b.x), fy = ffloor(b.y), fz = Math.floor(b.z);
  if (full >= 0 && b.inWeb) { // wash the cobweb away
    for (const yy of [fy, fy + 1]) if (getB(fx, yy, fz) === B.WEB && placeWater(fx, yy, fz)) {
      holdSlot(b, full); b.inv[full].full = false; setHeldVisual(b); swing(b); X.water = { x: fx, y: yy, z: fz, at: tick + 18 }; return;
    }
  }
  if (full >= 0 && !b.onGround && b.vy < -0.6 && b.fallDistance > 4) { // water-bucket clutch
    for (let k = 1; k <= 5; k++) {
      if (isSolid(getB(fx, fy - k, fz))) {
        const wy = fy - k + 1;
        if (b.y - wy < 2.4 && getB(fx, wy, fz) === 0) { b.pitch = 90; if (placeWater(fx, wy, fz)) { holdSlot(b, full); b.inv[full].full = false; setHeldVisual(b); swing(b); X.water = { x: fx, y: wy, z: fz, at: tick + 12 }; } }
        break;
      }
    }
  }
  if (empty >= 0 && X.water && tick >= X.water.at) {
    const w = X.water;
    if (Math.hypot(w.x + 0.5 - b.x, w.y - b.y, w.z + 0.5 - b.z) < 5 && pickupWater(w.x, w.y, w.z)) { b.inv[empty].full = true; if (b.sel === empty) setHeldVisual(b); swing(b); }
    X.water = null;
  }
}
const _botTick = botTick;
botTick = function (b) {
  const ai = b.ai, X = ai.x;
  if (!X || !b.type || game.countdown > 0) return _botTick(b);
  X.webCD--;
  if (CFG.botBuild) botWater(b, X);
  if (!ai.t || ai.t.dead || --X.rt <= 0) { ai.t = pickTarget(b); X.rt = 20; }
  const t = ai.t;
  if (--X.planT <= 0) { X.plan = choosePlan(b, t, X); X.planT = 10; }
  if (t && X.plan !== 'fight') {
    if (X.plan !== 'kite' && X.plan !== 'hide' && b.using) { b.using = null; b.useT = 0; }
    const run = { flee: doFlee, pillar: doPillar, bridge: doBridge, tunnel: doTunnel, hide: doHide, kite: doKite }[X.plan];
    if (run && run(b, t, X)) { ai.n++; return; }
  }
  _botTick(b);
  // while fighting: trap the target in a cobweb, hit-and-run types bail after landing a hit
  const T2 = BOT_TYPES[b.type];
  if (t && !t.dead) {
    const d = Math.hypot(t.x - b.x, t.z - b.z);
    if (T2.webs && X.webCD <= 0 && ai.mode !== 'heal' && d < 3.2 && t.onGround && !t.inWeb && (t.health < 10 || b.combo >= 2 || Math.random() < 0.01 * b.skill)) {
      if (botPlace(b, Math.floor(t.x), ffloor(t.y), Math.floor(t.z), true)) X.webCD = 140 + ((Math.random() * 100) | 0);
    }
  }
  // extra edge guard for every bot: never step off a big drop; builders patch the floor instead
  if (b.onGround && b.hitStun <= 0 && (b.in.f || b.in.s)) {
    const yr = b.yaw * DEG, f = b.in.f, s = b.in.s;
    const mx = s * Math.cos(yr) - f * Math.sin(yr) + b.vx * 4, mz = f * Math.cos(yr) + s * Math.sin(yr) + b.vz * 4, ml = Math.hypot(mx, mz);
    if (ml > 0.01) {
      const ax = b.x + mx / ml * 0.75, az = b.z + mz / ml * 0.75;
      if (!hasGroundBelow(ax, b.y, az, 3)) {
        const fy = ffloor(b.y) - 1;
        if (!(T2.build && CFG.botBuild && botPlace(b, Math.floor(ax), fy, Math.floor(az)))) { b.in = { f: 0, s: 0, jump: false }; b.sneaking = true; b.sprinting = false; }
      }
    }
  }
  if (b.type === 'coward' && b.hits > X.lastHits) { X.plan = 'flee'; X.planT = 14; X.fleeT = 0; X.hitRun = true; }
  X.lastHits = b.hits;
};

// ---------- 10. menu: new options + bot roster ----------
(function () {
  const row = (sec, after, r) => { const rows = MENU[sec].rows, i = rows.findIndex(x => x[0] === after); rows.splice(i + 1, 0, r); };
  row(0, 'combat', ['crits', 'Critical hits (jump hits + full-bar hits)', 'tg']);
  row(0, 'crits', ['moveSpeed', 'Movement speed', 'rng', [50, 130, 5, '%']]);
  row(0, 'moveSpeed', ['weight', 'Knockback taken (lower = heavier players)', 'rng', [30, 150, 5, '%']]);
  row(0, 'weight', ['chargedKb', 'Extra knockback: fully charged hit on the ground', 'rng', [0, 200, 10, '%']]);
  row(0, 'chargedKb', ['armorBoost', 'Armour strength (higher = die slower)', 'rng', [100, 250, 10, '%']]);
  row(1, 'webs', ['bucket', 'Water bucket (washes away cobwebs)', 'tg']);
  row(2, 'botItems', ['botGapples', 'Bot golden apples', 'rng', [0, 16, 1]]);
  row(2, 'botGapples', ['botWebs', 'Bot cobwebs', 'rng', [0, 16, 1]]);
  row(2, 'botWebs', ['botBuild', 'Bots build, bridge, dig, tunnel & use water', 'tg']);
  const b = MENU[0].rows.find(x => x[0] === 'bots'); b[1] = 'Number of bots';
  const s = MENU[0].rows.find(x => x[0] === 'skill'); s[1] = 'Bot skill (used by "Slider %" difficulty)';
  const st = document.createElement('style');
  st.textContent = `.mcsel,.mcin{font-family:'VT323',monospace;font-size:19px;background:#1c1c1c;color:#eee;border:2px solid #000;box-shadow:inset 1px 1px #555;padding:2px 4px;min-height:28px}
  .mcin{width:150px}.roster{display:flex;flex-direction:column;gap:6px}
  .bcard{display:flex;flex-wrap:wrap;gap:5px;align-items:center;background:rgba(255,255,255,.04);padding:4px;border:1px solid #333}
  .roster .num{color:#888;font-size:18px;width:26px}`;
  document.head.appendChild(st);
})();
function rosterPanel() {
  const p = document.createElement('div'); p.className = 'panel';
  p.innerHTML = `<h2>Bots <span style="font-size:18px;color:#aaa">(name, type &amp; difficulty for each one${CFG.mode === 'duel' ? ' · Duel uses bot #1' : ''})</span></h2>`;
  const quick = document.createElement('div'); quick.className = 'row';
  quick.innerHTML = '<label>Set all difficulties</label>';
  for (const k in DIFFS) {
    const bt = document.createElement('button'); bt.className = 'mc'; bt.textContent = DIFFS[k][0];
    bt.onclick = () => { CFG.roster.forEach(r => r.diff = k); saveCfg(); buildMenu(); }; quick.appendChild(bt);
  }
  const allType = document.createElement('select'); allType.className = 'mcsel';
  allType.innerHTML = '<option value="">Set all types…</option>' + Object.entries(BOT_TYPES).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join('');
  allType.onchange = () => { if (allType.value) { CFG.roster.forEach(r => r.type = allType.value); saveCfg(); buildMenu(); } };
  quick.appendChild(allType);
  p.appendChild(quick);
  const grid = document.createElement('div'); grid.className = 'roster';
  CFG.roster.forEach((r, i) => {
    const num = document.createElement('span'); num.className = 'num'; num.textContent = '#' + (i + 1);
    const nm = document.createElement('input'); nm.className = 'mcin'; nm.value = r.name; nm.maxLength = 18;
    nm.addEventListener('keydown', e => e.stopPropagation());
    nm.onchange = () => { const v = nm.value.trim(); r.name = v && !CFG.roster.some(o => o !== r && o.name === v) ? v : uniqueName(r); saveCfg(); buildMenu(); };
    const ty = document.createElement('select'); ty.className = 'mcsel';
    ty.innerHTML = Object.entries(BOT_TYPES).map(([k, v]) => `<option value="${k}"${r.type === k ? ' selected' : ''}>${v.n}</option>`).join('');
    ty.onchange = () => { r.type = ty.value; saveCfg(); };
    const df = document.createElement('select'); df.className = 'mcsel';
    df.innerHTML = Object.entries(DIFFS).map(([k, v]) => `<option value="${k}"${r.diff === k ? ' selected' : ''}>${v[0]}${v[1] != null ? ' ' + Math.round(v[1] * 100) + '%' : ' (' + CFG.skill + '%)'}</option>`).join('');
    df.onchange = () => { r.diff = df.value; saveCfg(); };
    const rm = document.createElement('button'); rm.className = 'mc'; rm.textContent = '✕'; rm.title = 'Remove bot'; rm.disabled = CFG.roster.length <= 1;
    rm.onclick = () => { CFG.roster.splice(i, 1); CFG.bots = CFG.roster.length; saveCfg(); buildMenu(); };
    const shuffle = document.createElement('button'); shuffle.className = 'mc'; shuffle.textContent = '↻'; shuffle.title = 'New random name';
    shuffle.onclick = () => { r.name = uniqueName(r); saveCfg(); buildMenu(); };
    num.appendChild(document.createTextNode(''));
    const nameWrap = document.createElement('div'); nameWrap.style.cssText = 'display:flex;gap:4px'; nameWrap.append(nm, shuffle);
    const card = document.createElement('div'); card.className = 'bcard'; card.append(num, nameWrap, ty, df, rm); grid.appendChild(card);
  });
  p.appendChild(grid);
  const add = document.createElement('button'); add.className = 'mc'; add.textContent = '+ Add bot'; add.style.marginTop = '8px';
  add.disabled = CFG.roster.length >= 15;
  add.onclick = () => { CFG.roster.push({ name: uniqueName(), type: 'balanced', diff: 'slider' }); CFG.bots = CFG.roster.length; saveCfg(); buildMenu(); };
  p.appendChild(add);
  const tip = document.createElement('div'); tip.style.cssText = 'font-size:18px;color:#999;margin-top:6px;line-height:1.1';
  tip.textContent = 'Sweaty PvPer: combos & cobweb traps · Builder: pillars up, bridges gaps, walls off chasers · Miner: tunnels through walls, ambushes from underground, hides in holes to heal · Archer: kites with the bow · Runner: hit & run · Berserker: never backs down. All bots eat golden apples when low and run when out of them.';
  p.appendChild(tip);
  return p;
}
const _buildMenu = buildMenu;
buildMenu = function () {
  syncRoster();
  _buildMenu();
  const cols = $('#cols');
  cols.insertBefore(rosterPanel(), cols.children[1] || null);
  const botsRow = [...cols.querySelectorAll('.row')].find(r => r.querySelector('label') && r.querySelector('label').textContent.startsWith('Number of bots'));
  const rng = botsRow && botsRow.querySelector('input[type=range]');
  if (rng) rng.addEventListener('change', () => buildMenu());
};
G.noLockCheck = false; G.startGame = startGame;
buildMenu();
