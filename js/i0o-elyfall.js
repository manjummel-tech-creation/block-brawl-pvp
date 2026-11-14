// ================= ELYTRA: SOFTER LANDINGS =================
// There is no separate speed-crash damage here, only fall damage (a steep dive keeps the fall counting). With an elytra
// you land at speed, so a landing from a glide (or right after one) takes 30% of the normal fall damage, at most 3 hearts.
const _physicsTickElyFall = physicsTick;
physicsTick = function (e) { _physicsTickElyFall(e); if (e.gliding) e._glideSeen = tick; };
const _hurtElyFall = hurt;
hurt = function (t, amount, src) {
  if (src && src.kind === 'fall' && (t.gliding || tick - (t._glideSeen === undefined ? -999 : t._glideSeen) < 20)) amount = Math.min(6, Math.ceil(amount * 0.3));
  return _hurtElyFall(t, amount, src);
};
