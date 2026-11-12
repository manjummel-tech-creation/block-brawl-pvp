// ================= CRIT RULES v2 =================
// Every hit while in the air from a jump is a critical hit,
// and (1.9+) every hit with the attack bar completely full is a critical hit too.
isCrit = function (a) {
  if (!CFG.crits) return false;
  const jumping = !a.onGround && !a.inWater && !a.inWeb;
  const fullBar = !COMBAT18 && cooldown(a) >= 1;
  return jumping || fullBar;
};
// HUD: show the crit-ready star whenever your next hit will crit
const _drawHUDCrit = drawHUD;
drawHUD = function (a) {
  _drawHUDCrit(a);
  if (state !== 'play' || !game || !player || player.dead || !CFG.crits) return;
  if (!player.onGround && player.vy < 0 && !player.gliding && !player.inWater) txt('✦', W / 2 + 20, H / 2 + 8, 24, '#ffdd55', 'center');
};
