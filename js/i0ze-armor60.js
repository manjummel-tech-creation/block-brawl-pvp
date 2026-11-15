// ================= ARMOUR: ONE PIECE BREAKS EVERY 60 HITS =================
// (was 35). Juggernaut keeps its own, higher number (90-100).
const _startGameArmor60 = startGame;
startGame = function () { _startGameArmor60(); if (game) for (const m of mobs) m.armorEvery = game.jugg ? Math.max(m.armorEvery || 0, 90) : 60; };
G.startGame = startGame;
