// ================= AXE IN YOUR KIT (breaks shields) =================
if (CFG.kitAxe === undefined) CFG.kitAxe = true; DEF.kitAxe = true;
const _startGameAxe = startGame;
startGame = function () {
  _startGameAxe();
  if (!game || !player || !CFG.kitAxe || player.inv.some(i => i && i.k === 'axe')) return;
  const axe = { k: 'axe', tier: CFG.tier, sharp: CFG.sharp };
  let k = player.inv.findIndex(s => !s);
  if (k < 0) k = player.inv.findIndex(s => s && s.k === 'pick'); // hotbar full: the axe takes the pickaxe's slot
  if (k < 0) return;
  player.inv[k] = axe;
  if (Array.isArray(CFG.layout)) { // keep the saved hotbar layout
    const pool = player.inv.slice(), out = new Array(9).fill(null);
    CFG.layout.forEach((s, i) => { if (!s) return; const j = pool.findIndex(it => it && sig(it) === s); if (j >= 0) { out[i] = pool[j]; pool[j] = null; } });
    for (const it of pool) if (it) out[out.indexOf(null)] = it;
    player.inv = out;
  }
  player.kitProto = JSON.parse(JSON.stringify({ inv: player.inv, arrows: player.arrows }));
  if (game.prep) prepRender();
};
G.startGame = startGame;
(function () {
  const rows = MENU[1].rows, i = rows.findIndex(x => x[0] === 'shield');
  rows.splice(i + 1, 0, ['kitAxe', 'Axe in kit (hit a shield to disable it for 5 s) · replaces the pickaxe if the hotbar is full', 'tg']);
})();
buildMenu();
