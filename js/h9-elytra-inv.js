// ================= ELYTRA (no rockets) · BACKPACK INVENTORY (E) =================

// ---------- elytra ----------
// Keep an elytra anywhere in your inventory and it's on your back. Press jump in mid-air to glide.
// No rockets: you get height from wind charges, walls, towers and cliffs. Look down to dive, up to climb (bleeds speed).
ICON.elytra = pxArt(px => {
  const O = '#3c3a52', M = '#8e8aa8', L = '#c9c4dc';
  for (let y = 2; y < 15; y++) for (let x = 1; x < 15; x++) {
    const wing = x < 8 ? x : 15 - x, top = 2 + Math.abs(7.5 - x) * 0.3;
    if (y < top || y > 3 + wing * 1.6) continue;
    const edge = y <= top + 0.8 || y >= 2 + wing * 1.6 || x === 7 || x === 8;
    px(x, y, edge ? O : (x + y) % 3 === 0 ? L : M);
  }
});
const _itemIconEly = itemIcon;
itemIcon = function (it) { if (it && it.k === 'elytra') return ICON.elytra; return _itemIconEly(it); };
const _itemNameEly = itemName;
itemName = function (it) { if (it && it.k === 'elytra') return 'Elytra (hold jump in mid-air for ~1 s to glide · rockets boost you)'; return _itemNameEly(it); };
function hasElytra(m) { return !!(m.inv.some(i => i && i.k === 'elytra') || (m.bag && m.bag.some(i => i && i.k === 'elytra'))); }
if (CFG.elytra === undefined) CFG.elytra = false; DEF.elytra = false;
const _startGameEly = startGame;
startGame = function () {
  _startGameEly();
  if (!game || !player) return;
  if (!player.bag) player.bag = new Array(27).fill(null);
  if (CFG.elytra && !game.mafia && !hasElytra(player)) {
    const i = player.inv.findIndex(s => !s); if (i >= 0) player.inv[i] = { k: 'elytra' }; else player.bag[player.bag.findIndex(s => !s)] = { k: 'elytra' };
    player.kitProto = JSON.parse(JSON.stringify({ inv: player.inv, arrows: player.arrows }));
  }
  addWings(player);
};
G.startGame = startGame;
function addWings(m) {
  if (!m.parts || !m.parts.body || m._wings) return;
  const mat = new THREE.MeshLambertMaterial({ color: 0x8e8aa8 });
  const g = new THREE.Group(); g.position.set(0, 22 * PX, 3 * PX); m.parts.body.add(g);
  const mk = s => { const w = new THREE.Mesh(new THREE.BoxGeometry(5 * PX, 18 * PX, 1 * PX), mat); w.position.set(s * 3 * PX, -8 * PX, 0); w.rotation.z = s * 0.18; g.add(w); return w; };
  m._wings = { g, l: mk(-1), r: mk(1) };
}
const _updateModelsEly = updateModels;
updateModels = function (alpha) {
  _updateModelsEly(alpha);
  for (const m of mobs) if (m._wings) {
    m._wings.g.visible = hasElytra(m) && !m.dead;
    const open = m.gliding ? 0.9 : 0.18;
    m._wings.l.rotation.z = lerp(m._wings.l.rotation.z, -open, 0.2); m._wings.r.rotation.z = lerp(m._wings.r.rotation.z, open, 0.2);
  }
};
SND.glide = v => { noise(0.35, 0.18 * v, 700, 0.5, 0, 'bandpass'); };
// hold jump in the air for 2 seconds to open the elytra (so it never pops open by accident)
const _gameTickElyHold = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickElyHold();
  if (tick === t0 || !player || !game) return;
  const p = player;
  if (p.dead || p.onGround || p.inWater || p.inWeb || p.gliding || !hasElytra(p) || !held('jump') || !inGame()) { p.elyHold = 0; return; }
  p.elyHold = (p.elyHold || 0) + 1;
  if (p.elyHold >= 24) { p.gliding = true; p.glideT = 0; p.elyHold = 0; sfx('glide'); }
};
const _drawHUDElyHold = drawHUD;
drawHUD = function (a) {
  _drawHUDElyHold(a);
  const p = player; if (state !== 'play' || !p || !(p.elyHold > 4)) return;
  const k = Math.min(1, p.elyHold / 24); hctx.fillStyle = 'rgba(0,0,0,.5)'; hctx.fillRect(W / 2 - 60, H / 2 + 60, 120, 6); hctx.fillStyle = '#d8d0ff'; hctx.fillRect(W / 2 - 60, H / 2 + 60, 120 * k, 6);
  txt('opening elytra…', W / 2, H / 2 + 82, 14, '#d8d0ff', 'center');
};
// a second sprint key (Ctrl + W closes browser tabs) — Q by default, rebindable
KB_ACTIONS.splice(KB_ACTIONS.findIndex(a => a[0] === 'sprint') + 1, 0, ['sprint2', 'Sprint (second key)', 'KeyQ']);
KB_DEF.sprint2 = 'KeyQ'; if (KB.sprint2 === undefined) KB.sprint2 = 'KeyQ';
const _playerControlSprint2 = playerControl;
playerControl = function (p) {
  if (p === player && held('sprint2') && held('forward')) p.dtap = true;
  return _playerControlSprint2(p);
};
const _travelEly = travel;
travel = function (e, strafe, forward) {
  if (e.gliding && (e.onGround || e.inWater || e.inWeb || e.dead || !hasElytra(e))) e.gliding = false;
  if (!e.gliding) return _travelEly(e, strafe, forward);
  e.glideT = (e.glideT || 0) + 1;
  const f = e.pitch * DEG, d = e.look(), hor = Math.hypot(d[0], d[2]), sp = Math.hypot(e.vx, e.vz);
  let c = Math.cos(f); c = c * c;
  e.vy += -0.08 + c * 0.06;
  if (e.vy < 0 && hor > 0) { const k = e.vy * -0.1 * c; e.vy += k; e.vx += d[0] / hor * k; e.vz += d[2] / hor * k; }
  if (f < 0 && hor > 0) { const k = sp * -Math.sin(f) * 0.04; e.vy += k * 3.2; e.vx -= d[0] / hor * k; e.vz -= d[2] / hor * k; }
  if (hor > 0) { e.vx += (d[0] / hor * sp - e.vx) * 0.1; e.vz += (d[2] / hor * sp - e.vz) * 0.1; }
  const air = 0.985 - Math.min(0.02, Math.hypot(e.vx, e.vy, e.vz) * 0.006);            // air resistance: more drag the faster you go
  e.vx *= air; e.vy *= 0.98; e.vz *= air;
  if (e.vy > -0.5) e.fallDistance = Math.min(e.fallDistance, 1);    // gliding resets the fall (a steep dive still counts)
  move(e, e.vx, e.vy, e.vz);
  if (e === player && e.glideT % 6 === 0) spawnP(e.x - d[0], e.y + 1.2, e.z - d[2], 0, 0, 0, '#e8e4f8', 0.5, 0.05, 0);
};
const _drawHUDEly = drawHUD;
drawHUD = function (a) {
  _drawHUDEly(a);
  if (state !== 'play' || !game || !player || player.dead) return;
  if (player.gliding) txt(`GLIDING · ${(Math.hypot(player.vx, player.vy, player.vz) * 20).toFixed(1)} b/s`, W / 2, H - 120, 16, '#d8d0ff', 'center');
};
(function () {
  const rows = MENU[1].rows, i = rows.findIndex(x => x[0] === 'mace');
  rows.splice(i, 0, ['elytra', 'Elytra (jump in mid-air to glide, no rockets)', 'tg']);
})();

// ---------- backpack inventory ----------
// E opens your inventory: 27 backpack slots + your hotbar. Click to pick up / drop / swap, shift-click to move
// between backpack and hotbar, right-click to split a stack. When a hotbar stack runs out it refills from the backpack.
KB_ACTIONS.splice(KB_ACTIONS.findIndex(a => a[0] === 'pause'), 0, ['inventory', 'Open inventory', 'KeyE']);
KB_DEF.inventory = 'KeyE'; if (KB.inventory === undefined) KB.inventory = 'KeyE';
const INV = { open: false, cursor: null, el: null };
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: `
#invUI{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:50;user-select:none}
#invUI.hidden{display:none}
#invUI .box{background:#c6c6c6;border:3px solid #fff;border-right-color:#555;border-bottom-color:#555;padding:14px 16px;border-radius:4px;font:20px VT323,monospace;color:#3f3f3f}
#invUI .grid{display:grid;grid-template-columns:repeat(9,52px);gap:4px}
#invUI .slot{width:52px;height:52px;background:#8b8b8b;border:2px solid #373737;border-right-color:#fff;border-bottom-color:#fff;position:relative;cursor:pointer}
#invUI .slot:hover{background:#a8a8a8}
#invUI .slot canvas{position:absolute;left:6px;top:6px;width:36px;height:36px;image-rendering:pixelated}
#invUI .slot b{position:absolute;right:3px;bottom:0;color:#fff;text-shadow:2px 2px #3f3f3f;font:22px VT323,monospace}
#invUI .sel{outline:3px solid #fff}
#invUI .t{margin:6px 0 4px}
#invCur{position:fixed;pointer-events:none;z-index:60;width:40px;height:40px}
#invCur canvas{width:40px;height:40px;image-rendering:pixelated}
#invCur b{position:absolute;right:-4px;bottom:-6px;color:#fff;text-shadow:2px 2px #3f3f3f;font:22px VT323,monospace}
#invTip{margin-top:6px;font-size:18px;color:#555}` }));
const invUI = document.createElement('div'); invUI.id = 'invUI'; invUI.className = 'hidden';
invUI.innerHTML = '<div class="box"><div class="t">Backpack</div><div class="grid" id="invBag"></div><div class="t" style="margin-top:12px">Hotbar</div><div class="grid" id="invBar"></div><div id="invTip">Click: pick up / place · Shift-click: move · Right-click: split · E: close</div></div>';
document.body.appendChild(invUI);
const invCur = document.createElement('div'); invCur.id = 'invCur'; document.body.appendChild(invCur);
const stackable = it => it && it.n !== undefined;
const sameKind = (a, b) => a && b && a.k === b.k && (a.id === b.id) && (a.tier === b.tier);
const kindKey = it => it ? it.k + ':' + (it.id || '') + ':' + (it.tier || '') : '';
const live = it => it && !(it.n !== undefined && it.n <= 0) ? it : null;
function slotHTML(it, sel) {
  return `<div class="slot${sel ? ' sel' : ''}"></div>`;
}
function fillSlot(el, it) {
  el.innerHTML = '';
  it = live(it); if (!it) return;
  const c = cv(16); c.getContext('2d').drawImage(itemIcon(it), 0, 0); el.appendChild(c);
  const cnt = it.k === 'bow' ? player.arrows : it.n;
  if (cnt !== undefined && cnt !== 1) { const b = document.createElement('b'); b.textContent = cnt; el.appendChild(b); }
  el.title = itemName ? itemName(it) : it.k;
}
function renderInv() {
  const p = player; if (!p) return;
  const bag = $('#invBag'), bar = $('#invBar');
  if (bag.children.length !== 27) { bag.innerHTML = ''; for (let i = 0; i < 27; i++) { const d = document.createElement('div'); d.className = 'slot'; d.dataset.s = 'bag' + i; bag.appendChild(d); } }
  if (bar.children.length !== 9) { bar.innerHTML = ''; for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'slot'; d.dataset.s = 'inv' + i; bar.appendChild(d); } }
  for (let i = 0; i < 27; i++) fillSlot(bag.children[i], p.bag[i]);
  for (let i = 0; i < 9; i++) { fillSlot(bar.children[i], p.inv[i]); bar.children[i].classList.toggle('sel', i === p.sel); }
  invCur.innerHTML = ''; const it = live(INV.cursor);
  if (it) { const c = cv(16); c.getContext('2d').drawImage(itemIcon(it), 0, 0); invCur.appendChild(c); if (it.n !== undefined && it.n !== 1) { const b = document.createElement('b'); b.textContent = it.n; invCur.appendChild(b); } }
}
function arrOf(s) { return s.startsWith('bag') ? [player.bag, +s.slice(3)] : [player.inv, +s.slice(3)]; }
function putAway(it) {                                   // into matching stacks, then the first empty slot (hotbar, then backpack)
  const p = player; it = live(it); if (!it) return true;
  if (stackable(it)) for (const arr of [p.inv, p.bag]) for (const s of arr) if (live(s) && sameKind(s, it)) { s.n += it.n; return true; }
  for (const arr of [p.inv, p.bag]) { const i = arr.findIndex(s => !live(s)); if (i >= 0) { arr[i] = it; return true; } }
  return false;
}
invUI.addEventListener('mousemove', e => { invCur.style.left = (e.clientX - 20) + 'px'; invCur.style.top = (e.clientY - 20) + 'px'; });
invUI.addEventListener('contextmenu', e => e.preventDefault());
invUI.addEventListener('mousedown', e => {
  e.preventDefault(); e.stopPropagation();
  const el = e.target.closest('.slot'); if (!el || !player) return;
  const [arr, i] = arrOf(el.dataset.s), cur = live(INV.cursor), it = live(arr[i]);
  if (e.shiftKey && it && !cur) {                        // quick move
    arr[i] = null;
    const other = arr === player.inv ? player.bag : player.inv;
    let done = false;
    if (stackable(it)) for (const s of other) if (live(s) && sameKind(s, it)) { s.n += it.n; done = true; break; }
    if (!done) { const j = other.findIndex(s => !live(s)); if (j >= 0) { other[j] = it; done = true; } }
    if (!done) arr[i] = it;
  } else if (e.button === 2) {                           // right click: split half / drop one
    if (!cur && it && stackable(it) && it.n > 1) { const h = Math.ceil(it.n / 2); INV.cursor = Object.assign({}, it, { n: h }); it.n -= h; }
    else if (!cur && it) { INV.cursor = it; arr[i] = null; }
    else if (cur && stackable(cur) && (!it || sameKind(it, cur))) { if (!it) arr[i] = Object.assign({}, cur, { n: 1 }); else it.n++; cur.n--; if (cur.n <= 0) INV.cursor = null; }
  } else {
    if (cur && it && stackable(cur) && sameKind(cur, it)) { it.n += cur.n; INV.cursor = null; }
    else { arr[i] = cur; INV.cursor = it; }
  }
  if (arr === player.inv) setHeldVisual(player);
  renderInv();
});
function openInv() {
  if (!player || player.dead || INV.open) return;
  if (!player.bag) player.bag = new Array(27).fill(null);
  INV.open = true; for (const k in keys) keys[k] = false;
  if (player.using) { player.using = null; player.useT = 0; }
  invUI.classList.remove('hidden'); renderInv();
  if (document.exitPointerLock) document.exitPointerLock();
}
function closeInv() {
  if (!INV.open) return;
  INV.open = false;
  if (INV.cursor && !putAway(INV.cursor)) feed('Inventory full — item dropped', '#ff9a5a');
  INV.cursor = null; invCur.innerHTML = '';
  invUI.classList.add('hidden'); if (player) setHeldVisual(player);
  if (state === 'play' && !paused) lockMouse();
}
window.addEventListener('keydown', e => {
  if (e.repeat || rebinding) return;
  if (INV.open && (e.code === KB.inventory || e.code === 'Escape')) { e.preventDefault(); closeInv(); return; }
  if (e.code === KB.inventory && inGame()) { e.preventDefault(); openInv(); }
}, true);
const _pauseGameInv = pauseGame;
pauseGame = function () { if (INV.open) return; _pauseGameInv(); };
const _inGameInv = inGame;
inGame = function () { return !INV.open && _inGameInv(); };
const _toMenuInv = toMenu;
toMenu = function () { if (INV.open) { INV.open = false; invUI.classList.add('hidden'); INV.cursor = null; } _toMenuInv(); };
// auto-refill: a hotbar stack that runs out is topped up from the backpack (same item)
let _hbPrev = [];
const _gameTickInv = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickInv();
  if (tick === t0 || !game || !player || player.dead || !player.bag) return;
  const p = player;
  for (let i = 0; i < 9; i++) {
    const it = live(p.inv[i]), prev = _hbPrev[i];
    if (!it && prev) {
      const j = p.bag.findIndex(s => live(s) && kindKey(s) === prev);
      if (j >= 0) { p.inv[i] = p.bag[j]; p.bag[j] = null; if (i === p.sel) setHeldVisual(p); }
    }
    _hbPrev[i] = kindKey(live(p.inv[i]));
  }
  if (INV.open && tick % 4 === 0) renderInv();
};
// loot that doesn't fit the hotbar goes into the backpack
function giveLoot(p, it) {
  if (!p.bag) p.bag = new Array(27).fill(null);
  if (stackable(it)) for (const arr of [p.inv, p.bag]) for (const s of arr) if (live(s) && sameKind(s, it)) { s.n += it.n; return true; }
  for (const arr of [p.inv, p.bag]) { const i = arr.findIndex(s => !live(s)); if (i >= 0) { arr[i] = it; if (arr === p.inv && i === p.sel) setHeldVisual(p); return true; } }
  return false;
}
buildMenu();

// ---------- ender pearls: right-click to throw, you teleport where it lands (costs 2.5 hearts) ----------
ICON.pearl = pxArt(px => {
  for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 4.8) continue; px(x, y, d > 4 ? '#0b3b36' : d < 1.6 ? '#7fe7d0' : (x + y) % 3 === 0 ? '#2fa58f' : '#17695c'); }
  px(6, 6, '#c8fff2');
});
const _itemIconPearl = itemIcon;
itemIcon = function (it) { if (it && it.k === 'pearl') return ICON.pearl; return _itemIconPearl(it); };
const _itemNamePearl = itemName;
itemName = function (it) { if (it && it.k === 'pearl') return 'Ender Pearl (right-click to throw & teleport)'; return _itemNamePearl(it); };
SND.pearl = v => { noise(0.25, 0.3 * v, 1800, 0.6); beep(900, 0.2, 'sine', 0.06 * v, -500); };
SND.tele = v => { beep(300, 0.35, 'sine', 0.12 * v, 500); noise(0.3, 0.3 * v, 800, 0.5); };
const PEARLS = [];
const pearlMat = new THREE.MeshLambertMaterial({ color: 0x1f8a78, emissive: 0x0a3a32 });
function throwPearl(p) {
  const d = p.look(), m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), pearlMat); scene.add(m);
  PEARLS.push({ o: p, x: p.x, y: p.y + p.eyeH - 0.1, z: p.z, vx: d[0] * 1.5 + p.vx, vy: d[1] * 1.5 + (p.onGround ? 0 : p.vy), vz: d[2] * 1.5 + p.vz, t: 0, m, px: p.x, py: p.y + p.eyeH, pz: p.z });
  sfx('pearl', p.x, p.y, p.z); swing(p);
}
const _playerControlPearl = playerControl;
playerControl = function (p) {
  const h = p.held;
  if (h && h.k === 'pearl' && h.n > 0 && (usePress || held('use')) && tick >= (p.pearlCD || 0) && !p.dead) {
    throwPearl(p); h.n--; p.pearlCD = tick + 20; usePress = false;
    if (h.n <= 0) setHeldVisual(p);
  }
  return _playerControlPearl(p);
};
const _gameTickPearl = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickPearl();
  if (tick === t0) return;
  for (let i = PEARLS.length - 1; i >= 0; i--) {
    const q = PEARLS[i]; q.t++; q.px = q.x; q.py = q.y; q.pz = q.z;
    let landed = false;
    for (let s = 0; s < 4 && !landed; s++) {                                            // sub-steps so it doesn't tunnel
      const nx = q.x + q.vx / 4, ny = q.y + q.vy / 4, nz = q.z + q.vz / 4;
      if (isSolid(getB(nx, ny, nz)) || ny < 0) { landed = true; break; }
      const hit = mobs.find(m => m !== q.o && !m.dead && Math.abs(m.x - nx) < 0.45 && Math.abs(m.z - nz) < 0.45 && ny > m.y && ny < m.y + 1.9);
      q.x = nx; q.y = ny; q.z = nz;
      if (hit) landed = true;
    }
    q.vx *= 0.99; q.vy = q.vy * 0.99 - 0.03; q.vz *= 0.99;
    if (q.t > 400) landed = true;
    if (landed) {
      const o = q.o; scene.remove(q.m); PEARLS.splice(i, 1);
      if (!o.dead && game && !game.over) {
        burst(o.x, o.y + 1, o.z, 16, ['#2fa58f', '#7fe7d0', '#0b3b36'], 2, 0.6, 0.06, 2);
        o.x = o.px = q.x; o.z = o.pz = q.z; o.y = o.py = Math.max(0, q.y - 0.5);
        let y = o.y; while (y < WY && !boxFree([o.x - 0.3, y, o.z - 0.3, o.x + 0.3, y + 1.8, o.z + 0.3])) y += 0.5;
        o.y = o.py = y; o.vx = o.vy = o.vz = 0; o.fallDistance = 0; o.gliding = false;
        burst(o.x, o.y + 1, o.z, 16, ['#2fa58f', '#7fe7d0', '#0b3b36'], 2, 0.6, 0.06, 2);
        sfx('tele', o.x, o.y, o.z);
        hurt(o, 5, { kind: 'fall', bypass: true });
      }
    }
  }
};
const _updateModelsPearl = updateModels;
updateModels = function (alpha) {
  _updateModelsPearl(alpha);
  for (const q of PEARLS) q.m.position.set(lerp(q.px, q.x, alpha), lerp(q.py, q.y, alpha), lerp(q.pz, q.z, alpha));
};
const _toMenuPearl = toMenu;
toMenu = function () { for (const q of PEARLS) scene.remove(q.m); PEARLS.length = 0; _toMenuPearl(); };
buildMenu();

// ---------- firework rockets: boost while gliding, or launch off the ground into a glide ----------
ICON.rocket = pxArt(px => {
  for (let y = 4; y < 13; y++) for (let x = 6; x <= 9; x++) px(x, y, (y % 3 === 0) ? '#d02a2a' : '#e8e0d0');
  px(7, 2, '#4a4a4a'); px(8, 2, '#4a4a4a'); px(7, 3, '#d02a2a'); px(8, 3, '#d02a2a');
  for (let y = 13; y < 16; y++) { px(7, y, '#7a5a30'); }
  px(5, 12, '#ffd23a'); px(10, 11, '#ffd23a'); px(6, 14, '#ff8a2a');
});
const _itemIconRocket = itemIcon; itemIcon = function (it) { if (it && it.k === 'rocket') return ICON.rocket; return _itemIconRocket(it); };
const _itemNameRocket = itemName; itemName = function (it) { if (it && it.k === 'rocket') return 'Firework Rocket (right-click: boost while gliding / launch from the ground)'; return _itemNameRocket(it); };
SND.rocket = v => { noise(0.5, 0.35 * v, 900, 0.5, 0, 'bandpass'); beep(120, 0.4, 'sawtooth', 0.05 * v, 300); };
const _playerControlRocket = playerControl;
playerControl = function (p) {
  const h = p.held;
  if (h && h.k === 'rocket' && h.n > 0 && (usePress || held('use')) && tick >= (p.rocketCD || 0) && !p.dead) {
    h.n--; p.rocketCD = tick + 12; usePress = false; p.boostUntil = tick + 22; p.boostT0 = tick; sfx('rocket', p.x, p.y, p.z);
    if (!p.gliding && hasElytra(p)) { if (p.onGround || p.inWater) { p.y += 0.6; p.vy = 0.3; p.onGround = false; } p.gliding = true; p.glideT = 0; }   // straight into flight — no launch-up first
    else if (!p.gliding) { if (p.onGround || p.inWater) { p.vy = 0.9; p.onGround = false; } }
    if (h.n <= 0) setHeldVisual(p);
  }
  return _playerControlRocket(p);
};
const _travelRocket = travel;
travel = function (e, strafe, forward) {
  if (e.gliding && e.boostUntil > tick) {                                     // Minecraft's firework boost
    const d = e.look(), k = Math.max(0, 1 - (tick - (e.boostT0 || tick)) / 22) ** 1.5;   // a big kick that fades out
    const top = 1.1 + 0.6 * k, pull = 0.45 * k;
    e.vx += d[0] * 0.12 * k + (d[0] * top - e.vx) * pull; e.vy += d[1] * 0.12 * k + (d[1] * top - e.vy) * pull; e.vz += d[2] * 0.12 * k + (d[2] * top - e.vz) * pull;
    if (tick % 2 === 0) spawnP(e.x, e.y + 0.6, e.z, -e.vx * 3, -e.vy * 3, -e.vz * 3, Math.random() < 0.5 ? '#ffd23a' : '#ff8a2a', 0.4, 0.07, 0);
  } else if (!e.gliding && e.boostUntil > tick && e === player && !e.onGround) { if (tick % 2 === 0) spawnP(e.x, e.y, e.z, 0, -2, 0, '#ffd23a', 0.4, 0.07, 0); }
  return _travelRocket(e, strafe, forward);
};
const _gameTickRocket = gameTick;
gameTick = function () {
  const t0 = tick; _gameTickRocket();
  if (tick === t0 || !player) return;
  const p = player;
  if (p._autoGlideAt && tick >= p._autoGlideAt) { p._autoGlideAt = 0; if (!p.onGround && !p.inWater && !p.dead && hasElytra(p)) { p.gliding = true; p.glideT = 0; } }
};
