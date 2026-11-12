// ================= MC-STYLE PVP SOUNDS (synthesized from scratch) =================
// Re-voiced to sound like vanilla PvP: the "oof" hurt grunt on every player hit, a heavy thud for strong attacks,
// a sharp crack for crits, the sweep whoosh, wooden shield knock, bow twang, crunchy eating, block thunks.
let sndBus = null;
function bus() {
  const a = ac(); if (!a) return null;
  if (!sndBus) { const c = a.createDynamicsCompressor(); c.threshold.value = -16; c.ratio.value = 4; c.attack.value = 0.002; c.release.value = 0.12; c.connect(a.destination); sndBus = c; }
  return sndBus;
}
function vEnv(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone2(type, f0, f1, dur, v, delay, filt) {
  const a = ac(), out = bus(); if (!a || !out) return; v *= CFG.vol / 100; if (v < 0.003) return;
  const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  vEnv(g, t, 0.004, dur, v);
  let node = o;
  if (filt) for (const [ft, ff, q] of filt) { const f = a.createBiquadFilter(); f.type = ft; f.frequency.value = ff; f.Q.value = q || 1; node.connect(f); node = f; }
  node.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
}
function noise2(dur, v, type, f0, f1, q, delay, attack) {
  const a = ac(), out = bus(); if (!a || !out) return; v *= CFG.vol / 100; if (v < 0.003) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const t = a.currentTime + (delay || 0), s = a.createBufferSource(); s.buffer = noiseBuf;
  const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 1;
  const g = a.createGain(); vEnv(g, t, attack || 0.003, dur, v);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
// vocal "oof": buzzy source through two vowel formants, pitch falling
function oof(v, pitch) {
  const p = pitch || 1, j = 0.92 + Math.random() * 0.16;
  tone2('sawtooth', 200 * p * j, 115 * p * j, 0.2, 0.32 * v, 0, [['bandpass', 650, 4]]);
  tone2('sawtooth', 200 * p * j, 115 * p * j, 0.2, 0.2 * v, 0, [['bandpass', 1080, 6]]);
  tone2('square', 100 * p * j, 60 * p * j, 0.16, 0.08 * v, 0, [['lowpass', 400, 1]]);
  noise2(0.05, 0.12 * v, 'bandpass', 1500, 900, 1);
}
Object.assign(SND, {
  hurt: v => oof(v, 1),
  death: v => { oof(v, 0.85); noise2(0.35, 0.18 * v, 'lowpass', 900, 200, 1, 0.05); },
  hit: v => { // attack.strong: heavy thud + body smack
    tone2('sine', 140, 52, 0.14, 0.55 * v);
    noise2(0.07, 0.5 * v, 'lowpass', 1400, 500, 0.8);
    noise2(0.03, 0.25 * v, 'highpass', 3000, 3000, 0.7);
  },
  crit: v => { // attack.crit: sharp crack on top of the thud
    tone2('sine', 150, 55, 0.13, 0.5 * v);
    noise2(0.06, 0.55 * v, 'highpass', 2600, 5200, 0.7);
    noise2(0.1, 0.35 * v, 'bandpass', 4200, 2200, 1.5, 0.01);
    noise2(0.06, 0.35 * v, 'lowpass', 1200, 400, 0.8);
  },
  weak: v => { noise2(0.07, 0.3 * v, 'bandpass', 1300, 900, 1.2); tone2('sine', 110, 80, 0.06, 0.15 * v); },
  sweep: v => { noise2(0.24, 0.42 * v, 'bandpass', 600, 2800, 1.4, 0, 0.03); noise2(0.18, 0.15 * v, 'highpass', 4000, 4000, 0.7, 0.04); },
  swing: v => { noise2(0.16, 0.14 * v, 'bandpass', 700, 1900, 1.2, 0, 0.02); },
  shieldBlock: v => { tone2('triangle', 190, 140, 0.12, 0.4 * v); noise2(0.09, 0.45 * v, 'lowpass', 900, 300, 1.2); noise2(0.03, 0.2 * v, 'bandpass', 2500, 2500, 2); },
  shieldBreak: v => { noise2(0.25, 0.55 * v, 'highpass', 1800, 900, 0.8); tone2('square', 900, 300, 0.22, 0.12 * v, 0, [['bandpass', 1200, 3]]); tone2('triangle', 180, 90, 0.2, 0.3 * v); },
  shieldUp: v => { noise2(0.08, 0.12 * v, 'lowpass', 1100, 600, 1); },
  bow: v => { tone2('triangle', 620, 310, 0.16, 0.22 * v); noise2(0.18, 0.28 * v, 'bandpass', 1800, 700, 1); },
  arrowHit: v => { noise2(0.06, 0.4 * v, 'bandpass', 2400, 1600, 2); tone2('sine', 320, 200, 0.05, 0.15 * v); },
  eat: v => { const f = 1400 + Math.random() * 900; noise2(0.06, 0.32 * v, 'bandpass', f, f * 0.7, 3); noise2(0.04, 0.2 * v, 'bandpass', f * 1.6, f, 4, 0.05); },
  burp: v => { tone2('sawtooth', 150, 90, 0.32, 0.2 * v, 0, [['bandpass', 500, 3]]); },
  brk: v => { noise2(0.16, 0.5 * v, 'lowpass', 1400, 300, 0.9); noise2(0.08, 0.25 * v, 'bandpass', 2400, 1200, 1.5, 0.03); },
  place: v => { noise2(0.1, 0.5 * v, 'lowpass', 1100, 350, 0.9); tone2('sine', 160, 90, 0.07, 0.2 * v); },
  dig: v => { noise2(0.07, 0.25 * v, 'lowpass', 1600, 600, 1); },
  step: v => { noise2(0.05, 0.12 * v, 'lowpass', 1000 + Math.random() * 400, 500, 1); },
  splash: v => { noise2(0.4, 0.4 * v, 'bandpass', 900, 400, 0.6, 0, 0.01); noise2(0.25, 0.2 * v, 'highpass', 3000, 2000, 0.7, 0.05); },
  totem: v => { noise2(0.8, 0.35 * v, 'bandpass', 600, 4000, 1, 0, 0.05); [784, 988, 1318, 1568].forEach((f, i) => tone2('triangle', f, f, 0.5, 0.1 * v, i * 0.06)); },
  potBreak: v => { noise2(0.2, 0.5 * v, 'highpass', 3500, 2500, 1); tone2('sine', 2200, 2000, 0.12, 0.08 * v); tone2('sine', 2900, 2600, 0.1, 0.06 * v, 0.03); },
  smash: v => { tone2('sine', 90, 35, 0.5, 0.7 * v); noise2(0.45, 0.65 * v, 'lowpass', 900, 120, 0.7); noise2(0.12, 0.4 * v, 'highpass', 2500, 1500, 0.7); },
  wind: v => { noise2(0.45, 0.5 * v, 'bandpass', 400, 2400, 0.8, 0, 0.02); tone2('sine', 260, 700, 0.3, 0.06 * v); }
});
// MC plays the victim's hurt "oof" on every damaging hit, not just when YOU get hit
const _dealDamageSnd = dealDamage;
dealDamage = function (t, amt, src) {
  const r = _dealDamageSnd(t, amt, src);
  if (t !== player && amt > 0.2 && src && src.kind !== 'void' && !t.dead) sfx('hurt', t.x, t.y, t.z, 0.75);
  return r;
};
