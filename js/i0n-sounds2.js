// ================= SOUNDS v2: EVERY SOUND REBUILT =================
// The old sounds were one oscillator + one noise burst, identical every time. Now each sound is rendered sample by
// sample into a small audio clip (struck wood / metal / glass as ringing modes, plucked strings, a voiced grunt,
// swept noise for air and debris), with 3 different takes per sound, random pitch on every play, left / right
// panning from where it happened, far sounds muffled, and a short room echo. Footsteps, digging, placing and
// breaking sound like the block (grass, stone, wood, sand, wool, glass). Gliding and fast falls have rushing wind.
// All original, made in code. Settings -> "New sounds" switches back to the old ones.
if (CFG.snd2 === undefined) CFG.snd2 = true; DEF.snd2 = true;
const SQ = { sr: 44100, bufs: {}, def: {}, old: {}, pos: null, out: null, send: null, lb: 0, wind: null };
const sqR = (a, b) => a + Math.random() * (b - a);

// ---------- building blocks (all write into a Float32Array) ----------
function sqNoise(o, t0, dur, amp, type, f0, f1, q, att) {
  const sr = SQ.sr, n0 = (t0 * sr) | 0, n = Math.min(o.length - n0, (dur * sr) | 0), a = Math.max(1, (att || 0.002) * sr), tau = Math.max(1, dur * sr - a) / 5;
  let low = 0, band = 0; const damp = 1 / (q || 0.8), rat = (f1 || f0) / f0;
  for (let i = 0; i < n; i++) {
    const fc = Math.min(11000, f0 * Math.pow(rat, i / n)), f = 2 * Math.sin(Math.PI * fc / (sr * 2)), x = Math.random() * 2 - 1;
    let hi = 0;
    for (let r = 0; r < 2; r++) { low += f * band; hi = x - low - damp * band; band += f * hi; }
    o[n0 + i] += (type === 'lp' ? low : type === 'hp' ? hi : band) * (i < a ? i / a : Math.exp(-(i - a) / tau)) * amp;
  }
}
function sqTone(o, t0, dur, amp, f0, f1, wave, att, tk) {
  const sr = SQ.sr, n0 = (t0 * sr) | 0, n = Math.min(o.length - n0, (dur * sr) | 0), a = Math.max(1, (att || 0.003) * sr), tau = Math.max(1, dur * sr - a) / (tk || 5);
  let ph = 0; const rat = (f1 || f0) / f0;
  for (let i = 0; i < n; i++) {
    ph += f0 * Math.pow(rat, i / n) / sr; ph -= Math.floor(ph);
    const w = wave === 'saw' ? 2 * ph - 1 : wave === 'sq' ? (ph < 0.5 ? 0.7 : -0.7) : wave === 'tri' ? 1 - 4 * Math.abs(ph - 0.5) : Math.sin(ph * 6.2832);
    o[n0 + i] += w * (i < a ? i / a : Math.exp(-(i - a) / tau)) * amp;
  }
}
function sqModal(o, t0, amp, modes) {                 // ringing object: [frequency, level, ring time in seconds]
  const sr = SQ.sr, n0 = (t0 * sr) | 0;
  for (const [f, lv, dec] of modes) {
    const n = Math.min(o.length - n0, (dec * 7 * sr) | 0), w = 6.2832 * f / sr, k = 1 / (dec * sr), p0 = Math.random() * 0.4;
    for (let i = 0; i < n; i++) o[n0 + i] += Math.sin(w * i + p0) * Math.exp(-i * k) * Math.min(1, i / 30) * lv * amp;
  }
}
function sqPluck(o, t0, f, dur, amp, damp) {          // plucked string
  const sr = SQ.sr, n0 = (t0 * sr) | 0, n = Math.min(o.length - n0, (dur * sr) | 0), N = Math.max(2, Math.round(sr / f)), d = new Float32Array(N);
  for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
  for (let i = 1; i < N; i++) d[i] = d[i] * 0.5 + d[i - 1] * 0.5;
  const tau = n / 4;
  for (let i = 0; i < n; i++) { const j = i % N, y = d[j]; d[j] = (y + d[(j + 1) % N]) * 0.5 * (damp || 0.99); o[n0 + i] += y * amp * Math.exp(-i / tau); }
}
function sqBiquad(src, type, fc, Q) {
  const w = 6.2832 * fc / SQ.sr, c = Math.cos(w), al = Math.sin(w) / (2 * Q), a0 = 1 + al, out = new Float32Array(src.length);
  let b0, b1, b2;
  if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; } else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  const a1 = -2 * c, a2 = 1 - al; let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < src.length; i++) { const x = src[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y; }
  return out;
}
function sqVoice(o, t0, dur, amp, f0, f1, forms, breath) {   // a grunt: buzzing throat through mouth resonances
  const sr = SQ.sr, n0 = (t0 * sr) | 0, n = Math.min(o.length - n0, (dur * sr) | 0), src = new Float32Array(n);
  let ph = 0, jit = 0; const rat = f1 / f0;
  for (let i = 0; i < n; i++) {
    jit = jit * 0.997 + (Math.random() - 0.5) * 0.004;
    ph += f0 * Math.pow(rat, i / n) * (1 + jit * 6) / sr; ph -= Math.floor(ph);
    src[i] = (ph < 0.62 ? Math.pow(Math.sin(Math.PI * ph / 0.62), 2) : 0) - 0.3 + (Math.random() * 2 - 1) * (breath || 0.04);
  }
  const a = 0.014 * sr, tau = (n - a) / 3.2;
  for (const [fc, q, lv] of forms) { const y = sqBiquad(src, 'bp', fc, q); for (let i = 0; i < n; i++) o[n0 + i] += y[i] * lv * amp * (i < a ? i / a : Math.exp(-(i - a) / tau)); }
}
function sqFinish(o) {
  let pk = 0; for (let i = 0; i < o.length; i++) { const v = Math.abs(o[i]); if (v > pk) pk = v; }
  const k = pk > 0 ? 1.6 / pk : 0, fade = Math.min(o.length, 300);
  for (let i = 0; i < o.length; i++) { const x = o[i] * k; o[i] = Math.tanh(x) * 0.95; }     // gentle saturation glues the layers
  for (let i = 0; i < fade; i++) o[o.length - 1 - i] *= i / fade;
}

// ---------- what each block material sounds like when struck ----------
function sqMat(o, mat, t0, amp) {
  const N = sqNoise, M = sqModal, T = sqTone, R = sqR;
  if (mat === 'stone') { N(o, t0, 0.035, 0.6 * amp, 'bp', R(1800, 2500), 1200, 1.6); T(o, t0, 0.04, 0.35 * amp, R(170, 205), 110); N(o, t0, 0.012, 0.25 * amp, 'hp', 4000, 4000, 0.8); }
  else if (mat === 'wood') { M(o, t0, 0.6 * amp, [[R(205, 255), 1, 0.035], [R(510, 610), 0.5, 0.02], [R(1100, 1300), 0.2, 0.012]]); N(o, t0, 0.03, 0.4 * amp, 'lp', 1500, 600, 1); }
  else if (mat === 'sand') { N(o, t0, 0.09, 0.6 * amp, 'bp', R(2200, 3100), 1500, 0.9, 0.008); N(o, t0, 0.05, 0.2 * amp, 'lp', 500, 250, 0.9, 0.005); }
  else if (mat === 'cloth') { N(o, t0, 0.07, 0.55 * amp, 'lp', R(550, 700), 250, 0.9, 0.006); }
  else if (mat === 'glass') { M(o, t0, 0.4 * amp, [[R(1900, 2400), 1, 0.03], [R(3500, 4100), 0.45, 0.02], [R(5600, 6400), 0.2, 0.012]]); N(o, t0, 0.025, 0.4 * amp, 'bp', 2600, 2000, 1.5); }
  else { N(o, t0, 0.07, 0.6 * amp, 'lp', R(700, 1000), 300, 0.9, 0.004); N(o, t0 + 0.004, 0.05, 0.28 * amp, 'bp', R(2500, 3600), 1800, 1.2, 0.004); }   // grass / dirt / leaves
}
const SQ_MATS = ['soft', 'stone', 'wood', 'sand', 'cloth', 'glass'];
function sqMatOf(id) {
  if (!id || id === 255) return 'stone';
  if (id === B.GRASS || id === B.DIRT || id === B.LEAVES) return 'soft';
  if (id === B.PLANKS || id === B.LOG) return 'wood';
  if (id === B.SAND) return 'sand';
  if (id === B.WOOL_R || id === B.WOOL_B || id === B.WOOL_W || id === B.WEB) return 'cloth';
  if (id === B.GLASS || id === B.ICE || id === B.BLUE_ICE) return 'glass';
  return 'stone';
}

// ---------- the sounds: [length in s, loudness, recipe, pitch spread, dry (no echo)] ----------
(function () {
  const N = sqNoise, T = sqTone, M = sqModal, K = sqPluck, V = sqVoice, R = sqR, D = SQ.def;
  const def = (name, d, g, f, p, dry) => { D[name] = { d, g, f, p: p === undefined ? 0.06 : p, dry: !!dry }; };
  const bell = (o, t, f, a, dec) => M(o, t, a, [[f, 1, dec], [f * 2.005, 0.4, dec * 0.55], [f * 3.01, 0.17, dec * 0.3], [f * 4.2, 0.08, dec * 0.18]]);
  const thud = (o, a) => { T(o, 0, 0.16, 0.9 * a, R(150, 178), 48); N(o, 0, 0.07, 0.7 * a, 'lp', 1500, 420, 0.8); N(o, 0, 0.045, 0.45 * a, 'bp', R(850, 1100), 600, 1.4); N(o, 0, 0.02, 0.25 * a, 'hp', 3500, 3500, 0.7); };

  // combat
  def('hit', 0.24, 0.5, o => thud(o, 1));
  def('crit', 0.32, 0.52, o => { thud(o, 0.7); N(o, 0, 0.05, 0.7, 'hp', 3000, 6500, 0.7); M(o, 0.004, 0.22, [[R(3000, 3400), 1, 0.05], [R(4500, 5000), 0.7, 0.035], [6900, 0.4, 0.02]]); N(o, 0.01, 0.12, 0.3, 'bp', 4200, 2200, 1.6); });
  def('weak', 0.13, 0.3, o => { N(o, 0, 0.07, 0.5, 'bp', 1200, 800, 1.3); T(o, 0, 0.06, 0.3, 115, 75); });
  def('swing', 0.26, 0.15, o => N(o, 0, 0.22, 0.6, 'bp', R(480, 650), R(1900, 2500), 1.6, 0.05), 0.1);
  def('sweep', 0.36, 0.36, o => { N(o, 0, 0.3, 0.8, 'bp', 500, 3000, 1.3, 0.05); N(o, 0.03, 0.2, 0.3, 'hp', 4500, 4000, 0.8, 0.03); });
  def('hurt', 0.3, 0.42, o => { const f = R(175, 215); V(o, 0, 0.24, 1, f, f * 0.56, [[R(480, 560), 5, 1], [R(880, 1000), 6, 0.6], [2600, 8, 0.2]], 0.05); N(o, 0, 0.04, 0.12, 'bp', 1500, 900, 1); }, 0.09);
  def('death', 0.7, 0.45, o => { const f = R(150, 175); V(o, 0, 0.42, 1, f, f * 0.45, [[450, 5, 1], [820, 6, 0.6], [2400, 8, 0.15]], 0.07); T(o, 0.36, 0.16, 0.5, 92, 44); N(o, 0.36, 0.12, 0.45, 'lp', 700, 240, 0.8); N(o, 0.4, 0.2, 0.15, 'bp', 2200, 900, 1, 0.02); });
  def('bow', 0.42, 0.36, o => { K(o, 0, R(165, 200), 0.32, 0.6, 0.985); N(o, 0, 0.17, 0.45, 'bp', 1700, 600, 1.1, 0.004); T(o, 0, 0.05, 0.25, 420, 220); });
  def('arrowHit', 0.22, 0.4, o => { M(o, 0, 0.6, [[R(380, 460), 1, 0.05], [R(900, 1050), 0.6, 0.035], [1700, 0.35, 0.02]]); N(o, 0, 0.04, 0.6, 'lp', 2500, 900, 0.9); });
  def('shieldBlock', 0.36, 0.5, o => { M(o, 0, 0.7, [[R(168, 200), 1, 0.07], [R(390, 440), 0.6, 0.05], [760, 0.3, 0.03], [R(2100, 2400), 0.13, 0.07]]); N(o, 0, 0.08, 0.6, 'lp', 1000, 300, 1); N(o, 0, 0.02, 0.3, 'bp', 2600, 2600, 2); });
  def('shieldBreak', 0.7, 0.5, o => { N(o, 0, 0.06, 0.8, 'hp', 2200, 1500, 0.8); for (let i = 0; i < 6; i++) N(o, R(0.01, 0.3), 0.03, 0.4, 'bp', R(1500, 4000), 1200, 2.5); M(o, 0, 0.6, [[160, 1, 0.12], [340, 0.6, 0.09], [1250, 0.3, 0.15], [2900, 0.2, 0.1]]); T(o, 0, 0.25, 0.4, 220, 80); });
  def('shieldUp', 0.13, 0.16, o => { N(o, 0, 0.09, 0.5, 'lp', 1100, 500, 1, 0.01); M(o, 0.01, 0.15, [[R(220, 260), 1, 0.02]]); });
  def('armorBreak', 0.55, 0.45, o => { M(o, 0, 0.7, [[R(560, 640), 1, 0.12], [1430, 0.7, 0.09], [2380, 0.5, 0.07], [3620, 0.3, 0.05], [5100, 0.15, 0.03]]); N(o, 0, 0.1, 0.7, 'bp', 2800, 1500, 1); T(o, 0, 0.12, 0.4, 200, 90); });
  def('smash', 1.1, 0.85, o => {
    T(o, 0, 0.6, 1, 95, 30, 'sin', 0.003, 4); N(o, 0, 0.5, 0.8, 'lp', 1000, 110, 0.7); N(o, 0, 0.1, 0.5, 'hp', 2500, 1500, 0.7);
    M(o, 0, 0.25, [[R(480, 540), 1, 0.3], [1370, 0.5, 0.2], [2140, 0.3, 0.12], [3300, 0.15, 0.08]]);
    for (let i = 0; i < 9; i++) N(o, R(0.08, 0.7), R(0.03, 0.07), R(0.1, 0.25), 'lp', R(600, 2000), 300, 1);
  });
  def('dash', 0.42, 0.4, o => { N(o, 0, 0.34, 0.8, 'bp', 350, 2000, 1, 0.02); T(o, 0, 0.12, 0.35, 120, 60); });
  def('lunge', 0.3, 0.5, o => { N(o, 0, 0.16, 0.7, 'bp', 700, 1800, 1, 0.01); T(o, 0, 0.18, 0.6, 100, 50); });
  // air / thrown things
  def('wind', 0.65, 0.5, o => { N(o, 0, 0.52, 0.8, 'bp', 350, 2600, 0.9, 0.03); N(o, 0.1, 0.4, 0.3, 'hp', 3000, 5000, 0.7, 0.08); T(o, 0, 0.3, 0.08, 260, 700); });
  def('whoosh', 0.32, 0.26, o => N(o, 0, 0.27, 0.6, 'bp', 900, 2400, 1, 0.03), 0.1);
  def('potThrow', 0.17, 0.2, o => N(o, 0, 0.14, 0.5, 'bp', 1200, 2200, 1, 0.03), 0.1);
  def('potBreak', 0.55, 0.45, o => { N(o, 0, 0.08, 0.8, 'hp', 4000, 3000, 0.9); for (let i = 0; i < 10; i++) M(o, R(0, 0.09), 0.3, [[R(2500, 7500), R(0.3, 1), R(0.02, 0.1)]]); N(o, 0.05, 0.38, 0.25, 'hp', 6000, 4000, 0.7, 0.02); });
  def('pearl', 0.32, 0.3, o => { N(o, 0, 0.24, 0.5, 'bp', 1000, 2600, 1.2, 0.03); T(o, 0, 0.15, 0.12, 900, 500); });
  def('tele', 0.75, 0.4, o => { const f = R(820, 900); T(o, 0, 0.5, 0.4, f, 180, 'sin', 0.01); T(o, 0.02, 0.5, 0.3, f * 1.5, 270, 'sin', 0.01); N(o, 0, 0.42, 0.35, 'bp', 2500, 500, 1.2, 0.02); });
  def('glide', 0.5, 0.26, o => { N(o, 0, 0.12, 0.6, 'lp', 900, 400, 0.9, 0.02); N(o, 0.1, 0.32, 0.5, 'bp', 400, 900, 0.8, 0.08); });
  def('rocket', 1.0, 0.42, o => { N(o, 0, 0.85, 0.7, 'bp', 1200, 3200, 0.9, 0.03); N(o, 0, 0.5, 0.4, 'hp', 5000, 7000, 0.7, 0.02); T(o, 0, 0.6, 0.12, 700, 1500, 'sin', 0.05); T(o, 0, 0.1, 0.5, 160, 70); });
  def('thunder', 2.6, 0.85, o => { N(o, 0, 0.12, 1, 'hp', 2500, 1200, 0.7); N(o, 0, 0.3, 0.8, 'bp', 2400, 500, 0.7); N(o, 0.05, 2.3, 0.7, 'lp', 300, 70, 0.7, 0.05); for (let i = 0; i < 6; i++) N(o, R(0.1, 1.5), R(0.4, 0.8), R(0.4, 0.8), 'lp', R(120, 260), 60, 0.8, 0.08); }, 0.1);
  // eating / potions / effects
  def('eat', 0.22, 0.36, o => { for (let i = 0; i < 3; i++) N(o, i * 0.055 + R(0, 0.012), 0.04, 0.6, 'bp', R(1300, 2400), R(900, 1500), 3); N(o, 0, 0.16, 0.25, 'lp', 500, 300, 1); }, 0.1);
  def('burp', 0.46, 0.3, o => { V(o, 0, 0.4, 1, R(118, 140), 78, [[420, 4, 1], [900, 5, 0.5]], 0.06); for (let i = 0; i < o.length; i++) o[i] *= 0.6 + 0.4 * Math.sin(6.2832 * 37 * i / SQ.sr); });
  def('splash', 0.65, 0.42, o => { N(o, 0, 0.46, 0.7, 'bp', 1200, 350, 0.7, 0.01); N(o, 0.02, 0.3, 0.35, 'hp', 3500, 2200, 0.8, 0.02); for (let i = 0; i < 7; i++) T(o, R(0.08, 0.45), R(0.03, 0.06), 0.18, R(400, 900), R(900, 1600)); });
  def('heal', 0.75, 0.3, o => { [660, 880, 1100].forEach((f, i) => bell(o, i * 0.07, f, 0.5, 0.2)); N(o, 0, 0.3, 0.06, 'hp', 6000, 8000, 0.7, 0.05); }, 0.01);
  def('strength', 0.7, 0.32, o => { K(o, 0, 110, 0.55, 0.6, 0.992); M(o, 0.05, 0.3, [[330, 1, 0.2], [495, 0.8, 0.25], [660, 0.4, 0.2]]); }, 0.01);
  def('strPot', 0.95, 0.4, o => { N(o, 0, 0.12, 0.5, 'hp', 3000, 2500, 1); for (let i = 0; i < 6; i++) T(o, R(0.05, 0.4), R(0.03, 0.06), 0.2, R(300, 700), R(700, 1300)); [220, 277, 330, 440].forEach((f, i) => bell(o, 0.1 + i * 0.07, f, 0.3, 0.25)); T(o, 0.1, 0.7, 0.45, 80, 124); }, 0.01);
  def('totem', 1.4, 0.46, o => { N(o, 0, 1.1, 0.4, 'bp', 500, 5000, 1, 0.08); [784, 988, 1318, 1568, 2093].forEach((f, i) => bell(o, i * 0.07, f, 0.35, 0.5)); T(o, 0, 0.6, 0.3, 130, 260); }, 0.01);
  // interface / match
  def('click', 0.09, 0.22, o => { N(o, 0, 0.012, 0.6, 'hp', 2500, 2500, 0.8); M(o, 0, 0.5, [[R(620, 700), 1, 0.02], [1500, 0.4, 0.01]]); }, 0.04, true);
  def('ding', 0.8, 0.28, o => bell(o, 0, R(1290, 1340), 0.6, 0.3), 0.02, true);
  def('tick', 0.32, 0.26, o => { K(o, 0, 660, 0.26, 0.7, 0.992); M(o, 0, 0.2, [[1320, 1, 0.08]]); }, 0, true);
  def('go', 0.7, 0.3, o => { K(o, 0, 990, 0.5, 0.6, 0.995); K(o, 0, 1320, 0.5, 0.5, 0.995); bell(o, 0, 1980, 0.25, 0.3); }, 0, true);
  def('kill', 0.6, 0.3, o => { bell(o, 0, 988, 0.6, 0.2); bell(o, 0.09, 1319, 0.6, 0.26); K(o, 0, 494, 0.2, 0.25, 0.99); }, 0, true);
  def('win', 1.6, 0.32, o => { [523, 659, 784, 1046].forEach((f, i) => { K(o, i * 0.12, f, 0.5, 0.5, 0.996); bell(o, i * 0.12, f * 2, 0.25, 0.3); }); [523, 659, 784].forEach(f => bell(o, 0.5, f, 0.2, 0.6)); }, 0, true);
  def('lose', 1.3, 0.32, o => [392, 330, 262].forEach((f, i) => { M(o, i * 0.2, 0.6, [[f, 1, 0.3], [f * 2, 0.2, 0.18]]); K(o, i * 0.2, f / 2, 0.3, 0.25, 0.985); }), 0, true);
  // blocks, per material
  for (const m of SQ_MATS) {
    def('step_' + m, 0.13, 0.17, o => sqMat(o, m, 0, 1), 0.09);
    def('dig_' + m, 0.13, 0.26, o => sqMat(o, m, 0, 1), 0.09);
    def('place_' + m, 0.16, 0.4, o => { sqMat(o, m, 0, 1); T(o, 0, 0.07, 0.4, 150, 85); });
    def('brk_' + m, 0.34, 0.46, o => {
      for (let i = 0; i < 4; i++) sqMat(o, m, i * R(0.03, 0.05), 1 - i * 0.18);
      if (m === 'glass') for (let i = 0; i < 9; i++) M(o, R(0, 0.1), 0.3, [[R(2500, 7000), R(0.3, 1), R(0.02, 0.09)]]);
      else N(o, 0, 0.22, 0.4, 'lp', 1200, 300, 0.9);
    });
  }
})();

// ---------- playback ----------
function sqGet(name) {
  let L = SQ.bufs[name]; if (L) return L;
  const D = SQ.def[name], a = ac(); if (!D || !a) return null;
  L = [];
  for (let v = 0; v < 3; v++) {
    const o = new Float32Array(Math.ceil(D.d * SQ.sr)); D.f(o); sqFinish(o);
    const b = a.createBuffer(1, o.length, SQ.sr); b.getChannelData(0).set(o); L.push(b);
  }
  return (SQ.bufs[name] = L);
}
function sqBus() {
  const a = ac(); if (!a) return null;
  if (!SQ.out) {
    const c = a.createDynamicsCompressor(); c.threshold.value = -14; c.ratio.value = 3.5; c.attack.value = 0.003; c.release.value = 0.14; c.connect(a.destination); SQ.out = c;
    // short room echo: decaying noise, darker towards the end
    const len = (SQ.sr * 0.9) | 0, ir = a.createBuffer(2, len, SQ.sr);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { const k = i / len; lp += ((Math.random() * 2 - 1) - lp) * (0.55 - 0.4 * k); d[i] = lp * Math.exp(-k * 7) * (i < 200 ? i / 200 : 1); } }
    const cv = a.createConvolver(); cv.buffer = ir; const sg = a.createGain(); sg.gain.value = 0.2; sg.connect(cv); cv.connect(c); SQ.send = sg;
  }
  return SQ.out;
}
function sqPlay(name, v) {
  const a = ac(), out = sqBus(); if (!a || !out) return;
  v *= CFG.vol / 100; if (v < 0.004) return;
  const L = sqGet(name); if (!L) return;
  const D = SQ.def[name], src = a.createBufferSource(); src.buffer = L[(Math.random() * L.length) | 0];
  src.playbackRate.value = 1 + (Math.random() * 2 - 1) * D.p;
  const g = a.createGain(); g.gain.value = v * D.g * (0.9 + Math.random() * 0.2);
  let node = src; const pos = SQ.pos;
  if (pos && listener) {
    const dx = pos[0] - listener.x, dz = pos[2] - listener.z, d = Math.hypot(dx, pos[1] - listener.y, dz);
    if (d > 5) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = clamp(17000 * Math.exp(-(d - 5) / 9), 900, 17000); node.connect(f); node = f; }   // far = muffled
    if (d > 0.8 && a.createStereoPanner) { const y = (listener.yaw || 0) * DEG, pn = a.createStereoPanner(); pn.pan.value = clamp((dx * -Math.cos(y) + dz * -Math.sin(y)) / d, -1, 1) * 0.75; node.connect(pn); node = pn; }
  }
  node.connect(g); g.connect(out); if (!D.dry) g.connect(SQ.send);
  src.start();
}
// remember what was just broken, so the break sound matches the block that is already gone
const _setBSQ = setB;
setB = function (x, y, z, id) { if (id === 0 && state === 'play') { const o = getB(x, y, z); if (o) SQ.lb = o; } return _setBSQ(x, y, z, id); };
function sqBlockName(kind) {
  const p = SQ.pos; let id = 0;
  if (p) { id = kind === 'step' ? getB(p[0], p[1] - 0.5, p[2]) : getB(p[0], p[1], p[2]); if (!id && kind === 'brk') id = SQ.lb; }
  return kind + '_' + sqMatOf(id);
}
(function () {
  const names = new Set(Object.keys(SQ.def).filter(n => n.indexOf('_') < 0));
  for (const k of ['step', 'dig', 'place', 'brk']) names.add(k);
  for (const n of names) {
    SQ.old[n] = SND[n];
    const blocky = n === 'step' || n === 'dig' || n === 'place' || n === 'brk';
    SND[n] = v => { if (!CFG.snd2) return SQ.old[n] && SQ.old[n](v); sqPlay(blocky ? sqBlockName(n) : n, v); };
  }
})();
const _sfxSQ = sfx;
sfx = function (name, x, y, z, vm) { SQ.pos = x === undefined ? null : [x, y, z]; try { _sfxSQ(name, x, y, z, vm); } finally { SQ.pos = null; } };

// ---------- rushing wind while gliding or falling fast ----------
function sqWind() {
  const a = AC; if (!a || !SQ.out) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  if (!SQ.wind) {
    const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
    const g = a.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(SQ.out); s.start(); SQ.wind = { f, g };
  }
  const p = player; let k = 0;
  if (CFG.snd2 && state === 'play' && !paused && p && !p.dead && !p.onGround && !p.inWater && !(typeof killcam !== 'undefined' && killcam) && !(typeof RP !== 'undefined' && RP)) {
    const sp = Math.hypot(p.vx, p.vy, p.vz);
    k = p.gliding ? clamp(sp / 1.4, 0.12, 1) : clamp((sp - 0.7) / 1.2, 0, 1) * 0.8;
  }
  const t = a.currentTime;
  SQ.wind.g.gain.setTargetAtTime(k * 0.3 * CFG.vol / 100, t, 0.12);
  SQ.wind.f.frequency.setTargetAtTime(350 + k * 1100, t, 0.15);
}
const _updateCameraSQ = updateCamera;
updateCamera = function (alpha, dt) { _updateCameraSQ(alpha, dt); sqWind(); };
// render the clips a few at a time after the first sound, so nothing stutters in a fight
SQ.warm = Object.keys(SQ.def);
setInterval(() => { if (!AC || !CFG.snd2 || !SQ.warm.length) return; for (let i = 0; i < 3 && SQ.warm.length; i++) sqGet(SQ.warm.pop()); }, 60);
(function () {
  for (const sec of MENU) { const i = sec.rows.findIndex(x => x[0] === 'viewBob'); if (i >= 0) { sec.rows.splice(i, 0, ['snd2', 'New sounds (richer, per-block, left / right, echo)', 'tg']); break; } }
})();
buildMenu();
