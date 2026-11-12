// ================= FASTER BLOCK PLACING =================
// Holding place: a block every 2 ticks (10/s, was 5/s). Every click places instantly, even several clicks in one tick.
let placeClicks = 0;
window.addEventListener('mousedown', e => { if (!rebinding && 'Mouse' + e.button === KB.place && inGame()) placeClicks++; });
window.addEventListener('keydown', e => { if (!e.repeat && !rebinding && e.code === KB.place && inGame()) placeClicks++; });
const _playerControlPlace = playerControl;
playerControl = function (p) {
  const it = p.held, n0 = it && it.k === 'block' ? it.n : -1;
  const extra = Math.max(0, Math.min(3, placeClicks - 1)); placeClicks = 0;
  _playerControlPlace(p);
  if (n0 >= 0 && it.n < n0 && p.useCD > 2) p.useCD = 2;            // faster repeat while holding
  for (let i = 0; i < extra && it && it.k === 'block' && it.n > 0; i++) tryPlace(p); // extra clicks this tick
};
