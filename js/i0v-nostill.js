// ================= BOTS DON'T STAND AROUND =================
// Watchdog: a bot that has a target far away, is free to move and has not moved for 3 s (stuck on a corner, a bad plan, a
// frozen decision) gets a short push: run toward the target (or sidestep around the thing in the way) and jump. Bots that are
// busy (eating, drawing a bow, stunned, webbed, digging / building / hiding, in a mace or elytra move, dodging) are left alone,
// and so are Mafia guards (they stand around on purpose).
const _botTickNoStill = botTick;
botTick = function (b) {
  _botTickNoStill(b);
  if (!b.ai || b.dead || b.isPlayer || !game || game.mafia || game.countdown > 0) return;
  const X = b.ai.x, t = b.ai.t;
  if (tick % 10 === 0) {
    const L = b._nsPos;
    if (!L || Math.hypot(b.x - L.x, b.z - L.z) > 0.35 || Math.abs(b.y - L.y) > 0.6) b._nsPos = { x: b.x, y: b.y, z: b.z, t: tick };
  }
  const busy = b.using || b.inWeb || b.stunT > tick || b.hitStun > 0 || b._ely || b._macePh || (b._dm && tick < b._dm.until) || b.shieldUp || (b.ai.mode && b.ai.mode !== 'fight') ||
    !X || (X.plan !== 'fight' && X.plan !== 'flee' && X.plan !== 'seek' && X.plan !== 'kite') || X.hide || X.tower || X.dig;
  // long-stall failsafe: busy for ever (a stuck plan, a hide / tower / dig that went nowhere) but not moving for 20 s -> drop the plan, go fight
  if (b._nsLong === undefined || Math.hypot(b.x - b._nsLong.x, b.z - b._nsLong.z) > 0.6 || Math.abs(b.y - b._nsLong.y) > 0.8 || b.inWeb || b.using === 'eat' || b.stunT > tick) b._nsLong = { x: b.x, y: b.y, z: b.z, t: tick };
  else if (tick - b._nsLong.t > 400 && t && !t.dead && !(X && X.hide && X.hide.phase === 'wait' && tick - b._nsLong.t < 800)) {
    b._nsLong.t = tick; if (X) { X.hide = null; X.tower = null; X.dig = null; X.seek = null; X.plan = 'seek'; X.seek = { t: 0 }; X.planT = 80; X.noHideUntil = tick + 600; }
    b.ai.mode = 'fight'; b.ai.state = 'approach'; b._kick = { until: tick + 30, side: Math.random() < 0.5 ? -1 : 1, jump: tick + 4 };
  }
  if (busy || !t || t.dead) { if (!busy) return; b._nsPos = null; return; }
  const L = b._nsPos; if (!L) return;
  const d = Math.hypot(t.x - b.x, t.z - b.z);
  if (tick - L.t >= 60 && d > 4) {                                   // 3 s without moving and nobody to fight: push
    b._kick = { until: tick + 18, side: Math.random() < 0.5 ? -1 : 1, jump: tick + 4 }; L.t = tick; b.ai.state = 'approach'; b.ai.stateT = 20;
  }
  if (b._kick && tick < b._kick.until) {
    const dx = t.x - b.x, dz = t.z - b.z, wantYaw = Math.atan2(-dx, dz) / DEG;
    b.yaw += clamp(wrapDeg(wantYaw - b.yaw), -40, 40);
    b.in = { f: 1, s: tick - b._kick.until < -9 ? b._kick.side * 0.6 : 0, jump: b.onGround && (b.hc || tick % 7 === 0) };
    b.sprinting = true;
  }
};
