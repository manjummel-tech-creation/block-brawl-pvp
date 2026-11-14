// ================= DEEPER FLOOR (duel maps + Mafia) =================
// The ground used to be only 6-10 blocks thick, so digging down hit bedrock almost at once. Now the world reaches 24 layers
// BELOW the old bottom: solid rock (or the map's own ground material) all the way down, bedrock only at the very bottom.
// Everything built on top keeps its coordinates. Not used on Sky Bridges (void) or the Big House (indoors).
// Settings -> "Deeper floor" switches it off for the next match.
if (CFG.deepFloor === undefined) CFG.deepFloor = true; DEF.deepFloor = true;
const DEEP = { D: 24, skip: ['bridges', 'house'] };
function fillDeep() {
  if (!YOFF) return;
  for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
    let f = getB(x, 1, z);                                          // continue the ground material downwards (sand, netherrack, stone...)
    if (!f || f === 255 || !isSolid(f) || f === B.BEDROCK || f === B.WATER || f === B.LEAVES || f === B.LOG || f === B.PLANKS || f === B.GLASS) f = B.STONE;
    for (let y = -YOFF + 1; y <= 0; y++) { if (y === 0 && getB(x, 0, z) !== B.BEDROCK) continue; rawSet(x, y, z, f); }   // the old bedrock floor becomes ordinary rock
    rawSet(x, -YOFF, z, B.BEDROCK);
  }
}
const _startGameDeep = startGame;
startGame = function () {
  const k = CFG.map;
  if (!CFG.deepFloor || DEEP.skip.includes(k)) return _startGameDeep();
  const keep = { a: genArena, p: genPlains, n: NEW_MAPS[k] };
  const wrap = f => seed => { NEXT_YOFF = DEEP.D; try { f(seed); } finally { NEXT_YOFF = 0; } fillDeep(); };
  if (NEW_MAPS[k]) NEW_MAPS[k] = wrap(NEW_MAPS[k]); else if (k === 'plains') genPlains = wrap(genPlains); else genArena = wrap(genArena);
  try { _startGameDeep(); } finally { genArena = keep.a; genPlains = keep.p; if (keep.n) NEW_MAPS[k] = keep.n; }
};
G.startGame = startGame;
(function () {
  for (const sec of MENU) { const i = sec.rows.findIndex(x => x[0] === 'map'); if (i >= 0) { sec.rows.splice(i + 1, 0, ['deepFloor', 'Deeper floor (24 more layers of ground to dig into)', 'tg']); break; } }
})();
buildMenu();
