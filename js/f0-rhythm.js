// ================= HUMAN ATTACK RHYTHM =================
// Bots no longer swing the instant their bar is full every 0.625 s. After each swing they roll a random
// reaction delay like a person: usually a few ticks late, sometimes noticeably slow, now and then a long pause.
function rollDelay(b) {
  const sk = b.skill || 0.5, r = Math.random();
  let d = r < 0.7 ? Math.random() * 3 : r < 0.95 ? 3 + Math.random() * 4 : 8 + Math.random() * 8;
  return d * (1.25 - 0.5 * sk); // better bots are a bit snappier
}
const _cooldownHuman = cooldown;
cooldown = function (e) {
  if (COMBAT18 || e.isPlayer || !e.hum) return _cooldownHuman(e);
  if (e._lastTSS === undefined || e.ticksSinceSwing < e._lastTSS) e._cdDelay = rollDelay(e);
  e._lastTSS = e.ticksSinceSwing;
  const total = 20 / weaponStats(e).speed;
  return clamp((e.ticksSinceSwing + 0.5 - (e._cdDelay || 0)) / total, 0, 1);
};
