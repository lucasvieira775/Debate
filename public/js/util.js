import { PARTIDO, avatarAleatorio, generoDe } from '/shared/regras.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtN = n => Math.round(n).toLocaleString('pt-BR');
export const fmtP = (n, d = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
export const fmtT = s => { s = Math.max(0, Math.ceil(s)); return `${String(s / 60 | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- perfil e configurações locais ----------
const LS = {
  ler(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
};
export function lerPerfil() {
  const p = LS.ler('debate_perfil', null);
  const base = { nome: '', avatar: { ...avatarAleatorio(), expressao: 'simpatico' }, partido: 'PUN', xp: 0, pts: 0 };
  const r = p ? { ...base, ...p, avatar: { ...base.avatar, ...p.avatar } } : base;
  r.avatar.genero = generoDe(p ? p.avatar : r.avatar);
  if (!r.migrou3) { // perfis antigos: avatar masculino não vem mais com brinco
    if (r.avatar.genero === 'masculino') r.avatar.brinco = false;
    r.migrou3 = true; try { localStorage.setItem('debate_perfil', JSON.stringify(r)); } catch { /* */ }
  }
  return r;
}
export const salvarPerfil = p => LS.gravar('debate_perfil', p);
export function lerConfig() { return { voz: true, sfx: .7, ambiente: .7, musica: .8, resolucao: 'auto', qualidade: 'alta', sens: 1, nomes: true, ...LS.ler('debate_cfg', {}) }; }
export const salvarConfig = c => LS.gravar('debate_cfg', c);
export const lerSessao = () => LS.ler('debate_sessao', null);
export const salvarSessao = s => LS.gravar('debate_sessao', s);
export const locutorOuvido = () => !!LS.ler('debate_locutor', false), marcarLocutor = () => LS.gravar('debate_locutor', true); // "Bem-vindo ao Debate Presidencial" só na 1ª entrada
export const tutorialVisto =() => !!LS.ler('debate_tutorial', false), marcarTutorial = () => LS.gravar('debate_tutorial', true); // tutorial da 1ª partida (assistido ou pulado)

// ---------- símbolos dos partidos (canvas 2D) ----------
export function desenharSimbolo(ctx, tipo, cx, cy, r, cor) {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = cor; ctx.strokeStyle = cor; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const poly = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * r, y * r) : ctx.moveTo(x * r, y * r)); ctx.closePath(); ctx.fill(); };
  switch (tipo) {
    case 'estrela': { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? .42 : 1; p.push([Math.cos(a) * rr, Math.sin(a) * rr]); } poly(p); break; }
    case 'coracao': ctx.beginPath(); ctx.moveTo(0, r * .85); ctx.bezierCurveTo(-r * 1.25, -r * .05, -r * .55, -r * 1.05, 0, -r * .35); ctx.bezierCurveTo(r * .55, -r * 1.05, r * 1.25, -r * .05, 0, r * .85); ctx.fill(); break;
    case 'sol': ctx.beginPath(); ctx.arc(0, 0, r * .45, 0, 7); ctx.fill(); ctx.lineWidth = r * .14;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .62, Math.sin(a) * r * .62); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); } break;
    case 'engrenagem': { const p = []; for (let i = 0; i < 40; i++) { const a = i * Math.PI * 2 / 40, rr = (i % 5 < 2) ? 1 : .78; p.push([Math.cos(a) * rr, Math.sin(a) * rr]); } poly(p);
      ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, 0, r * .36, 0, 7); ctx.fill(); break; }
    case 'ponte': ctx.lineWidth = r * .16; ctx.beginPath(); ctx.arc(0, r * .55, r * .95, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.fillRect(-r, r * .25, r * 2, r * .18); for (let i = -2; i <= 2; i++) ctx.fillRect(i * r * .4 - r * .05, -r * .2 + Math.abs(i) * r * .12, r * .1, r * .5 - Math.abs(i) * r * .12); break;
    case 'folha': ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 1.05, -r * .1, 0, r); ctx.quadraticCurveTo(-r * 1.05, -r * .1, 0, -r); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = r * .07; ctx.beginPath(); ctx.moveTo(0, -r * .7); ctx.lineTo(0, r * 1.05); ctx.stroke(); break;
    case 'seta': poly([[-.9, .5], [0, -.95], [.9, .5], [.35, .5], [.35, .95], [-.35, .95], [-.35, .5]]); break;
    case 'diamante': poly([[0, -1], [.85, 0], [0, 1], [-.85, 0]]); ctx.fillStyle = 'rgba(255,255,255,.35)'; poly([[0, -1], [.85, 0], [0, 0]]); break;
    case 'escudo': ctx.beginPath(); ctx.moveTo(-r * .85, -r * .85); ctx.lineTo(r * .85, -r * .85); ctx.lineTo(r * .85, 0); ctx.quadraticCurveTo(r * .8, r * .75, 0, r); ctx.quadraticCurveTo(-r * .8, r * .75, -r * .85, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; poly([[0, -.55], [.14, -.18], [.52, -.18], [.22, .06], [.33, .44], [0, .2], [-.33, .44], [-.22, .06], [-.52, -.18], [-.14, -.18]]); break;
    case 'bandeira': ctx.fillRect(-r * .85, -r, r * .12, r * 2); ctx.beginPath(); ctx.moveTo(-r * .73, -r * .95);
      ctx.bezierCurveTo(-r * .2, -r * 1.2, r * .3, -r * .6, r * .95, -r * .85); ctx.lineTo(r * .95, r * .05); ctx.bezierCurveTo(r * .3, r * .25, -r * .2, -r * .3, -r * .73, -r * .05); ctx.closePath(); ctx.fill(); break;
  }
  ctx.restore();
}
const logoCache = {};
export function logoPartido(sigla, tam = 128) {
  const k = sigla + tam; if (logoCache[k]) return logoCache[k];
  const p = PARTIDO[sigla]; const c = document.createElement('canvas'); c.width = c.height = tam; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, tam, tam); g.addColorStop(0, p.cor); g.addColorStop(1, escurecer(p.cor, .35));
  x.fillStyle = g; x.beginPath(); x.roundRect(0, 0, tam, tam, tam * .18); x.fill();
  desenharSimbolo(x, p.simbolo, tam / 2, tam / 2, tam * .32, '#fff');
  return (logoCache[k] = c.toDataURL());
}
export function escurecer(hex, f) {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * (1 - f), g = (n >> 8 & 255) * (1 - f), b = (n & 255) * (1 - f);
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}
export function toast(msg, tipo = '') {
  const el = document.createElement('div'); el.className = 'toast ' + tipo; el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.classList.add('sai'), 3200); setTimeout(() => el.remove(), 3800);
}
