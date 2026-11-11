// Sons sintetizados (Web Audio) das ações. Chamados via est.onSom(nome, { vol, pan, item, dur }).
// Tudo passa pelo barramento com compressor de voz.js (audioBase) e respeita o volume global.
import { audioBase } from '../voz.js';

let base = audioBase;
export const _usarBase = f => { base = f; }; // só p/ teste offline

// ---------- utilitários ----------
const R = (a, b) => a + Math.random() * (b - a);
const bufs = new WeakMap();
const ruido = c => {
  let b = bufs.get(c); if (b) return b;
  const n = c.sampleRate * 2; b = c.createBuffer(1, n, c.sampleRate); const w = b.getChannelData(0);
  for (let i = 0; i < n; i++) w[i] = Math.random() * 2 - 1;
  bufs.set(c, b); return b;
};
const offline = c => typeof OfflineAudioContext !== 'undefined' && c instanceof OfflineAudioContext;
/** Contexto + saída (pan) + volume final; null se o áudio não está liberado ou o volume é zero. */
function abre(o = {}) {
  const b = base?.(); if (!b) return null; const { c } = b;
  if (c.state !== 'running' && !offline(c)) return null;
  const v = (o.vol ?? .6) * b.volume; if (v < .01) return null;
  return { c, d: b.saida(o.pan ?? 0), t: c.currentTime + .005, v, b };
}
/** Envelope: subida linear (at) e queda exponencial até dur. */
function env(g, t, vol, at, dur) { g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + at); g.exponentialRampToValueAtTime(.0001, t + dur); }
const ganho = (c, d, v = 1) => { const g = c.createGain(); g.gain.value = v; g.connect(d); return g; };
function filtro(c, d, tipo, f, q = .7) { const fl = c.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q; fl.connect(d); return fl; }
/** Oscilador com varredura de altura (f → f1) e envelope. */
function osc(c, d, t, dur, vol, f, f1 = f, { tipo = 'sine', at = .004, curva = dur } = {}) {
  const o = c.createOscillator(), g = c.createGain(); o.type = tipo; o.frequency.setValueAtTime(f, t);
  if (f1 !== f) o.frequency.exponentialRampToValueAtTime(f1, t + curva);
  env(g.gain, t, vol, at, dur); o.connect(g).connect(d); o.start(t); o.stop(t + dur + .05); return o;
}
/** Rajada de ruído filtrado com varredura do filtro (f → f1). */
function nz(c, d, t, dur, vol, f, { f1 = f, q = 1, tipo = 'bandpass', at = .003, curva = dur } = {}) {
  const s = c.createBufferSource(); s.buffer = ruido(c); s.loop = true;
  const fl = c.createBiquadFilter(); fl.type = tipo; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
  if (f1 !== f) fl.frequency.exponentialRampToValueAtTime(f1, t + curva);
  const g = c.createGain(); env(g.gain, t, vol, at, dur);
  s.connect(fl).connect(g).connect(d); s.start(t, R(0, 1.5)); s.stop(t + dur + .05);
}
/** Vibrato/LFO num parâmetro. */
function lfo(c, param, t, dur, freq, prof, tipo = 'sine') {
  const o = c.createOscillator(), g = c.createGain(); o.type = tipo; o.frequency.value = freq; g.gain.value = prof;
  o.connect(g).connect(param); o.start(t); o.stop(t + dur + .05); return g;
}
/** Metal ressonante: parciais inarmônicas (com pares levemente desafinados = batimento). */
function metal(c, d, t, f, vol, dur, razoes = [1, 2.76, 5.4, 8.93]) {
  razoes.forEach((r, i) => { const a = vol / (1 + i * .8), q = dur / (1 + i * .6); osc(c, d, t, q, a, f * r); osc(c, d, t, q * .8, a * .5, f * r * 1.006); });
}
/** Madeira: "toc" curto. */
function madeira(c, d, t, f, vol) { osc(c, d, t, .09, vol, f, f * .82); osc(c, d, t, .05, vol * .4, f * 2.7); nz(c, d, t, .05, vol * .6, f * 2.2, { q: 4 }); }
/** "Pop" macio. */
function pop(c, d, t, vol, f = 320) { osc(c, d, t, .07, vol, f, f * 2.6, { curva: .04 }); nz(c, d, t, .04, vol * .35, 1800, { q: 1.5 }); }
/** Água balançando: ruído com filtro que vai e vem. */
function agua(c, d, t, dur, vol, ondas = 2) {
  const s = c.createBufferSource(); s.buffer = ruido(c); s.loop = true;
  const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 2.2; const g = c.createGain();
  fl.frequency.setValueAtTime(500, t); g.gain.setValueAtTime(0, t);
  for (let i = 0; i < ondas; i++) {
    const a = t + dur * i / ondas, m = a + dur / ondas * .45;
    fl.frequency.exponentialRampToValueAtTime(R(1100, 1700), m); fl.frequency.exponentialRampToValueAtTime(R(400, 600), a + dur / ondas);
    g.gain.linearRampToValueAtTime(vol * R(.7, 1), m); g.gain.linearRampToValueAtTime(vol * .2, a + dur / ondas);
  }
  g.gain.linearRampToValueAtTime(0, t + dur + .05);
  s.connect(fl).connect(g).connect(d); s.start(t, R(0, 1.5)); s.stop(t + dur + .1);
  for (let i = 0; i < ondas * 3; i++) gota(c, d, t + R(0, dur), vol * .25); // bolhinhas
}
/** Gota/bolha: seno curtinho subindo. */
const gota = (c, d, t, vol) => { const f = R(500, 1100); osc(c, d, t, .05, vol, f, f * R(1.8, 2.6), { curva: .03 }); };
/** Gelo: tilintar curto e agudo. */
const gelo = (c, d, t, vol) => { const f = R(2400, 4200); osc(c, d, t, .07, vol, f); osc(c, d, t, .05, vol * .5, f * 2.32); nz(c, d, t, .02, vol * .4, 6000, { q: 2 }); };
/** Whoosh: ruído com envelope em sino e filtro varrendo. */
function whoosh(c, d, t, dur, vol, fIni, fMeio, fFim) {
  const s = c.createBufferSource(); s.buffer = ruido(c); s.loop = true;
  const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 1.6; const g = c.createGain();
  fl.frequency.setValueAtTime(fIni, t); fl.frequency.exponentialRampToValueAtTime(fMeio, t + dur * .55); fl.frequency.exponentialRampToValueAtTime(fFim, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .55); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(fl).connect(g).connect(d); s.start(t, R(0, 1.5)); s.stop(t + dur + .05);
}
/** Boing cômico: tom com vibrato largo que diminui. */
function boing(c, d, t, vol, f = 200, dur = .7) {
  const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle';
  o.frequency.setValueAtTime(f * .7, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
  const v = lfo(c, o.frequency, t, dur, 13, f * .35); v.gain.setValueAtTime(f * .35, t); v.gain.exponentialRampToValueAtTime(f * .02, t + dur);
  env(g.gain, t, vol, .01, dur); o.connect(g).connect(d); o.start(t); o.stop(t + dur + .05);
}
/** Plucado de harpa: triângulo + oitava, filtrado. */
function harpa(c, d, t, f, vol, dur = 1.6) { const lp = filtro(c, d, 'lowpass', 3200); osc(c, lp, t, dur, vol, f, f, { tipo: 'triangle', at: .006 }); osc(c, lp, t, dur * .5, vol * .3, f * 2, f * 2, { at: .004 }); }
/** Sininho/celesta: seno + parcial 4x brilhante. */
function sininho(c, d, t, f, vol) { osc(c, d, t, .9, vol, f, f, { at: .002 }); osc(c, d, t, .25, vol * .35, f * 4.02, f * 4.02, { at: .002 }); osc(c, d, t, .5, vol * .2, f * 2.98); }
/** Corpo no chão. */
function baque(c, d, t, vol) { osc(c, d, t, .35, vol, 120, 38); nz(c, d, t, .25, vol * .7, 380, { tipo: 'lowpass', q: .6 }); nz(c, d, t, .08, vol * .25, 2200, { q: .8 }); }
/** Voz de plateia: serra com vibrato → formantes (F1/F2) automatizados. pontos = [[tRel, kAltura, F1, F2]...]. */
function vozes(c, d, t, dur, vol, n, fBase, pontos) {
  const mix = ganho(c, filtro(c, d, 'highpass', 120), 0);
  mix.gain.setValueAtTime(0, t); mix.gain.linearRampToValueAtTime(vol, t + .22); mix.gain.setValueAtTime(vol, t + dur * .6); mix.gain.linearRampToValueAtTime(0, t + dur);
  for (let i = 0; i < n; i++) {
    const f = fBase * R(.75, 1.6) * (i % 3 === 0 ? 1.8 : 1), atr = R(0, .12), o = c.createOscillator(); o.type = 'sawtooth';
    const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = 7; f2.Q.value = 9;
    pontos.forEach(([tr, k, F1, F2], j) => {
      const tt = t + atr + tr * dur, m = j ? 'linearRampToValueAtTime' : 'setValueAtTime', fm = F1 * (f > 300 ? 1.15 : 1);
      o.frequency[m](f * k, tt); f1.frequency[m](fm, tt); f2.frequency[m](F2 * (f > 300 ? 1.15 : 1), tt);
    });
    lfo(c, o.frequency, t, dur, R(4.5, 6.5), f * R(.012, .03));
    const g = ganho(c, mix, 1 / Math.sqrt(n)), g2 = ganho(c, g, .55); f1.connect(g); f2.connect(g2);
    o.connect(f1); o.connect(f2); o.start(t + atr); o.stop(t + dur + .1);
  }
  nz(c, mix, t, dur, .35, 900, { q: .7, at: .2 }); // respiração/ar
}

// ---------- sons ----------
export const SONS_ACAO = {
  /** Objeto aparece na mão. */
  pega(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    if (o.item === 'cadeira' || o.item === 'cadeirada') { // cadeira dobrável abrindo: rangido + travas metálicas
      const s = c.createOscillator(), g = c.createGain(), bp = filtro(c, d, 'bandpass', 1300, 3); s.type = 'sawtooth';
      s.frequency.setValueAtTime(170, t); s.frequency.linearRampToValueAtTime(240, t + .22); lfo(c, s.frequency, t, .25, 38, 60, 'square');
      env(g.gain, t, .25 * v, .03, .26); s.connect(g).connect(bp); s.start(t); s.stop(t + .3);
      nz(c, d, t, .03, .3 * v, 3800, { q: 3 }); nz(c, d, t + .11, .03, .25 * v, 4400, { q: 3 });
      metal(c, d, t + .24, 1150, .22 * v, .25); nz(c, d, t + .24, .04, .35 * v, 2800, { q: 2 });
    } else if (o.item === 'pau' || o.item === 'paulada') { madeira(c, d, t, 420, .8 * v); madeira(c, d, t + .09, 380, .25 * v); }
    else if (o.item === 'balde') { metal(c, d, t, 2100, .25 * v, .22, [1, 1.58, 2.4]); agua(c, d, t + .05, .55, .5 * v, 2); }
    else pop(c, d, t, .8 * v);
  },
  /** A cada passo do atacante carregando o objeto. */
  carrega(o = {}) {
    if (!['cadeira', 'cadeirada', 'balde'].includes(o.item)) return;
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    if (o.item === 'balde') { agua(c, d, t, .3, .25 * v, 1); if (Math.random() < .7) gelo(c, d, t + R(.03, .12), .07 * v); if (Math.random() < .4) gelo(c, d, t + R(.12, .2), .05 * v); return; }
    const n = 2 + Math.floor(Math.random() * 2); // pés de alumínio batendo de leve
    for (let i = 0; i < n; i++) { const tt = t + i * R(.035, .06); metal(c, d, tt, R(1700, 2600), .1 * v, .09, [1, 2.76]); nz(c, d, tt, .015, .1 * v, 4000, { q: 2 }); }
  },
  /** Objeto voando. */
  arremesso(o = {}) { const a = abre(o); if (!a) return; whoosh(a.c, a.d, a.t, .45, .8 * a.v, 500, 2200, 700); },
  /** Golpe de perto (preparo/balanço). */
  golpe(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    if (['cadeira', 'cadeirada', 'pau', 'paulada'].includes(o.item)) { whoosh(c, d, t, .42, 1 * v, 220, 950, 300); osc(c, d, t + .08, .3, .2 * v, 90, 55, { at: .15 }); }
    else whoosh(c, d, t, .35, .7 * v, 400, 1600, 600);
  },
  impacto_tomate(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    nz(c, d, t, .28, 1.6 * v, 2000, { f1: 280, tipo: 'lowpass', q: 2.5 }); osc(c, d, t, .14, 1 * v, 170, 60);
    for (let i = 0; i < 5; i++) nz(c, d, t + .04 + R(0, .3), R(.03, .06), .4 * v, R(700, 1500), { q: 3 }); // respingos grudentos
  },
  /** Amor e carinho: glissando de harpa + sininhos + acorde maior suave e brilhante (~2,6 s). */
  impacto_flores(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    const hz = m => 440 * 2 ** ((m - 69) / 12), rev = ganho(c, d, 1);
    // eco suave (ambiência brilhante)
    const dl = c.createDelay(); dl.delayTime.value = .17; const fb = ganho(c, dl, .35), lp = filtro(c, fb, 'lowpass', 4000); dl.connect(lp); dl.connect(ganho(c, d, .3)); rev.connect(dl);
    setTimeout(() => { rev.disconnect(); dl.disconnect(); }, 3500); // quebra o laço do eco (não fica pendurado)
    [60, 64, 67, 69, 72, 76, 79, 81, 84, 88, 91].forEach((m, i) => harpa(c, rev, t + i * .042, hz(m), .16 * v * (1 - i * .03), 1.8));
    [76, 79, 84, 88, 91, 86, 84, 96].forEach((m, i) => sininho(c, rev, t + .45 + i * .19 + R(-.03, .03), hz(m), .09 * v));
    const pad = ganho(c, filtro(c, rev, 'lowpass', 2600), 0); // acorde Cmaj9 com coro leve
    pad.gain.setValueAtTime(0, t + .15); pad.gain.linearRampToValueAtTime(.07 * v, t + .6); pad.gain.setValueAtTime(.07 * v, t + 1.6); pad.gain.exponentialRampToValueAtTime(.0001, t + 2.6);
    [48, 55, 64, 71, 74, 79].forEach(m => [0, 1].forEach(k => { const os = c.createOscillator(); os.type = k ? 'sine' : 'triangle'; os.frequency.value = hz(m) * (k ? 1.004 : .997); lfo(c, os.frequency, t, 2.6, 5, hz(m) * .004); os.connect(pad); os.start(t + .15); os.stop(t + 2.7); }));
  },
  impacto_torta(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    nz(c, d, t, .38, 1.8 * v, 1300, { f1: 220, tipo: 'lowpass', q: 3 }); osc(c, d, t, .2, 1.2 * v, 140, 50);
    nz(c, d, t + .05, .2, .5 * v, 600, { f1: 300, q: 4 }); // chantilly espalhando
    const w = c.createOscillator(), g = c.createGain(); w.type = 'sine'; // apito cômico descendente (slide whistle)
    w.frequency.setValueAtTime(1900, t + .2); w.frequency.exponentialRampToValueAtTime(480, t + .85); lfo(c, w.frequency, t + .2, .7, 7, 25);
    g.gain.setValueAtTime(0, t + .2); g.gain.linearRampToValueAtTime(.35 * v, t + .25); g.gain.setValueAtTime(.35 * v, t + .75); g.gain.exponentialRampToValueAtTime(.0001, t + .95);
    w.connect(g).connect(d); w.start(t + .2); w.stop(t + 1);
  },
  impacto_balde(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    nz(c, d, t, 1.1, 1.5 * v, 5000, { f1: 700, tipo: 'lowpass', q: .8, at: .015, curva: .9 }); // splash grande
    nz(c, d, t, .5, .6 * v, 2500, { f1: 1200, q: 1.2 }); osc(c, d, t, .2, .6 * v, 110, 50);
    for (let i = 0; i < 14; i++) gota(c, d, t + R(.05, 1.1), .2 * v);
    for (let i = 0; i < 9; i++) gelo(c, d, t + .25 + R(0, 1) * R(0, 1.1), .22 * v); // gelo caindo e quicando
  },
  impacto_paulada(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    osc(c, d, t, .16, 1.5 * v, 540, 330); osc(c, d, t, .07, .6 * v, 1350); nz(c, d, t, .07, 1.2 * v, 1100, { q: 4 }); // TOC oco
    osc(c, d, t, .2, .8 * v, 160, 70);
    boing(c, d, t + .12, .6 * v, 210, .75);
  },
  impacto_cadeirada(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    nz(c, d, t, .35, .8 * v, 1200, { tipo: 'highpass', q: .5 }); nz(c, d, t, .2, .5 * v, 500, { tipo: 'lowpass' });
    osc(c, d, t, .35, .55 * v, 130, 42); // pancada
    metal(c, d, t, 310, .3 * v, 1.6, [1, 1.47, 2.76, 3.91, 5.4, 8.93]); metal(c, d, t + .01, 523, .14 * v, 1.1, [1, 2.33, 4.1]); // clang
    for (let i = 0; i < 10; i++) { const tt = t + .12 + i * R(.04, .08); metal(c, d, tt, R(1500, 2800), .07 * v * (1 - i / 12), .1, [1, 2.76]); } // pés chacoalhando
  },
  queda(o = {}) { const a = abre(o); if (!a) return; baque(a.c, a.d, a.t, 1.6 * a.v); baque(a.c, a.d, a.t + .14, .6 * a.v); },
  /** Passarinhos piando + assobio de tontura por dur s. */
  zonzo(o = {}) {
    const a = abre(o); if (!a) return; const { c, t, v, b } = a; const dur = Math.max(1, Math.min(10, o.dur ?? 4)), pan = o.pan ?? 0;
    const mestre = c.createGain(); mestre.connect(a.d); mestre.gain.setValueAtTime(0, t); mestre.gain.linearRampToValueAtTime(1, t + .25); mestre.gain.setValueAtTime(1, t + dur - .6); mestre.gain.linearRampToValueAtTime(0, t + dur);
    for (let tt = .1; tt < dur - .3; tt += R(.25, .5)) { // grupos de pios, girando em volta da cabeça (pan circular) com fade
      const lado = b.saida(pan + .5 * Math.sin(tt * 2 * Math.PI * .8)), f = R(2600, 4200), n = 2 + Math.floor(Math.random() * 3), k0 = Math.min(1, tt / .3, (dur - tt) / .8);
      for (let k = 0; k < n; k++) {
        const t0 = t + tt + k * R(.07, .1), os = c.createOscillator(), g = c.createGain();
        os.frequency.setValueAtTime(f * 1.35, t0); os.frequency.exponentialRampToValueAtTime(f * .8, t0 + .03); os.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + .065);
        lfo(c, os.frequency, t0, .07, 70, f * .06); env(g.gain, t0, .16 * v * k0, .006, .075); os.connect(g).connect(lado); os.start(t0); os.stop(t0 + .1);
      }
    }
    const w = c.createOscillator(), g = c.createGain(); w.type = 'sine'; w.frequency.value = 820; // assobio de tontura ondulante
    lfo(c, w.frequency, t, dur, 1.4, 160); lfo(c, w.frequency, t, dur, 6, 12);
    g.gain.value = .065 * v; w.connect(g).connect(mestre); w.start(t); w.stop(t + dur + .05);
  },
  levanta(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    boing(c, d, t, .38 * v, 300, .45); nz(c, d, t, .25, .08 * v, 2400, { f1: 1500, q: 6, at: .05 }); // rangido leve
  },
  some(o = {}) {
    const a = abre(o); if (!a) return; const { c, d, t, v } = a;
    nz(c, d, t, .3, .7 * v, 2500, { f1: 450, q: 1.2, at: .02 }); osc(c, d, t, .14, .35 * v, 700, 200);
  },
  /** Plateia: "ôôôh" (sobe e cai). */
  plateiaOh(o = {}) {
    const a = abre(o); if (!a) return;
    vozes(a.c, a.d, a.t, 1.7, .75 * a.v, 12, 150, [[0, .95, 480, 850], [.3, 1.12, 450, 800], [.75, .92, 420, 760], [1, .82, 400, 720]]);
  },
  /** Plateia: "ownnn" carinhoso (começa alto, desce, termina nasal). */
  plateiaAww(o = {}) {
    const a = abre(o); if (!a) return;
    vozes(a.c, a.d, a.t, 1.9, .75 * a.v, 12, 175, [[0, 1.3, 720, 1150], [.25, 1.25, 650, 1050], [.6, .95, 450, 850], [1, .8, 300, 1300]]);
  },
};
