// ================= BIG BIOME WORLD · JUGGERNAUT MODE · BOTS CAN HIT / COMBO YOU IN THE AIR =================

// ---------- bots can hit you (and combo you) while you're in the air ----------
if (!CFG._v7) { CFG.airImmune = false; CFG._v7 = 1; saveCfg(); }
DEF.airImmune = false;

// ---------- cactus block ----------
(function () {
  const C = [[42, 110, 36], [58, 138, 46], [76, 160, 58], [30, 84, 28]];
  makeTile2(37, (x, y) => (x === 0 || x === 15) ? C[3] : (x % 4 === 1 && y % 4 === 2) ? [220, 220, 190, 255] : C[(x + (y >> 2)) % 3].concat(255));
  makeTile2(38, (x, y) => (x === 0 || x === 15 || y === 0 || y === 15) ? C[3].concat(255) : Math.hypot(x - 7.5, y - 7.5) < 3 ? [92, 176, 70, 255] : C[1].concat(255));
  B.CACTUS = 33;
  defB(33, 'Cactus', [38, 37, 38], 0.4, null, { color: '#3a8a2e' });
  atlasTex.needsUpdate = true;
})();

// ---------- the big biome world ----------
function genWorld(seed) {
  srand(seed); allocWorld(160, 64, 160); VOID_Y = -30;
  const Nt = makeNoise(seed + 11), Nm = makeNoise(seed + 22), Nh = makeNoise(seed + 33), Nr = makeNoise(seed + 44), Nd = makeNoise(seed + 55);
  srand(seed + 1);
  const SEA = 15, H = new Int16Array(WX * WZ), BIOME = new Uint8Array(WX * WZ); // 0 plains 1 forest 2 desert 3 snow 4 mountains 5 lake
  // 1) raw height + biome
  const Hf = new Float32Array(WX * WZ), MT = new Float32Array(WX * WZ);
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    const temp = Nt(x * 0.012, 0, z * 0.012, 3), wet = Nm(x * 0.014, 3, z * 0.014, 3);
    const ridge = 1 - Math.abs(Nr(x * 0.011, 1, z * 0.011, 3) * 2 - 1);           // broad ridged noise for mountain ranges
    const cont = Nh(x * 0.016, 2, z * 0.016, 4);
    let h = 17 + (cont - 0.5) * 14 + (Nd(x * 0.05, 7, z * 0.05, 2) - 0.5) * 3;
    let bio = temp < 0.36 ? 3 : (temp > 0.62 && wet < 0.5) ? 2 : wet > 0.56 ? 1 : 0;
    const mtn = clamp((ridge - 0.66) / 0.34, 0, 1);
    if (mtn > 0) { h += (mtn * mtn * (3 - 2 * mtn)) * 32 * (0.75 + 0.5 * Nd(x * 0.03, 11, z * 0.03, 2)); if (mtn > 0.3) bio = 4; }
    const dc = Math.hypot(x - WX / 2, z - WZ / 2); if (dc < 12) h = lerp(h, 18, 1 - dc / 12); // fair start area
    Hf[x * WZ + z] = h; MT[x * WZ + z] = mtn; BIOME[x * WZ + z] = bio;
  }
  // 2) smooth it twice so slopes are walkable steps instead of spikes
  for (let pass = 0; pass < 2; pass++) {
    const src = Hf.slice();
    for (let x = 1; x < WX - 1; x++) for (let z = 1; z < WZ - 1; z++) {
      let sum = 0; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) sum += src[(x + dx) * WZ + z + dz];
      Hf[x * WZ + z] = sum / 9;
    }
  }
  // 3) build columns
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    let bio = BIOME[x * WZ + z];
    const h = Math.floor(clamp(Hf[x * WZ + z], 6, WY - 4));
    if (h < SEA - 1 && bio !== 4) bio = 5;
    H[x * WZ + z] = h; BIOME[x * WZ + z] = bio;
  }
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    const h = H[x * WZ + z], bio = BIOME[x * WZ + z];
    let slope = 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, zz = z + dz; if (xx >= 0 && zz >= 0 && xx < WX && zz < WZ) slope = Math.max(slope, h - H[xx * WZ + zz]); }
    rawSet(x, 0, z, B.BEDROCK);
    for (let y = 1; y < h - 3; y++) rawSet(x, y, z, B.STONE);
    const cliff = bio === 4 && slope >= 3;
    const sub = cliff ? B.STONE : bio === 2 ? B.SANDSTONE : B.DIRT;
    for (let y = Math.max(1, h - 3); y < h; y++) rawSet(x, y, z, sub);
    let top = B.GRASS;
    if (bio === 2) top = B.SAND;
    else if (bio === 3) top = B.SNOW;
    else if (bio === 4) top = h > 41 ? B.SNOW : (cliff || h > 34) ? B.STONE : B.GRASS;
    else if (bio === 5 || h <= SEA) top = B.SAND;
    rawSet(x, h, z, top);
    for (let y = h + 1; y <= SEA; y++) rawSet(x, y, z, (bio === 3 && y === SEA) ? B.ICE : B.WATER);
  }
  // decorations per biome
  const spruce = (x, y, z) => {
    const ht = 6 + ((rnd() * 3) | 0);
    for (let i = 0; i < ht; i++) rawSet(x, y + i, z, B.LOG);
    for (let i = 2; i <= ht; i++) { const r = Math.max(0, Math.round((ht - i) / 2.2)); for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r + 0.5 && !getB(x + dx, y + i, z + dz)) rawSet(x + dx, y + i, z + dz, B.LEAVES); }
    rawSet(x, y + ht, z, B.LEAVES);
  };
  for (let x = 2; x < WX - 2; x++) for (let z = 2; z < WZ - 2; z++) {
    const h = H[x * WZ + z], bio = BIOME[x * WZ + z], top = getB(x, h, z);
    if (h <= SEA || getB(x, h + 1, z)) continue;
    const r = rnd();
    if (bio === 1 && top === B.GRASS && r < 0.06) tree(x, h + 1, z);
    else if (bio === 0 && top === B.GRASS && r < 0.006) tree(x, h + 1, z);
    else if (bio === 3 && top === B.SNOW && r < 0.03) spruce(x, h + 1, z);
    else if (bio === 4 && top === B.GRASS && r < 0.02) spruce(x, h + 1, z);
    else if (bio === 2 && r < 0.012) { const ch = 1 + ((rnd() * 3) | 0); for (let i = 1; i <= ch; i++) rawSet(x, h + i, z, B.CACTUS); }
    else if (top === B.GRASS && (bio === 0 || bio === 1)) {
      const q = rnd(), d = bio === 0 ? 0.5 : 0.3;
      if (q < d * 0.75) rawSet(x, h + 1, z, B.TALLGRASS);
      else if (q < d * 0.85) rawSet(x, h + 1, z, [B.POPPY, B.CORNFLOWER, B.DANDELION][(rnd() * 3) | 0]);
      else if (bio === 0 && q < d * 0.9) rawSet(x, h + 1, z, B.SUNFLOWER);
    }
  }
  // a few big boulders and ruined walls for cover
  for (let i = 0; i < 26; i++) {
    const x = 6 + ((rnd() * (WX - 12)) | 0), z = 6 + ((rnd() * (WZ - 12)) | 0), h = H[x * WZ + z];
    if (h <= SEA) continue;
    const rr = 1 + rnd() * 1.8;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy <= 2; dy++) if (Math.hypot(dx, dy * 1.3, dz) < rr) rawSet(x + dx, h + 1 + dy, z + dz, rnd() < 0.7 ? B.COBBLE : B.STONE);
  }
  ringSpawnsFloor(WX / 2, WZ / 2, 8, 16);
  spawns.H = H;
}
NEW_MAPS.world = genWorld;
ATMO.world = { bg: 0x84b4ff, fog: 0xc8ddff, near: 60, far: 190, sky: true, tint: 1.04, light: 0.95 };
(function () { const r = MENU[0].rows.find(x => x[0] === 'map'); r[3].unshift(['world', 'Big Biome World']); })();

// ---------- JUGGERNAUT: you vs an army, hunt them all down ----------
if (CFG.juggBots === undefined) CFG.juggBots = 20; DEF.juggBots = 20;
syncRoster = function () {
  if (!Array.isArray(CFG.roster)) CFG.roster = [];
  const want = clamp(CFG.bots | 0, 1, 40);
  while (CFG.roster.length < want) CFG.roster.push({ name: uniqueName(), type: 'balanced', diff: 'slider' });
  CFG.roster.length = want;
};
let JUGG = null; // { scanAt, revealUntil, markers }
const _startGameJugg = startGame;
startGame = function () {
  if (CFG.mode !== 'jugg' || NET.role) { JUGG = null; return _startGameJugg(); }
  const keep = { mode: CFG.mode, bots: CFG.bots, allies: CFG.allies, win: CFG.win, killcam: CFG.killcam };
  Object.assign(CFG, { mode: 'teams', bots: clamp(CFG.juggBots | 0, 3, 40), allies: 0, win: 'last' });
  try { _startGameJugg(); } finally { Object.assign(CFG, keep); }
  if (!game) return;
  JUGG = { scanAt: tick + 400, revealUntil: 0, markers: [] };
  game.jugg = true;
  player.jugg = true; player.name = 'Juggernaut'; drawTag(player);
  // scatter the army across the map, away from you
  const army = mobs.filter(m => !m.isPlayer);
  for (const b of army) {
    for (let tries = 0; tries < 60; tries++) {
      const x = 4 + Math.random() * (WX - 8), z = 4 + Math.random() * (WZ - 8);
      if (Math.hypot(x - player.x, z - player.z) < 30) continue;
      const y = topY(Math.floor(x), Math.floor(z)); if (y < 2 || getB(x, y - 1, z) === B.WATER) continue;
      spawnPoint(b, [x, y, z]); break;
    }
    b._hider = Math.random() < 0.4;               // some dig in, some hold still in cover
    b.skill = Math.max(b.skill, 0.62);
  }
  feed(`JUGGERNAUT: hunt down all ${army.length} of them. Every 30 s a scan reveals them.`, '#ff9a5a');
};
G.startGame = startGame;
// the juggernaut: tanky, hits harder, shrugs off knockback, moves a bit faster, heals quickly out of combat
const _dealDamageJugg = dealDamage;
dealDamage = function (t, amt, src) {
  if (JUGG && game && game.jugg) {
    if (t.jugg) amt *= 0.4;
    else if (src && src.att && src.att.jugg && (src.kind === 'melee' || src.kind === 'arrow')) amt *= 1.4;
  }
  return _dealDamageJugg(t, amt, src);
};
const _knockbackJugg = knockback;
knockback = function (t, s, xr, zr) { _knockbackJugg(t, t.jugg && JUGG ? s * 0.3 : s, xr, zr); };
const _moveRelJugg = moveRelative;
moveRelative = function (e, strafe, forward, factor) { _moveRelJugg(e, strafe, forward, e.jugg && JUGG && e.onGround ? factor * 1.15 : factor); };
// army behaviour: hide while you're far, gang up when you're close, scatter when alone
const _botTickJugg = botTick;
botTick = function (b) {
  if (!JUGG || !game || !game.jugg || b.dead || !b.ai || !player) return _botTickJugg(b);
  const d = Math.hypot(player.x - b.x, player.z - b.z), X = b.ai.x;
  b.ai.t = player.dead ? null : player; b.ai.retarget = 40; if (X) X.rt = 40;
  let allies = 0; for (const o of mobs) if (o !== b && !o.dead && !o.isPlayer && Math.hypot(o.x - b.x, o.z - b.z) < 10) allies++;
  if (d > 26 && X && X.plan !== 'hide') {
    if (b._hider && !X.hide && CFG.botBuild && canDigDown(b) && Math.random() < 0.02) { X.plan = 'hide'; X.planT = 400; X.hide = null; X.noHideUntil = 0; }
    else { _botTickJugg(b); b.in = { f: 0, s: 0, jump: false }; b.sneaking = true; b.sprinting = false; if (b.using === 'bow') { b.using = null; b.useT = 0; } return; }
  }
  if (d <= 26 && d > 6 && allies < 2 && X && X.plan === 'fight' && b.health + b.absorption < 16 && Math.random() < 0.02) { X.plan = 'flee'; X.planT = 60; X.fleeT = 0; }
  _botTickJugg(b);
};
// periodic scan: beacons over every remaining enemy for 5 s
const scanMat = new THREE.SpriteMaterial({ color: 0xff3b3b, depthTest: false, transparent: true, opacity: 0.9 });
const _gameTickJugg = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickJugg();
  if (tick === t0 || !JUGG || !game || !game.jugg) return;
  if (tick >= JUGG.scanAt) { JUGG.scanAt = tick + 600; JUGG.revealUntil = tick + 100; sfx('ding'); feed('SCAN: enemy positions revealed', '#ff6060'); }
  // heal out of combat
  if (!player.dead && tick - (player.lastDmgT || -999) > 80 && tick % 20 === 0) player.health = Math.min(20, player.health + 1);
};
const _updateModelsJugg = updateModels;
updateModels = function (alpha) {
  _updateModelsJugg(alpha);
  if (!JUGG) { for (const s of (JUGG_MARK || [])) s.visible = false; return; }
  const show = game && game.jugg && tick < JUGG.revealUntil;
  const army = mobs.filter(m => !m.isPlayer && !m.dead);
  while (JUGG_MARK.length < army.length) { const s = new THREE.Sprite(scanMat); s.scale.set(1.2, 1.2, 1); s.renderOrder = 999; scene.add(s); JUGG_MARK.push(s); }
  JUGG_MARK.forEach((s, i) => { const m = army[i]; s.visible = !!(show && m); if (m) s.position.set(m.x, m.y + 3.2 + Math.sin(performance.now() / 200) * 0.2, m.z); });
};
const JUGG_MARK = [];
const _drawHUDJugg = drawHUD;
drawHUD = function (al) {
  _drawHUDJugg(al);
  if (!JUGG || !game || !game.jugg || state !== 'play') return;
  const left = mobs.filter(m => !m.isPlayer && !m.dead).length;
  txt(`ARMY LEFT: ${left}`, W / 2, 36, 26, '#ff7a5a', 'center');
  const s = Math.max(0, Math.ceil((JUGG.scanAt - tick) / 20));
  txt(tick < JUGG.revealUntil ? 'SCANNING…' : `next scan in ${s}s`, W / 2, 60, 16, '#ffd0c0', 'center');
};
// no kill-cam spam in Juggernaut (only the final one)
const _dieJugg = die;
die = function (t, src) {
  const kc = CFG.killcam;
  if (JUGG && game && game.jugg && !t.isPlayer && mobs.some(m => !m.isPlayer && !m.dead && m !== t)) CFG.killcam = false;
  try { _dieJugg(t, src); } finally { CFG.killcam = kc; }
};
const _toMenuJugg = toMenu;
toMenu = function () { JUGG = null; for (const s of JUGG_MARK) s.visible = false; _toMenuJugg(); };
(function () {
  const r = MENU[0].rows.find(x => x[0] === 'mode'); r[3].push(['jugg', 'Juggernaut (you vs an army)']);
  const i = MENU[0].rows.findIndex(x => x[0] === 'bots');
  MENU[0].rows.splice(i + 1, 0, ['juggBots', 'Juggernaut: army size', 'rng', [5, 40, 1]]);
})();
buildMenu();
