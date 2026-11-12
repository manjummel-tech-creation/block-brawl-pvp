// ================= v3: mace, wind charges, better gapples, low-HP escapes, team sizes =================
for (const [k, v] of Object.entries({ mace: true, windCharges: 8, allies: 0 })) { DEF[k] = v; if (CFG[k] === undefined) CFG[k] = v; }

SND.smash = v => { noise(0.45, 0.8 * v, 180, 0.7); beep(65, 0.4, 'sine', 0.45 * v, -25); noise(0.2, 0.4 * v, 2500, 1, 0.02); };
SND.wind = v => { noise(0.4, 0.55 * v, 900, 0.4, 0, 'highpass'); beep(300, 0.3, 'sine', 0.08 * v, 500); };
SND.whoosh = v => { noise(0.25, 0.25 * v, 1800, 0.6); };

// ---------- icons ----------
ICON.mace = pxArt(px => {
  for (let i = 0; i < 8; i++) { px(2 + i, 13 - i, '#8a6a40'); px(3 + i, 13 - i, '#4a3418'); }
  for (let y = 1; y < 8; y++) for (let x = 8; x < 15; x++) { const d = Math.hypot(x - 11, y - 4); if (d < 2.9) px(x, y, d > 2 ? '#4a4a52' : (x < 11 && y < 4) ? '#c8c8d0' : '#8a8a94'); }
  px(11, 0, '#d8d8e0'); px(15, 4, '#d8d8e0'); px(7, 4, '#d8d8e0'); px(11, 8, '#d8d8e0'); px(14, 1, '#d8d8e0'); px(8, 1, '#d8d8e0');
  px(1, 14, '#4a3418'); px(0, 15, '#2a1a08');
});
ICON.wind = pxArt(px => {
  for (let a = 0; a < 6.28 * 2.2; a += 0.12) { const r = 1 + a * 0.45; const x = Math.round(8 + Math.cos(a) * r), y = Math.round(8 + Math.sin(a) * r * 0.8); if (x >= 0 && x < 16 && y >= 0 && y < 16) px(x, y, a < 5 ? '#e8f4ff' : '#9ec8f0'); }
  px(8, 8, '#ffffff'); px(7, 8, '#cfe6ff');
});
const _itemIconV3 = itemIcon;
itemIcon = function (it) { if (it && it.k === 'mace') return ICON.mace; if (it && it.k === 'wind') return ICON.wind; return _itemIconV3(it); };
const _itemNameV3 = itemName;
itemName = function (it) {
  if (it && it.k === 'mace') return 'Mace (fall onto someone to SMASH)';
  if (it && it.k === 'wind') return 'Wind Charge (throw at your feet to launch)';
  return _itemNameV3(it);
};

// ---------- mace: 6 dmg, slow (0.6), smash bonus from fall height ----------
const _weaponStatsV3 = weaponStats;
weaponStats = function (e) { const h = e.held; if (h && h.k === 'mace') return { dmg: 6, speed: 0.6, sharp: 0 }; return _weaponStatsV3(e); };
function smashTotal(fall) { return fall * 1.2; } // 0.6 hearts per block fallen
function maceBonus(fall) { // MC 1.21: +4/block for blocks 1-3, +2/block for 4-8, +1/block after
  if (fall <= 1.5) return 0;
  return Math.min(fall, 3) * 4 + clamp(fall - 3, 0, 5) * 2 + Math.max(0, fall - 8);
}
let smashPop = { t: -1e9, v: 0 };
const _attackV3 = attack;
attack = function (a, t, reach) {
  const mace = a.held && a.held.k === 'mace', fall = a.fallDistance, airborne = !a.onGround;
  const hp0 = t.health + t.absorption;
  const r = _attackV3(a, t, reach);
  if (r && mace && airborne && fall > 1.5 && !t.dead) {
    // smash total: 0.6 hearts per block fallen; armour can't reduce it
    const want = smashTotal(fall), dealt = hp0 - (t.health + t.absorption), extra = Math.max(0, want - dealt);
    const protMul = ARMOR[t.armor].pts > 0 ? 1 - Math.min(20, t.prot * 4) * 0.04 : 1;
    const blockMul = t.using === 'block' ? 0.5 : 1;
    if (extra > 0) dealDamage(t, extra / protMul / blockMul, { att: a, kind: 'melee', bypass: true });
    const bonus = want;
    // the smash cancels your fall damage
    a.fallDistance = 0;
    // no bounce: you stop dead on top of them
    a.vy = 0.05;
    // shockwave knocks everyone else nearby away
    for (const m of mobs) {
      if (m === a || m === t || m.dead || m.team === a.team) continue;
      const dx = m.x - t.x, dz = m.z - t.z, d = Math.hypot(dx, dz);
      if (d > 3.5 || Math.abs(m.y - t.y) > 2) continue;
      const s = (1 - d / 3.5) * 0.9 * (1 - m.kbRes);
      m.vx += (d > 0.01 ? dx / d : 0) * s; m.vz += (d > 0.01 ? dz / d : 0) * s; m.vy += 0.35 * s; m.onGround = false;
    }
    const bid = getB(t.x, t.y - 0.5, t.z);
    burst(t.x, t.y + 0.2, t.z, 40, bid && bid !== 255 ? [BL[bid].color, '#ffffff'] : ['#bbbbbb', '#ffffff'], 4, 0.7, 0.1, 10, 1.5);
    sfx('smash', t.x, t.y, t.z);
    if (a === player) { smashPop = { t: performance.now(), v: bonus }; camShake = 1; }
  }
  return r;
};

// ---------- wind charges ----------
const windProj = [];
const windGeo = new THREE.IcosahedronGeometry(0.18, 0), windMat = new THREE.MeshBasicMaterial({ color: 0xdff0ff, transparent: true, opacity: 0.85 });
function throwWind(e) {
  const it = e.held; if (!it || it.k !== 'wind' || it.n <= 0 || (e.windCD || 0) > 0) return false;
  it.n--; e.windCD = 10; swing(e);
  const d = e.look();
  const w = { x: e.x + d[0] * 0.4, y: e.y + e.eyeH - 0.1 + d[1] * 0.4, z: e.z + d[2] * 0.4, vx: d[0] * 1.5, vy: d[1] * 1.5, vz: d[2] * 1.5, owner: e, age: 0 };
  w.px = w.x; w.py = w.y; w.pz = w.z;
  w.mesh = new THREE.Mesh(windGeo, windMat); w.mesh.position.set(w.x, w.y, w.z); scene.add(w.mesh);
  windProj.push(w);
  sfx('whoosh', e.x, e.y, e.z);
  return true;
}
function windBurst(x, y, z, owner) {
  const R2 = 2.5;
  for (const m of mobs) {
    if (m.dead) continue;
    const cx = m.x, cy = m.y + 0.9, cz = m.z;
    let dx = cx - x, dy = cy - y, dz = cz - z; const d = Math.hypot(dx, dy, dz);
    if (d > R2) continue;
    if (d < 0.01) { dx = 0; dy = 1; dz = 0; } else { dx /= d; dy /= d; dz /= d; }
    const s = (1 - d / R2) * (1 - m.kbRes * 0.5);
    m.vx += dx * s * 1.2; m.vz += dz * s * 1.2;
    m.vy = Math.min(1.5, Math.max(m.vy, 0) + dy * s * 1.25 + s * 0.55);
    m.onGround = false; m.fallDistance = 0;
    if (m !== owner && owner && m.team !== owner.team) { m.lastAttacker = owner; m.lastAttackT = tick; }
  }
  burst(x, y, z, 30, ['#ffffff', '#dff0ff', '#9ec8f0'], 5, 0.45, 0.09, 0, 0);
  sfx('wind', x, y, z);
}
function tickWind() {
  for (const w of windProj) {
    w.px = w.x; w.py = w.y; w.pz = w.z; w.age++;
    const sp = Math.hypot(w.vx, w.vy, w.vz), dx = w.vx / sp, dy = w.vy / sp, dz = w.vz / sp;
    const bh = rayBlocks(w.x, w.y, w.z, dx, dy, dz, sp);
    let tHit = bh && isSolid(bh.id) ? bh.dist : sp, ent = null;
    for (const m of mobs) {
      if (m.dead || (m === w.owner && w.age < 4)) continue;
      const b = m.box(); b[0] -= 0.3; b[2] -= 0.3; b[3] += 0.3; b[5] += 0.3; b[4] += 0.3;
      const t = rayBox(w.x, w.y, w.z, dx, dy, dz, b);
      if (t >= 0 && t <= tHit) { tHit = t; ent = m; }
    }
    if (ent || (bh && isSolid(bh.id) && bh.dist <= sp)) {
      const hx = w.x + dx * (tHit - 0.05), hy = w.y + dy * (tHit - 0.05), hz = w.z + dz * (tHit - 0.05);
      if (ent && ent.team !== w.owner.team) hurt(ent, 1, { att: w.owner, kind: 'arrow' });
      windBurst(hx, hy, hz, w.owner);
      w.dead = true; continue;
    }
    w.x += w.vx; w.y += w.vy; w.z += w.vz;
    if (w.age % 2 === 0) spawnP(w.x, w.y, w.z, 0, 0, 0, '#e8f4ff', 0.3, 0.06, 0);
    if (w.age > 100 || w.y < VOID_Y) w.dead = true;
  }
  for (let i = windProj.length - 1; i >= 0; i--) if (windProj[i].dead) { scene.remove(windProj[i].mesh); windProj.splice(i, 1); }
}
const _gameTickV3 = gameTick;
gameTick = function () {
  const t0 = tick;
  _gameTickV3();
  if (tick === t0) return; // tick didn't run (paused / waiting for mouse)
  for (const m of mobs) if (m.windCD > 0) m.windCD--;
  tickWind();
};
const _updateModelsV3 = updateModels;
updateModels = function (alpha) {
  _updateModelsV3(alpha);
  for (const w of windProj) { w.mesh.position.set(lerp(w.px, w.x, alpha), lerp(w.py, w.y, alpha), lerp(w.pz, w.z, alpha)); w.mesh.rotation.y += 0.3; w.mesh.rotation.x += 0.2; }
};
const _playerControlV3 = playerControl;
playerControl = function (p) {
  if (p.held && p.held.k === 'wind' && (placePress || usePress || held('use') || held('place'))) { throwWind(p); placePress = usePress = false; }
  _playerControlV3(p);
};

// ---------- golden apples: +2 HP instantly, plus regen and 2 absorption hearts ----------
const _eatGappleV3 = eatGapple;
eatGapple = function (e) {
  const it = e.held, before = it && it.k === 'gapple' ? it.n : -1;
  _eatGappleV3(e);
  if (before > 0 && it.n < before) { e.health = Math.min(20, e.health + 2); drawTag(e); burst(e.x, e.y + 1.2, e.z, 10, ['#ff6070', '#ffd040'], 1.5, 0.6, 0.06, 1, 0.5); }
};

// ---------- bots: when low, sometimes dig into the ground or tower up to heal ----------
const _choosePlanV3 = choosePlan;
choosePlan = function (b, t, X) {
  if (X.tower) return 'tower';
  const hp = b.health + b.absorption;
  if (hp >= 13) X.lowRolled = false;
  if (CFG.botBuild && t && hp < 8 && !X.lowRolled && !X.dig && !X.hide) {
    X.lowRolled = true;
    const r = Math.random(), d = Math.hypot(t.x - b.x, t.z - b.z);
    const hasPick = slotWhere(b, it => it.k === 'pick') >= 0;
    if (r < 0.35 && hasPick && canDigDown(b) && d > 2) return 'hide';
    if (r < 0.7 && blockSlot(b) >= 0) return 'tower';
  }
  return _choosePlanV3(b, t, X);
};
function doTower(b, t, X) {
  if (!X.tower) X.tower = { start: ffloor(b.y), phase: 'up', t: 0, h: 4 + ((Math.random() * 3) | 0) };
  const T3 = X.tower; T3.t++;
  const fx = Math.floor(b.x), fy = ffloor(b.y), fz = Math.floor(b.z);
  const end = () => { X.tower = null; X.plan = 'fight'; X.planT = 30; if (b.using) { b.using = null; b.useT = 0; } return false; };
  if (T3.phase === 'up') {
    if (fy >= T3.start + T3.h || blockSlot(b) < 0 || T3.t > 140) T3.phase = 'wait';
    else {
      if (b.using) { b.using = null; b.useT = 0; }
      if (isSolid(getB(fx, fy + 2, fz)) && b.onGround) { if (botDig(b, fx, fy + 2, fz) === 'stuck') T3.phase = 'wait'; setIn(b, 0, 0); return true; }
      b.pitch = lerp(b.pitch, 85, 0.4);
      if (!b.onGround && getB(fx, Math.floor(b.y) - 1, fz) === 0 && b.y - Math.floor(b.y) < 0.9) botPlace(b, fx, Math.floor(b.y) - 1, fz);
      b.vx += (fx + 0.5 - b.x) * 0.05; b.vz += (fz + 0.5 - b.z) * 0.05;
      setIn(b, 0, 0, true);
      return true;
    }
  }
  if (T3.phase === 'wait') {
    const hp = b.health + b.absorption;
    if (hp >= 15 || T3.t > 600) { T3.phase = 'down'; if (b.using) { b.using = null; b.useT = 0; } }
    else {
      if (b.slotOf('gapple') >= 0 && b.absorption <= 0) eatIfPossible(b);
      else if (t && b.slotOf('bow') >= 0 && b.arrows > 0 && Math.hypot(t.x - b.x, t.z - b.z) > 3) {
        // pick people off from the top of the tower
        const bi = b.slotOf('bow'); if (b.sel !== bi) b.select(bi);
        const dist = Math.hypot(t.x - b.x, t.z - b.z), flight = dist / 2.9, drop = 0.05 * flight * flight * 0.55;
        const err = aimAt(b, t.x + t.vx * flight * b.skill, t.y + 1.2 + drop, t.z + t.vz * flight * b.skill, true);
        if (b.using !== 'bow') { b.using = 'bow'; b.useT = 0; } else b.useT++;
        if (b.useT === 7) setHeldVisual(b);
        if (b.useT >= 18 && err < 5) releaseBow(b);
      } else if (t) lookAt(b, t.x, t.y + 1.4, t.z, 15);
      setIn(b, 0, 0, false, false, true);
      return true;
    }
  }
  if (T3.phase === 'down') {
    if (fy <= T3.start || T3.t > 900) return end();
    const r = botDig(b, fx, fy - 1, fz);
    if (r === 'stuck') return end();
    b.vx += (fx + 0.5 - b.x) * 0.08; b.vz += (fz + 0.5 - b.z) * 0.08;
    setIn(b, 0, 0);
    return true;
  }
  return end();
}
const _botTickV3 = botTick;
botTick = function (b) {
  const X = b.ai && b.ai.x;
  if (X && X.plan === 'tower' && game.countdown <= 0 && !b.inWeb) {
    const t = b.ai.t && !b.ai.t.dead ? b.ai.t : null;
    if (doTower(b, t, X)) { b.ai.n++; return; }
  }
  _botTickV3(b);
};

// ---------- team fight: choose how many of the bots are your teammates (the rest are enemies) ----------
const _startGameV3 = startGame;
startGame = function () {
  _startGameV3();
  if (!game || !player) return;
  // extra gear for you
  const addTo = it => { const k = player.inv.findIndex(s => !s); if (k >= 0) player.inv[k] = it; };
  if (CFG.mace && !player.inv.some(i => i && i.k === 'mace')) addTo({ k: 'mace' });
  if (CFG.windCharges > 0 && !player.inv.some(i => i && i.k === 'wind')) addTo({ k: 'wind', n: CFG.windCharges });
  if (Array.isArray(CFG.layout)) { // re-apply saved hotbar layout now that the new items exist
    const pool = player.inv.slice(), out = new Array(9).fill(null);
    CFG.layout.forEach((s, i) => { if (!s) return; const k = pool.findIndex(it => it && sig(it) === s); if (k >= 0) { out[i] = pool[k]; pool[k] = null; } });
    for (const it of pool) if (it) out[out.indexOf(null)] = it;
    player.inv = out;
  }
  if (game.prep) prepRender();
  player.kitProto = JSON.parse(JSON.stringify({ inv: player.inv, arrows: player.arrows }));
  if (CFG.mode !== 'teams') return;
  const bots = mobs.filter(m => !m.isPlayer);
  const allies = clamp(CFG.allies | 0, 0, bots.length - 1);
  bots.forEach((m, i) => {
    m.team = i < allies ? 'red' : 'blue';
    m.teamCol = m.team === 'red' ? '#ff6060' : '#7090ff';
    if (m.mats[1]) m.mats[1].color.setHex(m.team === 'red' ? 0xb02a2a : 0x2a4ab0);
    drawTag(m);
  });
  // re-place spawns so each team starts together
  const S = spawns.length; let ri = 0, bi = 0;
  for (const m of mobs) {
    const red = m.team === 'red', k = red ? ri++ : bi++;
    if (CFG.map === 'bridges') spawnPoint(m, spawns[((red ? 0 : 1) * 4 + k % 4)]);
    else spawnPoint(m, spawns[((red ? 0 : Math.floor(S / 2)) + (k % 5) - 2 + S) % S]);
  }
};
G.startGame = startGame;

// ---------- menu ----------
(function () {
  const row = (sec, after, r) => { const rows = MENU[sec].rows, i = rows.findIndex(x => x[0] === after); rows.splice(i + 1, 0, r); };
  row(0, 'bots', ['allies', 'Team fight: how many bots are on YOUR team (rest are enemies)', 'rng', [0, 14, 1]]);
  row(1, 'bucket', ['mace', 'Mace (smash: fall onto someone for huge damage)', 'tg']);
  row(1, 'mace', ['windCharges', 'Wind charges (throw at your feet to launch up)', 'rng', [0, 32, 1]]);
  const b = MENU[0].rows.find(x => x[0] === 'bots'); b[1] = 'Number of bots';
})();
const _buildMenuV3 = buildMenu;
buildMenu = function () {
  _buildMenuV3();
  const rows = [...document.querySelectorAll('#cols .row')];
  const ar = rows.find(r => r.querySelector('label') && r.querySelector('label').textContent.startsWith('Team fight:'));
  const br = rows.find(r => r.querySelector('label') && r.querySelector('label').textContent.startsWith('Number of bots'));
  const enemies = () => CFG.mode === 'teams' ? CFG.bots - clamp(CFG.allies | 0, 0, CFG.bots - 1) : CFG.bots;
  const info = document.createElement('div'); info.style.cssText = 'font-size:21px;color:#ffff70;width:100%';
  const upd = () => { info.textContent = CFG.mode === 'teams' ? `You + ${CFG.bots - enemies()} teammate(s)  vs  ${enemies()} enemies` : `${enemies()} enem${enemies() === 1 ? 'y' : 'ies'}`; };
  upd();
  if (br) br.appendChild(info);
  if (ar) {
    if (CFG.mode !== 'teams') ar.style.display = 'none';
    const r = ar.querySelector('input'); if (r) { r.max = Math.max(0, CFG.bots - 1); r.addEventListener('input', upd); }
  }
  if (br) { const r = br.querySelector('input'); if (r) r.addEventListener('input', upd); }
};
buildMenu();

// ---------- HUD popups ----------
const _drawHUDV3 = drawHUD;
drawHUD = function (a) {
  _drawHUDV3(a);
  if (state !== 'play' || !game || !player) return;
  const now = performance.now();
  if (now - smashPop.t < 900) txt(`SMASH! ${(smashPop.v / 2).toFixed(1)} hearts`, W / 2, H / 2 - 70, 34, '#ff9a3a', 'center');
  if (player.held && player.held.k === 'mace' && !player.onGround && maceHeight(player) > 1.5)
    txt(`Smash ready: ${(smashTotal(maceHeight(player)) / 2).toFixed(1)} hearts`, W / 2, H / 2 + 44, 20, '#ffbb66', 'center');
};
