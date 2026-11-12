// ================= HEALING PARITY =================
// Bots were out-healing the player because they disengage, eat golden apples back-to-back and never run out
// of chances to regen. Now:
//  - a bot never carries more golden apples than you do
//  - a bot must wait 15 s between golden apples (you can still eat whenever you like)
//  - while a bot is running / hiding / towering to heal, natural regen works exactly like yours (no extras)
//  - Tab scoreboard shows how much everyone has healed so you can see it's fair
const _startGameHeal = startGame;
startGame = function () {
  _startGameHeal();
  if (!game) return;
  for (const m of mobs) {
    m.healed = 0;
    if (m.isPlayer) continue;
    const g = m.inv.find(i => i && i.k === 'gapple');
    if (g) g.n = Math.min(g.n, CFG.gapples);
    m.kitProto = JSON.parse(JSON.stringify({ inv: m.inv, arrows: m.arrows }));
  }
};
G.startGame = startGame;
// golden apple cooldown for bots: while it's cooling down they act as if they have none
const _slotOfHeal = Mob.prototype.slotOf;
Mob.prototype.slotOf = function (k) {
  if (k === 'gapple' && !this.isPlayer && tick < (this.gapCD || 0)) return -1;
  return _slotOfHeal.call(this, k);
};
const _eatGappleHeal = eatGapple;
eatGapple = function (e) {
  if (!e.isPlayer && tick < (e.gapCD || 0)) { e.using = null; e.useT = 0; return; }
  const it = e.held, n0 = it && it.k === 'gapple' ? it.n : -1;
  _eatGappleHeal(e);
  if (n0 > 0 && it.n < n0 && !e.isPlayer) e.gapCD = tick + 300;
};
// count healing (health + golden hearts gained) per player
const _gameTickHeal = gameTick;
gameTick = function () {
  const before = mobs.map(m => m.dead ? null : m.health + m.absorption);
  const t0 = tick;
  _gameTickHeal();
  if (tick === t0) return;
  mobs.forEach((m, i) => { if (before[i] != null && !m.dead) { const d = m.health + m.absorption - before[i]; if (d > 0) m.healed = (m.healed || 0) + d; } });
};
const _drawHUDHeal = drawHUD;
drawHUD = function (a) {
  _drawHUDHeal(a);
  if (state !== 'play' || !game || $('#score').classList.contains('hidden')) return;
  $('#score').innerHTML = `<table><tr><th>Player</th><th>Kills</th><th>Deaths</th><th>Health</th><th>Healed</th><th>Gapples</th></tr>${mobs.slice().sort((x, y) => y.kills - x.kills).map(m => {
    const g = m.inv.find(i => i && i.k === 'gapple');
    return `<tr style="color:${m.isPlayer ? '#ffff70' : m.teamCol}"><td>${m.name}${CFG.mode === 'teams' ? ` [${m.team}]` : ''}</td><td>${m.kills}</td><td>${m.deaths}</td><td>${m.dead ? '☠' : ((m.health + m.absorption) / 2).toFixed(1) + '❤'}</td><td>${((m.healed || 0) / 2).toFixed(1)}❤</td><td>${g ? g.n : 0}</td></tr>`;
  }).join('')}</table>`;
};
