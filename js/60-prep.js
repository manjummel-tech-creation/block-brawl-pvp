// ================= PRE-GAME INVENTORY SETUP (10 s to arrange your hotbar) =================
(function () {
  const st = document.createElement('style');
  st.textContent = `#prep{position:fixed;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.55);gap:10px}
  #prep h1{margin:0;font-size:54px;font-weight:normal;text-shadow:4px 4px #333}#prep .t{font-size:26px;color:#ffff70}
  #prepBar{display:flex;gap:4px;background:#8b8b8b;padding:6px;border:3px solid #000;box-shadow:inset 3px 3px #c6c6c6,inset -3px -3px #555}
  .pslot{width:64px;height:64px;background:#8b8b8b;box-shadow:inset 3px 3px #373737,inset -3px -3px #fff;position:relative;cursor:grab;display:flex;align-items:center;justify-content:center}
  .pslot.sel{outline:4px solid #fff}.pslot.over{background:#a8a8ff}.pslot img{width:48px;height:48px;image-rendering:pixelated;pointer-events:none}
  .pslot b{position:absolute;right:4px;bottom:0;font-weight:normal;font-size:22px;color:#fff;text-shadow:2px 2px #3f3f3f;pointer-events:none}
  .pslot i{position:absolute;left:4px;top:0;font-style:normal;font-size:16px;color:#333;pointer-events:none}
  #prepName{font-size:24px;min-height:28px}`;
  document.head.appendChild(st);
  const ov = document.createElement('div'); ov.id = 'prep'; ov.className = 'hidden';
  ov.innerHTML = `<h1>Arrange your hotbar</h1><div class="t" id="prepT"></div>
    <div id="prepBar"></div><div id="prepName"></div>
    <div style="font-size:20px;color:#ccc">Drag items between slots, or click one slot then another to swap. Your layout is remembered for next time.</div>
    <button id="prepGo" class="mc" style="font-size:28px;padding:4px 40px">READY!</button>`;
  document.body.appendChild(ov);
})();
const sig = it => it ? it.k + (it.k === 'block' ? ':' + it.id : '') : '';
let prepSel = -1, prepTimer = null;
function prepRender() {
  const bar = $('#prepBar'); bar.innerHTML = '';
  player.inv.forEach((it, i) => {
    const d = document.createElement('div'); d.className = 'pslot' + (i === prepSel ? ' sel' : ''); d.draggable = true;
    d.innerHTML = `<i>${i + 1}</i>`;
    if (it && !(it.n !== undefined && it.n <= 0)) {
      const img = document.createElement('img'); img.src = itemIcon(it).toDataURL(); d.appendChild(img);
      const cnt = it.k === 'bow' ? player.arrows : it.n;
      if (cnt !== undefined && cnt !== 1) { const b = document.createElement('b'); b.textContent = cnt; d.appendChild(b); }
    }
    d.onmouseenter = () => { $('#prepName').textContent = it ? itemName(it) : ''; };
    d.onclick = () => { if (prepSel < 0) prepSel = i; else { prepSwap(prepSel, i); prepSel = -1; } prepRender(); };
    d.ondragstart = e => { e.dataTransfer.setData('text/plain', i); };
    d.ondragover = e => { e.preventDefault(); d.classList.add('over'); };
    d.ondragleave = () => d.classList.remove('over');
    d.ondrop = e => { e.preventDefault(); prepSwap(+e.dataTransfer.getData('text/plain'), i); prepSel = -1; prepRender(); };
    bar.appendChild(d);
  });
}
function prepSwap(a, b) {
  if (a === b || isNaN(a)) return;
  const inv = player.inv; [inv[a], inv[b]] = [inv[b], inv[a]];
  CFG.layout = inv.map(sig); saveCfg(); SND.click(1);
}
function prepEnd() {
  if (!game || !game.prep) return;
  clearInterval(prepTimer); game.prep = false; $('#prep').classList.add('hidden');
  player.kitProto = JSON.parse(JSON.stringify({ inv: player.inv, arrows: player.arrows }));
  player.sel = -1; player.select(0); heldNameT = performance.now();
  centerMsg('3', 'Get ready'); lockMouse();
}
$('#prepGo').onclick = prepEnd;
const _startGame2 = startGame;
startGame = function () {
  _startGame2();
  if (!game || !player) return;
  // apply the saved layout
  if (Array.isArray(CFG.layout)) {
    const pool = player.inv.slice(), out = new Array(9).fill(null);
    CFG.layout.forEach((s, i) => { if (!s) return; const k = pool.findIndex(it => it && sig(it) === s); if (k >= 0) { out[i] = pool[k]; pool[k] = null; } });
    for (const it of pool) if (it) out[out.indexOf(null)] = it;
    player.inv = out;
  }
  document.exitPointerLock && document.exitPointerLock();
  game.prep = true; prepSel = -1;
  let left = 10;
  $('#prepT').textContent = `Game starts in ${left}s`; centerMsg('', '');
  $('#prep').classList.remove('hidden'); prepRender();
  clearInterval(prepTimer);
  prepTimer = setInterval(() => { left--; $('#prepT').textContent = `Game starts in ${left}s`; if (left <= 0) prepEnd(); }, 1000);
};
G.startGame = startGame;
const _gameTick2 = gameTick;
gameTick = function () { if (game && game.prep) return; _gameTick2(); };
// don't pause (or show the click hint) while arranging
const _pauseGame = pauseGame;
pauseGame = function () { if (game && game.prep) return; _pauseGame(); };
const _toMenu = toMenu;
toMenu = function () { clearInterval(prepTimer); $('#prep').classList.add('hidden'); _toMenu(); };
const _drawHUD2 = drawHUD;
drawHUD = function (a) { _drawHUD2(a); if (game && game.prep) $('#lockhint').classList.add('hidden'); };
