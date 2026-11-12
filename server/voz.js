// Dublagem com a API do Google Gemini (texto -> fala).
// A chave fica só no servidor (.env); o navegador recebe apenas os arquivos de áudio gerados.
// Cada trecho de fala vira um .wav guardado em dados/audio, reaproveitado entre partidas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { norm } from '../shared/regras.js';

// ordem de preferência (o "lite" foi retirado: ele costuma ler a direção de voz em voz alta)
const MODELOS = ['gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-pro-preview-tts'];

// Cada voz tem uma "direção" (como num roteiro de TV). Para garantir que o modelo NÃO leia a direção em voz alta,
// todo áudio é conferido: um modelo de texto transcreve o que foi falado e compara com o texto esperado.
const VERSAO = 'v5-palco';
const MODELO_CONFERE = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const ESTILO = {
  jornalistaF: { voz: 'Kore', dir: 'Apresentadora brasileira de um grande debate presidencial ao vivo, num palco de TV com plateia. Voz projetada, firme e cheia de energia, ritmo dinâmico de televisão, sorriso na voz e muita presença de palco. Sotaque brasileiro.' },
  jornalistaM: { voz: 'Charon', dir: 'Apresentador brasileiro de um grande debate presidencial ao vivo, num palco de TV com plateia. Voz grave e projetada, firme e cheia de energia, ritmo dinâmico de televisão, muita presença de palco. Sotaque brasileiro.' },
  locutor: { voz: 'Fenrir', dir: 'Locutor brasileiro de abertura de um grande show de TV ao vivo, gritando de empolgação para o estúdio lotado. Energia máxima, euforia, voz bem alta e vibrante, alongando as palavras como em abertura de evento esportivo.' },
};
export const DIR_PLATEIA = 'Pessoa na plateia lotada de um estúdio de TV reagindo alto, de forma espontânea e exagerada, como torcida.';
const DIR_CANDIDATO = 'Candidato(a) brasileiro(a) num debate presidencial na TV, falando com convicção, firmeza e emoção para o eleitor, como um político experiente. Sotaque brasileiro.';
export const VOZES = Object.fromEntries(Object.entries(ESTILO).map(([k, v]) => [k, v.voz]));
const direcaoDe = tipo => ESTILO[tipo]?.dir || DIR_CANDIDATO;
// vozes do Gemini usadas pelos candidatos da IA
export const VOZES_IA = {
  masculino: ['Fenrir', 'Orus', 'Iapetus', 'Algenib', 'Alnilam', 'Schedar', 'Umbriel', 'Enceladus'],
  feminino: ['Aoede', 'Leda', 'Callirrhoe', 'Autonoe', 'Despina', 'Erinome', 'Gacrux', 'Laomedeia'],
  nao_binario: ['Zephyr', 'Achird', 'Sulafat', 'Puck'],
};
const vozDe = tipo => VOZES[tipo] || tipo || 'Kore';

// ElevenLabs: voz natural das(os) jornalistas NPC (Gemini fica de reserva). Vozes trocáveis no .env (ELEVENLAB-VOZ-F / -M).
// trechos curtos (nomes) sozinhos fazem o modelo "inventar" palavras (às vezes em inglês): vão com contexto em português
// (previous_text/next_text, que não são falados) e passam pela conferência. Mudar EL_VERSAO_CURTO regenera só esses trechos.
const CURTO = 40, EL_VERSAO = 'el1', EL_VERSAO_CURTO = 'el7', EL_MODELO = 'eleven_multilingual_v2';
const EL_VOZ = { jornalistaF: 'cgSgspJ2msm6clMCkdW9', jornalistaM: 'nPczCjzI2devNBz1zQrb' }; // Jessica · Brian (sempre as mesmas: nomes, temas, abertura...)
const EL_AJUSTE = { stability: 0.38, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true };

function lerPares(raiz) {
  try {
    return fs.readFileSync(path.join(raiz, '.env'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => {
      const i = l.indexOf('='); return i < 0 ? ['', l] : [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    });
  } catch { return []; }
}
function lerChave(raiz) {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const pares = lerPares(raiz).filter(([k]) => !/eleven|chatgpt|openai/i.test(k));
  const par = pares.find(([k]) => /gemini|google/i.test(k)) || pares.find(([k]) => /api|key|chave/i.test(k)) || pares[0];
  return par ? par[1] : null;
}
const lerEleven = raiz => process.env.ELEVENLABS_API_KEY?.trim() || lerPares(raiz).find(([k]) => /eleven/i.test(k) && !/voz/i.test(k))?.[1] || null;

function wav(pcm, taxa = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(taxa, 24); h.writeUInt32LE(taxa * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
/** A API pode devolver PCM puro OU um arquivo WAV completo (com blocos extras, como a assinatura C2PA
 *  de conteúdo gerado por IA). Aqui só o áudio do bloco 'data' é aproveitado; o resto vira chiado se tocado. */
function extrairPCM(buf) {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return { pcm: buf, taxa: 24000 };
  let pos = 12, taxa = 24000, canais = 1, bits = 16, pcm = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4), tam = buf.readUInt32LE(pos + 4), ini = pos + 8;
    if (id === 'fmt ') { canais = buf.readUInt16LE(ini + 2); taxa = buf.readUInt32LE(ini + 4); bits = buf.readUInt16LE(ini + 14); }
    else if (id === 'data') { pcm = buf.subarray(ini, Math.min(buf.length, ini + tam)); break; }
    pos = ini + tam + (tam % 2);
  }
  if (!pcm || bits !== 16) return { pcm: Buffer.alloc(0), taxa };
  if (canais === 2) { // converte para mono
    const m = Buffer.alloc(pcm.length / 2); for (let i = 0; i < m.length / 2; i++) m.writeInt16LE((pcm.readInt16LE(i * 4) + pcm.readInt16LE(i * 4 + 2)) >> 1, i * 2); pcm = m;
  }
  return { pcm, taxa };
}
// remove silêncio sobrando no começo e no fim (deixa as emendas entre trechos naturais)
function aparar(pcm, fadeFim = 0.01) { // fadeFim: segundos de saída suave no fim
  const n = pcm.length / 2, lim = 600; let a = 0, b = n - 1;
  while (a < n && Math.abs(pcm.readInt16LE(a * 2)) < lim) a++;
  while (b > a && Math.abs(pcm.readInt16LE(b * 2)) < lim) b--;
  a = Math.max(0, a - 1200); b = Math.min(n - 1, b + 2400); // 50 ms antes, 100 ms depois
  const out = Buffer.from(pcm.subarray(a * 2, (b + 1) * 2)); // cópia
  // volume encorpado: normaliza o pico para -1 dB
  let pico = 1; for (let i = 0; i < out.length; i += 2) pico = Math.max(pico, Math.abs(out.readInt16LE(i)));
  const ganho = Math.min(4, 29200 / pico);
  if (ganho > 1.02) for (let i = 0; i < out.length; i += 2) out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(out.readInt16LE(i) * ganho))), i);
  // rampa de 10 ms no começo e no fim: evita estalos na emenda entre trechos
  const m = out.length / 2, f = Math.min(240, m >> 1), ff = Math.min(Math.round(fadeFim * 24000), m >> 1);
  for (let i = 0; i < f; i++) { const g = i / f; out.writeInt16LE(Math.round(out.readInt16LE(i * 2) * g), i * 2); }
  for (let i = 0; i < ff; i++) { const g = Math.sin(i / ff * Math.PI / 2); out.writeInt16LE(Math.round(out.readInt16LE((m - 1 - i) * 2) * g), (m - 1 - i) * 2); }
  return out;
}
const distancia = (a, b) => { let p = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { const q = [i]; for (let j = 1; j <= b.length; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] !== b[j - 1])); p = q; } return p[b.length]; };
/** Trecho curto (nome) do ElevenLabs com alinhamento: começa 40 ms antes da 1ª letra e termina onde a voz
 *  realmente acabou (3 janelas de 10 ms abaixo de -55 dB depois da última letra), e não num tempo fixo:
 *  o alinhamento às vezes marca o fim antes do som acabar (ex.: "l", "s"). limpo=false: o take acabou com voz soando. */
function cortarCurto(pcm, al) {
  const n = pcm.length >> 1, idx = [...(al?.characters || [])].map((c, i) => /[\p{L}\p{N}]/u.test(c) ? i : -1).filter(i => i >= 0);
  if (!idx.length) return { pcm, limpo: true };
  const db = a => { let s = 0; const b = Math.min(n, a + 240); for (let i = a; i < b; i++) { const x = pcm.readInt16LE(i * 2) / 32768; s += x * x; } return b > a ? 10 * Math.log10(s / (b - a) + 1e-12) : -120; };
  const ini = Math.max(0, Math.round((al.character_start_times_seconds[idx[0]] - .04) * 24000));
  let fim = n, limpo = false;
  for (let a = Math.max(ini, Math.round((al.character_end_times_seconds[idx.at(-1)] - .02) * 24000)), q = 0; a + 240 <= n; a += 240) {
    q = db(a) < -55 ? q + 1 : 0;
    if (q === 3) { // a voz acabou em a-480: guarda até 80 ms desse silêncio (o fade final cai nele, sem encurtar a cauda da voz)
      fim = a - 480; while (fim < a + 1440 && fim + 240 <= n && db(fim) < -50) fim += 240;
      limpo = true; break;
    }
    if (a > (al.character_end_times_seconds[idx.at(-1)] + .45) * 24000) break; // mais que isso já seria o next_text
  }
  return { pcm: fim - ini > 2000 ? pcm.subarray(ini * 2, fim * 2) : pcm, limpo };
}

export class Dublagem {
  constructor(raiz) {
    this.chave = lerChave(raiz);
    this.pasta = path.join(raiz, 'dados', 'audio'); fs.mkdirSync(this.pasta, { recursive: true });
    // falas dos candidatos da IA são únicas: ficam numa pasta temporária, limpa a cada início
    this.pastaFalas = path.join(this.pasta, 'falas'); fs.rmSync(this.pastaFalas, { recursive: true, force: true }); fs.mkdirSync(this.pastaFalas, { recursive: true });
    // filas: 'alta' = vai tocar agora · 'media' = será usado nesta partida · 'baixa' = pré-geração geral
    this.trabalhos = new Map(); this.filas = { alta: [], media: [], baixa: [] }; this.ativos = 0; this.ativosBaixa = 0; this.max = 8;
    this.esfria = {}; this.vez = 0;
    this.ativa = !!this.chave;
    console.log(this.ativa ? '   Dublagem: Google Gemini ativada (chave lida do .env)' : '   Dublagem: sem chave do Gemini no .env; usando a voz do navegador');
    this.chaveEL = lerEleven(raiz); this.esfriaEL = 0;
    const pares = lerPares(raiz), voz = s => pares.find(([k]) => new RegExp(`eleven.*voz.*${s}$`, 'i').test(k))?.[1];
    this.vozEL = { jornalistaF: voz('f') || EL_VOZ.jornalistaF, jornalistaM: voz('m') || EL_VOZ.jornalistaM };
    if (this.chaveEL) console.log('   Dublagem: ElevenLabs ativada para as vozes da mediação');
  }
  /** O tipo usa ElevenLabs agora? (jornalistas NPC, com chave e sem pausa por erro/cota) */
  eleven(tipo) { return !!(this.chaveEL && this.vozEL[tipo] && this.esfriaEL <= Date.now()); }
  arquivo(texto, tipo, temporario, gemini = false) {
    const el = !gemini && this.eleven(tipo);
    const v = el ? this.vozEL[tipo] : vozDe(tipo), dir = el ? '' : direcaoDe(tipo);
    const hash = crypto.createHash('sha1').update((el ? (texto.length <= CURTO ? EL_VERSAO_CURTO : EL_VERSAO) + '|' + EL_MODELO : VERSAO) + '|' + v + '|' + dir + '|' + texto).digest('hex').slice(0, 20);
    return temporario ? { v, dir, hash, arq: path.join(this.pastaFalas, hash + '.wav'), url: '/audio/falas/' + hash + '.wav' }
      : { v, dir, hash, arq: path.join(this.pasta, hash + '.wav'), url: '/audio/' + hash + '.wav' };
  }
  /** Vinheta musical de abertura (Lyria, modelo de música do Google), gerada uma vez e guardada. */
  async vinheta() {
    const arq = path.join(this.pasta, 'vinheta.mp3');
    if (fs.existsSync(arq)) return '/audio/vinheta.mp3';
    if (!this.ativa || this.gerandoVinheta) return null;
    this.gerandoVinheta = true;
    const prompt = 'Epic TV news show opening theme. Powerful orchestral timpani rolls, real snare drum and big bass drum hits, bold brass fanfare and strings, cinematic, dramatic and energetic. Builds to a triumphant climax with a big final drum hit. Instrumental.';
    for (const modelo of ['lyria-3-clip-preview', 'lyria-3.5']) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.chave }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const j = await r.json();
        const a = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData && /mpeg|mp3/.test(p.inlineData.mimeType));
        if (a) { fs.writeFileSync(arq, Buffer.from(a.inlineData.data, 'base64')); console.log('   Vinheta de abertura gerada (Lyria).'); this.gerandoVinheta = false; return '/audio/vinheta.mp3'; }
      } catch { /* tenta o próximo */ }
    }
    this.gerandoVinheta = false; return null;
  }
  /** Burburinho de fundo: conversas baixas da plateia (vozes do Gemini) misturadas num loop de 40 s,
   *  com várias pessoas falando ao mesmo tempo e filtro para que nenhuma palavra fique compreensível. */
  async burburinho() {
    const arq = path.join(this.pasta, 'burburinho.wav');
    if (fs.existsSync(arq)) return '/audio/burburinho.wav';
    if (!this.ativa || this.gerandoBurburinho) return null;
    this.gerandoBurburinho = true;
    const conversas = [
      'Nossa, o estúdio está lotado hoje. Você viu quem vai debater?', 'Eu acho que esse candidato vai se dar mal na pergunta sobre economia.',
      'Olha lá a jornalista, ela é ótima. Será que vai ter confusão hoje?', 'Minha tia jurou que ia votar nele, mas mudou de ideia ontem.',
      'Psiu, vai começar! Não, ainda não, calma.', 'Tô com fome, devia ter comido antes de vir pra cá.',
      'Esse debate vai ser quente, pode escrever o que eu tô dizendo.', 'Quem você acha que ganha? Eu ainda não decidi meu voto.',
    ];
    const vozes = ['Fenrir', 'Leda', 'Charon', 'Kore', 'Puck', 'Aoede', 'Orus', 'Despina'];
    const dir = 'Pessoa sentada na plateia de um programa de TV, conversando baixinho e de forma casual com quem está ao lado.';
    const clipes = [];
    const lerWav = f => { const b = fs.readFileSync(f); return new Int16Array(b.buffer.slice(b.byteOffset + 44, b.byteOffset + 44 + ((b.length - 44) & ~1))); };
    // se já há muitas vozes guardadas (jornalistas, plateia, candidatos), o burburinho é montado com elas, sem gastar cota
    const guardados = fs.readdirSync(this.pasta).filter(f => f.endsWith('.wav') && f !== 'burburinho.wav');
    if (guardados.length >= 30) for (const f of guardados.sort(() => Math.random() - .5).slice(0, 40)) clipes.push(lerWav(path.join(this.pasta, f)));
    if (clipes.length < 4) for (const [k, t] of conversas.entries()) {
      const r = await this.sintetizar(t, vozes[k], 'media', true, { conferir: false, dir });
      if (r) clipes.push(lerWav(path.join(this.pastaFalas, r.url.split('/').pop())));
    }
    this.gerandoBurburinho = false;
    if (clipes.length < 4) return null;
    const taxa = 24000, L = taxa * 40, mix = new Float32Array(L);
    // muitas vozes ao mesmo tempo (~14 falando a qualquer instante), cada uma num tom e volume diferentes
    // (o loop dá a volta no fim, então não tem emenda)
    const mediaClip = clipes.reduce((a, c) => a + c.length, 0) / clipes.length;
    const total = Math.ceil(L * 14 / mediaClip);
    for (let n = 0; n < total; n++) {
      const c = clipes[(Math.random() * clipes.length) | 0], vel = .78 + Math.random() * .44, ganho = .08 + Math.random() * .22, ini = Math.random() * L | 0;
      for (let i = 0; i < c.length / vel; i++) { const j = i * vel, a = j | 0, f = j - a; const v = ((c[a] || 0) * (1 - f) + (c[a + 1] || 0) * f) / 32768; mix[(ini + i) % L] += v * ganho; }
    }
    // abafa as palavras (passa-baixa forte, como vozes vindas do fundo da plateia)
    let y1 = 0, y2 = 0; const al = .3;
    for (let i = 0; i < L; i++) { y1 += al * (mix[i] - y1); y2 += al * (y1 - y2); mix[i] = y2; }
    // reverberação de sala grande (ecos em loop)
    const sala = Float32Array.from(mix);
    for (const [ms, g] of [[43, .35], [71, .3], [97, .25], [131, .2], [173, .15]]) { const d = Math.round(ms * 24); for (let i = 0; i < L; i++) sala[i] += mix[(i - d + L) % L] * g; }
    for (let i = 0; i < L; i++) mix[i] = sala[i] + (Math.random() - .5) * .002;
    let pico = 1e-6; for (const v of mix) pico = Math.max(pico, Math.abs(v));
    const pcm = Buffer.alloc(L * 2); for (let i = 0; i < L; i++) pcm.writeInt16LE(Math.round(mix[i] / pico * .6 * 32767), i * 2);
    fs.writeFileSync(arq, wav(pcm, taxa)); console.log('   Burburinho de plateia gerado.');
    return '/audio/burburinho.wav';
  }
  semCota() { return MODELOS.every(m => (this.esfria[m] || 0) > Date.now()); }
  pronto(texto, tipo, temporario) {
    const { arq, url } = this.arquivo(texto, tipo, temporario);
    if (!fs.existsSync(arq)) return null;
    const fd = fs.openSync(arq, 'r'), h = Buffer.alloc(44); fs.readSync(fd, h, 0, 44, 0); fs.closeSync(fd);
    return { url, ms: Math.round(h.readUInt32LE(40) / (h.readUInt32LE(24) * 2 / 1000)) };
  }
  /** Gera (ou reaproveita) o áudio. Resolve {url, ms} ou null.
   *  tipo: 'jornalistaF' | 'jornalistaM' | 'locutor' | nome de uma voz do Gemini. prioridade: 'alta' | 'baixa'. */
  sintetizar(texto, tipo, prioridade = 'alta', temporario = false, opcoes = {}) {
    texto = String(texto || '').trim();
    const el = this.eleven(tipo);
    if (!(this.ativa || el) || !texto) return Promise.resolve(null);
    const pr = this.pronto(texto, tipo, temporario); if (pr) return Promise.resolve(pr);
    if (!el && this.semCota()) return Promise.resolve(null); // cota esgotada: falha na hora, sem atrasar o jogo
    const { v, dir, hash, arq, url } = this.arquivo(texto, tipo, temporario);
    const existente = this.trabalhos.get(hash);
    if (existente) { // promove para uma fila mais prioritária se for preciso antes
      const ordem = { alta: 0, media: 1, baixa: 2 };
      if (ordem[prioridade] < ordem[existente.prioridade] && this.filas[existente.prioridade].includes(existente)) {
        const f = this.filas[existente.prioridade]; f.splice(f.indexOf(existente), 1);
        if (prioridade === 'alta') this.filas.alta.unshift(existente); else this.filas[prioridade].push(existente);
        existente.prioridade = prioridade;
      }
      return existente.promessa;
    }
    const t = { texto, v, dir: opcoes.dir || dir, arq, url, prioridade, takes: tipo === 'locutor' ? 3 : 1, conferir: opcoes.conferir !== false, el: el ? tipo : null, temporario }; t.promessa = new Promise(r => { t.resolver = r; });
    this.trabalhos.set(hash, t); this.filas[prioridade].push(t); this.bombear();
    t.promessa.finally(() => this.trabalhos.delete(hash));
    return t.promessa;
  }
  bombear() {
    // até 8 pedidos simultâneos; a pré-geração geral (baixa) usa no máximo 1, deixando vaga para a partida
    while (this.ativos < this.max) {
      let t = this.filas.alta.shift() || this.filas.media.shift();
      // pré-geração só roda com folga de cota (2+ modelos disponíveis), senão a cota fica para as partidas
      const livres = MODELOS.filter(m => (this.esfria[m] || 0) <= Date.now()).length;
      if (!t && this.ativosBaixa < 1 && (livres >= 2 || this.filas.baixa[0]?.el)) { t = this.filas.baixa.shift(); if (t) t.eBaixa = true; }
      if (!t && this.filas.baixa.length && livres < 2 && !this.reBombear) { this.reBombear = setTimeout(() => { this.reBombear = null; this.bombear(); }, 300000); }
      if (!t) return;
      this.ativos++; if (t.eBaixa) this.ativosBaixa++;
      // (sem reserva no Gemini trecho a trecho: misturaria duas vozes na mesma fala)
      this.melhorTake(t).then(r => {
        if (!r) return t.resolver(null);
        fs.writeFileSync(t.arq, wav(r.pcm, r.taxa)); t.resolver({ url: t.url, ms: Math.round(r.pcm.length / (r.taxa * 2 / 1000)) });
      }).catch(e => { console.error('[dublagem]', e.message); t.resolver(null); })
        .finally(() => { this.ativos--; if (t.eBaixa) this.ativosBaixa--; this.bombear(); });
    }
  }
  /** Gera 1 take (ou vários, para o locutor) e fica com o mais enérgico. */
  async melhorTake(t) {
    if (t.el) {
      if (t.texto.length > CURTO || !this.chave) return this.pedirEleven(t.texto, t.v);
      for (let k = 0; k < 3; k++) { const r = await this.pedirEleven(t.texto, t.v); if (!r || await this.conferir(r.pcm, r.taxa, t.texto)) return r; }
      return null;
    }
    if (t.takes <= 1) return this.pedir(t.texto, t.v, t.dir, t.conferir);
    const takes = (await Promise.all(Array.from({ length: t.takes }, () => this.pedir(t.texto, t.v, t.dir, t.conferir)))).filter(Boolean);
    if (!takes.length) return null;
    const energia = ({ pcm }) => { // volume médio dos trechos com voz (mais alto e sustentado = mais empolgado)
      let soma = 0, n = 0;
      for (let i = 0; i + 960 <= pcm.length; i += 960) { let s = 0; for (let k = i; k < i + 960; k += 2) { const x = pcm.readInt16LE(k) / 32768; s += x * x; } const r = Math.sqrt(s / 480); if (r > .03) { soma += r; n++; } }
      return n ? soma / n : 0;
    };
    return takes.sort((a, b) => energia(b) - energia(a))[0];
  }
  /** Confere o áudio: transcreve com um modelo de texto e compara com o texto esperado.
   *  Reprova se faltarem palavras ou se houver fala a mais (ex.: o modelo leu a direção de voz). */
  async conferir(pcm, taxa, texto) {
    const palavras = s => norm(s).match(/[a-z0-9]+/g) || [];
    // nome curto: o "lite" erra muito em áudio de meio segundo ("Ana" -> "Lona", "Manaus"), então o maior ouve primeiro
    for (const modelo of texto.length <= CURTO ? [...MODELO_CONFERE].reverse() : MODELO_CONFERE) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.chave },
          body: JSON.stringify({
            contents: [{ parts: [{ inlineData: { mimeType: 'audio/wav', data: wav(pcm, taxa).toString('base64') } }, { text: 'Transcreva literalmente, em português, tudo o que é falado neste áudio. Responda apenas com a transcrição.' }] }],
            generationConfig: { temperature: 0 },
          }),
        });
        if (!r.ok) continue;
        const j = await r.json();
        const ouvido = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(' ');
        if (!ouvido.trim()) continue;
        const esp = palavras(texto), ouv = palavras(ouvido), sE = new Set(esp), sO = new Set(ouv);
        const acerto = esp.filter(w => sO.has(w)).length / Math.max(1, esp.length);
        const extras = ouv.filter(w => !sE.has(w)).length;
        const curto = esp.length <= 4; // nome: grafia do sobrenome pode variar, mas palavra a mais não
        // nome curto: a transcrição erra a grafia/separação ("da Viluz", "Vana"): vale também a semelhança das letras juntas
        const jE = esp.join(''), jO = ouv.join(''), parecido = jO.length <= jE.length + 1 && 1 - distancia(jE, jO) / Math.max(jE.length, jO.length) >= .6;
        const ok = curto ? acerto >= .5 && extras <= 1 || parecido : acerto >= .7 && extras <= Math.max(3, esp.length * .25);
        if (!ok) console.error(`[dublagem] conferência reprovou (será gerado de novo): "${ouvido.slice(0, 90)}"`);
        return ok;
      } catch { /* tenta o próximo modelo */ }
    }
    return true; // conferência indisponível: vale a checagem de duração
  }
  /** ElevenLabs (PCM 24 kHz mono). Erro de cota/chave pausa o ElevenLabs por um tempo e o Gemini assume. */
  async pedirEleven(texto, vozId) {
    // o plano limita pedidos simultâneos: no máximo 2 por vez, e "concurrent_limit" tenta de novo (até 6x)
    this.elAtivos ??= 0; this.elFila ??= [];
    if (this.elAtivos >= 2) await new Promise(r => this.elFila.push(r));
    this.elAtivos++;
    try {
      for (let k = 0; k < 6; k++) {
        const r = await this.pedirEleven1(texto, vozId, k);
        if (r !== 'repetir') return r;
        await new Promise(r => setTimeout(r, 800 + k * 700));
      }
      return null;
    } finally { this.elAtivos--; this.elFila.shift()?.(); }
  }
  /** Efeito sonoro de emote/dança (ElevenLabs Sound Effects), gerado uma vez e guardado em dados/audio/sfx.
   *  Devolve o caminho do .mp3 ou null (sem chave/erro: o navegador usa o som sintetizado). */
  async somItem(id, prompt, seg) {
    const pasta = path.join(this.pasta, 'sfx'), hash = crypto.createHash('sha1').update('sfx1|' + seg + '|' + prompt).digest('hex').slice(0, 12);
    const arq = path.join(pasta, `${id}-${hash}.mp3`);
    if (fs.existsSync(arq)) return arq;
    if (!this.chaveEL || this.esfriaEL > Date.now() || this.semSomEL) return null;
    this.gerandoSom ??= new Map();
    if (!this.gerandoSom.has(arq)) this.gerandoSom.set(arq, (async () => {
      try {
        const r = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
          method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json', 'xi-api-key': this.chaveEL },
          body: JSON.stringify({ text: prompt, duration_seconds: seg, prompt_influence: 0.5 }),
        });
        if (!r.ok) {
          const msg = await r.text().catch(() => '');
          if (r.status === 401 && /sound_generation/.test(msg)) { if (!this.semSomEL) console.error('[sfx] A chave do ElevenLabs não tem a permissão "Sound Effects" (sound_generation): emotes usam o som sintetizado.'); this.semSomEL = true; }
          else { console.error(`[sfx] ElevenLabs ${r.status}: ${msg.slice(0, 160)}`); if ([401, 402].includes(r.status)) this.esfriaEL = Date.now() + 1800000; }
          return null;
        }
        const b = Buffer.from(await r.arrayBuffer()); if (b.length < 1000) return null;
        fs.mkdirSync(pasta, { recursive: true }); fs.writeFileSync(arq, b); return arq;
      } catch (e) { console.error('[sfx] ElevenLabs:', e.message); return null; }
      finally { setTimeout(() => this.gerandoSom.delete(arq), 60000); }
    })());
    return this.gerandoSom.get(arq);
  }
  async pedirEleven1(texto, vozId, tent = 0) {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
    try {
      const curto = texto.length <= CURTO;
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vozId}${curto ? '/with-timestamps' : ''}?output_format=pcm_24000`, {
        method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', 'xi-api-key': this.chaveEL },
        body: JSON.stringify({ text: texto, model_id: EL_MODELO, voice_settings: EL_AJUSTE,
          // next_text começa por consoante e depois de uma pausa: com "é ..." o modelo emendava a vogal e o take vinha cortado no meio dela
          // nome (termina em vírgula): contexto de enumeração, para sair com entonação suspensa (de continuação), não de ponto final
          ...(curto ? /,$/.test(texto) ? { previous_text: 'Então, vamos lá! Nesta noite, frente a frente, estão:', next_text: 'Pedro Souza, Carla Lima, e Paulo Torres.' }
            : { previous_text: 'Boa noite, Brasil! Agora, com a palavra, o candidato', next_text: 'Você tem sessenta segundos para a sua resposta.' } : {}) }),
      });
      if (!r.ok) {
        const msg = (await r.text().catch(() => '')).slice(0, 160);
        if (r.status === 429 && /concurrent/i.test(msg) || r.status >= 500) return 'repetir';
        // só cota/chave (401/402/429) pausa o ElevenLabs; aí a mediação inteira passa para o Gemini até voltar
        if ([401, 402, 429].includes(r.status)) this.esfriaEL = Date.now() + (r.status === 429 && !/quota/i.test(msg) ? 60000 : 1800000);
        console.error(`[dublagem] ElevenLabs ${r.status}: ${msg}`); return null;
      }
      if (curto) { // nome: corta pelo alinhamento, no ponto em que a voz já morreu (nunca no meio de um som)
        const j = await r.json(), b = Buffer.from(j.audio_base64 || '', 'base64');
        const pcm = b.subarray(0, b.length & ~1);
        if (pcm.length < 2000) return null;
        const c = cortarCurto(pcm, j.alignment);
        if (!c.limpo && tent < 2) return 'repetir'; // o take acabou com a voz ainda soando: gera outro
        // nome com vírgula: +120 ms de silêncio = a pausa natural da vírgula antes do próximo trecho (sem isso soa "colado")
        const pausa = Buffer.alloc(/,$/.test(texto) ? 5760 : 0);
        return { pcm: Buffer.concat([aparar(c.pcm, 0.04), pausa]), taxa: 24000 };
      }
      const b = Buffer.from(await r.arrayBuffer()), pcm = b.subarray(0, b.length & ~1);
      return pcm.length < 2000 ? null : { pcm: aparar(pcm), taxa: 24000 };
    } catch (e) { if (e.name !== 'AbortError') console.error('[dublagem] ElevenLabs:', e.message); return null; }
    finally { clearTimeout(to); }
  }
  async pedir(texto, v, dir, conferir = true) {
    // duração máxima aceitável: fala normal tem ~15 caracteres por segundo; muito acima disso
    // significa que o modelo falou algo a mais, então o áudio é descartado
    const maxMs = texto.length * 105 + 2500;
    // percorre os modelos na ordem de preferência, até 2 rodadas (um take reprovado pode dar certo na segunda)
    for (let tent = 0; tent < MODELOS.length * 2; tent++) {
      const modelo = MODELOS[tent % MODELOS.length];
      if ((this.esfria[modelo] || 0) > Date.now()) continue;
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 25000);
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST', signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.chave },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `# DIREÇÃO DE VOZ (não leia esta parte)\n${dir}\n\n#### TRANSCRIPT\n${texto}` }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: v } } } },
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.status === 429 || r.status === 503) {
          const det = j.error?.details || [];
          const diario = det.some(d => (d.violations || []).some(v => /PerDay/i.test(v.quotaId || '')));
          const espera = parseFloat(det.find(d => d.retryDelay)?.retryDelay) || 60;
          // limite diário: pausa até 1 h (re-testa depois); limite por minuto: pausa curta
          this.esfria[modelo] = Date.now() + (r.status === 503 ? 15000 : diario ? Math.min(3600, espera) * 1000 : Math.min(120, Math.max(espera, 15)) * 1000);
          if (diario) console.error(`[dublagem] ${modelo}: limite diário do modelo atingido; usando os outros modelos`);
          if (diario && MODELOS.every(m => (this.esfria[m] || 0) > Date.now() + 60000) && !this.avisouCota) {
            this.avisouCota = true;
            console.log(`   Dublagem: limite diário de vozes do Gemini esgotado em todos os modelos (volta em ~${Math.round(espera / 3600)} h). Até lá, voz do navegador.`);
            console.log('   Dá para pedir limites maiores no Google AI Studio (aba de cotas/limites da chave).');
          }
          continue;
        }
        if (!r.ok) { console.error(`[dublagem] ${modelo}: ${r.status} ${j.error?.message?.slice(0, 120) || ''}`); this.esfria[modelo] = Date.now() + 300000; continue; }
        if (this.avisouCota) { this.avisouCota = false; console.log('   Dublagem: vozes do Gemini liberadas novamente.'); }
        const dados = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        if (!dados) continue;
        const { pcm, taxa } = extrairPCM(Buffer.from(dados, 'base64'));
        if (pcm.length < 2000) continue;
        const limpo = aparar(pcm);
        if (limpo.length / (taxa * 2 / 1000) > maxMs) { console.error(`[dublagem] ${modelo}: áudio longo demais para o texto, descartado`); continue; }
        // trechos de 1-2 palavras (nomes) não passam pela conferência: a transcrição de uma palavra solta erra muito
        if (conferir && texto.split(/\s+/).length > 2 && !(await this.conferir(limpo, taxa, texto))) continue;
        return { pcm: limpo, taxa };
      } catch (e) { if (e.name !== 'AbortError') console.error(`[dublagem] ${modelo}: ${e.message}`); }
      finally { clearTimeout(to); }
    }
    return null;
  }
}
