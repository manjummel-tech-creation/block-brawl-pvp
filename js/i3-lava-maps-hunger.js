

// ================= LAVA: texture, fire ticks, burning visuals =================
(function () {
  srand(4242);
  const Lc = [[255, 210, 70], [255, 140, 20], [230, 80, 0], [170, 40, 0]];
  const f = []; for (let i = 0; i < 256; i++) f.push(rnd());
  makeTile2(39, (x, y) => { const v = (Math.sin(x * 0.9 + y * 0.4) + Math.cos(y * 1.1 - x * 0.3)) * 0.25 + f[y * 16 + x] * 0.5 + 0.25; return Lc[v > 0.8 ? 0 : v > 0.55 ? 1 : v > 0.3 ? 2 : 3].concat(255); });
  atlasTex.needsUpdate = true;
})();
const FIRE_TICKS = 160;      // 8 s of burning after you leave lava
function fireKick(m, s) { // a small shove + hop in a random direction (not scaled by the knockback setting)
  const a = Math.random() * Math.PI * 2; m.vx = m.vx * 0.5 + Math.cos(a) * s; m.vz = m.vz * 0.5 + Math.sin(a) * s;
  if (m.onGround || m.inWater) m.vy = Math.max(m.vy, s * 1.1);
}
function setOnFire(e, t) { e.fireT = Math.max(e.fireT || 0, t); }
function lavaOwnerAt(e) {
  const b = e.box();
  for (let x = Math.floor(b[0]); x <= Math.floor(b[3]); x++) for (let y = Math.floor(b[1]); y <= Math.floor(b[4]); y++) for (let z = Math.floor(b[2]); z <= Math.floor(b[5]); z++) {
    const o = lavaOwner.get(x + ',' + y + ',' + z); if (o) return o;
  }
  return null;
}
function creditFire(m, owner) { if (owner && owner !== m && !owner.dead && owner.team !== m.team) { m.lastAttacker = owner; m.lastAttackT = tick; m.fireBy = owner; } }
const _gameTickLava = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickLava();
  if (tick === t0 || !game) return;
  for (const m of mobs) {
    if (m.dead) { m.fireT = 0; continue; }
    if (m.inLava) {
      setOnFire(m, FIRE_TICKS);
      creditFire(m, lavaOwnerAt(m));
      if (tick % 10 === 0) { if (m.fireBy) { m.lastAttacker = m.fireBy; m.lastAttackT = tick; } if (hurt(m, 4, { kind: 'lava' })) fireKick(m, 0.16); }
    } else if (m.fireT > 0) {
      if (m.inRealWater) { m.fireT = 0; sfx('splash', m.x, m.y, m.z, 0.4); burst(m.x, m.y + 1.2, m.z, 8, ['#dddddd', '#bbbbbb'], 1, 0.6, 0.08, -2); continue; }
      m.fireT--;
      if (m.fireT % 20 === 0) { if (m.fireBy) { m.lastAttacker = m.fireBy; m.lastAttackT = tick; } if (hurt(m, 1, { kind: 'fire', bypass: true })) fireKick(m, 0.24); }
      if (m.fireT <= 0) m.fireBy = null;
    }
    if (m.fireT > 0 && tick % 2 === 0 && !(m === player && !thirdPerson)) for (let i = 0; i < 2; i++)
      spawnP(m.x + (Math.random() - 0.5) * 0.7, m.y + Math.random() * 1.8, m.z + (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4,
        ['#ff5a00', '#ff9a20', '#ffd040'][(Math.random() * 3) | 0], 0.35 + Math.random() * 0.25, 0.07 + Math.random() * 0.05, -1);
  }
};
// burning HUD: flames along the bottom of the screen + a timer
const _drawHUDLava = drawHUD;
drawHUD = function (alpha) {
  _drawHUDLava(alpha);
  const burning = state === 'play' && game && player && !player.dead && (player.fireT > 0 || player.inLava) && !paused;
  if (window._fireCv && (!burning || thirdPerson)) window._fireCv.style.display = 'none';
  if (!burning) return;
  if (thirdPerson) return;
  // painted on its own canvas BEHIND the HUD (MC draws it before the GUI too)
  if (!window._fireCv) { const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none'; document.body.insertBefore(c, document.querySelector('#hud')); window._fireCv = c; }
  const fc = window._fireCv; if (fc.width !== W || fc.height !== H) { fc.width = W; fc.height = H; }
  const f2 = fc.getContext('2d'); f2.clearRect(0, 0, W, H); fc.style.display = 'block';
  f2.imageSmoothingEnabled = false;
  // two mirrored sheets of chunky fire (like MC's on-fire overlay), kept to the lower part of the screen so you can still see
  const fr = flameFrame(0) * 16, T = H * 0.34, Bt = H * 1.02;
  f2.globalAlpha = 0.72;
  for (let i = 0; i < 2; i++) {
    const L = i ? W * 0.44 : -W * 0.06, R = i ? W * 1.06 : W * 0.56;
    f2.save();
    if (i) { f2.translate(L + R, 0); f2.scale(-1, 1); }            // mirror the second sheet like MC
    f2.drawImage(flameCv, 0, fr, 16, 16, L, T, R - L, Bt - T);
    f2.restore();
  }
  f2.globalAlpha = 1;
};

// ================= BOTS USE LAVA =================
// Bots pour lava on you when you're 2-4 blocks away (never where it would burn themselves or a teammate),
// scoop it back up a few seconds later, and put themselves out with their water bucket when on fire.
const _botTickLava = botTick;
botTick = function (b) {
  _botTickLava(b);
  if (b.dead || !b.ai || !b.ai.x || !game || game.over || game.countdown > 0 || !CFG.botBuild) return;
  const X = b.ai.x, t = b.ai.t && !b.ai.t.dead ? b.ai.t : null;
  // 1) on fire (out of the lava): water at own feet puts it out
  if (b.fireT > 30 && !b.inLava && !b.inRealWater && b.onGround && tick >= (b.waterCD || 0)) {
    const full = slotWhere(b, it => it.k === 'bucket' && it.full), fx = Math.floor(b.x), fy = ffloor(b.y), fz = Math.floor(b.z);
    if (full >= 0 && getB(fx, fy, fz) === 0 && isSolid(getB(fx, fy - 1, fz)) && placeWater(fx, fy, fz)) {
      holdSlot(b, full); b.inv[full].full = false; setHeldVisual(b); swing(b); b.pitch = 90;
      X.water = { x: fx, y: fy, z: fz, at: tick + 25 }; b.waterCD = tick + 120; return;
    }
  }
  // 2) scoop the poured lava back up once it has done its job
  if (X.lava && tick >= X.lava.at) {
    const L = X.lava, e = slotWhere(b, it => it.k === 'bucket' && !it.full);
    if (!isLavaSource(L.x, L.y, L.z) || tick > L.at + 120) X.lava = null;
    else if (e >= 0 && !b.inLava && Math.hypot(L.x + 0.5 - b.x, L.y - b.y, L.z + 0.5 - b.z) < 4.5 && pickupLava(L.x, L.y, L.z)) {
      holdSlot(b, e); b.inv[e].k = 'lavaBucket'; delete b.inv[e].full; setHeldVisual(b); swing(b); X.lava = null; return;
    }
  }
  // 3) pour lava on the target
  if (!t || X.lava || tick < (b.lavaCD || 0) || b.inLava || b.fireT > 0 || b.using) return;
  const ls = slotWhere(b, it => it.k === 'lavaBucket'); if (ls < 0) return;
  const d = Math.hypot(t.x - b.x, t.z - b.z);
  if (d < 2.3 || d > 4.2 || Math.abs(t.y - b.y) > 2 || t.inLava || (t.fireT || 0) > 40) return;
  if (Math.random() > 0.03 + 0.05 * (b.skill || 0.5)) return;   // not instantly every time
  const tx = Math.floor(t.x), ty = ffloor(t.y), tz = Math.floor(t.z), c = getB(tx, ty, tz);
  if ((c !== 0 && c !== B.WEB) || !isSolid(getB(tx, ty - 1, tz))) return;
  for (const m of mobs) if (!m.dead && m !== t && (m === b || m.team === b.team) && Math.hypot(m.x - (tx + 0.5), m.z - (tz + 0.5)) < 2.4 && Math.abs(m.y - ty) < 2.5) return;
  lookAt(b, tx + 0.5, ty, tz + 0.5, 180);
  if (placeLava(tx, ty, tz, b)) {
    holdSlot(b, ls); b.inv[ls].k = 'bucket'; b.inv[ls].full = false; setHeldVisual(b); swing(b);
    X.lava = { x: tx, y: ty, z: tz, at: tick + 50 }; b.lavaCD = tick + 200 + ((Math.random() * 120) | 0);
  }
};

// ================= BUG FIXES: falling sand · suffocation · real hunger =================
// ---------- falling sand ----------
// Sand with nothing under it (air, a liquid, tall grass) turns into a falling block a tick later and lands as sand.
const SAND_Q = new Set(), FALLING = [], FALLS = new Set([B.SAND]);
const sandFree = id => id === 0 || (id !== 255 && BL[id] && BL[id].liquid) || id === B.TALLGRASS;
const sandGeo = new THREE.BoxGeometry(1, 1, 1);
let sandMat = null;
const _setBSand = setB;
setB = function (x, y, z, id) {
  const r = _setBSand(x, y, z, id);
  if (r && state === 'play') {
    if (FALLS.has(id)) SAND_Q.add(x + ',' + y + ',' + z);
    if (FALLS.has(getB(x, y + 1, z))) SAND_Q.add(x + ',' + (y + 1) + ',' + z);
  }
  return r;
};
function clearFallingSand() { for (const f of FALLING) scene.remove(f.mesh); FALLING.length = 0; SAND_Q.clear(); }
function tickSand() {
  if (SAND_Q.size) {
    const q = [...SAND_Q]; SAND_Q.clear();
    for (const k of q) {
      const [x, y, z] = k.split(',').map(Number);
      const fid = getB(x, y, z);
      if (!FALLS.has(fid) || !sandFree(getB(x, y - 1, z))) continue;
      if (!sandMat) sandMat = {};
      if (!sandMat[fid]) sandMat[fid] = new THREE.MeshBasicMaterial({ map: canvasTex(tileCv[BL[fid].tiles[1]]) });
      setB(x, y, z, 0);
      const mesh = new THREE.Mesh(sandGeo, sandMat[fid]); mesh.position.set(x + 0.5, y + 0.5, z + 0.5); scene.add(mesh);
      FALLING.push({ x, y, z, fy: y, vy: 0, mesh, id: fid });
    }
  }
  for (let i = FALLING.length - 1; i >= 0; i--) {
    const f = FALLING[i];
    f.vy = (f.vy - 0.04) * 0.98;
    const ny = f.fy + f.vy;
    let land = null;
    for (let cy = Math.floor(f.fy) - 1; cy >= Math.floor(ny); cy--) if (!sandFree(getB(f.x, cy, f.z))) { land = cy + 1; break; }
    if (land === null && ny < VOID_Y) { scene.remove(f.mesh); FALLING.splice(i, 1); continue; }
    if (land !== null) {
      if (sandFree(getB(f.x, land, f.z))) { setB(f.x, land, f.z, f.id || B.SAND); sfx('place', f.x + 0.5, land + 0.5, f.z + 0.5, 0.6); }
      scene.remove(f.mesh); FALLING.splice(i, 1); continue;
    }
    f.fy = ny; f.mesh.position.y = ny + 0.5;
  }
}

// ---------- suffocation ----------
// Head inside a full opaque block = 1 damage every half second (like vanilla).
function eyeInBlock(m) {
  const ey = m.y + m.eyeH;
  for (const ox of [-0.24, 0.24]) for (const oz of [-0.24, 0.24]) {
    const id = getB(Math.floor(m.x + ox), Math.floor(ey), Math.floor(m.z + oz));
    if (id && id !== 255 && BL[id].solid && BL[id].opaque) return true;
  }
  return false;
}

// ---------- hunger ----------
// Food 0-20 + saturation + exhaustion, like vanilla: sprinting, jumping, attacking and getting hurt make you hungry.
// Natural regen only works with 18+ food (9 shanks) and costs food; at 6 or less you can't sprint; at 0 you starve
// (down to half a heart). Golden apples give 4 food + 9.6 saturation.
DEF.hunger = true; if (CFG.hunger === undefined) CFG.hunger = true;
(function () {
  for (const sec of MENU) { const i = sec.rows.findIndex(x => x[0] === 'regen'); if (i >= 0) { sec.rows.splice(i + 1, 0, ['hunger', 'Hunger (sprinting & fighting drain food, regen needs 9 shanks)', 'tg']); break; } }
})();
buildMenu();
const hungerOn = m => CFG.hunger !== false && !m.remote;
function resetFood(m) { m.food = 20; m.foodSat = 5; m.exh = 0; m.starveT = 0; }
function exhaust(m, amt) {
  if (!m || !hungerOn(m) || m.dead) return;
  if (m.food === undefined) resetFood(m);
  m.exh += amt;
  while (m.exh >= 4) { m.exh -= 4; if (m.foodSat > 0) m.foodSat = Math.max(0, m.foodSat - 1); else m.food = Math.max(0, m.food - 1); }
}
const _respawnHunger = respawn;
respawn = function (m) { _respawnHunger(m); resetFood(m); };
const _dealDamageHunger = dealDamage;
dealDamage = function (t, amt, src) {
  exhaust(t, 0.1);
  if (src && src.att && src.att !== t && src.kind === 'melee') exhaust(src.att, 0.1);
  return _dealDamageHunger(t, amt, src);
};
const _tickHealthHunger = tickHealth;
tickHealth = function (e) {
  if (!hungerOn(e) || e.dead) return _tickHealthHunger(e);
  if (e.food === undefined) resetFood(e);
  const h0 = e.health, fx0 = e.regenFx || 0, reg = CFG.regen;
  if (e.food < 18) CFG.regen = false;              // no natural regen when hungry
  try { _tickHealthHunger(e); } finally { CFG.regen = reg; }
  const fxHeal = fx0 > 0 && (fx0 - 1) % 25 === 0 ? 1 : 0;
  const natural = Math.max(0, e.health - h0 - fxHeal);
  if (natural > 0) exhaust(e, 6 * natural);        // healing burns food
};
const _physicsTickHunger = physicsTick;
physicsTick = function (e) {
  if (hungerOn(e) && e.food !== undefined && e.food <= 6) e.sprinting = false;  // too hungry to sprint
  _physicsTickHunger(e);
};
const _eatGappleHunger = eatGapple;
eatGapple = function (e) {
  const it = e.held, n0 = it && it.n;
  _eatGappleHunger(e);
  if (it && it.n < n0 && hungerOn(e)) { if (e.food === undefined) resetFood(e); e.food = Math.min(20, e.food + 4); e.foodSat = Math.min(e.food, e.foodSat + 9.6); }
};
const _startGameFix = startGame;
startGame = function () {
  clearFallingSand();
  _startGameFix();
  if (game) for (const m of mobs) resetFood(m);
};
const _toMenuFix = toMenu;
toMenu = function () { clearFallingSand(); _toMenuFix(); };

const _gameTickFix = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickFix();
  if (tick === t0 || !game) return;
  if (typeof NET === 'undefined' || NET.role !== 'client') tickSand();
  for (const m of mobs) {
    if (m.dead || m.remote) continue;
    // suffocation
    if (eyeInBlock(m) && tick % 10 === 0) hurt(m, 1, { kind: 'suffocate', bypass: true });
    if (!hungerOn(m)) continue;
    if (m.food === undefined) resetFood(m);
    // exhaustion from moving / jumping
    const d = Math.hypot(m.x - m.px, m.z - m.pz);
    if (m.sprinting && m.onGround !== undefined) exhaust(m, 0.1 * d);
    if (m.jumpTicks === 10) exhaust(m, m.sprinting ? 0.2 : 0.05);
    // starving
    if (m.food <= 0) { if (++m.starveT >= 80) { m.starveT = 0; if (m.health > 1) hurt(m, 1, { kind: 'starve', bypass: true }); } }
    else m.starveT = 0;
  }
};

// ================= BETTER FIRE: animated pixel flames on burning players + first-person flames =================
// One procedural 16x16 flame animation (32 frames, scrolling noise) used for flames wrapped around burning
// entities (camera-facing sprites), the first-person screen flames, plus embers + smoke.
const FLAME_N = 32;
const flameCv = (function () {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16 * FLAME_N;
  const g = c.getContext('2d'), img = g.createImageData(16, 16 * FLAME_N);
  srand(5151);
  const NW = 16, NH = 64, nz = []; for (let i = 0; i < NW * NH; i++) nz.push(rnd());
  const smp = (x, y) => { x = ((x % NW) + NW) % NW; y = ((y % NH) + NH) % NH; const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, a = nz[y0 * NW + x0], b = nz[y0 * NW + (x0 + 1) % NW], c2 = nz[((y0 + 1) % NH) * NW + x0], d = nz[((y0 + 1) % NH) * NW + (x0 + 1) % NW]; return (a * (1 - fx) + b * fx) * (1 - fy) + (c2 * (1 - fx) + d * fx) * fy; };
  // MC-style blocky fire: wide flat-topped columns of chunky orange pixels that rise and fall (seamless loop)
  const SH = [[208, 92, 10], [226, 112, 16], [240, 134, 26], [250, 158, 40]], TIP = [196, 76, 8], HOT = [255, 186, 66];
  for (let f = 0; f < FLAME_N; f++) {
    const ang = f / FLAME_N * Math.PI * 2, ty = 20 + 7 * Math.sin(ang), tx = 6 * Math.cos(ang);
    const top = [];
    for (let x = 0; x < 16; x++) { const n = smp((x >> 1) * 0.9 + (x & 1) * 0.3 + tx, ty) * 0.75 + smp(x * 0.4 + 9 + tx, ty * 1.3) * 0.25; top[x] = clamp(Math.round(2 + n * 11), 2, 13); }
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const k = ((f * 16 + y) * 16 + x) * 4;
      if (y < top[x]) { img.data[k + 3] = 0; continue; }
      const v = smp(x * 1.7 + 40 + tx, y * 1.7 + ty * 1.5);
      const p = y === top[x] ? TIP : (y >= 13 && v > 0.45) ? HOT : SH[Math.min(3, Math.floor(v * 4))];
      img.data[k] = p[0]; img.data[k + 1] = p[1]; img.data[k + 2] = p[2]; img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0); return c;
})();
const flameFrame = (off) => Math.floor(performance.now() / 45 + (off || 0)) % FLAME_N;
function flameTex() {
  const t = new THREE.CanvasTexture(flameCv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.repeat.set(1, 1 / FLAME_N); return t;
}
const FIRE_SPR = [];
function fireSprites(m) {
  if (m._fireFx) return m._fireFx;
  const mk = (off, sx, sy) => { const tex = flameTex(); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.1, depthWrite: false })); s.scale.set(sx, sy, 1); s.userData = { tex, off }; s.visible = false; scene.add(s); FIRE_SPR.push(s); return s; };
  m._fireFx = [mk(0, 1.15, 2.1), mk(11, 0.8, 1.5), mk(23, 0.8, 1.4)];
  return m._fireFx;
}
const _updateCameraFire = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraFire(alpha, dt);
  for (const s of FIRE_SPR) s.visible = false;
  if (state !== 'play' || !game) return;
  const cp = camera.getWorldPosition(new THREE.Vector3());
  for (const m of mobs) {
    if (m.dead || !(m.fireT > 0 || m.inLava)) continue;
    if (m === player && !thirdPerson) continue;                      // first person uses the screen flames
    const fx = fireSprites(m), x = m.px + (m.x - m.px) * alpha, y = m.py + (m.y - m.py) * alpha, z = m.pz + (m.z - m.pz) * alpha;
    // push the side flames left / right of the body as seen from the camera, the big one slightly in front
    const dx = cp.x - x, dz = cp.z - z, dl = Math.hypot(dx, dz) || 1, rx = -dz / dl, rz = dx / dl;
    const pos = [[0, 1.0, 0.12], [-0.32, 0.75, 0.2], [0.32, 0.7, 0.2]];
    fx.forEach((s, i) => {
      const [side, h, fwd] = pos[i], wob = Math.sin(performance.now() / 120 + i * 2) * 0.03;
      s.position.set(x + rx * side + dx / dl * fwd, y + h + wob, z + rz * side + dz / dl * fwd);
      s.userData.tex.offset.y = 1 - (flameFrame(s.userData.off) + 1) / FLAME_N;
      s.visible = true;
    });
  }
};
const _startGameFireFx = startGame;
startGame = function () { for (const s of FIRE_SPR) { scene.remove(s); s.material.dispose(); s.userData.tex.dispose(); } FIRE_SPR.length = 0; _startGameFireFx(); };

// embers + smoke (on top of the existing flame sparks)
const _gameTickFireFx = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickFireFx();
  if (tick === t0 || !game) return;
  for (const m of mobs) {
    if (m.dead || !(m.fireT > 0 || m.inLava) || (m === player && !thirdPerson)) continue;
    if (tick % 3 === 0) spawnP(m.x + (Math.random() - 0.5) * 0.5, m.y + 1.6 + Math.random() * 0.4, m.z + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, 1.2 + Math.random(), (Math.random() - 0.5) * 0.3,
      ['#3a3a3a', '#555555', '#6a6a6a'][(Math.random() * 3) | 0], 0.7 + Math.random() * 0.5, 0.12 + Math.random() * 0.08, -1.5);   // smoke
    if (tick % 4 === 1) spawnP(m.x + (Math.random() - 0.5) * 0.4, m.y + 0.6 + Math.random() * 1.2, m.z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 1.2, 2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.2,
      '#ffe080', 0.5, 0.04, 3);                                                                                                   // flying embers
  }
};

// ================= HEAVY MACE SMASH =================
// The smash used to land with no weight (no camera shake at all, an instant launch). Now a smash:
//  - freezes the action for a split second (hit-stop, longer the further you fell) so the hit really lands
//  - slams the camera down, kicks the FOV and shakes the screen, and drives the mace down in your hand
//  - booms with a deep, layered thud (+ a springy "boing" when a bounce mace launches you)
//  - sends a shockwave ring and a dust ring across the ground and throws heavy block chunks
//  - squashes the target flat and stretches you as you bounce off (rubbery, but heavy)
//  - stun mace: you rebound a little off their head instead of stopping dead
const HS = { until: 0 };
let smashCam = { t: -1e9, k: 0, delay: 0 }, smashFlashT = -1e9;
const SHOCK = [];
const shockGeo = new THREE.RingGeometry(0.42, 0.62, 40);
const _stepAndRenderHvMace = stepAndRender;
stepAndRender = function (dt) {
  if (performance.now() < HS.until && state === 'play') {            // hit-stop: render, but don't advance the game
    const p0 = paused; paused = true;
    try { _stepAndRenderHvMace(dt); } finally { paused = p0; }
    return;
  }
  _stepAndRenderHvMace(dt);
};
function smashSound(x, y, z, k, bounce, delaySec) {
  if (typeof tone2 !== 'function' || !player) return;
  const d = Math.hypot(player.x - x, player.y - y, player.z - z), v = clamp(1 - d / 32, 0, 1) * Math.min(1.2, k);
  if (v <= 0.02) return;
  tone2('sine', 75, 26, 0.95, 0.95 * v);                                         // body-hit boom
  tone2('triangle', 150, 48, 0.32, 0.4 * v);                                     // punch
  noise2(0.55, 0.75 * v, 'lowpass', 1500, 80, 0.8);                              // ground crunch
  noise2(0.09, 0.45 * v, 'highpass', 3200, 2200, 0.7);                           // crack
  tone2('square', 620, 590, 0.18, 0.035 * v, 0.01, [['bandpass', 1500, 8]]);    // metal ring of the mace head
  if (bounce) tone2('sine', 170, 560, 0.26, 0.16 * v, delaySec);                 // boing as you launch
}
function heavySmash(a, t, h) {
  const k = clamp(0.5 + h / 14, 0.55, 1.4), now = performance.now(), me = a === player || t === player;
  const stopMs = me && NET.role === null ? Math.round(70 + Math.min(h, 20) * 5) : 0;   // offline only (would freeze everyone online)
  if (stopMs) HS.until = now + stopMs;
  if (a === player) { smashCam = { t: now, k, delay: stopMs }; smashFlashT = now; }
  else if (t === player) smashCam = { t: now, k: k * 0.8, delay: stopMs };
  // squash the target, stretch the attacker when the rebound kicks in
  t._sq = { t: now, k, stretch: false };
  a._sq = { t: now + stopMs, k: k * 0.8, stretch: true };
  // stun mace: a small rebound off their head instead of stopping dead
  if (CFG.maceMode !== 'bounce') { a.vy = Math.max(a.vy, 0.34); a.onGround = false; }
  smashSound(t.x, t.y, t.z, k, CFG.maceMode === 'bounce', stopMs / 1000);
  // shockwave ring on the ground
  const gy = (t.onGround ? t.y : groundBelowY(t)) + 0.06;
  const ring = new THREE.Mesh(shockGeo, new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(t.x, gy, t.z); ring.renderOrder = 3; scene.add(ring);
  SHOCK.push({ mesh: ring, t: now, size: 3.5 + k * 2.5 });
  // dust ring rolling out along the ground + heavy chunks of the block underneath
  const bid = getB(t.x, gy - 0.5, t.z), col = bid && bid !== 255 && BL[bid] ? BL[bid].color : '#9a8f80';
  for (let i = 0; i < 30; i++) {
    const ang = (i / 30) * Math.PI * 2 + Math.random() * 0.2, sp = (3.5 + Math.random() * 2.5) * k;
    spawnP(t.x + Math.cos(ang) * 0.5, gy + 0.1, t.z + Math.sin(ang) * 0.5, Math.cos(ang) * sp, 0.5 + Math.random() * 0.8, Math.sin(ang) * sp,
      ['#d8cfc0', '#b8ad9c', col][(Math.random() * 3) | 0], 0.45 + Math.random() * 0.25, 0.16 + Math.random() * 0.1, 4);
  }
  for (let i = 0; i < 16; i++) spawnP(t.x + (Math.random() - 0.5) * 0.8, gy + 0.2, t.z + (Math.random() - 0.5) * 0.8,
    (Math.random() - 0.5) * 3, (3.5 + Math.random() * 4) * k, (Math.random() - 0.5) * 3, col, 0.9 + Math.random() * 0.4, 0.14 + Math.random() * 0.1, 24);
}
const _attackHvMace = attack;
attack = function (a, t, reach) {
  const smash = a.held && a.held.k === 'mace' && !a.onGround && a.fallDistance > 1.5;
  const h = smash ? (typeof maceHeight === 'function' ? maceHeight(a) : a.fallDistance) : 0;
  const r = _attackHvMace(a, t, reach);
  if (r && smash) heavySmash(a, t, h);
  return r;
};
// camera slam + shake + FOV kick, mace driven down in your hand, shockwave rings
const _updateCameraHvMace = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraHvMace(alpha, dt);
  const now = performance.now();
  for (let i = SHOCK.length - 1; i >= 0; i--) {
    const s = SHOCK[i], e = (now - s.t) / 380;
    if (e >= 1 || state !== 'play') { scene.remove(s.mesh); s.mesh.material.dispose(); SHOCK.splice(i, 1); continue; }
    const sc = 1 + (s.size - 1) * (1 - Math.pow(1 - e, 3)); s.mesh.scale.set(sc, sc, 1); s.mesh.material.opacity = 0.85 * (1 - e);
  }
  if (state !== 'play' || thirdPerson) return;
  const e = (now - smashCam.t) / 1000; if (e > 0.9) return;
  const k = smashCam.k, frozen = now < HS.until;
  // down-slam that springs back (a little overshoot = bounce)
  const dip = -k * 0.3 * Math.exp(-e * 8) * Math.cos(e * 20);
  const sh = frozen ? k * 0.07 : k * 0.07 * Math.exp(-e * 6);
  camera.position.y += dip;
  camera.position.x += (Math.random() - 0.5) * sh; camera.position.z += (Math.random() - 0.5) * sh;
  camera.rotation.z += (Math.random() - 0.5) * sh * 0.6;
  const fov = camera.fov + k * 6 * Math.exp(-e * 7); camera.fov = fov; camera.updateProjectionMatrix();
  if (typeof mcHand !== 'undefined' && mcItem.visible) { _T.makeTranslation(0, dip * 0.6, 0); mcHand.matrix.premultiply(_T); mcHand.matrixWorldNeedsUpdate = true; }
};
// squash & stretch on the models
const _updateModelsHvMace = updateModels;
updateModels = function (alpha) {
  _updateModelsHvMace(alpha);
  const now = performance.now();
  for (const m of mobs) {
    if (!m._sq || !m.parts) continue;
    const e = (now - m._sq.t) / 1000;
    if (e < 0) continue;
    if (e > 0.8) { m.parts.root.scale.set(1, 1, 1); m._sq = null; continue; }
    const amt = m._sq.k * Math.exp(-e * 7) * Math.cos(e * 24);
    const sy = m._sq.stretch ? 1 + amt * 0.28 : 1 - amt * 0.32, sxz = m._sq.stretch ? 1 - amt * 0.14 : 1 + amt * 0.2;
    m.parts.root.scale.set(sxz, sy, sxz);
  }
};
// a quick white impact flash for your own smashes
const _drawHUDHvMace = drawHUD;
drawHUD = function (a) {
  _drawHUDHvMace(a);
  const e = performance.now() - smashFlashT;
  if (state === 'play' && e < 140) { hctx.fillStyle = `rgba(255,245,225,${0.22 * (1 - e / 140)})`; hctx.fillRect(0, 0, W, H); }
};

// ================= REAL NETHER · THE END · BIG REALISTIC OVERWORLD MAPS · ITEM DROPS =================
// ---------- new blocks ----------
(function () {
  srand(31337);
  const mt = makeTile2, sp = (p, a) => p.concat ? p : p;
  mt(40, (x, y) => (rnd() < 0.16 || ((x + y * 3) % 7 === 0 && rnd() < 0.5)) ? nz([56, 40, 30], 10) : nz([88, 66, 52], 20));                 // soul sand
  mt(41, (x, y) => (x % 4 === 0) ? nz([50, 50, 56], 8) : nz([78, 78, 84], 16));                                                              // basalt side
  mt(42, (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return d > 6.5 ? nz([54, 54, 60], 8) : (Math.floor(d) % 3 === 0 ? nz([70, 70, 76], 8) : nz([92, 92, 98], 12)); }); // basalt top
  mt(43, () => rnd() < 0.1 ? nz([66, 60, 70], 10) : nz([40, 36, 44], 14));                                                                // blackstone
  mt(44, (x, y) => { const v = Math.sin(x * 1.1 + y * 0.3) + Math.cos(y * 1.2 - x * 0.5); return Math.abs(v) < 0.3 ? nz([255, 150, 40], 30) : nz([96, 32, 14], 16); }); // magma
  mt(45, () => rnd() < 0.15 ? nz([180, 40, 40], 16) : nz([132, 22, 28], 22));                                                             // crimson nylium top
  { const e = []; for (let x = 0; x < 16; x++) e[x] = 3 + (rnd() < 0.5 ? 1 : 0) + (rnd() < 0.3 ? 1 : 0);
    mt(46, (x, y) => y < e[x] ? nz([132, 22, 28], 22) : (rnd() < 0.15 ? nz([90, 26, 26], 20) : nz([112, 38, 36], 30)));                   // crimson side
    mt(50, (x, y) => y < e[x] ? nz([24, 116, 104], 22) : (rnd() < 0.15 ? nz([90, 26, 26], 20) : nz([112, 38, 36], 30))); }                 // warped side
  mt(47, x => (x % 3 === 0) ? nz([96, 40, 62], 10) : nz([138, 58, 86], 16));                                                              // crimson stem
  mt(48, () => rnd() < 0.2 ? nz([90, 4, 4], 10) : nz([124, 10, 12], 18));                                                                  // nether wart block
  mt(49, () => rnd() < 0.15 ? nz([40, 150, 136], 16) : nz([22, 112, 100], 22));                                                            // warped nylium top
  mt(51, x => (x % 3 === 0) ? nz([40, 76, 86], 10) : (rnd() < 0.08 ? nz([30, 190, 170], 10) : nz([64, 108, 118], 14)));                    // warped stem
  mt(52, () => rnd() < 0.2 ? nz([14, 96, 90], 10) : nz([22, 132, 122], 18));                                                                // warped wart
  mt(53, () => rnd() < 0.22 ? nz([255, 228, 150], 14) : nz([246, 158, 62], 22));                                                           // shroomlight
  mt(54, () => rnd() < 0.1 ? nz([236, 230, 220], 12) : (rnd() < 0.15 ? nz([90, 26, 26], 20) : nz([112, 38, 36], 30)));                      // nether quartz ore
  mt(55, () => rnd() < 0.12 ? nz([196, 198, 136], 12) : nz([222, 224, 164], 16));                                                          // end stone
  mt(56, (x, y) => (x % 8 === 0 || y % 8 === 0) ? nz([138, 94, 138], 8) : nz([170, 124, 170], 14));                                        // purpur
  mt(57, () => { const r = rnd(); return r < 0.04 ? [140, 230, 210, 255] : r < 0.07 ? [220, 240, 255, 255] : r < 0.1 ? [60, 150, 120, 255] : nz([10, 14, 24], 8); }); // end portal
  mt(58, (x, y) => ((x > 3 && x < 12) || (y > 3 && y < 12)) ? nz([150, 108, 150], 14) : nz([96, 62, 98], 10));                             // chorus plant
  mt(59, () => nz([62, 54, 52], 14));                                                                                                        // mud
  mt(60, (x, y) => ((x + y * 2) % 9 === 0) ? nz([200, 222, 255], 8) : nz([142, 180, 248], 12));                                            // packed ice
  mt(61, () => nz([160, 84, 40], 10));                                                                                                       // terracotta
  mt(62, () => nz([206, 176, 158], 10));                                                                                                     // white terracotta
  mt(63, () => nz([188, 102, 36], 22));                                                                                                      // red sand
  atlasTex.needsUpdate = true;
})();
Object.assign(B, { SOUL_SAND: 35, BASALT: 36, BLACKSTONE: 37, MAGMA: 38, CRIMSON_NYLIUM: 39, CRIMSON_STEM: 40, NETHER_WART: 41, WARPED_NYLIUM: 42,
  WARPED_STEM: 43, WARPED_WART: 44, SHROOMLIGHT: 45, QUARTZ_ORE: 46, END_STONE: 47, PURPUR: 48, END_PORTAL: 49, CHORUS: 50, MUD: 51,
  PACKED_ICE: 52, TERRACOTTA: 53, WHITE_TERRACOTTA: 54, RED_SAND: 55 });
defB(35, 'Soul Sand', [40, 40, 40], 0.5, 'shovel', { color: '#584234' });
defB(36, 'Basalt', [42, 41, 42], 1.25, 'pick', { needTool: true, color: '#4e4e54' });
defB(37, 'Blackstone', [43, 43, 43], 1.5, 'pick', { needTool: true, color: '#2a2630' });
defB(38, 'Magma Block', [44, 44, 44], 0.5, 'pick', { needTool: true, color: '#8a3010' });
defB(39, 'Crimson Nylium', [45, 46, 21], 0.4, 'pick', { needTool: true, drop: 20, color: '#8c1820' });
defB(40, 'Crimson Stem', [47, 47, 47], 2, 'axe', { color: '#8a3a56' });
defB(41, 'Nether Wart Block', [48, 48, 48], 1, 'hoe', { color: '#7c0a0c' });
defB(42, 'Warped Nylium', [49, 50, 21], 0.4, 'pick', { needTool: true, drop: 20, color: '#167064' });
defB(43, 'Warped Stem', [51, 51, 51], 2, 'axe', { color: '#406c76' });
defB(44, 'Warped Wart Block', [52, 52, 52], 1, 'hoe', { color: '#16847a' });
defB(45, 'Shroomlight', [53, 53, 53], 1, 'hoe', { color: '#f69e3e' });
defB(46, 'Nether Quartz Ore', [54, 54, 54], 3, 'pick', { needTool: true, drop: 20, color: '#e0d8d0' });
defB(47, 'End Stone', [55, 55, 55], 3, 'pick', { needTool: true, color: '#dee0a4' });
defB(48, 'Purpur Block', [56, 56, 56], 1.5, 'pick', { needTool: true, color: '#aa7caa' });
defB(49, 'End Portal', [57, 57, 57], -1, null, { solid: false, drop: 0, color: '#0a0e18' });
defB(50, 'Chorus Plant', [58, 58, 58], 0.4, 'axe', { opaque: false, color: '#6e466e' });
defB(51, 'Mud', [59, 59, 59], 0.5, 'shovel', { color: '#3e3634' });
defB(52, 'Packed Ice', [60, 60, 60], 0.5, 'pick', { friction: 0.98, color: '#8eb4f8' });
defB(53, 'Terracotta', [61, 61, 61], 1.25, 'pick', { needTool: true, color: '#a05428' });
defB(54, 'White Terracotta', [62, 62, 62], 1.25, 'pick', { needTool: true, color: '#ceb09e' });
defB(55, 'Red Sand', [63, 63, 63], 0.5, 'shovel', { color: '#bc6624' });
FALLS.add(B.RED_SAND);

// ---------- shared helpers ----------
const ow = (S, x, z) => x * S + z;
function standable(x, y, z) {
  const below = getB(x, y - 1, z), a = getB(x, y, z), b = getB(x, y + 1, z);
  if (!isSolid(below) || below === B.LEAVES || below === B.LOG || below === B.MAGMA || below === B.CACTUS) return false;
  if (a && (a === 255 || BL[a].solid || BL[a].liquid)) return false;
  if (b && (b === 255 || BL[b].solid || BL[b].liquid)) return false;
  return true;
}
// spawns on the real surface (scan from the top, skipping tree tops), in a ring, ordered by angle (team split relies on order)
function surfaceSpawns(cx, cz, r, n, maxY) {
  spawns = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2; let found = null;
    for (const dr of [0, -3, 3, -6, 6, -9, 9, 12]) {
      const x = Math.floor(cx + Math.cos(a) * (r + dr)), z = Math.floor(cz + Math.sin(a) * (r + dr));
      for (let y = Math.min(maxY, WY - 3); y > 1; y--) if (standable(x, y, z)) { found = [x + 0.5, y + 0.01, z + 0.5]; break; }
      if (found) break;
    }
    spawns.push(found || [cx + 0.5, topY(Math.floor(cx), Math.floor(cz)) + 0.01, cz + 0.5]);
  }
}
function bigOak(x, y, z, ht) {
  for (let i = 0; i < ht; i++) rawSet(x, y + i, z, B.LOG);
  const top = y + ht;
  for (let dy = -3; dy <= 1; dy++) {
    const r = dy <= -2 ? 3 : dy === 1 ? 1.5 : 2.6;
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dz) <= r + rnd() * 0.5 && !getB(x + dx, top + dy, z + dz)) rawSet(x + dx, top + dy, z + dz, B.LEAVES);
  }
}
function giantOak(x, y, z) {                                     // 2x2 trunk, 15-20 tall, huge canopy: real cover
  const ht = 15 + ((rnd() * 6) | 0);
  for (let i = 0; i < ht; i++) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) rawSet(x + a, y + i, z + b, B.LOG);
  for (const [a, b] of [[-1, 0], [2, 1], [0, -1], [1, 2]]) rawSet(x + a, y, z + b, B.LOG);    // roots
  const cy = y + ht - 2;
  for (let dx = -6; dx <= 7; dx++) for (let dz = -6; dz <= 7; dz++) for (let dy = -4; dy <= 3; dy++) {
    const d = Math.hypot(dx - 0.5, dy * 1.4, dz - 0.5);
    if (d < 6 - rnd() * 1.2 && !getB(x + dx, cy + dy, z + dz)) rawSet(x + dx, cy + dy, z + dz, B.LEAVES);
  }
}
function spruceTree(x, y, z) {
  const ht = 7 + ((rnd() * 6) | 0);
  for (let i = 0; i < ht; i++) rawSet(x, y + i, z, B.LOG);
  for (let i = 2; i <= ht; i++) { const r = Math.max(0, Math.round((ht - i) / 2.6)) + ((ht - i) % 3 === 0 ? 0 : 1) * (i < ht - 1 ? 1 : 0); for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r + 0.5 && !getB(x + dx, y + i, z + dz)) rawSet(x + dx, y + i, z + dz, B.LEAVES); }
  rawSet(x, y + ht, z, B.LEAVES); rawSet(x, y + ht + 1, z, B.LEAVES);
}
function swampOak(x, y, z) {
  const ht = 5 + ((rnd() * 2) | 0);
  for (let i = 0; i < ht; i++) rawSet(x, y + i, z, B.LOG);
  for (let dy = -1; dy <= 0; dy++) for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    if (Math.hypot(dx, dz) > 3.3 - dy * 1.2) continue;
    if (!getB(x + dx, y + ht + dy, z + dz)) rawSet(x + dx, y + ht + dy, z + dz, B.LEAVES);
    if (dy === -1 && Math.hypot(dx, dz) > 2.4 && rnd() < 0.35) for (let v = 1; v <= 1 + ((rnd() * 3) | 0); v++) if (!getB(x + dx, y + ht - 1 - v, z + dz)) rawSet(x + dx, y + ht - 1 - v, z + dz, B.LEAVES); // hanging vines
  }
}
function boulder(x, y, z, r, mats) {
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let dy = -1; dy <= 3; dy++) if (Math.hypot(dx, dy * 1.3, dz) < r) rawSet(x + dx, y + dy, z + dz, mats[(rnd() * mats.length) | 0]);
}
// ravines (knockback kill zones) + caves (ambush spots); never in the middle where everyone spawns
function carveWorld(seed, H, S, SEA, o) {
  const C = S / 2, safe = o.safe || 18;
  if (o.caves) {
    const A = makeNoise(seed + 71), Bn = makeNoise(seed + 72), E = makeNoise(seed + 73);
    for (let x = 1; x < S - 1; x++) for (let z = 1; z < S - 1; z++) {
      if (Math.hypot(x - C, z - C) < safe) continue;
      const top = H[ow(S, x, z)], open = E(x * 0.08, 0, z * 0.08, 2) > 0.7;
      for (let y = 4; y <= top - (open ? 0 : 3); y++) {
        const a = A(x * 0.045, y * 0.075, z * 0.045, 2), b = Bn(x * 0.045, y * 0.075 + 40, z * 0.045, 2);
        if (Math.abs(a - 0.5) < 0.045 && Math.abs(b - 0.5) < 0.075) {
          if (getB(x, y + 1, z) === B.WATER || getB(x, y, z) === B.BEDROCK) continue;
          rawSet(x, y, z, y <= 6 ? B.LAVA : 0);
        }
      }
    }
  }
  for (let k = 0; k < (o.ravines || 0); k++) {
    const a0 = rnd() * Math.PI * 2, off = (25 + rnd() * 25) * (rnd() < 0.5 ? -1 : 1);
    const dx = Math.cos(a0), dz = Math.sin(a0), px = -dz, pz = dx;
    const floor = o.floor || 6, wMax = o.width || 3;
    for (let t = -S; t <= S; t += 0.6) {
      const cx = C + dx * t + px * (off + Math.sin(t * 0.035 + k) * 9), cz = C + dz * t + pz * (off + Math.sin(t * 0.035 + k) * 9);
      if (cx < 2 || cz < 2 || cx > S - 3 || cz > S - 3) continue;
      const w = 1.5 + wMax * Math.pow(Math.sin((t + S) / (2 * S) * Math.PI), 0.7) * (0.7 + 0.3 * Math.sin(t * 0.09));
      for (let x = Math.floor(cx - w - 1); x <= cx + w + 1; x++) for (let z = Math.floor(cz - w - 1); z <= cz + w + 1; z++) {
        if (x < 1 || z < 1 || x >= S - 1 || z >= S - 1 || Math.hypot(x - C, z - C) < safe) continue;
        const d = Math.hypot(x - cx, z - cz); if (d > w) continue;
        const fl = floor + Math.round((d / w) * 6);                 // V-shaped walls
        let wet = false; for (let a = -2; a <= 2 && !wet; a++) for (let b = -2; b <= 2; b++) { const id = getB(x + a, SEA, z + b), id2 = getB(x + a, SEA - 1, z + b); if (id === B.WATER || id2 === B.WATER || id === B.ICE) { wet = true; break; } }
        const ceil = wet ? SEA - 5 : WY - 1;                        // under a river / lake: leave a natural rock bridge
        for (let y = fl; y < ceil; y++) { const id = getB(x, y, z); if (id && id !== B.BEDROCK) rawSet(x, y, z, 0); }
        if (o.fill && d < w * 0.6) for (let y = floor; y < floor + 2; y++) rawSet(x, y, z, o.fill);
      }
    }
  }
}

// ---------- big realistic overworld maps: forest, desert canyon (mesa), snowy peaks, swamp ----------
// Layered noise for hills, mountains and mesas, a river, ravines, caves, and biome rules that change the fight:
//  forest: giant trees + boulders for cover, a river that slows you · canyon: stepped mesa cliffs, sand that falls,
//  canyons with lava at the bottom · peaks: high ground, packed-ice slopes and frozen lakes you slide on, lava ravine ·
//  swamp: shallow water everywhere slows you, thick fog for ambushes.
function genLand(seed, kind) {
  const S = 192; allocWorld(S, 80, S); VOID_Y = -30;
  const N1 = makeNoise(seed + 1), N2 = makeNoise(seed + 2), N3 = makeNoise(seed + 3), N4 = makeNoise(seed + 4), NR = makeNoise(seed + 5), N6 = makeNoise(seed + 6);
  srand(seed + 9);
  const SEA = 22, C = S / 2, H = new Int16Array(S * S), RIV = new Uint8Array(S * S);
  const CH = { forest: 27, peaks: 31, canyon: 25, swamp: SEA + 1 }[kind];
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const cont = N1(x * 0.008, 0, z * 0.008, 4), hill = N2(x * 0.03, 1, z * 0.03, 3), det = N3(x * 0.09, 2, z * 0.09, 2);
    const ridge = 1 - Math.abs(N4(x * 0.012, 3, z * 0.012, 4) * 2 - 1);
    let h;
    if (kind === 'forest') h = 26 + (cont - 0.5) * 18 + (hill - 0.5) * 14 + (det - 0.5) * 3;
    else if (kind === 'peaks') { const m = clamp((ridge - 0.45) / 0.55, 0, 1); h = 27 + (cont - 0.5) * 14 + Math.pow(m, 1.5) * 46 + (hill - 0.5) * 6 + (det - 0.5) * 2; }
    else if (kind === 'canyon') {
      h = 24 + (det - 0.5) * 2 + (hill - 0.5) * 3;
      const mm = cont * 0.65 + hill * 0.35, t = clamp((mm - 0.52) / 0.06, 0, 1);
      if (t > 0) h = 24 + Math.floor(t * 4) / 4 * (20 + 10 * N4(x * 0.02, 5, z * 0.02, 2));   // stepped mesa cliffs
    } else h = SEA + 0.2 + (cont - 0.5) * 6 + (det - 0.5) * 2.5;                                 // swamp: right at water level
    const rv = Math.abs(NR(x * 0.0065, 5, z * 0.0065, 3) - 0.5), rw = kind === 'swamp' ? 0.03 : 0.022;
    if (rv < rw && Math.hypot(x - C, z - C) > 16) { const k = 1 - rv / rw; h = Math.min(h, SEA - 1 - k * 3); RIV[ow(S, x, z)] = 1; }
    const dc = Math.hypot(x - C, z - C); if (dc < 15) h = lerp(h, CH, 1 - dc / 15);
    H[ow(S, x, z)] = clamp(Math.round(h), 5, WY - 6);
  }
  if (kind !== 'canyon') { const src = H.slice(); for (let x = 1; x < S - 1; x++) for (let z = 1; z < S - 1; z++) { let s = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) s += src[ow(S, x + a, z + b)]; H[ow(S, x, z)] = Math.round(s / 9); } }
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const h = H[ow(S, x, z)];
    let slope = 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + a, zz = z + b; if (xx >= 0 && zz >= 0 && xx < S && zz < S) slope = Math.max(slope, h - H[ow(S, xx, zz)]); }
    rawSet(x, 0, z, B.BEDROCK); if (rnd() < 0.5) rawSet(x, 1, z, B.BEDROCK);
    for (let y = 1; y < h - 3; y++) if (!getB(x, y, z)) rawSet(x, y, z, B.STONE);
    const wet = h < SEA;
    if (kind === 'canyon') {
      for (let y = Math.max(1, h - 3); y <= h; y++) {
        if (y > 25) { const band = (y + Math.floor(N6(x * 0.03, y * 0.1, z * 0.03) * 2)) % 6; rawSet(x, y, z, band === 0 ? B.WHITE_TERRACOTTA : band === 3 ? B.SANDSTONE : band === 4 ? B.WHITE_TERRACOTTA : B.TERRACOTTA); }
        else rawSet(x, y, z, y === h ? (N2(x * 0.05, 9, z * 0.05) > 0.56 ? B.RED_SAND : B.SAND) : B.SANDSTONE);
      }
      for (let y = 26; y < h - 3; y++) { const band = (y + Math.floor(N6(x * 0.03, y * 0.1, z * 0.03) * 2)) % 6; rawSet(x, y, z, band === 0 || band === 4 ? B.WHITE_TERRACOTTA : band === 3 ? B.SANDSTONE : B.TERRACOTTA); }
    } else {
      const sub = kind === 'swamp' && wet ? B.MUD : B.DIRT;
      for (let y = Math.max(1, h - 3); y < h; y++) rawSet(x, y, z, slope >= 4 ? B.STONE : sub);
      let top = B.GRASS;
      if (wet) top = kind === 'swamp' ? (rnd() < 0.5 ? B.MUD : B.DIRT) : (RIV[ow(S, x, z)] ? B.SAND : B.DIRT);
      else if (kind === 'peaks') top = h > 56 ? B.SNOW : slope >= 3 ? B.STONE : h > 46 ? B.SNOW : (h > 38 && slope >= 1 && N6(x * 0.06, 4, z * 0.06) > 0.58) ? B.PACKED_ICE : B.GRASS;
      else if (slope >= 4) top = B.STONE;
      else if (h <= SEA + 1 && RIV[ow(S, x, z)]) top = B.SAND;
      rawSet(x, h, z, top);
    }
    for (let y = h + 1; y <= SEA; y++) rawSet(x, y, z, (kind === 'peaks' && y === SEA && !RIV[ow(S, x, z)]) ? B.ICE : B.WATER);
  }
  carveWorld(seed, H, S, SEA, kind === 'swamp' ? { caves: false } :
    kind === 'canyon' ? { caves: true, ravines: 3, width: 4.5, floor: 9, fill: B.LAVA } :
    kind === 'peaks' ? { caves: true, ravines: 2, width: 3, floor: 7, fill: B.LAVA } : { caves: true, ravines: 1, width: 3, floor: 8, fill: B.WATER });
  // decorations
  for (let x = 3; x < S - 3; x++) for (let z = 3; z < S - 3; z++) {
    const h = H[ow(S, x, z)], top = getB(x, h, z), dc = Math.hypot(x - C, z - C);
    if (getB(x, h + 1, z) && getB(x, h + 1, z) !== B.WATER) continue;
    const r = rnd(), dry = !getB(x, h + 1, z);
    if (dc < 9) continue;
    if (kind === 'forest' && top === B.GRASS && dry) {
      if (r < 0.004 && dc > 14) giantOak(x, h + 1, z);
      else if (r < 0.05) bigOak(x, h + 1, z, 5 + ((rnd() * 5) | 0));
      else if (r < 0.3) rawSet(x, h + 1, z, B.TALLGRASS);
      else if (r < 0.33) rawSet(x, h + 1, z, [B.POPPY, B.CORNFLOWER, B.DANDELION][(rnd() * 3) | 0]);
    } else if (kind === 'peaks' && dry && (top === B.GRASS || (top === B.SNOW && h < 50))) {
      if (r < 0.035) spruceTree(x, h + 1, z); else if (top === B.GRASS && r < 0.15) rawSet(x, h + 1, z, B.TALLGRASS);
    } else if (kind === 'canyon' && dry && (top === B.SAND || top === B.RED_SAND)) {
      if (r < 0.007) { const ch = 1 + ((rnd() * 3) | 0); for (let i = 1; i <= ch; i++) rawSet(x, h + i, z, B.CACTUS); }
    } else if (kind === 'swamp') {
      if (r < (dry ? 0.007 : 0.003) && (top === B.GRASS || top === B.MUD || top === B.DIRT)) swampOak(x, h + 1, z);
      else if (dry && top === B.GRASS && r < 0.35) rawSet(x, h + 1, z, B.TALLGRASS);
    }
  }
  const bmat = kind === 'canyon' ? [B.SANDSTONE, B.TERRACOTTA] : kind === 'peaks' ? [B.STONE, B.COBBLE, B.STONE] : [B.COBBLE, B.STONE, B.COBBLE];
  if (kind !== 'swamp') for (let i = 0; i < 40; i++) { const x = 8 + ((rnd() * (S - 16)) | 0), z = 8 + ((rnd() * (S - 16)) | 0), h = H[ow(S, x, z)]; if (h > SEA && Math.hypot(x - C, z - C) > 12 && getB(x, h, z) !== 0) boulder(x, h + 1, z, 1.3 + rnd() * 1.9, bmat); }
  surfaceSpawns(C, C, 22, 16, WY - 3);
  spawns.H = H;
}
NEW_MAPS.forest = s => genLand(s, 'forest');
NEW_MAPS.swamp = s => genLand(s, 'swamp');
NEW_MAPS.snow = s => genLand(s, 'peaks');
NEW_MAPS.canyon = s => genLand(s, 'canyon');
Object.assign(ATMO, {
  forest: { bg: 0x86b4f0, fog: 0xa8c8e8, near: 50, far: 170, sky: true, tint: 1, light: 0.9 },
  swamp: { bg: 0x7a8a78, fog: 0x6c7a5c, near: 10, far: 64, sky: true, tint: 0.9, light: 0.78 },
  snow: { bg: 0xb4c6e2, fog: 0xdfe8f4, near: 50, far: 180, sky: true, tint: 1, light: 0.95 },
  canyon: { bg: 0x9cc0f0, fog: 0xeed8b0, near: 60, far: 190, sky: true, tint: 1.02, light: 0.95 }
});

// ---------- THE NETHER: a real cavern under a bedrock roof ----------
// Lava sea, nether wastes, soul sand valleys (soul sand slows you), crimson & warped forests with huge fungi, basalt
// deltas with magma (burns if you stand on it), glowstone, lava falls, and a nether-brick fortress: a hall in the middle
// with four long bridges over the lava sea, tunnelling through the rock.
let NETHER_BIO = null;
function genNetherReal(seed) {
  const S = 192; allocWorld(S, 72, S); VOID_Y = -30;
  const nF = makeNoise(seed + 1), nC = makeNoise(seed + 2), n3 = makeNoise(seed + 3), b1n = makeNoise(seed + 4), b2n = makeNoise(seed + 5), nD = makeNoise(seed + 6);
  srand(seed + 7);
  const LAVA_Y = 20, C = S / 2, FY = 36;
  const BIO = new Uint8Array(S * S), FL = new Int16Array(S * S), CE = new Int16Array(S * S);   // 0 wastes 1 soul 2 crimson 3 warped 4 basalt
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const b1 = b1n(x * 0.011, 0, z * 0.011, 3), b2 = b2n(x * 0.011, 5, z * 0.011, 3);
    const bio = b1 < 0.4 ? (b2 < 0.5 ? 1 : 4) : b1 > 0.58 ? (b2 < 0.5 ? 2 : 3) : 0;
    let f = 19 + (nF(x * 0.018, 0, z * 0.018, 4) - 0.5) * 34;
    if (bio === 1) f = 22 + (nF(x * 0.02, 0, z * 0.02, 4) - 0.5) * 12;
    if (bio === 4) f += (nD(x * 0.15, 1, z * 0.15, 2) - 0.5) * 7;
    BIO[ow(S, x, z)] = bio; FL[ow(S, x, z)] = Math.round(f); CE[ow(S, x, z)] = Math.round(60 + (nC(x * 0.03, 0, z * 0.03, 3) - 0.5) * 16);
  }
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const i = ow(S, x, z), fl = FL[i], ce = CE[i], bio = BIO[i];
    for (let y = 1; y < WY - 1; y++) {
      let solid = y <= fl || y >= ce;
      if (!solid && y > fl && y < ce) { const d = n3(x * 0.035, y * 0.05, z * 0.035, 3); if (d > 0.68) solid = true; }
      else if (solid && y <= fl && y > LAVA_Y - 2) { const d = n3(x * 0.05, y * 0.07, z * 0.05, 2); if (d < 0.27) solid = false; }
      if (solid) {
        let m = B.NETHERRACK;
        if (bio === 4) m = (n3(x * 0.2, y * 0.2, z * 0.2) > 0.5) ? B.BASALT : B.BLACKSTONE;
        else if (m === B.NETHERRACK) { const r = rnd(); if (r < 0.012) m = B.QUARTZ_ORE; else if (r < 0.018) m = B.GOLD_ORE; }
        rawSet(x, y, z, m);
      } else if (y <= LAVA_Y) rawSet(x, y, z, B.LAVA);
    }
    rawSet(x, 0, z, B.BEDROCK); rawSet(x, WY - 1, z, B.BEDROCK);
    if (rnd() < 0.5) rawSet(x, 1, z, B.BEDROCK); if (rnd() < 0.5) rawSet(x, WY - 2, z, B.BEDROCK);
    // surface materials on every floor that has air (or lava) above it
    for (let y = 2; y < WY - 2; y++) {
      const id = getB(x, y, z); if (!isSolid(id) || id === B.BEDROCK) continue;
      const above = getB(x, y + 1, z); if (above && above !== B.LAVA) continue;
      if (bio === 1) { for (let k = 0; k < 3; k++) if (isSolid(getB(x, y - k, z)) && getB(x, y - k, z) !== B.BEDROCK) rawSet(x, y - k, z, B.SOUL_SAND); }
      else if (bio === 2) rawSet(x, y, z, B.CRIMSON_NYLIUM);
      else if (bio === 3) rawSet(x, y, z, B.WARPED_NYLIUM);
      else if (bio === 4 && rnd() < 0.18) rawSet(x, y, z, B.MAGMA);
      else if (bio === 0 && y <= LAVA_Y + 2 && rnd() < 0.45) rawSet(x, y, z, B.MAGMA);
    }
  }
  // glowstone hanging from the roof
  for (let i = 0; i < 90; i++) {
    const x = 4 + ((rnd() * (S - 8)) | 0), z = 4 + ((rnd() * (S - 8)) | 0);
    let y = CE[ow(S, x, z)] - 1; while (y > FL[ow(S, x, z)] + 4 && isSolid(getB(x, y, z))) y--;
    if (y <= FL[ow(S, x, z)] + 4) continue;
    for (let k = 0; k < 26; k++) { const dx = ((rnd() * 5) | 0) - 2, dz = ((rnd() * 5) | 0) - 2, dy = -((rnd() * 4) | 0); if (!getB(x + dx, y + dy, z + dz)) rawSet(x + dx, y + dy, z + dz, B.GLOWSTONE); }
  }
  // biome features
  const fungus = (x, y, z, stem, cap, huge) => {
    const ht = huge ? 11 + ((rnd() * 7) | 0) : 4 + ((rnd() * 5) | 0), R = huge ? 4 : 2;
    for (let i = 0; i < ht; i++) { rawSet(x, y + i, z, stem); if (huge) { rawSet(x + 1, y + i, z, stem); rawSet(x, y + i, z + 1, stem); rawSet(x + 1, y + i, z + 1, stem); } }
    for (let dy = -Math.max(2, R); dy <= 1; dy++) for (let dx = -R; dx <= R + (huge ? 1 : 0); dx++) for (let dz = -R; dz <= R + (huge ? 1 : 0); dz++) {
      const d = Math.hypot(dx - (huge ? 0.5 : 0), dz - (huge ? 0.5 : 0)), yy = y + ht + dy;
      if (dy === 1 ? d > R - 1 : (dy < -1 ? d < R - 0.6 : d > R + 0.4)) continue;
      if (!getB(x + dx, yy, z + dz)) rawSet(x + dx, yy, z + dz, rnd() < 0.08 ? B.SHROOMLIGHT : cap);
    }
  };
  for (let x = 3; x < S - 3; x++) for (let z = 3; z < S - 3; z++) {
    const bio = BIO[ow(S, x, z)], r = rnd();
    for (let y = LAVA_Y + 1; y < WY - 12; y++) {
      const id = getB(x, y, z); if (getB(x, y + 1, z) || !isSolid(id)) continue;
      if (Math.abs(x - C) < 14 && Math.abs(z - C) < 14) break;
      if (id === B.CRIMSON_NYLIUM && r < 0.03) fungus(x, y + 1, z, B.CRIMSON_STEM, B.NETHER_WART, r < 0.004);
      else if (id === B.WARPED_NYLIUM && r < 0.03) fungus(x, y + 1, z, B.WARPED_STEM, B.WARPED_WART, r < 0.004);
      else if (bio === 1 && r < 0.0012) { for (let yy = y + 1; yy < CE[ow(S, x, z)]; yy++) { if (isSolid(getB(x, yy, z))) break; rawSet(x, yy, z, B.BASALT); rawSet(x + 1, yy, z, B.BASALT); } }
      else if (bio === 4 && r < 0.03) { const ht = 2 + ((rnd() * 5) | 0); for (let k = 1; k <= ht; k++) rawSet(x, y + k, z, B.BASALT); }
      break;
    }
    if (bio === 2 && r > 0.985) { let y = CE[ow(S, x, z)] - 1; while (y > 30 && isSolid(getB(x, y, z))) y--; for (let k = 0; k < 2 + ((rnd() * 5) | 0); k++) if (!getB(x, y - k, z)) rawSet(x, y - k, z, B.NETHER_WART); }
  }
  // lava falls from the roof
  for (let i = 0; i < 12; i++) {
    const x = 6 + ((rnd() * (S - 12)) | 0), z = 6 + ((rnd() * (S - 12)) | 0);
    if (Math.abs(x - C) < 16 || Math.abs(z - C) < 16) continue;
    let y = CE[ow(S, x, z)] - 1; while (y > 25 && isSolid(getB(x, y, z))) y--;
    for (; y > LAVA_Y && !isSolid(getB(x, y, z)); y--) rawSet(x, y, z, B.LAVA);
  }
  // the fortress: hall + four bridges over the lava
  const NB = B.NETHER_BRICK;
  const clear = (x, z, y0, y1) => { for (let y = y0; y <= y1; y++) rawSet(x, y, z, 0); };
  for (let x = C - 10; x <= C + 10; x++) for (let z = C - 10; z <= C + 10; z++) {
    rawSet(x, FY, z, NB); clear(x, z, FY + 1, FY + 7);
    const edge = Math.abs(x - C) === 10 || Math.abs(z - C) === 10, door = Math.abs(x - C) <= 2 || Math.abs(z - C) <= 2;
    if (edge && !door) { rawSet(x, FY + 1, z, NB); rawSet(x, FY + 2, z, NB); }
    if (Math.abs(x - C) === 10 && Math.abs(z - C) === 10) for (let y = FY + 1; y <= FY + 6; y++) rawSet(x, y, z, NB);
    if ((x - C) % 5 === 0 && (z - C) % 5 === 0) for (let y = FY - 1; y > 1 && !isSolid(getB(x, y, z)) || getB(x, y, z) === B.LAVA; y--) rawSet(x, y, z, NB);
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let t = 11; t < C - 4; t++) for (let w = -3; w <= 3; w++) {
      const x = C + dx * t + (dz ? w : 0), z = C + dz * t + (dx ? w : 0);
      clear(x, z, FY + 1, FY + 5);
      if (Math.abs(w) <= 2) rawSet(x, FY, z, NB);
      if (Math.abs(w) === 2) rawSet(x, FY + 1, z, NB);
      if (t % 14 === 0 && Math.abs(w) <= 2) for (let y = FY - 1; y > 1 && (!isSolid(getB(x, y, z)) || getB(x, y, z) === B.LAVA); y--) rawSet(x, y, z, NB);   // arches down to the lava / floor
    }
    // a small outpost room at 60 blocks out
    const ox = C + dx * 60, oz = C + dz * 60;
    for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) {
      const x = ox + a, z = oz + b; rawSet(x, FY, z, NB); clear(x, z, FY + 1, FY + 5);
      if ((Math.abs(a) === 4 || Math.abs(b) === 4) && !(Math.abs(dx ? b : a) <= 2)) for (let y = FY + 1; y <= FY + 3; y++) rawSet(x, y, z, NB);
      rawSet(x, FY + 5, z, NB);
    }
  }
  // spawns: around the hall and along the bridges
  spawns = [];
  const pts = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; pts.push([C + 0.5 + Math.cos(a) * 6.5, C + 0.5 + Math.sin(a) * 6.5]); }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const t of [16, 26, 36]) pts.push([C + 0.5 + dx * t, C + 0.5 + dz * t]);
  pts.sort((p, q) => Math.atan2(p[1] - C, p[0] - C) - Math.atan2(q[1] - C, q[0] - C));
  for (const [x, z] of pts) spawns.push([x, FY + 1.01, z]);
  NETHER_BIO = { BIO, S };
}
NEW_MAPS.nether = genNetherReal;
ATMO.nether = { bg: 0x3a0c08, fog: 0x5a1a10, near: 10, far: 95, sky: false, tint: 0.92, light: 0.78 };

// ---------- THE END: a floating island over the void ----------
// Main end-stone island, ten obsidian pillars with end crystals on top (shoot or hit one and it explodes), the exit
// portal in the middle, and outer islands with chorus plants and an end city tower. Fall off and it's the void.
const END_CR = [];
function genEnd(seed) {
  const S = 224; allocWorld(S, 96, S); VOID_Y = -14;
  const n1 = makeNoise(seed + 1), n2 = makeNoise(seed + 2); srand(seed + 4);
  const C = S / 2, TOP = 52;
  END_CR.length = 0;
  const island = (cx, cz, R, top, thick) => {
    for (let x = Math.floor(cx - R * 1.2); x <= cx + R * 1.2; x++) for (let z = Math.floor(cz - R * 1.2); z <= cz + R * 1.2; z++) {
      if (x < 1 || z < 1 || x >= S - 1 || z >= S - 1) continue;
      const d = Math.hypot(x - cx, z - cz), edge = R * (0.82 + 0.3 * n1(x * 0.03, cx, z * 0.03, 3)); if (d > edge) continue;
      const k = d / edge, t = top + Math.round((n2(x * 0.05, 1, z * 0.05, 2) - 0.5) * 3 - k * k * 3);
      const depth = Math.round((1 - Math.pow(k, 1.3)) * thick * (0.75 + 0.5 * n2(x * 0.04, 3, z * 0.04, 2))) + 2;
      for (let y = Math.max(1, t - depth); y <= t; y++) rawSet(x, y, z, B.END_STONE);
    }
  };
  const surf = (x, z) => { for (let y = WY - 2; y > 0; y--) if (getB(x, y, z)) return y; return -1; };
  island(C, C, 62, TOP, 36);
  // obsidian pillars + crystals
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, px = Math.round(C + Math.cos(a) * 42), pz = Math.round(C + Math.sin(a) * 42);
    const pr = 2 + ((i * 7) % 4), ht = 14 + ((i * 37) % 10) * 2.2, base = surf(px, pz) - 3, top = TOP + Math.round(ht);
    for (let x = px - pr - 1; x <= px + pr + 1; x++) for (let z = pz - pr - 1; z <= pz + pr + 1; z++) if (Math.hypot(x - px, z - pz) <= pr + 0.4) for (let y = base; y <= top; y++) rawSet(x, y, z, B.OBSIDIAN);
    rawSet(px, top + 1, pz, B.BEDROCK);
    END_CR.push({ x: px + 0.5, y: top + 2.2, z: pz + 0.5 });
  }
  // exit portal (bedrock fountain)
  const g = surf(C, C);
  for (let x = C - 4; x <= C + 4; x++) for (let z = C - 4; z <= C + 4; z++) {
    const d = Math.hypot(x - C, z - C); if (d > 3.6) continue;
    rawSet(x, g, z, B.BEDROCK);
    if (d >= 2.5) rawSet(x, g + 1, z, B.BEDROCK); else if (d > 0.5) rawSet(x, g + 1, z, B.END_PORTAL);
    for (let y = g + 2; y < g + 6; y++) rawSet(x, y, z, 0);
  }
  for (let y = g + 1; y <= g + 4; y++) rawSet(C, y, C, B.BEDROCK);
  // outer islands with chorus plants, one with an end city tower
  const chorus = (x, y, z, n) => { let cx = x, cz = z; for (let i = 0; i < n; i++) { rawSet(cx, y + i, cz, B.CHORUS); if (i > 1 && rnd() < 0.35) { const [a, b] = [[1, 0], [-1, 0], [0, 1], [0, -1]][(rnd() * 4) | 0]; rawSet(cx + a, y + i, cz + b, B.CHORUS); rawSet(cx + a, y + i + 1, cz + b, B.CHORUS); } } };
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + rnd() * 0.4, dist = 88 + rnd() * 8, r = 9 + rnd() * 6;
    const ix = Math.round(C + Math.cos(a) * dist), iz = Math.round(C + Math.sin(a) * dist), it = TOP - 8 + Math.round(rnd() * 16);
    island(ix, iz, r, it, r * 1.3);
    for (let k = 0; k < 7; k++) { const x = ix + Math.round((rnd() - 0.5) * r), z = iz + Math.round((rnd() - 0.5) * r), y = surf(x, z); if (y > 0 && getB(x, y, z) === B.END_STONE) chorus(x, y + 1, z, 3 + ((rnd() * 6) | 0)); }
    if (i === 0 || i === 4) {                                       // end city tower: hollow purpur, spiral stairs inside, open roof
      const y0 = surf(ix, iz) + 1, h = 22;
      for (let x = ix - 3; x <= ix + 3; x++) for (let z = iz - 3; z <= iz + 3; z++) for (let y = y0; y < y0 + h; y++) {
        const wall = Math.abs(x - ix) === 3 || Math.abs(z - iz) === 3;
        rawSet(x, y, z, wall ? B.PURPUR : 0);
      }
      for (let y = y0; y < y0 + 2; y++) rawSet(ix, y, iz - 3, 0);
      const ring = [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-2, -1]];
      for (let y = y0; y < y0 + h - 1; y++) { const [a2, b2] = ring[(y - y0) % ring.length]; rawSet(ix + a2, y, iz + b2, B.PURPUR); }
      for (let x = ix - 4; x <= ix + 4; x++) for (let z = iz - 4; z <= iz + 4; z++) { rawSet(x, y0 + h, z, B.PURPUR); if (Math.abs(x - ix) === 4 || Math.abs(z - iz) === 4) rawSet(x, y0 + h + 1, z, B.PURPUR); }
      rawSet(ix, y0 + h, iz, 0); rawSet(ix + 1, y0 + h, iz, 0);
    }
  }
  surfaceSpawns(C, C, 22, 16, TOP + 8);
}
NEW_MAPS.end = genEnd;
ATMO.end = { bg: 0x110a1a, fog: 0x1c1430, near: 80, far: 260, sky: false, tint: 0.95, light: 0.88 };

// ---------- end crystals: shoot or punch one and it explodes ----------
const CRYS = [];
function buildCrystals() {
  for (const c of CRYS) scene.remove(c.g); CRYS.length = 0;
  if (CFG.map !== 'end') return;
  for (const p of END_CR) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshBasicMaterial({ color: 0xff7aff }));
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0xe0c8ff, wireframe: true, transparent: true, opacity: 0.85 }));
    const f2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.6 }));
    g.add(core, f1, f2); g.position.set(p.x, p.y, p.z); scene.add(g);
    CRYS.push({ g, core, f1, f2, x: p.x, y: p.y, z: p.z, ph: Math.random() * 6 });
  }
}
SND.boom = v => { if (typeof tone2 === 'function') { tone2('sine', 60, 22, 1.2, 0.9 * v); noise2(1.1, 0.9 * v, 'lowpass', 1800, 60, 0.7); noise2(0.25, 0.5 * v, 'highpass', 2500, 900, 0.7); } else noise(1, 0.8 * v, 300, 0.7); };
function explode(x, y, z, by, power) {
  sfx('boom', x, y, z);
  burst(x, y, z, 50, ['#ffffff', '#dddddd', '#ffcc66', '#ff8833'], 6, 0.8, 0.16, 2, 1);
  burst(x, y, z, 30, ['#555555', '#777777', '#999999'], 3, 1.6, 0.25, -1.5, 1);
  for (const m of mobs) {
    if (m.dead) continue;
    const dx = m.x - x, dy = m.y + 0.9 - y, dz = m.z - z, d = Math.hypot(dx, dy, dz); if (d > power) continue;
    const k = 1 - d / power;
    if (by && by !== m) { m.lastAttacker = by; m.lastAttackT = tick; }
    hurt(m, Math.max(1, Math.round(16 * k)), { kind: 'explosion' });
    const s = (d > 0.01 ? 1 / d : 0) * 1.6 * k * (1 - (m.kbRes || 0));
    m.vx += dx * s; m.vz += dz * s; m.vy = Math.max(m.vy, 0.55 * k + 0.2); m.onGround = false;
  }
  for (let ax = -3; ax <= 3; ax++) for (let ay = -3; ay <= 3; ay++) for (let az = -3; az <= 3; az++) {   // crater (obsidian & bedrock resist it)
    if (Math.hypot(ax, ay, az) > 2.6 + Math.random() * 0.5) continue;
    const bx = Math.floor(x + ax), by2 = Math.floor(y + ay), bz = Math.floor(z + az), id = getB(bx, by2, bz);
    if (id && id !== 255 && id !== B.BEDROCK && id !== B.OBSIDIAN && id !== B.END_PORTAL && BL[id].hard >= 0 && !BL[id].liquid) setB(bx, by2, bz, 0);
  }
  if (player && Math.hypot(player.x - x, player.y - y, player.z - z) < 24 && typeof smashCam !== 'undefined') smashCam = { t: performance.now(), k: 1.2 * clamp(1 - Math.hypot(player.x - x, player.z - z) / 24, 0.3, 1), delay: 0 };
}
function popCrystal(c, by) { scene.remove(c.g); CRYS.splice(CRYS.indexOf(c), 1); explode(c.x, c.y, c.z, by, 6); }
const _tickArrowCr = tickArrow;
tickArrow = function (a) {
  const ox = a.x, oy = a.y, oz = a.z;
  _tickArrowCr(a);
  if (!CRYS.length) return;
  const dx = a.x - ox, dy = a.y - oy, dz = a.z - oz, L = Math.hypot(dx, dy, dz); if (L < 1e-6) return;
  for (const c of CRYS.slice()) { const t = rayBox(ox, oy, oz, dx / L, dy / L, dz / L, [c.x - 0.7, c.y - 0.7, c.z - 0.7, c.x + 0.7, c.y + 0.7, c.z + 0.7]); if (t >= 0 && t <= L + 0.3) { a.dead = true; popCrystal(c, a.shooter); return; } }
};
const _playerControlCr = playerControl;
playerControl = function (p) {
  if (CRYS.length && clickQ > 0 && !p.dead) {
    const d = p.look(), ex = p.x, ey = p.y + p.eyeH, ez = p.z, hb = rayBlocks(ex, ey, ez, d[0], d[1], d[2], 4.5);
    for (const c of CRYS.slice()) { const t = rayBox(ex, ey, ez, d[0], d[1], d[2], [c.x - 0.6, c.y - 0.6, c.z - 0.6, c.x + 0.6, c.y + 0.6, c.z + 0.6]); if (t >= 0 && t <= 4.5 && (!hb || t < hb.dist)) { clickQ = 0; swing(p); popCrystal(c, p); break; } }
  }
  _playerControlCr(p);
};

// ---------- Nether: fog that follows the biome you're in, floating ash / spores · soul sand & magma ----------
const _updateCameraMaps = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraMaps(alpha, dt);
  const now = performance.now();
  for (const c of CRYS) { c.g.position.y = c.y + Math.sin(now / 500 + c.ph) * 0.25; c.f1.rotation.set(now / 700, now / 900, 0); c.f2.rotation.set(-now / 1100, 0, now / 800); c.core.rotation.y = now / 400; }
  if (state !== 'play' || CFG.map !== 'nether' || !NETHER_BIO || !player) return;
  const { BIO, S } = NETHER_BIO, x = clamp(Math.floor(camera.position.x), 0, S - 1), z = clamp(Math.floor(camera.position.z), 0, S - 1);
  const want = [0x5a1a10, 0x1d4a48, 0x6a0e0e, 0x1e1440, 0x625a6c][BIO[ow(S, x, z)]];
  const c = new THREE.Color(want); scene.fog.color.lerp(c, 0.02); scene.background.lerp(c.multiplyScalar(0.6), 0.02);
};
const _gameTickMaps = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickMaps();
  if (tick === t0 || !game) return;
  for (const m of mobs) {
    if (m.dead || !m.onGround) continue;
    const below = getB(m.x, m.y - 0.2, m.z);
    if (below === B.SOUL_SAND) { m.vx *= 0.6; m.vz *= 0.6; }                                     // soul sand slows you
    else if (below === B.MAGMA && !m.sneaking && tick % 10 === 0) hurt(m, 1, { kind: 'magma' });   // magma burns (sneak to be safe)
  }
  if (CFG.map === 'nether' && NETHER_BIO && player && tick % 2 === 0) {
    const { BIO, S } = NETHER_BIO, bio = BIO[ow(S, clamp(Math.floor(player.x), 0, S - 1), clamp(Math.floor(player.z), 0, S - 1))];
    const col = [['#ff9a4a', '#5a3a30'], ['#b8f0ff', '#9ad8e8'], ['#ff4040', '#c02020'], ['#40e0d0', '#2aa8a0'], ['#d8d8d8', '#ffffff']][bio];
    for (let i = 0; i < 2; i++) spawnP(player.x + (Math.random() - 0.5) * 22, player.y + Math.random() * 10 - 2, player.z + (Math.random() - 0.5) * 22,
      (Math.random() - 0.5) * 0.4, bio === 4 ? -0.3 : 0.2 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4, col[(Math.random() * 2) | 0], 2.5, 0.05, 0);
  }
};

// ---------- items drop on the ground when you die (MC-style: spinning, bobbing, walk over to pick up) ----------
const DROPS = [];
const ICON_POT = pxArt(px => { for (let y = 6; y < 15; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 10.5) < 4.2) px(x, y, y < 9 ? '#ff8a8a' : '#e0283c'); for (let y = 2; y < 6; y++) { px(7, y, '#cfe6ff'); px(8, y, '#cfe6ff'); } px(7, 1, '#8a5a2a'); px(8, 1, '#8a5a2a'); });
const ICON_STR = pxArt(px => { for (let y = 6; y < 15; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 10.5) < 4.2) px(x, y, y < 9 ? '#ffb070' : '#d0581a'); for (let y = 2; y < 6; y++) { px(7, y, '#cfe6ff'); px(8, y, '#cfe6ff'); } px(7, 1, '#8a5a2a'); px(8, 1, '#8a5a2a'); });
const ICON_TOTEM = pxArt(px => { for (let y = 2; y < 15; y++) for (let x = 4; x < 12; x++) { const head = y < 7 && x > 4 && x < 11, body = y >= 7 && x > 5 && x < 10, arms = y >= 7 && y < 10; if (head || body || arms) px(x, y, head && y === 4 && (x === 6 || x === 9) ? '#2a7a2a' : '#f0c838'); } });
function dropIcon(it) {
  if (it.k === '_arrows') return ICON.arrow; if (it.k === '_pots') return ICON_POT; if (it.k === '_str') return ICON_STR; if (it.k === '_totem') return ICON_TOTEM;
  return itemIcon(it);
}
function spawnDrop(it, x, y, z) {
  const ic = dropIcon(it); if (!ic) return;
  let mesh;
  if (ic.width === 16 && typeof extrudeIcon === 'function') { mesh = new THREE.Mesh(extrudeIcon(ic), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); mesh.scale.setScalar(0.3); }
  else { mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(ic), transparent: true, alphaTest: 0.3 })); mesh.scale.set(0.35, 0.35, 1); }
  const a = Math.random() * Math.PI * 2, s = 0.06 + Math.random() * 0.1;
  const d = { it, x, y, z, vx: Math.cos(a) * s, vy: 0.2 + Math.random() * 0.12, vz: Math.sin(a) * s, born: tick, mesh, ph: Math.random() * 6 };
  mesh.position.set(x, y, z); scene.add(mesh); DROPS.push(d);
}
function giveDrop(m, it) {
  if (it.k === '_arrows') { m.arrows = (m.arrows || 0) + it.n; return true; }
  if (it.k === '_pots') { m.pots = (m.pots || 0) + it.n; return true; }
  if (it.k === '_str') { m.strPots = (m.strPots || 0) + it.n; return true; }
  if (it.k === '_totem') { m.totems = (m.totems || 0) + it.n; if (typeof drawTag === 'function') drawTag(m); return true; }
  if (it.n !== undefined) { const s = m.inv.find(o => o && o.k === it.k && (it.k !== 'block' || o.id === it.id) && o.n !== undefined); if (s) { s.n += it.n; return true; } }
  const k = m.inv.findIndex(o => !o || (o.n !== undefined && o.n <= 0)); if (k < 0) return false;
  m.inv[k] = it; if (m.sel === k) setHeldVisual(m); return true;
}
function clearDrops() { for (const d of DROPS) scene.remove(d.mesh); DROPS.length = 0; }
const _dieDrops = die;
die = function (t, src) {
  _dieDrops(t, src);
  if (!t.dead || t._dropT === tick || (typeof NET !== 'undefined' && NET.role === 'client')) return;
  t._dropT = tick;
  const x = t.x, y = t.y + 0.8, z = t.z;
  for (const it of t.inv) {
    if (!it || (it.n !== undefined && it.n <= 0)) continue;
    const c = JSON.parse(JSON.stringify(it)); if (c.k === 'bucketHidden') c.k = 'bucket';
    spawnDrop(c, x, y, z);
  }
  if (t.arrows > 0) spawnDrop({ k: '_arrows', n: t.arrows }, x, y, z);
  if (t.pots > 0) spawnDrop({ k: '_pots', n: t.pots }, x, y, z);
  if (t.strPots > 0) spawnDrop({ k: '_str', n: t.strPots }, x, y, z);
  if (t.totems > 0) spawnDrop({ k: '_totem', n: t.totems }, x, y, z);
};
const _gameTickDrops = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickDrops();
  if (tick === t0 || !game) return;
  for (let i = DROPS.length - 1; i >= 0; i--) {
    const d = DROPS[i];
    d.vy -= 0.04; d.vx *= 0.98; d.vz *= 0.98; d.vy *= 0.98;
    const ny = d.y + d.vy, below = getB(d.x, ny - 0.12, d.z);
    if (d.vy < 0 && isSolid(below)) { d.y = Math.floor(ny - 0.12) + 1.12; d.vy = 0; d.vx *= 0.5; d.vz *= 0.5; } else d.y = ny;
    if (!isSolid(getB(d.x + d.vx, d.y, d.z))) d.x += d.vx; else d.vx = 0;
    if (!isSolid(getB(d.x, d.y, d.z + d.vz))) d.z += d.vz; else d.vz = 0;
    const here = getB(d.x, d.y, d.z);
    if (here === B.LAVA || d.y < VOID_Y || tick - d.born > 6000) {                 // burns in lava / lost to the void / despawns after 5 min
      if (here === B.LAVA) burst(d.x, d.y + 0.3, d.z, 6, ['#ff8a30', '#555555'], 1, 0.4, 0.06, -1);
      scene.remove(d.mesh); DROPS.splice(i, 1); continue;
    }
    if (tick - d.born < 15) continue;
    for (const m of mobs) {
      if (m.dead || m.remote || Math.hypot(m.x - d.x, m.z - d.z) > 1.3 || d.y < m.y - 0.6 || d.y > m.y + 2.2) continue;
      if (giveDrop(m, d.it)) { scene.remove(d.mesh); DROPS.splice(i, 1); if (m === player || Math.hypot(player.x - m.x, player.z - m.z) < 16) sfx('pop', m.x, m.y, m.z); break; }
    }
  }
};
if (!SND.pop) SND.pop = v => beep(900 + Math.random() * 500, 0.06, 'sine', 0.12 * v, 300);
const _updateCameraDrops = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraDrops(alpha, dt);
  const now = performance.now() / 1000;
  for (const d of DROPS) { d.mesh.position.set(d.x, d.y + 0.15 + Math.sin(now * 2.5 + d.ph) * 0.08, d.z); d.mesh.rotation.y = now * 1.6 + d.ph; }
};
const _startGameMaps2 = startGame;
startGame = function () { clearDrops(); _startGameMaps2(); buildCrystals(); };
const _toMenuMaps2 = toMenu;
toMenu = function () { clearDrops(); for (const c of CRYS) scene.remove(c.g); CRYS.length = 0; _toMenuMaps2(); };

// ---------- menu + deep-floor rules ----------
DEEP.skip.push('nether', 'end');
(function () {
  const r = MENU[0].rows.find(x => x[0] === 'map'); if (!r) return;
  const lab = { nether: 'The Nether (huge)', snow: 'Snowy Peaks (huge)', canyon: 'Desert Canyon (huge)', world: 'Big Biome World (huge)' };
  for (const o of r[3]) if (lab[o[0]]) o[1] = lab[o[0]];
  const add = [['forest', 'Forest (huge)'], ['swamp', 'Swamp (huge)'], ['end', 'The End (huge)']];
  for (const a of add) if (!r[3].some(o => o[0] === a[0])) r[3].push(a);
})();
buildMenu();

// ---------- Big Biome World: bigger, with rivers (in the generator), ravines and caves ----------
const _genWorldBase = NEW_MAPS.world;
NEW_MAPS.world = seed => { _genWorldBase(seed); srand(seed + 99); carveWorld(seed, spawns.H, WX, 15, { caves: true, ravines: 2, width: 3.5, floor: 6, fill: B.LAVA, safe: 20 }); };