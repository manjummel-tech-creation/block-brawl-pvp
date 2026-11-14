// ================= FASTER SWORD / AXE SWING ANIMATION =================
// The swing animation lasted 6-7 ticks (0.3 s), so a second swing started while the first arm arc was still on screen.
// Now, for a sword or axe, the arc plays at double speed after its first tick (it ends in 4 ticks, 0.2 s instead of 0.35 s).
// It is only the animation: the attack bar / hit timing / damage are unchanged. For you, bots, replays and online.
// Settings -> "Faster sword swing".
if (CFG.fastSwing === undefined) CFG.fastSwing = true; DEF.fastSwing = true;
const _physicsTickFastSwing = physicsTick;
physicsTick = function (e) {
  _physicsTickFastSwing(e);
  if (CFG.fastSwing && e.swingT > 0 && e.swingT < 5 && e.held && (e.held.k === 'sword' || e.held.k === 'axe')) e.swingT--;
};
(function () {
  for (const sec of MENU) { const i = sec.rows.findIndex(x => x[0] === 'viewBob'); if (i >= 0) { sec.rows.splice(i + 1, 0, ['fastSwing', 'Faster sword swing (animation only, same attack speed)', 'tg']); break; } }
})();
buildMenu();
