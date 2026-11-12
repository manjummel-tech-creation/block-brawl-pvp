// ================= FINAL KILL-CAM AT THE END OF TEAM MATCHES =================
// When a Team fight ends, the match-winning kill is replayed from the victim's eyes (whoever got it).
let lastDeath = null;
const _dieFinal = die;
die = function (t, src) {
  _dieFinal(t, src);
  if (t.dead) lastDeath = { victim: t, killer: (src && src.att) || t.lastAttacker || null, tick };
};
const _endGameFinal = endGame;
endGame = function (team) {
  _endGameFinal(team);
  if (CFG.mode !== 'teams' || !CFG.killcam || killcam || !lastDeath || tick - lastDeath.tick > 10) return;
  const idx = mobs.indexOf(lastDeath.victim); if (idx < 0 || kcBuf.length < 10) return;
  killcam = { idx, victim: lastDeath.victim, frames: kcBuf.slice(-KC_LEN), start: performance.now() + 900, final: true,
    killer: lastDeath.killer ? (lastDeath.killer.isPlayer ? 'You' : lastDeath.killer.name) : '' };
  document.exitPointerLock && document.exitPointerLock();
};
const _drawHUDFinal = drawHUD;
drawHUD = function (al) {
  _drawHUDFinal(al);
  if (!killcam || !killcam.final) return;
  hctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  txt('FINAL KILL', W / 2, H * 0.17, 44, '#ffdd55', 'center');
  if (killcam.killer) txt(`${killcam.victim.isPlayer ? 'You were' : killcam.victim.name + ' was'} taken out by ${killcam.killer}`, W / 2, H * 0.17 + 34, 22, '#ffffff', 'center');
};
const _startGameFinal = startGame;
startGame = function () { lastDeath = null; _startGameFinal(); };
G.startGame = startGame;
