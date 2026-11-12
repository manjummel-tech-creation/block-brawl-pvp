// ================= BOT WATER COOLDOWN =================
// After a bot places water it can't place water again for 6 s (it can still pick its water back up).
const _botWaterCD = botWater;
botWater = function (b, X) {
  const fullBefore = b.inv.filter(i => i && i.k === 'bucket' && i.full);
  const cooling = tick < (b.waterCD || 0);
  if (cooling) fullBefore.forEach(i => { i.k = 'bucketHidden'; }); // hide full buckets while cooling down
  _botWaterCD(b, X);
  if (cooling) b.inv.forEach(i => { if (i && i.k === 'bucketHidden') i.k = 'bucket'; });
  else if (fullBefore.some(i => !i.full)) b.waterCD = tick + 120;
};
