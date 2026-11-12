// ================= TOTEMS OF UNDYING =================
// Instead of dying, a totem pops: you're left on 1 HP with 4 golden hearts (for 5 s) and Regeneration II for 45 s,
// exactly like Minecraft. Doesn't save you from the void.
for (const [k, v] of Object.entries({ botTotems: 1, totems: 1 })) { DEF[k] = v; if (CFG[k] === undefined) CFG[k] = v; }
SND.totem = v => { [523, 784, 1046, 1318].forEach((f, i) => beep(f, 0.3, 'triangle', 0.12 * v, 0, i * 0.05)); noise(0.6, 0.3 * v, 3000, 0.8); };
const totemIcon = pxArt(px => {
  const rows = ['.....XXXX.......', '....XYYYYX......', '....XYKKYX......', '....XYYYYX......', '..XXXYYYYXXX....', '.XYYYYYYYYYYX...', '.XYGYYYYYYGYX...',
    '..XXXYYYYXXX....', '....XYYYYX......', '....XYGGYX......', '....XYYYYX......', '....XYYYYX......', '.....XYYX.......', '......XX........'];
  rows.forEach((r, y) => [...r].forEach((c, x) => { const col = { X: '#5a4210', Y: '#f2c624', K: '#2a2a2a', G: '#3ac040' }[c]; if (col) px(x + 1, y + 1, col); }));
});
const _dieTotem = die;
die = function (t, src) {
  if ((t.totems || 0) > 0 && src.kind !== 'void' && game && !game.over) {
    t.totems--;
    t.dead = false; t.health = 1; t.absorption = 8; t.totemAbsUntil = tick + 100; t.regenFx = Math.max(t.regenFx || 0, 900);
    t.fallDistance = 0; if (t.using) { t.using = null; t.useT = 0; }
    burst(t.x, t.y + 1, t.z, 70, ['#f2c624', '#3ac040', '#fff6a0', '#7ae070'], 4.5, 1.4, 0.1, 3, 1.2);
    sfx('totem', t.x, t.y, t.z);
    feed(`${t.name} used a Totem of Undying!`, '#f2c624');
    if (t === player) totemPopT = performance.now();
    drawTag(t);
    return;
  }
  _dieTotem(t, src);
};
let totemPopT = -1e9;
const _gameTickTotem = gameTick;
gameTick = function () {
  _gameTickTotem();
  for (const m of mobs) if (m.totemAbsUntil && tick >= m.totemAbsUntil) { m.absorption = 0; m.totemAbsUntil = 0; }
};
const _startGameTotem = startGame;
startGame = function () {
  _startGameTotem();
  if (!game) return;
  for (const m of mobs) { m.totemsMax = m.isPlayer ? CFG.totems : CFG.botTotems; m.totems = m.totemsMax; m.totemAbsUntil = 0; drawTag(m); }
};
G.startGame = startGame;
const _respawnTotem = respawn;
respawn = function (m) { _respawnTotem(m); m.totems = m.totemsMax || 0; m.totemAbsUntil = 0; drawTag(m); };
// name tags show how many totems someone has left
const _drawTagTotem = drawTag;
drawTag = function (e) {
  _drawTagTotem(e);
  if (!e.totems || !e.parts) return;
  const g = e.parts.tagC.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(totemIcon, 196, 34, 24, 24);
  g.font = '24px VT323, monospace'; g.textAlign = 'left'; g.fillStyle = '#f2c624'; g.fillText('x' + e.totems, 220, 55);
  e.parts.tag.material.map.needsUpdate = true;
};
// HUD: your totem count next to the off-hand slot + pop flash
const _drawHUDTotem = drawHUD;
drawHUD = function (a) {
  _drawHUDTotem(a);
  if (state !== 'play' || !game || !player || player.dead) return;
  const gs = clamp(Math.floor(Math.min(W / 300, H / 230)), 2, 4), hw = 182 * gs, hh = 22 * gs, hx = Math.round((W - hw) / 2), hy = H - hh - 4;
  if (player.totems > 0) {
    const sx = hx + hw + 7 * gs; hctx.fillStyle = 'rgba(0,0,0,.5)'; hctx.fillRect(sx, hy, hh, hh);
    hctx.drawImage(totemIcon, sx + 3 * gs, hy + 3 * gs, 16 * gs, 16 * gs);
    txt(String(player.totems), sx + 19 * gs, hy + 20 * gs, 9 * gs, '#fff', 'right');
  }
  const since = performance.now() - totemPopT;
  if (since < 1500) {
    hctx.fillStyle = `rgba(242,198,36,${0.35 * (1 - since / 1500)})`; hctx.fillRect(0, 0, W, H);
    txt('TOTEM POPPED!', W / 2, H / 2 - 100, 36, '#f2c624', 'center');
  }
};
(function () {
  const row = (sec, after, r) => { const rows = MENU[sec].rows, i = rows.findIndex(x => x[0] === after); rows.splice(i + 1, 0, r); };
  row(1, 'gapples', ['totems', 'Totems of Undying (yours)', 'rng', [0, 5, 1]]);
  row(2, 'botGapples', ['botTotems', 'Bot totems of undying', 'rng', [0, 5, 1]]);
})();
buildMenu();
