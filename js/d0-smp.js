// ================= SMP-STYLE PVP: jump resets, less air comboing =================
// 1) JUMP RESET: if you jump within 2 ticks (0.1 s) of getting hit while you were on the ground,
//    you cancel 40% of the horizontal knockback (real MC technique). Good bots do it too.
// 2) Less air-comboing (like SMP 1.9+): no combo lock (anyone can hit back while airborne), no hit-stun input
//    freeze, and getting hit while already in the air gives much less extra lift, so you can't be juggled.
let jumpResetT = -1e9;
const _knockbackSMP = knockback;
knockback = function (t, s, xr, zr) {
  const wasGround = t.onGround, prevVy = t.vy;
  _knockbackSMP(t, s, xr, zr);
  t.comboAir = false;                       // SMP: no combo lock
  if (!wasGround && !t.inWater) t.vy = Math.min(t.vy, Math.max(prevVy, 0) * 0.5 + 0.18); // no air juggling
  t.kbTick = tick; t.kbOnGround = wasGround; t.jumpResetDone = false;
};
const _attackSMP = attack;
attack = function (a, t, reach) {
  const r = _attackSMP(a, t, reach);
  if (r && t.hitStun === 3) t.hitStun = 0;  // keep control after a normal hit (mace stun etc. untouched)
  return r;
};
function tryJumpReset(e) {
  if (!e.in.jump || e.jumpResetDone || !e.kbOnGround || tick - (e.kbTick || -99) > 2 || e.inWater || e.inWeb) return false;
  e.jumpResetDone = true;
  e.vx *= 0.6; e.vz *= 0.6;
  e.vy = Math.max(e.vy, 0.42);
  if (e === player) jumpResetT = performance.now();
  return true;
}
const _playerControlSMP = playerControl;
playerControl = function (p) { _playerControlSMP(p); tryJumpReset(p); };
const _botTickSMP = botTick;
botTick = function (b) {
  _botTickSMP(b);
  if (!(b.stunT > tick) && !b.jumpResetDone && b.kbOnGround && tick - (b.kbTick || -99) <= 2) {
    // good bots jump-reset more often (up to ~60% at max skill)
    if (b._jrTick !== b.kbTick) { b._jrTick = b.kbTick; b._jrRoll = Math.random() < (b.skill || 0.5) * 0.6; }
    if (b._jrRoll) { b.in = { f: b.in.f, s: b.in.s, jump: true }; tryJumpReset(b); }
  }
};
const _drawHUDSMP = drawHUD;
drawHUD = function (a) {
  _drawHUDSMP(a);
  if (state === 'play' && performance.now() - jumpResetT < 600) txt('JUMP RESET!', W / 2, H / 2 + 140, 20, '#8fe0ff', 'center');
};
