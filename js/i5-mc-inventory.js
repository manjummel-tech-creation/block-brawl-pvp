

// ================= MC INVENTORY: vertical layout, hover tooltips, saved PvP setup, more loot =================
// - The inventory is a compact, vertical MC-style box: armour (with durability) + you + offhand on top, then the
//   27-slot backpack, then the hotbar.
// - Hovering an item shows an MC tooltip (name + details).
// - PvP kit: 128 golden apples, 128 wind charges, 64 firework rockets + an elytra.
// - Your PvP kit layout (hotbar, backpack and offhand) is saved and comes back the same next match. Items you use up
//   keep their saved slot; only items you move get a new place. Arrange it in the 10 s setup with E.

// ---------- vertical layout ----------
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: `
#invUI .box{width:min(92vw,520px);max-height:94vh;overflow:auto;padding:12px 14px}
#invUI .grid{grid-template-columns:repeat(9,1fr);gap:3px}
#invUI .slot{width:auto;aspect-ratio:1;height:auto}
#invUI .slot canvas{left:12%;top:12%;width:76%;height:76%}
#invUI .t{margin:4px 0 3px;font-size:19px}
#invTip{font-size:15px;line-height:1.25;margin-top:8px}
#invTop{display:grid;grid-template-columns:52px 1fr 52px;gap:8px;align-items:start;margin-bottom:6px}
#invArm{display:flex;flex-direction:column;gap:3px}
#invArm .aslot{width:52px;height:52px;background:#8b8b8b;border:2px solid #373737;border-right-color:#fff;border-bottom-color:#fff;position:relative;box-sizing:border-box}
#invArm .aslot canvas{position:absolute;left:5px;top:3px;width:38px;height:38px;image-rendering:pixelated}
#invArm .aslot b{position:absolute;left:2px;bottom:-2px;font:16px VT323,monospace;color:#7dff6a;text-shadow:1px 1px #222}
#invArm .aslot.broke canvas{opacity:.25}
#invMe{background:#000;border:2px solid #373737;border-right-color:#fff;border-bottom-color:#fff;height:226px;box-sizing:border-box;padding:8px 10px;color:#e0e0e0;font:18px VT323,monospace;line-height:1.35}
#invMe .n{color:#ffff70;font-size:21px}
#invOffRow{display:flex;flex-direction:column;align-items:stretch}
#invOffRow .slot{width:52px;height:52px;aspect-ratio:auto}
#mcTip{position:fixed;z-index:70;pointer-events:none;background:rgba(16,0,16,.94);border:2px solid #25015b;outline:2px solid rgba(16,0,16,.94);padding:4px 8px 5px;font:20px VT323,monospace;color:#fff;max-width:340px;display:none;line-height:1.15}
#mcTip .l{color:#a8a8a8;font-size:18px}
#mcTip .e{color:#55ffff}` }));
(function () {
  const box = invUI.querySelector('.box');
  const top = document.createElement('div'); top.id = 'invTop';
  top.innerHTML = '<div id="invArm"></div><div id="invMe"></div><div id="invOffRow"><div class="t" style="margin:0 0 3px;font-size:16px;text-align:center">Offhand</div><div class="slot" data-s="off0"></div></div>';
  box.insertBefore(top, box.firstChild);
  const arm = top.querySelector('#invArm');
  for (let i = 0; i < 4; i++) { const d = document.createElement('div'); d.className = 'aslot'; d.dataset.a = i; arm.appendChild(d); }
  const tip = document.getElementById('invTip');
  if (tip) tip.textContent = `Click: pick up / place · Shift-click: move · Right-click: split · Hover + 1-9: to that hotbar slot · Hover + ${offKeyName()}: offhand · ${keyName(KB.inventory)}: close`;
})();
const mcTip = document.createElement('div'); mcTip.id = 'mcTip'; document.body.appendChild(mcTip);
function armorColour(p) {
  const c0 = ARMOR[p.armorBase] && ARMOR[p.armorBase].col != null ? ARMOR[p.armorBase].col : 0xcfcfcf, cr = c0 >> 16 & 255, cg = c0 >> 8 & 255, cb = c0 & 255;
  const lift = Math.max(0, 150 - (cr + cg + cb) / 3) / 150 * 0.6;
  return '#' + [cr, cg, cb].map(v => Math.round(v + (255 - v) * lift).toString(16).padStart(2, '0')).join('');
}
const _renderInvVert = renderInv;
renderInv = function () {
  _renderInvVert();
  const p = player; if (!p) return;
  invUI.querySelectorAll('[title]').forEach(e => e.removeAttribute('title'));        // our own tooltip instead of the browser's
  const arm = document.getElementById('invArm');
  [...arm.children].forEach((d, i) => {
    d.innerHTML = '';
    if (!p.pieces || !p.armorBase || !ARMOR[p.armorBase]) return;
    const c = cv(16); c.getContext('2d').drawImage(pieceIcon(i, armorColour(p)), 0, 0); d.appendChild(c);
    const max = pieceDur(p, i), left = p.pieces[i] ? Math.max(0, max - (p.armorHits || 0)) : 0;
    const b = document.createElement('b'); b.textContent = p.pieces[i] ? left : 'x'; b.style.color = !p.pieces[i] ? '#ff5050' : left / max > 0.5 ? '#7dff6a' : left / max > 0.25 ? '#ffd23a' : '#ff6a3a'; d.appendChild(b);
    d.classList.toggle('broke', !p.pieces[i]);
  });
  const o = offArr(p)[0], h = p.inv[p.sel], inHand = (o && o.k === 'totem') || (h && h.k === 'totem');
  const fx = []; if ((p.strPotUntil || 0) > tick) fx.push(`Strength ${Math.ceil((p.strPotUntil - tick) / 20)}s`); if ((p.fireResUntil || 0) > tick) fx.push(`Fire Res ${Math.ceil((p.fireResUntil - tick) / 20)}s`);
  document.getElementById('invMe').innerHTML = `<div class="n">${p.name}</div>❤ ${Math.ceil(p.health)} / 20${p.absorption > 0 ? ` <span style="color:#f2c624">+${Math.ceil(p.absorption)}</span>` : ''}<br>Armour ${ARMOR[p.armor] ? ARMOR[p.armor].pts : 0}<br>Totems ${countTotems(p)} · <span style="color:${inHand ? '#7dff6a' : '#ff6a3a'}">${inHand ? 'one in hand ✓' : 'none in hand!'}</span><br>Arrows ${p.arrows || 0}${fx.length ? '<br><span style="color:#ffb070">' + fx.join(' · ') + '</span>' : ''}`;
};
// ---------- hover tooltips ----------
function tipFor(it) {
  const full = itemName(it) || it.k, cut = full.indexOf(' ('), name = cut > 0 ? full.slice(0, cut) : full, lore = cut > 0 ? full.slice(cut + 2, full.lastIndexOf(')')) : '';
  const lines = [];
  if (it.sharp) lines.push(`<div class="e">Sharpness ${['', 'I', 'II', 'III', 'IV', 'V'][it.sharp] || it.sharp}</div>`);
  const cnt = it.k === 'bow' ? player.arrows : it.n; if (cnt !== undefined) lines.push(`<div class="l">${it.k === 'bow' ? 'Arrows' : 'Count'}: ${cnt}</div>`);
  if (lore && !(it.sharp && /^Sharp/i.test(lore))) lines.push(`<div class="l">${lore}</div>`);
  return `<div style="color:${it.sharp || it.power ? '#55ffff' : '#fff'}">${name}</div>` + lines.join('');
}
invUI.addEventListener('mousemove', e => {
  const el = e.target.closest('.slot, .aslot');
  let html = '';
  if (el && player && !live(INV.cursor)) {
    if (el.dataset.a !== undefined) {
      const i = +el.dataset.a, p = player;
      if (p.pieces && ARMOR[p.armorBase]) {
        const max = pieceDur(p, i), left = p.pieces[i] ? Math.max(0, max - (p.armorHits || 0)) : 0;
        html = `<div>${ARMOR[p.armorBase].n} ${['Helmet', 'Chestplate', 'Leggings', 'Boots'][i]}</div>${p.prot ? `<div class="e">Protection ${['', 'I', 'II', 'III', 'IV'][p.prot] || p.prot}</div>` : ''}<div class="l">${p.pieces[i] ? `Durability: ${left} / ${max}` : 'Broken'}</div>`;
      }
    } else { const [arr, i] = arrOf(el.dataset.s), it = live(arr[i]); if (it) html = tipFor(it); }
  }
  if (!html) { mcTip.style.display = 'none'; return; }
  mcTip.innerHTML = html; mcTip.style.display = 'block';
  const r = mcTip.getBoundingClientRect(), x = Math.min(e.clientX + 16, innerWidth - r.width - 4), y = Math.max(4, Math.min(e.clientY - 26, innerHeight - r.height - 4));
  mcTip.style.left = x + 'px'; mcTip.style.top = y + 'px';
});
invUI.addEventListener('mouseleave', () => { mcTip.style.display = 'none'; });
invUI.addEventListener('mousedown', () => { mcTip.style.display = 'none'; }, true);
const _closeInvTip = closeInv;
closeInv = function () { mcTip.style.display = 'none'; const was = INV.open; _closeInvTip(); if (was) savePvpLayout(); };

// ---------- the bigger PvP kit ----------
KIT_MODES.pvp.d = 'Netherite + Prot IV, Sharpness V sword & axe, mace, 128 golden apples, 128 wind charges, 64 firework rockets + elytra, pearls, a totem in your offhand and 8 more, splash Healing / Strength / Fire Resistance potions, webs and buckets. Your layout is saved.';
pvpLoadout = function (p) {
  const S = t => ({ k: 'splash', tier: t }), wool = p.team === 'red' ? B.WOOL_R : p.team === 'blue' ? B.WOOL_B : B.COBBLE;
  p.inv = [{ k: 'sword', tier: 'netherite', sharp: 5 }, { k: 'axe', tier: 'netherite', sharp: 5 }, { k: 'mace' }, { k: 'gapple', n: 64 }, { k: 'pearl', n: 16 },
    { k: 'wind', n: 64 }, S('heal'), S('str'), { k: 'bucket', full: true }];
  const bag = [];
  for (let i = 0; i < 8; i++) bag.push({ k: 'totem' });
  for (let i = 0; i < 6; i++) bag.push(S('heal'));
  bag.push(S('str'), S('str'), S('fire'), S('fire'));
  bag.push({ k: 'rocket', n: 64 }, { k: 'elytra' }, { k: 'gapple', n: 64 }, { k: 'wind', n: 64 }, { k: 'block', id: wool, n: 64 }, { k: 'block', id: B.WEB, n: 16 },
    { k: 'lavaBucket' }, { k: 'shield' }, { k: 'bow', power: CFG.power });
  p.bag = bag.slice(0, 27); while (p.bag.length < 27) p.bag.push(null);
  offArr(p)[0] = { k: 'totem' };
  p.arrows = 64; p.pots = 0; p.strPots = 0; p.firePots = 0;
  p._kitCounts = {}; for (const it of [...p.inv, ...p.bag, ...offArr(p)]) if (it) p._kitCounts[psig(it)] = (p._kitCounts[psig(it)] || 0) + 1;
  if (CFG.pvpLayout) applyPvpLayout(p, CFG.pvpLayout);
};

// ---------- save / load your PvP setup ----------
const psig = it => it ? it.k + ':' + (it.k === 'block' ? it.id : '') + ':' + (it.tier || '') : '';
function applyPvpLayout(p, L) {
  const pool = [...p.inv, ...p.bag, ...offArr(p)].filter(Boolean);
  const take = s => { const i = pool.findIndex(it => psig(it) === s); return i >= 0 ? pool.splice(i, 1)[0] : null; };
  const inv = new Array(9).fill(null), bag = new Array(27).fill(null);
  let off = L.off ? take(L.off) : null;
  (L.inv || []).forEach((s, i) => { if (s && i < 9) inv[i] = take(s); });
  (L.bag || []).forEach((s, i) => { if (s && i < 27) bag[i] = take(s); });
  for (const it of pool) { let i = inv.indexOf(null); if (i >= 0) { inv[i] = it; continue; } i = bag.indexOf(null); if (i >= 0) { bag[i] = it; continue; } if (!off) off = it; }
  p.inv = inv; p.bag = bag; offArr(p)[0] = off;
}
function savePvpLayout() {
  const p = player; if (CFG.kitMode !== 'pvp' || !p || !p.bag || !p._kitCounts) return;
  const old = CFG.pvpLayout || {}, all = [...p.inv, ...p.bag, ...offArr(p)];
  const have = {}; for (const it of all) if (live(it)) have[psig(it)] = (have[psig(it)] || 0) + 1;
  const kept = {};
  // an empty slot keeps its old item only if that item was used up (not moved somewhere else)
  const slot = (it, prev) => {
    if (live(it)) return psig(it);
    if (prev && (have[prev] || 0) + (kept[prev] || 0) < (p._kitCounts[prev] || 0)) { kept[prev] = (kept[prev] || 0) + 1; return prev; }
    return '';
  };
  CFG.pvpLayout = { off: slot(offArr(p)[0], old.off), inv: p.inv.map((it, i) => slot(it, (old.inv || [])[i])), bag: p.bag.map((it, i) => slot(it, (old.bag || [])[i])) };
  saveCfg();
}
// the 10 s setup screen: show the PvP hotbar, save swaps, and keep the backpack + offhand for respawns
const _startGameInvV = startGame;
startGame = function () {
  _startGameInvV();
  if (game && game.prep && typeof prepRender === 'function') {
    prepRender();
    if (CFG.kitMode === 'pvp') $('#prepT').textContent += `  ·  press ${keyName(KB.inventory)} to arrange your whole inventory`;
  }
};
G.startGame = startGame;
const _prepSwapPvp = prepSwap;
prepSwap = function (a, b) { _prepSwapPvp(a, b); savePvpLayout(); };
const _prepEndPvp = prepEnd;
prepEnd = function () {
  _prepEndPvp();
  const p = player; if (!p || !p.offArr) return;
  p.kitProto = JSON.parse(JSON.stringify({ inv: p.inv, arrows: p.arrows, bag: p.bag, off: p.offArr }));
  savePvpLayout();
};
$('#prepGo').onclick = prepEnd;
// in the setup screen the inventory can open too (to arrange the backpack before the fight)
window.addEventListener('keydown', e => {
  if (e.repeat || rebinding || !game || !game.prep || INV.open || e.code !== KB.inventory || state !== 'play') return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (!player.bag) player.bag = new Array(27).fill(null);
  INV.open = true; invUI.classList.remove('hidden'); renderInv();
}, true);
const _closeInvPrep = closeInv;
closeInv = function () {
  const prep = game && game.prep;
  _closeInvPrep();
  if (prep) { if (document.exitPointerLock) document.exitPointerLock(); if (typeof prepRender === 'function') prepRender(); if (player) player.kitProto = JSON.parse(JSON.stringify({ inv: player.inv, arrows: player.arrows, bag: player.bag, off: player.offArr })); }
};