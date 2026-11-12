// ================= SHIELDS & BLOCKING =================
// Off-hand shield like MC 1.9+: raise it (right click while holding a weapon, or the "Raise shield" key, default F).
// - takes 0.25 s to come up, then blocks ALL damage from melee hits and arrows coming from the front
// - blocking a melee hit pushes the attacker back
// - an AXE hit disables the shield for 5 s
// - you move slowly while it's up, and swinging lowers it
for (const [k, v] of Object.entries({ shield: true, botShields: true })) { DEF[k] = v; if (CFG[k] === undefined) CFG[k] = v; }
KB_ACTIONS.splice(KB_ACTIONS.findIndex(a => a[0] === 'use') + 1, 0, ['shield', 'Raise shield (also: right click with a weapon)', 'KeyF']);
KB_DEF.shield = 'KeyF'; if (KB.shield === undefined) KB.shield = 'KeyF';
SND.shieldBlock = v => { noise(0.12, 0.65 * v, 450, 1.2); beep(170, 0.08, 'square', 0.14 * v, -40); };
SND.shieldBreak = v => { noise(0.3, 0.6 * v, 1300, 0.8); beep(420, 0.25, 'sawtooth', 0.14 * v, -300); };
SND.shieldUp = v => { noise(0.06, 0.12 * v, 900, 1); };

// ---------- texture / icon ----------
const shieldCv = (() => {
  const c = cv(12, 16), g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 12; x++) {
    let col = (x % 4 === 0) ? '#6b4a22' : ((x + y * 3) % 7 === 0 ? '#8a6436' : '#9c7440');
    if (x === 0 || x === 11 || y === 0 || y === 15) col = '#8a8a8a';
    if ((x === 1 || x === 10 || y === 1 || y === 14) && !(x === 0 || x === 11 || y === 0 || y === 15)) col = '#5a5a5a';
    if (x >= 4 && x <= 7 && y >= 6 && y <= 9) col = (x === 4 || y === 6) ? '#d0d0d0' : '#9a9a9a';
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
  }
  return c;
})();
const shieldIcon = (() => { const c = cv(16), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(shieldCv, 2, 0, 12, 16); return c; })();
const shieldTex = canvasTex(shieldCv);

// ---------- core rules ----------
function isBlocking(e) { return !!e.shield && e.shieldUp && (e.shieldT || 0) >= 5 && tick >= (e.shieldCD || 0) && !e.dead; }
function frontal(t, sx, sz) {
  const dx = sx - t.x, dz = sz - t.z, d = Math.hypot(dx, dz) || 1;
  return (dx * -Math.sin(t.yaw * DEG) + dz * Math.cos(t.yaw * DEG)) / d > 0.05;
}
function lowerShield(e) { e.shieldUp = false; e.shieldT = 0; }
const _hurtShield = hurt;
hurt = function (t, amount, src) {
  if (src && src.att && src.att !== t && (src.kind === 'melee' || src.kind === 'arrow') && isBlocking(t) && frontal(t, src.att.x, src.att.z) && game && !game.over) {
    const a = src.att;
    sfx('shieldBlock', t.x, t.y, t.z);
    burst(t.x - Math.sin(t.yaw * DEG) * 0.5, t.y + 1.1, t.z + Math.cos(t.yaw * DEG) * 0.5, 7, ['#c8a060', '#dddddd'], 2, 0.3, 0.06, 6);
    if (src.kind === 'melee') {
      knockback(a, 0.5, t.x - a.x, t.z - a.z);
      if (a.held && a.held.k === 'axe') {
        t.shieldCD = tick + 100; lowerShield(t);
        sfx('shieldBreak', t.x, t.y, t.z);
        if (t === player) feed('Your shield was disabled by an axe!', '#ffaa55');
        if (a === player) feed(`You disabled ${t.name}'s shield!`, '#70ff70');
      }
    }
    t.blocks = (t.blocks || 0) + 1;
    return false;
  }
  return _hurtShield(t, amount, src);
};
const _attackShield = attack;
attack = function (a, t, reach) { if (a.shieldUp) lowerShield(a); return _attackShield(a, t, reach); };
function shieldSlow(e) { if (e.shieldUp) { e.sprinting = false; e.in = { f: e.in.f * 0.2, s: e.in.s * 0.2, jump: e.in.jump }; } }

// ---------- player ----------
const _playerControlShield = playerControl;
playerControl = function (p) {
  const h = p.held;
  const noUse = !h || h.k === 'axe' || h.k === 'mace' || h.k === 'pick' || (h.k === 'sword' && !COMBAT18);
  const want = p.shield && tick >= (p.shieldCD || 0) && !(p.stunT > tick) && (held('shield') || (held('use') && noUse));
  if (clickQ > 0) lowerShield(p);            // swinging drops the shield
  else if (want) { if (!p.shieldUp) { p.shieldUp = true; p.shieldT = 0; sfx('shieldUp'); } else p.shieldT++; }
  else lowerShield(p);
  _playerControlShield(p);
  shieldSlow(p);
};

// ---------- bots ----------
const _botTickShield = botTick;
botTick = function (b) {
  _botTickShield(b);
  if (!b.shield) return;
  const t = b.ai.t, X = b.ai.x;
  let want = false;
  if (t && !t.dead && tick >= (b.shieldCD || 0) && !b.using && !(b.stunT > tick) && !b.inWeb && game.countdown <= 0 && (!X || X.plan === 'fight' || X.plan === 'flee' || X.plan === 'kite')) {
    if (tick % 10 === 0 || b._shieldRoll === undefined) b._shieldRoll = Math.random();
    const d = Math.hypot(t.x - b.x, t.z - b.z), sk = b.skill;
    const theyReady = COMBAT18 || cooldown(t) > 0.8;
    const meleeThreat = d < 4.2 && theyReady;
    const bowThreat = t.using === 'bow' && t.useT > 8 && d > 4;
    const imCharging = !COMBAT18 && cooldown(b) < 0.85;
    if (bowThreat) want = b._shieldRoll < 0.25 + 0.65 * sk;
    else if (meleeThreat && (imCharging || COMBAT18)) want = b._shieldRoll < 0.1 + 0.6 * sk;
    else if (b.ai.mode === 'heal' && d < 6) want = b._shieldRoll < 0.6 * sk;
  }
  if (want) { if (!b.shieldUp) { b.shieldUp = true; b.shieldT = 0; } else b.shieldT++; }
  else lowerShield(b);
  shieldSlow(b);
};

// ---------- match setup / respawn ----------
const _startGameShield = startGame;
startGame = function () {
  _startGameShield();
  if (!game) return;
  for (const m of mobs) { m.shield = m.isPlayer ? !!CFG.shield : !!CFG.botShields; lowerShield(m); m.shieldCD = 0; }
};
G.startGame = startGame;
const _respawnShield = respawn;
respawn = function (m) { _respawnShield(m); lowerShield(m); m.shieldCD = 0; };

// ---------- visuals: 3rd person ----------
const _updateModelsShield = updateModels;
updateModels = function (alpha) {
  _updateModelsShield(alpha);
  for (const m of mobs) {
    const pr = m.parts; if (!pr) continue;
    if (m.shield && !pr.shieldPivot) {
      const mat = new THREE.MeshLambertMaterial({ map: shieldTex });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(10 * PX, 13 * PX, 1.2 * PX), mat);
      const piv = new THREE.Group(); piv.position.set(0.5 * PX, -8 * PX, 2.6 * PX); piv.add(mesh); pr.armL.add(piv);
      pr.shieldPivot = piv; m.mats.push(mat);
    }
    if (!pr.shieldPivot) continue;
    pr.shieldPivot.visible = !!m.shield && tick >= (m.shieldCD || 0);
    if (m.shieldUp) { pr.armL.rotation.x = -1.15 + (m.pitch || 0) * DEG * 0.5; pr.armL.rotation.z = -0.55; }
    pr.shieldPivot.rotation.x = -pr.armL.rotation.x;
  }
};
// ---------- visuals: first person ----------
const vmShield = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshLambertMaterial({ map: shieldTex, transparent: true, depthTest: false, side: THREE.DoubleSide }));
vmShield.renderOrder = 1001; vm.add(vmShield);
let vmShieldK = 0;
const _updateCameraShield = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraShield(alpha, dt);
  const p = player;
  vmShield.visible = !!(p && p.shield && !p.dead && tick >= (p.shieldCD || 0) && !(p.using === 'bow' || p.using === 'eat'));
  if (!vmShield.visible) return;
  vmShieldK = lerp(vmShieldK, p.shieldUp ? 1 : 0, Math.min(1, (dt || 0.016) * 18));
  vmShield.position.set(lerp(-0.6, -0.2, vmShieldK), lerp(-0.52, -0.26, vmShieldK), lerp(-0.7, -0.5, vmShieldK));
  vmShield.rotation.set(0, lerp(0.55, 0.12, vmShieldK), 0);
};
// ---------- HUD: off-hand slot ----------
const _drawHUDShield = drawHUD;
drawHUD = function (a) {
  _drawHUDShield(a);
  if (state !== 'play' || !game || !player || player.dead || !player.shield) return;
  const g = hctx, gs = clamp(Math.floor(Math.min(W / 300, H / 230)), 2, 4);
  const hw = 182 * gs, hh = 22 * gs, hx = Math.round((W - hw) / 2), hy = H - hh - 4;
  const sx = hx - 29 * gs, sy = hy;
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(sx, sy, hh, hh);
  g.strokeStyle = player.shieldUp ? '#fff' : 'rgba(160,160,160,.8)'; g.lineWidth = gs; g.strokeRect(sx + gs / 2, sy + gs / 2, hh - gs, hh - gs);
  g.drawImage(shieldIcon, sx + 3 * gs, sy + 3 * gs, 16 * gs, 16 * gs);
  const cdLeft = (player.shieldCD || 0) - tick;
  if (cdLeft > 0) {
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(sx + gs, sy + gs + (hh - 2 * gs) * (1 - cdLeft / 100), hh - 2 * gs, (hh - 2 * gs) * cdLeft / 100);
    txt((cdLeft / 20).toFixed(1) + 's', sx + hh / 2, sy - 3 * gs, 9 * gs, '#ffaa55', 'center');
  } else if (isBlocking(player)) txt('BLOCKING', sx + hh / 2, sy - 3 * gs, 8 * gs, '#9fe0ff', 'center');
};

// ---------- menu ----------
(function () {
  const row = (sec, after, r) => { const rows = MENU[sec].rows, i = rows.findIndex(x => x[0] === after); rows.splice(i + 1, 0, r); };
  row(1, 'mace', ['shield', 'Shield in off-hand (right click with a weapon, or F) · axes disable shields', 'tg']);
  row(2, 'botBuild', ['botShields', 'Bots use shields', 'tg']);
})();
buildMenu();
