// ================= BOTS BLOCK MORE (but not too much) =================
// Extra shield triggers: you're close, facing them and your bar is charged -> they may raise the shield;
// right after they take a hit -> they may turtle for a moment. Capped at ~30% shield uptime so they never
// just hold it up forever, and swinging still drops it.
const _attackShieldAI = attack;
attack = function (a, t, reach) { if (a._shHold) { a._shHold = 0; a._shT = 0; } return _attackShieldAI(a, t, reach); };
const _botTickShieldAI = botTick;
botTick = function (b) {
  _botTickShieldAI(b);
  if (!b.shield || b.dead || !b.ai) return;
  // rolling uptime (last ~5 s)
  b._shUp = (b._shUp || 0) * 0.99 + (b.shieldUp ? 0.01 : 0);
  const t = b.ai.t;
  const can = t && !t.dead && tick >= (b.shieldCD || 0) && !b.using && !(b.stunT > tick) && !b.inWeb && game.countdown <= 0;
  if (!can) { b._shHold = 0; return; }
  if (!b._shHold && b._shUp < 0.35) {
    const d = Math.hypot(t.x - b.x, t.z - b.z), sk = b.skill || 0.5;
    if (b.hurtTime === 9 && Math.random() < 0.35 + 0.3 * sk) b._shHold = 10 + ((Math.random() * 10) | 0);
    else if (tick % 4 === 0 && d < 4.8 && lookingAt(t, b, 25) && (COMBAT18 || cooldown(t) > 0.75) && Math.random() < 0.22 + 0.3 * sk) b._shHold = 14 + ((Math.random() * 8) | 0); // you're lining up a hit
  }
  if (b._shHold > 0) {
    b._shHold--;
    b._shT = (b._shT || 0) + 1;
    b.shieldUp = true; b.shieldT = b._shT;
    b.sprinting = false; b.in = { f: b.in.f * 0.2, s: b.in.s * 0.2, jump: b.in.jump };
    if (b._shHold === 0) { b._shT = 0; lowerShield(b); }
  } else b._shT = 0;
};
