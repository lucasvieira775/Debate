// Animação de promoção de cargo: cadeado treme, abre e cai; brasão acende com raios, confete e recompensas.
import { sfx } from './voz.js';
import { esc, fmtN } from './util.js';

const CORES = n => n >= 8 ? ['#7fd8ff', '#c9f1ff'] : n === 7 ? ['#b56cff', '#e3c6ff'] : n >= 5 ? ['#ffc93c', '#fff1b8'] : ['#cfd8e3', '#ffffff'];
const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const virgula = b => String(+(+b).toFixed(2)).replace('.', ',');

const CSS = `
.promo{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,rgba(18,22,38,.93),rgba(0,0,0,.97));color:#fff;font-family:inherit;overflow:hidden;animation:promoFundo .5s ease-out both;cursor:pointer;user-select:none}
.promo.saindo{animation:promoSai .4s ease-in forwards}
.promo-palco{position:relative;width:min(340px,70vw);aspect-ratio:1;display:grid;place-items:center}
.promo-raios{position:absolute;inset:-60%;background:repeating-conic-gradient(from 0deg,var(--c1) 0 6deg,transparent 6deg 22deg);-webkit-mask:radial-gradient(circle,#000 0,transparent 62%);mask:radial-gradient(circle,#000 0,transparent 62%);opacity:0;animation:promoGira 14s linear infinite}
.promo-aura{position:absolute;inset:8%;border-radius:50%;background:radial-gradient(circle,var(--c1),transparent 68%);opacity:0;filter:blur(8px)}
.promo-brasao{position:relative;width:78%;filter:grayscale(1) brightness(.18) drop-shadow(0 0 2px #000);transform:scale(.85);transition:filter .5s,transform .6s cubic-bezier(.2,1.6,.4,1)}
.promo-flash{position:absolute;inset:-20%;border-radius:50%;background:radial-gradient(circle,#fff,var(--c2) 30%,transparent 65%);opacity:0;pointer-events:none}
.promo-cadw{position:absolute;width:38%;top:30%;left:31%;filter:drop-shadow(0 6px 10px rgba(0,0,0,.6));animation:promoEntra .5s .2s cubic-bezier(.2,1.5,.4,1) both}.promo-cad{display:block;width:100%;overflow:visible}
.promo-cad .haste{transform-box:view-box;transform-origin:72px 58px;transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
.promo.treme .promo-cad{animation:promoTreme .09s linear infinite}
.promo.aberto .promo-cad .haste{transform:translateY(-14px) rotate(-38deg)}
.promo.cai .promo-cad{animation:promoCai .8s cubic-bezier(.5,0,.9,.6) forwards}
.promo.revela .promo-brasao{filter:drop-shadow(0 0 22px var(--c1));transform:scale(1.08)}
.promo.revela .promo-raios{opacity:.28;transition:opacity 1s}
.promo.revela .promo-aura{opacity:.55;transition:opacity .8s}
.promo.revela .promo-flash{animation:promoFlash .9s ease-out}
.promo-txt{text-align:center;margin-top:8px;opacity:0;transform:translateY(20px);transition:opacity .5s .25s,transform .6s .25s cubic-bezier(.2,1.4,.4,1)}
.promo.revela .promo-txt{opacity:1;transform:none}
.promo-titulo{font-size:clamp(16px,2.6vw,26px);letter-spacing:.32em;font-weight:800;color:var(--c2);text-shadow:0 0 12px var(--c1)}
.promo-nome{font-size:clamp(38px,7vw,78px);font-weight:900;line-height:1.05;margin:.08em 0 .3em;background:linear-gradient(180deg,#fff 20%,var(--c1));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(0,0,0,.5))}
.promo-chips{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;padding:0 16px}
.promo-chip{padding:9px 18px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid var(--c1);font-size:clamp(14px,1.8vw,19px);font-weight:700;box-shadow:0 0 14px -4px var(--c1)}
.promo-chips.pop .promo-chip{animation:promoPop .45s cubic-bezier(.2,1.6,.4,1)}.promo-chips.pop .promo-chip:nth-child(2){animation-delay:.15s}
.promo.sumiu .promo-cadw{display:none}
.promo-chip b{color:var(--c2)}
.promo-ok{margin-top:26px;padding:11px 38px;border-radius:10px;border:0;font:inherit;font-weight:800;font-size:17px;background:var(--c1);color:#111;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .4s}
.promo.fim .promo-ok{opacity:1;pointer-events:auto}
.promo-conf{position:absolute;top:42%;left:50%;width:9px;height:14px;border-radius:2px;pointer-events:none;animation:promoConf var(--d) cubic-bezier(.15,.6,.4,1) forwards}
@keyframes promoFundo{from{opacity:0}}
@keyframes promoSai{to{opacity:0}}
@keyframes promoGira{to{transform:rotate(360deg)}}
@keyframes promoEntra{from{opacity:0;transform:scale(2.2)}}
@keyframes promoTreme{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(-4px,1px) rotate(-6deg)}50%{transform:translate(3px,-1px) rotate(5deg)}75%{transform:translate(-2px,0) rotate(-3deg)}}
@keyframes promoCai{0%{transform:none;opacity:1}20%{transform:translateY(-14px) rotate(-8deg)}100%{transform:translate(40px,340px) rotate(70deg);opacity:0}}
@keyframes promoFlash{0%{opacity:0;transform:scale(.3)}25%{opacity:1}100%{opacity:0;transform:scale(1.6)}}
@keyframes promoPop{40%{transform:scale(1.18)}}
@keyframes promoConf{0%{transform:translate(-50%,-50%) rotate(0);opacity:1}80%{opacity:1}100%{transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(var(--r));opacity:0}}
@media (prefers-reduced-motion:reduce){.promo,.promo *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.2s!important;transition-delay:0s!important}.promo-raios{animation:none!important}}
`;
const injetarCSS = () => { if (document.getElementById('promocao-css')) return; const s = document.createElement('style'); s.id = 'promocao-css'; s.textContent = CSS; document.head.appendChild(s); };

const CADEADO = `<div class="promo-cadw"><svg class="promo-cad" viewBox="0 0 100 110" aria-hidden="true">
<defs><linearGradient id="promoCorpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d774"/><stop offset=".5" stop-color="#d49a1c"/><stop offset="1" stop-color="#8a5a08"/></linearGradient>
<linearGradient id="promoMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7b818a"/><stop offset=".45" stop-color="#eef1f5"/><stop offset="1" stop-color="#6b7179"/></linearGradient></defs>
<path class="haste" d="M28 58 V36 a22 22 0 0 1 44 0 V58" fill="none" stroke="url(#promoMetal)" stroke-width="10" stroke-linecap="round"/>
<rect x="12" y="50" width="76" height="56" rx="10" fill="url(#promoCorpo)" stroke="#6b4505" stroke-width="2.5"/>
<rect x="18" y="55" width="64" height="7" rx="3.5" fill="#fff" opacity=".35"/>
<circle cx="50" cy="76" r="8" fill="#3a2603"/><path d="M46 79 h8 l-2 15 h-4z" fill="#3a2603"/></svg></div>`;

let ac;
const destrancar = () => { try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime; [[2200, 0], [1300, .07]].forEach(([f, d]) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.setValueAtTime(f, t + d); o.frequency.exponentialRampToValueAtTime(f / 3, t + d + .05); g.gain.setValueAtTime(.12, t + d); g.gain.exponentialRampToValueAtTime(.0001, t + d + .07); o.connect(g).connect(ac.destination); o.start(t + d); o.stop(t + d + .08); }); } catch { /* sem áudio */ } };
const somSeguro = f => { try { f(); } catch { /* sem áudio */ } };

const confete = (el, [c1, c2], qtd = 70) => { const cores = [c1, c2, '#ffffff', '#ff5d73', '#4ade80', '#ffd23f']; for (let i = 0; i < qtd; i++) { const p = document.createElement('i'), a = Math.random() * Math.PI * 2, r = 180 + Math.random() * 420; p.className = 'promo-conf'; p.style.cssText = `background:${cores[i % cores.length]};--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r * .75 + 160}px;--r:${(Math.random() - .5) * 1080}deg;--d:${1.6 + Math.random() * 1.4}s;animation-delay:${Math.random() * .25}s`; el.appendChild(p); } };
const contar = (el, alvo, ms) => { const t0 = performance.now(), passo = () => { const k = Math.min(1, (performance.now() - t0) / ms); el.textContent = fmtN(Math.round(alvo * (1 - (1 - k) ** 3))); if (k < 1) requestAnimationFrame(passo); }; requestAnimationFrame(passo); };

export function animarPromocao({ n, nome, recompensa, bonus }) {
  injetarCSS(); document.querySelector('.promo')?.remove();
  const cor = CORES(+n), simples = reduzido(), el = document.createElement('div');
  el.className = 'promo'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `Promovido a ${nome}`);
  el.style.cssText = `--c1:${cor[0]};--c2:${cor[1]}`;
  el.innerHTML = `<div class="promo-palco"><div class="promo-raios"></div><div class="promo-aura"></div><img class="promo-brasao" src="/img/niveis/${+n}.png" alt="" onerror="this.style.visibility='hidden'"><div class="promo-flash"></div>${CADEADO}</div>
<div class="promo-txt"><div class="promo-titulo">PROMOVIDO(A)!</div><div class="promo-nome">${esc(nome)}</div>
<div class="promo-chips"><span class="promo-chip">🪙 <b class="promo-moedas">+0</b> moedas</span><span class="promo-chip">Moedas por debate <b>×${virgula(bonus)}</b></span></div>
<button class="promo-ok">Continuar</button></div>`;
  document.body.appendChild(el);
  const timers = [], em = (ms, f) => timers.push(setTimeout(f, ms)), moedas = el.querySelector('.promo-moedas');
  let pronto = false;
  const fechar = () => { if (!pronto && !simples) return revelar(true); timers.forEach(clearTimeout); el.classList.add('saindo'); setTimeout(() => el.remove(), 400); };
  const revelar = (pular) => { if (pronto) return; pronto = true; timers.forEach(clearTimeout); el.classList.remove('treme'); el.classList.add('aberto', 'cai', 'revela'); somSeguro(sfx.vitoria); if (!simples) confete(el, cor);
    if (simples || pular) moedas.textContent = '+' + fmtN(+recompensa || 0); else { const sp = document.createElement('span'); moedas.textContent = '+'; moedas.appendChild(sp); em(700, () => { el.querySelector('.promo-chips').classList.add('pop'); contar(sp, +recompensa || 0, 1300); somSeguro(sfx.nota); }); }
    em(simples || pular ? 0 : 800, () => el.classList.add('sumiu')); em(simples || pular ? 0 : 1800, () => el.classList.add('fim')); em(8000, fechar); };
  el.addEventListener('click', e => { if (e.target.closest('.promo-ok') || pronto) fechar(); else revelar(true); });
  const tecla = e => { if (!document.body.contains(el)) return removeEventListener('keydown', tecla); if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); fechar(); } };
  addEventListener('keydown', tecla);
  if (simples) return em(300, revelar);
  em(700, () => { el.classList.add('treme'); somSeguro(sfx.tique); });
  em(1000, () => somSeguro(sfx.tique));
  em(1300, () => somSeguro(sfx.tique));
  em(1550, () => { el.classList.remove('treme'); el.classList.add('aberto'); destrancar(); });
  em(1950, () => el.classList.add('cai'));
  em(2350, () => revelar(false));
}
