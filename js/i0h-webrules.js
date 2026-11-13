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
