// Efeitos de tela em 1ª pessoa quando VOCÊ é o alvo de uma ação (por cima do canvas, sem pegar cliques).
// cadeirada/paulada: apagão preto → a visão volta aos poucos (vinheta + desfoque) | torta: chantilly | tomate: polpa vermelha
// balde: água escorrendo azulada | flores: brilho rosado sutil. Chamado pela coreografia no IMPACTO.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const R = (a, b) => a + Math.random() * (b - a);
// preto: s totalmente preto, s até voltar, desfoque máx.
const APAGAO = { cadeirada: { preto: 2.4, volta: 2.6, blur: 9 }, paulada: { preto: 1.1, volta: 2, blur: 5 } };
const MELECA = { // cores da massa (luz → sombra), duração, cobertura
  torta: { cor: ['#fffdf6', '#f6ecd6', '#d9c7a2'], dur: 5.5, n: 9, gotas: 26 },
  tomate: { cor: ['#ff5a3c', '#d1200f', '#7a0a05'], dur: 5, n: 7, gotas: 40, sementes: 1 },
};
let atual = null;

export function limparTela() { if (atual) { cancelAnimationFrame(atual.raf); atual.el.remove(); atual = null; } }

/** Dispara o efeito do item. t0 = segundos já passados (para testes: ?efeito=…&efeitot=s). */
export function efeitoTela(id, t0 = 0) {
  limparTela();
  const el = document.createElement('div'); el.className = 'efeito-tela'; document.body.appendChild(el);
  const ini = performance.now() - t0 * 1000, ef = { el, raf: 0 }; atual = ef;
  const passo = APAGAO[id] ? apagao(el, APAGAO[id]) : MELECA[id] ? meleca(el, MELECA[id]) : id === 'balde' ? agua(el) : id === 'flores' ? flores(el) : null;
  if (!passo) return limparTela();
  const loop = () => { if (atual !== ef) return; if (!passo((performance.now() - ini) / 1000)) return limparTela(); ef.raf = requestAnimationFrame(loop); };
  loop();
}

// ---------- apagão (cadeirada / paulada) ----------
function apagao(el, c) {
  return u => {
    const k = sm((u - c.preto) / c.volta); if (k >= 1) return false;
    const pisca = u < c.preto && u > c.preto - .5 ? .08 * Math.abs(Math.sin(u * 23)) : 0; // pouco antes de voltar, uns lampejos
    const raio = 8 + k * 95, a = 1 - k;                       // o "buraco" claro no meio cresce
    el.style.background = `radial-gradient(ellipse ${raio}% ${raio * .85}% at 50% 48%, rgba(0,0,0,${(a * .85 - pisca).toFixed(3)}) 0%, rgba(0,0,0,${Math.min(1, a * 1.15).toFixed(3)}) 70%, rgba(0,0,0,1) 100%)`;
    if (k <= 0) el.style.background = `rgba(0,0,0,${1 - pisca})`;
    const b = (c.blur * (1 - k)).toFixed(1);
    el.style.backdropFilter = el.style.webkitBackdropFilter = `blur(${b}px)`;
    el.style.transform = k > 0 && k < .6 ? `translate(${(Math.sin(u * 9) * 6 * (1 - k)).toFixed(1)}px, ${(Math.cos(u * 7) * 4 * (1 - k)).toFixed(1)}px) scale(1.03)` : '';
    el.style.opacity = k > .85 ? (1 - k) / .15 : 1;
    return true;
  };
}

// ---------- canvas que cobre a tela ----------
function tela(el) {
  const cv = document.createElement('canvas'), W = cv.width = innerWidth, H = cv.height = innerHeight;
  cv.style.cssText = 'width:100%;height:100%;display:block'; el.appendChild(cv);
  return { cv, g: cv.getContext('2d'), W, H };
}
/** contorno irregular (polar com ruído) */
function mancha(g, x, y, r, irr = .35, pontas = 0) {
  const n = 22 + (pontas ? 10 : 0), f = [R(0, 6), R(0, 6), R(0, 6)];
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, s = 1 + irr * (.5 * Math.sin(a * 3 + f[0]) + .3 * Math.sin(a * 5 + f[1]) + .2 * Math.sin(a * 9 + f[2])) + (pontas && i % 3 === 0 ? R(0, pontas) : 0);
    const px = x + Math.cos(a) * r * s, py = y + Math.sin(a) * r * s * .9;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}

// ---------- torta / tomate ----------
function meleca(el, c) {
  const { g, W, H } = tela(el), M = Math.min(W, H);
  const base = document.createElement('canvas'); base.width = W; base.height = H; const b = base.getContext('2d');
  const blobs = [], escorre = [];
  for (let i = 0; i < c.n; i++) { // manchas grandes, concentradas no meio (foi no rosto)
    const ang = R(0, Math.PI * 2), d = i === 0 ? 0 : R(.12, .48) * M;
    blobs.push({ x: W / 2 + Math.cos(ang) * d * 1.4, y: H * .46 + Math.sin(ang) * d * .8, r: i === 0 ? M * .34 : R(.12, .24) * M });
  }
  for (let i = 0; i < c.gotas; i++) { const ang = R(0, Math.PI * 2), d = R(.35, .75) * Math.max(W, H) * .6; blobs.push({ x: W / 2 + Math.cos(ang) * d, y: H * .46 + Math.sin(ang) * d * .7, r: R(.012, .05) * M, gota: 1 }); }
  for (const o of blobs) {
    mancha(b, o.x, o.y, o.r, o.gota ? .25 : .4, o.gota ? .9 : .25);
    const gr = b.createRadialGradient(o.x - o.r * .3, o.y - o.r * .35, o.r * .05, o.x, o.y, o.r * 1.25);
    gr.addColorStop(0, c.cor[0]); gr.addColorStop(.6, c.cor[1]); gr.addColorStop(1, c.cor[2]);
    b.fillStyle = gr; b.fill();
    if (!o.gota) { // escorridos saindo da base da mancha
      for (let k = 0; k < 2 + (o.r / M * 10 | 0); k++) escorre.push({ x: o.x + R(-.7, .7) * o.r, y: o.y + o.r * R(.45, .75), w: R(.025, .07) * o.r + 4, v: R(.04, .12) * H, atraso: R(0, 1.2), max: R(.15, .45) * H });
      // brilho úmido
      b.globalAlpha = .55; mancha(b, o.x - o.r * .35, o.y - o.r * .4, o.r * .18, .3); b.fillStyle = '#fff'; b.fill(); b.globalAlpha = 1;
    }
  }
  if (c.sementes) for (const o of blobs) if (!o.gota) for (let k = 0; k < 7; k++) { // sementes e pedaços de pele do tomate
    const a = R(0, 6.3), d = R(0, .75) * o.r; b.save(); b.translate(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d); b.rotate(R(0, 3)); b.fillStyle = 'rgba(255,214,120,.85)'; b.beginPath(); b.ellipse(0, 0, M * .006, M * .0035, 0, 0, 7); b.fill();
    if (k < 2) { b.fillStyle = 'rgba(150,10,5,.8)'; mancha(b, R(-9, 9), R(-9, 9), M * R(.012, .025), .5); b.fill(); } b.restore();
  }
  const cor = c.cor;
  return u => {
    if (u > c.dur) return false;
    const desce = sm(u / c.dur) * H * .1, a = 1 - sm((u - c.dur * .45) / (c.dur * .55));
    g.clearRect(0, 0, W, H); g.globalAlpha = a; g.drawImage(base, 0, desce);
    for (const e of escorre) { // fios escorrendo, com gota redonda na ponta
      const L = Math.min(e.max, Math.max(0, u - e.atraso) * e.v * (1 + u * .4)); if (L <= 1) continue;
      const y0 = e.y + desce, gr = g.createLinearGradient(0, y0, 0, y0 + L); gr.addColorStop(0, cor[1]); gr.addColorStop(1, cor[2]);
      g.fillStyle = gr; g.beginPath(); g.moveTo(e.x - e.w / 2, y0); g.lineTo(e.x - e.w * .35, y0 + L); g.arc(e.x, y0 + L, e.w * .45, Math.PI, 0, true); g.lineTo(e.x + e.w / 2, y0); g.fill();
    }
    g.globalAlpha = 1;
    el.style.backdropFilter = el.style.webkitBackdropFilter = `blur(${(2.5 * (1 - sm(u / 2))).toFixed(1)}px)`;
    return true;
  };
}

// ---------- balde: água escorrendo ----------
function agua(el) {
  const { g, W, H } = tela(el), DUR = 3.6;
  const fios = Array.from({ length: 70 }, () => ({ x: R(0, W), y: R(-H, 0), v: R(.5, 1.3) * H, w: R(1.5, 5), L: R(.08, .3) * H }));
  const gotas = Array.from({ length: 45 }, () => ({ x: R(0, W), y: R(0, H), r: R(4, 18), v: R(10, 60) }));
  return u => {
    if (u > DUR) return false;
    const a = 1 - sm((u - 1.4) / (DUR - 1.4));
    g.clearRect(0, 0, W, H); g.globalAlpha = a;
    g.fillStyle = `rgba(90,160,230,${(.35 * (1 - sm(u / 1.2)) + .1).toFixed(3)})`; g.fillRect(0, 0, W, H);
    for (const f of fios) { const y = f.y + u * f.v, gr = g.createLinearGradient(0, y, 0, y + f.L); gr.addColorStop(0, 'rgba(220,240,255,0)'); gr.addColorStop(1, 'rgba(220,240,255,.55)'); g.fillStyle = gr; g.fillRect(f.x, y, f.w, f.L); }
    for (const d of gotas) { const y = d.y + u * d.v, gr = g.createRadialGradient(d.x - d.r * .3, y - d.r * .3, 1, d.x, y, d.r); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(.7, 'rgba(160,210,255,.25)'); gr.addColorStop(1, 'rgba(60,120,200,.45)'); g.fillStyle = gr; g.beginPath(); g.ellipse(d.x, y, d.r * .8, d.r, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    el.style.backdropFilter = el.style.webkitBackdropFilter = `blur(${(3 * a).toFixed(1)}px)`;
    return true;
  };
}

// ---------- flores: brilho rosado nas bordas ----------
function flores(el) {
  return u => {
    if (u > 2.2) return false;
    const a = Math.min(1, u / .25) * (1 - sm((u - .6) / 1.6));
    el.style.background = `radial-gradient(ellipse at 50% 50%, rgba(255,150,200,0) 45%, rgba(255,120,180,${(.45 * a).toFixed(3)}) 100%)`;
    return true;
  };
}
