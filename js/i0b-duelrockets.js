// ================= ROCKETS IN EVERY MODE (option) =================
// Match settings -> "Rockets in duels": Off / 16 / 32 / 64. In every mode every human fighter (you, and friends online)
// gets an elytra plus that many firework rockets. Right-click a rocket to launch into a glide or boost while gliding.
if (CFG.duelRockets === undefined) CFG.duelRockets = '0'; DEF.duelRockets = '0';
function giveDuelRockets(m) {
  const n = +CFG.duelRockets || 0; if (!n || !m || !m.inv) return;
  if (!m.bag) m.bag = new Array(27).fill(null);
  const put = it => { let i = m.inv.findIndex(s => !s); if (i >= 0) { m.inv[i] = it; return; } i = m.bag.findIndex(s => !s); if (i >= 0) m.bag[i] = it; };
  if (!hasElytra(m)) put({ k: 'elytra' });
  const r = m.inv.find(s => s && s.k === 'rocket') || m.bag.find(s => s && s.k === 'rocket');
  if (r) r.n = Math.max(r.n || 0, n);
  else {
    // rockets belong on the hotbar: if it's full, move the smallest block stack (or the last item) into the backpack
    let i = m.inv.findIndex(s => !s);
    if (i < 0) {
      const blocks = m.inv.map((s, k) => [s, k]).filter(([s]) => s && s.k === 'block');
      i = blocks.length > 1 ? blocks.sort((a, b) => (a[0].n || 0) - (b[0].n || 0))[0][1] : m.inv.length - 1;
      const j = m.bag.findIndex(s => !s); if (j >= 0) m.bag[j] = m.inv[i];
    }
    m.inv[i] = { k: 'rocket', n };
  }
  m.kitProto = JSON.parse(JSON.stringify({ inv: m.inv, arrows: m.arrows }));
  // you already chose a spot for rockets before: put them back there
  if (m === player && typeof loadLayout === 'function') { const L = loadLayout(); if (L && L.includes('rocket')) applyLayout(m); }
  if (typeof addWings === 'function') addWings(m);
  setHeldVisual(m);
}
const _startGameDuelRk = startGame;
startGame = function () {
  _startGameDuelRk();
  if (!game || game.mafia || !(+CFG.duelRockets)) return;
  for (const m of mobs) if (m.isPlayer) giveDuelRockets(m);
};
G.startGame = startGame;
(function () {
  const rows = MENU[1].rows, i = rows.findIndex(x => x[0] === 'elytra');
  rows.splice(i + 1, 0, ['duelRockets', 'Rockets (every mode, comes with an elytra)', 'ch', [['0', 'Off'], ['16', '16'], ['32', '32'], ['64', '64']]]);
})();
buildMenu();
