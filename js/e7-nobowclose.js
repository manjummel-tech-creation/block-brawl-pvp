// ================= NO BOW IN CLOSE COMBAT =================
// If any enemy is within 5.5 blocks (and not way above/below), a bot puts the bow away and fights with its weapon.
const _botTickNoBow = botTick;
botTick = function (b) {
  _botTickNoBow(b);
  if (b.dead || !b.ai) return;
  const usingBow = b.using === 'bow' || (b.held && b.held.k === 'bow');
  if (!usingBow) return;
  for (const o of mobs) {
    if (o.dead || o.team === b.team) continue;
    if (Math.hypot(o.x - b.x, o.z - b.z) < 5.5 && Math.abs(o.y - b.y) < 3) {
      if (b.using === 'bow') { b.using = null; b.useT = 0; }
      b._bowNeed = undefined;
      const w = b.ai.weaponSlot >= 0 ? b.ai.weaponSlot : b.inv.findIndex(i => i && (i.k === 'sword' || i.k === 'axe'));
      if (w >= 0) holdSlot(b, w);
      if (b.ai.x && b.ai.x.plan === 'kite') { b.ai.x.plan = 'fight'; b.ai.x.planT = 20; }
      break;
    }
  }
};
