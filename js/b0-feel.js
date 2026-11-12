// ================= FEEL PASS: heavier swords, faster charge, honest bot eating, gapple strength =================

// ---------- heavier swords: deeper sounds, view-model sway + follow-through, hit kick ----------
SND.hit = v => { noise(0.14, 0.6 * v, 520, 0.9); beep(92, 0.13, 'triangle', 0.32 * v, -45); };
SND.crit = v => { noise(0.18, 0.5 * v, 2600, 1.5); noise(0.15, 0.55 * v, 480, 0.9); beep(82, 0.15, 'triangle', 0.32 * v, -38); };
SND.weak = v => { noise(0.08, 0.28 * v, 900, 1); };
SND.swing = v => { noise(0.16, 0.13 * v, 1200, 0.6); };
let hitKick = 0, swingFollow = -1e9, swayX = 0, swayY = 0, lastYawF = null, lastPitchF = 0;
const _swingFeel = swing;
swing = function (e) { _swingFeel(e); if (e === player) swingFollow = performance.now(); };
const _updateCameraFeel = updateCamera;
updateCamera = function (alpha, dt) {
  _updateCameraFeel(alpha, dt);
  const p = player;
  if (!p || state !== 'play') { vm.position.set(0, 0, 0); vm.rotation.set(0, 0, 0); return; }
  // the weapon lags behind your mouse a little, like it has weight
  if (lastYawF === null) { lastYawF = p.yaw; lastPitchF = p.pitch; }
  const yd = wrapDeg(p.yaw - lastYawF), pd = p.pitch - lastPitchF; lastYawF = p.yaw; lastPitchF = p.pitch;
  swayX = lerp(swayX, clamp(-yd * 0.0045, -0.12, 0.12), 0.12);
  swayY = lerp(swayY, clamp(pd * 0.004, -0.1, 0.1), 0.12);
  // follow-through after a swing: the blade carries on down and comes back slowly
  const t = (performance.now() - swingFollow) / 430;
  const k = t < 1 ? Math.sin(t * Math.PI) * (1 - t * 0.6) : 0;
  vm.position.set(swayX - k * 0.03, swayY - k * 0.07, k * 0.02);
  vm.rotation.set(-k * 0.32, 0, k * 0.08);
  // small camera kick when a hit lands
  if (hitKick > 0.01) {
    camera.rotation.x += hitKick * 0.014;
    camera.rotation.z += (Math.random() - 0.5) * hitKick * 0.012;
    hitKick *= Math.pow(0.0005, dt || 0.016);
  }
};

// ---------- attack bar charges ~25% faster (sword 0.5 s instead of 0.625 s) ----------
const _weaponStatsFeel = weaponStats;
weaponStats = function (e) { const s = _weaponStatsFeel(e); return { dmg: s.dmg, speed: s.speed * 1.25, sharp: s.sharp }; };

// ---------- honest eating: bots take ~2.3 s per golden apple, crawl while eating, can't attack or block ----------
const _attackEat = attack;
attack = function (a, t, reach) {
  if (a.using === 'eat') return false;
  const r = _attackEat(a, t, reach);
  if (r && a === player) hitKick = 1;
  return r;
};
const _botTickEat = botTick;
botTick = function (b) {
  _botTickEat(b);
  if (b.using === 'eat') {
    b.useT -= 0.3;                // eating progresses at 70% speed for bots
    b.sprinting = false;
    if (b.shieldUp) { b.shieldUp = false; b.shieldT = 0; }
    b.in = { f: clamp(b.in.f, -1, 1), s: b.in.s, jump: false };
    if (tick % 4 === 0) {
      sfx('eat', b.x, b.y, b.z, 0.8);
      const y = b.yaw * DEG;
      burst(b.x - Math.sin(y) * 0.3, b.y + 1.45, b.z + Math.cos(y) * 0.3, 3, ['#f2c624', '#fff6b0', '#d89a00'], 1.4, 0.35, 0.05, 8);
    }
  }
};

// ---------- golden apples: 3 s of Strength (x2 melee & arrow damage) ----------
SND.strength = v => { beep(330, 0.12, 'square', 0.08 * v); beep(495, 0.18, 'square', 0.08 * v, 0, 0.08); };
const _eatGappleStr = eatGapple;
eatGapple = function (e) {
  const it = e.held, n0 = it && it.k === 'gapple' ? it.n : -1;
  _eatGappleStr(e);
  if (n0 > 0 && it.n < n0) { e.strengthUntil = tick + 60; sfx('strength', e.x, e.y, e.z); }
};
const _dealDamageStr = dealDamage;
dealDamage = function (t, amt, src) {
  if (src && src.att && (src.att.strengthUntil || 0) > tick && (src.kind === 'melee' || src.kind === 'arrow')) amt *= 2;
  return _dealDamageStr(t, amt, src);
};
const _gameTickStr = gameTick;
gameTick = function () {
  const t0 = tick;
  _gameTickStr();
  if (tick === t0) return;
  for (const m of mobs) if (!m.dead && (m.strengthUntil || 0) > tick && tick % 2 === 0) {
    const a = tick * 0.7; spawnP(m.x + Math.cos(a) * 0.45, m.y + 0.3 + (tick % 10) * 0.15, m.z + Math.sin(a) * 0.45, 0, 0.6, 0, '#c0302a', 0.4, 0.07, 0);
  }
};
const _drawHUDStr = drawHUD;
drawHUD = function (a) {
  _drawHUDStr(a);
  if (state !== 'play' || !game || !player || player.dead) return;
  const left = (player.strengthUntil || 0) - tick;
  if (left > 0) txt(`STRENGTH x2  ${(left / 20).toFixed(1)}s`, W / 2, H / 2 + 86, 22, '#ff5a4a', 'center');
};
