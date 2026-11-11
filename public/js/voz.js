// Reconhecimento de voz (pt-BR), medidor de volume, voz da mediadora e efeitos sonoros.
import { moderar } from '/shared/moderacao.js';
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const temReconhecimento = !!SR;
// o reconhecimento às vezes "ouve" ofensa onde não houve: entre as alternativas que ele considerou, fica com a primeira sem ofensa grave
const melhor = r => { for (let k = 0; k < r.length; k++) if (!moderar(r[k].transcript).grave) return r[k].transcript; return r[0].transcript; };
export const contextoSeguro = window.isSecureContext;

export function msgErroVoz(code) {
  return ({
    'not-allowed': contextoSeguro ? 'Permissão de microfone negada. Clique no cadeado ao lado do endereço e permita o microfone.' : 'O navegador só libera o microfone em endereço seguro. Jogue por localhost ou pelo link https do JOGAR-ONLINE.bat.',
    'service-not-allowed': 'O navegador não liberou o serviço de reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge.',
    'audio-capture': 'Nenhum microfone encontrado. Verifique se ele está conectado e selecionado no Windows.',
    'network': 'O reconhecimento de voz precisa de internet. Verifique a conexão.',
    'language-not-supported': 'Este navegador não reconhece português (pt-BR).',
  })[code] || ('Erro no reconhecimento de voz: ' + code);
}

// No celular o microfone é exclusivo: se outro getUserMedia (chat de voz, medidor) estiver aberto, o reconhecimento não ouve nada.
// Lá também o modo contínuo duplica/perde texto, então cada frase é uma sessão curta que reinicia sozinha.
export const celular = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
// Navegadores novos aceitam rec.start(faixa): o reconhecimento ouve a MESMA faixa do chat de voz, sem soltar o microfone.
// Detecção: com suporte, start({}) lança TypeError (parâmetro não é MediaStreamTrack); sem suporte o argumento é ignorado.
let faixaOk; // undefined = não testado, true/false

export class Microfone {
  constructor({ onTexto, onNivel, onErro, onStatus, onExclusivo, faixa, onFrase } = {}) {
    Object.assign(this, { onTexto, onNivel, onErro, onStatus, onExclusivo, faixa, onFrase });
    this.ativo = false; this.final = ''; this.interim = ''; this.rec = null; this.vu = null; this.trilha = null;
  }
  get texto() { return (this.final + this.interim).trim(); }
  /** Só o que o reconhecimento já confirmou (sem o trecho provisório, que muda e erra muito). */
  get confirmado() { return (this.final + (celular ? this.sessao || '' : '')).trim(); }
  /** Inicia o reconhecimento: na faixa compartilhada do chat de voz (se houver) ou no microfone direto. */
  partir(rec) { if (this.trilha) rec.start(this.trilha); else rec.start(); }
  largarTrilha() { this.trilha?.stop(); this.trilha = null; }
  /** Celular sem rec.start(faixa): solta o microfone do chat de voz (os outros deixam de ouvir a voz real; o texto vira voz sintetizada neles). */
  async exclusivoMic() { this.largarTrilha(); this.exclusivo = true; try { await this.onExclusivo?.(true); } catch { /* */ } return this.ativo; }
  async ligar(textoInicial = '') {
    if (this.ativo) return true;
    if (!SR) { this.onErro?.('Este navegador não transcreve voz. Use o Google Chrome ou o Edge, ou digite sua fala.'); return false; }
    this.final = textoInicial ? textoInicial.trim() + ' ' : ''; this.interim = '';
    this.ativo = true;
    if (celular) {
      const f = faixaOk !== false && this.faixa?.();
      if (f && f.readyState === 'live') { this.trilha = f.clone(); this.trilha.enabled = true; } // clone: o "mudo" do chat não silencia a transcrição
      else if (!await this.exclusivoMic()) return false;
    }
    let rec = this.criar();
    if (this.trilha && faixaOk === undefined) {
      try { rec.start({}); faixaOk = false; } catch (e) { faixaOk = e instanceof TypeError; }
      if (!faixaOk) { this.rec = null; try { rec.abort(); } catch { /* */ } if (!await this.exclusivoMic()) return false; rec = this.criar(); }
    }
    try { this.partir(rec); } catch (e) { this.ativo = false; this.largarTrilha(); this.soltar(); this.onErro?.(msgErroVoz(e.name)); return false; }
    if (!celular) this.ligarVU();
    return true;
  }
  criar() {
    const rec = this.rec = new SR(); rec.lang = 'pt-BR'; rec.continuous = !celular; rec.interimResults = true; rec.maxAlternatives = 5;
    rec.onstart = () => this.rec === rec && this.onStatus?.('Microfone ligado: pode falar.');
    rec.onspeechstart = () => this.rec === rec && this.onStatus?.('Ouvindo e transcrevendo…');
    rec.onresult = e => {
      if (this.rec !== rec) return;
      if (celular) { // sessão curta: reconstrói a frase inteira a cada evento (evita duplicação do Android)
        let fin = '', inte = '';
        for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += melhor(r).trim() + ' '; else inte += melhor(r); }
        this.sessao = fin; this.interim = (fin + inte).trim(); this.onNivel?.(.5 + Math.random() * .4);
      } else {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]; if (r.isFinal) this.final += melhor(r).trim() + ' '; else interim += melhor(r);
        }
        this.interim = interim;
      }
      this.onTexto?.(this.texto, this.confirmado);
    };
    rec.onerror = e => {
      if (this.rec !== rec || e.error === 'no-speech' || e.error === 'aborted') return;
      if (this.trilha && this.ativo) { // a faixa compartilhada não funcionou neste aparelho: volta ao microfone exclusivo
        faixaOk = false; this.rec = null; try { rec.abort(); } catch { /* */ }
        this.exclusivoMic().then(ok => { if (!ok) return; const r = this.criar(); try { this.partir(r); } catch (er) { this.ativo = false; this.soltar(); this.onErro?.(msgErroVoz(er.name)); } });
        return;
      }
      this.ativo = false; this.pararVU(); this.largarTrilha(); this.soltar(); this.onErro?.(msgErroVoz(e.error));
    };
    rec.onend = () => {
      if (this.rec !== rec) return;
      if (celular && this.interim) { const frase = this.interim.trim(); this.final += frase + ' '; this.interim = ''; this.sessao = ''; this.onNivel?.(0); if (this.exclusivo) this.onFrase?.(frase); }
      if (this.ativo) setTimeout(() => { if (this.ativo && this.rec === rec) { try { this.partir(rec); } catch { /* reinício */ } } }, celular ? 120 : 0);
      else { this.largarTrilha(); this.soltar(); this._fim?.(); }
    };
    return rec;
  }
  soltar() { if (this.exclusivo) { this.exclusivo = false; this.onExclusivo?.(false); } }
  desligar() {
    return new Promise(res => {
      if (!this.ativo || !this.rec) { this.ativo = false; this.pararVU(); this.largarTrilha(); this.soltar(); return res(this.texto); }
      this.ativo = false; this.pararVU();
      let feito = false; const fim = () => { if (feito) return; feito = true; this.interim = this.interim.trim(); this.largarTrilha(); this.soltar(); res(this.texto); };
      this._fim = fim; try { this.rec.stop(); } catch { fim(); }
      setTimeout(fim, 1400);
    });
  }
  abortar() { this.ativo = false; this.pararVU(); try { this.rec?.abort(); } catch { /* */ } this.largarTrilha(); this.soltar(); }
  async ligarVU() {
    const token = this.vuToken = Math.random();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== this.vuToken || !this.ativo) { stream.getTracks().forEach(t => t.stop()); return; }
      const ctx = new AudioContext(), an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      this.vu = { stream, ctx };
      const loop = () => {
        if (!this.vu) return;
        an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) { const x = (v - 128) / 128; s += x * x; }
        this.onNivel?.(Math.min(1, Math.sqrt(s / buf.length) * 6)); this.vu.raf = requestAnimationFrame(loop);
      };
      loop();
    } catch { /* o reconhecimento pode funcionar mesmo sem o medidor */ }
  }
  pararVU() { this.vuToken = 0; if (this.vu) { cancelAnimationFrame(this.vu.raf); this.vu.stream.getTracks().forEach(t => t.stop()); this.vu.ctx.close().catch(() => {}); this.vu = null; } this.onNivel?.(0); }
}

export async function testarMicrofone(segundos = 6) {
  return new Promise(res => {
    if (!SR) return res({ ok: false, msg: 'Este navegador não tem reconhecimento de voz. Use o Google Chrome ou o Edge.' });
    const rec = new SR(); rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true;
    let txt = '', erro = null;
    rec.onresult = e => { txt = ''; for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript; };
    rec.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') erro = msgErroVoz(e.error); };
    rec.onend = () => res(erro ? { ok: false, msg: erro } : txt ? { ok: true, msg: txt } : { ok: false, msg: 'Não captei nenhuma fala. Confira o microfone selecionado no ícone da barra de endereço.' });
    try { rec.start(); } catch (e) { return res({ ok: false, msg: e.message }); }
    setTimeout(() => { try { rec.stop(); } catch { /* */ } }, segundos * 1000);
  });
}

// ---------- voz da mediadora ----------
let voz = null;
function escolherVoz() {
  const vs = speechSynthesis.getVoices();
  voz = vs.find(v => /pt-BR/i.test(v.lang) && /francisca|maria|luciana|thalita|female|feminina/i.test(v.name)) || vs.find(v => /pt-BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { escolherVoz(); speechSynthesis.onvoiceschanged = escolherVoz; }
/** Voz para um candidato da IA, conforme o gênero (usa voz masculina/feminina do sistema quando existir). */
function vozDoGenero(genero) {
  const vs = speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang));
  const masc = vs.find(v => /daniel|antonio|ant[oô]nio|ricardo|paulo|male|masculin/i.test(v.name) && !/female/i.test(v.name));
  const fem = vs.find(v => /francisca|maria|luciana|thalita|vit[oó]ria|brenda|female|feminin/i.test(v.name));
  if (genero === 'masculino') return masc ? { voz: masc, pitch: .95 } : { voz: voz, pitch: .62 };
  if (genero === 'feminino') return { voz: fem || voz, pitch: 1.12 };
  return { voz: voz, pitch: .88 };
}
export function falar(texto, { onInicio, onFim, genero, fila } = {}) {
  if (!('speechSynthesis' in window)) { onFim?.(); return; }
  if (!fila) speechSynthesis.cancel(); // fila: entra depois da frase que já está sendo lida
  const u = new SpeechSynthesisUtterance(texto); u.lang = 'pt-BR'; if (voz) u.voice = voz; u.rate = 1.07; u.pitch = 1.02;
  if (genero) { const g = vozDoGenero(genero); if (g.voz) u.voice = g.voz; u.pitch = g.pitch; u.rate = 1.1; }
  u.onstart = () => onInicio?.(); u.onend = u.onerror = () => onFim?.();
  speechSynthesis.speak(u);
}
export function calar() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
// Celular (iOS principalmente): áudio/voz sintetizada só tocam depois de serem "destravados" num toque do usuário.
const destravarAudio = () => {
  removeEventListener('pointerdown', destravarAudio, true); removeEventListener('touchend', destravarAudio, true); removeEventListener('keydown', destravarAudio, true);
  try { ctx(); } catch { /* */ }
  try { if ('speechSynthesis' in window && !speechSynthesis.speaking) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch { /* */ }
};
addEventListener('pointerdown', destravarAudio, true); addEventListener('touchend', destravarAudio, true); addEventListener('keydown', destravarAudio, true);

// ---------- efeitos sonoros sintetizados ----------
let ac = null, volume = .7, volAmb = .7, volMusica = .8;
export function setVolume(v) { volume = v; }
export function setVolumeAmbiente(v) { volAmb = v; ajustarAmbiente(); }
export function setVolumeMusica(v) { volMusica = v; }
export const lerVolumeMusica = () => volMusica, lerVolumeAmbiente = () => volAmb;
function ctx() { if (!ac) ac = new AudioContext(); if (ac.state === 'suspended') ac.resume(); return ac; }
function tom(freq, dur, tipo = 'sine', vol = .2, atraso = 0) {
  const c = ctx(), o = c.createOscillator(), g = c.createGain(); o.type = tipo; o.frequency.value = freq;
  const t = c.currentTime + atraso; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * volume, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
}
function ruido(dur, vol = .2, filtro = 2000, atraso = 0) {
  const c = ctx(), n = c.sampleRate * dur, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filtro; f.Q.value = .8;
  const g = c.createGain(); const t = c.currentTime + atraso; g.gain.setValueAtTime(vol * volume, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination); s.start(t);
}
// ---------- som ambiente: burburinho fixo da plateia + palmas reais (gravações geradas no servidor) ----------
let palmasUrl = null, burburinho = null;
function rampaVol(a, alvo, ms, depois) {
  const ini = a.volume, t0 = performance.now();
  const p = () => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, ini + (alvo - ini) * k)); if (k < 1) requestAnimationFrame(p); else depois?.(); };
  p();
}
export function configurarAmbiente({ palmas, burburinho: urlB } = {}) {
  palmasUrl = palmas || null;
  if (urlB && !burburinho) {
    burburinho = new Audio(urlB); burburinho.loop = true; burburinho.volume = 0;
    burburinho.play().then(() => rampaVol(burburinho, .22 * volAmb, 2500)).catch(() => { burburinho = null; });
  }
}
let abafado = 1; // ducking do burburinho (1 = normal) enquanto a mediadora fala
export function ajustarAmbiente(ms = 500) { if (burburinho) rampaVol(burburinho, .22 * volAmb * abafado, ms); }
export function abafarAmbiente(k = 1) { abafado = k; ajustarAmbiente(400); }
function palmasReais(dur, vol) {
  const a = new Audio(palmasUrl); a.volume = 0;
  a.addEventListener('loadedmetadata', () => {
    const ini = 13.5, fim = Math.max(ini + 1, (a.duration || 30) - dur - .5); // a parte de plateia começa em ~13 s
    a.currentTime = ini + Math.random() * (fim - ini);
    a.play().then(() => { rampaVol(a, Math.min(1, vol * 3.2 * volAmb), 250); setTimeout(() => rampaVol(a, 0, 900, () => a.pause()), Math.max(400, dur * 1000 - 900)); }).catch(() => {});
  }, { once: true });
}
/** Som do emote/dança (ElevenLabs via /api/som); sem ele, toca o som sintetizado de reserva. */
const somFalhou = new Set();
export function somItem(id, reserva, vol = .8) {
  if (somFalhou.has(id)) return reserva?.();
  const a = new Audio('/api/som/' + id); a.volume = Math.min(1, vol * volume);
  let tarde = false; const lim = setTimeout(() => { tarde = true; a.pause(); reserva?.(); }, 1500); // ainda gerando: não toca atrasado
  a.play().then(() => { clearTimeout(lim); if (tarde) a.pause(); })
    .catch(e => { clearTimeout(lim); if (tarde) return; if (e?.name !== 'NotAllowedError') somFalhou.add(id); setTimeout(() => somFalhou.delete(id), 60000); reserva?.(); });
  return a;
}
/** Nível (0..1) de um <audio> tocando, a cada quadro, para mexer a boca do avatar. Devolve função que para. */
export function nivelDoAudio(a, cb) {
  let an, raf = 0, buf, tocou = false; const t0 = performance.now();
  const acabou = () => a.ended || a.error || (a.paused && tocou) || (!tocou && performance.now() - t0 > 15000);
  try {
    const c = ctx(); if (c.state !== 'running') throw 0; // contexto suspenso deixaria o áudio mudo: usa os pulsos
    an = c.createAnalyser(); an.fftSize = 512; buf = new Uint8Array(an.fftSize); c.createMediaElementSource(a).connect(an); an.connect(c.destination);
  } catch { // sem WebAudio: boca em pulsos enquanto o áudio toca
    const iv = setInterval(() => { tocou ||= !a.paused; if (acabou()) { clearInterval(iv); cb(0); } else cb(a.paused ? 0 : .4 + Math.random() * .5); }, 110);
    return () => { clearInterval(iv); cb(0); };
  }
  const loop = () => {
    tocou ||= !a.paused; if (acabou()) return cb(0);
    an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2;
    cb(a.paused ? 0 : Math.min(1, Math.sqrt(s / buf.length) / 128 * 5)); raf = requestAnimationFrame(loop);
  };
  loop();
  return () => { cancelAnimationFrame(raf); cb(0); };
}
// ---------- sons do palco: passos de sapato e púlpito com rodinhas (posicionais: vol 0..1 e pan -1..1) ----------
let ruidoBuf = null, marromBuf = null;
function buffers(c) {
  if (ruidoBuf) return;
  const n = c.sampleRate * 2; ruidoBuf = c.createBuffer(1, n, c.sampleRate); marromBuf = c.createBuffer(1, n, c.sampleRate);
  const w = ruidoBuf.getChannelData(0), b = marromBuf.getChannelData(0); let ult = 0;
  for (let i = 0; i < n; i++) { w[i] = Math.random() * 2 - 1; ult = (ult + .02 * w[i]) / 1.02; b[i] = ult * 3.5; }
  const dlt = b[n - 1] - b[0]; for (let i = 0; i < n; i++) b[i] -= dlt * i / (n - 1); // emenda do loop sem estalo
}
// barramento com limitador: vários passos + rodinhas juntos não estouram
let bus = null;
function barramento(c) {
  if (!bus) { bus = c.createDynamicsCompressor(); bus.threshold.value = -12; bus.ratio.value = 8; bus.attack.value = .003; bus.release.value = .15; bus.connect(c.destination); }
  return bus;
}
function saida(c, pan = 0) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(barramento(c)); return p; }
export const audioBase = () => { const c = ctx(); return { c, volume, saida: pan => saida(c, pan) }; }; // p/ acoes/sons.js
/** Pancada curta de ruído filtrado (salto/bico do sapato, estalos). */
function estalo(c, dest, t, dur, vol, freq, q = 1.2) {
  const s = c.createBufferSource(); s.buffer = ruidoBuf; s.playbackRate.value = .9 + Math.random() * .2;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .003); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(dest); s.start(t, Math.random() * 1.5, dur + .02);
}
function baque(c, dest, t, f0, f1, dur, vol) {
  const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + .02);
}
/** Passo de sapato social no piso do palco: salto (estalo seco + baque grave) e, logo depois, a sola. */
function passo({ vol = .5, pan = 0, tenis = false } = {}) {
  const c = ctx(); if (c.state !== 'running') return; buffers(c);
  const v = vol * volume; if (v < .01) return;
  const d = saida(c, pan), t = c.currentTime + .005, k = .85 + Math.random() * .3;
  if (tenis) { baque(c, d, t, 110 * k, 50, .06, .35 * v); estalo(c, d, t, .04, .12 * v, 900 * k, .8); return; } // tênis: passo abafado
  estalo(c, d, t, .045, .55 * v, 2600 * k, 1.4); estalo(c, d, t, .03, .25 * v, 5200 * k, 2);
  baque(c, d, t, 140 * k, 55, .07, .35 * v);
  estalo(c, d, t + .05 + Math.random() * .02, .06, .22 * v, 1500 * k, .9);
}
/** Trava/destrava das rodinhas e pancada do púlpito parando. */
function trava({ vol = .6, pan = 0 } = {}) {
  const c = ctx(); if (c.state !== 'running') return; buffers(c);
  const v = vol * volume; if (v < .01) return; const t = c.currentTime + .005;
  const d = c.createBiquadFilter(); d.type = 'lowpass'; d.frequency.value = 900; d.Q.value = .5; d.connect(saida(c, pan)); // abafado, sem estalo agudo
  baque(c, d, t, 90, 40, .28, .3 * v); estalo(c, d, t, .1, .2 * v, 500, .8);
  estalo(c, d, t + .09, .06, .04 * v, 1100, 2); // leve chacoalhar do metal
}
/** Rodinhas do púlpito rolando: ronco grave + trepidação. Devolve { set(vel 0..1, vol, pan), parar() }. */
function rodinhas() {
  const c = ctx(); if (c.state !== 'running') return null; buffers(c);
  const p = c.createStereoPanner(); p.connect(barramento(c));
  const mestre = c.createGain(); mestre.gain.value = 0; mestre.connect(p);
  const ronco = c.createBufferSource(); ronco.buffer = marromBuf; ronco.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = .5;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 50;
  ronco.connect(lp).connect(hp).connect(mestre);
  // trepidação macia: ruído abafado e CONTÍNUO (a ondulação de 4–9 Hz soava como rufo de tambor durante o debate)
  const chiado = c.createBufferSource(); chiado.buffer = ruidoBuf; chiado.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 400; bp.Q.value = .4;
  const trep = c.createGain(); trep.gain.value = .04; const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.type = 'sine'; lfo.frequency.value = 5; lfoG.gain.value = 0;
  lfo.connect(lfoG).connect(trep.gain); chiado.connect(bp).connect(trep).connect(mestre);
  ronco.start(); chiado.start(); lfo.start();
  const segura = (a, t) => a.cancelAndHoldAtTime ? a.cancelAndHoldAtTime(t) : (a.cancelScheduledValues(t), a.setValueAtTime(a.value, t)); // sem saltos ao reprogramar
  let parado = false;
  return {
    set(vel, vol = .6, pan = 0) {
      if (parado) return; const t = c.currentTime; vel = Math.max(0, Math.min(1, vel));
      [mestre.gain, p.pan, lfo.frequency, lp.frequency].forEach(a => segura(a, t));
      mestre.gain.setTargetAtTime(vel * vol * volume * .4, t, .15); // fade-in/variações suaves
      mestre.gain.setTargetAtTime(0, t + .3, .2); // sem novos quadros (aba oculta) → silencia sozinho
      p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, .15);
      lfo.frequency.setTargetAtTime(4 + vel * 5, t, .2); lp.frequency.setTargetAtTime(180 + vel * 160, t, .2);
    },
    parar() {
      if (parado) return; parado = true; const t = c.currentTime;
      segura(mestre.gain, t); mestre.gain.setTargetAtTime(0, t, .12); // fade-out ~0,5 s antes de desligar
      [ronco, chiado, lfo].forEach(n => n.stop(t + .8)); ronco.onended = () => { try { p.disconnect(); } catch {} };
    },
  };
}
export const sfx = {
  passo, trava, rodinhas,
  clique: () => tom(880, .06, 'triangle', .12),
  tique: () => tom(1400, .03, 'square', .05),
  sorteio: () => { tom(660, .15, 'triangle', .18); tom(990, .3, 'triangle', .18, .12); },
  vez: () => { tom(523, .14, 'sine', .22); tom(784, .25, 'sine', .22, .13); },
  alerta: () => tom(440, .12, 'square', .08),
  fim: () => { tom(392, .2, 'sawtooth', .1); tom(262, .4, 'sawtooth', .1, .18); },
  nota: () => { tom(784, .12, 'sine', .18); tom(988, .12, 'sine', .18, .1); tom(1175, .3, 'sine', .18, .2); },
  aplausos: (dur = 2.2, vol = .25) => { if (palmasUrl) return palmasReais(dur, vol); for (let i = 0; i < dur * 22; i++) ruido(.05 + Math.random() * .05, vol * (1 - i / (dur * 22)) * (.5 + Math.random() * .5), 1500 + Math.random() * 2500, i / 22 + Math.random() * .03); },
  vaia: () => { const c = ctx(), o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, c.currentTime); o.frequency.linearRampToValueAtTime(120, c.currentTime + .8); g.gain.setValueAtTime(.06 * volume, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .9); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 1); },
  // vinheta de abertura de programa de TV: pancada + acordes de metais subindo
  vinheta: () => {
    const c = ctx(), t0 = c.currentTime + .05, volume = volMusica; // é música: segue o volume da música
    const metal = (freq, ini, dur, vol = .12) => {
      const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = freq; o2.frequency.value = freq * 1.006;
      f.type = 'lowpass'; f.frequency.setValueAtTime(800, t0 + ini); f.frequency.linearRampToValueAtTime(3200, t0 + ini + .12);
      g.gain.setValueAtTime(0, t0 + ini); g.gain.linearRampToValueAtTime(vol * volume, t0 + ini + .04); g.gain.setValueAtTime(vol * volume, t0 + ini + dur - .15); g.gain.exponentialRampToValueAtTime(.0001, t0 + ini + dur);
      o.connect(f); o2.connect(f); f.connect(g).connect(c.destination); o.start(t0 + ini); o2.start(t0 + ini); o.stop(t0 + ini + dur + .05); o2.stop(t0 + ini + dur + .05);
    };
    const bumbo = ini => { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t0 + ini); o.frequency.exponentialRampToValueAtTime(40, t0 + ini + .3); g.gain.setValueAtTime(.5 * volume, t0 + ini); g.gain.exponentialRampToValueAtTime(.0001, t0 + ini + .4); o.connect(g).connect(c.destination); o.start(t0 + ini); o.stop(t0 + ini + .45); };
    bumbo(0); bumbo(.25); bumbo(.5);
    [[0, [262, 330, 392]], [.25, [294, 370, 440]], [.5, [330, 415, 494]]].forEach(([ini, notas]) => notas.forEach(f => metal(f, ini, .22, .07)));
    bumbo(.8); [392, 494, 587, 784].forEach(f => metal(f, .8, 1.3, .08));
  },
  // martelo do(a) jornalista pedindo ordem: três batidas de madeira
  martelo: () => [0, .28, .56].forEach(d => { tom(220, .09, 'square', .22, d); ruido(.06, .35, 900, d); }),
  vitoria: () => { [523, 659, 784, 1047].forEach((f, i) => tom(f, .35, 'triangle', .2, i * .15)); tom(1047, .9, 'sine', .2, .6); },
  // ---------- revelação do vencedor (rufar → impacto + plateia → whoosh) ----------
  /** Rufar de caixa em crescendo (e tímpano grave por baixo) por `dur` s; para com pararSonsRevelacao(). */
  rufar: (dur = 3.5) => {
    const c = ctx(); buffers(c); const t0 = c.currentTime + .03, m = mestreRev(c, t0 + dur + .4);
    for (let t = 0; t < dur;) { const k = t / dur; estalo(c, m, t0 + t, .06, (.07 + .3 * k * k) * volume, 1700 + Math.random() * 600, .9); t += .072 - .034 * k + Math.random() * .008; }
    const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(65, t0); o.frequency.linearRampToValueAtTime(78, t0 + dur);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(1e-4, .22 * volume), t0 + dur); g.gain.setTargetAtTime(.0001, t0 + dur, .05);
    o.connect(g).connect(m); o.start(t0); o.stop(t0 + dur + .4);
  },
  /** Impacto (bumbo + acorde de metais + prato) e grito da plateia: o nome aparece no telão. */
  impacto: () => {
    const c = ctx(); buffers(c); const t0 = c.currentTime + .02, m = mestreRev(c, t0 + 3.2);
    baque(c, m, t0, 120, 38, .7, .55 * volume);
    [196, 262, 330, 392, 523].forEach(f => [1, 1.007].forEach(d => {
      const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f * d;
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t0); fl.frequency.linearRampToValueAtTime(3000, t0 + .1); fl.frequency.exponentialRampToValueAtTime(700, t0 + 1.6);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.035 * volume, t0 + .03); g.gain.exponentialRampToValueAtTime(.0001, t0 + 1.8);
      o.connect(fl).connect(g).connect(m); o.start(t0); o.stop(t0 + 1.9);
    }));
    const prato = c.createBufferSource(), hp = c.createBiquadFilter(), gp = c.createGain(); prato.buffer = ruidoBuf; hp.type = 'highpass'; hp.frequency.value = 5000;
    gp.gain.setValueAtTime(.28 * volume, t0); gp.gain.exponentialRampToValueAtTime(.0001, t0 + 1.9); prato.connect(hp).connect(gp).connect(m); prato.start(t0, 0, 1.95);
    // plateia gritando: ruído em duas formantes, sobe rápido e some aos poucos
    [[650, .6, .3], [1700, .9, .18]].forEach(([f, q, v]) => {
      const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = marromBuf; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      bp.frequency.setValueAtTime(f, t0 + .1); bp.frequency.linearRampToValueAtTime(f * 1.25, t0 + .6); bp.frequency.linearRampToValueAtTime(f * 1.05, t0 + 2.8);
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(1e-4, v * volume), t0 + .35); g.gain.setValueAtTime(v * volume, t0 + 1.4); g.gain.exponentialRampToValueAtTime(.0001, t0 + 3);
      s.connect(bp).connect(g).connect(m); s.start(t0); s.stop(t0 + 3.05);
    });
    if (palmasUrl) palmasReais(2.8, .3);
  },
  /** Whoosh crescente (ruído varrendo + subida tonal) de `dur` s, terminando no corte para a festa. */
  whoosh: (dur = 2) => {
    const c = ctx(); buffers(c); const t0 = c.currentTime + .02, m = mestreRev(c, t0 + dur + .2);
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = ruidoBuf; s.loop = true; bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(250, t0); bp.frequency.exponentialRampToValueAtTime(5000, t0 + dur);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(1e-4, .32 * volume), t0 + dur - .05); g.gain.linearRampToValueAtTime(0, t0 + dur + .08);
    s.connect(bp).connect(g).connect(m); s.start(t0); s.stop(t0 + dur + .1);
    const o = c.createOscillator(), go = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(180, t0); o.frequency.exponentialRampToValueAtTime(1100, t0 + dur);
    go.gain.setValueAtTime(.0001, t0); go.gain.exponentialRampToValueAtTime(Math.max(1e-4, .08 * volume), t0 + dur - .05); go.gain.linearRampToValueAtTime(0, t0 + dur + .08);
    o.connect(go).connect(m); o.start(t0); o.stop(t0 + dur + .1);
  },
};
// cada som da revelação passa por um ganho mestre próprio, para poder ser cortado no meio (sair da sala)
const sonsRev = new Set();
function mestreRev(c, fim) {
  const g = c.createGain(); g.connect(c.destination); sonsRev.add(g);
  setTimeout(() => { sonsRev.delete(g); g.disconnect(); }, (fim - c.currentTime) * 1000 + 300); return g;
}
/** Corta na hora tambores/whoosh/impacto (só os que já começaram; o resto é cancelado pelos timers da cena). */
export function pararSonsRevelacao() {
  for (const g of sonsRev) { try { g.gain.setTargetAtTime(0, ac.currentTime, .03); } catch { /* */ } }
}
