// ================= UNLIMITED LOOT + CHOOSE THE AMOUNT OF EVERYTHING =================
// "Unlimited loot" keeps every consumable topped up (arrows, golden apples, blocks, cobwebs, wind charges,
// water, healing & strength potions). Totems are left out on purpose (otherwise nobody could ever die).
// Every item slider also goes much higher now.
for (const [k, v] of Object.entries({ unlimited: false, botUnlimited: false })) { DEF[k] = v; if (CFG[k] === undefined) CFG[k] = v; }
(function () {
  const RANGES = { arrows: [1, 256, 1], gapples: [0, 64, 1], blocks: [0, 192, 16], webs: [0, 64, 1], windCharges: [0, 64, 1], pots: [0, 64, 1], strPots: [0, 32, 1], totems: [0, 10, 1],
    botGapples: [0, 64, 1], botWebs: [0, 64, 1], botPots: [0, 64, 1], botStrPots: [0, 32, 1], botTotems: [0, 10, 1], botWind: [0, 64, 1], power: [0, 5, 1], sharp: [0, 5, 1], prot: [0, 4, 1] };
  for (const sec of MENU) for (const r of sec.rows) if (RANGES[r[0]] && r[2] === 'rng') { const keepSuffix = r[3][3]; r[3] = RANGES[r[0]].slice(); if (keepSuffix) r[3][3] = keepSuffix; }
  const k = MENU[1].rows, i = k.findIndex(x => x[0] === 'armor');
  k.splice(i, 0, ['unlimited', 'Unlimited loot for you (nothing runs out, except totems)', 'tg']);
  const b = MENU[2].rows, j = b.findIndex(x => x[0] === 'botArmor');
  b.splice(j, 0, ['botUnlimited', 'Unlimited loot for bots', 'tg']);
})();
function topUp(m) {
  const proto = m.kitProto && m.kitProto.inv;
  m.inv.forEach((it, i) => {
    if (!it) return;
    const p = proto && proto[i] && proto[i].k === it.k ? proto[i] : null;
    if (it.n !== undefined) { const want = Math.max(1, p && p.n !== undefined ? p.n : 1); if (it.n < want) it.n = want; }
    if (it.k === 'bucket') it.full = true;
  });
  if (m.kitProto && m.kitProto.arrows && m.arrows < m.kitProto.arrows) m.arrows = m.kitProto.arrows;
  if (m.potsMax && m.pots < m.potsMax) m.pots = m.potsMax;
  if (m.strPotsMax && m.strPots < m.strPotsMax) m.strPots = m.strPotsMax;
  if (!m.isPlayer) m.gapCD = 0;
}
const _gameTickLoot = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickLoot();
  if (tick === t0 || !game) return;
  for (const m of mobs) { if (m.dead) continue; if ((m.isPlayer && !m.remote && CFG.unlimited) || (!m.isPlayer && CFG.botUnlimited)) topUp(m); }
};
// buckets: with unlimited loot your bucket refills right after you pour
const _useBucketLoot = useBucket;
useBucket = function (e) { const r = _useBucketLoot(e); if (r && e.isPlayer && CFG.unlimited && e.held && e.held.k === 'bucket') { e.held.full = true; setHeldVisual(e); } return r; };
buildMenu();
