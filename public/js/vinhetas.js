// Vinhetas de TV dos blocos no telão curvo: tudo procedural em canvas 2D (sem imagens), determinístico em t, + SFX WebAudio.
// Coordenadas de projeto 2048×576 (tile do telão); camadas estáticas pré-renderizadas em cache, só compostas por frame.
import { audioBase } from './voz.js';

export const VINHETA_S = 5;
export const TITULOS = { 1: 'Temas Diversos', 2: 'Debate frente a frente', 3: 'Considerações finais' };
const FONTE = '"Lilita One", "Arial Black", Impact, sans-serif';
const FONTE_TXT = '"Nunito", "Segoe UI", Arial, sans-serif';
const DW = 2048, DH = 576, DISS = .6, TI = 1.03, TAU = Math.PI * 2; // TI = instante do impacto do "BLOCO N"

// ---------- utilitários ----------
const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const fase = (t, a, b) => cl((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eOutExpo = k => k >= 1 ? 1 : 1 - 2 ** (-10 * k);
const eOutCubic = k => 1 - (1 - k) ** 3;
const eInCubic = k => k ** 3;
const eInOut = k => k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
const eOutBack = (k, s = 1.6) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2;
const pulso = (t, a, b, c) => t <= a || t >= c ? 0 : t < b ? eOutCubic((t - a) / (b - a)) : (1 - (t - b) / (c - b)) ** 2;
const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const cor = (rgb, a) => `rgba(${rgb},${a})`;
const AZUL = '110,170,255', OURO = '255,196,80', BRANCO = '255,255,255', CIANO = '120,210,255';
function grad(g, x0, y0, x1, y1, st) { const l = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of st) l.addColorStop(o, c); return l; }
function poly(g, pts) { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
const add = (x, f) => { x.save(); x.globalCompositeOperation = 'lighter'; f(); x.restore(); };
const alfa = (x, a, f) => { if (a <= .002) return; x.save(); x.globalAlpha *= Math.min(1, a); f(); x.restore(); };

// ---------- cache de camadas (por tamanho de tile; refeito quando as fontes carregam) ----------
let K = 1, C = {}, fontesOk = false;
const CACHES = {};
function prep(W, H) {
  if (!fontesOk) try { fontesOk = !document.fonts || (document.fonts.check('40px "Lilita One"') && document.fonts.check('900 40px "Nunito"')); } catch { fontesOk = true; }
  const ch = W + 'x' + H + fontesOk;
  C = CACHES[ch] ||= { K: Math.min(1.5, Math.max(.2, W / DW)) }; K = C.K;
}
function cv(w, h, f) {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * K)); c.height = Math.max(1, Math.ceil(h * K));
  const g = c.getContext('2d'); g.scale(K, K); c.w = w; c.h = h; f?.(g, w, h); return c;
}
const m = (n, f) => C[n] || (C[n] = f());
const img = (x, c, px, py, w = c.w, h = c.h) => x.drawImage(c, px, py, w, h);
const medir = (fnt, txt) => { const g = m('medidor', () => document.createElement('canvas').getContext('2d')); g.font = fnt; return g.measureText(txt).width; };
function espacado(g, txt, x, y, esp) { // texto centrado com espaçamento entre letras
  const ls = [...txt], ws = ls.map(ch => g.measureText(ch).width), w = ws.reduce((a, b) => a + b + esp, -esp);
  let px = x - w / 2; g.textAlign = 'left'; ls.forEach((ch, i) => { g.fillText(ch, px, y); px += ws[i] + esp; }); return w;
}
/** Reflexo especular: desenha `c` com uma faixa de luz diagonal na posição p (0..1) só sobre os pixels opacos. */
function varre(x, c, px, py, p, a = .9, w = c.w, h = c.h) {
  if (!(p > 0 && p < 1)) return img(x, c, px, py, w, h);
  const T = m('tmp' + c.width + 'x' + c.height, () => cv(c.w, c.h)), g = T.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, T.width, T.height); g.drawImage(c, 0, 0);
  g.setTransform(K, 0, 0, K, 0, 0); g.globalCompositeOperation = 'source-atop';
  const bx = -c.w * .25 + p * c.w * 1.5, bw = c.h * .45;
  g.fillStyle = grad(g, bx - bw, c.h, bx + bw, 0, [[0, cor(BRANCO, 0)], [.42, cor(BRANCO, a * .5)], [.5, cor(BRANCO, a)], [.58, cor(BRANCO, a * .5)], [1, cor(BRANCO, 0)]]);
  g.fillRect(0, 0, c.w, c.h); g.globalCompositeOperation = 'source-over';
  x.drawImage(T, px, py, w, h);
}

// ---------- sprites de luz ----------
const glow = rgb => m('glow' + rgb, () => cv(256, 256, g => {
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, cor(rgb, 1)); r.addColorStop(.22, cor(rgb, .5)); r.addColorStop(.55, cor(rgb, .12)); r.addColorStop(1, cor(rgb, 0));
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
}));
function brilho(x, rgb, px, py, r, a = 1, ry = r) { if (a <= .003) return; const ga = x.globalAlpha; x.globalAlpha = ga * Math.min(1, a); x.drawImage(glow(rgb), px - r, py - ry, r * 2, ry * 2); x.globalAlpha = ga; }
const risco = () => m('risco', () => cv(1024, 64, g => {
  g.translate(512, 32); g.scale(1, .0625); const r = g.createRadialGradient(0, 0, 0, 0, 0, 512);
  r.addColorStop(0, cor(BRANCO, 1)); r.addColorStop(.18, 'rgba(190,220,255,.55)'); r.addColorStop(1, 'rgba(120,170,255,0)');
  g.fillStyle = r; g.fillRect(-512, -512, 1024, 1024);
}));
function streak(x, px, py, w, h, a) { if (a <= .003) return; const ga = x.globalAlpha; x.globalAlpha = ga * Math.min(1, a); x.drawImage(risco(), px - w / 2, py - h / 2, w, h); x.globalAlpha = ga; }
const estrela = () => m('estrela', () => cv(64, 64, g => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, cor(BRANCO, 1)); r.addColorStop(.25, 'rgba(200,225,255,.45)'); r.addColorStop(1, 'rgba(150,200,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,.95)'; poly(g, [[32, 0], [34, 30], [64, 32], [34, 34], [32, 64], [30, 34], [0, 32], [30, 30]]); g.fill();
}));
const feixe = () => m('feixe', () => cv(220, 1500, g => {
  g.fillStyle = grad(g, 0, 0, 220, 0, [[0, 'rgba(120,170,255,0)'], [.5, 'rgba(170,205,255,.6)'], [1, 'rgba(120,170,255,0)']]); g.fillRect(0, 0, 220, 1500);
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = grad(g, 0, 0, 0, 1500, [[0, '#000'], [.45, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, 220, 1500);
}));
function desenhaFeixe(x, px, py, ang, a, larg = 1, alt = 1) { if (a <= .003) return; x.save(); x.translate(px, py); x.rotate(ang); x.globalAlpha *= Math.min(1, a); x.drawImage(feixe(), -110 * larg, 0, 220 * larg, 1500 * alt); x.restore(); }
const cone = () => m('cone', () => cv(500, 700, g => {
  for (const [k, a] of [[1, .1], [.72, .14], [.45, .2], [.22, .25]]) {
    poly(g, [[238, 0], [262, 0], [250 + 250 * k, 700], [250 - 250 * k, 700]]);
    g.fillStyle = grad(g, 0, 0, 0, 700, [[0, `rgba(255,250,230,${a})`], [.6, `rgba(200,220,255,${a * .35})`], [1, 'rgba(200,220,255,0)']]); g.fill();
  }
}));

// ---------- fundos (gradiente de estúdio + piso brilhante) ----------
const FUNDOS = { 0: ['#123c9e', '#0a2672', '#030c34'], 1: ['#2563e8', '#0c2f94', '#020b33'], 2: ['#1d52c8', '#0a2a80', '#030c34'], 3: ['#1648b0', '#08216e', '#020826'] };
function fundo(b) {
  return m('fundo' + b, () => cv(DW, DH, g => {
    const [c0, c1, c2] = FUNDOS[b];
    const r = g.createRadialGradient(1024, 230, 40, 1024, 260, 1250); r.addColorStop(0, c0); r.addColorStop(.42, c1); r.addColorStop(1, c2);
    g.fillStyle = r; g.fillRect(0, 0, DW, DH);
    g.fillStyle = grad(g, 0, 466, 0, DH, [[0, 'rgba(2,8,30,.3)'], [1, 'rgba(1,4,18,.9)']]); g.fillRect(0, 466, DW, DH - 466);
    g.save(); g.translate(1024, 505); g.scale(1, .13); const f = g.createRadialGradient(0, 0, 0, 0, 0, 760);
    f.addColorStop(0, 'rgba(140,190,255,.45)'); f.addColorStop(1, 'rgba(140,190,255,0)'); g.fillStyle = f; g.fillRect(-1100, -900, 2200, 1800); g.restore();
    g.fillStyle = grad(g, 0, 0, DW, 0, [[0, 'rgba(150,200,255,0)'], [.5, 'rgba(200,225,255,.85)'], [1, 'rgba(150,200,255,0)']]); g.fillRect(0, 465, DW, 2);
    if (b === 3 || b === 0) { g.strokeStyle = 'rgba(120,170,255,.1)'; g.lineWidth = 1.5; for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(1024 + i * 45, 468); g.lineTo(1024 + i * 230, DH); g.stroke(); } }
    if (b === 2) {
      g.fillStyle = grad(g, 0, 0, 0, 28, [[0, '#050b22'], [1, '#0d1d4a']]); g.fillRect(0, 0, DW, 26);
      g.fillStyle = 'rgba(160,190,255,.25)'; g.fillRect(0, 26, DW, 2);
      for (let i = 0; i < 12; i++) { const lx = 90 + i * 170; brilho(g, '255,240,200', lx, 22, 34, .7); g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(lx, 20, 6, 0, TAU); g.fill(); }
    }
    const v = g.createRadialGradient(1024, 288, 380, 1024, 288, 1150); v.addColorStop(0, 'rgba(0,0,15,0)'); v.addColorStop(1, 'rgba(0,0,15,.6)');
    g.fillStyle = v; g.fillRect(0, 0, DW, DH);
  }));
}

// ---------- Congresso Nacional (cúpula, prato invertido, torres) com reflexo na água ----------
function congresso(sol) {
  return m('cong' + sol, () => {
    const H0 = 220;
    const est = cv(600, H0, g => {
      const forma = () => {
        g.beginPath(); g.rect(20, 196, 560, 24); g.rect(150, 186, 40, 12);
        g.moveTo(78, 146); g.bezierCurveTo(102, 202, 238, 202, 262, 146); g.closePath();
        g.moveTo(376, 197); g.ellipse(440, 197, 64, 40, 0, Math.PI, TAU); g.closePath();
        g.rect(288, 22, 24, 176); g.rect(318, 22, 24, 176); g.rect(288, 96, 54, 9);
      };
      forma(); g.fillStyle = sol ? grad(g, 0, 20, 0, 220, [[0, '#2a1638'], [1, '#120a20']]) : grad(g, 0, 20, 0, 220, [[0, '#4f7fe0'], [.6, '#24479a'], [1, '#10285e']]); g.fill();
      g.save(); forma(); g.clip();
      g.fillStyle = sol ? grad(g, 0, 0, 380, 0, [[0, 'rgba(255,150,70,.6)'], [1, 'rgba(255,150,70,0)']]) : grad(g, 600, 0, 260, 0, [[0, 'rgba(230,242,255,.85)'], [1, 'rgba(210,235,255,.05)']]);
      g.fillRect(0, 0, 600, H0);
      for (const tx of [288, 318]) for (let y = 30; y < 190; y += 7) { const a = .3 + .65 * hash(y * 3 + tx); g.fillStyle = sol ? `rgba(255,180,100,${a * .45})` : `rgba(255,238,190,${a})`; g.fillRect(tx + 4, y, 16, 2.6); }
      g.restore();
      g.lineWidth = 2.5; g.strokeStyle = sol ? 'rgba(255,190,120,.85)' : 'rgba(235,245,255,.85)';
      g.beginPath(); g.ellipse(170, 146, 92, 6, 0, 0, TAU); g.stroke();
      g.beginPath(); g.ellipse(440, 197, 64, 40, 0, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      for (let i = 0; i < 42; i++) { g.fillStyle = sol ? 'rgba(255,200,130,.9)' : 'rgba(255,235,180,.95)'; g.beginPath(); g.arc(28 + i * 13.3, 208, 1.7, 0, TAU); g.fill(); }
    });
    return cv(600, 340, g => {
      const hz = g.createRadialGradient(300, H0, 10, 300, H0, 320);
      hz.addColorStop(0, sol ? 'rgba(255,160,70,.85)' : 'rgba(150,205,255,.75)'); hz.addColorStop(.45, sol ? 'rgba(230,80,110,.3)' : 'rgba(60,110,230,.18)'); hz.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = hz; g.fillRect(0, 0, 600, 340);
      g.fillStyle = sol ? 'rgba(40,10,40,.35)' : 'rgba(4,16,50,.35)'; g.fillRect(0, H0, 600, 120);
      img(g, est, 0, 0);
      for (let dy = 0; dy < 120; dy += 3) {
        const sy = Math.max(0, H0 - dy - 3), off = Math.sin(dy * .55) * 3 * (dy / 120);
        g.globalAlpha = .5 * (1 - dy / 120); g.drawImage(est, 0, sy * K, est.width, 3 * K, off, H0 + dy, 600, 3);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) { g.fillStyle = sol ? 'rgba(255,170,90,.25)' : 'rgba(170,210,255,.22)'; g.fillRect(270 + Math.sin(i * 2.1) * 30, H0 + 8 + i * 11, 90 - i * 7, 1.5); }
    });
  });
}

// ---------- bandeira, mapa, faixas, títulos ----------
function bandeira() {
  return m('bandeira', () => cv(400, 280, g => {
    rr(g, 0, 0, 400, 280, 8); g.fillStyle = grad(g, 0, 0, 400, 280, [[0, '#00b347'], [1, '#00782f']]); g.fill();
    poly(g, [[200, 26], [370, 140], [200, 254], [30, 140]]); g.fillStyle = grad(g, 0, 26, 0, 254, [[0, '#ffe733'], [1, '#f2c200']]); g.fill();
    g.beginPath(); g.arc(200, 140, 72, 0, TAU); g.fillStyle = grad(g, 0, 68, 0, 212, [[0, '#1646a8'], [1, '#00205e']]); g.fill();
    g.save(); g.beginPath(); g.arc(200, 140, 72, 0, TAU); g.clip();
    const yArc = px => 350 - Math.sqrt(218 * 218 - (px - 200) ** 2);
    for (let i = 0; i < 40; i++) {
      const a = hash(i * 1.7) * TAU, r = Math.sqrt(hash(i * 2.9 + 5)) * 64, px = 200 + Math.cos(a) * r, py = 140 + Math.sin(a) * r;
      if (py < yArc(px) + 13) continue; g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 1.1 + 1.7 * hash(i + 9), 0, TAU); g.fill();
    }
    g.beginPath(); g.arc(200, 350, 218, Math.PI * 1.2, Math.PI * 1.8); g.lineWidth = 17; g.strokeStyle = '#fff'; g.stroke();
    g.font = `900 10.5px ${FONTE_TXT}`; g.fillStyle = '#0a8a3a'; g.textAlign = 'center';
    const txt = [...'ORDEM E PROGRESSO'], ws = txt.map(ch => g.measureText(ch).width + .8), tot = ws.reduce((a, b) => a + b, 0);
    let acc = 0; txt.forEach((ch, i) => { const an = -Math.PI / 2 - tot / 218 / 2 + (acc + ws[i] / 2) / 218; acc += ws[i]; g.save(); g.translate(200 + 218 * Math.cos(an), 350 + 218 * Math.sin(an)); g.rotate(an + Math.PI / 2); g.fillText(ch, 0, 3.8); g.restore(); });
    g.restore();
    rr(g, 0, 0, 400, 280, 8); g.fillStyle = grad(g, 0, 0, 400, 280, [[0, 'rgba(255,255,255,.2)'], [.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.18)']]); g.fill();
  }));
}
const BR = [[-60.7, 5.2], [-60, 5.1], [-59.6, 4.2], [-59.6, 2.6], [-58.5, 1.5], [-56.5, 1.9], [-55, 2.4], [-54, 2.2], [-52.9, 2.2], [-51.6, 4.3], [-51, 3.8], [-50, 1.8], [-49.3, -.2], [-48.3, -1.3], [-46.5, -1], [-44.5, -2.4], [-42, -2.8], [-39.5, -2.9], [-37.2, -4.8], [-35.2, -5.4], [-34.8, -7.5], [-35.3, -9.5], [-37, -11.2], [-38.5, -13], [-39, -15], [-39.2, -17.8], [-40.2, -20.3], [-41, -22], [-42, -22.9], [-44.5, -23.3], [-46.5, -24], [-48.5, -25.8], [-48.6, -28.5], [-50.2, -30.5], [-52.5, -33.7], [-53.5, -33.3], [-53.4, -32.3], [-55.5, -30.9], [-57.6, -30.2], [-56.9, -29], [-55.8, -28], [-54.6, -25.6], [-54.3, -24], [-55.5, -23.3], [-55.6, -22.3], [-57.8, -22.1], [-58, -20], [-57.5, -18], [-58.4, -16.3], [-60.2, -15.3], [-60.4, -13.5], [-62.2, -12.6], [-63.5, -12.5], [-65.3, -11], [-65.5, -9.8], [-66.6, -9.9], [-68.6, -11], [-70.6, -11], [-70.5, -9.5], [-72.7, -10], [-73.9, -7.4], [-73, -5.2], [-70, -4.3], [-69.4, -1.2], [-70, .6], [-69.3, 1], [-67.3, 1.8], [-66.8, 1.2], [-65, .8], [-64, 1.6], [-63.4, 2.1], [-64.1, 3.8], [-62.8, 4], [-61.3, 4.5]]
  .map(([lo, la]) => [(lo + 74.5) / 41 * 380, (5.5 - la) / 39.5 * 370]);
const dentro = (px, py) => { let d = false; for (let i = 0, j = BR.length - 1; i < BR.length; j = i++) { const [xi, yi] = BR[i], [xj, yj] = BR[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) d = !d; } return d; };
const mapa = () => m('mapa', () => cv(380, 370, g => {
  poly(g, BR); g.fillStyle = 'rgba(60,120,255,.12)'; g.fill(); g.strokeStyle = 'rgba(140,195,255,.35)'; g.lineWidth = 2; g.stroke();
  for (let y = 4; y < 370; y += 9) for (let px = 4; px < 380; px += 9) if (dentro(px, y)) { const h = hash(px * 13 + y); g.fillStyle = `rgba(${h > .9 ? '255,255,255' : '130,190,255'},${.45 + .5 * h})`; g.beginPath(); g.arc(px, y, 2.3, 0, TAU); g.fill(); }
}));
/** Faixas curvas verde/amarela de canto (desenhadas para o canto superior esquerdo). */
const fitas = () => m('fitas', () => cv(1200, 520, g => {
  const curva = o => { g.beginPath(); g.moveTo(1180, -40 + o * .4); g.bezierCurveTo(600 + o * .4, 0 + o * .95, 140 + o * .9, 70 + o * .7, -40 + o * .45, 500 + o * .1); };
  const faixa = (o, lw, rgb, a, bA) => {
    curva(o); g.lineWidth = lw; g.strokeStyle = grad(g, 1230, -40, -40, 520, [[0, cor(rgb, 0)], [.16, cor(rgb, a)], [.82, cor(rgb, a)], [1, cor(rgb, a * .6)]]);
    g.shadowColor = cor(rgb, .75); g.shadowBlur = 26; g.stroke(); g.shadowBlur = 0;
    if (bA) { curva(o - lw * .2); g.lineWidth = lw * .16; g.strokeStyle = grad(g, 1230, -40, -40, 520, [[0, cor(BRANCO, 0)], [.3, cor(BRANCO, bA)], [.7, cor(BRANCO, bA * .4)], [1, cor(BRANCO, 0)]]); g.stroke(); }
  };
  faixa(0, 9, '255,255,255', .75); faixa(36, 60, '0,168,80', 1, .5); faixa(88, 32, '255,210,0', 1, .6); faixa(118, 7, '0,210,110', .85);
}));
function fitasAnim(x, e, tf) {
  const c = fitas(), put = (ee, a) => alfa(x, a, () => img(x, c, -(1 - ee) * 1300, -(1 - ee) * 430));
  x.save(); tf(x);
  if (e > 0 && e < .985) { const a = Math.min(1, (1 - e) * 5); put(e - .12, .32 * a); put(e - .24, .15 * a); }
  if (e > 0) put(e, 1); x.restore();
}
/** Texto grande metálico em itálico: { face, sombra }. tipo: prata | branco | marinho. */
const ESTILOS = {
  prata: { fill: [[0, '#ffffff'], [.3, '#eef2f8'], [.47, '#aeb9cc'], [.5, '#56637e'], [.57, '#9aa8c0'], [.78, '#e9eef6'], [1, '#ffffff']], borda: [[0, '#ffffff'], [.5, '#8094ba'], [1, '#1c2c58']], sombra: '#071538' },
  branco: { fill: [[0, '#ffffff'], [.52, '#f3f6fb'], [.58, '#c8d3e6'], [1, '#ffffff']], borda: [[0, '#e6eeff'], [1, '#4a6ab8']], sombra: '#06123a' },
  marinho: { fill: [[0, '#2e5bd0'], [.48, '#163a99'], [.52, '#0b2463'], [1, '#183f99']], borda: [[0, '#ffffff'], [1, '#c4cfe2']], sombra: 'rgba(10,20,60,.55)' },
};
function tituloCromo(txt, tam, tipo) {
  return m('tit' + txt + tam + tipo, () => {
    const fnt = `${tam}px ${FONTE}`, w = medir(fnt, txt), pad = tam * .3, cw = w + tam * .4 + pad * 2, ch = tam * 1.05 + pad * 2, by = pad + tam * .82, E = ESTILOS[tipo];
    const des = (g, f) => { g.save(); g.translate(cw / 2, by); g.transform(1, 0, -.2, 1, 0, 0); g.font = fnt; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; f(g); g.restore(); };
    const sombra = cv(cw, ch, g => des(g, g => { g.shadowColor = 'rgba(0,6,30,.9)'; g.shadowBlur = tam * .14; g.shadowOffsetY = tam * .05; g.strokeStyle = E.sombra; g.fillStyle = E.sombra; g.lineWidth = tam * .12; g.strokeText(txt, 0, 0); g.fillText(txt, 0, 0); }));
    const face = cv(cw, ch, g => des(g, g => {
      const gr = st => grad(g, 0, -tam * .74, 0, tam * .02, st);
      g.strokeStyle = gr(E.borda); g.lineWidth = tam * .065; g.strokeText(txt, 0, 0);
      g.fillStyle = gr(E.fill); g.fillText(txt, 0, 0);
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = tam * .012; g.strokeText(txt, 0, 0);
    }));
    return { face, sombra };
  });
}
/** Faixa do subtítulo: { fundo, texto }. */
function banda(b) {
  return m('banda' + b, () => {
    const txt = TITULOS[b], fnt = b === 1 ? `900 66px ${FONTE_TXT}` : `italic 900 64px ${FONTE_TXT}`, bw = medir(fnt, txt) + 170, bh = 104, sk = 34, p = 14;
    const W = bw + sk + p * 2, H = bh + p * 2 + 14, P = [[p + sk, p], [p + sk + bw, p], [p + bw, p + bh], [p, p + bh]];
    const fundo = cv(W, H, g => {
      poly(g, P); g.shadowColor = 'rgba(0,4,30,.7)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
      g.fillStyle = b === 3 ? grad(g, 0, p, 0, p + bh, [[0, '#f0364c'], [.5, '#c4122b'], [1, '#86071b']]) : grad(g, 0, p, 0, p + bh, [[0, '#ffffff'], [.5, '#f2f5fb'], [1, '#d5deee']]);
      g.fill(); g.shadowColor = 'transparent';
      g.save(); poly(g, P); g.clip();
      if (b === 1) { g.fillStyle = '#00a651'; g.fillRect(0, p, W, 10); g.fillStyle = '#ffd400'; g.fillRect(0, p + bh - 10, W, 10); poly(g, [[p + sk, p], [p + sk + 30, p], [p + 30, p + bh], [p, p + bh]]); g.fillStyle = '#00a651'; g.fill(); poly(g, [[p + sk + bw - 30, p], [p + sk + bw, p], [p + bw, p + bh], [p + bw - 30, p + bh]]); g.fillStyle = '#ffd400'; g.fill(); }
      if (b === 2) { poly(g, [[p + sk, p], [p + sk + 34, p], [p + 34, p + bh], [p, p + bh]]); g.fillStyle = '#d0142c'; g.fill(); g.fillStyle = '#0b2160'; g.fillRect(0, p, W, 5); }
      if (b === 3) { g.fillStyle = 'rgba(255,220,120,.9)'; g.fillRect(0, p, W, 4); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, p + 4, W, bh * .42); g.fillStyle = 'rgba(60,0,10,.5)'; g.fillRect(0, p + bh - 4, W, 4); }
      g.restore();
      if (b === 2) { poly(g, [[p + sk * .2 + 40, p + bh + 6], [p + bw + 10, p + bh + 6], [p + bw + 8, p + bh + 12], [p + 38, p + bh + 12]]); g.fillStyle = '#e0182f'; g.fill(); }
    });
    const texto = cv(W, H, g => {
      g.font = fnt; g.textAlign = 'center'; g.textBaseline = 'middle'; const tx = p + sk / 2 + bw / 2 + (b === 2 ? 14 : 0), ty = p + bh / 2 + 3;
      if (b === 3) { g.shadowColor = 'rgba(60,0,10,.8)'; g.shadowBlur = 8; g.shadowOffsetY = 3; g.fillStyle = '#fff'; }
      else g.fillStyle = grad(g, 0, p, 0, p + bh, [[0, '#14307e'], [1, '#081a4e']]);
      g.fillText(txt, tx, ty);
    });
    return { fundo, texto };
  });
}
const painel2 = () => m('painel2', () => cv(1020, 280, g => {
  const P = [[80, 12], [1008, 12], [940, 268], [12, 268]];
  poly(g, P); g.shadowColor = 'rgba(0,0,20,.7)'; g.shadowBlur = 30; g.fillStyle = grad(g, 0, 12, 0, 268, [[0, 'rgba(40,110,240,.95)'], [.5, 'rgba(14,58,170,.95)'], [1, 'rgba(8,34,110,.95)']]); g.fill(); g.shadowBlur = 0;
  g.save(); poly(g, P); g.clip(); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 12, 1020, 110);
  g.strokeStyle = 'rgba(140,190,255,.12)'; g.lineWidth = 1; for (let i = 0; i < 40; i++) { g.beginPath(); g.moveTo(i * 30, 12); g.lineTo(i * 30 - 70, 268); g.stroke(); }
  g.restore();
  g.fillStyle = grad(g, 0, 12, 0, 268, [[0, '#ff3a50'], [1, '#a80c22']]);
  poly(g, [[12, 268], [80, 12], [116, 12], [48, 268]]); g.fill(); poly(g, [[1008, 12], [940, 268], [904, 268], [972, 12]]); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(126, 12); g.lineTo(58, 268); g.moveTo(962, 12); g.lineTo(894, 268); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(116, 12, 856, 2); g.fillRect(48, 266, 856, 2);
}));
const placa3 = () => m('placa3', () => cv(860, 290, g => {
  const P = [[54, 18], [842, 18], [806, 272], [18, 272]];
  poly(g, P); g.shadowColor = 'rgba(0,0,20,.75)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
  g.fillStyle = grad(g, 0, 18, 0, 272, [[0, '#ffffff'], [.42, '#dfe5ee'], [.5, '#aab5c6'], [.56, '#d6dde8'], [.8, '#f2f5f9'], [1, '#b9c3d1']]); g.fill(); g.shadowColor = 'transparent';
  g.save(); poly(g, P); g.clip(); for (let y = 18; y < 272; y += 3) { g.fillStyle = hash(y) > .5 ? 'rgba(255,255,255,.18)' : 'rgba(90,100,130,.08)'; g.fillRect(0, y, 860, 1); } g.restore();
  poly(g, P); g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = grad(g, 0, 18, 0, 272, [[0, '#ff4257'], [1, '#a60b20']]); g.stroke();
  poly(g, [[70, 32], [824, 32], [792, 258], [36, 258]]); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
  const { face, sombra } = tituloCromo('BLOCO 3', 176, 'marinho'); img(g, sombra, 430 - sombra.w / 2, 150 - sombra.h / 2); img(g, face, 430 - face.w / 2, 148 - face.h / 2);
}));

// ---------- logotipos ----------
const logoOc = () => m('logoOc', () => {
  const f1 = `72px ${FONTE}`, a = 'DEBATE PRESIDENCIAL', b = '  ·  ELEIÇÕES 2026', wa = medir(f1, a) + 6 * 18, wb = medir(f1, b) + 6 * 17, W = wa + wb + 80;
  return cv(W, 170, g => {
    g.font = f1; g.textBaseline = 'alphabetic'; g.shadowColor = 'rgba(0,8,40,.8)'; g.shadowBlur = 18; g.shadowOffsetY = 5;
    g.fillStyle = grad(g, 0, 40, 0, 110, [[0, '#ffffff'], [.55, '#e3ebf8'], [1, '#aebfdd']]); espacado(g, a, 40 + wa / 2, 105, 6);
    g.fillStyle = grad(g, 0, 40, 0, 110, [[0, '#fff3a8'], [1, '#ffc400']]); espacado(g, b, 40 + wa + wb / 2, 105, 6);
    g.shadowColor = 'transparent'; const cx = W / 2;
    g.fillStyle = grad(g, cx - 330, 0, cx + 330, 0, [[0, 'rgba(0,168,80,0)'], [.2, '#00a850'], [.5, '#00a850'], [.5, '#ffd400'], [.8, '#ffd400'], [1, 'rgba(255,212,0,0)']]); g.fillRect(cx - 330, 128, 660, 7);
  });
});
const cab2 = () => m('cab2', () => cv(900, 140, g => {
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.shadowColor = 'rgba(0,8,40,.85)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
  g.font = `58px ${FONTE}`; g.fillStyle = grad(g, 0, 15, 0, 70, [[0, '#ffffff'], [1, '#cfdcf2']]); espacado(g, 'ELEIÇÕES 2026', 450, 66, 4);
  g.shadowColor = 'transparent'; g.fillStyle = '#00a850'; poly(g, [[392, 78], [450, 78], [446, 86], [388, 86]]); g.fill(); g.fillStyle = '#ffd400'; poly(g, [[452, 78], [512, 78], [508, 86], [448, 86]]); g.fill();
  g.font = `800 30px ${FONTE_TXT}`; g.fillStyle = '#d6e4ff'; espacado(g, 'DEBATE PRESIDENCIAL', 450, 124, 13);
}));
const logo1 = () => m('logo1', () => cv(460, 90, g => {
  g.fillStyle = '#00a850'; g.fillRect(0, 10, 8, 32); g.fillStyle = '#ffd400'; g.fillRect(0, 44, 8, 32);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.font = `900 30px ${FONTE_TXT}`; g.fillStyle = '#ffffff'; g.fillText('DEBATE PRESIDENCIAL', 22, 40); g.font = `30px ${FONTE}`; g.fillStyle = '#ffd400'; g.fillText('ELEIÇÕES 2026', 22, 76);
}));
const logo3 = () => m('logo3', () => cv(560, 430, g => {
  img(g, mapa(), 90, 0); img(g, congresso(0), 130, 110, 300, 170);
  g.textAlign = 'center'; g.save(); g.translate(280, 352); g.transform(1, 0, -.18, 1, 0, 0); g.font = `112px ${FONTE}`; g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,6,30,.9)'; g.shadowBlur = 16; g.strokeStyle = '#081a4a'; g.lineWidth = 12; g.strokeText('DEBATE', 0, 0); g.shadowColor = 'transparent';
  g.fillStyle = grad(g, 0, -82, 0, 0, [[0, '#ffffff'], [.5, '#e6edf8'], [.56, '#aebcd6'], [1, '#ffffff']]); g.fillText('DEBATE', 0, 0); g.restore();
  g.fillStyle = '#00a850'; g.fillRect(170, 366, 110, 6); g.fillStyle = '#ffd400'; g.fillRect(280, 366, 110, 6);
  g.font = `42px ${FONTE}`; g.fillStyle = grad(g, 0, 380, 0, 414, [[0, '#fff3a8'], [1, '#ffc400']]); g.shadowColor = 'rgba(0,6,30,.8)'; g.shadowBlur = 8; espacado(g, 'ELEIÇÕES 2026', 280, 414, 5);
}));

// ---------- peças animadas comuns ----------
function particulas(x, t, n, a, sem = 0, y0 = 0, y1 = DH) {
  if (a <= 0) return; const sp = estrela(), hy = y1 - y0;
  add(x, () => { for (let i = 0; i < n; i++) {
    const h1 = hash(i + sem), h2 = hash(i * 7.3 + sem + 1), h3 = hash(i * 3.1 + sem + 2);
    const px = (h1 * DW + t * (h3 - .5) * 50 + DW) % DW, py = y1 - ((h2 * hy + t * (14 + 34 * h3)) % hy);
    const tw = .5 + .5 * Math.sin(t * (2 + 4 * h3) + i * 1.3), sz = 8 + 26 * h3 * tw;
    x.globalAlpha = a * tw * (.35 + .65 * h1); x.drawImage(sp, px - sz / 2, py - sz / 2, sz, sz);
  } });
}
function anel(x, t, cx, cy, rx, a, rgb = AZUL) {
  add(x, () => {
    brilho(x, rgb, cx, cy, rx * 1.2, a * .5, rx * .17);
    x.lineWidth = 3; x.strokeStyle = cor(rgb, a * .9); x.beginPath(); x.ellipse(cx, cy, rx, rx * .085, 0, 0, TAU); x.stroke();
    x.lineWidth = 2; x.strokeStyle = cor(BRANCO, a * .5); x.beginPath(); x.ellipse(cx, cy, rx * .62, rx * .052, 0, 0, TAU); x.stroke();
    const ang = t * 1.6; brilho(x, BRANCO, cx + Math.cos(ang) * rx, cy + Math.sin(ang) * rx * .085, 60, a * .8, 14);
  });
}
const saidaK = t => eInCubic(fase(t, 4.4, 5));
/** "BLOCO N": zoom-in com overshoot, rastro de zoom, reflexo varrendo; saída em zoom. */
function titulo(x, t, tit, cx, cy) {
  if (t < .8) return;
  const xa = fase(t, .8, 1.4), eo = saidaK(t);
  let s = (1 + 1.6 * (1 - eOutBack(xa))) * (1 + .5 * eo) * (1 + .012 * Math.sin(t * 2.2) * fase(t, 1.5, 2.2));
  const a = fase(t, .8, .92) * (1 - eo); if (a <= 0) return;
  const { face, sombra } = tit, put = (c, ss, al, p) => alfa(x, al, () => { x.translate(cx, cy); x.scale(ss, ss); p != null ? varre(x, c, -c.w / 2, -c.h / 2, p) : img(x, c, -c.w / 2, -c.h / 2); });
  if (sombra) put(sombra, s, a * .95);
  const p = t < 2.4 ? fase(t, 1.2, 1.9) : t < 3.9 ? fase(t, 3, 3.8) : 0;
  put(face, s, a, p > 0 && p < 1 ? eInOut(p) : null);
  const zb = Math.max(1 - xa / .5, eo);
  if (zb > 0) add(x, () => { for (const [k, al] of [[1.08, .26], [1.18, .14], [1.32, .07]]) put(face, s * k, al * a * zb); });
}
/** Faixa do subtítulo: abre do centro (wipe), texto desliza; brilho nas bordas enquanto abre. */
function faixa(x, t, bd, cx, cy, refl = false) {
  const ab = eOutExpo(fase(t, 1.8, 2.25)); if (ab <= 0) return;
  const xo = eInCubic(fase(t, 4.4, 4.95)), { fundo: f, texto: tx } = bd, w = f.w, h = f.h, at = eOutCubic(fase(t, 2, 2.55));
  const corpo = () => {
    x.save(); x.beginPath(); x.rect(-w / 2 * ab, -h / 2 - 6, w * ab, h + 12); x.clip(); img(x, f, -w / 2, -h / 2);
    if (at > 0) alfa(x, at, () => img(x, tx, -w / 2 + 150 * (1 - at), -h / 2)); x.restore();
  };
  alfa(x, 1 - xo, () => {
    x.translate(cx, cy); x.scale(1 + .3 * xo, 1 + .3 * xo); corpo();
    if (ab < 1) add(x, () => { for (const sx of [-1, 1]) { brilho(x, BRANCO, sx * w / 2 * ab, 0, 110, (1 - ab) * 1.4, 70); streak(x, sx * w / 2 * ab, 0, 60, 260, 1 - ab); } });
  });
  if (refl) alfa(x, .2 * (1 - xo), () => { x.beginPath(); x.rect(0, 468, DW, DH - 468); x.clip(); x.translate(cx, 2 * (cy + h / 2 - 10) - cy); x.scale(1, -1); corpo(); });
}
/** Flashes globais, flare do impacto, flare que varre o título e o "whip" de saída. */
function flashes(x, t, cx, cy) {
  const f = Math.max(pulso(t, .52, .7, 1) * .55, t > TI ? (1 - fase(t, TI, TI + .42)) ** 2 * .42 : 0, pulso(t, 4.72, 4.9, 5.25) * .32);
  if (f > .003) alfa(x, f, () => { x.fillStyle = '#eef4ff'; x.fillRect(0, 0, DW, DH); });
  add(x, () => {
    if (t > TI && t < TI + .8) {
      const k = fase(t, TI, TI + .55), r = 200 + 760 * eOutCubic(k);
      x.lineWidth = 10 * (1 - k) + 1; x.strokeStyle = cor(CIANO, .6 * (1 - k) ** 1.5); x.beginPath(); x.ellipse(cx, cy, r, r * .32, 0, 0, TAU); x.stroke();
      brilho(x, BRANCO, cx, cy, 380, (1 - k) * .7, 220); streak(x, cx, cy + 10, 2600, 110, (1 - k) * 1.2);
    }
    const p = fase(t, 1.2, 1.9);
    if (p > 0 && p < 1) {
      const fx = lerp(cx - 600, cx + 600, eInOut(p)), a = Math.sin(Math.PI * p);
      brilho(x, BRANCO, fx, cy - 30, 170, a * .9); streak(x, fx, cy - 30, 1500, 64, a); brilho(x, CIANO, fx, cy - 30, 60, a);
      for (const [k2, r] of [[.5, 26], [.9, 46], [1.4, 18]]) brilho(x, AZUL, cx + (cx - fx) * k2, cy - 30 + 20 * k2, r, a * .5);
    }
    const w = fase(t, 4.55, 4.98);
    if (w > 0 && w < 1) { const a = Math.sin(Math.PI * w); streak(x, lerp(-400, DW + 400, eInOut(w)), cy, 1800, 220, a * 1.3); brilho(x, BRANCO, lerp(-400, DW + 400, eInOut(w)), cy, 260, a * .6, 160); }
  });
}
const pulsoAzul = (x, t, cx, cy, a = 1) => add(x, () => brilho(x, AZUL, cx, cy, 950, a * (.16 + .07 * Math.sin(t * 3.1)), 360));

// ---------- BLOCO 1: Temas Diversos ----------
function bloco1(x, t) {
  const cx = 1010, cy = 222, ei = eOutExpo(fase(t, 0, .9)), par = Math.max(0, t - .8) * 5, ef = ei * (1 - eInCubic(fase(t, 4.45, 5)));
  img(x, fundo(1), 0, 0);
  add(x, () => {
    for (let i = 0; i < 7; i++) desenhaFeixe(x, -120 + i * 340 + Math.sin(t * .35 + i) * 24, -60, .55 - i * .02 - (1 - ei) * 1.2 + Math.sin(t * .5 + i * 2) * .035,
      (.2 + .12 * Math.sin(t * 1.1 + i * 1.9)) * (.35 + .65 * ei) + (1 - ei) * .3 * (t > .02), 1.25);
  });
  pulsoAzul(x, t, cx, 300, fase(t, .5, 1.2));
  anel(x, t, cx, 515, 560, .55 + .2 * Math.sin(t * 2.4));
  fitasAnim(x, ef, () => {}); fitasAnim(x, ef, x => { x.translate(DW, DH); x.rotate(Math.PI); x.scale(.72, .72); });
  const ec = eOutCubic(fase(t, .25, 1.3)); alfa(x, ec, () => img(x, congresso(0), 1390 + 90 * (1 - ec) - par, 213, 690, 391));
  const at = fase(t, .9, 1.3) * (1 - saidaK(t));
  add(x, () => { brilho(x, OURO, cx, cy + 112, 560, at * .8, 50); brilho(x, '255,230,150', cx, cy + 112, 260, at * .7, 22); });
  titulo(x, t, tituloCromo('BLOCO 1', 236, 'prata'), cx, cy);
  faixa(x, t, banda(1), cx, 432);
  particulas(x, t, 46, fase(t, 1, 2), 11);
  alfa(x, fase(t, 1.2, 2) * (1 - saidaK(t)), () => img(x, logo1(), 56, 474));
  flashes(x, t, cx, cy);
}

// ---------- BLOCO 2: Debate frente a frente ----------
function bloco2(x, t) {
  const cx = 1024, cy = 268, ei = eOutExpo(fase(t, 0, .9)), par = Math.max(0, t - .8) * 5, ef = ei * (1 - eInCubic(fase(t, 4.45, 5)));
  img(x, fundo(2), 0, 0);
  add(x, () => {
    [140, 430, 1618, 1908].forEach((px, i) => {
      const a = fase(t, .05 + i * .07, .25 + i * .07), lado = i < 2 ? -1 : 1, ang = lado * (.32 - .2 * eOutCubic(fase(t, 0, 1.2))) + Math.sin(t * .8 + i * 1.7) * .1;
      x.save(); x.translate(px, 18); x.rotate(ang); x.globalAlpha = a * (.8 + .2 * Math.sin(t * 5 + i)); x.drawImage(cone(), -250, 0, 500, 760); x.restore();
      brilho(x, '255,245,220', px, 20, 60, a);
    });
  });
  pulsoAzul(x, t, cx, cy, fase(t, .4, 1.2));
  fitasAnim(x, ef, x => { x.translate(0, DH); x.scale(.66, -.66); });
  const ec = eOutCubic(fase(t, .2, 1.2));
  alfa(x, ec, () => img(x, congresso(1), 120 - par, 228, 640, 363));
  const ep = eOutExpo(fase(t, .15, .8)), eo = saidaK(t);
  alfa(x, ep * (1 - eo), () => { const p = painel2(); x.translate(cx - 400 * (1 - ep), cy - 6); x.scale(1 + .2 * eo, 1 + .2 * eo); img(x, p, -p.w / 2, -p.h / 2); });
  const eb = eOutCubic(fase(t, .35, 1.1));
  alfa(x, eb, () => bandeiraOnda(x, t, 1618 + 160 * (1 - eb) + par * .4, 128));
  const eh = eOutCubic(fase(t, .45, 1.05)); alfa(x, eh * (1 - eo), () => { const c = cab2(); img(x, c, cx - c.w * .4, -20 * (1 - eh) - 6, c.w * .8, c.h * .8); });
  titulo(x, t, tituloCromo('BLOCO 2', 196, 'branco'), cx, cy);
  faixa(x, t, banda(2), cx, 458);
  particulas(x, t, 40, fase(t, 1, 2), 23);
  flashes(x, t, cx, cy);
}
function bandeiraOnda(x, t, px, py) {
  const c = bandeira(), N = 40, sw = c.w / N;
  x.fillStyle = grad(x, px - 16, 0, px - 6, 0, [[0, '#7d8aa6'], [.5, '#ffffff'], [1, '#5d6a86']]); x.fillRect(px - 16, py - 26, 9, 430);
  x.fillStyle = '#e8eef8'; x.beginPath(); x.arc(px - 11.5, py - 28, 8, 0, TAU); x.fill();
  for (let i = 0; i < N; i++) {
    const sx = i * sw, f = sx / c.w, ph = sx * .022 - t * 3.2, dy = Math.sin(ph) * 10 * f, sh = Math.cos(ph) * f;
    x.drawImage(c, sx * K, 0, Math.min(sw * K + 1, c.width - sx * K), c.height, px + sx, py + dy, sw + .7, c.h);
    x.fillStyle = sh > 0 ? `rgba(255,255,255,${sh * .16})` : `rgba(0,0,30,${-sh * .32})`; x.fillRect(px + sx, py + dy + 4, sw + .7, c.h - 8);
  }
}

// ---------- BLOCO 3: Considerações finais ----------
function bloco3(x, t) {
  const cx = 1100, cy = 205, ei = eOutExpo(fase(t, 0, .9)), par = Math.max(0, t - .8) * 4, ef = ei * (1 - eInCubic(fase(t, 4.45, 5)));
  img(x, fundo(3), 0, 0);
  add(x, () => {
    [630, 700, 1500, 1570].forEach((px, i) => {
      const a = eOutExpo(fase(t, .1 + i * .06, .7 + i * .06)) * (.75 + .25 * Math.sin(t * 2.3 + i * 1.4));
      desenhaFeixe(x, px, 470, Math.PI, a * .9, i % 2 ? .45 : .7, .45 * (.3 + .7 * eOutExpo(fase(t, .1 + i * .06, .8 + i * .06))));
      brilho(x, CIANO, px, 468, 90, a * .8, 16);
    });
    for (let i = 0; i < 6; i++) desenhaFeixe(x, 200 + i * 330, -80, .3 * Math.sin(t * .3 + i * 1.3) - (1 - ei) * .9, .1 * ei + .25 * (1 - ei) * (t > .02), 1.1);
  });
  pulsoAzul(x, t, cx, cy + 60, fase(t, .4, 1.2));
  const el = eOutCubic(fase(t, .2, 1.1)), lg = logo3();
  alfa(x, el * (1 - saidaK(t) * .7), () => { x.save(); x.beginPath(); x.rect(0, 0, 40 + lg.w * eOutExpo(fase(t, .2, 1.3)) + 40, DH); x.clip(); img(x, lg, 40 - par * .6, 70); x.restore(); });
  anel(x, t, cx, 515, 520, .45 + .2 * Math.sin(t * 2.4), CIANO);
  fitasAnim(x, ef, x => { x.translate(DW, 0); x.scale(-.72, .72); }); fitasAnim(x, ef, x => { x.translate(DW, DH); x.rotate(Math.PI); x.scale(.62, .62); });
  titulo(x, t, { face: placa3(), sombra: null }, cx, cy);
  faixa(x, t, banda(3), cx, 412, true);
  particulas(x, t, 42, fase(t, 1, 2), 37);
  flashes(x, t, cx, cy);
}
const CENAS = { 1: bloco1, 2: bloco2, 3: bloco3 };
// pré-renderiza as camadas das vinhetas aos poucos (1 por quadro ocioso) p/ a 1ª vinheta não engasgar
const AQUECER = [() => fundo(1), () => fundo(2), () => fundo(3), () => congresso(0), () => congresso(1), fitas, bandeira, mapa, logo3, painel2, placa3, cab2, logo1,
  () => tituloCromo('BLOCO 1', 236, 'prata'), () => tituloCromo('BLOCO 2', 196, 'branco'), () => banda(1), () => banda(2), () => banda(3), cone, feixe, risco, estrela];
const aquecer = () => { if ((C.aq ??= 0) < AQUECER.length) AQUECER[C.aq++](); };

// ---------- ocioso (loop ambiente, emendável nas bordas do tile) ----------
function fitaOnda(x, t, yc, A, th, n, w, ph, c1, c2, a) {
  const N = 48, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N * TAU, X = i / N * DW, y = yc + A * Math.sin(n * s + w * t + ph) + A * .35 * Math.sin((n + 1) * s - w * .7 * t + ph * 2), k = th * (.6 + .4 * Math.sin(n * s + w * 1.3 * t + ph + 1));
    top.push(X, y - k / 2); bot.push(X, y + k / 2);
  }
  x.beginPath(); for (let i = 0; i < top.length; i += 2) i ? x.lineTo(top[i], top[i + 1]) : x.moveTo(top[i], top[i + 1]);
  for (let i = bot.length - 2; i >= 0; i -= 2) x.lineTo(bot[i], bot[i + 1]); x.closePath();
  x.globalAlpha = a; x.fillStyle = grad(x, 0, yc - A - th, 0, yc + A + th, [[0, c1], [1, c2]]); x.fill();
  x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * .55; x.strokeStyle = c2; x.lineWidth = 2;
  x.beginPath(); for (let i = 0; i < top.length; i += 2) i ? x.lineTo(top[i], top[i + 1]) : x.moveTo(top[i], top[i + 1]); x.stroke();
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
}
function ocioso(x, t) {
  img(x, fundo(0), 0, 0);
  add(x, () => {
    for (let i = 0; i < 5; i++) { const px = ((i * 470 + t * (18 + i * 6) * (i % 2 ? 1 : -1)) % DW + DW) % DW, py = 170 + (i % 3) * 90, a = .16 + .06 * Math.sin(t * .7 + i * 2);
      for (const o of [-DW, 0, DW]) if (Math.abs(px + o - 1024) < 1500) brilho(x, AZUL, px + o, py, 420, a, 210); }
    for (let i = 0; i < 4; i++) desenhaFeixe(x, ((i * 512 + t * 22) % DW), -80, .35 * Math.sin(t * .23 + i * 1.6), .1, 1.2);
  });
  fitaOnda(x, t, 120, 26, 16, 1, .25, 2, 'rgba(0,168,80,.5)', 'rgba(120,255,170,.7)', .35);
  fitaOnda(x, t, 400, 38, 50, 1, .32, 0, '#008f45', '#2fe08a', .6);
  fitaOnda(x, t, 444, 30, 26, 2, .27, 1.3, '#f2b600', '#ffe866', .55);
  fitaOnda(x, t, 470, 22, 6, 3, .4, 2.6, 'rgba(255,255,255,.4)', 'rgba(255,255,255,.9)', .5);
  const lg = logoOc(), p = (t % 7) / 1.8, lw = Math.min(1500, lg.w), lh = lg.h * lw / lg.w;
  alfa(x, .92, () => varre(x, lg, 1024 - lw / 2, 245 - lh / 2, p < 1 ? eInOut(p) : 0, .7, lw, lh));
  add(x, () => brilho(x, AZUL, 1024, 330, 700, .18 + .05 * Math.sin(t * 1.3), 40));
  particulas(x, t, 26, .8, 51);
  aquecer();
}

// ---------- API ----------
/** Desenha o quadro da vinheta do `bloco` no instante `t` (s, 0..VINHETA_S+0.6) num tile W×H (opaco).
 *  `tOc` (opcional) = relógio usado pelo quadro ocioso no dissolve final (passe o mesmo t que vai para desenharOcioso, p/ emendar sem salto). */
export function desenharVinheta(ctx, W, H, bloco, t, tOc = t) {
  prep(W, H); bloco = CENAS[bloco] ? bloco : 1; t = Math.max(0, t || 0);
  ctx.save(); ctx.setTransform(W / DW, 0, 0, H / DH, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const k = t > VINHETA_S ? eInOut(fase(t, VINHETA_S, VINHETA_S + DISS)) : 0;
  if (k >= 1) ocioso(ctx, tOc);
  else {
    CENAS[bloco](ctx, Math.min(t, VINHETA_S + .1));
    if (k > 0) {
      const o = m('diss', () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }), g = o.getContext('2d');
      g.setTransform(W / DW, 0, 0, H / DH, 0, 0); ocioso(g, tOc);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = k; ctx.drawImage(o, 0, 0);
    }
  }
  ctx.restore();
}
/** Quadro ambiente (loop) quando não há vinheta. */
export function desenharOcioso(ctx, W, H, t) {
  prep(W, H); ctx.save(); ctx.setTransform(W / DW, 0, 0, H / DH, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ocioso(ctx, t || 0); ctx.restore();
}

// ---------- SFX (WebAudio sintetizado) ----------
const ruidos = new WeakMap(), reverbs = new WeakMap();
function ruido(c) {
  let b = ruidos.get(c); if (b) return b;
  const n = c.sampleRate * 2; b = c.createBuffer(1, n, c.sampleRate); const w = b.getChannelData(0); for (let i = 0; i < n; i++) w[i] = Math.random() * 2 - 1;
  ruidos.set(c, b); return b;
}
function reverb(c, saida) {
  let r = reverbs.get(c); if (r) return r;
  const n = c.sampleRate * 2.2 | 0, b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3.2; }
  r = c.createConvolver(); r.buffer = b; const g = c.createGain(); g.gain.value = .3; r.connect(g).connect(saida(0)); reverbs.set(c, r); return r;
}
function env(p, t, vol, at, dur) { p.setValueAtTime(0, t); p.linearRampToValueAtTime(vol, t + at); p.exponentialRampToValueAtTime(.0001, t + dur); }
function osc(c, d, t, dur, vol, f, f1 = f, { tipo = 'sine', at = .004, curva = dur, det = 0 } = {}) {
  const o = c.createOscillator(), g = c.createGain(); o.type = tipo; o.detune.value = det; o.frequency.setValueAtTime(f, t);
  if (f1 !== f) o.frequency.exponentialRampToValueAtTime(f1, t + curva);
  env(g.gain, t, vol, at, dur); o.connect(g).connect(d); o.start(t); o.stop(t + dur + .05);
}
function nz(c, d, t, dur, vol, f, { f1 = f, q = 1, tipo = 'bandpass', at = .003, curva = dur } = {}) {
  const s = c.createBufferSource(); s.buffer = ruido(c); s.loop = true; s.playbackRate.value = .9 + Math.random() * .2;
  const fl = c.createBiquadFilter(); fl.type = tipo; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f1 !== f) fl.frequency.exponentialRampToValueAtTime(f1, t + curva);
  const g = c.createGain(); env(g.gain, t, vol, at, dur); s.connect(fl).connect(g).connect(d); s.start(t, Math.random()); s.stop(t + dur + .05);
}
const varrePan = (p, t, a, b, dur) => { p.pan.setValueAtTime(a, t); p.pan.linearRampToValueAtTime(b, t + dur); return p; };
const ACORDES = { 1: [261.6, 329.6, 392, 523.3], 2: [293.7, 370, 440, 587.3], 3: [349.2, 440, 523.3, 698.5, 784] };
const SFX = {
  entrada(c, via, t) { // whoosh das faixas + sub subindo
    const p = varrePan(via(-.8), t, -.85, .85, .8); nz(c, p, t, .85, .6, 260, { f1: 3200, q: 1.2, at: .4, curva: .55 }); nz(c, p, t + .05, .75, .22, 1400, { f1: 7500, q: 2, at: .36 });
    osc(c, via(0), t, .95, .2, 55, 150, { at: .62, curva: .7 });
  },
  flash(c, via, t) { nz(c, via(0), t, .4, .2, 6000, { tipo: 'highpass', q: .5, at: .01 }); osc(c, via(.3), t, .32, .05, 2400, 5200); },
  impacto(c, via, t) { // hit grave + clang metálico
    const d = via(0); osc(c, d, t, .75, 1, 150, 36, { curva: .35 }); nz(c, d, t, .3, .6, 1000, { tipo: 'lowpass', q: .7, f1: 180 }); osc(c, d, t, 1.6, .38, 56, 44, { at: .01 });
    nz(c, d, t, 1.3, .12, 6500, { tipo: 'highpass', q: .4 });
    [587, 1213, 1876, 2543, 3311, 4170].forEach((f, i) => osc(c, via(i % 2 ? .45 : -.45), t + .004 * i, 1.5 - i * .14, .07, f, f * .996, { at: .002 }));
  },
  brilho(c, via, t) { [2093, 2637, 3136, 3951, 4699, 5274, 6272].forEach((f, i) => osc(c, via(Math.sin(i * 1.7) * .8), t + i * .045, .5, .045, f)); },
  brilhoSuave(c, via, t) { [3136, 3951, 4699, 5274].forEach((f, i) => osc(c, via(Math.cos(i * 2.1) * .7), t + i * .06, .5, .022, f)); },
  swoosh(c, via, t) { nz(c, varrePan(via(.7), t, .7, -.5, .38), t, .42, .38, 700, { f1: 4500, q: 1.6, at: .14, curva: .3 }); },
  ding(c, via, t) { osc(c, via(0), t, 1.3, .07, 1568); osc(c, via(0), t, .9, .035, 3136); osc(c, via(0), t, .6, .02, 4704); },
  saida(c, via, t) { nz(c, varrePan(via(.7), t, .75, -.75, .5), t, .5, .5, 3600, { f1: 320, q: 1.3, at: .4, curva: .48 }); },
  final(c, via, t, b) { // stinger: acorde de metais sintetizado + tímpano + prato
    const d = via(0), fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 2; fl.connect(d);
    fl.frequency.setValueAtTime(500, t); fl.frequency.exponentialRampToValueAtTime(3800, t + .05); fl.frequency.exponentialRampToValueAtTime(1100, t + 1);
    for (const f of ACORDES[b]) { for (const det of [-7, 7]) osc(c, fl, t, 1.6, .05, f, f, { tipo: 'sawtooth', at: .02, det }); osc(c, d, t, 1.4, .05, f / 2); }
    osc(c, d, t, .9, .7, 110, 48, { curva: .3 }); nz(c, d, t, 1.8, .14, 5500, { tipo: 'highpass', q: .4, at: .005 });
  },
};
const EVENTOS = [[0, 'entrada'], [.6, 'flash'], [TI, 'impacto'], [1.22, 'brilho'], [1.8, 'swoosh'], [2.08, 'ding'], [3.02, 'brilhoSuave'], [4.42, 'saida'], [4.86, 'final']];
/** Toca os SFX sincronizados; `offsetS` = quanto da vinheta já passou (pula eventos passados). */
export function tocarSomVinheta(bloco, offsetS = 0) {
  let b; try { b = audioBase(); } catch { return; }
  const c = b?.c; if (!c || c.state !== 'running' || !(b.volume >= .01) || offsetS > VINHETA_S) return;
  bloco = ACORDES[bloco] ? bloco : 1;
  const mix = c.createGain(); mix.gain.value = .7 * b.volume; mix.connect(b.saida(0)); mix.connect(reverb(c, b.saida));
  const via = (pan = 0) => { const p = c.createStereoPanner(); p.pan.value = pan; p.connect(mix); return p; };
  const t0 = c.currentTime + .03 - offsetS;
  for (const [ts, nome] of EVENTOS) if (ts >= offsetS - .02) SFX[nome](c, via, t0 + Math.max(ts, offsetS), bloco);
  setTimeout(() => { try { mix.disconnect(); } catch {} }, (VINHETA_S + 3.5 - offsetS) * 1000);
}
