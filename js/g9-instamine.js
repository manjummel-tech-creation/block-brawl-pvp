// ================= INSTA-MINE (like netherrack with Efficiency V) =================
// While holding an AXE, every block except bedrock and cobwebs breaks the moment you hit it (no delay between blocks).
// Anything else in hand mines at normal speed.
// Applies to everyone (bots dig/tunnel instantly too). Cobwebs still need to be cut so web traps matter.
if (CFG.instaMine === undefined) CFG.instaMine = true; DEF.instaMine = true;
const _tickMiningInsta = tickMining;
tickMining = function (e, hit) {
  if (CFG.instaMine && e.held && e.held.k === 'axe' && hit && hit.id !== B.WEB && BL[hit.id] && BL[hit.id].hard >= 0) { // only while holding an axe
    e.mineKey = hit.x + ',' + hit.y + ',' + hit.z; e.mineProg = 0.9999; e.mineDelay = 0;
    const g = e.onGround, w = e.inWater; e.onGround = true; e.inWater = false; // no air / water penalty either
    try { _tickMiningInsta(e, hit); } finally { e.onGround = g; e.inWater = w; }
    e.mineDelay = 0;
    return;
  }
  _tickMiningInsta(e, hit);
};
(function () {
  const rows = MENU[0].rows, i = rows.findIndex(x => x[0] === 'airImmune');
  rows.splice(i + 1, 0, ['instaMine', 'Insta-mine with an axe (one-hit any block, like Efficiency V netherrack)', 'tg']);
})();
buildMenu();
