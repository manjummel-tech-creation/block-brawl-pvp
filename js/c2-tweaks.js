// ================= TWEAKS: 2 healing pots, you get web-stunned too =================
if (!CFG._v4) { CFG.pots = 2; CFG.botPots = 2; CFG._v4 = 1; saveCfg(); }
DEF.pots = 2; DEF.botPots = 2;
// Walking into a cobweb stuns you for 0.75 s (can't move, swing or use items) — same as the bots.
const _playerControlWeb = playerControl;
playerControl = function (p) {
  if (p.inWeb && !p._wasInWeb) { p.stunT = Math.max(p.stunT || 0, tick + 15); webStunT = performance.now(); }
  p._wasInWeb = p.inWeb;
  _playerControlWeb(p);
};
let webStunT = -1e9;
const _drawHUDWeb = drawHUD;
drawHUD = function (a) {
  _drawHUDWeb(a);
  if (state === 'play' && player && !player.dead && performance.now() - webStunT < 750) txt('STUCK IN A WEB!', W / 2, H / 2 - 60, 24, '#eeeeee', 'center');
};
buildMenu();
