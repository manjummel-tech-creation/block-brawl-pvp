// ================= ONLINE MULTIPLAYER (PeerJS, host-authoritative) =================
// Host: "Host online game" -> share the room code -> friends join -> press PLAY. The host runs the whole match
// (physics, bots, combat) and streams snapshots to everyone. Guests send their inputs and see the match live.
// Up to 4 friends. Bots optional (0 = pure player-vs-player).
const NET = { role: null, peer: null, code: '', conns: [], guests: [], hostConn: null, myId: -1, name: '', status: '', lastSnapT: 0, wbuf: [], snapQ: [], fxQ: [], blockQ: [] };
if (CFG.onlineBots === undefined) CFG.onlineBots = 0; DEF.onlineBots = 0;
if (CFG.onlineFriends === undefined) CFG.onlineFriends = 'enemy'; DEF.onlineFriends = 'enemy';
if (!CFG.netName) CFG.netName = 'Player' + ((Math.random() * 900 + 100) | 0);
function loadPeer() {
  return new Promise((res, rej) => {
    if (window.Peer) return res();
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = () => res(); s.onerror = () => rej(new Error('Could not load PeerJS')); document.head.appendChild(s);
  });
}
const netSend = (c, o) => { try { if (c && c.open) c.send(o); } catch (e) {} };
function netStatus(s) { NET.status = s; const el = $('#netStatus'); if (el) el.innerHTML = s; }
function roomCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[(Math.random() * A.length) | 0]; return s; }

// ---------- lobby ----------
async function hostOnline() {
  try { await loadPeer(); } catch (e) { netStatus('⚠ ' + e.message); return; }
  netLeave(true);
  NET.code = roomCode(); NET.role = 'host';
  netStatus('Creating room…');
  const peer = NET.peer = new Peer('mcc-' + NET.code);
  peer.on('open', () => { netStatus(`Room code: <b style="color:#ffff70;font-size:30px">${NET.code}</b> — tell your friends to Join with it, then press PLAY.`); renderLobby(); });
  peer.on('error', e => netStatus('⚠ ' + (e.type === 'unavailable-id' ? 'Code taken, try again' : e.type || e)));
  peer.on('connection', conn => {
    conn.on('open', () => {
      if (NET.guests.length >= 4) { netSend(conn, { t: 'full' }); setTimeout(() => conn.close(), 300); return; }
      const g = { conn, name: 'Friend', input: null, mob: null }; NET.guests.push(g);
      conn.on('data', d => onHostData(g, d));
      conn.on('close', () => { NET.guests = NET.guests.filter(x => x !== g); if (g.mob && !g.mob.dead && game && state === 'play') { feed(`${g.name} left`, '#ff9a5a'); die(g.mob, { kind: 'void' }); } renderLobby(); });
    });
  });
}
async function joinOnline(code) {
  code = (code || '').trim().toUpperCase(); if (!code) return;
  try { await loadPeer(); } catch (e) { netStatus('⚠ ' + e.message); return; }
  netLeave(true);
  NET.role = 'client'; NET.code = code; netStatus('Connecting…');
  const peer = NET.peer = new Peer();
  peer.on('error', e => netStatus('⚠ ' + (e.type === 'peer-unavailable' ? 'No room with that code' : e.type || e)));
  peer.on('open', () => {
    const conn = NET.hostConn = peer.connect('mcc-' + code, { reliable: true });
    conn.on('open', () => { netSend(conn, { t: 'hello', name: CFG.netName }); netStatus(`Joined room <b style="color:#ffff70">${code}</b> — waiting for the host to press PLAY…`); });
    conn.on('data', onClientData);
    conn.on('close', () => { const wasPlaying = state === 'play'; netLeave(true); if (wasPlaying) { toMenu(); } netStatus('Disconnected from host.'); });
  });
}
function netLeave(silent) {
  try { if (NET.hostConn) NET.hostConn.close(); } catch (e) {}
  for (const g of NET.guests) try { g.conn.close(); } catch (e) {}
  try { if (NET.peer) NET.peer.destroy(); } catch (e) {}
  Object.assign(NET, { role: null, peer: null, conns: [], guests: [], hostConn: null, myId: -1, wbuf: [] });
  if (!silent) netStatus('');
  renderLobby();
}
function renderLobby() {
  const el = $('#netPlayers'); if (!el) return;
  if (NET.role === 'host') el.innerHTML = `<b>In the room:</b> You (host)${NET.guests.map(g => ', ' + g.name).join('')}`;
  else el.innerHTML = '';
  const play = $('#play'); if (play && !play.dataset.resume) play.textContent = NET.role === 'host' ? `PLAY ONLINE (${NET.guests.length + 1} players)` : 'PLAY';
}
function onlinePanel() {
  const p = document.createElement('div'); p.className = 'panel';
  p.innerHTML = `<h2>Online <span style="font-size:18px;color:#aaa">(play with friends)</span></h2>
   <div class="row"><label>Your name</label><input class="mcin" id="netName" maxlength="16" value="${CFG.netName}"></div>
   <div class="row"><button class="mc" id="netHost">Host online game</button></div>
   <div class="row"><label>Join a friend</label><input class="mcin" id="netCode" maxlength="5" placeholder="CODE" style="text-transform:uppercase;width:110px"><button class="mc" id="netJoin">Join</button><button class="mc" id="netLeave">Leave</button></div>
   <div id="netStatus" style="font-size:21px;min-height:26px">${NET.status}</div><div id="netPlayers" style="font-size:20px"></div>
   <div class="row"><label>Bots in online matches <span class="val" id="netBotsV">${CFG.onlineBots}</span></label><input type="range" id="netBots" min="0" max="12" step="1" value="${CFG.onlineBots}"></div>
   <div class="row"><label>Friends are</label><button class="mc ${CFG.onlineFriends === 'enemy' ? 'on' : ''}" id="netEnemy">Enemies</button><button class="mc ${CFG.onlineFriends === 'ally' ? 'on' : ''}" id="netAlly">Teammates (Team fight)</button></div>
   <div style="font-size:17px;color:#999">The host's settings (mode, map, kit, combat) are used for everyone. Duel / Free-for-all: everyone fights everyone. Team fight: friends on your team or the other one.</div>`;
  const stop = e => e.stopPropagation();
  p.querySelectorAll('input').forEach(i => i.addEventListener('keydown', stop));
  p.querySelector('#netName').onchange = e => { CFG.netName = e.target.value.trim().slice(0, 16) || CFG.netName; saveCfg(); };
  p.querySelector('#netHost').onclick = hostOnline;
  p.querySelector('#netJoin').onclick = () => joinOnline(p.querySelector('#netCode').value);
  p.querySelector('#netLeave').onclick = () => netLeave(false);
  const r = p.querySelector('#netBots'); r.oninput = () => { CFG.onlineBots = +r.value; p.querySelector('#netBotsV').textContent = r.value; saveCfg(); };
  p.querySelector('#netEnemy').onclick = () => { CFG.onlineFriends = 'enemy'; saveCfg(); buildMenu(); };
  p.querySelector('#netAlly').onclick = () => { CFG.onlineFriends = 'ally'; saveCfg(); buildMenu(); };
  return p;
}
const _buildMenuNet = buildMenu;
buildMenu = function () { _buildMenuNet(); const cols = $('#cols'); cols.insertBefore(onlinePanel(), cols.firstChild); renderLobby(); };

// ---------- world transfer (run-length encoded) ----------
function worldRLE() {
  const out = []; let i = 0;
  while (i < world.length) { const v = world[i]; let n = 1; while (i + n < world.length && world[i + n] === v && n < 255) n++; out.push(v, n); i += n; }
  const u = new Uint8Array(out); let s = ''; for (let k = 0; k < u.length; k += 8192) s += String.fromCharCode.apply(null, u.subarray(k, k + 8192));
  return btoa(s);
}
function worldFromRLE(b64, dims) {
  const s = atob(b64); [WX, WY, WZ] = dims; world = new Uint8Array(WX * WY * WZ);
  let p = 0; for (let k = 0; k < s.length; k += 2) { const v = s.charCodeAt(k), n = s.charCodeAt(k + 1); world.fill(v, p, p + n); p += n; }
}

// ---------- HOST ----------
const itemKey = it => !it ? '' : it.k + '|' + (it.tier || it.id || (it.full ? 1 : '') || '');
const parseItemKey = s => { if (!s) return null; const [k, v] = s.split('|'); const it = { k }; if (k === 'block') it.id = +v, it.n = 1; else if (k === 'bucket') it.full = v === '1'; else if (v) it.tier = v; if (k === 'gapple' || k === 'wind') it.n = 1; return it; };
function onHostData(g, d) {
  if (!d || !d.t) return;
  if (d.t === 'hello') { g.name = String(d.name || 'Friend').slice(0, 16); renderLobby(); feed(`${g.name} joined the room`, '#70ff70'); }
  else if (d.t === 'i' && g.mob) g.input = d;
}
function makeGuestMob(g, idx) {
  const base = player;
  const team = CFG.mode === 'teams' ? (CFG.onlineFriends === 'ally' ? player.team : (player.team === 'red' ? 'blue' : 'red')) : g.name + '#' + idx;
  const m = new Mob({
    id: 100 + idx, name: g.name, team, isPlayer: true, remote: true,
    color: team === 'red' ? 0xb02a2a : team === 'blue' ? 0x2a4ab0 : [0xe67e22, 0x1abc9c, 0x9b59b6, 0xf1c40f][idx % 4],
    pants: 0x30304a, hair: ['#2b1a0e', '#d9b25a', '#111', '#7a3a12'][idx % 4], eye: '#4a6aff',
    teamCol: team === 'red' ? '#ff6060' : team === 'blue' ? '#7090ff' : '#7dffb0',
    inv: JSON.parse(JSON.stringify(base.inv)), armor: base.armorBase || base.armor, prot: base.prot, arrows: base.arrows, skill: 1, aggro: 1
  });
  for (const k of ['pots', 'potsMax', 'strPots', 'strPotsMax', 'totems', 'totemsMax', 'shield']) if (base[k] !== undefined) m[k] = base[k];
  m.dashCD = 0; m.kitProto = JSON.parse(JSON.stringify({ inv: m.inv, arrows: m.arrows }));
  if (typeof setupArmor === 'function') { m.armorBase = undefined; setupArmor(m); }
  // spawn as far from everyone as possible
  let best = spawns[0], bd = -1;
  for (const sp of spawns) { let d = 1e9; for (const o of mobs) d = Math.min(d, Math.hypot(o.x - sp[0], o.z - sp[2])); if (d > bd) { bd = d; best = sp; } }
  mobs.push(m); spawnPoint(m, best);
  g.mob = m; g.input = null;
  return m;
}
const _startGameNet = startGame;
startGame = function () {
  if (NET.role === 'client') return;
  const online = NET.role === 'host' && NET.guests.length > 0;
  const keepBots = CFG.bots;
  if (online) CFG.bots = Math.max(1, CFG.onlineBots | 0);
  try { _startGameNet(); } finally { CFG.bots = keepBots; }
  if (!online || !game) return;
  player.name = CFG.netName; drawTag(player); // friends see your name, not "You"
  if ((CFG.onlineBots | 0) === 0) { for (const m of mobs.slice()) if (!m.isPlayer) { scene.remove(m.parts.root); mobs.splice(mobs.indexOf(m), 1); } }
  NET.guests.forEach((g, i) => makeGuestMob(g, i));
  if (REC) REC.n = mobs.length;
  // ship the world + roster to everyone
  const w = worldRLE(), parts = Math.ceil(w.length / 30000);
  const roster = mobs.map(m => ({ id: m.id, name: m.name, team: m.team, color: m.mats[1] ? m.mats[1].color.getHex() : 0x888888, teamCol: m.teamCol, hair: m.hair, eye: m.eye, armor: m.armorBase || m.armor, prot: m.prot, shield: !!m.shield }));
  for (const g of NET.guests) {
    for (let i = 0; i < parts; i++) netSend(g.conn, { t: 'w', i, n: parts, d: w.slice(i * 30000, (i + 1) * 30000) });
    netSend(g.conn, { t: 'start', dims: [WX, WY, WZ], roster, you: g.mob.id, combat: CFG.combat, mode: CFG.mode, win: game.win, kt: game.killTarget, tick });
  }
  NET.blockQ = []; NET.fxQ = [];
};
G.startGame = startGame;
// remote players are driven through the normal player controls with their inputs swapped in
const ACTS = ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak', 'attack', 'break', 'place', 'use', 'shield'];
const _playerControlNet = playerControl;
playerControl = function (p) {
  if (!p.remote) return _playerControlNet(p);
  const g = NET.guests.find(x => x.mob === p), I = g && g.input;
  const saved = { player, clickQ, placePress, usePress, potQ, strQ, dashQ, placeClicks, keys: Object.assign({}, keys) };
  for (const k in keys) keys[k] = false;
  if (I) {
    ACTS.forEach((a, i) => { if (I.a & (1 << i)) keys[KB[a]] = true; });
    p.yaw = I.y; p.pitch = clamp(I.p, -90, 90);
    if (I.sel !== p.sel && I.sel >= 0 && I.sel < 9) p.select(I.sel);
    clickQ = I.c || 0; placePress = !!I.pl; usePress = !!I.u; potQ = !!I.pot; strQ = !!I.str; dashQ = !!I.dash; placeClicks = I.pl || 0;
    I.c = 0; I.pl = 0; I.u = 0; I.pot = 0; I.str = 0; I.dash = 0;
  } else { clickQ = 0; placePress = usePress = potQ = strQ = dashQ = false; placeClicks = 0; }
  player = p;
  try { _playerControlNet(p); }
  finally {
    player = saved.player; clickQ = saved.clickQ; placePress = saved.placePress; usePress = saved.usePress; potQ = saved.potQ; strQ = saved.strQ; dashQ = saved.dashQ; placeClicks = saved.placeClicks;
    for (const k in keys) keys[k] = false; Object.assign(keys, saved.keys);
  }
};
// capture block changes / effects / feed for the guests
const _setBNet = setB;
setB = function (x, y, z, id) { const r = _setBNet(x, y, z, id); if (r && NET.role === 'host' && state === 'play') NET.blockQ.push(x, y, z, id); return r; };
const NET_SFX = new Set(['hit', 'crit', 'weak', 'hurt', 'death', 'bow', 'arrowHit', 'brk', 'place', 'shieldBlock', 'shieldBreak', 'totem', 'thunder', 'wind', 'smash', 'potBreak', 'burp', 'splash', 'sweep', 'dash', 'lunge', 'armorBreak', 'strPot', 'eat', 'swing']);
const _sfxNet = sfx;
sfx = function (name, x, y, z, vm) {
  _sfxNet(name, x, y, z, vm);
  if (NET.role === 'host' && NET.guests.length && x !== undefined && NET_SFX.has(name) && NET.fxQ.length < 40) NET.fxQ.push(['s', name, +x.toFixed(1), +y.toFixed(1), +z.toFixed(1), vm == null ? 1 : +vm.toFixed(2)]);
};
const _feedNet = feed;
feed = function (msg, col) { _feedNet(msg, col); if (NET.role === 'host' && NET.guests.length) NET.fxQ.push(['f', msg, col || '#fff']); };
const _lightningNet = lightning;
lightning = function (x, y, z) { _lightningNet(x, y, z); if (NET.role === 'host' && NET.guests.length) NET.fxQ.push(['L', x, y, z]); };
const _centerNet = centerMsg;
centerMsg = function (b, s) { _centerNet(b, s); if (NET.role === 'host' && NET.guests.length) NET.fxQ.push(['c', b || '', s || '']); };
function hostBroadcast() {
  if (NET.role !== 'host' || !NET.guests.length || !game) return;
  const M = mobs.map(m => {
    const fl = (m.dead ? 1 : 0) | (m.sneaking ? 2 : 0) | (m.shieldUp ? 4 : 0) | (m.using === 'bow' ? 8 : 0) | (m.using === 'eat' ? 16 : 0) | (m.using === 'block' ? 32 : 0) | (m.shield ? 64 : 0) | (m.onGround ? 128 : 0) | (m.hurtTime > 0 ? 256 : 0);
    return [m.id, +m.x.toFixed(3), +m.y.toFixed(3), +m.z.toFixed(3), +m.yaw.toFixed(1), +m.pitch.toFixed(1), fl, m.swingT, m.hurtTime, itemKey(m.held), +(m.health + m.absorption).toFixed(1), m.using === 'bow' ? m.useT : 0];
  });
  const proj = [];
  for (const a of arrows) proj.push([0, +a.x.toFixed(2), +a.y.toFixed(2), +a.z.toFixed(2), +a.vx.toFixed(2), +a.vy.toFixed(2), +a.vz.toFixed(2)]);
  if (typeof windProj !== 'undefined') for (const w of windProj) proj.push([1, +w.x.toFixed(2), +w.y.toFixed(2), +w.z.toFixed(2)]);
  if (typeof potProj !== 'undefined') for (const w of potProj) proj.push([2, +w.x.toFixed(2), +w.y.toFixed(2), +w.z.toFixed(2)]);
  const snap = { t: 's', k: tick, m: M, b: NET.blockQ, x: NET.fxQ, pr: proj, cd: game.countdown, prep: !!game.prep };
  NET.blockQ = []; NET.fxQ = [];
  for (const g of NET.guests) {
    const me = g.mob;
    if (me && tick % 3 === 0) snap.me = {
      inv: me.inv.map(it => it ? { k: it.k, tier: it.tier, id: it.id, n: it.n, full: it.full, sharp: it.sharp, power: it.power } : null), sel: me.sel, arrows: me.arrows,
      hp: me.health, ab: me.absorption, armor: me.armorBase || me.armor, apts: ARMOR[me.armor] ? ARMOR[me.armor].pts : 0, regen: me.regenFx, using: me.using, useT: me.useT,
      tss: me.ticksSinceSwing, pots: me.pots, potsMax: me.potsMax, strPots: me.strPots, strPotsMax: me.strPotsMax, strU: me.strPotUntil, gU: me.strengthUntil,
      totems: me.totems, shield: me.shield, shieldCD: me.shieldCD, shieldUp: me.shieldUp, shieldT: me.shieldT, dashCD: me.dashCD, stunT: me.stunT, inWeb: me.inWeb,
      fd: me.fallDistance, combo: me.combo, cs: me.critStreak, lct: me.lastCritT, kills: me.kills, deaths: me.deaths, ti: me.totemImmuneUntil, mp: me.mineProg, mk: me.mineKey
    }; else delete snap.me;
    netSend(g.conn, snap);
  }
}
const _gameTickNet = gameTick;
gameTick = function () {
  if (NET.role === 'client') return;
  const t0 = tick; _gameTickNet();
  if (tick !== t0) hostBroadcast();
};
const _endGameNet = endGame;
endGame = function (team) {
  _endGameNet(team);
  if (NET.role !== 'host') return;
  for (const g of NET.guests) {
    const won = g.mob && team === g.mob.team;
    netSend(g.conn, { t: 'end', title: won ? 'VICTORY!' : teamLabel(team) + ' WINS', won,
      rows: mobs.slice().sort((a, b) => b.kills - a.kills).map(m => [m.remote || m.isPlayer ? m.name : m.name, m.kills, m.deaths, (m.dmgDealt / 2).toFixed(1), m.teamCol || '#fff', m === g.mob]) });
  }
};
// the host keeps simulating while paused / alt-tabbed / tab hidden when friends are connected
const hostTicker = (() => { try { return new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),50)'], { type: 'text/javascript' }))); } catch (e) { return null; } })();
let hostLastTickT = performance.now();
if (hostTicker) hostTicker.onmessage = () => {
  if (NET.role !== 'host' || !NET.guests.length || state !== 'play' || !game || game.over) return;
  if (!document.hidden && !paused && (locked || freeLook)) return; // normal frame loop handles it
  if (performance.now() - hostLastTickT < 45) return;
  hostLastTickT = performance.now();
  const keepL = G.noLockCheck; G.noLockCheck = true;
  try { gameTick(); } finally { G.noLockCheck = keepL; }
};
const _gameTickHostT = gameTick;
gameTick = function () { hostLastTickT = performance.now(); _gameTickHostT(); };

// ---------- CLIENT ----------
const netMobs = new Map();
function clientMakeMob(r) {
  const m = new Mob({ id: r.id, name: r.name, team: r.team, isPlayer: false, color: r.color, pants: 0x2b3050, hair: r.hair || '#3b2414', eye: r.eye || '#3a2a1a', teamCol: r.teamCol,
    inv: [null, null, null, null, null, null, null, null, null], armor: ARMOR[r.armor] ? r.armor : 'none', prot: r.prot || 0, arrows: 0, skill: 0.5, aggro: 0.5 });
  m.shield = r.shield; m.netClient = true;
  return m;
}
function onClientData(d) {
  if (!d || !d.t) return;
  if (d.t === 'full') { netStatus('⚠ Room is full'); return; }
  if (d.t === 'w') { NET.wbuf[d.i] = d.d; NET.wparts = d.n; return; }
  if (d.t === 'start') return clientStart(d);
  if (d.t === 's') return clientSnap(d);
  if (d.t === 'end') return clientEnd(d);
}
function clientStart(d) {
  ac(); clearMatch(); hideAll(); killcam = null; RP = null;
  worldFromRLE(NET.wbuf.join(''), d.dims); NET.wbuf = [];
  rebuildAll();
  COMBAT18 = d.combat === '18';
  netMobs.clear(); mobs = [];
  for (const r of d.roster) { const m = clientMakeMob(r); mobs.push(m); netMobs.set(r.id, m); }
  player = netMobs.get(d.you); player.isPlayer = true; player.parts.tag.visible = false; player.dashCD = 0;
  listener = player; NET.myId = d.you;
  game = { countdown: 0, over: false, win: d.win, killTarget: d.kt, client: true };
  tick = d.tick; state = 'play'; paused = false; thirdPerson = false;
  centerMsg('Connected', 'Waiting for the match to start…');
  lockMouse();
}
function clientSnap(d) {
  if (state !== 'play' || !game || !game.client) return;
  tick = d.k; NET.lastSnapT = performance.now();
  game.countdown = d.cd; game.prep = d.prep;
  for (const r of d.m) {
    const m = netMobs.get(r[0]); if (!m) continue;
    m.px = m.x; m.py = m.y; m.pz = m.z; m.pyaw = m.yaw; m.ppitch = m.pitch;
    m.x = r[1]; m.y = r[2]; m.z = r[3];
    if (m !== player) { m.yaw = r[4]; m.pitch = r[5]; }
    const fl = r[6], wasDead = m.dead;
    m.dead = !!(fl & 1); m.sneaking = !!(fl & 2); m.shieldUp = !!(fl & 4); m.shield = !!(fl & 64); m.onGround = !!(fl & 128);
    m.using = fl & 8 ? 'bow' : fl & 16 ? 'eat' : fl & 32 ? 'block' : null; m.useT = r[11] || 0;
    m.swingT = r[7]; m.hurtTime = r[8];
    if (m !== player) { const it = parseItemKey(r[9]); m.inv[0] = it; m.sel = 0; }
    m.health = r[10]; m.absorption = 0;
    m.vx = m.x - m.px; m.vz = m.z - m.pz; m.vy = m.y - m.py;
    const mv = Math.hypot(m.vx, m.vz); m.limbAmp = lerp(m.limbAmp || 0, Math.min(1, mv * 4), 0.4); m.limb = (m.limb || 0) + mv * 2.6;
    if (m.dead) { m.deathT = wasDead ? (m.deathT || 0) + 1 : 0; if (m.deathT >= 20 && m.parts) m.parts.root.visible = false; }
    else if (wasDead && m.parts) { m.parts.root.visible = true; m.parts.root.rotation.z = 0; m.deathT = 0; }
  }
  if (d.me) {
    const p = player, me = d.me;
    p.inv = me.inv.map(it => { if (!it) return null; const o = {}; for (const k in it) if (it[k] !== null && it[k] !== undefined) o[k] = it[k]; return o; }); // PeerJS turns undefined into null
    if (p.sel !== me.sel && clientSelT < performance.now() - 300) p.sel = me.sel;
    Object.assign(p, { arrows: me.arrows, health: me.hp, absorption: me.ab, regenFx: me.regen, using: me.using, useT: me.useT, ticksSinceSwing: me.tss, pots: me.pots, potsMax: me.potsMax,
      strPots: me.strPots, strPotsMax: me.strPotsMax, strPotUntil: me.strU, strengthUntil: me.gU, totems: me.totems, shield: me.shield, shieldCD: me.shieldCD, shieldUp: me.shieldUp,
      shieldT: me.shieldT, dashCD: me.dashCD, stunT: me.stunT, inWeb: me.inWeb, fallDistance: me.fd, combo: me.combo, critStreak: me.cs, lastCritT: me.lct, kills: me.kills, deaths: me.deaths,
      totemImmuneUntil: me.ti, mineProg: me.mp, mineKey: me.mk });
    if (ARMOR[me.armor]) { const key = '_net'; ARMOR[key] = Object.assign({}, ARMOR[me.armor], { pts: me.apts }); p.armor = key; }
  }
  // blocks
  const b = d.b; for (let i = 0; i < b.length; i += 4) _setBNet(b[i], b[i + 1], b[i + 2], b[i + 3]);
  // effects
  for (const e of d.x) {
    if (e[0] === 's') { _sfxNet(e[1], e[2], e[3], e[4], e[5]); if (e[1] === 'crit') burst(e[2], e[3] + 1.1, e[4], 14, ['#ffffff', '#e8e0c8', '#c8b890'], 3, 0.5, 0.07, 3); if (e[1] === 'hit' || e[1] === 'crit') burst(e[2], e[3] + 1.3, e[4], 4, ['#5a0a0a', '#7a1010'], 1.6, 0.6, 0.09, 4, 1); if (e[1] === 'brk') burst(e[2], e[3], e[4], 14, '#9a8a7a', 2.4, 0.6, 0.09, 12); }
    else if (e[0] === 'f') _feedNet(e[1], e[2]);
    else if (e[0] === 'L') _lightningNet(e[1], e[2], e[3]);
    else if (e[0] === 'c') _centerNet(e[1], e[2]);
  }
  // projectiles (simple meshes, rebuilt each snapshot)
  clientProj(d.pr || []);
  if (player.dead && game.win === 'last') { $('#deadMsg').textContent = 'Spectating — waiting for the match to end'; }
}
let clientSelT = 0;
const cProj = [];
const cProjGeo = [new THREE.BoxGeometry(0.06, 0.06, 0.6), new THREE.IcosahedronGeometry(0.18, 0), new THREE.BoxGeometry(0.22, 0.28, 0.22)];
const cProjMat = [new THREE.MeshBasicMaterial({ color: 0x8a6a40 }), new THREE.MeshBasicMaterial({ color: 0xdff0ff }), new THREE.MeshBasicMaterial({ color: 0xf0306a })];
function clientProj(list) {
  while (cProj.length > list.length) scene.remove(cProj.pop());
  list.forEach((p, i) => {
    let m = cProj[i];
    if (!m || m.userData.type !== p[0]) { if (m) scene.remove(m); m = new THREE.Mesh(cProjGeo[p[0]], cProjMat[p[0]]); m.userData.type = p[0]; scene.add(m); cProj[i] = m; }
    m.position.set(p[1], p[2], p[3]);
    if (p[0] === 0) m.lookAt(p[1] + p[4], p[2] + p[5], p[3] + p[6]);
  });
}
function clientEnd(d) {
  if (!game) return;
  game.over = true;
  document.exitPointerLock && document.exitPointerLock();
  $('#endTitle').textContent = d.title; $('#endTitle').style.color = d.won ? '#7dff6a' : '#ff6a6a';
  $('#endStats').innerHTML = `<table><tr><th>Player</th><th>Kills</th><th>Deaths</th><th>Damage</th></tr>${d.rows.map(r => `<tr style="color:${r[5] ? '#ffff70' : r[4]}"><td>${r[0]}${r[5] ? ' (you)' : ''}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}❤</td></tr>`).join('')}</table>
    <div style="font-size:20px;color:#aaa;margin-top:6px">Waiting for the host to start the next match…</div>`;
  $('#end').classList.remove('hidden');
  for (const id of ['#again', '#watchReplay']) { const b = $(id); if (b) b.style.display = 'none'; }
  sfx(d.won ? 'win' : 'lose');
}
// client: send inputs every tick; render with smooth interpolation between snapshots
let clientSendT = 0;
const _stepAndRenderNet = stepAndRender;
stepAndRender = function (dt) {
  if (NET.role === 'client' && game && game.client && state === 'play') {
    const now = performance.now();
    if (now - clientSendT >= 50 && NET.hostConn) {
      clientSendT = now;
      const active = inGame() && (locked || freeLook) && !player.dead;
      let a = 0; if (active) ACTS.forEach((n, i) => { if (held(n)) a |= 1 << i; });
      netSend(NET.hostConn, { t: 'i', a, y: +player.yaw.toFixed(2), p: +player.pitch.toFixed(2), sel: player.sel, c: active ? clickQ : 0, pl: active ? Math.max(placeClicks, placePress ? 1 : 0) : 0,
        u: active && usePress ? 1 : 0, pot: potQ ? 1 : 0, str: strQ ? 1 : 0, dash: dashQ ? 1 : 0 });
      clickQ = 0; placeClicks = 0; placePress = usePress = potQ = strQ = dashQ = false;
    }
    acc = Math.max(0, Math.min(0.0499, (now - NET.lastSnapT) / 1000) - dt); // alpha follows snapshot timing
  }
  _stepAndRenderNet(dt);
};
// client-side select changes are sent to the host (and not overwritten by stale snapshots for a moment)
const _selectNet = Mob.prototype.select;
Mob.prototype.select = function (i) { if (NET.role === 'client' && this === player) clientSelT = performance.now(); _selectNet.call(this, i); };
// client menus: leaving = disconnect
const _toMenuNet = toMenu;
toMenu = function () {
  if (NET.role === 'client') { netLeave(false); }
  for (const id of ['#again', '#watchReplay']) { const b = $(id); if (b) b.style.display = ''; }
  while (cProj.length) scene.remove(cProj.pop());
  _toMenuNet();
};
const _pauseGameNet = pauseGame;
pauseGame = function () { _pauseGameNet(); const r = $('#restart'); if (r) r.style.display = NET.role === 'client' ? 'none' : ''; };
// guests can't use host-only things
const _openReplayNet = openReplay;
openReplay = function () { if (NET.role === 'client') return; _openReplayNet(); };
const _dieNetKC = die;
die = function (t, src) { _dieNetKC(t, src); if (NET.role === 'client') killcam = null; };
buildMenu();
