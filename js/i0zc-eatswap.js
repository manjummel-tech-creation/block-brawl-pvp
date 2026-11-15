// ================= NO INSTANT "EAT -> SWORD -> HIT" =================
// A bot rushed mid-bite (or one that just finished a golden apple) dropped the apple, grabbed the sword and swung within 0-2 ticks
// (0.1 s), which no player can do. Now there is a switch time before it can swing or hit again:
//   stopped eating because it was rushed: about 8-12 ticks (0.4-0.6 s, a bit longer for weaker bots)
//   finished the apple: about 4-7 ticks (0.2-0.35 s)
// During that time it can still move, strafe and block, it just can't attack.
const _botTickEatSwap = botTick;
botTick = function (b) {
  // while a bot is eating, keep the attack lock topped up: the moment it stops (rushed, or the apple is done) it is already in force,
  // even if the cancel and the swing would happen inside the same update
  if (!b.isPlayer && b.using === 'eat' && !b.dead && game && !game.mafia) {
    const sk = b.skill || 0.5;
    if (b._swapEp !== b.id + ':' + (tick - b.useT)) { b._swapEp = b.id + ':' + (tick - b.useT); b._swapR = Math.random(); }          // one roll per bite
    b._swapUntil = tick + (b.useT >= 30 ? 4 + Math.floor(b._swapR * 4) : 8 + Math.round((1 - sk) * 4) + Math.floor(b._swapR * 5));
  }
  _botTickEatSwap(b);
};
const _attackEatSwap = attack;
attack = function (a, t, reach) { if (!a.isPlayer && tick < (a._swapUntil || 0)) return false; return _attackEatSwap(a, t, reach); };
const _swingEatSwap = swing;
swing = function (e) { if (!e.isPlayer && tick < (e._swapUntil || 0)) return; return _swingEatSwap(e); };
const _startGameEatSwap = startGame;
startGame = function () { _startGameEatSwap(); for (const m of mobs) m._swapUntil = 0; };
G.startGame = startGame;
