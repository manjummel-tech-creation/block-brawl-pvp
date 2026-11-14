// ================= SHIELD: NO MORE GAPS =================
// Two things made hits go "through" a raised shield:
//  1) a freshly raised shield only blocked after 5 ticks (0.25 s). It now blocks after 2 ticks (0.1 s).
//  2) swinging dropped the shield, and holding the shield key just started the 5-tick raise again, so every swing left you open.
//     Now, while you hold the shield key (F by default) and are not stunned, swinging does NOT lower it (like Minecraft: you can
//     attack while blocking). Raising it by right-click with a weapon still drops when you swing, since that button is the attack.
//  3) the 15-tick stun from a cobweb dropped the shield too; now you can keep blocking while webbed (a mace-smash stun still drops it).
//  4) the blocking arc was exactly 180 degrees, so a bot strafing past your side hit you; it is now about 200 degrees (100 each side).
isBlocking = function (e) { return !!e.shield && e.shieldUp && (e.shieldT || 0) >= 2 && tick >= (e.shieldCD || 0) && !e.dead; };
const _playerControlShieldFix = playerControl;
playerControl = function (p) {
  const wasUp = p.shieldUp, wasT = p.shieldT || 0;
  _playerControlShieldFix(p);
  if (wasUp && wasT >= 2 && !p.shieldUp && p.shield && held('shield') && (!(p.stunT > tick) || p.inWeb) && tick >= (p.shieldCD || 0) && !p.dead) { p.shieldUp = true; p.shieldT = wasT + 1; }
};
const _frontalWide = frontal;
frontal = function (t, sx, sz) {
  if (_frontalWide(t, sx, sz)) return true;
  const dx = sx - t.x, dz = sz - t.z, d = Math.hypot(dx, dz) || 1;
  return (dx * -Math.sin(t.yaw * DEG) + dz * Math.cos(t.yaw * DEG)) / d > -0.17;
};
