// ================= NERF BOT COBWEB PLACEMENT =================
// Bots now web less often and usually land the web in a block AROUND you instead of right on you.
// Exact hits happen sometimes (15% for easy bots, up to 40% for insane ones).
const _botPlaceNerf = botPlace;
botPlace = function (b, x, y, z, web) {
  if (!web) return _botPlaceNerf(b, x, y, z, web);
  if ((b._webGate || 0) > tick) return false;
  // hesitate: half the time they "think about it" and wait 2 s before trying again
  if (Math.random() < 0.5) { b._webGate = tick + 40; return false; }
  b._webGate = tick + 100 + ((Math.random() * 120) | 0); // at most one web every 5-11 s
  const exact = Math.random() < 0.15 + 0.25 * (b.skill || 0);
  if (exact && _botPlaceNerf(b, x, y, z, true)) return true;
  // otherwise drop it in a random spot next to the target
  const spots = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const dy of [0, 1]) {
    if (!dx && !dz) continue;
    if (getB(x + dx, y + dy, z + dz) === 0) spots.push([x + dx, y + dy, z + dz]);
  }
  for (let i = spots.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [spots[i], spots[j]] = [spots[j], spots[i]]; }
  for (const s of spots) if (_botPlaceNerf(b, s[0], s[1], s[2], true)) return true;
  return false;
};
