// ================= BOT COBWEB RULES =================
// 1) a bot can never cut the web on its OWN head (it has to walk / fall out of it, or water it)
// 2) before cutting any web a bot first has to turn and look at it
// 3) bots cut webs with a sword at less than half the old speed
const _tickMiningWebRules = tickMining;
tickMining = function (e, hit) {
  if (!hit || e.isPlayer || hit.id !== B.WEB) return _tickMiningWebRules(e, hit);
  const fy = Math.floor(e.y + 0.01), box = e.box();
  const own = hit.x >= Math.floor(box[0]) && hit.x <= Math.floor(box[3] - 0.001) && hit.z >= Math.floor(box[2]) && hit.z <= Math.floor(box[5] - 0.001);
  if (own && hit.y === fy + 1) return;                                   // head web: impossible to cut yourself
  // turn to face it first: the further it has to turn, the longer before the first cut (and it keeps looking at the web while cutting)
  const cx = hit.x + 0.5, cy = hit.y + 0.5, cz = hit.z + 0.5, dx = cx - e.x, dz = cz - e.z, hd = Math.hypot(dx, dz), wkey = hit.x + ',' + hit.y + ',' + hit.z;
  const wantYaw = hd > 0.35 ? Math.atan2(-dx, dz) / DEG : e.yaw, wantPitch = clamp(-Math.atan2(cy - (e.y + e.eyeH), Math.max(0.01, hd)) / DEG, -89, 89);
  if (!e._webTurn || e._webTurn.key !== wkey || tick - e._webTurn.last > 6) {
    const off = Math.max(Math.abs(wrapDeg(wantYaw - e.yaw)), Math.abs(wantPitch - e.pitch));
    e._webTurn = { key: wkey, need: Math.ceil(off / 14), n: 0, yaw: e.yaw, pitch: e.pitch, last: tick };
  }
  const T = e._webTurn; T.last = tick;
  if (T.n < T.need) {                                                    // still turning: no cutting yet
    T.n++; const k = T.n / T.need;
    e.yaw = T.yaw + wrapDeg(wantYaw - T.yaw) * k; e.pitch = T.pitch + (wantPitch - T.pitch) * k;
    e.mineProg = Math.min(e.mineProg || 0, 0.02); return;
  }
  e.yaw = wantYaw; e.pitch = wantPitch;
  const key = hit.x + ',' + hit.y + ',' + hit.z, before = e.mineKey === key ? (e.mineProg || 0) : null;
  _tickMiningWebRules(e, hit);
  if (before !== null && e.held && e.held.k === 'sword' && getB(hit.x, hit.y, hit.z) === B.WEB && e.mineProg > before) e.mineProg = before + (e.mineProg - before) * 0.42;
};

// 4) head-webbed bots don't just stand there: after a short reaction they pour their water bucket on the web
//    (it washes the web away); with no water they start dragging themselves out almost straight away.
const _botTickHeadWater = botTick;
botTick = function (b) {
  const hw = !b.dead && b.ai && b.inWeb && webSpots(b).head;
  if (!hw) { b._hwT = 0; return _botTickHeadWater(b); }
  if (!b._headWebFor) b._headWebFor = 12 + ((Math.random() * 8) | 0);      // was 3-4.5 s of standing still
  _botTickHeadWater(b);
  b._hwT = (b._hwT || 0) + 1;
  if (b._hwT < (b._hwReact || (b._hwReact = 7 + ((Math.random() * 7) | 0))) || b.stunT > tick) return;
  const full = slotWhere(b, it => it.k === 'bucket' && it.full);
  if (full < 0) {                                                          // no water: drag itself straight out (about 3 s)
    if (b._hwT > b._headWebFor) { const yw = b.yaw * DEG; b.inWeb = false; try { move(b, -Math.sin(yw) * 0.022, 0, Math.cos(yw) * 0.022); } finally { b.inWeb = true; } }
    return;
  }
  const box = b.box(), y = Math.floor(b.y + 0.01) + 1;
  for (let x = Math.floor(box[0]); x <= Math.floor(box[3] - 0.001); x++) for (let z = Math.floor(box[2]); z <= Math.floor(box[5] - 0.001); z++) {
    if (getB(x, y, z) !== B.WEB) continue;
    b.pitch = -80;                                                          // looks up at the web on its head
    if (placeWater(x, y, z)) { holdSlot(b, full); b.inv[full].full = false; setHeldVisual(b); swing(b); b.waterCD = tick + 120; b._hwT = 0; b._hwReact = 0; }
    return;
  }
};
