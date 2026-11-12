// ================= LOW-HP WIND CHARGE ESCAPE =================
// When a bot gets low with an enemy close, it does the real strategy: turn away, sprint, throw a wind charge
// at its own feet to launch up and away, then keep running to heal (eat / pot) before coming back.
const _botTickWindEsc = botTick;
botTick = function (b) {
  _botTickWindEsc(b);
  if (b.dead || !b.hum || game.countdown > 0 || b.inWeb || b.stunT > tick || b.using === 'eat') return;
  if (tick < (b.windEscCD || 0) || !b.onGround) return;
  const hp = b.health + b.absorption;
  if (hp >= 8) return;
  if (!b.inv.some(s => s && s.k === 'wind' && s.n > 0)) return;
  let e = null, d = 1e9;
  for (const o of mobs) if (!o.dead && o.team !== b.team) { const dd = Math.hypot(o.x - b.x, o.z - b.z); if (dd < d) { d = dd; e = o; } }
  if (!e || d > 6) return;
  if (Math.random() > 0.25 + 0.5 * b.skill) return; // most bots react within a few ticks
  const awayYaw = Math.atan2(-(b.x - e.x), b.z - e.z) / DEG;
  b.yaw = awayYaw;
  if (botThrowWind(b, 88)) {
    const r = awayYaw * DEG;
    b.vx += -Math.sin(r) * 0.55; b.vz += Math.cos(r) * 0.55; // launch away, not just up
    b.sprinting = true; b.in = { f: 1, s: 0, jump: false };
    b.windEscCD = tick + 120;
    const X = b.ai.x;
    if (X) { X.plan = 'flee'; X.planT = 40; X.fleeT = 0; X.hitRun = false; X.seek = null; X.dig = null; X.hide = null; X.tower = null; }
    b.ai.t = e;
    if (b.hum) b.hum.windCD = tick + 60;
  }
};
