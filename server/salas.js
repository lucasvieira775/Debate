import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  PARTIDO, PARTIDOS, AV, SEGUNDOS, DUR_MULT, TEMA, analisar, aplicar, apurar, novoStats, perf, percebida,
  rotuloPos, sortearTema, shuffle, pick, avatarAleatorio, generoDe, DIFICULDADES, JORNALISTAS, alvosValidos,
} from '../shared/regras.js';
const PULPITO_MS = 10000; // a produção leva ~8 s empurrando o púlpito do confronto até o centro (cliente: PULP_EMPURRA)
const CAMINHADA_MS = 5500; // tempo da caminhada automática até o púlpito central (e de volta); o cliente anima em até 5 s
import { gerarFala, nomeIA } from '../shared/ia.js';
import { Dublagem, VOZES_IA, DIR_PLATEIA } from './voz.js';
import { N, trechosFixos, trechosTemas, sortearVariacao } from './narracao.js';
import { moderar, GRITOS, PUNICAO } from '../shared/moderacao.js';
import { Contas, ECONOMIA } from './contas.js';
import { Pagamentos } from './pagamentos.js';
import { PACOTES_MOEDAS } from '../shared/loja.js';
import { gerarDica } from './dicas.js';
import { ITEM, ROUPA_ITEM } from '../shared/loja.js';
import { postsDaFala, postsDe } from '../shared/xzona.js';
const VOZES_GRITO = ['Fenrir', 'Leda']; // um homem e uma mulher gritando na plateia
// "coro" da plateia: várias vozes tocadas juntas, com pequenas diferenças, soam como uma multidão
const CORO = { vaia: ['Buuuuuuuuu!', 'Uuuuuuuuuh!', 'Fooora!'], vibra: ['Uhuuuuuuu!', 'Éééééééé!', 'Isso aíííí!'], duelo: ['Isso é fake news!', 'Vagabundo!', 'Mentiroso!'] }; // duelo: torcida rival no fim de cada resposta do 1x1
const VOZES_CORO = ['Fenrir', 'Leda', 'Charon', 'Kore', 'Puck', 'Aoede'];
const OPC_PLATEIA = { conferir: false, dir: DIR_PLATEIA };

const MAX = 5, MIN = 2;
const BOAS_VINDAS = 'Bem-vindo ao Debate Presidencial!';
const REACOES = ['aplauso', 'vaia', 'risada', 'pensativo', 'mao'];
const dur = txt => Math.round(txt.length * 62 + 900); // estimativa do tempo de fala da mediadora
const gerarCodigo = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');
const uid = () => crypto.randomBytes(8).toString('hex');

function limparAvatar(a, tem = () => false) { // tem(itemId): a conta possui o item (trajes da loja)
  const base = avatarAleatorio(); if (!a || typeof a !== 'object') return base;
  if (ROUPA_ITEM[a.roupa] && !tem(ROUPA_ITEM[a.roupa])) a = { ...a, roupa: base.roupa };
  const ok = (v, lista) => (lista.includes(v) ? v : undefined);
  const cor = v => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
  return {
    genero: ok(a.genero, Object.keys(AV.generos)) ?? generoDe(a),
    pele: cor(a.pele) ?? base.pele, cabelo: ok(a.cabelo, Object.keys(AV.cabelos)) ?? base.cabelo, corCabelo: cor(a.corCabelo) ?? base.corCabelo,
    barba: ok(a.barba, Object.keys(AV.barbas)) ?? 'nenhuma', oculos: ok(a.oculos, Object.keys(AV.oculos)) ?? 'nenhum',
    chapeu: ok(a.chapeu, Object.keys(AV.chapeus)) ?? 'nenhum', roupa: ok(a.roupa, Object.keys(AV.roupas)) ?? base.roupa,
    corRoupa: cor(a.corRoupa) ?? base.corRoupa, corCamisa: cor(a.corCamisa) ?? base.corCamisa, corGravata: cor(a.corGravata) ?? base.corGravata,
    brinco: !!a.brinco, broche: !!a.broche, extra: ok(a.extra, Object.keys(AV.extras)) ?? 'nenhum', corpo: ok(a.corpo, ['magro', 'medio', 'largo']) ?? 'medio',
    expressao: ok(a.expressao, ['simpatico', 'serio', 'confiante', 'bravo']) ?? 'simpatico',
  };
}
/** Quadros da apuração ao vivo (QUADROS+1 momentos, 0% a 100% das urnas). A disputa entre os dois primeiros segue
 *  um roteiro de viradas: disputa apertada → ~3 trocas de liderança; vantagem clara → 0–1; lavada → nenhuma. */
const QUADROS = 60, APURACAO_MS = 30000;
const REVELA_TELAO_MS = 3500; // = REVELACAO.telao (public/js/main.js): a(o) jornalista diz o nome quando o telão acende
function quadrosApuracao(res) {
  const finais = res.map(x => x.pct), N = QUADROS;
  const D = finais.length > 1 ? finais[0] - finais[1] : 0; // vantagem final do vencedor
  const viradas = finais.length < 2 ? 0 : pick(D < 5 ? [2, 3, 3, 3, 4] : D < 9 ? [1, 2, 2, 3] : D < 15 ? [0, 1, 1, 2] : D < 25 ? [0, 0, 1] : [0]);
  // pontos de controle da diferença 1º−2º: alternam de sinal e terminam em D (trocas entre 20% e 92% do tempo)
  const ctrl = [[0, 0]];
  for (let j = 0; j <= viradas; j++) {
    const lider = (viradas - j) % 2 ? -1 : 1, t = .14 + (j + .5) / (viradas + 1) * .74 + (Math.random() - .5) * .04;
    ctrl.push([t, lider * (Math.max(D, 2.5) * (j === viradas ? 1.2 : .7) + 1.5 + Math.random() * 3.5 * (1 - t))]);
  }
  ctrl.push([1, D]);
  const dif = t => { let k = 0; while (k < ctrl.length - 2 && ctrl[k + 1][0] < t) k++; const [t0, a] = ctrl[k], [t1, b] = ctrl[k + 1], f = (t - t0) / Math.max(1e-6, t1 - t0); return a + (b - a) * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, f)))) / 2; };
  const desvio = finais.map(() => (Math.random() - .5) * 6);
  const quadros = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N, peso = Math.pow(1 - t, 1.1);
    let v = finais.map((f, i) => Math.max(.5, f + (i > 1 ? desvio[i] * peso + (Math.random() - .5) * peso : 0)));
    if (finais.length > 1) { const soma = finais[0] + finais[1] + (desvio[0] + desvio[1]) * peso * .3, d = dif(t); v[0] = Math.max(.5, (soma + d) / 2); v[1] = Math.max(.5, (soma - d) / 2); }
    const s = v.reduce((a, b) => a + b, 0); v = v.map(x => Math.round(x / s * 10000) / 100);
    quadros.push({ urnas: Math.round(t * 1000) / 10, pct: v });
  }
  quadros[N] = { urnas: 100, pct: finais.map(x => Math.round(x * 100) / 100) };
  return { ids: res.map(x => x.id), quadros };
}
function limparNome(n) { return String(n || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30) || 'Candidato'; }

class Sala {
  constructor(mgr, code, publica) {
    this.mgr = mgr; this.io = mgr.io; this.code = code; this.publica = publica;
    this.jog = []; this.hostId = null; this.fase = 'lobby';
    this.cfg = { dur: 'normal', permitirTexto: true, reacoes: true };
    this.timers = new Set(); this.vazioDesde = null;
    this.reset();
  }
  reset() {
    this.limpar();
    Object.assign(this, { fila: [], i: -1, passo: null, fala: null, temaAtual: null, roleta: null, usados: new Set(), resultado: null, autoEm: null, textoJ: '', narr: null, perguntas: [], duelo: null });
  }
  // ---------- jornalista e dublagem ----------
  /** Faz o(a) jornalista falar. Os trechos viram áudio do Gemini (ou voz do navegador se não der tempo).
   *  depois(ms) é chamado com a duração real da fala, se esta ainda for a fala atual. */
  narrar(partes, depois) {
    partes = partes.filter(Boolean);
    const id = this.narrId = (this.narrId || 0) + 1, dub = this.mgr.dub;
    // legenda: "Nome," seguido de frase com maiúscula vira "Nome."
    const texto = partes.map((p, i) => (p.endsWith(',') && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(partes[i + 1] || '.') ? p.slice(0, -1) + '.' : p)).join(' ');
    this.textoJ = texto;
    const fim = ms => { if (this.narr?.id === id && depois) depois(ms); };
    if (!dub.ativa || !this.jorn) { this.narr = { id, status: 'off' }; setImmediate(() => fim(dur(texto))); return; }
    // Narração progressiva: começa a tocar logo (no máximo ~1,5 s de espera) com os trechos que já estão prontos;
    // os que ainda estão sendo gerados chegam depois, cada um com sua atualização. O navegador só usa a voz
    // sintetizada num trecho específico se ele demorar demais (e nomes que não ficarem prontos são pulados).
    const voz = this.jorn.voz;
    const itens = partes.map(t => ({ t, url: null, ms: 0 }));
    const publico = () => itens.map(i => ({ t: i.t, url: i.url }));
    this.narr = { id, status: 'gerando' };
    let iniciou = false;
    const iniciar = () => {
      if (iniciou) return; iniciou = true; clearTimeout(limite);
      if (this.narr?.id !== id) return;
      this.narr = { id, status: 'parcial', itens: publico() };
      this.emit();
      const faltando = itens.filter(i => !i.url && !i.t.endsWith(','));
      if (faltando.length) console.error('[dublagem] ainda gerando ao começar a fala:', faltando.map(i => i.t).join(' | ').slice(0, 120));
      fim(itens.reduce((a, i) => a + (i.url ? i.ms + 60 : i.t.endsWith(',') ? 0 : dur(i.t)), 0));
    };
    const limite = setTimeout(iniciar, 1500);
    Promise.all(partes.map((p, k) => dub.sintetizar(p, voz, 'alta').then(r => {
      if (r) { itens[k].url = r.url; itens[k].ms = r.ms; }
      if (iniciou && r && this.narr?.id === id) { this.narr = { id, status: 'parcial', itens: publico() }; this.emit(); } // trecho chegou depois
      return r;
    }))).then(iniciar);
  }
  /** Gera com antecedência (baixa prioridade) trechos que serão falados depois. */
  antecipar(partes, voz = this.jorn?.voz) { if (voz) for (const p of partes.filter(Boolean)) this.mgr.dub.sintetizar(p, voz, 'media'); }
  partesFala(p) {
    const nm = id => this.porId(id)?.nome || '', t = p.tema && TEMA[p.tema], s = p.segundos, v = p.var || { v: 0, cob: -1 };
    switch (p.kind) {
      case 'proposta': return N.proposta(nm(p.falante), t, s, v.v, v.cob);
      case 'pergunta': return N.pergunta(nm(p.falante), nm(p.alvo), t, s, v.v);
      case 'resposta': return N.resposta(nm(p.falante), s, v.v);
      case 'replica': return N.replica(nm(p.falante), s);
      case 'treplica': return N.treplica(nm(p.falante), s);
      case 'final': return N.final(nm(p.falante), s, v.v);
    }
    return [];
  }
  later(ms, fn) { const t = setTimeout(() => { this.timers.delete(t); try { fn(); } catch (e) { console.error(e); } }, ms); this.timers.add(t); return t; }
  limpar() { for (const t of this.timers || []) clearTimeout(t); this.timers?.clear(); }
  // this.jog = candidatos (a mediação é sempre um(a) jornalista da IA)
  porId(id) { return this.jog.find(j => j.id === id) || null; }
  conectados() { return this.jog.filter(j => j.conectado); }
  humanos() { return this.jog.filter(j => j.conectado && !j.bot); }
  /** Quem pode transmitir voz agora: antes/depois do debate todos; durante, só o candidato da vez. */
  microfones() {
    if (this.fase !== 'debate') return 'todos';
    const ids = [];
    if (this.passo && (this.passo.tipo === 'fala' || this.passo.tipo === 'escolha') && !this.porId(this.passo.falante)?.banido) ids.push(this.passo.falante);
    return ids;
  }
  conta(j) { return j?.uid ? this.mgr.contas.conta(j.uid, j.nome) : null; }
  enviarConta(j) { const c = this.conta(j); const s = this.socketDe(j?.id); if (c && s) s.emit('conta', this.mgr.contas.publico(c)); }
  socketDe(id) { const j = this.porId(id); return j && j.socketId ? this.io.sockets.sockets.get(j.socketId) : null; }

  snapshot() {
    const p = this.passo;
    return {
      code: this.code, publica: this.publica, hostId: this.hostId, fase: this.fase, cfg: this.cfg, agora: Date.now(),
      jogadores: this.jog.map(j => ({ id: j.id, nome: j.nome, avatar: j.avatar, partido: j.partido, pronto: j.pronto, conectado: j.conectado, slot: j.slot, bot: !!j.bot, dif: j.dif,
        banido: !!j.banido, adv: j.advertencias || 0, nota: this.fase !== 'lobby' && j.st.nFalas ? perf(j.st) : null, fanpage: j.bot ? null : this.mgr.contas.resumoFanpage(this.conta(j)) })),
      i: this.i, total: this.fila.length,
      passo: p && { tipo: p.tipo, etapa: p.etapa, kind: p.kind, falante: p.falante, alvo: p.alvo, tema: p.tema, segundos: p.segundos, titulo: p.titulo, poll: p.poll, escolhido: p.escolhido,
        elegiveis: p.tipo === 'escolha' && !p.escolhido ? this.elegiveis(p) : undefined },
      duelo: this.duelo && { a: this.duelo.a, b: this.duelo.b, fase: this.duelo.fase },
      fala: this.fala, temaAtual: this.temaAtual, roleta: this.roleta, autoEm: this.autoEm, textoJ: this.textoJ, narr: this.narr, perguntas: this.perguntas,
      jorn: this.jorn && { nome: this.jorn.nome, genero: this.jorn.genero, avatar: this.jorn.avatar },
      microfones: this.microfones(),
      resultado: this.resultado,
    };
  }
  emit() { this.io.to(this.code).emit('estado', this.snapshot()); }

  // ---------- jogadores ----------
  adicionar(socket, perfil) {
    if (this.fase !== 'lobby') return 'A partida já começou nesta sala.';
    if (this.jog.length >= MAX) return 'A sala está cheia (máximo 5 candidatos).';
    const conta = this.mgr.contas.conta(perfil?.uid);
    if (!conta?.cadastro) return 'Faça seu cadastro antes de jogar.';
    if (conta.banPerm) return 'Sua conta foi banida permanentemente (3 suspensões de 30 dias por desrespeito às regras do debate).';
    if (this.mgr.contas.banido(conta)) return `Sua conta está suspensa pela moderação até ${new Date(conta.banidoAte).toLocaleString('pt-BR')}.`;
    let nome = limparNome(conta.cadastro.nome); const base = nome; let n = 2;
    while (this.jog.some(j => j.nome.toLowerCase() === nome.toLowerCase())) nome = `${base} ${n++}`;
    let partido = PARTIDO[perfil?.partido] ? perfil.partido : null;
    if (!partido || this.jog.some(j => j.partido === partido)) {
      const ideo = partido ? PARTIDO[partido].ideo : null;
      const livres = PARTIDOS.filter(pp => !this.jog.some(j => j.partido === pp.sigla));
      partido = (livres.find(pp => pp.ideo === ideo) || pick(livres)).sigla;
    }
    const usados = new Set(this.jog.map(j => j.slot)); let slot = 0; while (usados.has(slot)) slot++;
    const j = { id: uid(), token: uid(), socketId: socket.id, nome, avatar: limparAvatar(perfil?.avatar, id => this.mgr.contas.tem(conta, id)), partido, pronto: false, conectado: true, slot, olhar: { y: 0, p: 0 }, st: novoStats(), uid: conta?.uid };
    this.jog.push(j);
    if (!this.hostId) this.hostId = j.id;
    this.vincular(socket, j);
    this.anteciparNome(nome);
    this.emit(); this.enviarConta(j);
    return j;
  }
  adicionarBot(dif = 'medio') {
    if (this.fase !== 'lobby') return 'A partida já começou.';
    if (this.jog.length >= MAX) return 'A sala está cheia (máximo 5 candidatos).';
    const avatar = avatarAleatorio();
    const nome = nomeIA(avatar.genero, new Set(this.jog.map(j => j.nome.toLowerCase())));
    // prefere um espectro político que ainda não está na sala
    const livres = PARTIDOS.filter(pp => !this.jog.some(j => j.partido === pp.sigla));
    const ideosUsadas = new Set(this.jog.map(j => PARTIDO[j.partido]?.ideo));
    const partido = (shuffle(livres.slice()).find(pp => !ideosUsadas.has(pp.ideo)) || pick(livres)).sigla;
    const usados = new Set(this.jog.map(j => j.slot)); let slot = 0; while (usados.has(slot)) slot++;
    // voz realista do Gemini de acordo com o sexo do avatar (sem repetir voz de outro candidato da IA)
    const vozesUsadas = new Set(this.jog.map(x => x.voz));
    const opcoes = VOZES_IA[avatar.genero] || VOZES_IA.masculino;
    const voz = pick(opcoes.filter(v => !vozesUsadas.has(v)).length ? opcoes.filter(v => !vozesUsadas.has(v)) : opcoes);
    const j = { id: uid(), token: null, socketId: null, nome, avatar, partido, pronto: true, conectado: true, slot, olhar: { y: 0, p: 0 }, st: novoStats(), bot: true, dif: DIFICULDADES[dif] ? dif : 'medio', voz };
    this.jog.push(j); this.emit(); this.anteciparNome(nome); return j;
  }
  // a voz do nome é gerada assim que o jogador entra na sala (nas duas vozes de jornalista), para estar pronta na partida
  anteciparNome(nome) { for (const jn of JORNALISTAS) this.mgr.dub.sintetizar(`${nome},`, jn.voz, 'media'); }
  vincular(socket, j) {
    j.socketId = socket.id; j.conectado = true; this.vazioDesde = null;
    socket.data.code = this.code; socket.data.pid = j.id;
    socket.join(this.code);
    socket.emit('voce', { id: j.id, token: j.token, code: this.code });
  }
  remover(id) {
    const j = this.porId(id); if (!j) return;
    if (this.fase === 'lobby') this.jog = this.jog.filter(x => x.id !== id);
    else { j.conectado = false; j.socketId = null; this.aoDesconectarEmJogo(j); }
    if (this.hostId === id || !this.porId(this.hostId)?.conectado) this.hostId = this.humanos()[0]?.id || null;
    if (!this.humanos().length) this.vazioDesde = Date.now();
    this.emit();
  }
  desconectou(socket) {
    const j = this.porId(socket.data.pid); if (!j || j.socketId !== socket.id) return;
    j.conectado = false; j.socketId = null;
    if (this.fase === 'lobby') {
      // dá alguns segundos para recarregar a página sem perder o lugar
      this.later(15000, () => { if (!j.conectado && this.fase === 'lobby') this.remover(j.id); });
      if (this.hostId === j.id) this.hostId = this.humanos()[0]?.id || this.hostId;
      if (!this.humanos().length) this.vazioDesde = Date.now();
      this.emit();
    } else this.remover(j.id);
  }
  aoDesconectarEmJogo(j) {
    const p = this.passo; if (!p || p.falante !== j.id) return;
    if (p.tipo === 'fala' && this.fala && this.fala.status !== 'avaliado') this.later(1500, () => this.finalizar(this.fala?.texto || ''));
    if (p.tipo === 'escolha' && !p.escolhido) this.later(1500, () => this.escolherAleatorio());
  }
  atualizarPerfil(j, perfil) {
    if (this.fase !== 'lobby') return;
    const cad = j.uid && this.mgr.contas.contas[j.uid]?.cadastro; // nome vem do cadastro, não do cliente
    if (cad) {
      const nome = limparNome(cad.nome);
      if (!this.jog.some(x => x !== j && x.nome.toLowerCase() === nome.toLowerCase())) { if (j.nome !== nome) this.anteciparNome(nome); j.nome = nome; }
    }
    if (perfil.avatar) j.avatar = limparAvatar(perfil.avatar, id => this.mgr.contas.tem(this.conta(j), id));
    if (perfil.partido && PARTIDO[perfil.partido]) {
      if (this.jog.some(x => x !== j && x.partido === perfil.partido)) return 'Este partido já foi escolhido por outro candidato na sala.';
      j.partido = perfil.partido;
    }
    this.emit();
  }

  // ---------- partida ----------
  iniciar() {
    const ativos = this.conectados();
    if (ativos.length < MIN) return 'São necessários pelo menos 2 candidatos.';
    if (ativos.some(j => j.id !== this.hostId && !j.pronto)) return 'Todos os candidatos precisam estar prontos.';
    this.jog = this.jog.filter(j => j.conectado);
    this.reset();
    this.jog.forEach(j => { j.st = novoStats(); j.banido = false; j.motivoBan = null; j.dicasUsadas = 0; j.advertencias = 0; });
    this.abst = .18 + Math.random() * .04;
    const ids = this.jog.slice().sort((a, b) => a.slot - b.slot).map(j => j.id);
    const nome = id => this.porId(id).nome;
    // mediação: um(a) jornalista da IA sorteado(a)
    this.jorn = pick(JORNALISTAS);
    const f = [];
    f.push({ tipo: 'intro', etapa: 1, partes: N.intro(this.jorn, ids.map(nome)) });
    ids.forEach(id => f.push({ tipo: 'fala', etapa: 1, kind: 'proposta', falante: id, tema: sortearTema(this.usados), var: sortearVariacao() }));
    // (sem pesquisas entre os blocos: a intenção de voto só aparece na apuração ao vivo, no fim)
    f.push({ tipo: 'intro', etapa: 2, partes: N.bloco2() });
    ids.forEach(id => f.push({ tipo: 'escolha', etapa: 2, falante: id }));
    f.push({ tipo: 'intro', etapa: 3, partes: N.bloco3() });
    shuffle(ids.slice()).forEach(id => f.push({ tipo: 'fala', etapa: 3, kind: 'final', falante: id, var: sortearVariacao() }));
    f.forEach(p => { if (p.tipo === 'fala') p.segundos = this.seg(p.kind); });
    this.fila = f; this.fase = 'debate';
    this.irPara(0);
    // antecipa a dublagem das próximas falas (temas já sorteados, nomes, chamadas)
    for (const p of f) {
      if (p.tipo === 'fala') { if (p.etapa === 1) this.antecipar(N.roleta(nome(p.falante))); this.antecipar(this.partesFala(p)); this.escreverFalaBot(p); }
      if (p.tipo === 'escolha') this.antecipar(N.escolha(nome(p.falante)));
      if (p.partes) this.antecipar(p.partes);
    }
  }
  seg(kind) { return Math.round(SEGUNDOS[kind] * DUR_MULT[this.cfg.dur]); }
  auto(ms) { this.autoEm = Date.now() + ms; this.later(ms, () => this.proximo()); }
  irPara(i) {
    this.limpar();
    this.i = i; const p = this.passo = this.fila[i];
    this.fala = null; this.roleta = null; this.autoEm = null;
    const nome = id => this.porId(id)?.nome || '';
    if (p.tipo === 'intro') { this.temaAtual = null; this.narrar(p.partes, ms => this.auto(Math.max(ms + 1200, p.etapa === 2 ? PULPITO_MS : 0))); } // bloco 2: dá tempo da produção trazer o púlpito
    else if (p.tipo === 'pesquisa') {
      this.temaAtual = null; p.poll = apurar(this.emAtivo(), .25, false, this.abst).res;
      this.narrar(N.pesquisa(), ms => this.auto(Math.max(10000, ms + 5000)));
    } else if (p.tipo === 'escolha') {
      this.temaAtual = null;
      const j = this.porId(p.falante);
      if (j?.bot) { this.autoEm = null; this.narrar(N.escolha(nome(p.falante)), ms => this.later(ms + 700, () => { this.escolher(j.id, this.alvoBot(j)); this.escolherAleatorio(); })); }
      else {
        this.narrar(N.escolha(nome(p.falante)));
        this.autoEm = Date.now() + (j?.conectado ? 30000 : 2500);
        this.later(this.autoEm - Date.now(), () => this.escolherAleatorio());
      }
    } else if (p.tipo === 'fala') {
      if (p.etapa === 1) {
        this.temaAtual = null;
        this.roleta = { ate: Date.now() + 2400 };
        // a roleta gira pelo menos 2,4 s e só para quando o(a) jornalista termina a chamada
        let girou = false, falou = false; const parar = () => { if (girou && falou && this.passo === p && this.roleta) { this.roleta = null; this.temaAtual = p.tema; this.prepararFala(); } };
        this.narrar(N.roleta(nome(p.falante)), () => { falou = true; parar(); });
        this.later(2400, () => { girou = true; parar(); });
        this.later(9000, () => { girou = falou = true; parar(); });
      } else { this.temaAtual = p.tema || null; this.prepararFala(); return; }
    }
    this.emit();
  }
  prepararFala() {
    const p = this.passo;
    const j = this.porId(p.falante);
    this.fala = { status: 'pronto', inicioAutoEm: null, fimEm: null, texto: '', mic: false, res: null };
    if (j?.bot && j.conectado) { // a fala da IA já foi escrita antes; agora a voz dela vira prioridade
      const texto = this.escreverFalaBot(p);
      this.prepBot = { p, texto, voz: this.mgr.dub.sintetizar(texto, j.voz, 'alta', true), t0: p.t0Voz || Date.now() };
    }
    this.narrar(this.partesFala(p), ms => {
      if (!this.fala || this.fala.status !== 'pronto' || this.passo !== p) return;
      if (!j || !j.conectado) this.later(ms + 800, () => this.finalizar(''));
      else if (j.bot) this.later(ms + 900, () => this.falarBot(j));
      else { this.fala.inicioAutoEm = Date.now() + ms + 10000; this.later(ms + 10000, () => this.comecar(p.falante, false)); this.emit(); }
    });
    this.registrarPergunta({ de: this.jorn?.nome || 'Mediação', mediador: true, para: p.falante, kind: p.kind, tema: p.tema, texto: this.textoJ });
    this.emit();
  }
  /** Histórico de perguntas (mediação + perguntas/réplicas entre candidatos) para os jogadores consultarem. */
  registrarPergunta(x) { if (x.texto) { this.perguntas.push({ ...x, n: this.i }); if (this.perguntas.length > 40) this.perguntas.shift(); } }
  // ---------- candidatos da IA ----------
  /** Escreve (uma vez) a fala de um candidato da IA e já começa a gerar a voz, para ficar pronta a tempo. */
  escreverFalaBot(p) {
    const j = this.porId(p.falante); if (!j?.bot) return null;
    if (!p.falaBotTexto) {
      p.falaBotTexto = gerarFala({ passo: p, eu: j, alvo: p.alvo ? this.porId(p.alvo) : null, dificuldade: j.dif });
      p.t0Voz = Date.now();
      this.mgr.dub.sintetizar(p.falaBotTexto, j.voz, 'alta', true); // à frente da pré-geração das falas fixas
    }
    return p.falaBotTexto;
  }
  // ---------- candidatos da IA (falas) ----------
  async falarBot(j) {
    const p = this.passo; if (!this.fala || this.fala.status !== 'pronto' || p.falante !== j.id) return;
    const prep = this.prepBot?.p === p ? this.prepBot : null;
    const texto = prep?.texto || gerarFala({ passo: p, eu: j, alvo: p.alvo ? this.porId(p.alvo) : null, dificuldade: j.dif });
    // espera a voz realista ficar pronta (no máximo ~15 s desde que a fala foi escrita)
    const audio = prep ? await Promise.race([prep.voz, new Promise(r => setTimeout(() => r(null), Math.max(2000, 15000 - (Date.now() - prep.t0))))]) : null;
    if (!this.fala || this.fala.status !== 'pronto' || this.passo !== p) return;
    // o áudio vai junto já no primeiro aviso de "começou a falar"
    this.fala.falaBot = texto; this.fala.vozBot = j.avatar.genero; this.fala.audioBot = audio?.url || null;
    this.comecar(j.id, true);
    const palavras = texto.split(/\s+/); let i = 0;
    // legenda acompanha o áudio: divide a duração entre as palavras (pausa maior na pontuação)
    const pesos = palavras.map(w => (/[.,?!:;]$/.test(w) ? 1.8 : 1)), soma = pesos.reduce((a, b) => a + b, 0);
    const unidade = audio ? audio.ms / soma : 1000 / 2.7;
    const passoFala = () => {
      if (!this.fala || this.fala.status !== 'ativo' || this.passo !== p) return;
      i++; this.fala.texto = palavras.slice(0, i).join(' ');
      this.io.to(this.code).emit('texto', { t: this.fala.texto });
      this.io.to(this.code).volatile.emit('nivel', { id: j.id, v: .5 + Math.random() * .5 });
      if (i < palavras.length) this.later(unidade * pesos[i - 1], passoFala);
      else this.later(900, () => this.finalizar(texto));
    };
    this.later(audio ? 150 : 400, passoFala);
  }
  alvoBot(j) {
    const outros = this.elegiveis(this.passo).map(id => this.porId(id)); if (!outros.length) return null;
    const humanos = outros.filter(x => !x.bot && x.conectado);
    if (j.dif === 'dificil') { // mira em quem lidera a disputa (entre os que ainda podem receber pergunta)
      const lider = outros.slice().sort((a, b) => perf(b.st) - perf(a.st))[0];
      if (Math.random() < .6) return lider.id;
    }
    if (humanos.length && Math.random() < .65) return pick(humanos).id;
    return pick(outros).id;
  }
  reacoesBots(p, res) {
    if (!this.cfg.reacoes) return;
    this.jog.filter(b => b.bot && b.id !== p.falante).forEach((b, k) => {
      if (Math.random() > .3) return;
      const mesmoLado = PARTIDO[b.partido].ideo.includes('esquerda') === PARTIDO[this.porId(p.falante).partido].ideo.includes('esquerda');
      const tipo = res.ataque && res.danoEm.includes(b.id) ? 'vaia' : res.nota >= 6.5 ? (mesmoLado ? 'aplauso' : 'pensativo') : res.fugiu ? 'risada' : 'pensativo';
      this.later(700 + k * 600, () => this.io.to(this.code).emit('reacao', { id: b.id, tipo }));
    });
  }
  comecar(id, mic) {
    const f = this.fala, p = this.passo;
    if (!f || f.status !== 'pronto' || p.falante !== id) return;
    this.limpar();
    f.status = 'ativo'; f.mic = !!mic; f.fimEm = Date.now() + p.segundos * 1000;
    this.later(p.segundos * 1000, () => this.esgotar());
    this.emit();
  }
  esgotar() {
    const f = this.fala; if (!f || f.status !== 'ativo') return;
    f.status = 'encerrando';
    this.socketDe(this.passo.falante)?.emit('tempo');
    this.emit();
    this.later(2500, () => this.finalizar(f.texto));
  }
  receberTexto(socket, id, t) {
    const f = this.fala, p = this.passo;
    if (!f || p.falante !== id || !(f.status === 'ativo' || f.status === 'encerrando')) return;
    f.texto = String(t || '').slice(0, 4000);
    socket.to(this.code).emit('texto', { t: f.texto });
    const mod = moderar(f.texto); // discriminação/ameaça interrompe a fala na hora
    if (mod.expulsa) this.banir(this.porId(id), mod.grave);
  }
  // ---------- moderação e plateia ----------
  emAtivo() { return this.jog.filter(j => !j.banido); }
  /** Advertência (n = quantas). Na 3ª o candidato é banido da sala. Retorna true se baniu. */
  advertir(j, motivo, n = 1, por = 'moderação') {
    if (!j || j.banido || this.fase !== 'debate') return false;
    j.advertencias = (j.advertencias || 0) + n; j.st.dano = Math.min(3, j.st.dano + .3 * n); // advertência pesa na avaliação do eleitor
    this.io.to(this.code).emit('advertencia', { id: j.id, nome: j.nome, n: Math.min(j.advertencias, PUNICAO.advertencias), max: PUNICAO.advertencias, motivo, por, dupla: n > 1 });
    if (j.advertencias < PUNICAO.advertencias) return false;
    this.banir(j, `${PUNICAO.advertencias} advertências (última: ${motivo})`); return true;
  }
  banir(j, motivo) {
    if (!j || j.banido || this.fase !== 'debate') return;
    const p = this.passo, daVez = p?.falante === j.id; // se não é a vez dele, o debate segue sem interromper quem está falando
    if (daVez) this.limpar();
    j.banido = true; j.motivoBan = motivo;
    if (!j.bot) { const r = this.mgr.contas.registrarBanSala(this.conta(j), motivo); if (r) this.socketDe(j.id)?.emit('punicao', { ...r, motivo }); }
    if (!daVez) {
      this.fila = this.fila.filter((q, k) => k <= this.i || (q.falante !== j.id && q.alvo !== j.id));
      this.io.to(this.code).emit('banido', { id: j.id, nome: j.nome, motivo });
      this.postarXzona(postsDe('banido', this.dadosPost(j), 3)); this.plateia('confusao');
      if (this.emAtivo().length < 2) { this.limpar(); this.later(2500, () => this.finalizarDebate()); }
      return this.emit();
    }
    if (p?.tipo === 'fala' && this.fala) { // encerra a fala com nota zero
      const res = { nota: 0, wc: 0, extensao: 0, relevancia: 0, concretude: 0, apelo: 0, vicios: 0, lean: null, forca: 0, ataque: 0, mencionados: [], fugiu: false, danoEm: [], rebateu: false, banido: true };
      p.res = res; p.texto = '[fala interrompida pela moderação]'; this.fala.status = 'avaliado'; this.fala.res = res; this.fala.texto = p.texto;
    }
    // tira o candidato banido das próximas etapas
    this.fila = this.fila.filter((q, k) => k <= this.i || (q.falante !== j.id && q.alvo !== j.id));
    this.io.to(this.code).emit('banido', { id: j.id, nome: j.nome, motivo });
    this.postarXzona(postsDe('banido', this.dadosPost(j), 3));
    this.plateia('confusao');
    this.emit();
    this.narrar(N.banido(j.nome), ms => {
      if (this.emAtivo().length < 2) this.later(ms + 1500, () => this.finalizarDebate());
      else this.later(ms + 1500, () => this.proximo());
    });
    this.emit();
  }
  /** Reação da plateia: tipo 'vaia' | 'vibra' | 'ih' | 'confusao' | 'aplauso'. Gritos com voz real se já estiverem gerados. */
  plateia(tipo, extras = [], duelo = []) {
    const lista = shuffle([...(GRITOS[tipo] || []), ...extras]).slice(0, tipo === 'aplauso' ? 0 : duelo.length ? 2 : 3);
    const gritos = [...duelo.map(t => [t, 1]), ...lista.map(t => [t, 0])].map(([t, d], k) => {
      const pr = this.mgr.dub.pronto(t, VOZES_GRITO[k % 2]);
      if (!pr && (k === 0 || d)) this.mgr.dub.sintetizar(t, VOZES_GRITO[k % 2], 'baixa', false, OPC_PLATEIA); // gera aos poucos para as próximas vezes
      return { t, url: pr?.url || null, ...(d && { duelo: 1 }) };
    });
    // multidão: até 8 vozes do coro tocando ao mesmo tempo
    const chaveCoro = tipo === 'confusao' ? 'vaia' : tipo === 'ih' ? null : tipo;
    const urls = ts => shuffle(ts.flatMap(t => VOZES_CORO.map(v => this.mgr.dub.pronto(t, v)?.url)).filter(Boolean));
    const coro = [...(chaveCoro && CORO[chaveCoro] ? urls(CORO[chaveCoro]).slice(0, duelo.length ? 5 : 8) : []),
      ...(duelo.length ? urls(duelo.filter(t => CORO.duelo.includes(t))).slice(0, 4) : [])]; // no 1x1: várias vozes repetindo as acusações
    this.io.to(this.code).emit('plateia', { tipo, gritos, coro });
  }
  // duelo = falante no púlpito central do confronto 1x1 (bloco 2): a torcida rival grita 1-2 acusações
  reagirPlateia(res, xingou, duelo = false) {
    // sempre 1-2 das acusações principais + às vezes outra do repertório
    const dg = duelo ? [...shuffle([...CORO.duelo]).slice(0, 1 + (Math.random() < .6)), ...(Math.random() < .4 ? shuffle(GRITOS.duelo.filter(t => !CORO.duelo.includes(t))).slice(0, 1) : [])] : [];
    if (xingou) return this.plateia('confusao', [], dg);
    if (res.nota < 4.5) return this.plateia('vaia', res.fugiu ? ['Responde a pergunta!'] : [], dg);
    if (res.nota >= 7) return this.plateia('vibra', [], dg);
    if (res.ataque) return this.plateia('ih', [], dg);
    this.plateia('aplauso', [], dg);
  }
  confirmar(id, t) {
    const f = this.fala, p = this.passo;
    if (!f || p?.falante !== id || f.status === 'avaliado') return;
    this.finalizar(f.status === 'pronto' ? '' : String(t ?? f.texto ?? '').slice(0, 4000));
  }
  finalizar(texto) {
    const f = this.fala, p = this.passo; if (!f || f.status === 'avaliado' || p.tipo !== 'fala') return;
    this.limpar();
    texto = (texto || '').trim();
    const mod = moderar(texto, this.jorn?.nome), quem = this.porId(p.falante);
    if (mod.expulsa) { f.texto = texto; return this.banir(quem, mod.grave); }
    // regras: xingamento/palavrão = 1 advertência (2 se for contra a mediação); "cala a boca" contra a mediação = 1; contra candidato = só chamada de atenção
    const ofensa = !!(mod.grave || mod.leves.length);
    const nAdv = ofensa ? (mod.mediador ? 2 : 1) : (mod.brandas.length && mod.mediador ? 1 : 0);
    const motivo = (mod.grave ? 'palavrão pesado' : mod.leves.length ? `xingamento ("${mod.leves[0]}")` : `desrespeito ("${mod.brandas[0]}")`) + (mod.mediador ? ' contra a mediação' : '');
    if (nAdv) { f.texto = texto; if (this.advertir(quem, motivo, nAdv)) return; }
    const porId = Object.fromEntries(this.jog.map(j => [j.id, j]));
    const res = analisar(texto, p, this.jog.map(j => ({ id: j.id, nome: j.nome, sigla: j.partido })));
    if (ofensa) { // xingamento: perde pontos e leva bronca
      res.xingamentos = mod.grave ? [mod.grave] : mod.leves; res.nota = Math.max(0, res.nota - (mod.grave ? 4 : 2.5));
    }
    if (!nAdv && mod.brandas.length) this.io.to(this.code).emit('atencao', { id: quem.id, nome: quem.nome, termo: mod.brandas[0] });
    aplicar(p, texto, res, porId);
    p.texto = texto; p.res = res;
    f.texto = texto; f.status = 'avaliado'; f.res = res;
    if ((p.kind === 'pergunta' || p.kind === 'replica') && p.alvo) this.registrarPergunta({ de: this.porId(p.falante)?.nome || '', deId: p.falante, para: p.alvo, kind: p.kind, tema: p.tema, texto });
    const d = this.duelo, noDuelo = p.etapa === 2 && p.kind !== 'pergunta' && d?.fase === 'no' && (p.falante === d.a || p.falante === d.b);
    this.reagirPlateia(res, ofensa || nAdv > 0, noDuelo);
    this.postarXzona(postsDaFala(this.dadosPost(this.porId(p.falante), p), res));
    if (nAdv || mod.brandas.length) { this.emit(); this.narrar(nAdv ? N.advertencia(quem.nome) : N.ordem(), ms => this.auto(ms + 4000)); }
    else this.auto(8000);
    this.reacoesBots(p, res);
    this.emit();
  }
  escolher(id, alvo) {
    const p = this.passo;
    if (!p || p.tipo !== 'escolha' || p.falante !== id || p.escolhido) return;
    if (!this.porId(alvo) || alvo === id || this.porId(alvo).banido) return;
    if (!this.elegiveis(p).includes(alvo)) return; // equilíbrio: cada um recebe no máximo uma pergunta por rodada
    this.limpar();
    const tema = sortearTema(this.usados);
    p.escolhido = { alvo, tema };
    const base = { tipo: 'fala', etapa: 2, tema };
    const novos = [
      { ...base, kind: 'pergunta', falante: id, alvo, segundos: this.seg('pergunta'), var: sortearVariacao() },
      { ...base, kind: 'resposta', falante: alvo, alvo: id, segundos: this.seg('resposta'), var: sortearVariacao() },
      { ...base, kind: 'replica', falante: id, alvo, segundos: this.seg('replica') },
      { ...base, kind: 'treplica', falante: alvo, alvo: id, segundos: this.seg('treplica') }];
    novos.forEach(n => { this.antecipar(this.partesFala(n)); this.escreverFalaBot(n); });
    this.roleta = { ate: Date.now() + 2400 }; this.autoEm = null;
    let girou = false, falou = false;
    const seguir = () => {
      if (!girou || !falou || !this.roleta || this.passo !== p) return;
      this.roleta = null; this.temaAtual = tema;
      this.fila.splice(this.i + 1, 0, ...novos);
      // só 2 jogadores e já estão no púlpito central: a revanche começa ali mesmo, sem caminhar
      const d = this.duelo;
      if (d?.fase === 'no' && [d.a, d.b].includes(id) && [d.a, d.b].includes(alvo)) { d.n = 2; this.emit(); return this.proximo(); }
      // os dois caminham até o púlpito central; quando chegam, a pergunta começa normalmente
      this.duelo = { a: id, b: alvo, fase: 'indo' };
      this.emit();
      this.later(CAMINHADA_MS, () => { if (this.duelo?.a === id && this.duelo.b === alvo) this.duelo.fase = 'no'; this.proximo(); });
    };
    this.narrar(N.escolhido(this.porId(id).nome, this.porId(alvo).nome), () => { falou = true; seguir(); });
    this.emit();
    this.later(2400, () => { girou = true; seguir(); });
    this.later(9000, () => { girou = falou = true; seguir(); });
  }
  escolherAleatorio() {
    const p = this.passo; if (!p || p.tipo !== 'escolha' || p.escolhido) return;
    const outros = this.elegiveis(p).map(id => this.porId(id));
    if (!outros.length) return this.proximo();
    const online = outros.filter(j => j.conectado);
    this.escolher(p.falante, pick(online.length ? online : outros).id);
  }
  /** Adversários permitidos para quem escolhe agora (regra de equilíbrio da rodada, em shared/regras.js). */
  elegiveis(p) {
    const rod = this.fila.filter(q => q.tipo === 'escolha' && q.etapa === p.etapa);
    const k = rod.indexOf(p);
    return alvosValidos(p.falante, this.emAtivo().map(j => j.id), rod.filter(q => q.escolhido).map(q => q.escolhido.alvo), rod.slice(k + 1).map(q => q.falante));
  }
  /** Fim do confronto: a mediação encerra, os dois voltam aos seus púlpitos e só então o debate segue. */
  encerrarDuelo(depois) {
    const d = this.duelo;
    if (!d || d.fase === 'voltando') { this.duelo = null; return depois(); } // retorno interrompido: segue sem travar
    this.limpar(); this.autoEm = null;
    const nm = id => this.porId(id)?.nome || '';
    let foi = false;
    const voltar = () => {
      if (foi || this.duelo !== d) return; foi = true;
      d.fase = 'voltando'; this.emit();
      this.later(CAMINHADA_MS, () => { if (this.duelo === d) this.duelo = null; depois(); });
    };
    this.narrar(N.fimDuelo(nm(d.a), nm(d.b)), ms => this.later(ms + 300, voltar));
    this.later(12000, voltar); // se a narração falhar, não trava
    this.emit();
  }
  avancar() {
    if (this.fase !== 'debate') return;
    const p = this.passo;
    if (p.tipo === 'intro' || p.tipo === 'pesquisa' || (p.tipo === 'fala' && this.fala?.status === 'avaliado')) this.proximo();
  }
  proximo() {
    const seg = this.fila[this.i + 1], d = this.duelo;
    // ainda faz parte do confronto? (pergunta/resposta/réplica/tréplica entre os dois)
    const doDuelo = d && seg?.tipo === 'fala' && seg.etapa === 2 && [d.a, d.b].includes(seg.falante) && [d.a, d.b].includes(seg.alvo)
      // só 2 jogadores: ficam no centro até o outro também perguntar (aí sim voltam)
      || d && d.fase === 'no' && !d.n && seg?.tipo === 'escolha' && seg.etapa === 2 && seg.falante === d.b && this.emAtivo().length === 2;
    if (d && !doDuelo) return this.encerrarDuelo(() => this.proximo());
    if (seg) this.irPara(this.i + 1); else this.finalizarDebate();
  }

  finalizarDebate() {
    this.limpar(); this.duelo = null;
    const candidatos = this.emAtivo(); // banidos não entram na apuração
    const r1 = apurar(candidatos, .45, false, this.abst);
    const eleito1 = r1.res[0].pct > 50 || candidatos.length <= 2;
    const r2 = eleito1 ? null : apurar([this.porId(r1.res[0].id), this.porId(r1.res[1].id)], .35, true, this.abst);
    const vencedor = eleito1 ? r1.res[0].id : r2.res[0].id;
    this.fase = 'resultado'; this.passo = null; this.fala = null; this.temaAtual = null; this.autoEm = null;
    this.resultado = {
      r1, r2, eleito1, vencedor, mostrar2: false, anunciado1: false,
      // apuração ao vivo: 30 s de votos chegando (com viradas) antes de anunciar
      contagem: { turno: 1, ini: Date.now() + 4000, dur: APURACAO_MS, quadros: quadrosApuracao(r1.res) },
      dancas: Object.fromEntries(candidatos.map(j => [j.id, this.conta(j)?.danca || (j.bot ? pick(['samba', 'robo', 'passinho', 'disco', 'carnaval', 'comemorar']) : 'comemorar')])),
      desempenho: this.jog.map(j => ({ id: j.id, banido: j.banido ? j.motivoBan : null, nota: perf(j.st), percebida: rotuloPos(percebida(j)), ataques: j.st.ataques, fugas: j.st.fugas, melhor: j.st.melhor })),
      ata: this.fila.filter(p => p.tipo === 'fala' && p.res).map(p => ({ falante: p.falante, kind: p.kind, etapa: p.etapa, tema: p.tema, texto: p.texto, nota: p.res.nota })),
    };
    const nome = id => this.porId(id).nome;
    this.antecipar([...N.suspense(), ...(eleito1 ? N.vence1(nome(vencedor)) : [...N.segundoTurno(nome(r1.res[0].id), nome(r1.res[1].id)), ...N.vence2(nome(vencedor))])]);
    this.narrar(N.apuracao());
    this.later(4000 + APURACAO_MS, () => this.anunciar1());
    this.emit();
  }
  anunciar1() {
    const r = this.resultado; if (!r || r.anunciado1) return;
    r.anunciado1 = true;
    const nome = id => this.porId(id).nome;
    if (r.eleito1) { this.revelarNome(N.vence1(nome(r.vencedor))); this.encerrarPartida(); }
    else { this.narrar(N.segundoTurno(nome(r.r1.res[0].id), nome(r.r1.res[1].id))); this.later(14000, () => this.revelar2()); }
    this.emit();
  }
  /** 2º turno: mais 30 s de apuração ao vivo e o anúncio do vencedor. */
  revelar2() {
    const r = this.resultado; if (!r || r.eleito1 || r.mostrar2 || r.contagem?.turno === 2) return;
    if (!r.anunciado1) return this.anunciar1();
    r.contagem = { turno: 2, ini: Date.now() + 3000, dur: APURACAO_MS, quadros: quadrosApuracao(r.r2.res) };
    this.narrar(N.apuracao2());
    this.later(4000 + APURACAO_MS, () => { r.mostrar2 = true; this.revelarNome(N.vence2(this.porId(r.r2.res[0].id).nome)); this.encerrarPartida(); this.emit(); });
    this.emit();
  }
  /** Revelação no cliente (close 0 ms → telão 3500 ms, ver REVELACAO em main.js): suspense já, o nome quando o telão acende. */
  revelarNome(partesNome) {
    this.narrar(N.suspense());
    this.later(REVELA_TELAO_MS, () => { if (this.fase !== 'resultado') return; this.narrar(partesNome); this.plateia('vibra'); });
  }
  /** Fim: moedas dos candidatos e ranking. */
  encerrarPartida() {
    const r = this.resultado; if (!r || r.pago) return; r.pago = true;
    this.postarXzona(postsDe('vitoria', this.dadosPost(this.porId(r.vencedor)), 3));
    const candidatos = this.emAtivo();
    const finalistas = r.eleito1 ? [] : [r.r1.res[0].id, r.r1.res[1].id];
    for (const j of this.jog) {
      if (j.bot) continue; const c = this.conta(j); if (!c) continue;
      const itens = [];
      if (j.banido) itens.push(['Banido pela moderação', 0]);
      else {
        itens.push(['Participação', ECONOMIA.participacao]);
        itens.push([`Desempenho (nota ${perf(j.st).toFixed(1)})`, Math.round(perf(j.st) * ECONOMIA.porPontoDeNota)]);
        if (finalistas.includes(j.id)) itens.push(['Foi ao 2º turno', ECONOMIA.segundoTurno]);
        if (r.vencedor === j.id) itens.push(['Eleito(a)!', ECONOMIA.eleito]);
      }
      const total = itens.reduce((a, [, v]) => a + v, 0);
      this.mgr.contas.creditar(c, total, 'Partida de debate'); c.partidas = (c.partidas || 0) + 1; if (r.vencedor === j.id) c.vitorias = (c.vitorias || 0) + 1; this.mgr.contas.salvar();
      const m = j.st.melhor, seguidores = this.mgr.contas.registrarDebate(c, { nota: perf(j.st), eleito: r.vencedor === j.id, segundoTurno: finalistas.includes(j.id), banido: !!j.banido,
        ataques: j.st.ataques, fugas: j.st.fugas, fala: j.banido ? null : m?.texto, tema: TEMA[m?.tema]?.titulo });
      this.socketDe(j.id)?.emit('ganhos', { total, itens, seguidores }); this.enviarConta(j);
    }
    this.mgr.registrarRanking(candidatos, r.r1, r.vencedor);
  }
  // ---------- Xzona (rede social fictícia) ----------
  dadosPost(j, p) { const t = p?.tema && TEMA[p.tema]; return { nome: j?.nome || '', partido: PARTIDO[j?.partido]?.sigla || '', num: PARTIDO[j?.partido]?.numero || '', estado: t?.estado, tema: t?.titulo, genero: generoDe(j?.avatar) }; }
  postarXzona(posts) { posts.forEach((post, k) => setTimeout(() => this.io.to(this.code).emit('xzona', post), 1200 + k * 2600 + Math.random() * 800)); }
  // ---------- dica da assessoria ----------
  async pedirDica(j, op = {}) {
    const p = this.passo;
    if (this.fase !== 'debate' || !p || p.tipo !== 'fala' || p.falante !== j.id || this.fala?.status === 'avaliado') return { erro: 'A dica só pode ser usada na sua vez de falar.' };
    if (p.dicaUsada) return { erro: 'Você já consultou a assessoria nesta fala.' };
    const c = this.conta(j);
    let origem;
    if ((j.dicasUsadas || 0) < ECONOMIA.dicasGratis) { j.dicasUsadas = (j.dicasUsadas || 0) + 1; origem = 'gratis'; }
    else if (this.mgr.contas.usarDicaExtra(c)) origem = 'extra';
    else if (op.comprar) { const e = this.mgr.contas.comprar(c, 'avulsa'); if (e) return { erro: e }; this.mgr.contas.usarDicaExtra(c); origem = 'compra'; }
    else return { semDicas: true, preco: ECONOMIA.pacotes[0].preco };
    p.dicaUsada = true;
    this.io.to(this.code).emit('folheando', { id: j.id }); // todos veem o candidato folheando as anotações
    this.enviarConta(j);
    const dica = await gerarDica(this.mgr.dub.chave, { tema: p.tema, kind: p.kind, partido: j.partido, alvo: p.alvo && this.porId(p.alvo) });
    return { dica, origem, gratisRestantes: ECONOMIA.dicasGratis - (j.dicasUsadas || 0) };
  }
  // ---------- emotes, danças e provocações (itens da loja) ----------
  emote(j, item) {
    const it = ITEM[item]; if (!it || !j) return;
    if (!j.bot && !this.mgr.contas.tem(this.conta(j), item)) return;
    if (Date.now() - (j.ultEmote || 0) < 2500) return; j.ultEmote = Date.now();
    this.io.to(this.code).emit('emote', { id: j.id, item });
  }
  // ---------- denúncia ----------
  denunciar(j, d = {}) {
    const alvo = this.porId(d.alvo); if (!j || !alvo || alvo === j || alvo.bot) return 'Jogador inválido.';
    j.denunciados ||= new Set(); if (j.denunciados.has(alvo.id)) return 'Você já denunciou este jogador nesta sala.';
    j.denunciados.add(alvo.id);
    const falas = this.fila.filter(p => p.falante === alvo.id && p.texto).slice(-4).map(p => p.texto);
    this.mgr.contas.denunciar({
      sala: this.code, motivo: String(d.motivo || 'outro').slice(0, 40), detalhe: String(d.detalhe || '').slice(0, 600),
      denunciante: { nome: j.nome, uid: j.uid }, denunciado: { nome: alvo.nome, uid: alvo.uid, partido: alvo.partido }, falas,
    });
    console.log(`   Denúncia registrada: ${j.nome} denunciou ${alvo.nome} (${d.motivo}).`);
    return null;
  }
  voltarLobby() {
    this.reset(); this.fase = 'lobby';
    this.jog = this.jog.filter(j => j.conectado);
    this.jog.forEach(j => { j.pronto = !!j.bot; j.st = novoStats(); });
    this.emit();
  }
}

export class Salas {
  constructor(io, raiz) {
    this.io = io; this.salas = new Map();
    this.contas = new Contas(raiz);
    this.pagamentos = new Pagamentos(raiz, this.contas);
    this.dub = new Dublagem(raiz);
    // vinheta de abertura e falas fixas dos dois jornalistas, geradas aos poucos e guardadas em disco
    this.dub.sintetizar(BOAS_VINDAS, 'locutor', 'alta');
    this.dub.vinheta();
    this.dub.burburinho();
    // falas fixas dos jornalistas e gritos da plateia: gerados aos poucos (baixa prioridade) e guardados em disco.
    // Se a cota acabar (plano gratuito), os pedidos param sozinhos e o jogo usa a voz do navegador.
    for (const jn of JORNALISTAS) for (const t of trechosFixos(jn)) this.dub.sintetizar(t, jn.voz, 'baixa');
    // os 54 temas (com e sem a pergunta) nas duas vozes: depois de gerados, as falas de tema não dependem mais da API
    // (no ElevenLabs os temas não são pré-gerados, para poupar a cota de caracteres: saem na hora e ficam guardados)
    for (const t of trechosTemas()) for (const jn of JORNALISTAS) if (!this.dub.eleven(jn.voz)) this.dub.sintetizar(t, jn.voz, 'baixa');
    for (const [t, v] of Object.values(CORO).flat().flatMap(t => VOZES_CORO.map(v => [t, v]))) this.dub.sintetizar(t, v, 'media', false, OPC_PLATEIA);
    for (const t of GRITOS.duelo) for (const v of VOZES_GRITO) this.dub.sintetizar(t, v, 'media', false, OPC_PLATEIA); // gritos do confronto 1x1
    // (gritos individuais não são mais pré-gerados: aparecem em balões e ganham voz aos poucos, um por reação)
    this.arqRanking = path.join(raiz, 'dados', 'ranking.json');
    try { this.ranking = JSON.parse(fs.readFileSync(this.arqRanking, 'utf8')); } catch { this.ranking = {}; }
    this.arqPer = path.join(raiz, 'dados', 'ranking-periodos.json');
    try { this.per = JSON.parse(fs.readFileSync(this.arqPer, 'utf8')); } catch { this.per = {}; }
    this.virarPeriodos(); setInterval(() => this.virarPeriodos(), 600000);
    io.on('connection', s => this.conectar(s));
    setInterval(() => { // limpa salas vazias
      for (const [code, s] of this.salas) if (s.vazioDesde && Date.now() - s.vazioDesde > 120000) { s.limpar(); this.salas.delete(code); }
    }, 30000);
  }
  // ---------- ranking (geral, semanal e mensal) ----------
  static semanaId(d = new Date()) { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7); return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`; }
  static mesId(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  static top(rk, n = 50) { return Object.values(rk || {}).sort((a, b) => b.pts - a.pts).slice(0, n); }
  salvarPer() { try { fs.mkdirSync(path.dirname(this.arqPer), { recursive: true }); fs.writeFileSync(this.arqPer, JSON.stringify(this.per, null, 1)); } catch (e) { console.error('ranking-periodos:', e.message); } }
  /** Fecha semana/mês vencidos. No fim do mês, o 1º lugar vira campeão e recebe moedas. */
  virarPeriodos() {
    const sem = Salas.semanaId(), mes = Salas.mesId(); let mudou = false;
    const premiar = (v, tipo, id, valor) => { // moedas + título na fanpage da Xzona
      const c = v.uid && this.contas.conta(v.uid); if (!c) return 0;
      ((c.titulos ||= {})[tipo] ||= []).unshift(id); c.titulos[tipo].length = Math.min(c.titulos[tipo].length, 12);
      this.contas.creditar(c, valor, `Melhor candidato ${tipo === 'semanal' ? 'da semana de' : 'do mês'} ${id}`); return valor;
    };
    if (this.per.semana?.id !== sem) {
      const v = this.per.semana && Salas.top(this.per.semana.ranking, 1)[0];
      if (v) this.per.campeaoSemana = { semana: this.per.semana.id, nome: v.nome, avatar: v.avatar, pts: v.pts, premio: premiar(v, 'semanal', this.per.semana.id, ECONOMIA.campeaoSemanal) };
      this.per.semana = { id: sem, ranking: {} }; mudou = true;
    }
    if (this.per.mes?.id !== mes) {
      const v = this.per.mes && Salas.top(this.per.mes.ranking, 1)[0];
      if (v) {
        const c = premiar(v, 'mensal', this.per.mes.id, ECONOMIA.campeaoMensal);
        this.per.campeao = { mes: this.per.mes.id, nome: v.nome, avatar: v.avatar, partido: v.partido, pts: v.pts, vitorias: v.vitorias, premio: c };
        (this.per.campeoes ||= []).unshift(this.per.campeao); this.per.campeoes.length = Math.min(this.per.campeoes.length, 24);
        console.log(`Campeão mensal ${this.per.mes.id}: ${v.nome} (${v.pts} pts)`);
      }
      this.per.mes = { id: mes, ranking: {} }; mudou = true;
    }
    if (mudou) this.salvarPer();
  }
  registrarRanking(jogadores, r1, vencedor) {
    this.virarPeriodos();
    for (const j of jogadores) {
      if (j.bot) continue;
      const pct = r1.res.find(x => x.id === j.id)?.pct || 0;
      const pts = Math.round(pct * 10 + perf(j.st) * 20 + (j.id === vencedor ? 500 : 0));
      const k = j.nome.toLowerCase();
      for (const rk of [this.ranking, this.per.semana.ranking, this.per.mes.ranking]) {
        const r = rk[k] || (rk[k] = { nome: j.nome, pts: 0, partidas: 0, vitorias: 0 });
        r.nome = j.nome; r.avatar = j.avatar; r.partido = j.partido; if (j.uid) r.uid = j.uid; r.pts += pts; r.partidas++; if (j.id === vencedor) r.vitorias++;
      }
    }
    try { fs.mkdirSync(path.dirname(this.arqRanking), { recursive: true }); fs.writeFileSync(this.arqRanking, JSON.stringify(this.ranking, null, 1)); } catch (e) { console.error('ranking:', e.message); }
    this.salvarPer();
  }
  rankingDe(periodo) {
    const sem = Salas.top(periodo === 'semana' ? this.per.semana?.ranking : periodo === 'mes' ? this.per.mes?.ranking : this.ranking);
    return sem.map(({ uid, ...r }) => r); // uid não sai do servidor
  }
  novaSala(publica) { let code; do code = gerarCodigo(); while (this.salas.has(code)); const s = new Sala(this, code, publica); this.salas.set(code, s); return s; }

  conectar(socket) {
    socket.data = {};
    const sala = () => this.salas.get(socket.data.code);
    const eu = () => sala()?.porId(socket.data.pid);
    const ehHost = () => sala() && sala().hostId === socket.data.pid;
    const resp = (cb, v) => { if (typeof cb === 'function') cb(v); };
    const entrarEm = (s, perfil, cb) => {
      this.sairDaSala(socket);
      const r = s.adicionar(socket, perfil);
      if (typeof r === 'string') return resp(cb, { erro: r });
      resp(cb, { ok: true, code: s.code });
    };

    socket.on('criar', (d, cb) => entrarEm(this.novaSala(!!d?.publica), d?.perfil, cb));
    socket.on('entrar', (d, cb) => {
      const s = this.salas.get(String(d?.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
      if (!s) return resp(cb, { erro: 'Sala não encontrada. Confira o código.' });
      entrarEm(s, d?.perfil, cb);
    });
    socket.on('rapida', (d, cb) => {
      const s = [...this.salas.values()].find(x => x.publica && x.fase === 'lobby' && x.jog.length < MAX && x.humanos().length) || this.novaSala(true);
      entrarEm(s, d?.perfil, cb);
    });
    // partida local contra a IA: sala privada já com candidatos da IA
    socket.on('criarSolo', (d, cb) => {
      const s = this.novaSala(false);
      entrarEm(s, d?.perfil, r => {
        if (r.ok) { const n = Math.max(1, Math.min(4, Number(d?.n) || 2)); for (let k = 0; k < n; k++) s.adicionarBot(d?.dif); if (DUR_MULT[d?.dur]) s.cfg.dur = d.dur; s.emit(); }
        resp(cb, r);
      });
    });
    socket.on('addBot', (d, cb) => { const s = sala(); if (!s || !ehHost()) return; const r = s.adicionarBot(d?.dif); resp(cb, typeof r === 'string' ? { erro: r } : { ok: true }); });
    socket.on('reentrar', (d, cb) => {
      const s = this.salas.get(d?.code); const j = s && s.jog.find(x => x.token === d?.token);
      if (!s || !j) return resp(cb, { erro: 'sessão expirada' });
      s.vincular(socket, j); s.emit(); resp(cb, { ok: true, code: s.code });
    });
    socket.on('salasPublicas', (_, cb) => resp(cb, [...this.salas.values()].filter(s => s.publica && s.fase === 'lobby' && s.humanos().length)
      .map(s => ({ code: s.code, n: s.jog.length, host: s.porId(s.hostId)?.nome }))));
    const existe = f => (fs.existsSync(path.join(this.dub.pasta, f)) ? '/audio/' + f : null);
    socket.on('boasVindas', (_, cb) => resp(cb, { ...(this.dub.pronto(BOAS_VINDAS, 'locutor') || {}), vinheta: existe('vinheta.mp3'), palmas: existe('palmas.mp3'), burburinho: existe('burburinho.wav') }));
    socket.on('ranking', (d, cb) => { this.virarPeriodos(); const p = d?.periodo; resp(cb, { lista: this.rankingDe(p), id: p === 'semana' ? this.per.semana?.id : p === 'mes' ? this.per.mes?.id : null, premio: ECONOMIA.campeaoMensal, premioSemanal: ECONOMIA.campeaoSemanal, campeoes: this.per.campeoes || [] }); });
    socket.on('topXzona', (_, cb) => resp(cb, this.contas.topSeguidores(5)));
    socket.on('campeao', (_, cb) => { this.virarPeriodos(); resp(cb, this.per.campeao || null); });
    socket.on('sair', () => this.sairDaSala(socket));
    socket.on('perfil', (d, cb) => { const s = sala(), j = eu(); if (s && j) resp(cb, { erro: s.atualizarPerfil(j, d || {}) }); });
    socket.on('pronto', v => { const s = sala(), j = eu(); if (s && j && s.fase === 'lobby') { j.pronto = !!v; s.emit(); } });
    socket.on('cfg', d => {
      const s = sala(); if (!s || !ehHost() || s.fase !== 'lobby') return;
      if (DUR_MULT[d?.dur]) s.cfg.dur = d.dur;
      if (typeof d?.permitirTexto === 'boolean') s.cfg.permitirTexto = d.permitirTexto;
      if (typeof d?.reacoes === 'boolean') s.cfg.reacoes = d.reacoes;
      if (typeof d?.publica === 'boolean') s.publica = d.publica;
      s.emit();
    });
    socket.on('expulsar', id => { const s = sala(); if (s && ehHost() && s.fase === 'lobby' && id !== s.hostId) { const sk = s.socketDe(id); s.remover(id); if (sk) { sk.leave(s.code); sk.emit('expulso'); sk.data = {}; } } });
    socket.on('iniciar', (_, cb) => { const s = sala(); if (!s || !ehHost() || s.fase !== 'lobby') return; resp(cb, { erro: s.iniciar() }); });
    socket.on('avancar', () => { if (ehHost()) sala().avancar(); });
    socket.on('comecar', d => sala()?.comecar(socket.data.pid, d?.mic));
    socket.on('texto', d => { const s = sala(); if (s) s.receberTexto(socket, socket.data.pid, d?.t); });
    socket.on('confirmar', d => sala()?.confirmar(socket.data.pid, d?.t));
    socket.on('escolher', d => sala()?.escolher(socket.data.pid, d?.alvo));
    socket.on('revelar2', () => { if (ehHost()) sala().revelar2(); });
    socket.on('revanche', () => { const s = sala(); if (s && ehHost() && s.fase === 'resultado') { s.jog = s.jog.filter(j => j.conectado); if (s.jog.length >= MIN) { s.jog.forEach(j => j.pronto = true); s.iniciar(); } } });
    socket.on('lobby', () => { const s = sala(); if (s && ehHost() && s.fase !== 'lobby') s.voltarLobby(); });
    socket.on('olhar', d => {
      const s = sala(), j = eu(); if (!s || !j) return;
      const y = Math.max(-2, Math.min(2, Number(d?.y) || 0)), p = Math.max(-1, Math.min(1, Number(d?.p) || 0));
      j.olhar = { y, p }; socket.to(s.code).volatile.emit('olhar', { id: j.id, y, p });
    });
    socket.on('nivel', v => { const s = sala(); if (s && s.passo?.falante === socket.data.pid) socket.to(s.code).volatile.emit('nivel', { id: socket.data.pid, v: Math.max(0, Math.min(1, Number(v) || 0)) }); });
    socket.on('reacao', tipo => {
      const s = sala(), j = eu(); if (!s || !j || !s.cfg.reacoes || !REACOES.includes(tipo)) return;
      if (Date.now() - (j.ultReacao || 0) < 900) return; j.ultReacao = Date.now();
      this.io.to(s.code).emit('reacao', { id: j.id, tipo });
    });
    // ---- conta, loja e itens ----
    const contaDe = d => this.contas.conta(d?.uid, typeof d?.nome === 'string' ? d.nome.slice(0, 20) : undefined);
    socket.on('minhaConta', async (d, cb) => { const c = contaDe(d); await this.pagamentos.pendentes(c).catch(() => 0); resp(cb, this.contas.publico(c)); });
    socket.on('lojaInfo', (_, cb) => resp(cb, { pacotes: ECONOMIA.pacotes, dicasGratis: ECONOMIA.dicasGratis, economia: ECONOMIA, moedas: PACOTES_MOEDAS, pixAtivo: this.pagamentos.ativo }));
    socket.on('pagarPix', async (d, cb) => { const c = contaDe(d); if (Date.now() - (socket.data.ultPix || 0) < 5000) return resp(cb, { erro: 'Aguarde alguns segundos.' }); socket.data.ultPix = Date.now(); resp(cb, await this.pagamentos.criarPix(c, d?.pacote, d?.email)); });
    socket.on('statusPix', async (d, cb) => { const c = contaDe(d); const r = await this.pagamentos.status(c, String(d?.id)); resp(cb, { ...r, conta: this.contas.publico(c) }); });
    socket.on('comprar', (d, cb) => { const c = contaDe(d); const e = this.contas.comprar(c, d?.pacote); resp(cb, e ? { erro: e } : { ok: true, conta: this.contas.publico(c) }); });
    socket.on('comprarItem', (d, cb) => { const c = contaDe(d); const e = this.contas.comprarItem(c, d?.item); resp(cb, e ? { erro: e } : { ok: true, conta: this.contas.publico(c) }); });
    socket.on('cadastrar', (d, cb) => { const c = contaDe({ uid: d?.uid }); const e = this.contas.cadastrar(c, d); resp(cb, e ? { erro: e } : { ok: true, conta: this.contas.publico(c) }); });
    socket.on('trocarCadastro', (d, cb) => { const c = contaDe({ uid: d?.uid }); const e = this.contas.trocar(c, d?.campo, d?.valor); const j = eu(); if (!e && j) sala().atualizarPerfil(j, {}); resp(cb, e ? { erro: e } : { ok: true, conta: this.contas.publico(c) }); });
    socket.on('criarFanpage',(d, cb) => { const c = contaDe(d); const e = this.contas.criarFanpage(c, d); if (!e) sala()?.emit(); resp(cb, e ? { erro: e } : { ok: true, conta: this.contas.publico(c) }); });
    socket.on('verFanpage', (d, cb) => { const s = sala(), j = s?.porId(d?.id); resp(cb, j && !j.bot ? this.contas.fanpage(s.conta(j)) : null); });
    socket.on('equiparDanca', (d, cb) => { const c = contaDe(d); const e = this.contas.equiparDanca(c, d?.item); resp(cb, e ? { erro: e } : { ok: true, conta: this.contas.publico(c) }); });
    // ---- partida: dica, emotes, denúncia ----
    socket.on('pedirDica', async (d, cb) => { const s = sala(), j = eu(); if (!s || !j) return resp(cb, { erro: 'Fora de uma partida.' }); resp(cb, await s.pedirDica(j, d || {})); });
    socket.on('emote', item => { const s = sala(), j = eu(); if (s && j) s.emote(j, item); });
    socket.on('denunciar', (d, cb) => { const s = sala(), j = eu(); resp(cb, { erro: s && j ? s.denunciar(j, d) : 'Fora de uma sala.' }); });
    // ---- voz entre jogadores (WebRTC): o servidor só repassa a sinalização dentro da sala ----
    socket.on('rtc', d => {
      const s = sala(); if (!s || !d?.para) return;
      const alvo = s.socketDe(d.para); if (alvo) alvo.emit('rtc', { de: socket.data.pid, dados: d.dados });
    });
    socket.on('disconnect', () => sala()?.desconectou(socket));
  }
  sairDaSala(socket) {
    const s = this.salas.get(socket.data.code); if (!s) return;
    socket.leave(s.code); s.remover(socket.data.pid); socket.data = {};
  }
}
