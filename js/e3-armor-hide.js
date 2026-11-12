// ================= HIDDEN BOT HEALTH · ARMOUR BREAKING · NO AFK HIDING =================

// ---------- 1) you can't see bots' health ----------
drawTag = function (e) {
  if (!e.parts) return;
  const c = e.parts.tagC, g = c.getContext('2d');
  g.clearRect(0, 0, 256, 64);
  g.font = '30px VT323, monospace'; g.textAlign = 'center';
  const w = g.measureText(e.name).width + 14;
  g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(128 - w / 2, 18, w, 30);
  g.fillStyle = e.teamCol || '#fff'; g.fillText(e.name, 128, 43);
  e.parts.tag.material.map.needsUpdate = true;
  e.tagHp = e.health + e.absorption;
};
for (const m of mobs) drawTag(m);
const _drawHUDHide = drawHUD;
drawHUD = function (a) {
  _drawHUDHide(a);
  if (state !== 'play' || !game) return;
  // target box: name only
  const ti = $('#tinfo');
  if (targetInfo && performance.now() - targetInfoT < 3000 && !targetInfo.dead) ti.innerHTML = `<span style="color:${targetInfo.teamCol}">${targetInfo.name}</span>`;
  else ti.innerHTML = '';
  // debug screen: no enemy health
  if (showDebug) $('#dbg').textContent = $('#dbg').textContent.replace(/target .*$/m, 'target: (health hidden)');
  // scoreboard: no health / healing for bots
  if (!$('#score').classList.contains('hidden')) {
    $('#score').innerHTML = `<table><tr><th>Player</th><th>Kills</th><th>Deaths</th><th>Status</th></tr>${mobs.slice().sort((x, y) => y.kills - x.kills).map(m =>
      `<tr style="color:${m.isPlayer ? '#ffff70' : m.teamCol}"><td>${m.name}${CFG.mode === 'teams' ? ` [${m.team}]` : ''}</td><td>${m.kills}</td><td>${m.deaths}</td><td>${m.dead ? '☠' : m.isPlayer ? ((m.health + m.absorption) / 2).toFixed(1) + '❤' : 'alive'}</td></tr>`).join('')}</table>`;
  }
};

// ---------- 2) armour breaks: every 35 hits you take, one piece breaks ----------
const PIECES = {           // vanilla armour points per piece: helmet, chestplate, leggings, boots
  leather: [1, 3, 2, 1], gold: [2, 5, 3, 1], chain: [2, 5, 4, 1], iron: [2, 6, 5, 2], diamond: [3, 8, 6, 3], netherite: [3, 8, 6, 3]
};
const PIECE_NAMES = ['helmet', 'chestplate', 'leggings', 'boots'];
SND.armorBreak = v => { noise(0.25, 0.5 * v, 2500, 0.8); beep(600, 0.18, 'square', 0.1 * v, -400); beep(300, 0.2, 'triangle', 0.12 * v, -150, 0.05); };
function setupArmor(m) {
  const base = m.armorBase || m.armor; m.armorBase = base;
  if (!PIECES[base]) return;
  m.pieces = [true, true, true, true]; m.armorHits = 0;
  const key = '_m' + m.id; ARMOR[key] = Object.assign({}, ARMOR[base]); m.armor = key;
  // find the armour meshes on the model so broken pieces can disappear
  m.pieceMeshes = [[], [], [], []];
  if (m.parts && m.armorMat) m.parts.root.traverse(o => {
    if (!o.isMesh || o.material !== m.armorMat) return;
    const par = o.parent;
    if (par === m.parts.head) m.pieceMeshes[0].push(o);
    else if (par === m.parts.body || par === m.parts.armR || par === m.parts.armL) m.pieceMeshes[1].push(o);
    else if (par === m.parts.legR || par === m.parts.legL) m.pieceMeshes[o.position.y < -7 * PX ? 3 : 2].push(o);
  });
  m.pieceMeshes.forEach(list => list.forEach(o => { o.visible = true; }));
}
function recomputeArmor(m) {
  const base = ARMOR[m.armorBase], pts = PIECES[m.armorBase], A = ARMOR[m.armor];
  const n = m.pieces.filter(Boolean).length;
  A.pts = pts.reduce((s, p, i) => s + (m.pieces[i] ? p : 0), 0);
  A.tough = base.tough * n / 4; A.kb = base.kb * n / 4;
}
function breakPiece(m) {
  const left = m.pieces.map((v, i) => v ? i : -1).filter(i => i >= 0);
  if (!left.length) return;
  const i = left[(Math.random() * left.length) | 0];
  m.pieces[i] = false; recomputeArmor(m);
  m.pieceMeshes[i].forEach(o => { o.visible = false; });
  sfx('armorBreak', m.x, m.y, m.z);
  burst(m.x, m.y + [1.7, 1.2, 0.7, 0.2][i], m.z, 18, [ARMOR[m.armorBase].col ? '#' + ARMOR[m.armorBase].col.toString(16).padStart(6, '0') : '#ccc', '#ffffff'], 2.5, 0.6, 0.08, 9);
  const what = `${ARMOR[m.armorBase].n} ${PIECE_NAMES[i]}`;
  if (m === player) { feed(`Your ${what} broke!`, '#ff9a5a'); armorBreakT = performance.now(); armorBreakTxt = `${what.toUpperCase()} BROKE!`; }
  else feed(`${m.name}'s ${what} broke!`, '#ffd27a');
}
let armorBreakT = -1e9, armorBreakTxt = '';
const _dealDamageArmor = dealDamage;
dealDamage = function (t, amt, src) {
  const r = _dealDamageArmor(t, amt, src);
  if (t.pieces && src && (src.kind === 'melee' || src.kind === 'arrow') && src.att && !t.dead) {
    t.armorHits = (t.armorHits || 0) + 1;
    if (t.armorHits % (t.armorEvery || 35) === 0) breakPiece(t);
  }
  return r;
};
const _startGameArmor = startGame;
startGame = function () { _startGameArmor(); if (game) for (const m of mobs) { m.armorBase = undefined; setupArmor(m); } };
G.startGame = startGame;
const _respawnArmor = respawn;
respawn = function (m) { _respawnArmor(m); if (m.armorBase && PIECES[m.armorBase]) { m.pieces = [true, true, true, true]; m.armorHits = 0; recomputeArmor(m); m.pieceMeshes.forEach(l => l.forEach(o => { o.visible = true; })); } };
const _drawHUDArmor = drawHUD;
drawHUD = function (a) {
  _drawHUDArmor(a);
  if (state !== 'play' || !player || player.dead) return;
  if (performance.now() - armorBreakT < 1500) txt(armorBreakTxt, W / 2, H / 2 - 150, 30, '#ff9a5a', 'center');
  if (player.pieces) { // durability: hits until the next piece breaks
    const left = (player.armorEvery || 35) - (player.armorHits % (player.armorEvery || 35)), n = player.pieces.filter(Boolean).length;
    if (n > 0) txt(`Armour: ${n}/4 pieces · next break in ${left} hits`, W - 12, H - 12, 16, left <= 5 ? '#ff9a5a' : '#cfcfcf', 'right');
  }
};

// ---------- 3) bots hiding underground don't go AFK ----------
// If you find them (close, or they can see you), they stop hiding and fight back — digging up to you if sealed in.
const _botTickNoAfk = botTick;
botTick = function (b) {
  const X = b.ai && b.ai.x;
  if (X && X.hide && !b.dead && game.countdown <= 0) {
    let e = null, d = 1e9;
    for (const o of mobs) if (!o.dead && o.team !== b.team) { const dd = Math.hypot(o.x - b.x, o.y - b.y, o.z - b.z); if (dd < d) { d = dd; e = o; } }
    if (e && (d < 5 || (d < 14 && (b.ai.n % 5 === 0) && hasLOS(b, e)))) {
      X.hide = null; X.tower = null; X.dig = null;
      if (b.using === 'eat' && b.useT < 24) { b.using = null; b.useT = 0; }
      b.ai.t = e; b.ai.mode = 'fight';
      if (b.ai.weaponSlot >= 0) b.select(b.ai.weaponSlot);
      if (!hasLOS(b, e)) { X.seek = { t: 0 }; X.plan = 'seek'; } else { X.plan = 'fight'; X.seek = null; }
      X.planT = 60; X.lowRolled = true; X.noHideUntil = tick + 400; // don't dive straight back into a hole
    }
  }
  _botTickNoAfk(b);
};
const _choosePlanNoAfk = choosePlan;
choosePlan = function (b, t, X) {
  const p = _choosePlanNoAfk(b, t, X);
  if ((p === 'hide' || p === 'tower') && tick < (X.noHideUntil || 0)) { X.hide = null; X.tower = null; return 'fight'; }
  return p;
};
