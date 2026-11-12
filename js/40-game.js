// ================= RENDERER, INPUT, HUD, MENUS, GAME FLOW =================
const glCanvas = $('#gl'), hud = $('#hud'), hctx = hud.getContext('2d');
const renderer = (() => {                   // try gentler settings if the browser refuses the first 3D context
  const tries = [{ powerPreference: 'high-performance' }, { powerPreference: 'default' }, { powerPreference: 'low-power', precision: 'mediump' }, { powerPreference: 'low-power', precision: 'mediump', legacy: true }];
  let last;
  for (const t of tries) {
    try { const R = t.legacy && THREE.WebGL1Renderer ? THREE.WebGL1Renderer : THREE.WebGLRenderer; return new R({ canvas: glCanvas, antialias: false, failIfMajorPerformanceCaveat: false, powerPreference: t.powerPreference, precision: t.precision || 'highp' }); }
    catch (e) { last = e; }
  }
  throw new Error('This browser blocked 3D graphics (WebGL) for this page. Fix: fully QUIT the browser (Cmd+Q) and reopen it - browsers block 3D after a graphics crash. If it still happens, turn on "Use graphics acceleration when available" in the browser settings. (' + (last && last.message) + ')');
})();
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
const SKY = 0x8ab8ff;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(0x9ec4ff, 45, 120);
const camera = new THREE.PerspectiveCamera(CFG.fov, 1, 0.05, 400);
camera.rotation.order = 'YXZ'; scene.add(camera);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8090a0, 0.85));
const sunL = new THREE.DirectionalLight(0xffffff, 0.55); sunL.position.set(0.4, 1, 0.25); scene.add(sunL);
initParticles();
// sun + clouds
const sun = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0xfffbe0, fog: false }));
scene.add(sun);
const clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), 60);
(function () { const m = new THREE.Matrix4(); srand(5); for (let i = 0; i < 60; i++) { m.makeScale(8 + rnd() * 18, 3, 6 + rnd() * 14); m.setPosition(-150 + rnd() * 300, 80, -150 + rnd() * 300); clouds.setMatrixAt(i, m); } })();
scene.add(clouds);

// block selection outline + crack overlay
const selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
scene.add(selBox); selBox.visible = false;
const crackMat = new THREE.MeshBasicMaterial({ map: crackTex[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const crackBox = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), crackMat); scene.add(crackBox); crackBox.visible = false;

// first-person view model
const vm = new THREE.Group(); camera.add(vm);
const vmArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.2), new THREE.MeshLambertMaterial({ color: 0xc69c7b, depthTest: false }));
vmArm.renderOrder = 999; vm.add(vmArm);
const vmItem = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, depthTest: false }));
vmItem.renderOrder = 1000; vm.add(vmItem);

let W = 0, H = 0, DPR = 1;
function resize() {
  W = window.innerWidth; H = window.innerHeight; DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  hud.width = W * DPR; hud.height = H * DPR;
}
window.addEventListener('resize', resize); resize();

// ---------------- state ----------------
let state = 'menu', paused = false, game = null, thirdPerson = false, showDebug = false;
let camShake = 0, hitMarker = 0, lastHitBy = null, freeLook = false, locked = false;
let targetInfo = null, targetInfoT = 0, heldNameT = 0, fps = 60;
const clickTimes = [];
function showTarget(t) { targetInfo = t; targetInfoT = performance.now(); }

// ---------------- input (fully rebindable) ----------------
const KB_ACTIONS = [
  ['forward', 'Walk forward', 'KeyW'], ['back', 'Walk backward', 'KeyS'], ['left', 'Strafe left', 'KeyA'], ['right', 'Strafe right', 'KeyD'],
  ['jump', 'Jump / swim up', 'Space'], ['sprint', 'Sprint', 'ControlLeft'], ['sneak', 'Sneak', 'ShiftLeft'],
  ['attack', 'Hit / attack', 'Mouse0'], ['break', 'Break block (hold)', 'Mouse0'], ['place', 'Place block', 'Mouse2'],
  ['use', 'Use item (bow / eat / sword-block)', 'Mouse2'],
  ['slot1', 'Hotbar 1', 'Digit1'], ['slot2', 'Hotbar 2', 'Digit2'], ['slot3', 'Hotbar 3', 'Digit3'], ['slot4', 'Hotbar 4', 'Digit4'],
  ['slot5', 'Hotbar 5', 'Digit5'], ['slot6', 'Hotbar 6', 'Digit6'], ['slot7', 'Hotbar 7', 'Digit7'], ['slot8', 'Hotbar 8', 'Digit8'], ['slot9', 'Hotbar 9', 'Digit9'],
  ['nextSlot', 'Next hotbar slot', 'WheelDown'], ['prevSlot', 'Previous hotbar slot', 'WheelUp'],
  ['camera', 'Toggle camera (1st / 3rd)', 'KeyV'], ['scores', 'Scoreboard (hold)', 'Tab'], ['debug', 'Debug screen', 'F3'],
  ['hitboxes', 'Show hitboxes', 'KeyB'], ['pause', 'Pause', 'KeyP']
];
const KB_DEF = {}; for (const [a, , k] of KB_ACTIONS) KB_DEF[a] = k;
CFG.keys = Object.assign({}, KB_DEF, CFG.keys || {});
const KB = CFG.keys;
function keyName(c) {
  if (!c) return '(none)';
  const M = { Mouse0: 'Left Click', Mouse1: 'Middle Click', Mouse2: 'Right Click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5', WheelUp: 'Wheel Up', WheelDown: 'Wheel Down',
    Space: 'Space', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', AltLeft: 'L-Alt', AltRight: 'R-Alt', MetaLeft: 'L-Cmd', MetaRight: 'R-Cmd', CapsLock: 'Caps Lock' };
  if (M[c]) return M[c];
  return c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, 'Arrow ').replace(/^Numpad/, 'Num ');
}
const keys = {};
const held = a => !!keys[KB[a]];
let clickQ = 0, placePress = false, usePress = false, lastWTap = -99, rebinding = null;
function inGame() { return state === 'play' && !paused && game && !game.over; }
glCanvas.addEventListener('click', () => { if (state === 'play' && !paused) lockMouse(); });
function lockMouse() {
  if (freeLook) return;
  try { const p = glCanvas.requestPointerLock(); if (p && p.catch) p.catch(() => { freeLook = true; }); } catch (e) { freeLook = true; }
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === glCanvas;
  if (!locked && state === 'play' && !paused && game && !game.over && !(player && player.dead && game.win === 'last')) pauseGame();
});
document.addEventListener('pointerlockerror', () => { freeLook = true; });
document.addEventListener('mousemove', e => {
  if (!(state === 'play' && !paused && game) || !(locked || freeLook)) return;
  const s = 0.15 * CFG.sens / 100;
  if (player && !player.dead) {
    player.yaw += e.movementX * s;
    player.pitch = clamp(player.pitch + e.movementY * s, -90, 90);
  } else if (game.spec) { game.specYaw = (game.specYaw || 0) + e.movementX * s; }
});
// a "press" is any key / mouse button / wheel notch; every action is looked up through KB
function press(code) {
  if (!inGame() || !player) return;
  if (player.dead) { if (code === KB.attack || code === 'Mouse0') cycleSpectate(); return; }
  for (const [a] of KB_ACTIONS) {
    if (KB[a] !== code) continue;
    if (a === 'attack') { clickQ++; clickTimes.push(performance.now()); }
    else if (a === 'place') placePress = true;
    else if (a === 'use') usePress = true;
    else if (a.startsWith('slot')) { player.select(+a.slice(4) - 1); heldNameT = performance.now(); }
    else if (a === 'nextSlot' || a === 'prevSlot') { player.select((player.sel + (a === 'nextSlot' ? 1 : 8)) % 9); heldNameT = performance.now(); }
    else if (a === 'forward') { if (tick - lastWTap < 7) player.dtap = true; lastWTap = tick; }
    else if (a === 'camera') thirdPerson = !thirdPerson;
    else if (a === 'debug') showDebug = !showDebug;
    else if (a === 'hitboxes') hitboxesOn = !hitboxesOn;
    else if (a === 'scores') $('#score').classList.remove('hidden');
    else if (a === 'pause') { document.exitPointerLock && document.exitPointerLock(); pauseGame(); }
  }
}
function release(code) {
  keys[code] = false;
  if (code === KB.scores) $('#score').classList.add('hidden');
  if (code === KB.forward && player) player.dtap = false;
}
function finishRebind(code) {
  if (code !== 'Escape') { KB[rebinding] = code; saveCfg(); }
  rebinding = null; buildMenu(); SND.click(1);
}
window.addEventListener('mousedown', e => {
  ac();
  const code = 'Mouse' + e.button;
  if (rebinding) { e.preventDefault(); finishRebind(code); return; }
  if (e.target !== glCanvas) return;
  if (!inGame() || (!locked && !freeLook)) return;
  keys[code] = true; press(code);
});
window.addEventListener('mouseup', e => release('Mouse' + e.button));
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('wheel', e => {
  const code = e.deltaY > 0 ? 'WheelDown' : 'WheelUp';
  if (rebinding) { finishRebind(code); return; }
  if (e.deltaY !== 0) press(code);
}, { passive: true });
window.addEventListener('keydown', e => {
  if (rebinding) { e.preventDefault(); finishRebind(e.code); return; }
  const bound = Object.values(KB).includes(e.code);
  if (['Tab', 'F3', 'F5', 'Space'].includes(e.code) || e.code.startsWith('Arrow') || (bound && inGame() && !e.metaKey)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (state !== 'play') return;
  if (e.code === 'Escape' && freeLook && !paused && game && !game.over) { pauseGame(); return; }
  if (e.code === 'F5' && inGame()) thirdPerson = !thirdPerson;
  press(e.code);
});
window.addEventListener('keyup', e => release(e.code));
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ---------------- player control (per tick) ----------------
function playerControl(p) {
  let f = 0, s = 0;
  if (held('forward')) f += 1; if (held('back')) f -= 1;
  if (held('left')) s += 1; if (held('right')) s -= 1;
  p.sneaking = held('sneak');
  const wantSprint = CFG.autoSprint || held('sprint') || p.dtap;
  if (f > 0 && wantSprint && !p.sneaking && !p.using && !p.inWater) p.sprinting = true;
  p.in = { f, s, jump: held('jump') };
  // attack clicks
  const n = Math.min(clickQ, COMBAT18 ? 3 : 2); clickQ = 0;
  for (let i = 0; i < n; i++) {
    if (p.using === 'bow' || p.using === 'eat') break;
    swing(p); p.swings++;
    const hit = pickEntity(p, 3.0);
    if (hit) attack(p, hit.m, hit.dist);
    else { if (!COMBAT18) p.ticksSinceSwing = 0; sfx('swing'); }
  }
  // mining
  let mined = false;
  if (held('break') && !p.using) {
    const d = p.look(), bh = rayBlocks(p.x, p.y + p.eyeH, p.z, d[0], d[1], d[2], 4.5);
    if (bh && !pickEntity(p, 3.0)) { tickMining(p, bh); mined = true; }
  }
  if (!mined) { p.mineProg = 0; p.mineKey = null; }
  // placing blocks
  const h = p.held;
  if (h && h.k === 'block' && h.n > 0 && (held('place') || placePress)) { if (placePress || p.useCD <= 0) { if (tryPlace(p)) p.useCD = 4; } }
  // using items
  if (held('use') || usePress) {
    if (h && h.k === 'bow' && p.arrows > 0) { if (p.using !== 'bow') { p.using = 'bow'; p.useT = 0; } else { p.useT++; if (p.useT === 7) setHeldVisual(p); } }
    else if (h && h.k === 'gapple' && h.n > 0) {
      if (p.using !== 'eat') { p.using = 'eat'; p.useT = 0; }
      else { p.useT++; if (p.useT % 4 === 0) sfx('eat'); if (p.useT >= 32) eatGapple(p); }
    }
    else if (h && h.k === 'sword' && COMBAT18) p.using = 'block';
  } else {
    if (p.using === 'bow') releaseBow(p);
    else if (p.using) { p.using = null; p.useT = 0; }
  }
  placePress = usePress = false;
}

// ---------------- kits & match setup ----------------
const ARMOR_KEYS = Object.keys(ARMOR), TIER_KEYS = Object.keys(TIERS);
function buildKit(isBot, team) {
  let armor = CFG.armor, prot = CFG.prot, wtype = CFG.wtype, tier = CFG.tier, sharp = CFG.sharp;
  if (isBot) {
    if (CFG.botArmor === 'random') { armor = ARMOR_KEYS[(Math.random() * ARMOR_KEYS.length) | 0]; prot = (Math.random() * 5) | 0; }
    else if (CFG.botArmor !== 'same') armor = CFG.botArmor;
    if (CFG.botWeapon === 'random') { wtype = Math.random() < 0.75 ? 'sword' : 'axe'; tier = TIER_KEYS[(Math.random() * TIER_KEYS.length) | 0]; sharp = (Math.random() * 4) | 0; }
    else if (CFG.botWeapon !== 'same') { wtype = 'sword'; tier = CFG.botWeapon; }
  }
  const inv = [];
  if (wtype !== 'fist') inv.push({ k: wtype, tier, sharp });
  const items = !isBot || CFG.botItems;
  const hasBow = CFG.bow && items && CFG.arrows > 0;
  if (hasBow) inv.push({ k: 'bow', power: CFG.power });
  if (CFG.gapples > 0 && items) inv.push({ k: 'gapple', n: CFG.gapples });
  if (!isBot) {
    const wool = team === 'red' ? B.WOOL_R : team === 'blue' ? B.WOOL_B : B.WOOL_W;
    let left = CFG.blocks;
    while (left > 0 && inv.length < 7) { inv.push({ k: 'block', id: wool, n: Math.min(64, left) }); left -= 64; }
    if (CFG.pick) inv.push({ k: 'pick', tier: tier === 'wood' || tier === 'gold' ? 'iron' : tier });
    if (CFG.webs > 0) inv.push({ k: 'block', id: B.WEB, n: CFG.webs });
  }
  while (inv.length < 9) inv.push(null);
  inv.length = 9;
  return { inv, armor, prot, arrows: hasBow ? CFG.arrows : 0 };
}
function clearMatch() {
  for (const m of mobs) if (m.parts) scene.remove(m.parts.root);
  for (const a of arrows) scene.remove(a.mesh);
  mobs = []; arrows = []; player = null; P.n = 0;
  $('#feed').innerHTML = '';
}
function spawnPoint(m, sp) {
  const x = sp[0], z = sp[2];
  let y = sp[1];
  while (y < WY && !boxFree([x - 0.3, y, z - 0.3, x + 0.3, y + 1.8, z + 0.3])) y += 1;
  m.x = m.px = x; m.z = m.pz = z; m.y = m.py = y;
  m.vx = m.vy = m.vz = 0;
  const cx = WX / 2, cz = WZ / 2;
  m.yaw = m.pyaw = Math.atan2(-(cx - x), cz - z) / DEG; m.pitch = 0;
}
function startGame() {
  ac();
  COMBAT18 = CFG.combat === '18';
  clearMatch();
  hideAll();
  const nBots = CFG.mode === 'duel' ? 1 : CFG.bots;
  const seed = (Date.now() & 0xffffff) + 1;
  VOID_Y = -30;
  const nIslands = CFG.mode === 'teams' ? 2 : nBots + 1;
  if (CFG.map === 'bridges') genBridges(seed, nIslands);
  else if (CFG.map === 'plains') genPlains(seed);
  else genArena(seed);
  rebuildAll();
  // participants
  const roster = [];
  const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
  const total = nBots + 1, redSize = Math.ceil(total / 2);
  for (let i = 0; i < total; i++) {
    const isP = i === 0;
    let team = isP ? 'You' : names[i - 1];
    if (CFG.mode === 'teams') team = i < redSize ? 'red' : 'blue';
    roster.push({ isP, team, name: isP ? 'You' : names[i - 1] });
  }
  let id = 0;
  for (const r of roster) {
    const kit = buildKit(!r.isP, r.team);
    const teamCol = r.team === 'red' ? 0xb02a2a : r.team === 'blue' ? 0x2a4ab0 : null;
    const sk = clamp(CFG.skill / 100 + (CFG.mode === 'duel' ? 0 : (Math.random() - 0.5) * 0.12), 0, 1);
    const ag = clamp(CFG.aggro / 100 + (Math.random() - 0.5) * 0.15, 0, 1);
    const m = new Mob({
      id: id++, name: r.name, team: r.team, isPlayer: r.isP,
      color: r.isP ? (teamCol || 0x00a8a8) : (teamCol || BOT_COLS[id % BOT_COLS.length]),
      pants: r.isP ? 0x3a3aa0 : 0x2b3050, hair: r.isP ? '#3b2414' : HAIR[id % HAIR.length], eye: r.isP ? '#4a6aff' : '#3a2a1a',
      teamCol: r.team === 'red' ? '#ff6060' : r.team === 'blue' ? '#7090ff' : r.isP ? '#ffff70' : '#ffffff',
      inv: kit.inv, armor: kit.armor, prot: kit.prot, arrows: kit.arrows, skill: sk, aggro: ag
    });
    m.ai = { n: 0, retarget: 0, t: null, strafeDir: 1, strafeT: 0, mode: 'fight', modeT: 0, state: 'approach', stateT: 0, wtap: 0,
      thr: 0.9, critJump: false, blockT: 0, unreach: 0, ex: 0, ep: 0, los: true, drawTo: 20, weaponSlot: 0 };
    m.ai.thr = newThreshold(m);
    const ws = m.inv.findIndex(it => it && (it.k === 'sword' || it.k === 'axe'));
    m.ai.weaponSlot = ws >= 0 ? ws : Math.max(0, m.inv.findIndex(it => !it));
    m.select(m.ai.weaponSlot >= 0 && !r.isP ? m.ai.weaponSlot : 0);
    if (r.isP) { player = m; m.parts.tag.visible = false; }
    mobs.push(m);
  }
  // spawn placement
  const S = spawns.length;
  if (CFG.map === 'bridges') {
    const isl = spawns.islands;
    if (CFG.mode === 'teams') { let ri = 0, bi = 0; for (const m of mobs) { const base = m.team === 'red' ? 0 : 1; const k = m.team === 'red' ? ri++ : bi++; spawnPoint(m, spawns[(base * 4 + k % 4)]); } }
    else mobs.forEach((m, i) => spawnPoint(m, spawns[((i % isl) * 4 + ((i / isl) | 0) % 4)]));
  } else if (CFG.mode === 'teams') {
    let ri = 0, bi = 0; const half = Math.floor(S / 2);
    for (const m of mobs) { const k = m.team === 'red' ? ri++ : bi++; const off = m.team === 'red' ? 0 : half; spawnPoint(m, spawns[(off + (k % 3) - 1 + S) % S]); }
  } else {
    const off = (Math.random() * S) | 0;
    mobs.forEach((m, i) => spawnPoint(m, spawns[(off + Math.round(i * S / mobs.length)) % S]));
  }
  listener = player;
  game = { countdown: 60, over: false, win: CFG.win, killTarget: CFG.killTarget, spec: null, specYaw: 0, endT: 0 };
  state = 'play'; paused = false; thirdPerson = false;
  centerMsg('3', 'Get ready'); sfx('tick');
  lockMouse();
}
function respawn(m) {
  const enemies = mobs.filter(o => !o.dead && o.team !== m.team);
  let best = spawns[0], bd = -1;
  for (const sp of spawns) {
    let d = 1e9; for (const e of enemies) d = Math.min(d, Math.hypot(e.x - sp[0], e.z - sp[2]));
    if (d > bd) { bd = d; best = sp; }
  }
  const k = JSON.parse(JSON.stringify(m.kitProto));
  m.inv = k.inv; m.arrows = k.arrows;
  m.dead = false; m.health = 20; m.absorption = 0; m.regenFx = 0; m.saturation = 5; m.fallDistance = 0; m.using = null; m.useT = 0;
  m.invul = 40; m.lastHurt = 1e9; m.hurtTime = 0; m.respawnAt = 0; m.deathT = 0; m.combo = 0;
  spawnPoint(m, best);
  m.parts.root.visible = true; m.parts.root.rotation.z = 0;
  m.sel = -1; m.select(m.isPlayer ? 0 : m.ai.weaponSlot);
  drawTag(m);
  if (m === player) { $('#dead').classList.add('hidden'); centerMsg('', ''); }
}
function onDeath(t, killer) {
  if (t === player) {
    for (const k in keys) keys[k] = false;
    if (game.win === 'last') {
      setTimeout(() => {
        if (!game || game.over || state !== 'play') return;
        $('#deadMsg').textContent = t.deathMsg;
        $('#dead').classList.remove('hidden'); document.exitPointerLock && document.exitPointerLock();
      }, 900);
    } else centerMsg('You died', 'Respawning in 3s…');
  }
  checkWin();
}
function teamKills() { const k = {}; for (const m of mobs) k[m.team] = (k[m.team] || 0) + m.kills; return k; }
function checkWin() {
  if (!game || game.over) return;
  if (game.win === 'last') {
    const alive = new Set(mobs.filter(m => !m.dead).map(m => m.team));
    if (alive.size <= 1) endGame([...alive][0]);
  } else {
    const k = teamKills();
    for (const t in k) if (k[t] >= game.killTarget) { endGame(t); return; }
  }
}
function teamLabel(t) { return t === 'red' ? 'RED TEAM' : t === 'blue' ? 'BLUE TEAM' : t === 'You' ? 'YOU' : (t || 'NOBODY').toUpperCase(); }
function endGame(team) {
  game.over = true; game.winner = team;
  const won = player && team === player.team;
  sfx(won ? 'win' : 'lose');
  centerMsg(won ? 'VICTORY!' : teamLabel(team) + ' WINS', won ? 'GG' : '');
  setTimeout(() => {
    if (state !== 'play' || !game || !game.over) return;
    document.exitPointerLock && document.exitPointerLock();
    $('#dead').classList.add('hidden');
    $('#endTitle').textContent = won ? 'VICTORY!' : teamLabel(team) + ' WINS';
    $('#endTitle').style.color = won ? '#7dff6a' : '#ff6a6a';
    const rows = mobs.slice().sort((a, b) => b.kills - a.kills || b.dmgDealt - a.dmgDealt).map(m =>
      `<tr style="color:${m.isPlayer ? '#ffff70' : m.teamCol}"><td>${m.name}</td><td>${m.kills}</td><td>${m.deaths}</td><td>${(m.dmgDealt / 2).toFixed(1)}❤</td><td>${m.hits}</td><td>${m.crits}</td><td>${m.maxCombo}</td><td>${m.swings ? Math.round(100 * Math.min(1, m.mhits / m.swings)) : 0}%</td></tr>`).join('');
    $('#endStats').innerHTML = `<table><tr><th>Player</th><th>Kills</th><th>Deaths</th><th>Damage</th><th>Hits</th><th>Crits</th><th>Best combo</th><th>Accuracy</th></tr>${rows}</table>`;
    $('#end').classList.remove('hidden');
  }, 2200);
}
function cycleSpectate() {
  const alive = mobs.filter(m => !m.dead); if (!alive.length) return;
  const i = alive.indexOf(game.spec); game.spec = alive[(i + 1) % alive.length]; game.specYaw = 0;
}

// ---------------- tick ----------------
function gameTick() {
  tick++;
  if (game.countdown > 0) {
    game.countdown--;
    if (game.countdown > 0 && game.countdown % 20 === 0) { centerMsg(String(game.countdown / 20), 'Get ready'); sfx('tick'); }
    if (game.countdown === 0) { centerMsg('FIGHT!', ''); sfx('go'); setTimeout(() => { if (game && !game.over && $('#center').textContent.startsWith('FIGHT')) centerMsg('', ''); }, 900); }
  }
  for (const m of mobs) { m.px = m.x; m.py = m.y; m.pz = m.z; m.pyaw = m.yaw; m.ppitch = m.pitch; }
  for (const m of mobs) {
    if (m.dead) {
      m.deathT++;
      if (m.deathT === 20 && m.parts) m.parts.root.visible = false;
      if (game.win === 'kills' && !game.over && m.respawnAt && tick >= m.respawnAt) respawn(m);
      continue;
    }
    if (game.over) { m.in = { f: 0, s: 0, jump: false }; m.sprinting = false; }
    else if (m.isPlayer) playerControl(m); else botTick(m);
    physicsTick(m);
    if (m.tagHp !== m.health + m.absorption) drawTag(m);
  }
  for (const a of arrows) tickArrow(a);
  for (let i = arrows.length - 1; i >= 0; i--) if (arrows[i].dead) { scene.remove(arrows[i].mesh); arrows.splice(i, 1); }
  if (player && player.dead && game.win === 'last' && (!game.spec || game.spec.dead)) { const al = mobs.filter(m => !m.dead); game.spec = al[0] || null; }
  if (hitMarker > 0) hitMarker--;
  if (player && player.combo > 0 && player.lastAttacker && tick - player.lastAttackT < 2) { /* combo broken handled in attack() */ }
}

// ---------------- UI helpers ----------------
function centerMsg(big, small) { $('#center').innerHTML = big ? `${big}${small ? `<small>${small}</small>` : ''}` : ''; }
function feed(msg, col) {
  const d = document.createElement('div'); d.textContent = msg; d.style.color = col || '#fff';
  const f = $('#feed'); f.prepend(d); while (f.children.length > 6) f.lastChild.remove();
  setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 600); }, 6000);
}
function hideAll() { for (const id of ['#menu', '#pause', '#end', '#dead']) $(id).classList.add('hidden'); centerMsg('', ''); }
function pauseGame() { paused = true; $('#pause').classList.remove('hidden'); for (const k in keys) keys[k] = false; }
function resumeGame() { $('#pause').classList.add('hidden'); paused = false; lockMouse(); }
function toMenu() {
  document.exitPointerLock && document.exitPointerLock();
  state = 'menu'; paused = false; game = null; clearMatch(); hideAll();
  $('#menu').classList.remove('hidden'); $('#tinfo').innerHTML = ''; $('#dbg').textContent = ''; $('#score').classList.add('hidden');
  genArena(7); rebuildAll(); buildMenu();
}
$('#play').onclick = () => {
  saveCfg();
  if ($('#play').dataset.resume) { delete $('#play').dataset.resume; $('#play').textContent = 'PLAY'; $('#menu').classList.add('hidden'); camera.fov = CFG.fov; resumeGame(); return; }
  startGame();
};
$('#resume').onclick = resumeGame;
$('#pControls').onclick = () => { $('#pause').classList.add('hidden'); $('#menu').classList.remove('hidden'); $('#play').textContent = 'BACK TO GAME'; $('#play').dataset.resume = 1; buildMenu(); };
$('#restart').onclick = () => startGame();
$('#quit').onclick = () => toMenu();
$('#again').onclick = () => startGame();
$('#endMenu').onclick = () => toMenu();
$('#deadRestart').onclick = () => startGame();
$('#deadMenu').onclick = () => toMenu();
$('#spectate').onclick = () => { $('#dead').classList.add('hidden'); cycleSpectate(); lockMouse(); };

// ---------------- menu ----------------
const ARMOR_CH = ARMOR_KEYS.map(k => [k, ARMOR[k].n]);
const MENU = [
  { t: 'Match', rows: [
    ['mode', 'Mode', 'ch', [['duel', 'Duel 1v1'], ['ffa', 'Free-for-all'], ['teams', 'Team fight']]],
    ['bots', 'Number of bots (players)', 'rng', [1, 15, 1]],
    ['skill', 'Bot skill', 'rng', [0, 100, 5, '%']],
    ['aggro', 'Bot aggression', 'rng', [0, 100, 5, '%']],
    ['win', 'Win condition', 'ch', [['last', 'Last one standing'], ['kills', 'First to X kills']]],
    ['killTarget', 'Kills to win', 'rng', [1, 30, 1]],
    ['map', 'Map', 'ch', [['arena', 'Arena'], ['bridges', 'Sky Bridges (void)'], ['plains', 'Plains']]],
    ['combat', 'Combat version', 'ch', [['19', '1.9+ cooldown'], ['18', '1.8 spam-click / combos']]]
  ] },
  { t: 'Your kit', rows: [
    ['armor', 'Armour', 'ch', ARMOR_CH],
    ['prot', 'Protection (each piece)', 'rng', [0, 4, 1]],
    ['wtype', 'Weapon', 'ch', [['sword', 'Sword'], ['axe', 'Axe'], ['fist', 'Fists']]],
    ['tier', 'Weapon material', 'ch', TIER_KEYS.map(k => [k, TIERS[k].n])],
    ['sharp', 'Sharpness', 'rng', [0, 5, 1]],
    ['bow', 'Bow & arrows', 'tg'],
    ['arrows', 'Arrows', 'rng', [1, 64, 1]],
    ['power', 'Bow power', 'rng', [0, 5, 1]],
    ['gapples', 'Golden apples', 'rng', [0, 16, 1]],
    ['blocks', 'Building blocks', 'rng', [0, 192, 16]],
    ['webs', 'Cobwebs', 'rng', [0, 16, 1]],
    ['pick', 'Pickaxe', 'tg']
  ] },
  { t: 'Bots & settings', rows: [
    ['botArmor', 'Bot armour', 'ch', [['same', 'Same as you'], ['random', 'Random']].concat(ARMOR_CH)],
    ['botWeapon', 'Bot weapon', 'ch', [['same', 'Same as you'], ['random', 'Random']].concat(TIER_KEYS.map(k => [k, TIERS[k].n + ' sword']))],
    ['botItems', 'Bots get bow + golden apples', 'tg'],
    ['regen', 'Natural regeneration', 'tg'],
    ['autoSprint', 'Toggle sprint (always sprint)', 'tg'],
    ['sens', 'Mouse sensitivity', 'rng', [10, 300, 5, '%']],
    ['fov', 'FOV', 'rng', [60, 110, 1]],
    ['vol', 'Volume', 'rng', [0, 100, 5, '%']]
  ] }
];
function buildMenu() {
  const cols = $('#cols'); cols.innerHTML = '';
  for (const sec of MENU) {
    const p = document.createElement('div'); p.className = 'panel';
    p.innerHTML = `<h2>${sec.t}</h2>`;
    for (const [k, label, type, arg] of sec.rows) {
      const row = document.createElement('div'); row.className = 'row';
      const lab = document.createElement('label'); lab.textContent = label; row.appendChild(lab);
      const dis = (k === 'bots' && CFG.mode === 'duel') || (k === 'killTarget' && CFG.win !== 'kills') || ((k === 'arrows' || k === 'power') && !CFG.bow);
      if (type === 'ch') {
        for (const [v, txt] of arg) {
          const b = document.createElement('button'); b.className = 'mc' + (CFG[k] === v ? ' on' : ''); b.textContent = txt;
          b.onclick = () => { CFG[k] = v; saveCfg(); buildMenu(); SND.click(1); };
          row.appendChild(b);
        }
      } else if (type === 'tg') {
        const b = document.createElement('button'); b.className = 'mc' + (CFG[k] ? ' on' : ''); b.textContent = CFG[k] ? 'ON' : 'OFF';
        b.onclick = () => { CFG[k] = !CFG[k]; saveCfg(); buildMenu(); SND.click(1); };
        row.appendChild(b);
      } else {
        const val = document.createElement('span'); val.className = 'val';
        const fmt = () => { val.textContent = k === 'bots' && CFG.mode === 'duel' ? '1 (duel)' : k === 'bots' && CFG.mode === 'teams' ? `${CFG[k]} → ${Math.ceil((CFG[k] + 1) / 2)}v${Math.floor((CFG[k] + 1) / 2)}` : CFG[k] + (arg[3] || ''); };
        fmt(); lab.appendChild(val);
        const r = document.createElement('input'); r.type = 'range'; r.min = arg[0]; r.max = arg[1]; r.step = arg[2]; r.value = CFG[k]; r.disabled = dis;
        r.oninput = () => { CFG[k] = +r.value; fmt(); saveCfg(); if (k === 'fov') { camera.fov = CFG.fov; camera.updateProjectionMatrix(); } };
        row.appendChild(r);
      }
      if (dis) row.style.opacity = 0.45;
      p.appendChild(row);
    }
    cols.appendChild(p);
  }
  const p = document.createElement('div'); p.className = 'panel';
  p.innerHTML = '<h2>Controls <span style="font-size:18px;color:#aaa">(click, then press any key / mouse button / wheel · Esc cancels)</span></h2>';
  const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center';
  for (const [a, label] of KB_ACTIONS) {
    const l = document.createElement('div'); l.textContent = label; l.style.cssText = 'font-size:20px;color:#bbb';
    const dup = KB[a] && KB_ACTIONS.some(([o]) => o !== a && KB[o] === KB[a] && !['attack', 'break', 'place', 'use'].includes(o) && !['attack', 'break', 'place', 'use'].includes(a));
    const b = document.createElement('button'); b.className = 'mc' + (rebinding === a ? ' on' : ''); b.style.minWidth = '150px';
    b.textContent = rebinding === a ? '> press a key <' : keyName(KB[a]); if (dup) b.style.color = '#ff7070';
    b.onclick = e => { e.stopPropagation(); rebinding = a; buildMenu(); };
    grid.appendChild(l); grid.appendChild(b);
  }
  p.appendChild(grid);
  const rs = document.createElement('button'); rs.className = 'mc'; rs.textContent = 'Reset controls'; rs.style.marginTop = '8px';
  rs.onclick = () => { Object.assign(KB, KB_DEF); saveCfg(); buildMenu(); };
  p.appendChild(rs);
  cols.appendChild(p);
}

// ---------------- HUD ----------------
function pat(rows, colors) {
  const c = cv(rows[0].length, rows.length), g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (colors[ch]) { g.fillStyle = colors[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
const HEART = ['.XX.XX..', 'XRWXRRX.', 'XWRRRRRX', 'XRRRRRRX', '.XRRRRX.', '..XRRX..', '...XX...'].map(r => r.padEnd(9, '.'));
const HEART9 = ['.XXX.XXX.', 'XRWRXRRRX', 'XWRRRRRRX', 'XRRRRRRRX', '.XRRRRRX.', '..XRRRX..', '...XRX...', '....X....'];
function heartC(mode, gold) {
  const red = gold ? '#e8b800' : '#d81818', hi = gold ? '#fff2a0' : '#ff9a9a', empty = '#2a2a2a';
  const rows = HEART9.map(r => [...r].map((ch, x) => {
    if (ch === 'X') return 'X';
    if (ch === '.') return '.';
    const filled = mode === 'full' || (mode === 'half' && x <= 4);
    return filled ? (ch === 'W' ? 'W' : 'R') : 'E';
  }).join(''));
  return pat(rows, { X: '#000', R: red, W: hi, E: empty });
}
const HC = { full: heartC('full'), half: heartC('half'), empty: heartC('empty'), gfull: heartC('full', true), ghalf: heartC('half', true) };
const ARM9 = ['.XXX.XXX.', 'XLLLXLLLX', 'XLLLLLLLX', '.XLLLLLX.', '.XLLLLLX.', '.XLLLLLX.', '.XLLLLLX.', '.XXXXXXX.'];
function armC(mode) { return pat(ARM9.map(r => [...r].map((ch, x) => ch === 'L' ? (mode === 'full' || (mode === 'half' && x <= 4) ? 'L' : 'E') : ch).join('')), { X: '#111', L: '#d8d8d8', E: '#3a3a3a' }); }
const AC9 = { full: armC('full'), half: armC('half'), empty: armC('empty') };
const FOOD = pat(['......XX.', '.....XWWX', '....XWWX.', '.XXXBBX..', 'XBBBBBX..', 'XBRBBX...', 'XBBBX....', '.XXX.....'], { X: '#2a1608', W: '#f0e0d0', B: '#b8682a', R: '#e08a4a' });

function txt(s, x, y, size, col, align) {
  const g = hctx; g.font = `${size}px VT323, monospace`; g.textAlign = align || 'left';
  g.fillStyle = 'rgba(0,0,0,.85)'; g.fillText(s, x + size / 10, y + size / 10);
  g.fillStyle = col || '#fff'; g.fillText(s, x, y);
}
function drawHUD(alpha) {
  const g = hctx; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
  if (state !== 'play' || !game) return;
  const p = player; const gs = clamp(Math.floor(Math.min(W / 300, H / 230)), 2, 4);
  const spec = p.dead && game.spec;
  // damage vignette
  if (!p.dead && (p.hurtTime > 0 || p.health <= 6)) {
    const a = Math.max(p.hurtTime / 10 * 0.45, p.health <= 6 ? 0.18 + 0.08 * Math.sin(performance.now() / 200) : 0);
    const rg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    rg.addColorStop(0, 'rgba(255,0,0,0)'); rg.addColorStop(1, `rgba(200,0,0,${a})`); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }
  if (!p.dead) {
    // crosshair (inverted like MC)
    const cx = Math.round(W / 2), cy = Math.round(H / 2), cs = 5 * gs, cw = Math.max(2, Math.round(gs * 0.7));
    g.save(); g.globalCompositeOperation = 'difference'; g.fillStyle = '#fff';
    g.fillRect(cx - cs, cy - cw / 2, cs * 2, cw); g.fillRect(cx - cw / 2, cy - cs, cw, cs * 2); g.restore();
    if (hitMarker > 0) { g.fillStyle = 'rgba(255,60,60,.9)'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillRect(cx + dx * 5 * gs - gs, cy + dy * 5 * gs - gs, 2 * gs, 2 * gs); }
    // attack cooldown indicator (1.9) / bow charge
    let bar = -1;
    if (p.using === 'bow') bar = arrowVelocityScale(p.useT);
    else if (!COMBAT18) { const c = cooldown(p); if (c < 1) bar = c; }
    if (bar >= 0) {
      const bw = 16 * gs, bh = 2 * gs, bx2 = cx - bw / 2, by = cy + 9 * gs;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(bx2 - gs / 2, by - gs / 2, bw + gs, bh + gs);
      g.fillStyle = bar >= 1 ? '#fff' : '#bbb'; g.fillRect(bx2, by, bw * bar, bh);
    }
    // ready-to-hit marker
    if (!COMBAT18 && cooldown(p) >= 1 && pickEntity(p, 3)) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(cx - gs, cy + 9 * gs, 2 * gs, 2 * gs); }
    // hotbar
    const hw = 182 * gs, hh = 22 * gs, hx = Math.round((W - hw) / 2), hy = H - hh - 4;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(hx, hy, hw, hh);
    g.strokeStyle = 'rgba(160,160,160,.8)'; g.lineWidth = gs; g.strokeRect(hx + gs / 2, hy + gs / 2, hw - gs, hh - gs);
    for (let i = 0; i < 9; i++) {
      const sx = hx + gs + i * 20 * gs, it = p.inv[i];
      if (i > 0) { g.fillStyle = 'rgba(120,120,120,.6)'; g.fillRect(sx - gs / 2, hy + gs, gs / 2, hh - 2 * gs); }
      if (it && !(it.n !== undefined && it.n <= 0)) {
        const ic = itemIcon(it); g.drawImage(ic, sx + 2 * gs, hy + 3 * gs, 16 * gs, 16 * gs);
        const cnt = it.k === 'bow' ? p.arrows : it.n;
        if (cnt !== undefined && cnt !== 1) txt(String(cnt), sx + 19 * gs, hy + 20 * gs, 9 * gs, '#fff', 'right');
        if (it.sharp || it.power) { g.fillStyle = `rgba(170,90,255,${0.08 + 0.06 * Math.sin(performance.now() / 300 + i)})`; g.fillRect(sx + 2 * gs, hy + 3 * gs, 16 * gs, 16 * gs); }
      }
    }
    g.strokeStyle = '#fff'; g.lineWidth = gs * 1.2; g.strokeRect(hx + p.sel * 20 * gs - gs * 0.1 + gs * 0.5, hy - gs + gs * 0.5, 22 * gs, 24 * gs);
    // held item name
    const since = performance.now() - heldNameT;
    if (since < 2000) { g.globalAlpha = clamp((2000 - since) / 400, 0, 1); txt(itemName(p.held), W / 2, hy - 30 * gs - (ARMOR[p.armor].pts ? 10 * gs : 0), 10 * gs, '#fff', 'center'); g.globalAlpha = 1; }
    // hearts
    const hpY = hy - 11 * gs, shake = p.health <= 4 ? 1 : 0;
    const hpPts = Math.ceil(p.health);
    for (let i = 0; i < 10; i++) {
      const x = hx + i * 8 * gs, y = hpY + (shake ? Math.round((Math.random() - 0.5) * 2) * gs : 0) + (p.regenFx > 0 && ((tick + i) % 10 === 0) ? -2 * gs : 0);
      g.drawImage(HC.empty, x, y, 9 * gs, 8 * gs);
      const v = hpPts - i * 2;
      if (v >= 2) g.drawImage(HC.full, x, y, 9 * gs, 8 * gs); else if (v === 1) g.drawImage(HC.half, x, y, 9 * gs, 8 * gs);
    }
    let rowY = hpY - 10 * gs;
    if (p.absorption > 0) {
      const ab = Math.ceil(p.absorption);
      for (let i = 0; i < Math.ceil(ab / 2); i++) g.drawImage(ab - i * 2 >= 2 ? HC.gfull : HC.ghalf, hx + i * 8 * gs, rowY, 9 * gs, 8 * gs);
      rowY -= 10 * gs;
    }
    const ap = ARMOR[p.armor].pts;
    if (ap > 0) for (let i = 0; i < 10; i++) { const v = ap - i * 2; g.drawImage(v >= 2 ? AC9.full : v === 1 ? AC9.half : AC9.empty, hx + i * 8 * gs, rowY, 9 * gs, 8 * gs); }
    for (let i = 0; i < 10; i++) g.drawImage(FOOD, hx + hw - (i + 1) * 8 * gs - gs, hpY, 9 * gs, 8 * gs);
    // combo / reach
    if (p.combo >= 2) txt(`${p.combo} COMBO`, cx + 14 * gs, cy - 6 * gs, 10 * gs, p.combo >= 5 ? '#ffaa00' : '#ffff70');
  }
  // top-left info
  const now = performance.now(); while (clickTimes.length && now - clickTimes[0] > 1000) clickTimes.shift();
  if (!showDebug) {
    const alive = mobs.filter(m => !m.dead).length;
    const goal = game.win === 'kills' ? `First to ${game.killTarget}: ` + Object.entries(teamKills()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, k]) => `${t === 'You' ? 'You' : t} ${k}`).join(' · ') : `Alive: ${alive}/${mobs.length}`;
    $('#dbg').textContent = `${goal}\nCPS ${clickTimes.length}  ·  Reach ${p.lastHitReach ? p.lastHitReach.toFixed(2) : '-'}  ·  ${COMBAT18 ? '1.8' : '1.9+'}  ·  ${fps | 0} fps` + (spec ? `\nSpectating ${game.spec.name} (click to switch)` : '');
  } else {
    const t = targetInfo;
    $('#dbg').textContent = `Block Brawl  ${fps | 0} fps  tick ${tick}\nXYZ ${p.x.toFixed(3)} / ${p.y.toFixed(3)} / ${p.z.toFixed(3)}\nVel ${p.vx.toFixed(3)} ${p.vy.toFixed(3)} ${p.vz.toFixed(3)}  (${(Math.hypot(p.vx, p.vz) * 20).toFixed(2)} b/s)\nYaw ${wrapDeg(p.yaw).toFixed(1)}  Pitch ${p.pitch.toFixed(1)}\nonGround ${p.onGround}  sprint ${p.sprinting}  fall ${p.fallDistance.toFixed(2)}\nwater ${p.inWater}  web ${p.inWeb}  hitStun ${p.hitStun}\ncooldown ${cooldown(p).toFixed(2)}  iFrames ${p.invul}  lastHurt ${p.lastHurt.toFixed(2)}\n` +
      (t ? `target ${t.name}: hp ${t.health.toFixed(1)} abs ${t.absorption} iFrames ${t.invul} state ${t.ai ? t.ai.mode + '/' + t.ai.state : '-'}` : '');
  }
  // target info bar
  if (targetInfo && now - targetInfoT < 3000 && !targetInfo.dead) {
    const t = targetInfo, hpPct = clamp(t.health / 20, 0, 1) * 100, abPct = clamp(t.absorption / 20, 0, 1) * 100;
    $('#tinfo').innerHTML = `<span style="color:${t.teamCol}">${t.name}</span> ${(t.health / 2).toFixed(1)}❤${t.absorption > 0 ? ` +${(t.absorption / 2).toFixed(0)}` : ''}<div class="bar"><div style="width:${hpPct}%;float:left"></div><div class="ab" style="width:${abPct}%;float:left"></div></div>`;
  } else $('#tinfo').innerHTML = '';
  // scoreboard
  if (!$('#score').classList.contains('hidden')) {
    $('#score').innerHTML = `<table><tr><th>Player</th><th>Kills</th><th>Deaths</th><th>Health</th></tr>${mobs.slice().sort((a, b) => b.kills - a.kills).map(m =>
      `<tr style="color:${m.isPlayer ? '#ffff70' : m.teamCol}"><td>${m.name}${CFG.mode === 'teams' ? ` [${m.team}]` : ''}</td><td>${m.kills}</td><td>${m.deaths}</td><td>${m.dead ? '☠' : ((m.health + m.absorption) / 2).toFixed(1) + '❤'}</td></tr>`).join('')}</table>`;
  }
}

// ---------------- render ----------------
const _v = new THREE.Vector3();
let fovNow = CFG.fov;
function updateModels(alpha) {
  for (const m of mobs) {
    const pr = m.parts; if (!pr) continue;
    const x = lerp(m.px, m.x, alpha), y = lerp(m.py, m.y, alpha), z = lerp(m.pz, m.z, alpha);
    pr.root.position.set(x, y - (m.sneaking ? 0.12 : 0), z);
    const yaw = m.isPlayer ? m.yaw : m.pyaw + wrapDeg(m.yaw - m.pyaw) * alpha;
    pr.root.rotation.y = -yaw * DEG;
    pr.head.rotation.x = clamp(m.isPlayer ? m.pitch : lerp(m.ppitch, m.pitch, alpha), -80, 80) * DEG;
    pr.body.rotation.x = m.sneaking ? 0.35 : 0;
    pr.head.rotation.x -= m.sneaking ? 0.35 : 0;
    const L = m.limb + (m.limb - (m.limb - 0)) * 0, amp = m.limbAmp;
    const sw = Math.cos(L * 0.6662) * 1.1 * amp;
    pr.legR.rotation.x = sw; pr.legL.rotation.x = -sw;
    pr.armL.rotation.x = sw * 0.8; pr.armR.rotation.x = -sw * 0.8; pr.armR.rotation.z = 0; pr.armL.rotation.z = 0;
    if (m.swingT > 0) {
      const p = clamp(1 - (m.swingT - alpha) / 6, 0, 1), s1 = Math.sin(Math.sqrt(p) * Math.PI);
      pr.armR.rotation.x = -1.2 - s1 * 0.9 + p * 1.2; pr.armR.rotation.z = -s1 * 0.4;
    }
    if (m.using === 'bow') { pr.armR.rotation.x = -Math.PI / 2 + m.pitch * DEG * -1 * -1; pr.armL.rotation.x = -Math.PI / 2 + m.pitch * DEG; pr.armL.rotation.z = -0.4; }
    else if (m.using === 'block') { pr.armR.rotation.x = -0.9; pr.armR.rotation.z = 0.5; }
    else if (m.using === 'eat') { pr.armR.rotation.x = -1.3 + Math.sin(performance.now() / 70) * 0.15; pr.armR.rotation.z = 0.5; }
    // hurt red tint / death
    const red = m.hurtTime > 0 || m.dead;
    for (const mt of m.mats) { if (mt.emissive) mt.emissive.setHex(red ? 0x880000 : (mt === m.armorMat && m.prot > 0 ? 0x2a1040 : 0)); }
    if (m.dead) pr.root.rotation.z = Math.min(1, (m.deathT + alpha) / 10) * Math.PI / 2;
    const fp = m === player && !thirdPerson && !m.dead;
    pr.root.visible = !fp && !(m.dead && m.deathT >= 20);
    pr.hb.visible = hitboxesOn && !m.dead; pr.look.visible = hitboxesOn && !m.dead;
    pr.look.rotation.x = 0;
    if (m.held !== pr.lastHeld || m.using !== pr.lastUsing) { setHeldVisual(m); pr.lastHeld = m.held; pr.lastUsing = m.using; }
    if (m.held && m.held.n !== undefined && m.held.n <= 0) pr.held.visible = false;
  }
  for (const a of arrows) {
    const x = a.inGround ? a.x : lerp(a.px, a.x, alpha), y = a.inGround ? a.y : lerp(a.py, a.y, alpha), z = a.inGround ? a.z : lerp(a.pz, a.z, alpha);
    a.mesh.position.set(x, y, z);
    if (!a.inGround) { _v.set(x + a.vx, y + a.vy, z + a.vz); a.mesh.lookAt(_v); }
  }
}
function updateCamera(alpha, dt) {
  const p = player;
  let ex, ey, ez, yaw, pitch;
  if (state === 'menu' || !p) {
    const t = performance.now() / 1000 * 0.05;
    ex = WX / 2 + Math.cos(t) * WX * 0.55; ez = WZ / 2 + Math.sin(t) * WZ * 0.55; ey = WY * 0.55;
    camera.position.set(ex, ey, ez); camera.lookAt(WX / 2, WY * 0.18, WZ / 2);
    vm.visible = false; return;
  }
  const spec = p.dead && game && game.spec;
  const who = spec ? game.spec : p;
  ex = lerp(who.px, who.x, alpha); ey = lerp(who.py, who.y, alpha) + who.eyeH; ez = lerp(who.pz, who.z, alpha);
  yaw = who.yaw + (spec ? game.specYaw : 0); pitch = spec ? 20 : who.pitch;
  if (p.dead && !spec) { ey = lerp(p.py, p.y, alpha) + 0.3; yaw = p.yaw; pitch = p.pitch; }
  // walk bob
  if (!spec && !p.dead && !thirdPerson && p.onGround) ey += Math.abs(Math.sin(p.limb * 0.6662 * 0.5)) * 0.05 * p.limbAmp;
  const d = [-Math.sin(yaw * DEG) * Math.cos(pitch * DEG), -Math.sin(pitch * DEG), Math.cos(yaw * DEG) * Math.cos(pitch * DEG)];
  if (thirdPerson || spec) {
    let dist = 4;
    const h = rayBlocks(ex, ey, ez, -d[0], -d[1], -d[2], dist);
    if (h && isSolid(h.id)) dist = Math.max(0.3, h.dist - 0.2);
    ex -= d[0] * dist; ey -= d[1] * dist; ez -= d[2] * dist;
  }
  camera.position.set(ex, ey, ez);
  camera.rotation.y = Math.PI - yaw * DEG; camera.rotation.x = -pitch * DEG;
  // hurt camera tilt
  camera.rotation.z = p.hurtTime > 0 && !spec ? -Math.sin(((p.hurtTime - alpha) / 10) * Math.PI) * 0.12 : 0;
  // FOV: sprint widens, bow zooms
  let tf = CFG.fov * (p.sprinting ? 1.1 : 1);
  if (p.using === 'bow') tf *= 1 - 0.15 * arrowVelocityScale(p.useT);
  fovNow = lerp(fovNow, tf, Math.min(1, dt * 10));
  if (Math.abs(camera.fov - fovNow) > 0.01) { camera.fov = fovNow; camera.updateProjectionMatrix(); }
  // view model
  vm.visible = !thirdPerson && !p.dead && !spec;
  if (vm.visible) {
    const it = p.held && !(p.held.n !== undefined && p.held.n <= 0) ? p.held : null;
    const ic = it ? (it.k === 'bow' && p.using === 'bow' && p.useT > 6 ? ICON.bowPull : itemIcon(it)) : null;
    vmArm.visible = !ic; vmItem.visible = !!ic;
    if (ic && vmItem.material.map !== canvasTex(ic)) { vmItem.material.map = canvasTex(ic); vmItem.material.needsUpdate = true; }
    let px = 0.36, py = -0.3, pz = -0.55, rx = 0, ry = 0.55, rz = 0;
    const bob = Math.sin(p.limb * 0.6662 * 0.5) * 0.03 * p.limbAmp;
    px += bob; py -= Math.abs(bob);
    if (p.swingT > 0) {
      const s = clamp(1 - (p.swingT - alpha) / 6, 0, 1), a = Math.sin(Math.sqrt(s) * Math.PI), b2 = Math.sin(s * Math.PI);
      px -= a * 0.25; py += Math.sin(Math.sqrt(s) * Math.PI * 2) * 0.12; pz -= b2 * 0.15; rx -= b2 * 0.9; ry += a * 0.5; rz += a * 0.3;
    }
    if (p.using === 'bow') { px = 0.12; py = -0.2; pz = -0.5 + arrowVelocityScale(p.useT) * 0.08; ry = 0.2; rz = 0.2; }
    else if (p.using === 'eat') { px = 0.14; py = -0.22 + Math.abs(Math.sin(performance.now() / 80)) * 0.03; ry = 0.2; }
    else if (p.using === 'block') { px = 0.2; py = -0.25; rx = 0.2; ry = 1.0; rz = -0.6; }
    if (game && game.countdown > 0) { }
    if (ic) {
      const blocky = it.k === 'block' || it.k === 'gapple';
      vmItem.position.set(px, py, pz); vmItem.rotation.set(rx, ry + (blocky ? 0.4 : 0), rz);
      vmItem.scale.set(blocky ? 0.55 : -1, blocky ? 0.55 : 1, 1);
    } else {
      vmArm.position.set(px + 0.12, py - 0.15, pz + 0.05); vmArm.rotation.set(-1.2 + rx, ry + 0.3, rz + 0.25);
    }
  }
  // block outline / cracks
  selBox.visible = crackBox.visible = false;
  if (!p.dead && !spec) {
    const dd = p.look(), h = rayBlocks(p.x, p.y + p.eyeH, p.z, dd[0], dd[1], dd[2], 4.5);
    if (h && !pickEntity(p, 3)) {
      selBox.visible = true; selBox.position.set(h.x + 0.5, h.y + 0.5, h.z + 0.5);
      if (p.mineProg > 0 && p.mineKey === h.x + ',' + h.y + ',' + h.z) {
        crackBox.visible = true; crackBox.position.copy(selBox.position);
        const st = clamp((p.mineProg * 10) | 0, 0, 9); if (crackMat.map !== crackTex[st]) { crackMat.map = crackTex[st]; crackMat.needsUpdate = true; }
      }
    }
  }
}
let lastT = performance.now(), acc = 0, fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  stepAndRender(dt);
}
function stepAndRender(dt) {
  if (state === 'play' && game && !paused) {
    acc += dt; let n = 0;
    while (acc >= 0.05 && n < 5) { gameTick(); acc -= 0.05; n++; }
    if (n >= 5) acc = 0;
  }
  const alpha = clamp(acc / 0.05, 0, 1);
  updateChunks();
  updateModels(alpha);
  updateCamera(alpha, dt);
  sun.position.set(camera.position.x + 120, camera.position.y + 160, camera.position.z + 60); sun.lookAt(camera.position);
  clouds.position.x = (performance.now() / 1000 * 0.8) % 300 - 0;
  updateParticles(dt);
  renderer.render(scene, camera);
  drawHUD(alpha);
}
// debug / test hooks
window.G = { keys: null, get game() { return game; }, get mobs() { return mobs; }, get player() { return player; }, CFG, startGame, gameTick, stepAndRender, toMenu,
  run(n) { for (let i = 0; i < n; i++) gameTick(); stepAndRender(0); }, setCfg(o) { Object.assign(CFG, o); saveCfg(); } };

G.keys = keys; G.KB = KB;
// boot
genArena(7); rebuildAll(); buildMenu();
requestAnimationFrame(frame);
