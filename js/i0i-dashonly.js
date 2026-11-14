// ================= DASH IS ONLY A DASH =================
// The dash key just moves you: it never hits, hurts or shoves anyone, and it doesn't swing your weapon.
const _startDashOnly = startDash;
startDash = function (p) {
  const sw = p.swingT;
  _startDashOnly(p);
  if (p.dashT > 0) { p.dashHit = { has: () => true, add() {} }; p.swingT = sw; }   // "already hit everyone" = nobody gets hit
};
(function () { const a = KB_ACTIONS.find(a => a[0] === 'dash'); if (a) a[1] = 'Dash (movement only, no damage)'; })();
buildMenu();
