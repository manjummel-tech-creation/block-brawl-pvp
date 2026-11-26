

// ================= MC-STYLE PVP: splash potions you aim, fire resistance, offhand (§), totems in hand, PvP kit, armour HUD =================
// - Splash potions are real items. Right-click (or Y / U) throws one where you look, 20 degrees above your aim like
//   MC, so to self-pot you look down. Healing, Strength (now 15 s) and the new Fire Resistance (45 s).
// - You have an offhand slot. § (rebindable) swaps your held item into it, or the item you hover in the inventory.
//   Totems only save you from your main hand or your offhand, like MC. A shield works from the offhand.
// - The inventory no longer stops the game, and hovering an item + pressing 1-9 moves it to that hotbar slot.
// - "PvP kit": netherite, a full 27-slot backpack of loot, totem in the offhand.
// - Armour wears like MC (every hit wears every piece; the helmet goes first) and a side HUD shows each piece's
//   durability plus your totems, like the armour-status mods.

// ---------- items ----------
const fireResIcon = pxArt(px => {
  const rows = ['......XX......', '.....XWWX.....', '......XX......', '.....XGGX.....', '....XRRRRX....', '...XRRWRRRX...', '..XRRWRRRRRX..', '..XRRRRRRRRX..', '..XRRRRRRRRX..', '...XRRRRRRX...', '....XXXXXX....'];
  rows.forEach((r, y) => [...r].forEach((c, x) => { const col = { X: '#2a1a1a', W: '#ffffff', G: '#cfe6ff', R: '#f08a20' }[c]; if (col) px(x + 1, y + 3, col); }));
});
const POT_KIND = { heal: { icon: potIcon, col: 0xf0306a, name: 'Splash Potion of Healing', fx: ['#f0306a', '#ff8ab0', '#ffd0e0', '#ffffff'] },
  str: { icon: strPotIcon, col: 0xa8201a, name: 'Splash Potion of Strength', fx: ['#a8201a', '#ff6a3a', '#ffb070', '#ffffff'] },
  fire: { icon: fireResIcon, col: 0xf08a20, name: 'Splash Potion of Fire Resistance', fx: ['#f08a20', '#ffc060', '#ffe0a0', '#ffffff'] } };
const STR_DUR = 300, FIRE_DUR = 900;          // strength 15 s (was 10 s), fire resistance 45 s
const _itemIconPvp = itemIcon;
itemIcon = function (it) {
  if (it && it.k === 'splash') return (POT_KIND[it.tier] || POT_KIND.heal).icon;
  if (it && it.k === 'totem') return totemIcon;
  if (it && it.k === 'shield') return shieldIcon;
  return _itemIconPvp(it);
};
const _itemNamePvp = itemName;
itemName = function (it) {
  if (it && it.k === 'splash') return (POT_KIND[it.tier] || POT_KIND.heal).name + ' (right-click: throws where you look, look down to self-pot)';
  if (it && it.k === 'totem') return `Totem of Undying (only works in your hand or offhand: ${offKeyName()})`;
  if (it && it.k === 'shield') return `Shield (put it in your offhand with ${offKeyName()})`;
  return _itemNamePvp(it);
};

// ---------- splash potions you aim ----------
const potMats = {};
function throwSplash(e, kind) {
  swing(e);
  const pr = (e.pitch - 20) * DEG, yw = e.yaw * DEG, sp = 0.5;
  const dx = -Math.sin(yw) * Math.cos(pr), dy = -Math.sin(pr), dz = Math.cos(yw) * Math.cos(pr);
  const w = { x: e.x, y: e.y + e.eyeH - 0.1, z: e.z, vx: dx * sp + e.vx, vy: dy * sp + (e.onGround ? 0 : e.vy * 0.5), vz: dz * sp + e.vz, owner: e, age: 0, kind };
  w.px = w.x; w.py = w.y; w.pz = w.z;
  if (!potMats[kind]) potMats[kind] = new THREE.MeshLambertMaterial({ color: POT_KIND[kind].col, emissive: 0x301010 });
  w.mesh = new THREE.Mesh(potGeo, potMats[kind]); w.mesh.position.set(w.x, w.y, w.z); scene.add(w.mesh);
  potProj.push(w);
  sfx('potThrow', e.x, e.y, e.z);
}
// take one potion of a kind: the held one first, then the hotbar, then the backpack, then the old potion counters
function takeSplash(e, kind) {
  const it = e.inv[e.sel];
  if (it && it.k === 'splash' && it.tier === kind) { e.inv[e.sel] = null; setHeldVisual(e); return true; }
  for (const arr of [e.inv, e.bag || []]) { const i = arr.findIndex(s => s && s.k === 'splash' && s.tier === kind); if (i >= 0) { arr[i] = null; return true; } }
  const c = kind === 'heal' ? 'pots' : kind === 'str' ? 'strPots' : 'firePots';
  if ((e[c] || 0) > 0) { e[c]--; return true; }
  return false;
}
throwPot = function (e) {
  if (tick < (e.potCD || 0) || e.dead || !takeSplash(e, 'heal')) return false;
  e.potCD = tick + (e.isPlayer ? 5 : 60); throwSplash(e, 'heal'); return true;
};
drinkStrength = function (e) {
  if (e.dead || tick < (e.strCD || 0) || !takeSplash(e, 'str')) return false;
  e.strCD = tick + 5; if (!e.isPlayer) e.pitch = 80;
  throwSplash(e, 'str'); return true;
};
function splashAt(x, y, z, owner, kind) {
  const K = POT_KIND[kind] || POT_KIND.heal;
  for (const m of mobs) {
    if (m.dead || (m !== owner && m.team !== owner.team)) continue;
    const d = Math.hypot(m.x - x, m.y + 0.9 - y, m.z - z);
    if (d > 4) continue;
    const s = d < 1.5 ? 1 : 1 - (d - 1.5) / 2.5;
    if (kind === 'heal') { m.health = Math.min(20, m.health + 10 * s); if (m === player) { potFlashT = performance.now(); sfx('heal'); } }
    else if (kind === 'str') { m.strPotUntil = Math.max(m.strPotUntil || 0, tick + Math.round(STR_DUR * s)); if (m === player) { strFlashT = performance.now(); sfx('strPot'); } else feed(`${m.name} splashed a Strength potion!`, '#ff8a5a'); }
    else if (kind === 'fire') { m.fireResUntil = Math.max(m.fireResUntil || 0, tick + Math.round(FIRE_DUR * s)); if (m === player) { fireResFlashT = performance.now(); sfx('heal'); } }
    burst(m.x, m.y + 1, m.z, 12, K.fx.slice(0, 2), 1.5, 0.7, 0.06, 1, 0.8);
    drawTag(m);
  }
  burst(x, y + 0.2, z, 45, K.fx, 3.2, 0.9, 0.08, 4, 1.2);
  sfx('potBreak', x, y, z);
}
let fireResFlashT = -1e9;
tickPots = function () {
  for (const w of potProj) {
    w.px = w.x; w.py = w.y; w.pz = w.z; w.age++;
    const sp = Math.hypot(w.vx, w.vy, w.vz) || 0.01, dx = w.vx / sp, dy = w.vy / sp, dz = w.vz / sp;
    const bh = rayBlocks(w.x, w.y, w.z, dx, dy, dz, sp);
    let tHit = bh && isSolid(bh.id) ? bh.dist : Infinity;
    for (const m of mobs) {                                      // shatters on whoever it hits, too
      if (m.dead || (m === w.owner && w.age < 4)) continue;
      const t = rayBox(w.x, w.y, w.z, dx, dy, dz, m.box()); if (t >= 0 && t <= sp && t < tHit) tHit = t;
    }
    if (tHit <= sp || w.age > 100) {
      const t = tHit <= sp ? Math.max(0, tHit - 0.05) : 0;
      splashAt(w.x + dx * t, w.y + dy * t, w.z + dz * t, w.owner, w.kind || 'heal');
      w.dead = true; continue;
    }
    w.x += w.vx; w.y += w.vy; w.z += w.vz;
    w.vx *= 0.99; w.vy = w.vy * 0.99 - 0.05; w.vz *= 0.99;
    if (w.y < VOID_Y) w.dead = true;
  }
  for (let i = potProj.length - 1; i >= 0; i--) if (potProj[i].dead) { scene.remove(potProj[i].mesh); potProj.splice(i, 1); }
};
// fire resistance: no fire, lava or magma damage while it lasts
const _hurtFireRes = hurt;
hurt = function (t, amount, src) {
  if (src && (src.kind === 'lava' || src.kind === 'fire' || src.kind === 'magma') && (t.fireResUntil || 0) > tick) return false;
  return _hurtFireRes(t, amount, src);
};

// ---------- offhand ----------
KB_ACTIONS.splice(KB_ACTIONS.findIndex(a => a[0] === 'inventory') + 1, 0, ['offhand', 'Swap item to offhand (§)', 'IntlBackslash']);
KB_DEF.offhand = 'IntlBackslash'; if (KB.offhand === undefined) KB.offhand = 'IntlBackslash';
const offKeyName = () => KB.offhand === 'IntlBackslash' ? '§' : keyName(KB.offhand);
const offArr = p => p.offArr || (p.offArr = [null]);
const isOffKey = e => e.code === KB.offhand || e.key === '§' || e.key === '±';
function countTotems(p) { let n = 0; for (const arr of [p.inv, p.bag || [], offArr(p)]) for (const s of arr) if (s && s.k === 'totem') n++; return n; }
function syncOffhand(p) {
  if (!p || !p.itemTotems) return;
  const o = offArr(p)[0], h = p.inv[p.sel];
  p.totems = (h && h.k === 'totem' ? 1 : 0) + (o && o.k === 'totem' ? 1 : 0);   // a totem only counts in a hand
  const hasSh = !!(o && o.k === 'shield');
  if (hasSh && p._shWas && !p.shield) { offArr(p)[0] = null; p._shWas = false; }   // the shield broke
  else { if (p.shield && !hasSh && typeof lowerShield === 'function') lowerShield(p); p.shield = hasSh; p._shWas = hasSh; }
}
function swapOffhand(arr, i) {
  const p = player, off = offArr(p), a = arr[i], b = off[0];
  arr[i] = b || null; off[0] = a || null;
  if (arr === p.inv) setHeldVisual(p);
  syncOffhand(p); sfx('place', p.x, p.y, p.z, 0.3);
}
const _playerControlOff = playerControl;
playerControl = function (p) {
  syncOffhand(p);
  const h = p.inv[p.sel];
  if (h && h.k === 'splash' && (usePress || placePress) && tick >= (p.potCD || 0) && !p.dead && !(p.stunT > tick)) {
    usePress = placePress = false; p.potCD = tick + 5;
    p.inv[p.sel] = null; setHeldVisual(p); throwSplash(p, h.tier || 'heal');
  }
  _playerControlOff(p);
  syncOffhand(p);
};
// a totem in your hand pops: take that item away (main hand first, like MC)
const _dieOff = die;
die = function (t, src) {
  if (t.itemTotems) syncOffhand(t);
  const before = t.totems || 0;
  _dieOff(t, src);
  if (t.itemTotems && !t.dead && (t.totems || 0) < before) {
    const h = t.inv[t.sel];
    if (h && h.k === 'totem') { t.inv[t.sel] = null; setHeldVisual(t); }
    else if (offArr(t)[0] && offArr(t)[0].k === 'totem') offArr(t)[0] = null;
    syncOffhand(t);
  }
};

// ---------- inventory: keeps running, hover + 1-9 / § ----------
INV.hover = null;
invUI.addEventListener('mousemove', e => { const el = e.target.closest('.slot'); INV.hover = el ? el.dataset.s : null; });
invUI.addEventListener('mouseleave', () => { INV.hover = null; });
const _arrOfOff = arrOf;
arrOf = function (s) { return s.startsWith('off') ? [offArr(player), 0] : _arrOfOff(s); };
const _renderInvOff = renderInv;
renderInv = function () {
  _renderInvOff();
  if (!player) return;
  let row = document.getElementById('invOffRow');
  if (!row) {
    row = document.createElement('div'); row.id = 'invOffRow'; row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:12px';
    row.innerHTML = '<div class="t" style="margin:0">Offhand</div><div class="slot" data-s="off0"></div>';
    const bar = document.getElementById('invBar'); bar.parentNode.insertBefore(row, bar.nextSibling);
    const tip = document.getElementById('invTip'); if (tip) tip.textContent += ` · Hover + 1-9: move to that hotbar slot · Hover + ${offKeyName()}: offhand`;
  }
  fillSlot(row.querySelector('.slot'), offArr(player)[0]);
};
const _openInvRun = openInv;
openInv = function () {
  const was = INV.open; _openInvRun();
  if (INV.open && !was) { INV._noLock = G.noLockCheck; G.noLockCheck = true; }      // the match keeps going, like MC
};
const _closeInvRun = closeInv;
closeInv = function () {
  const was = INV.open; _closeInvRun();
  if (was && !INV.open) { G.noLockCheck = INV._noLock; INV.hover = null; }
};
window.addEventListener('keydown', e => {
  if (e.repeat || rebinding || !player) return;
  if (INV.open && INV.hover) {
    let n = -1; for (let k = 1; k <= 9; k++) if (e.code === KB['slot' + k] || e.code === 'Digit' + k) n = k - 1;
    const [arr, i] = arrOf(INV.hover);
    if (n >= 0) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!(arr === player.inv && i === n)) { const a = arr[i]; arr[i] = player.inv[n]; player.inv[n] = a || null; setHeldVisual(player); syncOffhand(player); }
      renderInv(); return;
    }
    if (isOffKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); if (!(arr === offArr(player))) swapOffhand(arr, i); renderInv(); return; }
  }
  if (!INV.open && isOffKey(e) && inGame() && !player.dead) { e.preventDefault(); swapOffhand(player.inv, player.sel); }
}, true);
const _gameTickInvRun = gameTick;
gameTick = function () {
  _gameTickInvRun();
  if (INV.open && player && (player.dead || state !== 'play' || !game || game.over)) closeInv();
  for (const m of mobs) if (!m.dead && !m.isPlayer && m.ai && m.firePots > 0 && (m.fireT > 0 || m.inLava) && !((m.fireResUntil || 0) > tick) && tick >= (m.fireCD || 0) && Math.random() < 0.15) {
    m.fireCD = tick + 40; m.pitch = 80; m.firePots--; throwSplash(m, 'fire');        // bots on fire splash fire res at their feet
  }
};

// ---------- the PvP kit ----------
KIT_MODES.pvp = { n: 'PvP kit (full inventory)', d: 'Netherite + Prot IV, Sharpness V sword, axe, mace, a totem in your offhand and 8 more, splash Healing / Strength / Fire Resistance potions, pearls, gapples, wind charges, webs and buckets. A whole backpack of loot (press E).',
  set: Object.assign({}, OFF, { wtype: 'sword', tier: 'netherite', sharp: 5, armor: 'netherite', prot: 4, bow: true, arrows: 64, gapples: 16, blocks: 64, webs: 16, pick: true, bucket: true,
    mace: true, windCharges: 16, shield: true, kitAxe: true, totems: 9, pots: 0, strPots: 0,
    botGapples: 8, botWebs: 4, botPots: 6, botStrPots: 2, botTotems: 3, botFirePots: 2, botItems: true, botShields: true, botBuild: true }) };
(function () { const r = MENU[0].rows.find(x => x[0] === 'kitMode'); if (r && !r[3].some(o => o[0] === 'pvp')) r[3].push(['pvp', KIT_MODES.pvp.n]); })();
buildMenu();
function pvpLoadout(p) {
  const S = (t) => ({ k: 'splash', tier: t }), wool = p.team === 'red' ? B.WOOL_R : p.team === 'blue' ? B.WOOL_B : B.COBBLE;
  const ely = [p.inv, p.bag || []].flat().find(s => s && s.k === 'elytra');
  p.inv = [{ k: 'sword', tier: 'netherite', sharp: 5 }, { k: 'axe', tier: 'netherite', sharp: 5 }, { k: 'mace' }, { k: 'gapple', n: 16 }, { k: 'pearl', n: 16 },
    S('heal'), S('heal'), S('str'), { k: 'bucket', full: true }];
  const bag = [];
  for (let i = 0; i < 8; i++) bag.push({ k: 'totem' });
  for (let i = 0; i < 7; i++) bag.push(S('heal'));
  bag.push(S('str'), S('str'), S('fire'), S('fire'), S('fire'));
  bag.push({ k: 'wind', n: 16 }, { k: 'block', id: wool, n: 64 }, { k: 'block', id: B.WEB, n: 16 }, { k: 'lavaBucket' }, { k: 'shield' },
    { k: 'bow', power: CFG.power }, ely || { k: 'pick', tier: 'netherite' });
  p.bag = bag.slice(0, 27); while (p.bag.length < 27) p.bag.push(null);
  offArr(p)[0] = { k: 'totem' };
  p.arrows = 64; p.pots = 0; p.strPots = 0; p.firePots = 0;
}
const _startGamePvp = startGame;
startGame = function () {
  _startGamePvp();
  if (!game) return;
  const km = KIT_MODES[CFG.kitMode], set = km && km.set;
  for (const m of mobs) { m.fireResUntil = 0; if (!m.isPlayer) m.firePots = set ? (set.botFirePots || 0) : 0; }
  const p = player; if (!p) return;
  if (!p.bag) p.bag = new Array(27).fill(null);
  p.offArr = [null];
  if (CFG.kitMode === 'pvp') pvpLoadout(p);
  else {                                                          // every other kit: totems become items (shield goes in the offhand first)
    const n = p.totems || 0;
    if (p.shield) offArr(p)[0] = { k: 'shield' };
    for (let i = 0; i < n; i++) { if (!offArr(p)[0]) offArr(p)[0] = { k: 'totem' }; else giveLoot(p, { k: 'totem' }); }
  }
  p.itemTotems = true; p._shWas = !!(offArr(p)[0] && offArr(p)[0].k === 'shield');
  syncOffhand(p); setHeldVisual(p);
  p.kitProto = JSON.parse(JSON.stringify({ inv: p.inv, arrows: p.arrows, bag: p.bag, off: p.offArr }));
};
G.startGame = startGame;
const _respawnPvp = respawn;
respawn = function (m) {
  _respawnPvp(m);
  m.fireResUntil = 0;
  if (m === player && m.kitProto && m.kitProto.bag) {
    m.bag = JSON.parse(JSON.stringify(m.kitProto.bag)); m.offArr = JSON.parse(JSON.stringify(m.kitProto.off || [null]));
    m._shWas = !!(m.offArr[0] && m.offArr[0].k === 'shield'); syncOffhand(m);
  }
};

// ---------- armour wears like MC: every hit wears every piece; durability in MC proportions (helmet first) ----------
const PIECE_DUR = [2.0, 2.9, 2.73, 2.36];                       // x armorEvery hits: helmet, chestplate, leggings, boots
const pieceDur = (m, i) => Math.round((m.armorEvery || 60) * PIECE_DUR[i]);
const _breakPieceRandom = breakPiece;
breakPiece = function () {};                                     // the old "random piece every N hits" is replaced
function breakPieceAt(m, i) {
  const keep = m.pieces.slice();
  m.pieces = m.pieces.map((v, j) => j === i && v);
  _breakPieceRandom(m);
  m.pieces = keep.map((v, j) => j === i ? false : v); recomputeArmor(m);
}
const _dealDamageWearMP = dealDamage;
dealDamage = function (t, amt, src) {
  const h0 = t.armorHits;
  const r = _dealDamageWearMP(t, amt, src);
  if (t.pieces && t.armorHits !== h0) for (let i = 0; i < 4; i++) if (t.pieces[i] && t.armorHits >= pieceDur(t, i)) breakPieceAt(t, i);
  return r;
};

// ---------- side HUD: each armour piece's durability + your totems (like the armour-status mods) ----------
window.ARMOR_SIDE_HUD = true;
const PIECE_ICON = [
  ['XXXXXXXX', 'XooooooX', 'XooooooX', 'Xo....oX', 'Xo....oX'],
  ['XXX..XXX', 'XooXXooX', 'XooooooX', '.XooooX.', '.XooooX.', '.XooooX.', '.XXXXXX.'],
  ['XXXXXXXX', 'XooooooX', 'XooXXooX', 'XooXXooX', 'XooXXooX', 'XXX..XXX'],
  ['.XX..XX.', '.Xo..oX.', 'XXo..oXX', 'Xoo..ooX', 'XXX..XXX']
];
const pieceIcons = {};
function pieceIcon(i, col) {
  const k = i + col; if (pieceIcons[k]) return pieceIcons[k];
  return (pieceIcons[k] = pxArt(px => PIECE_ICON[i].forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') px(x + 4, y + 4 + (i === 0 ? 2 : 0), c === 'X' ? '#1e1e1e' : col); }))));
}
const _drawHUDSide = drawHUD;
drawHUD = function (a) {
  _drawHUDSide(a);
  const p = player; if (state !== 'play' || !game || !p || p.dead) return;
  const g = hctx, S = 30, x0 = 10; let y = Math.round(H * 0.34);
  if (p.pieces && p.armorBase && ARMOR[p.armorBase]) {
    const c0 = ARMOR[p.armorBase].col != null ? ARMOR[p.armorBase].col : 0xcfcfcf, cr = c0 >> 16 & 255, cg = c0 >> 8 & 255, cb = c0 & 255;
    const lift = Math.max(0, 150 - (cr + cg + cb) / 3) / 150 * 0.6;       // dark armour (netherite) is lightened so the icon shows up
    const col = '#' + [cr, cg, cb].map(v => Math.round(v + (255 - v) * lift).toString(16).padStart(2, '0')).join('');
    for (let i = 0; i < 4; i++, y += S + 6) {
      const max = pieceDur(p, i), left = p.pieces[i] ? Math.max(0, max - (p.armorHits || 0)) : 0, f = left / max;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 - 4, y - 2, S + 66, S + 4);
      g.globalAlpha = p.pieces[i] ? 1 : 0.3; g.drawImage(pieceIcon(i, col), x0, y, S, S); g.globalAlpha = 1;
      const c = !p.pieces[i] ? '#ff5050' : f > 0.5 ? '#7dff6a' : f > 0.25 ? '#ffd23a' : '#ff6a3a';
      txt(p.pieces[i] ? String(left) : 'broke', x0 + S + 6, y + S / 2 + 6, 18, c);
      if (p.pieces[i]) { g.fillStyle = '#222'; g.fillRect(x0 + S + 6, y + S - 4, 52, 3); g.fillStyle = c; g.fillRect(x0 + S + 6, y + S - 4, 52 * f, 3); }
    }
  }
  const tot = p.itemTotems ? countTotems(p) : (p.totems || 0);
  if (tot > 0 || p.itemTotems) {
    y += 6;
    const o = offArr(p)[0], h = p.inv[p.sel], inHand = (o && o.k === 'totem') || (h && h.k === 'totem');
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 - 4, y - 2, S + 66, S + 4);
    g.globalAlpha = tot > 0 ? 1 : 0.35; g.drawImage(totemIcon, x0, y, S, S); g.globalAlpha = 1;
    txt('x' + tot, x0 + S + 6, y + S / 2 + 6, 20, tot > 0 ? '#f2c624' : '#888');
    if (tot > 0 && !inHand) txt('not in hand!', x0, y + S + 18, 15, (tick % 20) < 12 ? '#ff6a3a' : '#ffb070');
  }
  // offhand slot for anything that isn't the shield (the shield draws its own)
  const o = offArr(p)[0];
  if (o && o.k !== 'shield') {
    const gs = clamp(Math.floor(Math.min(W / 300, H / 230)), 2, 4), hw = 182 * gs, hh = 22 * gs, hx = Math.round((W - hw) / 2), hy = H - hh - 4, sx = hx - 29 * gs;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(sx, hy, hh, hh);
    g.strokeStyle = 'rgba(160,160,160,.8)'; g.lineWidth = gs; g.strokeRect(sx + gs / 2, hy + gs / 2, hh - gs, hh - gs);
    g.drawImage(itemIcon(o), sx + 3 * gs, hy + 3 * gs, 16 * gs, 16 * gs);
    if (o.n !== undefined && o.n !== 1) txt(String(o.n), sx + 19 * gs, hy + 20 * gs, 9 * gs, '#fff', 'right');
  }
  const fr = (p.fireResUntil || 0) - tick;
  const since = performance.now() - fireResFlashT;
  if (since < 500) { g.fillStyle = `rgba(255,150,40,${0.3 * (1 - since / 500)})`; g.fillRect(0, 0, W, H); txt('FIRE RESISTANCE', W / 2, H / 2 - 120, 34, '#ffb040', 'center'); }
  if (fr > 0 && (p.fireT > 0 || p.inLava)) txt('fire resistance: no fire damage', W / 2, H - 170, 16, '#ffc060', 'center');
};