// ===== REPLAY DA FALA NOTA 10 =====
// Gravador: voz real (MediaRecorder) + linha do tempo da boca e da legenda durante a MINHA fala; só sobe se o servidor pedir (nota 10).
// Player: reconstrução 3D (Avatar num púlpito, close no rosto) + overlay de TV, sincronizada pelo audio.currentTime. Não é vídeo.
import * as THREE from 'three';
import { Avatar } from './avatar.js';
import { desenharGrobe } from './grobe.js';
import { PARTIDO } from '/shared/regras.js';
import { esc } from './util.js';

const TIPO = 'audio/webm;codecs=opus', MAX_MS = 240000, MAX_BYTES = 2.5 * 1024 * 1024;

// ---------- gravação ----------
export class Gravador {
  constructor() { this.g = null; this.ult = null; }
  get gravando() { return !!this.g; }
  /** i = passo da fala; faixa = faixa do microfone (é clonada); nivel() = volume 0..1. Sem mic/suporte: não grava (false). */
  iniciar(i, faixa, nivel) {
    this.parar(); this.ult = null;
    if (!faixa || faixa.readyState !== 'live' || typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported?.(TIPO)) return false;
    try {
      const copia = faixa.clone(); copia.enabled = true; // grava mesmo com a transmissão do chat de voz mutada
      const rec = new MediaRecorder(new MediaStream([copia]), { mimeType: TIPO, audioBitsPerSecond: 24000 });
      const g = { i, rec, copia, partes: [], linha: [], textos: [], t0: performance.now(), dur: 0 };
      rec.ondataavailable = e => { if (e.data?.size) g.partes.push(e.data); };
      g.fim = new Promise(r => { rec.onstop = () => { copia.stop(); r(); }; });
      rec.start(1000);
      g.iv = setInterval(() => { const t = performance.now() - g.t0; if (t > MAX_MS) return this.parar(); g.linha.push({ t: Math.round(t), n: Math.round(Math.min(1, Math.max(0, nivel() || 0)) * 100) / 100 }); }, 100);
      this.g = g; return true;
    } catch { return false; }
  }
  /** Texto transcrito/digitado mudou (só o ritmo da legenda vai pro servidor). */
  texto(t) { const g = this.g; if (g && t !== g.ultT) { g.ultT = t; g.textos.push({ t: Math.round(performance.now() - g.t0), texto: String(t || '') }); } }
  parar() { const g = this.g; if (!g) return; this.g = null; clearInterval(g.iv); g.dur = performance.now() - g.t0; try { if (g.rec.state !== 'inactive') g.rec.stop(); else g.copia.stop(); } catch { g.copia.stop(); } this.ult = g; }
  /** Servidor pediu (nota 10): sobe [u32 tamanho JSON][JSON][webm] com o token de uso único. */
  async enviar(token, i) {
    if (this.g?.i === i) this.parar();
    const g = this.ult; if (!g || g.i !== i) return null; this.ult = null;
    await Promise.race([g.fim, new Promise(r => setTimeout(r, 3000))]);
    if (!g.linha.some(p => p.n > .2)) return null; // falou digitando / mic mudo: sem voz, sem replay
    const audio = new Blob(g.partes, { type: TIPO }); if (!audio.size || audio.size > MAX_BYTES - 200000) return null;
    const js = new TextEncoder().encode(JSON.stringify({ linha: g.linha, textos: g.textos, dur: Math.round(g.dur) }));
    const cab = new Uint8Array(4); new DataView(cab.buffer).setUint32(0, js.length, true);
    try { const r = await fetch('/api/replay/' + encodeURIComponent(token), { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob([cab, js, audio]) }); return r.ok ? r.json() : null; } catch { return null; }
  }
}

// ---------- player ----------
const W = 960, H = 540;
/** Valor da linha do tempo [[t, v], ...] no instante ms (último ponto ≤ ms). */
const naLinha = (l, ms) => { let a = 0, b = l.length - 1, r = null; while (a <= b) { const m = (a + b) >> 1; if (l[m][0] <= ms) { r = l[m][1]; a = m + 1; } else b = m - 1; } return r; };
function quebrar(ctx, txt, larg) { const ls = []; let l = ''; for (const w of txt.split(/\s+/)) { const t = l ? l + ' ' + w : w; if (ctx.measureText(t).width > larg && l) { ls.push(l); l = w; } else l = t; } if (l) ls.push(l); return ls; }

function cena(meta) {
  const cena = new THREE.Scene(); cena.background = new THREE.Color('#0a1530'); cena.fog = new THREE.Fog('#0a1530', 6, 14);
  cena.add(new THREE.HemisphereLight('#ffffff', '#3a3060', 1.4));
  const k = new THREE.DirectionalLight('#ffffff', 2.4); k.position.set(1.6, 3.2, 4); cena.add(k);
  const r = new THREE.DirectionalLight('#7aa7ff', 1.6); r.position.set(-3, 2, -2); cena.add(r);
  const cor = PARTIDO[meta.partido]?.cor || '#1d4ed8', cor2 = PARTIDO[meta.partido]?.cor2 || '#facc15';
  // fundo: painel azul com faixas de luz
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ color: '#13285a', roughness: .8 })); fundo.position.set(0, 2, -3.2); cena.add(fundo);
  for (const x of [-2.4, -1.2, 1.2, 2.4]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(.08, 5), new THREE.MeshBasicMaterial({ color: '#3b82f6' })); f.position.set(x, 2, -3.18); cena.add(f); }
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: '#0b1022', roughness: .5 })); piso.rotation.x = -Math.PI / 2; cena.add(piso);
  // púlpito simples (avatar atrás, como no estúdio)
  const pul = new THREE.Group(); cena.add(pul);
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.18, .5), new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: .45, metalness: .2 })); corpo.position.y = .59; pul.add(corpo);
  const tampo = new THREE.Mesh(new THREE.BoxGeometry(1.2, .05, .6), new THREE.MeshStandardMaterial({ color: '#334155', roughness: .3 })); tampo.position.y = 1.2; pul.add(tampo);
  const faixa = new THREE.Mesh(new THREE.BoxGeometry(1.11, .14, .01), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: .35 })); faixa.position.set(0, .95, .251); pul.add(faixa);
  const faixa2 = new THREE.Mesh(new THREE.BoxGeometry(1.11, .03, .01), new THREE.MeshStandardMaterial({ color: cor2 })); faixa2.position.set(0, .86, .251); pul.add(faixa2);
  const av = new Avatar(meta.avatar || {}); av.root.position.set(0, 0, -.62); cena.add(av.root); av.setOlhar(0, 0);
  const cam = new THREE.PerspectiveCamera(26, W / H, .1, 30);
  return { cena, av, cam };
}

/** Abre o player do replay (id). Libera renderer, cena e áudio ao fechar. */
export async function abrirReplay(id, janela) {
  let meta; try { const r = await fetch(`/replays/${encodeURIComponent(id)}.json`); if (!r.ok) throw 0; meta = await r.json(); } catch { return alert('Replay indisponível (pode ter expirado).'); }
  const { cena: sc, av, cam } = cena(meta), p = PARTIDO[meta.partido];
  const audio = new Audio(`/replays/${meta.id}.webm`); audio.preload = 'auto';
  let raf = 0, ult = performance.now(), renderer = null, fim = false;
  const palavras = String(meta.texto || '').split(/\s+/).filter(Boolean), leg = meta.legenda || [], linha = meta.linha || [], dur = meta.dur || 1;
  const fecharJ = janela(`<div class="rp"><div class="rp-tela"><canvas class="rp-3d" width="${W}" height="${H}"></canvas><canvas class="rp-hud" width="${W}" height="${H}"></canvas>
    <button class="rp-grande" hidden>▶</button></div>
    <div class="rp-bts"><span class="mut rp-info">${esc(meta.nome)} · ${esc(meta.tema || '')} · ${new Date(meta.data).toLocaleDateString('pt-BR')}</span><button class="btn peq" id="rp-pausa">⏸ Pausar</button><button class="btn peq amarelo" id="rp-x">Fechar</button></div></div>`, (el, fechar) => {
    const c3 = el.querySelector('.rp-3d'), hud = el.querySelector('.rp-hud').getContext('2d'), bP = el.querySelector('#rp-pausa'), bG = el.querySelector('.rp-grande');
    try { renderer = new THREE.WebGLRenderer({ canvas: c3, antialias: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; } catch { renderer = null; }
    const tocar = () => { if (fim) { audio.currentTime = 0; fim = false; } audio.play().catch(() => rotulo()); };
    const rotulo = () => { bP.textContent = audio.paused ? '▶ Continuar' : '⏸ Pausar'; bG.hidden = !audio.paused; bG.textContent = fim ? '↻' : '▶'; };
    audio.onplay = audio.onpause = rotulo; audio.onended = () => { fim = true; rotulo(); };
    bP.onclick = () => audio.paused ? tocar() : audio.pause(); bG.onclick = tocar;
    el.querySelector('#rp-x').onclick = fechar;
    const quadro = agora => {
      raf = requestAnimationFrame(quadro);
      const dt = Math.min(.1, (agora - ult) / 1000); ult = agora;
      const ms = fim ? dur : audio.currentTime * 1000, t = agora / 1000, tocando = !audio.paused && !fim;
      if (tocando) { const n = naLinha(linha, ms) || 0; if (n > .08) av.setFala(n); }
      av.gesticula = tocando; av.setOlhar(Math.sin(t * .35) * .12, -.04); av.update(dt, t);
      cam.position.set(.3 + Math.sin(t * .2) * .06, 1.9, 3.5 - Math.min(.3, ms / dur * .3)); cam.lookAt(0, 1.62, -.62); // close no rosto, dolly lento
      renderer?.render(sc, cam);
      // ----- overlay de TV -----
      hud.clearRect(0, 0, W, H);
      desenharGrobe(hud, W - 70, 62, 92);
      hud.fillStyle = '#dc2626'; hud.fillRect(24, 22, 214, 34); hud.fillStyle = '#fff'; hud.font = 'bold 18px Arial, sans-serif'; hud.textBaseline = 'middle'; hud.textAlign = 'left';
      hud.fillText(`● REPLAY · NOTA ${String(meta.nota).replace('.', ',')}`, 36, 40);
      // legenda: fração do texto já dita (ritmo da fala gravada); sem ritmo, proporcional ao tempo
      const fr = leg.length ? (naLinha(leg, ms) ?? 0) : ms / dur, nP = fim ? palavras.length : Math.round(Math.min(1, fr) * palavras.length);
      hud.font = '24px Arial, sans-serif'; const ls = quebrar(hud, palavras.slice(0, nP).join(' '), W - 140).slice(-2);
      if (ls.length) { hud.fillStyle = 'rgba(0,0,0,.62)'; hud.fillRect(50, H - 150 - ls.length * 32, W - 100, ls.length * 32 + 14); hud.fillStyle = '#fff'; ls.forEach((l, k) => hud.fillText(l, 70, H - 150 - ls.length * 32 + 23 + k * 32)); }
      // tarja: nome + partido
      hud.fillStyle = 'rgba(8,20,48,.92)'; hud.fillRect(0, H - 112, W * .72, 72); hud.fillStyle = p?.cor || '#2563eb'; hud.fillRect(0, H - 112, 12, 72);
      hud.fillStyle = '#fff'; hud.font = 'bold 30px Arial, sans-serif'; hud.fillText(String(meta.nome || '').toUpperCase(), 30, H - 88);
      hud.fillStyle = '#facc15'; hud.font = 'bold 18px Arial, sans-serif'; hud.fillText(`${p ? p.sigla + ' ' + p.numero + ' · ' + p.nome : ''}${meta.tema ? ' · ' + meta.tema : ''}`, 30, H - 58);
      // barra de progresso
      hud.fillStyle = 'rgba(255,255,255,.25)'; hud.fillRect(0, H - 4, W, 4); hud.fillStyle = '#dc2626'; hud.fillRect(0, H - 4, W * Math.min(1, ms / dur), 4);
    };
    raf = requestAnimationFrame(quadro); tocar();
  });
  // ao fechar (botão ou clique fora): para tudo e libera a GPU
  const obs = new MutationObserver(() => { if (document.querySelector('.rp')) return; obs.disconnect(); liberar(); }); obs.observe(document.body, { childList: true });
  function liberar() {
    cancelAnimationFrame(raf); audio.pause(); audio.removeAttribute('src'); audio.load();
    sc.remove(av.root); // geometrias/materiais do avatar são cache compartilhado (avatar.js): não descarta
    sc.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); }); });
    renderer?.dispose(); renderer?.forceContextLoss?.(); renderer = null;
  }
  return fecharJ;
}
