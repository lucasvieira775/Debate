import { Estudio } from './estudio.js';
import { retrato } from './avatar.js';
import { Microfone, falar, calar, sfx, somItem, nivelDoAudio, setVolume, testarMicrofone, temReconhecimento, contextoSeguro, configurarAmbiente, ajustarAmbiente, setVolumeAmbiente, setVolumeMusica, abafarAmbiente, pararSonsRevelacao } from './voz.js';
import { PARTIDOS, PARTIDO, IDEO, AV, TEMA, TEMAS, KIND_NOME, ETAPAS, JORN, DIFICULDADES, avatarAleatorio, textoVitoria } from '/shared/regras.js';
import { $, $$, esc, fmtN, fmtP, fmtT, lerPerfil, salvarPerfil, lerConfig, salvarConfig, lerSessao, salvarSessao, logoPartido, toast } from './util.js';
import { Voip } from './voip.js';
import { SONS_ACAO } from './acoes/sons.js';
import { termosAceitos, mostrarTermos } from './termos.js';
import { PUNICAO, REGRAS_DEBATE } from '/shared/moderacao.js';
import { postXzona, limparXzona, mostrarDica, esconderDica, recolherDica, aoLerDica,janela, janelaDenuncia, telaLoja, avisoGanhos, reais, htmlFanpage, janelaFanpage } from './extras.js';
import { ITENS, ITEM, PACOTES_MOEDAS, itensDe, ACAO_ESPERA_MS, GRATIS } from '/shared/loja.js';
import { CARGOS, XP, XP_PUNICAO, cargo, brasao, htmlBrasao } from '/shared/niveis.js';
import { animarPromocao } from './promocao.js';
import { CADASTRO, validarNome, validarUser, validarIdade, formatarNome, formatarUser } from '/shared/cadastro.js';

const VERSAO = 'v0.3';
// identificador da conta do jogador (moedas, itens da loja), guardado no navegador
const UID = (() => { try { let u = localStorage.getItem('debate_uid'); if (!u) { u = (crypto.randomUUID?.() || Array.from({ length: 32 }, () => (Math.random() * 16 | 0).toString(16)).join('')); localStorage.setItem('debate_uid', u); } return u; } catch { return 'anon' + Math.random().toString(16).slice(2, 18); } })();
const E = {
  perfil: lerPerfil(), cfg: lerConfig(), tela: 'menu', sala: null, eu: null, offset: 0,
  persAba: 'aparencia', persVoltar: 'menu', textoFala: '', meuTexto: '', micOn: false, micErro: '', confirmando: false,
  ultI: null, ultTextoJ: '', ledKey: '', hudKey: '', latKey: '', resKey: '', roletaIv: null, conviteSala: null, abaRes: 1,
  conta: null, lojaAba: 'moedas', lojaInfo: null,
};
setVolume(E.cfg.sfx); setVolumeAmbiente(E.cfg.ambiente); setVolumeMusica(E.cfg.musica);
const kAmb = () => E.cfg.ambiente / .7; // vozes da plateia: 70% = volume original
// ---------- resolução: a página vira uma tela virtual do tamanho escolhido, escalada e centralizada (barras pretas se a proporção não bater) ----------
const RESOLUCOES = { auto: 'Automática (janela)', '1920x1080': '1920×1080 · 16:9 Full HD', '2560x1440': '2560×1440 · 16:9 QHD', '3840x2160': '3840×2160 · 16:9 4K', '2560x1080': '2560×1080 · 21:9 UW-FHD', '3440x1440': '3440×1440 · 21:9 UW-QHD', '5120x1440': '5120×1440 · 32:9 Super UW' };
const CELULAR = matchMedia('(pointer:coarse)').matches && /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
const telaCheiaDeitado = () => { if (!CELULAR) return; const d = document.documentElement; Promise.resolve(document.fullscreenElement || d.requestFullscreen?.({ navigationUI: 'hide' })).then(() => screen.orientation?.lock?.('landscape')).catch(() => {}); };
function aplicarResolucao(res) {
  const b = document.body, m = /^(\d+)x(\d+)$/.exec(res || '');
  b.classList.toggle('celular', CELULAR);
  if (!m && CELULAR) { // celular: tela virtual de ~720 px de altura (deitado) escalada para caber — HUD/menus no tamanho do PC, só menores
    const k = Math.min(1, Math.min(innerWidth, innerHeight) / 720, Math.max(innerWidth, innerHeight) / 1280);
    if (k < 1) { b.classList.add('res-fixa'); b.style.setProperty('--rw', innerWidth / k + 'px'); b.style.setProperty('--rh', innerHeight / k + 'px'); b.style.setProperty('--rk', k); return; }
  }
  if (!m) { b.classList.remove('res-fixa'); ['--rw', '--rh', '--rk'].forEach(v => b.style.removeProperty(v)); return; }
  const w = +m[1] / devicePixelRatio, h = +m[2] / devicePixelRatio; // pixels físicos → px CSS (texto/HUD ficam do tamanho certo para a tela)
  b.classList.add('res-fixa'); b.style.setProperty('--rw', w + 'px'); b.style.setProperty('--rh', h + 'px'); b.style.setProperty('--rk', Math.min(innerWidth / w, innerHeight / h));
}
{ const r = new URLSearchParams(location.search).get('res'); if (r && (r in RESOLUCOES)) E.cfg.resolucao = r; } // ?res=2560x1080 (testes)
aplicarResolucao(E.cfg.resolucao);
addEventListener('resize', () => aplicarResolucao(E.cfg.resolucao));
const socket = io();
const est = new Estudio($('#cena'), E.cfg);
// passos, rodinhas e trava do púlpito; sons das ações (acoes/sons.js). Impacto da ação: som do ElevenLabs (se houver) ou o sintetizado
est.onSom = (tipo, o) => tipo === 'acaoImpacto' ? somItem(o.item, () => SONS_ACAO['impacto_' + o.item]?.(o), Math.max(.35, Math.min(.9, (o.vol ?? .6) * 1.3))) : (sfx[tipo] || SONS_ACAO[tipo])?.(o);
const voip = new Voip(socket, { onNivel: (id, v) => est.setFalaNivel(id, v), onFalha: () => { if (!E.voipFalhou) { E.voipFalhou = true; toast('Não deu para conectar a voz com outro jogador (rede do celular bloqueia). Tentando de novo…', 'erro'); } } });
const atualizarConta = c => { if (!c) return; E.conta = c; if (c.cadastro && E.perfil.nome !== c.cadastro.nome) { E.perfil.nome = c.cadastro.nome; salvar(); }
  const a = E.perfil.avatar, tira = a && ['oculos', 'chapeu', 'extra', 'roupa'].filter(k => bloqueio(k, a[k])); // tira itens pagos que a conta não tem
  if (tira?.length) { tira.forEach(k => a[k] = k === 'roupa' ? avatarAleatorio(a.genero).roupa : 'nenhum'); salvar(); } const m = $('#moedas-chip'); if (m) m.textContent = '🪙 ' + fmtN(c.moedas); };

// ======================= utilidades =======================
const agora = () => Date.now() + E.offset;
const jog = id => E.sala?.jogadores.find(j => j.id === id);
const eu = () => jog(E.eu);
const ehHost = () => E.sala && E.sala.hostId === E.eu;
const emJogo = () => E.sala && E.sala.fase !== 'lobby';
const minhaVez = () => E.sala?.fase === 'debate' && E.sala.passo?.tipo === 'fala' && E.sala.passo.falante === E.eu;
/** O servidor decide quem pode falar (fechado enquanto a mediação fala; aberto a todos no cumprimento). */
/** Aviso quando o jogador tenta falar/escrever fora da hora (no máx. 1 a cada 6 s). */
let avisoBloqT = 0;
function avisoBloqueado() { if (Date.now() - avisoBloqT < 6000) return; avisoBloqT = Date.now(); toast(E.sala?.narrando ? '🎙 A mediação está falando. Aguarde a sua vez.' : '🔇 Não é possível falar agora. Aguarde a sua vez.', 'erro'); }
const micLiberado = (s = E.sala) => !!s && (s.microfones === 'todos' || (Array.isArray(s.microfones) && s.microfones.includes(E.eu)));
const ret = av => retrato(av);
const vx = b => String(b).replace('.', ',');
/** Janela NÍVEIS: os 8 cargos; os ainda não alcançados ficam trancados com cadeado. Mostra XP necessário, recompensa e multiplicador. */
function janelaCarreira() {
  const cg = cargo(E.conta?.xp || 0), max = Math.max(cg.n, E.conta?.cargoMax || 1);
  janela(`<h2>🏛 Níveis · Carreira política</h2><p class="mut" style="font-size:14px">Ganhe XP em cada debate: participação +${XP.participacao}, nota × ${XP.porPontoDeNota}, 2º turno +${XP.segundoTurno}, eleito(a) +${XP.eleito}. Cada cargo novo paga uma <b>recompensa única</b> em moedas e aumenta o <b>multiplicador</b> das moedas de participação e desempenho. <b>Abandonar partidas e ser banido(a) tira XP</b> e pode rebaixar seu cargo.</p>
    <div class="carreira">${CARGOS.map(c => { const aberto = c.n <= max; return `<div class="cargo-l ${c.n === cg.n ? 'on' : aberto ? '' : 'bloq'}">
      <div class="cargo-img"><img src="${brasao(c.n)}">${aberto ? '' : '<span class="cadeado">🔒</span>'}</div>
      <div style="flex:1;min-width:0"><b>${c.n}. ${c.nome}</b>${c.n === cg.n ? ' <span class="chip">você</span>' : ''}
        <small title="XP necessário">⭐ ${c.xp ? fmtN(c.xp) + ' XP' : 'Cargo inicial'}</small>
        <small title="Recompensa única ao alcançar">🎁 ${c.recompensa ? `+${fmtN(c.recompensa)} moedas${aberto ? ' ✔' : ''}` : '—'}</small>
        <small title="Multiplicador das moedas de participação e desempenho">🪙 ×${vx(c.bonus)} por debate</small></div></div>`; }).join('')}</div>
    <p class="mut" style="font-size:13px">Seu XP: <b>${fmtN(cg.xp)}</b>${cg.prox ? ` · faltam ${fmtN(cg.prox - cg.xp)} para ${CARGOS[cg.n].nome}` : ' · cargo máximo!'}</p>
    <div style="display:flex;justify-content:flex-end"><button class="btn peq" id="cx">Fechar</button></div>`, (el, fechar) => { $('#cx', el).onclick = fechar; });
}
const perfilEnvio = () => ({ nome: E.perfil.nome, avatar: E.perfil.avatar, partido: E.perfil.partido, uid: UID });
const salvar = () => salvarPerfil(E.perfil);
function bots() {
  const nomes = [['Ana Ribeiro', 'feminino'], ['Carlos Mendes', 'masculino'], ['Alex Moreira', 'nao_binario'], ['Rafael Souza', 'masculino'], ['Marta Lima', 'feminino']];
  const ps = ['FPB', 'MSD', 'PUN', 'ALB', 'POP'];
  if (!E.botsLista) E.botsLista = nomes.map(([nome, g], i) => ({ id: 'bot' + i, nome, avatar: avatarAleatorio(g), partido: ps[i], slot: i, conectado: true, bot: true }));
  return E.botsLista;
}

// ======================= microfone =======================
let envT = 0, envTimer = null, nivelT = 0;
function enviarTexto(t, conf = t) { // conf = parte já confirmada pelo reconhecimento (só ela pode punir durante a fala)
  E.meuTexto = t; E.meuConf = conf;
  const enviar = () => { envT = Date.now(); socket.emit('texto', { t: E.meuTexto, conf: E.meuConf }); };
  clearTimeout(envTimer);
  if (Date.now() - envT > 220) enviar(); else envTimer = setTimeout(enviar, 220);
  atualizarLegenda();
}
const mic = new Microfone({
  onTexto: (t, conf) => { const ta = $('#h-ta'); if (ta) { ta.value = t; ta.scrollTop = ta.scrollHeight; } enviarTexto(t, conf); },
  onNivel: v => {
    const b = $('#h-vu'); if (b) b.style.width = Math.min(100, v * 100) + '%';
    if (Date.now() - nivelT > 120) { nivelT = Date.now(); socket.emit('nivel', v); }
  },
  onErro: m => { E.micErro = m; E.micOn = false; toast(m, 'erro'); renderAcao(true); },
  onStatus: m => { const el = $('#h-micst'); if (el) el.textContent = m; },
  onExclusivo: v => voip.pausar(v),
  faixa: () => voip.stream?.getAudioTracks()[0] || null, // celular: transcreve a mesma faixa que o chat de voz transmite
  onFrase: t => socket.emit('frase', { t }), // celular sem faixa compartilhada: os outros ouvem a frase em voz sintetizada
});
function comecarFala(comMic) {
  if (!minhaVez() || E.confirmando) return;
  if (!micLiberado()) return avisoBloqueado();
  if (E.sala.fala?.status === 'pronto') socket.emit('comecar', { mic: comMic });
  if (comMic) ligarMic();
}
function ligarMic() {
  calar(); pararNarracao(); est.mediadoraFalando(false); E.micErro = '';
  const ta = $('#h-ta'); if (ta) E.meuTexto = ta.value;
  E.micOn = true; renderAcao(true);
  mic.ligar(E.meuTexto).then(ok => { if (!ok) { E.micOn = false; renderAcao(true); } });
}
async function desligarMic() { const t = await mic.desligar(); E.micOn = false; enviarTexto(t); renderAcao(true); setTimeout(() => focarTexto(), 50); }
function alternarMic() {
  if (!minhaVez()) { if (E.sala?.fase === 'debate') avisoBloqueado(); return; }
  if (E.confirmando) return;
  const st = E.sala.fala?.status;
  if (st === 'pronto') comecarFala(true);
  else if (st === 'ativo') E.micOn ? desligarMic() : ligarMic();
}
async function confirmarFala() {
  if (!minhaVez() || E.confirmando) return;
  const st = E.sala.fala?.status; if (st === 'avaliado') return;
  E.confirmando = true; renderAcao(true); fimDaResposta();
  let t = E.meuTexto;
  if (E.micOn) { t = await mic.desligar(); E.micOn = false; } else { const ta = $('#h-ta'); if (ta) t = ta.value; }
  socket.emit('confirmar', { t });
}
function focarTexto() { const ta = $('#h-ta'); if (ta && !ta.readOnly) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }

/** Voz do navegador não dá o volume: a boca do avatar abre e fecha em pulsos do início ao fim da fala. */
function bocaEmPulsos(id, fn) {
  let iv = 0; const fim = () => { clearInterval(iv); est.setFalaNivel(id, 0); };
  fn({ ini: () => { clearInterval(iv); iv = setInterval(() => est.setFalaNivel(id, .35 + Math.random() * .6), 120); setTimeout(fim, 60000); }, fim });
}
// ======================= mediadora =======================
let fimBocaMed = null;
/** Sem dublagem do Gemini: nada de voz robótica do navegador — só a legenda e a boca mexendo. */
function falarMediadora(txt) {
  clearTimeout(fimBocaMed);
  if (E.micOn || !txt) return;
  est.mediadoraFalando(true); fimBocaMed = setTimeout(() => est.mediadoraFalando(false), Math.min(7000, txt.length * 55));
}
// ---------- dublagem (Gemini), progressiva ----------
// Toca os trechos em ordem assim que a fala começa. Trecho ainda sendo gerado: espera até 1,5 s pela
// atualização do servidor; se não chegar, nome é pulado e o resto usa a voz do navegador só naquele trecho.
// Uma fala nova espera a anterior terminar (nunca é descartada).
const narrador = { tocando: null, fila: [], audio: null };
function narrItens(id) { return E.sala?.narr?.id === id && E.sala.narr.itens ? E.sala.narr.itens : narrador.ultimos?.[id]; }
function tocarNarracao(job) {
  if (!E.cfg.voz || E.micOn) return;
  if (narrador.tocando) { narrador.fila.push(job); if (narrador.fila.length > 2) narrador.fila.shift(); return; }
  calar();
  const tok = narrador.tocando = { job }; est.mediadoraFalando(true);
  narrador.ultimos = { [job.id]: job.itens };
  let i = 0, esperou = 0; const pre = {};
  const terminar = () => {
    if (narrador.tocando !== tok) return;
    narrador.tocando = null; narrador.audio = null; est.mediadoraFalando(false);
    if (narrador.fila.length) return tocarNarracao(narrador.fila.shift());
    if (narrador.depois) { const d = narrador.depois; narrador.depois = null; d(); }
  };
  const prox = () => {
    if (narrador.tocando !== tok) return;
    if (job.texto) { const t = job.texto; job.texto = null; return void setTimeout(terminar, Math.min(7000, t.length * 55)); } // sem dublagem: só legenda (sem voz robótica)
    const itens = narrItens(job.id) || job.itens || [];
    if (i >= itens.length) return terminar();
    const it = itens[i];
    if (it.url) {
      i++; esperou = 0;
      const a = narrador.audio = pre[it.url] || new Audio(it.url); a.onended = () => setTimeout(prox, 60); a.onerror = () => prox();
      const nx = itens[i]; if (nx?.url && !pre[nx.url]) pre[nx.url] = Object.assign(new Audio(nx.url), { preload: 'auto' }); // pré-carrega o próximo: pausa curta e constante entre trechos
      return void a.play().catch(() => prox());
    }
    // ainda gerando: espera um pouco (nomes esperam mais: evita a voz robótica do navegador)
    if (esperou < (it.t.endsWith(',') ? 4500 : 1500)) { esperou += 100; return void setTimeout(prox, 100); }
    i++; esperou = 0;
    // trecho não ficou pronto: é pulado (fica só na legenda) — nunca sai na voz robótica do navegador
    setTimeout(prox, 60);
  };
  prox();
}
function pararNarracao() { narrador.audio?.pause(); calar(); narrador.tocando = null; narrador.fila = []; est.mediadoraFalando(false); }
function aoNarrar(s) {
  const n = s.narr; if (!n || s.fase === 'lobby' || n.status === 'gerando') return;
  if (narrador.ultimos?.[n.id] && n.itens) narrador.ultimos[n.id] = n.itens; // trecho que chegou depois
  if (n.id === E.narrTocada) return;
  E.narrTocada = n.id;
  if (n.status === 'parcial' || n.status === 'ok') tocarNarracao({ id: n.id, itens: n.itens || (n.audios || []).map(url => ({ url, t: '' })), genero: s.jorn?.genero });
  else falarMediadora(s.textoJ); // sem dublagem: só legenda + boca (sem voz robótica)
}

// ======================= rede =======================
socket.on('connect', () => {
  const s = lerSessao();
  // reconexão automática na mesma sala (abrindo = o jogo acabou de ser aberto, não só a conexão que caiu)
  if (s?.code && s?.token) socket.emit('reentrar', { ...s, abrindo: !E.jaConectou }, r => { if (r?.erro) { if (r.aviso) toast(r.erro, 'erro'); if (E.sala) sairLocal(); salvarSessao(null); verConvite(); } });
  else verConvite();
  socket.emit('minhaConta', { uid: UID }, c => { atualizarConta(c); seguirConvite(); if (!E.sala && !c?.cadastro) renderUI(); else if ((E.tela === 'menu' && !E.sala) || E.tela === 'loja') renderUI(); });
  socket.emit('lojaInfo', null, i => { E.lojaInfo = i; if (E.tela === 'loja') renderUI(); });
});
socket.on('conta', atualizarConta);
socket.on('ganhos', g => { avisoGanhos(g); sfx.nota();
  if (g.xp?.depois > g.xp?.antes) setTimeout(() => { const c = CARGOS[g.xp.depois - 1]; animarPromocao({ n: c.n, nome: c.nome, recompensa: g.xp.premio || 0, bonus: c.bonus }); }, 2500); });
socket.on('xzona', post => { if (emJogo()) postXzona(post); });
socket.on('folheando', d => { est.folhear(d.id); if (d.id !== E.eu) sfx.clique(); });
// mediação ou candidato falando: emotes, danças e provocações ficam mudos (só a animação)
const alguemFalando = () => !!(est.medFalando || narrador.tocando || ['ativo', 'encerrando'].includes(E.sala?.fala?.status));
socket.on('emote', d => { const it = ITEM[d.item]; if (!it) return; est.emote(d.id, it); if (alguemFalando()) return; if (it.tipo === 'provocacao') { somItem(it.id, sfx.vaia); est.agitarPlateia(.5, 1500); } else if (it.tipo !== 'danca') somItem(it.id, sfx.clique); }); // dança no debate é muda: som só na comemoração
socket.on('advertencia', d => {
  anunciar(`⚠ ${d.nome.toUpperCase()} ADVERTIDO(A) · ${d.n}/${d.max}`); sfx.martelo();
  toast(`${d.id === E.eu ? 'Você recebeu' : d.nome + ' recebeu'} ${d.dupla ? '2 advertências' : 'uma advertência'} da moderação: ${d.motivo} (${d.n}/${d.max}).${d.id === E.eu && d.n === d.max - 1 ? ' Mais uma e você está fora!' : ''}`, 'erro');
});
socket.on('tempoExtra', d => { anunciar(`⏱ +${d.s} s PARA ${d.nome.toUpperCase()}`); toast(`⏱ ${d.id === E.eu ? 'Você foi agredido(a)' : d.nome + ' foi agredido(a)'} durante a fala: +${d.s} s no relógio.`); });
socket.on('alertaGrave', d => toast(`⚠ A transcrição registrou ${d.motivo} na sua fala. Se foi erro do reconhecimento de voz, fale com calma e pausadamente. Se acontecer de novo, você será expulso(a) da sala.`));
socket.on('atencao', d => toast(`🗣 Chamada de atenção para ${d.id === E.eu ? 'você' : d.nome}: “${d.termo}” não é postura de debate. Desta vez, sem punição.`));
socket.on('punicao', d => {
  let msg = d.susp === 'perm' ? 'Sua conta foi BANIDA PERMANENTEMENTE (3ª suspensão de 30 dias).'
    : d.susp ? `Sua conta foi suspensa por ${d.susp} dias. Você poderá terminar de assistir a esta partida.`
    : `Banimentos de sala nesta semana: ${d.salas}/${PUNICAO.bansSemana}. No ${PUNICAO.bansSemana}º, sua conta é suspensa por ${PUNICAO.diasSemana} dias.`;
  if (d.xp) msg += ` Você perdeu ${fmtN(XP_PUNICAO.banSala + (d.susp === PUNICAO.diasMes ? XP_PUNICAO.suspensao30 : d.susp && d.susp !== 'perm' ? XP_PUNICAO.suspensao7 : 0))} XP${d.xp.depois < d.xp.antes ? ` e caiu para ${CARGOS[d.xp.depois - 1].nome}` : ''}.`;
  toast('⛔ ' + msg, 'erro'); if (d.susp) setTimeout(() => alert('⛔ ' + msg + '\n\nVeja as Regras do Debate e os Termos de Uso.'), 1500);
});
socket.on('voce', d => { E.eu = d.id; E.jaConectou = true; salvarSessao({ code: d.code, token: d.token }); });
socket.on('penalidade', t => t && toast(t, 'erro'));
socket.on('saiuPartida', d => { if (d.id === E.eu) return; sfx.clique?.();
  anunciar(`🚪 ${d.nome.toUpperCase()} ABANDONOU O DEBATE`);
  toast(`🚪 ${d.nome} ${d.voluntario ? 'abandonou a partida' : 'não voltou a tempo e foi retirado(a) do debate'}. ${d.wo ? `${d.wo} vence por W.O.!` : 'O debate segue.'} Você pode denunciá-lo(a) por abandono em 👥 Jogadores.`, 'erro'); });
socket.on('voltouPartida', d => { if (d.id !== E.eu) toast(`${d.nome} voltou ao debate!`); });
socket.on('estado', s => { if (s.fase === 'lobby') E.acoesUsadas = null; onEstado(s); });
// ---------- ações (cadeirada, tomate, flores…): a animação roda em est.acao; no impacto, a mediação comenta ----------
const acaoFalas = new Map(); // n → { t, url, impacto }
socket.on('acao', d => { if (!ITEM[d.item]) return; for (const [k, f] of acaoFalas) if (Date.now() - f.em > 30000) acaoFalas.delete(k); // impacto que nunca veio (aba oculta, saiu da sala)
  acaoFalas.set(d.n, { t: d.fala, em: Date.now() }); est.acao(d); if (d.id === E.eu) { E.ultAcao = Date.now(); (E.acoesUsadas ||= new Set()).add(d.item); } });
socket.on('acaoFala', d => { const f = acaoFalas.get(d.n); if (!f) return; f.url = d.url; f.pronta = true; if (f.impacto) falaAcao(d.n); });
function falaAcao(n) {
  const f = acaoFalas.get(n); if (!f || f.dita || E.sala?.fase !== 'debate') return; f.impacto = true; if (!f.pronta) return; // espera o áudio (o servidor manda em até 4 s)
  f.dita = true; acaoFalas.delete(n);
  E.legAcao = { t: f.t, ate: Date.now() + Math.max(4000, f.t.length * 70) }; atualizarLegenda(); setTimeout(atualizarLegenda, E.legAcao.ate - Date.now() + 50);
  if (f.url && E.cfg.voz && !E.micOn && narrador.fila.length < 2) tocarNarracao({ id: 'acao' + n, itens: [{ t: f.t, url: f.url }] }); // fila cheia: não empurra fora uma narração do jogo
  else if (!narrador.tocando) falarMediadora(f.t); // sem áudio: só boca + legenda (não corta a boca da narração em curso)
}
// eventos da coreografia 3D: impacto (som + comentário da mediação 0,7 s depois)
est.onAcao = (ev, d) => { if (ev === 'impacto') { est.agitarPlateia(1, 2500); setTimeout(() => falaAcao(d.n), 700); } };
socket.on('texto', d => { E.textoFala = d.t; const f = E.sala?.passo?.falante; if (f) est.setFalaNivel(f, .75); atualizarLegenda(); });
socket.on('olhar', d => est.setOlharJogador(d.id, d.y, d.p));
socket.on('nivel', d => est.setFalaNivel(d.id, d.v));
// celular que não consegue transmitir a voz real enquanto transcreve: cada frase chega em texto e é lida aqui
socket.on('frase', d => { if (!E.cfg.voz || !d?.t || E.sala?.passo?.falante !== d.id) return; bocaEmPulsos(d.id, f => falar(d.t, { genero: jog(d.id)?.avatar?.genero, fila: true, onInicio: f.ini, onFim: f.fim })); });
socket.on('tempo', () => { anunciar('TEMPO ESGOTADO!'); sfx.fim(); confirmarFala(); });
socket.on('plateia', d => {
  const forte = { vaia: 1, vibra: 1, confusao: 1, ih: .6, aplauso: .5 }[d.tipo] || .5;
  est.agitarPlateia(forte, d.tipo === 'aplauso' ? 1800 : 3500);
  if (d.tipo === 'vibra' || d.tipo === 'aplauso') sfx.aplausos(d.tipo === 'vibra' ? 3 : 1.6, d.tipo === 'vibra' ? .3 : .16);
  const temCoro = E.cfg.voz && d.coro?.length;
  if ((d.tipo === 'vaia' || d.tipo === 'confusao') && !temCoro) { sfx.vaia(); setTimeout(sfx.vaia, 350); setTimeout(sfx.vaia, 800); }
  if (d.tipo === 'ih') sfx.vaia();
  // multidão: várias vozes reais ao mesmo tempo, cada uma com atraso, velocidade e volume diferentes
  if (temCoro) d.coro.forEach(url => setTimeout(() => {
    const a = new Audio(url); a.volume = Math.min(1, (.25 + Math.random() * .3) * kAmb()); a.playbackRate = .85 + Math.random() * .3; a.preservesPitch = false; a.play().catch(() => {});
  }, Math.random() * 450));
  // gritos do confronto 1x1 vêm primeiro, sobrepostos e mais altos; sem voz pronta, usa a voz do navegador (sem cortar quem está falando)
  d.gritos.forEach((g, k) => setTimeout(() => {
    est.gritoPlateia(g.t); est.gritarPlateia?.(1, 2200);
    if (!E.cfg.voz) return;
    if (g.url) { const a = new Audio(g.url); a.volume = Math.min(1, (g.duelo ? .8 : .55) * kAmb()); a.playbackRate = .95 + Math.random() * .15; a.play().catch(() => {}); } // sem voz pronta: só o balão (nada de voz robótica)
  }, g.duelo ? 150 + k * 380 : 300 + k * 650));
});
socket.on('banido', d => {
  anunciar(`🚫 ${d.nome.toUpperCase()} FORA DO DEBATE`); sfx.fim();
  if (d.id === E.eu) { if (E.micOn) { mic.abortar(); E.micOn = false; } toast(`Você foi retirado do debate por ${d.motivo}.`, 'erro'); }
  else toast(`${d.nome} foi banido(a) do debate por ${d.motivo}.`, 'erro');
});
socket.on('reacao', d => {
  const em = { aplauso: '👏', vaia: '👎', risada: '😂', pensativo: '🤔', mao: '✋' }[d.tipo]; est.reacao(d.id, em);
  if (!alguemFalando()) sfx.clique(); // reação é só do jogador: a plateia não reage
});
socket.on('expulso', () => { toast('Você foi removido da sala pelo anfitrião.', 'erro'); sairLocal(); });
socket.on('disconnect', () => toast('Conexão perdida. Tentando reconectar…', 'erro'));
est.onOlhar = (y, p) => socket.emit('olhar', { y, p });
est.onPick = ({ pid, acao }) => {
  if (!E.sala || E.sala.fase !== 'debate') return;
  if (acao && pid === E.eu) { sfx.clique(); if (acao === 'mic') alternarMic(); else confirmarFala(); return; }
  const p = E.sala.passo;
  if (p?.tipo === 'escolha' && p.falante === E.eu && !p.escolhido && pid && pid !== E.eu) {
    if (p.elegiveis && !p.elegiveis.includes(pid)) return toast('Este candidato já recebeu pergunta nesta rodada. Escolha outro adversário.', 'erro');
    escolherAlvo(pid);
  }
};
function escolherAlvo(id) { socket.emit('escolher', { alvo: id }); sfx.sorteio(); est.setSelecionaveis(null); }
function verConvite() {
  const code = new URLSearchParams(location.search).get('sala');
  if (code && !E.sala) E.conviteSala = code.toUpperCase();
}
const seguirConvite = () => { if (E.conviteSala && !E.sala && E.conta?.cadastro) { const c = E.conviteSala; E.conviteSala = null; entrarSala(c); } };

// ======================= cadastro =======================
function telaCadastro(ui) {
  const sug = (E.perfil.nome || '').replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]/g, '').trim().split(/\s+/).slice(0, 2);
  ui.innerHTML = `<div class="tela"><div class="painel cadastro" style="max-width:480px;width:100%;margin:auto">
    <div class="logo-txt" style="font-size:.6em;margin-bottom:10px"><span>DEBATE</span><b>PRESIDENCIAL</b></div>
    <h2>Cadastro do candidato</h2>
    <p class="mut" style="margin-top:-6px">Escolha com cuidado: depois de cadastrados, o nome e o @ só mudam pagando moedas (🪙 ${fmtN(CADASTRO.precoNome)} o nome, 🪙 ${fmtN(CADASTRO.precoUser)} o @).</p>
    <div style="display:flex;gap:10px"><div style="flex:1"><label class="mut">Nome</label><input id="cd-nome" class="campo" maxlength="14" style="width:100%;margin:6px 0 12px" placeholder="Ex.: Lucas" value="${esc(sug[0] || '')}"></div>
      <div style="flex:1"><label class="mut">Sobrenome <small>(opcional)</small></label><input id="cd-sob" class="campo" maxlength="14" style="width:100%;margin:6px 0 12px" placeholder="Ex.: Silva" value="${esc(sug[1] || '')}"></div></div>
    <label class="mut">Seu @ na Xzona</label><div style="display:flex;align-items:center;gap:6px;margin:6px 0 12px"><b style="font-size:20px">@</b><input id="cd-user" class="campo" maxlength="15" style="flex:1" placeholder="lucassilva"></div>
    <label class="mut">Idade</label><input id="cd-idade" class="campo" type="number" min="${CADASTRO.idadeMin}" max="${CADASTRO.idadeMax}" style="width:110px;margin:6px 0 6px">
    <p class="mut" style="font-size:13px">Só letras no nome (sem números, símbolos ou palavrões). O @ aceita letras e números.</p>
    <p id="cd-erro" style="color:#ff6b6b;min-height:1.2em;margin:6px 0"></p>
    <div style="display:flex;justify-content:flex-end"><button class="btn amarelo" id="cd-ok">✔ Cadastrar</button></div>
  </div></div>`;
  const erro = m => { $('#cd-erro').textContent = m || ''; if (m) sfx.erro?.(); };
  $('#cd-user').oninput = e => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''); };
  $('#cd-ok').onclick = () => {
    const nome = formatarNome(`${$('#cd-nome').value} ${$('#cd-sob').value}`), user = $('#cd-user').value, idade = Number($('#cd-idade').value);
    const e = validarNome(nome) || validarUser(user) || validarIdade(idade); if (e) return erro(e);
    $('#cd-ok').disabled = true;
    socket.emit('cadastrar', { uid: UID, nome, user, idade }, r => {
      $('#cd-ok').disabled = false; if (r?.erro) return erro(r.erro);
      atualizarConta(r.conta); sfx.vitoria(); toast(`Bem-vindo(a), ${r.conta.cadastro.nome}!`, 'ok'); E.tela = 'menu'; renderUI(); seguirConvite();
    });
  };
}
function janelaTrocarNome() {
  const cd = E.conta?.cadastro; if (!cd) return;
  janela(`<h2>Alterar cadastro</h2><p class="mut">Seu saldo: 🪙 ${fmtN(E.conta.moedas)}</p>
    <label class="mut">Nome do candidato · 🪙 ${fmtN(CADASTRO.precoNome)}</label><div style="display:flex;gap:8px;margin:6px 0 14px"><input id="tn-nome" class="campo" maxlength="29" style="flex:1" value="${esc(cd.nome)}"><button class="btn peq amarelo" id="tn-nome-ok">Trocar</button></div>
    <label class="mut">@ na Xzona · 🪙 ${fmtN(CADASTRO.precoUser)}</label><div style="display:flex;gap:8px;margin:6px 0 14px"><b style="align-self:center">@</b><input id="tn-user" class="campo" maxlength="15" style="flex:1" value="${esc(cd.user)}"><button class="btn peq amarelo" id="tn-user-ok">Trocar</button></div>
    <div style="display:flex;justify-content:flex-end"><button class="btn peq" id="cx">Fechar</button></div>`,
  (el, fechar) => {
    $('#cx', el).onclick = fechar;
    $('#tn-user', el).oninput = e => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''); };
    const trocar = (campo, valor, preco) => {
      const e = campo === 'nome' ? validarNome(valor) : validarUser(valor); if (e) return toast(e, 'erro');
      if ((E.conta.moedas || 0) < preco) return toast(`Moedas insuficientes: faltam ${fmtN(preco - E.conta.moedas)}.`, 'erro');
      janela(`<h2>Confirmar troca</h2><p>Trocar ${campo === 'nome' ? 'o nome para' : 'o @ para'} <b>${esc(campo === 'nome' ? formatarNome(valor) : '@' + formatarUser(valor))}</b> por <b>🪙 ${fmtN(preco)}</b>?</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn peq" id="cx2">Cancelar</button><button class="btn peq amarelo" id="ok2">Confirmar</button></div>`,
        (el2, f2) => { $('#cx2', el2).onclick = f2; $('#ok2', el2).onclick = () => { f2(); socket.emit('trocarCadastro', { uid: UID, campo, valor }, r => {
          if (r?.erro) return toast(r.erro, 'erro'); fechar(); atualizarConta(r.conta); sfx.vitoria(); toast(campo === 'nome' ? 'Nome alterado!' : '@ alterado!', 'ok'); renderUI(); }); }; });
    };
    $('#tn-nome-ok', el).onclick = () => trocar('nome', $('#tn-nome', el).value, CADASTRO.precoNome);
    $('#tn-user-ok', el).onclick = () => trocar('user', $('#tn-user', el).value, CADASTRO.precoUser);
  });
}

function onEstado(s) {
  const ant = E.sala; E.sala = s; E.offset = s.agora - Date.now();
  const me = s.jogadores.find(j => j.id === E.eu);
  if (me && s.fase === 'lobby' && (me.partido !== E.perfil.partido || me.nome !== E.perfil.nome)) { E.perfil.partido = me.partido; E.perfil.nome = me.nome; salvar(); }
  est.setJogadores(s.jogadores, E.eu);
  // troca de passo
  if (s.i !== E.ultI || s.fase !== ant?.fase) {
    E.ultI = s.i; E.textoFala = ''; E.meuTexto = ''; E.confirmando = false; E.micErro = '';
    if (E.audioBot) { E.audioBot.pause(); E.audioBot = null; }
    if (ant && s.fase === 'debate') calar(); // não deixa voz sintetizada do passo anterior vazar para o próximo
    if (E.micOn) { mic.abortar(); E.micOn = false; }
    esconderDica(); E.dicaFimI = null;
    if (s.fase === 'debate' && ant?.fase !== 'debate') E.dicasGratis = 1;
    if (s.fase === 'debate') aoNovoPasso(s);
  }
  // fim da minha resposta (confirmei / tempo acabou / já avaliada): guarda a anotação e a câmera volta (uma vez por passo)
  if (s.passo?.falante === E.eu && ['encerrando', 'avaliado'].includes(s.fala?.status)) fimDaResposta();
  // chat de voz: entra assim que está numa sala; só transmite quando o microfone está liberado
  const humanos = s.jogadores.filter(j => !j.bot && j.conectado).map(j => j.id);
  if (!voip.stream && !E.voipTentou) { E.voipTentou = true; voip.iniciar().then(ok => { if (!ok) toast('Chat de voz desligado: microfone não liberado.', 'erro'); onEstado(E.sala); }); }
  voip.atualizar(E.eu, humanos, s.microfones === 'todos' || (Array.isArray(s.microfones) && s.microfones.includes(E.eu)));
  if (s.fala && s.fala.texto && !minhaVez()) E.textoFala = s.fala.texto;
  // mediadora
  if (s.jorn && s.jorn.nome !== E.jornAtual) { E.jornAtual = s.jorn.nome; est.setMediador(s.jorn.avatar); }
  if (s.code !== E.salaNarr) { E.salaNarr = s.code; E.narrTocada = s.narr?.id; } // ao entrar/reconectar não repete falas antigas
  aoNarrar(s);
  // candidato da IA falando: voz sintetizada com o gênero do avatar
  if (s.fala?.falaBot && s.fala.status === 'ativo' && E.botFalado !== s.i && E.cfg.voz) {
    E.botFalado = s.i; const idBot = s.passo.falante, txtBot = s.fala.falaBot, gBot = s.fala.vozBot, urlBot = s.fala.audioBot, iBot = s.i;
    const vozBot = () => {
      if (E.sala?.i !== iBot) return;
      const vozNav = () => bocaEmPulsos(idBot, f => falar(txtBot, { genero: gBot, onInicio: f.ini, onFim: f.fim })); // reserva: voz do navegador
      if (urlBot) { const a = E.audioBot = new Audio(urlBot); nivelDoAudio(a, v => est.setFalaNivel(idBot, v)); a.play().catch(vozNav); } // voz realista (Gemini) + boca no ritmo
      else vozNav();
    };
    if (narrador.tocando) narrador.depois = vozBot; else vozBot(); // espera o(a) jornalista terminar
  }
  // roleta
  if (s.roleta && !E.roletaIv) { E.roletaIv = setInterval(() => { est.setLED({ modo: 'roleta' }); sfx.tique(); const t = TEMAS[Math.random() * TEMAS.length | 0]; const el = $('#h-tema'); if (el) el.innerHTML = `<small>Sorteando o tema…</small><b><span class="uf">${t.uf}</span>${esc(t.titulo)}</b>`; }, 110); }
  if (!s.roleta && E.roletaIv) { clearInterval(E.roletaIv); E.roletaIv = null; E.ledKey = ''; sfx.sorteio(); }
  // falante e destaque
  const p = s.passo;
  est.setFalante(s.fase === 'debate' && (p?.tipo === 'fala' || p?.tipo === 'escolha') ? p.falante : null);
  est.setSelecionaveis(p?.tipo === 'escolha' && p.falante === E.eu && !p.escolhido ? (p.elegiveis || s.jogadores.filter(j => j.id !== E.eu).map(j => j.id)) : null);
  // púlpito do confronto: a produção traz no bloco 2 e leva embora no bloco 3 (quem entra no meio já vê no lugar)
  est.setPulpito(s.fase === 'debate' && (p?.etapa === 2 || !!s.duelo), !ant || ant.fase !== 'debate' || s.fase !== 'debate', s.fase === 'debate' && p ? p.etapa > 2 : undefined);
  est.setDuelo(s.fase === 'debate' ? s.duelo : null);
  if (minhaVez() && s.fala?.status === 'avaliado' && E.micOn) { mic.abortar(); E.micOn = false; }
  if (ant?.fala?.status !== 'avaliado' && s.fala?.status === 'avaliado') { sfx.nota(); est.festejarPlateia(3200, .8); sfx.aplausos(1.8, .2); }
  // resultado: primeiro a apuração ao vivo; a comemoração (com a dança do vencedor) só depois do anúncio
  if (s.fase === 'resultado' && ant?.fase !== 'resultado') aoResultado(s);
  const r = s.resultado, ra = ant?.resultado;
  const comemorar = () => { E.celebrar = true; clearTimeout(E.celebrarT); E.celebrarT = setTimeout(() => celebrar(false), 15000); $('#xzona')?.classList.add('min'); est.confetes(true); const it = ITEM[r.dancas?.[r.vencedor]] || ITEM.comemorar; est.festa(r.vencedor, it.anim); sfx.vitoria(); somItem(it.id); sfx.aplausos(3.5, .3); est.festejarPlateia(8000); };
  // anúncio do vencedor: cinemática de revelação (jornalista → telão ao vivo → festa); a festa de sempre entra no fim
  // quem chega depois do anúncio (sem ter visto a apuração) não vê a cinemática do zero, sem a narração: vai direto à festa
  const revelar = () => { const v = ant?.fase === 'resultado' && s.jogadores.find(j => j.id === r.vencedor); if (!v) return comemorar(); revelarVencedor(v, (ITEM[r.dancas?.[r.vencedor]] || ITEM.comemorar).anim, () => { comemorar(); ajustarCamera(); E.resKey = ''; renderResultado(); }); };
  if (s.fase === 'resultado' && r?.eleito1 && r.anunciado1 && !(ra?.anunciado1)) revelar();
  if (s.fase === 'resultado' && r?.mostrar2 && !ra?.mostrar2) { E.abaRes = 2; revelar(); }
  if (s.fase !== 'resultado') { pararRevelacao(); est.confetes(false); est.festa(null); E.celebrar = false; clearTimeout(E.celebrarT); }
  if (s.fase === 'lobby') limparXzona();
  ajustarCamera();
  renderUI();
}
/** Modo da câmera; na comemoração, o vencedor dança sozinho no centro do palco. */
function ajustarCamera() {
  const s = E.sala, r = s?.resultado;
  const venc = s?.fase === 'resultado' && r && ((r.eleito1 && r.anunciado1) || r.mostrar2) && s.jogadores.find(j => j.id === r.vencedor);
  if (E.revelando && !E.revTeste && !(s?.fase === 'resultado' && emJogo())) pararRevelacao(); // saiu do resultado no meio
  if (E.revelando) return; // a cinemática controla a câmera até a festa
  est.setCampeao(venc ? venc.avatar : null, (ITEM[r?.dancas?.[r?.vencedor]] || ITEM.comemorar).anim);
  const modoJogo = venc && E.celebrar ? 'vencedor' : E.naPlateia && s?.fase === 'resultado' ? 'tv' : 'fp';
  if (emJogo()) { if (est.modo !== modoJogo) { est.setModo(modoJogo); est.olhar = { y: 0, p: -.28 }; } }
  else if (E.tela === 'personalizar' || E.tela === 'loja') est.setModo('vitrine');
  else { est.setModo('menu'); E.tela = 'sala'; }
}
// ===== REVELAÇÃO DO VENCEDOR =====
// Linha do tempo (ms desde o anúncio). Ganchos para o som: window.aoFaseRevelacao?.(fase, vencedor) em cada fase
// ('close' | 'telao' | 'transicao' | 'festa') — o agente de sons pode atribuir window.aoFaseRevelacao = (fase, v) => {…}.
const REVELACAO = { close: 0, telao: 3500, transicao: 6500, festa: 8500 };
const faseRev = (f, v) => { try { window.aoFaseRevelacao?.(f, v); } catch (e) { console.error(e); } };
/** Interrompe a cinemática (sair da sala/resultado no meio): limpa timers, devolve o telão e libera o render target. */
function pararRevelacao() { (E.revelacaoT || []).forEach(clearTimeout); E.revelacaoT = []; if (!E.revelando) return; E.revelando = false; E.revTeste = false; est.fimRevelacao(); somRevelacao('parar'); }
// Sons da cena: rufar no close (para quando o nome é dito), impacto + plateia no telão, whoosh no push-in.
// Ducking: burburinho e RECEPÇÃO do chat de voz mais baixos enquanto a mediadora fala; o microfone de ninguém é cortado.
function somRevelacao(fase) {
  const normal = () => { abafarAmbiente(1); voip.setVolumeRecepcao(1); };
  if (fase === 'close') { abafarAmbiente(.35); voip.setVolumeRecepcao(.6); if (E.revTeste || E.sala?.fase === 'resultado') sfx.rufar(REVELACAO.telao / 1000); } // rufo só na revelação do resultado
  else if (fase === 'telao') sfx.impacto();
  else if (fase === 'transicao') { sfx.whoosh((REVELACAO.festa - REVELACAO.transicao) / 1000); abafarAmbiente(.7); voip.setVolumeRecepcao(.85); }
  else if (fase === 'festa') normal(); // vitória, dança e aplausos já tocam em comemorar()
  else if (fase === 'parar') { pararSonsRevelacao(); normal(); }
}
window.aoFaseRevelacao = somRevelacao;
/** Flash branco curto que esconde o corte do telão para a câmera real. */
function flashRev() {
  const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.95;pointer-events:none;z-index:9999;transition:opacity .5s ease-out';
  document.body.appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => { d.style.opacity = '0'; })); setTimeout(() => d.remove(), 650);
}
/** Cinemática: close na(o) jornalista apontando → telão com o campeão AO VIVO → push-in + flash → festa (aoFim). v = { nome, partido, avatar }. */
function revelarVencedor(v, anim, aoFim) {
  pararRevelacao(); E.revelando = true; E.celebrar = false; clearTimeout(E.celebrarT);
  if (E.sala) { E.resKey = ''; renderResultado(); } // tira os painéis da frente durante a cinemática
  est.setCampeao(v.avatar, anim); est.revelar({ nome: v.nome, partido: v.partido }); est.faseRevelacao('close');
  faseRev('close', v); // SOM: rufar + ducking (a fala de suspense vem do servidor; o nome, 3,5 s depois)
  const T = E.revelacaoT = [];
  T.push(setTimeout(() => { est.faseRevelacao('telao'); faseRev('telao', v); /* SOM: telão acende ao vivo com o campeão dançando */ }, REVELACAO.telao));
  T.push(setTimeout(() => { est.faseRevelacao('transicao'); faseRev('transicao', v); /* SOM: whoosh do push-in no telão */ }, REVELACAO.transicao));
  T.push(setTimeout(() => { E.revelacaoT = []; E.revelando = false; E.revTeste = false; est.fimRevelacao(); flashRev(); faseRev('festa', v); /* SOM: festa (vitória/aplausos já tocam em comemorar) */ aoFim?.(); }, REVELACAO.festa));
}
/** Só para debug: window.__testeRevelacao() roda a cinemática com dados falsos (de qualquer tela). */
window.__testeRevelacao = (nome = 'Fulano de Tal', partido = E.perfil.partido || 'PUN') => {
  revelarVencedor({ nome, partido, avatar: E.perfil.avatar }, 'samba', () => {
    est.setModo('vencedor'); est.confetes(true); est.festejarPlateia(6000);
    setTimeout(() => { est.confetes(false); if (!E.revelando) { est.modo = ''; ajustarCamera(); } }, 7000);
  });
  E.revTeste = true;
};
function celebrar(on) { clearTimeout(E.celebrarT); E.celebrar = on; if (on) E.celebrarT = setTimeout(() => celebrar(false), 15000); ajustarCamera(); E.resKey = ''; renderResultado(); }
function aoNovoPasso(s) {
  const p = s.passo; if (!p) return;
  if (p.tipo === 'vinheta') est.vinheta(p.bloco, Math.max(0, s.agora - (p.t0 || s.agora))); // vinheta do bloco no telão curvo, sincronizada pelo relógio do servidor
  if (p.tipo === 'intro') { anunciar(p.t2 ? (p.etapa === 2 ? '2º TURNO' : 'CONSIDERAÇÕES FINAIS') : `BLOCO ${p.etapa}`); if (p.etapa === 1) { sfx.aplausos(3, .3); est.festejarPlateia(3500); } }
  if (p.tipo === 'fala' && p.falante === E.eu) { setTimeout(() => { anunciar('SUA VEZ!'); sfx.vez(); }, s.roleta ? 2400 : 300); }
  if (p.tipo === 'escolha' && p.falante === E.eu) { anunciar('ESCOLHA SEU ADVERSÁRIO'); sfx.vez(); }
  if (p.tipo === 'pesquisa') sfx.sorteio();
}
function aoResultado(s) {
  const r = s.resultado;
  const k = s.code + ':' + s.total + ':' + r.vencedor;
  if (E.contado !== k && r.vencedor) { // 2º turno: só conta quando o vencedor sai, no fim do debate final
    E.contado = k; const me = r.r1.res.find(x => x.id === E.eu); const d = r.desempenho.find(x => x.id === E.eu);
  }
  E.abaRes = 1; E.apuLider = null;
}
function anunciar(txt) { const el = document.createElement('div'); el.className = 'anuncio'; el.textContent = txt; $('#hud').appendChild(el); setTimeout(() => el.remove(), 2500); }

// ======================= ações de sala =======================
function exigirNome() {
  if (E.conta?.cadastro) return true;
  toast(E.conta ? 'Faça seu cadastro primeiro.' : 'Conectando ao servidor…', 'erro'); E.tela = 'menu'; renderUI(); return false;
}
const tratar = r => { if (r?.erro) toast(r.erro, 'erro'); else { E.tela = 'sala'; sfx.sorteio(); history.replaceState(null, '', '/?sala=' + r.code); } };
function criarSala() { if (exigirNome()) socket.emit('criar', { publica: false, perfil: perfilEnvio() }, tratar); }
function entrarSala(code) { if (exigirNome()) socket.emit('entrar', { code, perfil: perfilEnvio() }, tratar); }
function partidaRapida() { if (exigirNome()) socket.emit('rapida', { perfil: perfilEnvio() }, tratar); }
function sairLocal() {
  if (E.micOn) { mic.abortar(); E.micOn = false; }
  calar(); pararNarracao(); voip.sair(); E.voipTentou = false; limparXzona(); esconderDica(); pararRevelacao();
  E.sala = null; E.eu = null; salvarSessao(null); E.tela = 'menu'; history.replaceState(null, '', '/');
  E.jornAtual = null;
  est.setFalante(null); est.confetes(false); est.festa(null); est.setDuelo(null); est.setPulpito(false, true); est.setModo('menu'); est.setJogadores(bots(), null); renderUI();
}
function sairSala() { socket.emit('sair'); sairLocal(); }
/** Sair no meio do debate = abandono: confirma e avisa da punição (2 abandonos em 24 h → 1 h de suspensão + perde seguidores). */
function confirmarSaida() {
  if (E.sala?.fase !== 'debate') return sairSala();
  janela(`<h2>🚪 Abandonar o debate?</h2><p>Tem certeza que deseja abandonar o debate?</p>
    <p class="mut" style="font-size:14px">Se sair, você corre o risco de ser <b>penalizado(a) com 1 hora de banimento</b>: quem abandona <b>2 partidas em 24 horas</b> (saindo, caindo a internet ou fechando o jogo sem voltar em 1 minuto) fica suspenso(a) por 1 hora e <b>perde seguidores na Xzona</b>. Cada abandono também <b>tira XP</b> (-${XP_PUNICAO.abandono}; -${XP_PUNICAO.abandono + XP_PUNICAO.suspensaoAbandono} na suspensão) e pode rebaixar seu cargo.</p>
    <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn peq amarelo" id="sx-fica">Continuar no debate</button><button class="btn peq vermelho" id="sx-sai">Abandonar</button></div>`,
  (el, fechar) => { $('#sx-fica', el).onclick = fechar; $('#sx-sai', el).onclick = () => { fechar(); sairSala(); }; });
}
let perfilT = null;
function sincronizarPerfil() { if (!E.sala || E.sala.fase !== 'lobby') return; clearTimeout(perfilT); perfilT = setTimeout(() => socket.emit('perfil', perfilEnvio(), r => r?.erro && toast(r.erro, 'erro')), 250); }

// ======================= RENDER: telas =======================
function ir(tela) { sfx.clique(); E.tela = tela; E.prova = null; $$('.sob-av').forEach(b => b.remove()); if (tela === 'personalizar' || tela === 'loja') { est.setVitrine(E.perfil.avatar); est.setModo('vitrine'); } else if (!emJogo()) est.setModo('menu'); renderUI(); }
function renderUI() {
  if (E.demo) return;
  const ui = $('#ui'), hud = $('#hud');
  if (emJogo()) { ui.innerHTML = ''; hud.hidden = false; renderHUD(); return; }
  hud.hidden = true; E.hudKey = '';
  if (E.sala && E.tela !== 'personalizar' && E.tela !== 'loja') E.tela = 'sala';
  if (!E.sala && E.conta && !E.conta.cadastro) { telaCadastro(ui); return; }
  const fn = { menu: telaMenu, jogar: telaJogar, salas: telaSalas, personalizar: telaPersonalizar, ranking: telaRanking, config: telaConfig, sala: telaSala, loja: telaDaLoja, fanpage: telaFanpage }[E.tela] || telaMenu;
  if (!E.sala) est.setJogadores(bots(), null);
  atualizarLED();
  fn(ui);
}
/** Seta do botão voltar em SVG: centralizada e grossa (o caractere ← fica fino e fora do centro). */
const SETA_VOLTAR = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 5l-7 7 7 7"/></svg>';
const topo = (titulo, voltar = 'menu') => `<div class="topo"><button class="voltar" data-ir="${voltar}" title="Voltar">${SETA_VOLTAR}</button><h1>${titulo}</h1><div style="width:58px"></div></div>`;
function ligarIr(el) { $$('[data-ir]', el).forEach(b => b.onclick = () => ir(b.dataset.ir)); }

function telaMenu(ui) {
  const p = E.perfil, nv = cargo(E.conta?.xp || 0);
  ui.innerHTML = `<div class="tela menu">
    <div class="versao">${VERSAO}</div>
    <div class="perfil-chip" id="perfil-chip" title="Ver carreira política"><img class="av" src="${ret(p.avatar)}"><img class="brasao-chip" src="${brasao(nv.n)}" alt="${nv.nome}"><div><b>${esc(p.nome || 'Sem nome')}</b><small>${nv.nome} · ${fmtN(nv.xp)} XP</small><div class="nivel"><div style="width:${nv.pct}%"></div></div></div>
      <div class="moedas" id="moedas-chip">🪙 ${fmtN(E.conta?.moedas ?? 0)}</div></div>
    <div>
      <div class="logo-txt"><span>DEBATE</span><b>PRESIDENCIAL</b><i>ONLINE</i></div>
      ${E.conta?.cadastro ? `<div class="nome-box painel" style="margin-top:28px;padding:12px">
        <div style="flex:1;min-width:0"><b style="font-size:18px">${esc(E.conta.cadastro.nome)}</b><br><small class="mut">@${esc(E.conta.cadastro.user)} · Xzona</small></div>
        <button class="btn peq" id="nome-trocar">✎ Alterar</button>
      </div>` : ''}
      ${!contextoSeguro ? `<p class="painel" style="margin-top:12px;font-size:14px;max-width:460px">⚠ Endereço sem HTTPS: o microfone fica bloqueado aqui. Use <b>localhost</b> ou o link https gerado pelo <b>JOGAR-ONLINE.bat</b>. Ainda dá para jogar digitando.</p>` : ''}
      ${!temReconhecimento ? `<p class="painel" style="margin-top:12px;font-size:14px;max-width:460px">⚠ Este navegador não transcreve voz. Use o <b>Google Chrome</b> ou o <b>Edge</b>.</p>` : ''}
      ${E.campeao ? `<div class="painel campeao-mes">${E.campeao.avatar ? `<img src="${ret(E.campeao.avatar)}">` : '<span style="font-size:34px">🏆</span>'}<div><small>🏆 Campeão do mês · ${esc(nomeMes(E.campeao.mes))}</small><b>${esc(E.campeao.nome)}</b><small>${fmtN(E.campeao.pts)} pts${E.campeao.vitorias ? ` · ${E.campeao.vitorias} vitórias` : ''}</small></div></div>` : ''}
      ${E.topXz?.length ? `<div class="painel top-xz"><div class="top-xz-tit"><span class="xz-logo">Xzona</span> Mais seguidos</div>${E.topXz.map((f, i) => `<div class="top-xz-l"><span class="pos">${['🥇', '🥈', '🥉'][i] || i + 1}</span>${htmlBrasao(f.nivel, 20)}<b>${esc(f.nome)}</b><small>@${esc(f.user)}</small><span class="seg">${fmtN(f.seguidores)}</span>${btnXz(f.user)}</div>`).join('')}</div>` : ''}
      ${E.conta && !E.conta.fanpage ? `<div class="painel fp-banner"><span style="font-size:26px">📱</span><span style="flex:1">Crie sua <b>fanpage na Xzona</b>: ganhe seguidores a cada debate e mostre suas melhores falas.</span><button class="btn peq amarelo" data-a="fanpage">Criar</button></div>` : ''}
    </div>
    <div class="menu-col">
      <button class="btn amarelo" data-a="jogar"><i class="ic">▶</i>JOGAR</button>
      <button class="btn" data-a="salas"><i class="ic">🏛️</i>SALAS</button>
      <button class="btn" data-a="fanpage"><i class="ic">📱</i>MINHA FANPAGE${E.conta?.fanpage ? ` <small style="opacity:.7">· ${fmtN(E.conta.fanpage.seguidores)}</small>` : ''}</button>
      <button class="btn" data-a="personalizar"><i class="ic">👤</i>PERSONALIZAR</button>
      <button class="btn" data-a="ranking"><i class="ic">🏆</i>RANKING</button>
      <button class="btn" id="btn-niveis"><i class="ic"><img src="${brasao(nv.n)}" style="width:28px;height:28px;vertical-align:middle"></i>NÍVEIS <small style="opacity:.7">· ${nv.nome}</small></button>
      <button class="btn" data-a="loja"><i class="ic">🛒</i>LOJA</button>
      <button class="btn" data-a="config"><i class="ic">⚙️</i>CONFIGURAÇÕES</button>
    </div></div>`;
  $('#nome-trocar') && ($('#nome-trocar').onclick = janelaTrocarNome);
  if (!(Date.now() - (E.topXzT || 0) < 60000)) { E.topXzT = Date.now(); socket.emit('topXzona', null, l => { const mudou = JSON.stringify(l) !== JSON.stringify(E.topXz); E.topXz = l || []; if (mudou && E.tela === 'menu') renderUI(); }); }
  if (E.campeao === undefined) { E.campeao = null; socket.emit('campeao', null, c => { E.campeao = c || null; if (c && E.tela === 'menu') renderUI(); }); }
  $('#perfil-chip', ui).onclick = $('#btn-niveis', ui).onclick = janelaCarreira;
  $$('[data-a]', ui).forEach(b => b.onclick = () => { if (b.dataset.a === 'jogar' && !exigirNome()) return; if (b.dataset.a === 'personalizar') E.persVoltar = 'menu'; ir(b.dataset.a); });
}
function telaJogar(ui) {
  ui.innerHTML = `<div class="tela">${topo('Jogar')}
    <div class="cards3">
      <div class="card-modo" id="c-rapida"><div class="ico">⚡</div><h3>Partida rápida</h3><p>Entre em uma sala pública com outros jogadores automaticamente.</p></div>
      <div class="card-modo" id="c-criar"><div class="ico">👥</div><h3>Criar sala</h3><p>Crie uma sala personalizada e convide seus amigos.</p></div>
      <div class="card-modo"><div class="ico">🚪</div><h3>Entrar na sala</h3><p>Digite o código da sala para entrar.</p>
        <input class="campo" id="c-cod" maxlength="5" placeholder="CÓDIGO"><button class="btn amarelo peq" id="c-entrar" style="width:100%">ENTRAR</button></div>
      <div class="card-modo ia"><div class="ico">🤖</div><h3>Contra a IA</h3><p>Debata sozinho contra candidatos controlados pelo computador.</p>
        <div class="cfg-linha"><span>Adversários</span><div class="seletor"><button data-n="-1">‹</button><span id="ia-n">${E.iaN || 2}</span><button data-n="1">›</button></div></div>
        <div class="cfg-linha" style="border:0"><span>Dificuldade</span><div class="seletor"><button data-d="-1">‹</button><span id="ia-d">${DIFICULDADES[E.iaD || 'medio']}</span><button data-d="1">›</button></div></div>
        <button class="btn verde peq" id="c-ia" style="width:100%">▶ JOGAR</button></div>
    </div></div>`;
  ligarIr(ui);
  E.iaN ||= 2; E.iaD ||= 'medio';
  const difs = Object.keys(DIFICULDADES);
  $$('[data-n]', ui).forEach(b => b.onclick = e => { e.stopPropagation(); E.iaN = Math.max(1, Math.min(4, E.iaN + +b.dataset.n)); $('#ia-n').textContent = E.iaN; sfx.clique(); });
  $$('[data-d]', ui).forEach(b => b.onclick = e => { e.stopPropagation(); E.iaD = difs[Math.max(0, Math.min(2, difs.indexOf(E.iaD) + +b.dataset.d))]; $('#ia-d').textContent = DIFICULDADES[E.iaD]; sfx.clique(); });
  $('#c-ia').onclick = () => { if (exigirNome()) socket.emit('criarSolo', { n: E.iaN, dif: E.iaD, perfil: perfilEnvio() }, tratar); };
  $('#c-rapida').onclick = partidaRapida; $('#c-criar').onclick = criarSala;
  const ent = () => { const c = $('#c-cod').value.trim(); if (c.length < 4) return toast('Digite o código da sala.', 'erro'); entrarSala(c); };
  $('#c-entrar').onclick = ent; $('#c-cod').onkeydown = e => { if (e.key === 'Enter') ent(); };
}
function telaSalas(ui) {
  ui.innerHTML = `<div class="tela">${topo('Salas públicas')}<div class="painel" style="max-width:720px;width:100%;margin:0 auto"><div id="lista-salas" class="lista-jog"><p class="mut">Carregando…</p></div>
    <div style="display:flex;gap:10px;margin-top:14px"><button class="btn peq" id="s-atual">↻ Atualizar</button><button class="btn peq amarelo" id="s-criar">+ Criar sala pública</button></div></div></div>`;
  ligarIr(ui);
  const carregar = () => socket.emit('salasPublicas', null, lista => {
    const el = $('#lista-salas'); if (!el) return;
    el.innerHTML = lista.length ? lista.map(s => `<div class="jog"><div class="nome"><b>Sala #${esc(s.code)}</b><small>Anfitrião: ${esc(s.host || '?')}</small></div><span class="chip">${s.n}/5</span><button class="btn peq amarelo" data-c="${esc(s.code)}">Entrar</button></div>`).join('')
      : '<p class="mut">Nenhuma sala pública aberta agora. Crie uma ou use a Partida rápida!</p>';
    $$('[data-c]', el).forEach(b => b.onclick = () => entrarSala(b.dataset.c));
  });
  carregar(); $('#s-atual').onclick = carregar;
  $('#s-criar').onclick = () => { if (exigirNome()) socket.emit('criar', { publica: true, perfil: perfilEnvio() }, tratar); };
}
/** Barra fixa de botões embaixo do avatar da vitrine (acompanha a posição dele na tela). */
function sobAvatar(html, id) {
  const el = document.createElement('div'); el.className = 'sob-av'; if (id) el.id = id; el.innerHTML = html; document.body.append(el);
  const seguir = () => { if (!el.isConnected) return; el.style.left = est.xVitrine() + 'px'; requestAnimationFrame(seguir); }; seguir();
  return el;
}
/** Confirma e compra um item da loja; no sucesso chama aoComprar() antes do renderUI. */
function comprarItemConfirmado(id, aoComprar) {
  const it = ITEM[id]; janela(`<h2>${it.emoji} ${esc(it.nome)}</h2><p>Comprar por <b>🪙 ${it.preco}</b>? Seu saldo: 🪙 ${fmtN(E.conta?.moedas || 0)}.</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn peq" id="cx">Cancelar</button><button class="btn peq amarelo" id="ok">Comprar</button></div>`,
    (el, fechar) => { $('#cx', el).onclick = fechar; $('#ok', el).onclick = () => { fechar(); socket.emit('comprarItem', { uid: UID, item: id }, r => { if (r?.erro) return toast(r.erro, 'erro'); atualizarConta(r.conta); sfx.vitoria(); toast('Compra concluída!', 'ok'); aoComprar?.(); renderUI(); }); }; });
}
function telaDaLoja(ui) {
  const voltar = E.sala ? 'sala' : 'menu';
  if (!E.lojaInfo && !E.lojaPedindo) { E.lojaPedindo = true; socket.emit('lojaInfo', null, i => { E.lojaPedindo = false; E.lojaInfo = i; if (E.tela === 'loja') renderUI(); }); }
  const pos = r => { if (r?.erro) return toast(r.erro, 'erro'); atualizarConta(r.conta); sfx.vitoria(); toast('Compra concluída!', 'ok'); renderUI(); };
  telaLoja(ui, {
    conta: E.conta, info: E.lojaInfo, aba: E.lojaAba, topo: topo('Loja', voltar), avatar: E.perfil.avatar,
    vestir: id => { E.perfil.avatar = { ...E.perfil.avatar, ...ITEM[id].av, ...ITEM[id].cores }; salvar(); est.setVitrine(E.perfil.avatar); sincronizarPerfil(); toast(`Você está vestindo: ${ITEM[id].nome}!`, 'ok'); renderUI(); },
    mudarAba: a => { E.lojaAba = a; sfx.clique(); renderUI(); },
    comprarPacote: id => { const p = E.lojaInfo?.pacotes.find(x => x.id === id); janela(`<h2>Confirmar compra</h2><p>${esc(p.nome)} (${p.dicas} dica(s)) por <b>🪙 ${p.preco}</b>?</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn peq" id="cx">Cancelar</button><button class="btn peq amarelo" id="ok">Comprar</button></div>`,
      (el, fechar) => { $('#cx', el).onclick = fechar; $('#ok', el).onclick = () => { fechar(); socket.emit('comprar', { uid: UID, pacote: id }, pos); }; }); },
    comprarMoedas: id => {
      const p = PACOTES_MOEDAS.find(x => x.id === id); if (!p) return;
      if (!E.lojaInfo?.pixAtivo) return toast('Pagamentos ainda não estão configurados neste servidor.', 'erro');
      let mail = ''; try { mail = localStorage.getItem('emailPix') || ''; } catch { /* sem storage */ }
      janela(`<h2>${p.emoji} ${esc(p.nome)}</h2><p><b>🪙 ${fmtN(p.moedas + p.bonus)}</b> por <b>${reais(p.reais)}</b> via PIX.</p>
        <label class="mut">E-mail para o comprovante</label><input id="em" type="email" value="${esc(mail)}" placeholder="voce@email.com" style="width:100%;margin:6px 0 12px">
        <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn peq" id="cx">Cancelar</button><button class="btn peq amarelo" id="ok">Gerar PIX</button></div>`,
      (el, fechar) => { $('#cx', el).onclick = fechar; $('#ok', el).onclick = () => {
        const email = $('#em', el).value.trim(); try { localStorage.setItem('emailPix', email); } catch { /* sem storage */ }
        $('#ok', el).disabled = true;
        socket.emit('pagarPix', { uid: UID, pacote: id, email }, r => {
          $('#ok', el).disabled = false; if (r?.erro) return toast(r.erro, 'erro'); fechar();
          janela(`<h2>Pague com PIX · ${reais(r.reais)}</h2>${r.qrImg ? `<img src="data:image/png;base64,${r.qrImg}" alt="QR Code PIX" style="display:block;width:220px;margin:0 auto;background:#fff;padding:8px;border-radius:8px">` : ''}
            <p class="mut" style="text-align:center">Escaneie o QR ou use o PIX copia e cola:</p><textarea id="cc" readonly rows="3" style="width:100%;font-size:.75em">${esc(r.qr || '')}</textarea>
            <p id="st" style="text-align:center">⏳ Aguardando pagamento…</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn peq" id="cp">Copiar código</button><button class="btn peq" id="fx">Fechar</button></div>`,
          (el2, fechar2) => {
            $('#fx', el2).onclick = fechar2; $('#cp', el2).onclick = () => { navigator.clipboard?.writeText(r.qr || ''); toast('Código PIX copiado!', 'ok'); };
            const t = setInterval(() => { if (!el2.isConnected) return clearInterval(t);
              socket.emit('statusPix', { uid: UID, id: r.id }, s => {
                if (s?.creditado) { clearInterval(t); atualizarConta(s.conta); sfx.vitoria(); toast(`+🪙 ${fmtN(s.moedas)} na sua conta!`, 'ok'); fechar2(); renderUI(); }
                else if (['rejected', 'cancelled', 'expired'].includes(s?.status)) { clearInterval(t); $('#st', el2).textContent = '❌ Pagamento não concluído. Gere um novo PIX.'; }
              }); }, 5000);
          });
        }); }; }); },
    comprarItem: id => comprarItemConfirmado(id),
    equipar: id => socket.emit('equiparDanca', { uid: UID, item: id }, r => { if (r?.erro) return toast(r.erro, 'erro'); atualizarConta(r.conta); toast('Dança equipada para a sua vitória!', 'ok'); renderUI(); }),
    testar: id => {
      const it = ITEM[id], tela = $('#ui .tela'); tela.style.transition = 'opacity .3s'; tela.style.opacity = 0; tela.style.pointerEvents = 'none';
      const compra = it.preco > 0 && !(GRATIS.includes(id) || E.conta?.itens?.includes(id));
      const bt = sobAvatar(`<button class="btn" data-x>✕ Parar</button>${compra ? `<button class="btn amarelo" data-ok>🛒 Comprar · 🪙 ${fmtN(it.preco)}</button>` : ''}`);
      const roupa = !!it.av; if (roupa) est.setVitrine({ ...E.perfil.avatar, ...it.av, ...it.cores }); // prova o acessório/conjunto
      let tm; const som = roupa ? null : somItem(id); const fim = () => { clearTimeout(tm); som?.pause?.(); bt.remove(); est.pararVitrine(); if (roupa) est.setVitrine(E.perfil.avatar); tela.style.opacity = 1; tela.style.pointerEvents = ''; };
      $('[data-x]', bt).onclick = fim; if (compra) $('[data-ok]', bt).onclick = () => { fim(); comprarItemConfirmado(id); };
      const ms = est.testarNaVitrine(it); tm = setTimeout(fim, ms || (it.tipo === 'danca' ? 6000 : roupa ? 8000 : 4500)); // ação: o tempo da demonstração (adversário reagindo)
    },
  });
  ligarIr(ui);
}
function telaFanpage(ui) {
  const fp = E.conta?.fanpage, editar = !fp || E.fpEditar, p = PARTIDO[E.perfil.partido];
  ui.innerHTML = `<div class="tela">${topo('Minha fanpage · Xzona')}<div class="painel scroll" style="max-width:640px;width:100%;margin:0 auto;flex:1">
    ${editar ? `<h2>${fp ? 'Editar fanpage' : 'Criar fanpage na Xzona'}</h2>
      <p class="mut" style="margin-top:-6px">Foi bem no debate? Ganha seguidores. Foi mal? Perde. Sua melhor fala de cada debate é publicada aqui, e os adversários podem ver sua página na sala de espera.</p>
      <p style="margin:0 0 10px">Seu @: <b>@${esc(E.conta?.cadastro?.user || '')}</b> <small class="mut">(alterar custa 🪙 ${fmtN(CADASTRO.precoUser)} no menu)</small></p>
      <label class="mut">Nome da página</label><input id="fp-nome" class="campo" maxlength="30" style="width:100%;margin:6px 0 12px" value="${esc(fp?.nome || E.perfil.nome || '')}" placeholder="Ex.: ${esc(E.perfil.nome || 'Candidato')} Presidente">
      <label class="mut">Bio</label><textarea id="fp-bio" class="campo" maxlength="140" rows="3" style="width:100%;margin:6px 0 12px" placeholder="Ex.: Candidato(a) à Presidência. Trabalho, saúde e educação. 🇧🇷">${esc(fp?.bio || '')}</textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end">${fp ? '<button class="btn peq" id="fp-cx">Cancelar</button>' : ''}<button class="btn peq amarelo" id="fp-ok">${fp ? 'Salvar' : '📱 Criar fanpage'}</button></div>`
    : `${htmlFanpage({ ...fp, autor: E.perfil.nome, partidas: E.conta.partidas || 0, vitorias: E.conta.vitorias || 0 }, { img: ret(E.perfil.avatar), partido: p ? `${p.sigla} ${p.numero}` : '' })}
      <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn peq" id="fp-ed">✎ Editar página</button></div>`}
  </div></div>`;
  ligarIr(ui);
  $('#fp-ed') && ($('#fp-ed').onclick = () => { E.fpEditar = true; renderUI(); });
  $('#fp-cx') && ($('#fp-cx').onclick = () => { E.fpEditar = false; renderUI(); });
  $('#fp-ok') && ($('#fp-ok').onclick = () => socket.emit('criarFanpage', { uid: UID, nome: $('#fp-nome').value, bio: $('#fp-bio').value }, r => {
    if (r?.erro) return toast(r.erro, 'erro');
    E.fpEditar = false; atualizarConta(r.conta); sfx.vitoria(); toast(fp ? 'Fanpage atualizada!' : 'Fanpage criada na Xzona!', 'ok'); renderUI();
  }));
}
// botão "ver fanpage na Xzona" por @ (ranking e mais seguidos do menu)
const btnXz = user => user ? `<button class="btn-xz" data-fpu="${esc(user)}" title="Ver página na Xzona"><span class="xz-logo">Xzona</span></button>` : '';
document.addEventListener('click', e => { const b = e.target.closest?.('[data-fpu]'); if (!b) return; e.stopPropagation(); sfx.clique();
  socket.emit('verFanpageUser', { user: b.dataset.fpu }, r => { if (!r?.fp) return toast('Fanpage indisponível.', 'erro'); const p = PARTIDO[r.partido];
    janelaFanpage(r.fp, { img: r.avatar ? ret(r.avatar) : '', partido: p ? `${p.sigla} ${p.numero}` : '' }); }); });
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = id => { const [a, m] = String(id || '').split('-'); return m ? `${MESES[+m - 1]} de ${a}` : ''; };
// ---------- ícones/arte do ranking (SVG inline) ----------
const svgI = (d, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`, F = 'fill="currentColor"', ESC = '#2a1a6e';
const ICR = {
  cal: svgI(`<rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3.5 9.5h17M8 2.8v4M16 2.8v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><g ${F}>${[7, 10.7, 14.4].flatMap(x => [12, 15.7].map(y => `<rect x="${x}" y="${y}" width="2.6" height="2.4" rx=".6"/>`)).join('')}</g>`),
  trofeu: svgI(`<path ${F} d="M7 3h10v2h3.5v2.5A4.5 4.5 0 0 1 16.3 12 5.5 5.5 0 0 1 13 14.6V17h3v2.5H8V17h3v-2.4A5.5 5.5 0 0 1 7.7 12 4.5 4.5 0 0 1 3.5 7.5V5H7zM5.5 7v.5a2.5 2.5 0 0 0 1.6 2.3A9 9 0 0 1 7 7zm13 0H17a9 9 0 0 1-.1 2.8 2.5 2.5 0 0 0 1.6-2.3z"/><rect x="6.5" y="20" width="11" height="2" rx="1" ${F}/>`),
  user: svgI(`<circle cx="12" cy="7.5" r="4.3" ${F}/><path d="M3.5 21a8.5 7.5 0 0 1 17 0z" ${F}/>`),
  alvo: svgI(`<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" ${F}/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" stroke="currentColor" stroke-width="2"/>`),
  controle: svgI(`<path ${F} d="M7 6h10a5 5 0 0 1 4.9 4l1 5.2a3 3 0 0 1-5.3 2.4L15.5 15h-7l-2.1 2.6a3 3 0 0 1-5.3-2.4l1-5.2A5 5 0 0 1 7 6z"/><path d="M7.5 8.8v4.4M5.3 11h4.4" stroke="${ESC}" stroke-width="1.8" stroke-linecap="round"/><circle cx="15.6" cy="9.8" r="1.25" fill="${ESC}"/><circle cx="17.9" cy="12.2" r="1.25" fill="${ESC}"/>`),
  pasta: svgI(`<rect x="2.5" y="7" width="19" height="13" rx="2.5" ${F}/><path d="M9 7V5.2a1.7 1.7 0 0 1 1.7-1.7h2.6A1.7 1.7 0 0 1 15 5.2V7" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5.5" y="10.5" width="5" height="6" rx="1" fill="${ESC}"/><path d="M13 12h5.5M13 15h4" stroke="${ESC}" stroke-width="1.7"/>`),
  barras: svgI(`<g ${F}><rect x="3" y="14" width="4" height="7" rx="1"/><rect x="10" y="9" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="17" rx="1"/></g>`),
  predio: svgI(`<path ${F} d="M12 2 2 7v2h20V7zM4 10.5h3v7H4zm6.5 0h3v7h-3zm6.5 0h3v7h-3zM2.5 19h19v2.5h-19z"/>`),
};
const CORES_LOURO = { ouro: ['#fff3a6', '#f5b70a', '#9a5b00'], prata: ['#ffffff', '#c3c6e6', '#6b6f9e'], bronze: ['#ffd9b8', '#d4844a', '#7c3f12'] };
/** Ramo de louro (abre para a direita, como "("); espelhar com CSS para o lado direito. */
function louroSVG(tipo = 'ouro', cls = 'louro') {
  const [c1, c2, c3] = CORES_LOURO[tipo], g = 'gl' + tipo, cx = 58, cy = 52, r = 42, pt = t => [cx + r * Math.cos(t * Math.PI / 180), cy + r * Math.sin(t * Math.PI / 180)];
  const folha = (t, lado) => { const [x, y] = pt(t), n = lado * 7, a = t * Math.PI / 180; return `<ellipse cx="${(x + n * Math.cos(a)).toFixed(1)}" cy="${(y + n * Math.sin(a)).toFixed(1)}" rx="9.5" ry="4.2" transform="rotate(${(t + 90 - lado * 35).toFixed(0)} ${(x + n * Math.cos(a)).toFixed(1)} ${(y + n * Math.sin(a)).toFixed(1)})"/>`; };
  const ts = [100, 122, 144, 166, 188, 210, 232]; const [x0, y0] = pt(80), [x1, y1] = pt(252);
  return `<svg class="${cls}" viewBox="0 0 64 104" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs>
    <g fill="url(#${g})" stroke="${c3}" stroke-width="1.2"><path d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>${ts.map(t => folha(t, 1) + folha(t + 9, -1)).join('')}<ellipse cx="${(x1 + 3).toFixed(1)}" cy="${(y1 - 5).toFixed(1)}" rx="4" ry="9" transform="rotate(30 ${(x1 + 3).toFixed(1)} ${(y1 - 5).toFixed(1)})"/></g></svg>`;
}
const COROA = `<svg class="coroa" viewBox="0 0 64 50" aria-hidden="true"><defs><linearGradient id="gcoroa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a6"/><stop offset=".5" stop-color="#facc15"/><stop offset="1" stop-color="#c26a05"/></linearGradient></defs><g stroke="#7a4b00" stroke-width="2.4" stroke-linejoin="round" fill="url(#gcoroa)"><path d="M8 40 4 13l15 12L32 6l13 19 15-12-4 27z"/><rect x="7" y="38" width="50" height="9" rx="3"/><circle cx="32" cy="6" r="3.6"/><circle cx="4" cy="13" r="3.2"/><circle cx="60" cy="13" r="3.2"/></g><circle cx="32" cy="30" r="4" fill="#ef4444" stroke="#7a1010" stroke-width="1.2"/><circle cx="19" cy="32" r="2.8" fill="#60a5fa"/><circle cx="45" cy="32" r="2.8" fill="#4ade80"/></svg>`;
const MOEDAS = `<svg class="moedas" viewBox="0 0 28 24" aria-hidden="true">${[[4,17],[4,12],[4,7],[13,15],[13,10]].map(([x,y]) => `<ellipse cx="${x+6}" cy="${y+3}" rx="6.5" ry="3" fill="#b45309"/><ellipse cx="${x+6}" cy="${y+1.6}" rx="6.5" ry="3" fill="#fcd34d" stroke="#b45309" stroke-width=".9"/>`).join('')}</svg>`;
const CONGRESSO = `<svg class="rank-congresso" viewBox="0 0 230 92" aria-hidden="true"><defs><linearGradient id="gcong" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4b8ff"/><stop offset="1" stop-color="#7b6be6"/></linearGradient></defs><g fill="url(#gcong)"><rect x="104" y="6" width="11" height="70" rx="1"/><rect x="120" y="6" width="11" height="70" rx="1"/><rect x="104" y="36" width="27" height="4"/><path d="M28 72a28 15 0 0 1 56 0z"/><path d="M150 54h72a36 15 0 0 1-72 0z"/><rect x="182" y="64" width="8" height="10"/><rect x="0" y="72" width="230" height="5" rx="2"/><rect x="14" y="79" width="206" height="3" rx="1.5" opacity=".6"/></g></svg>`;
function telaRanking(ui) {
  const per = E.rankPer ||= 'semana';
  ui.innerHTML = `<div class="tela">${topo('')}<div class="painel scroll rank-card">${CONGRESSO}
    <div class="rank-tit">${louroSVG('ouro')}<div><h2>RANKING</h2><div class="estrelas"><i></i>${'<b>★</b>'.repeat(4)}<i></i></div></div>${louroSVG('ouro', 'louro dir')}</div>
    <div class="rank-abas">${[['semana', 'cal', 'Semanal'], ['mes', 'cal', 'Mensal'], ['geral', 'trofeu', 'Geral']].map(([k, ic, t]) => `<button class="${k === per ? 'on' : ''}" data-per="${k}">${ICR[ic]}${t}</button>`).join('')}</div>
    <div class="rank-info"><span class="i">i</span><p id="rank-info"></p></div><div id="rank"><p class="mut" style="text-align:center">Carregando…</p></div></div></div>`;
  ligarIr(ui);
  $$('[data-per]', ui).forEach(b => b.onclick = () => { E.rankPer = b.dataset.per; sfx.clique(); renderUI(); });
  socket.emit('ranking', { periodo: per }, d => {
    const el = $('#rank'); if (!el || E.rankPer !== per) return;
    const lista = Array.isArray(d) ? d : d?.lista || [];
    const fimSem = d?.id && per === 'semana' ? new Date(new Date(d.id + 'T00:00').getTime() + 6 * 864e5).toLocaleDateString('pt-BR') : '';
    $('#rank-info').innerHTML = per === 'semana' ? `<u>Semana</u> até ${fimSem} (domingo). O 1º lugar ganha ${MOEDAS}<b>${fmtN(d?.premioSemanal || 0)} moedas</b> e o título de melhor candidato(a) da semana na Xzona.`
      : per === 'mes' ? `Ranking de <u>${esc(nomeMes(d?.id))}</u>. O 1º lugar ganha ${MOEDAS}<b>${fmtN(d?.premio || 0)} moedas</b>, fica em destaque no menu inicial e ganha o título de melhor candidato(a) do mês na Xzona.`
      : 'Pontuação acumulada de todos os tempos.';
    if (!lista.length) { el.innerHTML = '<p class="mut">Ninguém pontuou ainda neste período. Jogue uma partida para entrar no ranking!</p>'; return; }
    const img = r => r.avatar ? ret(r.avatar) : '';
    const top = [[lista[1], 2, 'prata'], [lista[0], 1, 'ouro'], [lista[2], 3, 'bronze']];
    const cargo = r => r.nivel ? CARGOS[r.nivel - 1].nome : '—', sigla = r => r.partido && PARTIDO[r.partido] ? PARTIDO[r.partido].sigla : '—';
    const fp = r => r.fp ? ` data-fpu="${esc(r.fp)}" title="Ver página na Xzona"` : ''; // clicar no candidato abre a fanpage
    el.innerHTML = `<div class="rank-podio">${top.map(([r, n, c]) => r ? `<div class="lugar ${c}${r.fp ? ' clic' : ''}"${fp(r)}><div class="foto">${n === 1 ? COROA : ''}${louroSVG(c, 'louro')}${louroSVG(c, 'louro dir')}<img src="${img(r)}"><span class="med">${n}º</span></div><div class="bloco"><div class="nm"><b>${esc(r.nome)}</b>${btnXz(r.fp)}</div><span>${fmtN(r.pts)} <small>pts</small></span></div></div>` : '').join('')}</div>
      <div class="rank-tab"><div class="cab"><span>#</span><span>${ICR.user}Candidato(a)</span><span>${ICR.alvo}Cargo</span><span>${ICR.controle}Partidas</span><span>${ICR.trofeu}Vitórias</span><span>${ICR.pasta}Sigla</span><span>${ICR.barras}Pontuação</span></div>
      ${lista.map((r, i) => `<div class="lin ${['ouro', 'prata', 'bronze'][i] || ''}"><span><em class="pos">${i + 1}º</em></span><span class="cand${r.fp ? ' clic' : ''}"${fp(r)}><img src="${img(r)}"><b>${esc(r.nome)}</b>${btnXz(r.fp)}</span><span class="cargo">${ICR.predio}${cargo(r)}</span><span>${ICR.controle}${r.partidas}</span><span class="vit">${ICR.trofeu}${r.vitorias}</span><span><em class="sig">${sigla(r)}</em></span><span><em class="pts">${fmtN(r.pts)} <small>pts</small></em></span></div>`).join('')}</div>`;
  });
}
function telaConfig(ui) {
  ui.innerHTML = `<div class="tela">${topo('Configurações')}<div class="painel" style="max-width:640px;width:100%;margin:0 auto" id="cfg-p"></div></div>`;
  ligarIr(ui); painelConfig($('#cfg-p', ui), renderUI);
}
/** Conteúdo das configurações (menu e engrenagem durante o debate). refazer = redesenha após trocar opção. */
function painelConfig(ui, refazer) {
  const c = E.cfg;
  ui.innerHTML = `
    <div class="cfg-linha"><span>Voz da mediadora</span><button class="toggle ${c.voz ? 'on' : ''}" id="t-voz"></button></div>
    <div class="cfg-linha"><span>Volume dos efeitos</span><input type="range" min="0" max="1" step=".05" value="${c.sfx}" id="t-sfx"></div>
    <div class="cfg-linha"><span>Som ambiente (plateia)</span><input type="range" min="0" max="1" step=".05" value="${c.ambiente}" id="t-amb"></div>
    <div class="cfg-linha"><span>Volume da música</span><input type="range" min="0" max="1" step=".05" value="${c.musica}" id="t-mus"></div>
    <div class="cfg-linha"><span>Resolução</span><select id="t-res" class="cfg-sel">${Object.entries(RESOLUCOES).map(([k, v]) => `<option value="${k}"${c.resolucao === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="cfg-linha"><span>Qualidade gráfica</span><div class="seletor"><button data-q="baixa">‹</button><span>${c.qualidade === 'alta' ? 'Alta (brilho e sombras)' : 'Baixa (mais leve)'}</span><button data-q="alta">›</button></div></div>
    <div class="cfg-linha"><span>Sensibilidade para olhar em volta</span><input type="range" min=".4" max="2" step=".1" value="${c.sens}" id="t-sens"></div>
    <div class="cfg-linha"><span>Mostrar nomes sobre os candidatos</span><button class="toggle ${c.nomes ? 'on' : ''}" id="t-nomes"></button></div>
    <div class="cfg-linha" style="border:0"><button class="btn peq amarelo" id="t-mic">🎙 Testar microfone</button><span id="t-mic-out" class="mut" style="flex:1;text-align:right;font-size:14px"></span></div>
    <p class="mut" style="font-size:13px;margin-bottom:0">Transcrição: ${temReconhecimento ? 'disponível' : 'indisponível neste navegador (use Chrome ou Edge)'} · Endereço ${contextoSeguro ? 'seguro ✔' : 'NÃO seguro (microfone bloqueado)'}</p>`;
  const g = () => { salvarConfig(c); est.cfg.sens = c.sens; est.cfg.nomes = c.nomes; };
  $('#t-voz', ui).onclick = () => { c.voz = !c.voz; g(); if (!c.voz) { calar(); pararNarracao(); } const s = $('#h-som'); if (s) s.textContent = c.voz ? '🔊' : '🔇'; refazer(); };
  $('#t-nomes', ui).onclick = () => { c.nomes = !c.nomes; g(); est.chaveJog = ''; est.setJogadores(E.sala ? E.sala.jogadores : bots(), E.eu); refazer(); };
  $('#t-sfx').oninput = e => { c.sfx = +e.target.value; setVolume(c.sfx); ajustarAmbiente(); g(); }; $('#t-sfx').onchange = () => sfx.vez();
  $('#t-amb').oninput = e => { c.ambiente = +e.target.value; setVolumeAmbiente(c.ambiente); g(); }; $('#t-amb').onchange = () => sfx.aplausos(1.2, .2);
  $('#t-mus').oninput = e => { c.musica = +e.target.value; setVolumeMusica(c.musica); g(); }; $('#t-mus').onchange = () => sfx.vinheta();
  $('#t-res').onchange = e => { c.resolucao = e.target.value; g(); aplicarResolucao(c.resolucao); est.setResolucao(c.resolucao); };
  $('#t-sens').oninput = e => { c.sens = +e.target.value; g(); };
  $$('[data-q]', ui).forEach(b => b.onclick = () => { c.qualidade = b.dataset.q; g(); est.setQualidade(c.qualidade); refazer(); });
  $('#t-mic').onclick = async () => { const o = $('#t-mic-out'); o.textContent = 'Fale algo agora (6 segundos)…'; $('#t-mic').disabled = true; const r = await testarMicrofone(6); if ($('#t-mic-out')) { o.innerHTML = (r.ok ? '✔ Ouvi: ' : '✖ ') + esc(r.msg); $('#t-mic').disabled = false; } };
}

function telaSala(ui) {
  const s = E.sala, host = ehHost(), me = eu();
  if (!s || !me) { ui.innerHTML = ''; return; }
  const linhaJorn = `<div class="jog vago"><span class="ok-ico">🎤</span><div class="av"></div><div class="nome"><b class="mut">Jornalista: IA (sorteado entre 10)</b><small>Conduz o debate e faz as perguntas</small></div></div>`;
  const cfg = s.cfg, durNome = { curto: 'Curto (30s)', normal: 'Normal (60s)', longo: 'Longo (90s)' };
  const todosProntos = s.jogadores.filter(j => j.conectado && j.id !== s.hostId).every(j => j.pronto);
  const podeIniciar = s.jogadores.filter(j => j.conectado).length >= 2 && todosProntos;
  const rasc = $('#sc-in')?.value || '', focado = document.activeElement?.id === 'sc-in'; // re-render a cada 'estado': preserva o que está sendo digitado
  const vagas = Array.from({ length: 5 - s.jogadores.length }, () => `<div class="jog vago"><span class="ok-ico">·</span><div class="av"></div><div class="nome"><b class="mut">Vaga livre</b><small>Convide um amigo</small></div></div>`).join('');
  ui.innerHTML = `<div class="tela">
    <div class="topo"><button class="voltar" id="sl-sair" title="Sair da sala">${SETA_VOLTAR}</button>
      <h1>Sala: <span class="codigo">#${esc(s.code)}</span> <button class="btn peq" id="sl-copiar" title="Copiar código">⧉</button></h1>
      <span class="chip ${s.publica ? 'verde' : 'amarelo'}">${s.publica ? 'Pública' : 'Privada'}</span><span class="chip">👤 ${s.jogadores.length}/5</span></div>
    <div class="sala-grid">
      <div class="painel scroll" style="display:flex;flex-direction:column">
        <h2>Jogadores</h2>
        <div class="lista-jog">${linhaJorn}${s.jogadores.map(j => {
          const p = PARTIDO[j.partido];
          return `<div class="jog ${j.id === E.eu ? 'eu' : ''}" style="${j.conectado ? '' : 'opacity:.5'}">
            <span class="ok-ico ${j.pronto || j.id === s.hostId ? 'on' : ''}">${j.pronto || j.id === s.hostId ? '✓' : '…'}</span>
            <img class="av" src="${ret(j.avatar)}">
            <div class="nome"><b>${htmlBrasao(j.nivel)}${esc(j.nome)}${j.id === s.hostId ? ' <span style="color:var(--amarelo)">(Anfitrião)</span>' : ''}${j.id === E.eu ? ' · você' : ''}</b>
              <small>${p ? `${p.sigla} ${p.numero} · ${IDEO[p.ideo].nome}` : ''} · ${esc(AV.generos[j.avatar.genero] || '')}</small></div>
            ${j.bot ? `<span class="chip ia">🤖 IA · ${DIFICULDADES[j.dif] || ''}</span>` : j.fanpage ? `<button class="chip fp-chip" data-fp="${j.id}" title="Ver fanpage na Xzona">📱 ${fmtN(j.fanpage.seguidores)}</button>` : ''}
            ${p ? `<img class="logo-p" src="${logoPartido(p.sigla, 80)}" title="${esc(p.nome)}">` : ''}
            ${host && j.id !== E.eu ? `<button class="btn peq vermelho" data-kick="${j.id}" title="Remover">✕</button>` : ''}
          </div>`;
        }).join('')}${vagas}</div>
        <div style="display:flex;gap:10px;margin-top:auto;padding-top:14px;flex-wrap:wrap">
          <button class="btn peq" id="sl-convite">🔗 Convidar amigos</button><button class="btn peq" id="sl-cod">⧉ Copiar código</button>
          <span class="mic-ind ${voip.transmitindo ? 'on' : ''}">${voip.stream ? (voip.transmitindo ? '🎙 Voz aberta: todos podem conversar' : '🔇 Microfone mudo') : '🎙 Chat de voz desligado'}</span>
          ${host && s.jogadores.length < 5 ? `<span style="flex:1"></span><div class="seletor"><button data-bd="-1">‹</button><span>${DIFICULDADES[E.iaD || 'medio']}</span><button data-bd="1">›</button></div><button class="btn peq verde" id="sl-bot">🤖 + Candidato IA</button>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;min-height:0">
        <div class="painel">
          <h2>Debate presidencial</h2>
          <div class="cfg-linha"><span>🧱 Blocos</span><b>3 (propostas, confronto, finais)</b></div>
          <div class="cfg-linha"><span>⏱ Tempo por resposta</span>${host ? `<div class="seletor"><button data-dur="-1">‹</button><span>${durNome[cfg.dur]}</span><button data-dur="1">›</button></div>` : `<b>${durNome[cfg.dur]}</b>`}</div>
          <div class="cfg-linha"><span>🗺 Temas</span><b>Sorteados dos 27 estados</b></div>
          <div class="cfg-linha"><span>⌨ Permitir respostas digitadas</span><button class="toggle ${cfg.permitirTexto ? 'on' : ''}" data-tg="permitirTexto" ${host ? '' : 'disabled'}></button></div>
          <div class="cfg-linha"><span>👏 Reações dos candidatos</span><button class="toggle ${cfg.reacoes ? 'on' : ''}" data-tg="reacoes" ${host ? '' : 'disabled'}></button></div>
          <div class="cfg-linha" style="border:0"><span>🌐 Sala pública</span><button class="toggle ${s.publica ? 'on' : ''}" data-tg="publica" ${host ? '' : 'disabled'}></button></div>
        </div>
        <div style="display:flex;gap:10px"><button class="btn" id="sl-pers" style="flex:1">👤 Personalizar</button><button class="btn" id="sl-loja" style="flex:1">🛒 Loja</button></div>
        ${host ? `<button class="btn verde grande" id="sl-iniciar" ${podeIniciar ? '' : 'disabled'}>▶ INICIAR PARTIDA</button>
          <p class="mut" style="margin:0;text-align:center;font-size:14px">${s.jogadores.filter(j => j.conectado).length < 2 ? 'Mínimo de 2 candidatos para começar.' : todosProntos ? 'Tudo pronto!' : 'Aguardando todos ficarem prontos…'}</p>`
          : `<button class="btn ${me.pronto ? '' : 'verde'} grande" id="sl-pronto">${me.pronto ? '✓ PRONTO! (cancelar)' : 'ESTOU PRONTO'}</button>`}
      </div>
      <div class="painel sala-chat"><h2>💬 Chat da sala</h2><div class="sc-lista" id="sc-lista">${(s.chat || []).map(m => { const j = s.jogadores.find(x => x.id === m.id);
        return `<div class="sc-msg ${m.id === E.eu ? 'eu' : ''}">${j ? `<img src="${ret(j.avatar)}">` : ''}<div><b>${esc(m.nome)}</b> ${esc(m.texto)}</div></div>`; }).join('') || '<p class="mut" style="margin:auto;font-size:13px">Ninguém falou ainda. Diga oi! 👋</p>'}</div>
        <form class="sc-form" id="sc-form"><input id="sc-in" maxlength="200" placeholder="Escreva uma mensagem…" autocomplete="off"><button class="btn peq amarelo">Enviar</button></form></div>
    </div></div>`;
  const scl = $('#sc-lista'), sci = $('#sc-in'); scl.scrollTop = scl.scrollHeight; sci.value = rasc; if (focado) sci.focus();
  $('#sc-form').onsubmit = e => { e.preventDefault(); const texto = sci.value.trim(); if (!texto) return;
    socket.emit('chatSala', { texto }, r => r?.erro ? toast(r.erro, 'erro') : (($('#sc-in') || {}).value = '')); };
  $('#sl-sair').onclick = sairSala;
  const link = location.origin + '/?sala=' + s.code;
  const copiar = (t, msg) => { navigator.clipboard?.writeText(t).then(() => toast(msg, 'ok'), () => toast(t)); };
  $('#sl-copiar').onclick = $('#sl-cod').onclick = () => copiar(s.code, 'Código copiado: ' + s.code);
  $('#sl-convite').onclick = () => copiar(link, 'Link de convite copiado!');
  $('#sl-pers').onclick = () => { E.persVoltar = 'sala'; ir('personalizar'); };
  $('#sl-loja').onclick = () => ir('loja');
  $$('[data-kick]', ui).forEach(b => b.onclick = () => socket.emit('expulsar', b.dataset.kick));
  $$('[data-fp]', ui).forEach(b => b.onclick = () => { const j = s.jogadores.find(x => x.id === b.dataset.fp), p = PARTIDO[j?.partido]; sfx.clique();
    socket.emit('verFanpage', { id: b.dataset.fp }, fp => janelaFanpage(fp, { img: j ? ret(j.avatar) : '', partido: p ? `${p.sigla} ${p.numero}` : '' })); });
  $$('[data-bd]', ui).forEach(b => b.onclick = () => { const d = Object.keys(DIFICULDADES); E.iaD = d[Math.max(0, Math.min(2, d.indexOf(E.iaD || 'medio') + +b.dataset.bd))]; sfx.clique(); renderUI(); });
  $('#sl-bot') && ($('#sl-bot').onclick = () => { socket.emit('addBot', { dif: E.iaD || 'medio' }, r => r?.erro && toast(r.erro, 'erro')); sfx.clique(); });
  $$('[data-dur]', ui).forEach(b => b.onclick = () => { const o = ['curto', 'normal', 'longo']; const i = Math.max(0, Math.min(2, o.indexOf(cfg.dur) + +b.dataset.dur)); socket.emit('cfg', { dur: o[i] }); sfx.clique(); });
  $$('[data-tg]', ui).forEach(b => b.onclick = () => { const k = b.dataset.tg; socket.emit('cfg', { [k]: k === 'publica' ? !s.publica : !cfg[k] }); sfx.clique(); });
  $('#sl-iniciar') && ($('#sl-iniciar').onclick = () => socket.emit('iniciar', null, r => r?.erro && toast(r.erro, 'erro')));
  $('#sl-pronto') && ($('#sl-pronto').onclick = () => { socket.emit('pronto', !me.pronto); sfx.clique(); });
}

// ---------- personalização ----------
const ABAS = { aparencia: '👤 Aparência', roupas: '👔 Roupas', acessorios: '👓 Acessórios', expressoes: '🙂 Expressões', partido: '🏛 Partido' };
/** Item mais barato da loja que libera avatar[campo] = valor, se o jogador ainda não o tem (senão undefined). */
const bloqueio = (campo, valor) => { const ids = itensDe(campo, valor); if (!ids.length || ids.some(id => (GRATIS.includes(id) || E.conta?.itens?.includes(id)))) return; return ids.map(id => ITEM[id]).sort((x, y) => x.preco - y.preco)[0]; };
const ICONE_ROUPA = { terno: '🤵', terno_aberto: '🧥', blazer: '💼', saia: '👗', social: '👔', colete: '🦺', polo: '👕', batina: '⛪', pastor: '📖' };
/** O que a prova veste por cima do avatar salvo (conjunto = peça inteira; acessório = só o campo). */
const provaAv = p => p.it.tipo === 'conjunto' ? { ...p.it.av, ...p.it.cores } : { [p.campo]: p.valor };
/** Vitrine da personalização: avatar salvo + item em prova (nunca gravado no perfil antes da compra). */
const vitrinePers = () => est.setVitrine(E.prova ? { ...E.perfil.avatar, ...provaAv(E.prova) } : E.perfil.avatar);
const reRenderPers = () => { const sc = $('.pers-conteudo')?.scrollTop; renderPersConteudo(); const el = $('.pers-conteudo'); if (el) el.scrollTop = sc; };
const desfazerProva = () => { if (!E.prova) return; E.prova = null; vitrinePers(); };
function comprarProva() {
  const p = E.prova; if (!p) return;
  comprarItemConfirmado(p.it.id, () => { E.prova = null; E.perfil.avatar = { ...E.perfil.avatar, ...provaAv(p) }; salvar(); est.setVitrine(E.perfil.avatar); sincronizarPerfil(); });
}
function setAv(campo, valor) {
  const it = bloqueio(campo, valor);
  if (it) { E.prova = { campo, valor, it }; vitrinePers(); sfx.clique(); return reRenderPers(); } // prova no lugar, sem ir para a Loja
  E.prova = null;
  E.perfil.avatar = { ...E.perfil.avatar, [campo]: valor };
  if (campo === 'genero') { // ajustes de praxe ao trocar o sexo (tudo pode ser alterado depois)
    const a = E.perfil.avatar;
    if (valor !== 'masculino') a.barba = 'nenhuma';
    if (valor === 'masculino') { // visual masculino de verdade: sem brinco, sem saia, sem cabelo comprido
      a.brinco = false;
      if (a.roupa === 'saia' || a.roupa === 'blazer') a.roupa = 'terno';
      if (['longo', 'chanel', 'coque'].includes(a.cabelo)) a.cabelo = 'curto';
    }
    if (valor === 'feminino' && ['careca', 'calvo', 'topete'].includes(a.cabelo)) a.cabelo = 'longo';
  }
  salvar(); est.setVitrine(E.perfil.avatar); sincronizarPerfil(); sfx.clique(); reRenderPers();
}
function telaPersonalizar(ui) {
  vitrinePers(); est.setModo('vitrine');
  ui.innerHTML = `<div class="tela">${topo('Personalizar candidato', E.persVoltar)}
    <div class="pers">
      <div class="pers-esq">
        <div class="painel" style="display:flex;gap:10px;align-items:center;padding:10px">
          <input id="p-nome" class="campo" maxlength="20" value="${esc(E.perfil.nome)}" placeholder="Nome do candidato" readonly title="Para mudar o nome, use ✎ Alterar no menu (custa moedas)">
          <button class="btn peq amarelo" id="p-rand">🎲 Aleatório</button>
        </div>
        <span class="chip">🖱 Arraste o boneco para girar</span>
      </div>
      <div class="painel pers-dir">
        <div class="abas">${Object.entries(ABAS).map(([k, v]) => `<button class="aba ${E.persAba === k ? 'on' : ''}" data-aba="${k}">${v}</button>`).join('')}</div>
        <div class="pers-conteudo"></div>
      </div>
    </div></div>`;
  ligarIr(ui);
  $$('[data-aba]', ui).forEach(b => b.onclick = () => { E.persAba = b.dataset.aba; desfazerProva(); sfx.clique(); $$('[data-aba]', ui).forEach(x => x.classList.toggle('on', x === b)); renderPersConteudo(); });
  $('#p-rand').onclick = () => { E.prova = null; E.perfil.avatar = avatarAleatorio(E.perfil.avatar.genero); salvar(); est.setVitrine(E.perfil.avatar); sincronizarPerfil(); sfx.sorteio(); renderPersConteudo(); };
  renderPersConteudo();
}
function renderPersConteudo() {
  const el = $('.pers-conteudo'); if (!el) return; const a = E.perfil.avatar, pv = E.prova;
  const prov = (campo, v) => pv && pv.campo === campo && pv.valor === v ? 'provando' : '';
  const cores = (campo, lista) => `<div class="cores">${lista.map(c => `<button class="cor ${a[campo] === c ? 'on' : ''} ${prov(campo, c)}" style="background:${c}" data-c="${campo}" data-v="${c}"></button>`).join('')}</div>`;
  const tiles = (campo, opcoes, comRetrato = true, icones) => `<div class="grade">${Object.entries(opcoes).map(([v, nome]) => { const it = bloqueio(campo, v);
    return `<button class="opc ${a[campo] === v ? 'on' : ''} ${it ? 'bloq' : ''} ${prov(campo, v)}" data-c="${campo}" data-v="${v}" ${it ? `title="${esc(it.nome)} · 🪙 ${it.preco}"` : ''}>${comRetrato ? `<img src="${ret({ ...a, [campo]: v })}">` : icones ? `<i class="opc-ico">${icones[v] || '✨'}</i>` : ''}<span>${esc(nome)}</span>${it ? `<small class="opc-preco">🔒 🪙 ${it.preco}</small>` : ''}</button>`; }).join('')}</div>`;
  const tg = (campo, nome) => `<div class="cfg-linha"><span>${nome}</span><button class="toggle ${a[campo] ? 'on' : ''}" data-t="${campo}"></button></div>`;
  const g = (t, c) => `<div class="grupo"><h4>${t}</h4>${c}</div>`;
  let h = '';
  switch (E.persAba) {
    case 'aparencia': h = g('Sexo', tiles('genero', AV.generos)) + g('Cor da pele', cores('pele', AV.peles)) + g('Cabelo', tiles('cabelo', AV.cabelos)) + g('Cor do cabelo', cores('corCabelo', AV.coresCabelo)) + g('Tipo físico', tiles('corpo', { magro: 'Magro', medio: 'Médio', largo: 'Largo' }, false)); break;
    case 'roupas': h = g('Traje', tiles('roupa', AV.roupas, false, ICONE_ROUPA)) + g('Cor do paletó / roupa', cores('corRoupa', AV.coresRoupa)) + g('Cor da camisa', cores('corCamisa', AV.coresCamisa)) + g('Cor da gravata / boné', cores('corGravata', AV.coresGravata)); break;
    case 'acessorios': h = g('Óculos', tiles('oculos', AV.oculos)) + g('Chapéu', tiles('chapeu', AV.chapeus)) + g('Extras', tiles('extra', AV.extras)) + g('Barba', tiles('barba', AV.barbas)) + g('Detalhes', tg('broche', 'Broche verde-amarelo na lapela') + tg('brinco', 'Brincos')); break;
    case 'expressoes': h = g('Expressão padrão', tiles('expressao', { simpatico: 'Simpático', serio: 'Sério', confiante: 'Confiante', bravo: 'Bravo' })) + '<p class="mut" style="font-size:13px">A boca se mexe sozinha quando você fala no microfone.</p>'; break;
    case 'partido': {
      const ocupados = new Set((E.sala?.jogadores || []).filter(j => j.id !== E.eu).map(j => j.partido));
      h = `<p class="mut" style="margin-top:0;font-size:14px">Partidos fictícios. O partido define seu espectro político, e o eleitor espera um discurso coerente com ele.</p>
        <div class="partidos">${PARTIDOS.map(p => `<button class="partido ${E.perfil.partido === p.sigla ? 'on' : ''}" data-p="${p.sigla}" ${ocupados.has(p.sigla) ? 'disabled title="Já escolhido na sala"' : ''} style="background:linear-gradient(160deg,${p.cor},${p.cor}cc 60%,#1a1052)">
          <img src="${logoPartido(p.sigla, 116)}"><b>${p.sigla} · ${p.numero}</b><small>${esc(p.nome)}</small><span class="chip" style="font-size:11px">${IDEO[p.ideo].nome}</span><small class="lema">“${esc(p.lema)}”</small></button>`).join('')}</div>`;
    }
  }
  if (pv) h = `<div class="prova"><div class="prova-txt">👀 Provando: <b>${pv.it.emoji} ${esc(pv.it.nome)}</b> · 🪙 ${pv.it.preco}${pv.it.tipo === 'conjunto' ? `<small>Este item é parte do ${esc(pv.it.nome)}: a compra inclui todas as peças.</small>` : ''}</div>
    <button class="btn peq" id="pv-x">↺ Desfazer</button><button class="btn peq amarelo" id="pv-ok">🛒 Comprar</button></div>` + h;
  el.innerHTML = h;
  if (pv) { $('#pv-x', el).onclick = () => { sfx.clique(); desfazerProva(); reRenderPers(); }; $('#pv-ok', el).onclick = comprarProva; }
  $('#prova-av')?.remove(); // botão de compra embaixo do avatar enquanto prova
  if (pv) { const b = sobAvatar(`<button class="btn amarelo" data-ok>🛒 Comprar ${esc(pv.it.nome)} · 🪙 ${fmtN(pv.it.preco)}</button>`, 'prova-av'); $('[data-ok]', b).onclick = comprarProva; }
  $$('[data-c]', el).forEach(b => b.onclick = () => setAv(b.dataset.c, b.dataset.v));
  $$('[data-t]', el).forEach(b => b.onclick = () => setAv(b.dataset.t, !a[b.dataset.t]));
  $$('[data-p]', el).forEach(b => b.onclick = () => { E.perfil.partido = b.dataset.p; salvar(); sincronizarPerfil(); sfx.clique(); renderPersConteudo(); });
}

// ======================= HUD do jogo =======================
function renderHUD() {
  const hud = $('#hud');
  if (!$('#h-topo')) {
    hud.innerHTML = `
      <div class="hud-topo" id="h-topo"><div class="hud-box hud-bloco" id="h-bloco"></div><div class="hud-box hud-tema" id="h-tema"></div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end"><div class="hud-box hud-tempo" id="h-tempo"></div><button class="btn peq p" id="h-pular" hidden>Pular ▶</button></div></div>
      <div class="coluna-dir"><div class="perguntas p" id="h-perg"></div><div class="lateral p" id="h-lateral"></div></div>
      <div class="legenda" id="h-legenda"></div>
      <div class="acao p" id="h-acao"></div>
      <div class="botoes-esq p" id="h-botoes">
        <div class="painel painel-jog" id="h-jog" hidden></div>
        <button class="regras-b" id="h-regras-b" title="Regras do debate">⚖ REGRAS DO DEBATE<span id="h-adv"></span></button>
        <div class="reacoes" id="h-reacoes">${[['aplauso', '👏'], ['risada', '😂'], ['pensativo', '🤔'], ['vaia', '👎'], ['mao', '✋']].map(([t, e]) => `<button data-r="${t}" title="${t}">${e}</button>`).join('')}</div>
        <div style="display:flex;gap:10px"><button class="redondo" id="h-jog-b" title="Jogadores no debate">👥</button><button class="redondo" id="h-emotes-b" title="Emotes, danças e provocações">😀</button><button class="redondo" id="h-mudo" title="Chat de voz: mudo / aberto">🎙</button>
          <button class="redondo" id="h-ajuda-b" title="Como jogar">?</button><button class="redondo" id="h-som" title="Voz da mediadora">${E.cfg.voz ? '🔊' : '🔇'}</button><button class="redondo" id="h-cfg" title="Configurações">⚙</button><button class="redondo" id="h-sair" title="Sair da partida">⏏</button></div>
      </div>
      <div class="painel painel-emotes p" id="h-emotes" hidden></div>
      <div class="dica-olhar" id="h-dica">${CELULAR ? '👆 Arraste o dedo na tela para olhar em volta' : '🖱 Segure o botão esquerdo e arraste para olhar em volta · ← → ↑ ↓ também funcionam'}</div>
      <div id="h-result"></div>
      <div class="ajuda p" id="h-ajuda" hidden><div class="painel"><h2>Como jogar</h2>
        <p>🎙 Na sua vez, clique no <b>microfone</b> (ou no <b>botão vermelho</b> do seu púlpito, ou aperte <b>V</b>) e fale. A fala é transcrita ao vivo para todos.</p>
        <p>⏱ O tempo começa quando você liga o microfone ou começa a digitar. Se você não começar, ele começa sozinho.</p>
        <p>🔒 Ao <b>confirmar</b> (botão verde ou Ctrl+Enter) ou quando o tempo acaba, a fala é travada e não dá mais para editar.</p>
        <p>⚔ No confronto, escolha o adversário clicando no <b>púlpito</b> dele. O tema é sorteado entre os 27 estados.</p>
        <p>📊 Os comentaristas avaliam: foco no tema (cite o estado e o problema), propostas concretas (metas, números), apelo ao eleitor e uso do tempo. Seu vocabulário mostra se você soa mais à esquerda ou à direita. Ataques animam os extremos, mas afastam o centro.</p>
        <p>🗳 No fim, a apuração segue o sistema brasileiro: mais de 50% dos votos válidos vence no 1º turno; se ninguém passar disso, há 2º turno.</p>
        <button class="btn amarelo" id="h-ajuda-x">Entendi</button></div></div>
      <div class="ajuda p" id="h-regras" hidden><div class="painel regras-painel"><h2>⚖ Regras do debate</h2>
        ${REGRAS_DEBATE.map(([t, c]) => `<p><b>${t}</b><br>${c}</p>`).join('')}
        <p class="mut" style="font-size:13px">Estas regras fazem parte dos Termos de Uso que você aceitou ao entrar no jogo.</p>
        <button class="btn amarelo" id="h-regras-x">Entendi</button></div></div>`;
    $$('[data-r]', hud).forEach(b => b.onclick = () => socket.emit('reacao', b.dataset.r));
    // emotes / danças / provocações (itens da loja)
    const EM_ABAS = [['acao', '💥', 'Ações'], ['emote', '😀', 'Emotes'], ['danca', '💃', 'Danças'], ['provocacao', '😈', 'Provocar']];
    $('#h-emotes-b').onclick = (ev, manter) => {
      const p = $('#h-emotes'); if (!manter) p.hidden = !p.hidden; if (p.hidden) return;
      const tem = id => (GRATIS.includes(id) || E.conta?.itens?.includes(id)), aba = E.emAba ||= 'emote';
      const bt = (i, at) => `<button ${at}="${i.id}" class="${tem(i.id) ? '' : 'bloq'}${E.acoesUsadas?.has(i.id) ? ' usada' : ''}" title="${esc(i.nome)}${tem(i.id) ? '' : ' (compre na loja)'}"><span>${i.emoji}</span><small>${esc(i.nome)}</small>${tem(i.id) ? '' : `<span class="em-preco">🔒 ${fmtN(i.preco)}</span>`}</button>`;
      const espera = Math.max(0, ACAO_ESPERA_MS - (Date.now() - (E.ultAcao || 0))), sEsp = Math.ceil(espera / 1000), mmss = `${sEsp / 60 | 0}:${String(sEsp % 60).padStart(2, '0')}`;
      const lista = ITENS.filter(i => i.tipo === aba).sort((a, b) => tem(b.id) - tem(a.id) || a.preco - b.preco), meus = lista.filter(i => tem(i.id)).length;
      const info = aba === 'acao' ? (espera ? `⏳ próxima em ${mmss}` : '1× por debate') : aba === 'danca' ? 'também na vitória' : '';
      p.innerHTML = `<div class="em-abas">${EM_ABAS.map(([k, e, n]) => `<button data-aba="${k}" class="${k === aba ? 'ativa' : ''}">${e}<small>${n}</small></button>`).join('')}</div>
        <div class="em-sub"><span>${meus}/${lista.length} liberados</span><span class="mut">${info}</span></div>
        <div class="em-grade">${lista.map(i => bt(i, aba === 'acao' ? 'data-ac' : 'data-em')).join('') || '<div class="em-vazio">Nada aqui ainda.</div>'}</div>`;
      $$('[data-aba]', p).forEach(b => b.onclick = e => { e.stopPropagation(); E.emAba = b.dataset.aba; $('#h-emotes-b').onclick(null, true); });
      $$('[data-em]', p).forEach(b => b.onclick = () => { if (!tem(b.dataset.em)) return toast(`"${ITEM[b.dataset.em].nome}" está na Loja por 🪙 ${ITEM[b.dataset.em].preco}.`); socket.emit('emote', b.dataset.em, r => r?.erro && toast(r.erro, 'erro')); p.hidden = true; });
      // ação: escolhe o alvo (outro candidato) na lista
      $$('[data-ac]', p).forEach(b => b.onclick = () => {
        const it = ITEM[b.dataset.ac]; if (!tem(it.id)) return toast(`"${it.nome}" está na Loja por 🪙 ${it.preco}.`);
        if (E.acoesUsadas?.has(it.id)) return toast(`Você já usou "${it.nome}" neste debate.`, 'erro');
        const alvos = (E.sala?.jogadores || []).filter(j => j.id !== E.eu && !j.banido && !j.saiu);
        const obs = it.reacao === 'amor' ? '💐 Gesto de carinho: rende simpatia do eleitor e alguns seguidores.'
          : `⚠ Agressão pesa na votação: afasta eleitores moderados, vira assunto no Xzona e você será vaiado(a) na próxima fala${it.adv ? '. Vale advertência da mediação!' : '.'} Se a vítima estiver falando, ganha +15 s.`;
        p.innerHTML = `<div class="em-tit">${it.emoji} ${esc(it.nome)}: em quem?</div><div class="em-obs">${obs}</div><div class="em-grade">${alvos.map(j => `<button data-alvo="${j.id}" class="em-alvo"><img src="${retrato(j.avatar)}"><small>${esc(j.nome)}</small></button>`).join('')}<button data-volta class="em-alvo">↩<small>Voltar</small></button></div>`;
        $('[data-volta]', p).onclick = e => { e.stopPropagation(); $('#h-emotes-b').onclick(null, true); };
        $$('[data-alvo]', p).forEach(a => a.onclick = () => { p.hidden = true; socket.emit('acao', { item: it.id, alvo: a.dataset.alvo }, r => { if (r?.erro) return toast(r.erro, 'erro'); E.ultAcao = Date.now(); (E.acoesUsadas ||= new Set()).add(it.id); }); });
      });
    };
    // painel "Jogadores no debate" (abre acima dos botões; Esc / clique fora / ✕ fecha)
    $('#h-jog-b').onclick = () => { sfx.clique(); abrirJogadores($('#h-jog').hidden); };
    $('#h-jog').onwheel = e => e.stopPropagation();
    addEventListener('keydown', e => { if (e.key === 'Escape' && $('#h-jog') && !$('#h-jog').hidden) { e.preventDefault(); abrirJogadores(false); } });
    addEventListener('pointerdown', e => { const pj = $('#h-jog'); if (pj && !pj.hidden && !pj.contains(e.target) && !$('#h-jog-b').contains(e.target) && !e.target.closest?.('.janela-fundo')) abrirJogadores(false); }, true);
    $('#h-mudo').onclick = () => { voip.setMudo(!voip.mudo); $('#h-mudo').textContent = voip.mudo ? '🔇' : '🎙'; toast(voip.mudo ? 'Seu microfone do chat de voz está mudo.' : 'Chat de voz ativo (você só transmite quando é a sua vez).'); };
    $('#h-pular').onclick = () => socket.emit('avancar');
    $('#h-ajuda-b').onclick = () => { $('#h-ajuda').hidden = false; }; $('#h-ajuda-x').onclick = () => { $('#h-ajuda').hidden = true; };
    $('#h-regras-b').onclick = () => { $('#h-regras').hidden = false; }; $('#h-regras-x').onclick = () => { $('#h-regras').hidden = true; };
    $('#h-som').onclick = () => { E.cfg.voz = !E.cfg.voz; salvarConfig(E.cfg); if (!E.cfg.voz) { calar(); pararNarracao(); } $('#h-som').textContent = E.cfg.voz ? '🔊' : '🔇'; };
    $('#h-sair').onclick = confirmarSaida;
    $('#h-cfg').onclick = () => janela(`<h2>⚙ Configurações</h2><div id="cfg-p"></div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn peq amarelo" id="cfg-x">Fechar</button></div>`, (el, fechar) => {
      const p = $('#cfg-p', el), refazer = () => painelConfig(p, refazer); refazer(); $('#cfg-x', el).onclick = fechar; });
    const esconderDica = () => { const d = $('#h-dica'); if (d) d.style.opacity = 0; };
    $('#cena').addEventListener('pointerdown', esconderDica, { once: true }); setTimeout(esconderDica, 9000);
  }
  const s = E.sala, p = s.passo, res = s.fase === 'resultado';
  $('#h-reacoes').style.display = s.cfg.reacoes ? '' : 'none';
  // topo
  $('#h-topo').style.display = res ? 'none' : '';
  if (!res && p) {
    $('#h-bloco').innerHTML = p.t2 ? `2º TURNO<small>${p.etapa === 2 ? 'Confronto · tema livre' : ETAPAS[p.etapa - 1]}</small>` : `BLOCO ${p.etapa}/3<small>${ETAPAS[p.etapa - 1]}</small>`;
    if (!s.roleta) $('#h-tema').innerHTML = s.temaAtual ? `<small>Tema atual · ${esc(TEMA[s.temaAtual].estado)}</small><b><span class="uf">${TEMA[s.temaAtual].uf}</span>${esc(TEMA[s.temaAtual].titulo)}</b>`
      : `<small>Debate presidencial</small><b>${p.tipo === 'cumprimento' ? 'Cumprimentos' : p.tipo === 'pesquisa' ? 'Pesquisa relâmpago' : p.kind === 'final' ? 'Considerações finais' : ETAPAS[p.etapa - 1]}</b>`;
    const pu = s.pular, mim = eu(), bp = $('#h-pular'); // pular animação: todos os jogadores precisam concordar (n/total)
    bp.hidden = !(pu && mim && !mim.banido && !mim.saiu);
    if (pu) { const votei = pu.ids.includes(E.eu); bp.textContent = `${votei ? '✓ ' : ''}Pular ▶ ${pu.n}/${pu.total}`; bp.classList.toggle('votado', votei); bp.title = votei ? 'Aguardando os outros jogadores' : 'Todos precisam concordar para pular'; }
  }
  renderLateral(); renderPerguntas(); renderJogadores(); atualizarLegenda(); renderAcao(); renderResultado(); tick();
}
function abrirJogadores(abrir) { const el = $('#h-jog'); if (!el) return; el.hidden = !abrir; $('#h-jog-b').classList.toggle('on', abrir); E.jogKey = null; renderJogadores(); }
// lista dos candidatos da sala: retrato | nome + partido | cargo | Xzona
function renderJogadores() {
  const el = $('#h-jog'); if (!el || el.hidden || !E.sala) return;
  const lista = E.sala.jogadores.filter(j => !j.banido).sort((a, b) => !!a.saiu - !!b.saiu || a.slot - b.slot);
  const k = JSON.stringify(lista.map(j => [j.id, j.nome, j.partido, j.conectado, j.nivel, !!j.fanpage, j.bot, j.avatar, j.saiu, E.denAband?.has(j.id)]));
  if (k === E.jogKey) return; E.jogKey = k;
  const rol = $('.jl-lista', el)?.scrollTop || 0;
  el.innerHTML = `<div class="jl-topo"><b>👥 Jogadores no debate <span class="mut">(${lista.filter(j => !j.saiu).length})</span></b><button class="jl-x" title="Fechar (Esc)">✕</button></div><div class="jl-lista">${lista.map(j => {
    const p = PARTIDO[j.partido], c = CARGOS[(j.nivel || 0) - 1], saiu = !!j.saiu, off = !saiu && !j.bot && !j.conectado && j.id !== E.eu, fp = !j.bot && j.fanpage, jaDen = E.denAband?.has(j.id);
    return `<div class="jl ${off ? 'off' : ''} ${saiu ? 'saiu' : ''}"><img class="av" src="${ret(j.avatar)}" alt="">
      <div class="jl-info"><b><span>${esc(j.nome)}</span>${!j.bot && j.id !== E.eu && !saiu ? `<button class="jl-den" data-den="${j.id}" title="Denunciar ${esc(j.nome)}">🚩</button>` : ''}</b><small><i style="background:${p?.cor || '#888'}"></i>${p ? `${p.sigla} · ${p.numero}` : ''}${j.id === E.eu ? ' · você' : ''}${off ? ' · <span class="jl-off">desconectado</span>' : ''}</small>
      ${saiu ? `<small class="jl-saiu">🚪 Abandonou a partida · retirado(a) do debate</small>${!j.bot && j.id !== E.eu && !E.sala.jogadores.find(x => x.id === E.eu)?.saiu ? `<button class="jl-denab" data-denab="${j.id}" ${jaDen ? 'disabled' : ''}>${jaDen ? '✔ Denunciado por abandono' : '🚩 Denunciar por abandono'}</button>` : ''}` : ''}</div>
      <div class="jl-cargo">${j.bot ? '<span class="chip ia">🤖 IA</span>' : c ? `${htmlBrasao(c.n, 28)}<span>${c.nome}</span>` : ''}</div>
      <button class="jl-xz" data-xz="${j.id}" ${fp ? 'title="Ver perfil na Xzona"' : 'disabled title="sem fanpage"'}><span class="xz-logo">Xzona</span></button></div>`; }).join('')}</div>`;
  const lst = $('.jl-lista', el); lst.scrollTop = rol;
  $('.jl-x', el).onclick = () => abrirJogadores(false);
  $$('[data-den]', el).forEach(b => b.onclick = () => { const j = jog(b.dataset.den); if (!j) return; sfx.clique(); // denúncia direto daquele jogador
    janelaDenuncia([j], d => socket.emit('denunciar', d, r => r?.erro ? toast(r.erro, 'erro') : toast('Denúncia enviada aos administradores. Obrigado!', 'ok'))); });
  $$('[data-denab]', el).forEach(b => b.onclick = () => { const j = jog(b.dataset.denab); if (!j || b.disabled) return; sfx.clique();
    if (!confirm(`Denunciar ${j.nome} por abandono de debate?\n\nCom mais de 4 denúncias de jogadores diferentes no mesmo dia, o jogador fica suspenso por 1 hora.`)) return;
    socket.emit('denunciarAbandono', { alvo: j.id }, r => { if (r?.erro) return toast(r.erro, 'erro'); (E.denAband ||= new Set()).add(j.id); E.jogKey = null; renderJogadores();
      toast(r.ban ? `${j.nome} atingiu 5 denúncias por abandono hoje e foi suspenso(a) por 1 hora.` : 'Denúncia por abandono registrada. Obrigado!', 'ok'); }); });
  $$('[data-xz]', el).forEach(b => b.onclick = () => { if (b.disabled) return; const j = jog(b.dataset.xz), p = PARTIDO[j?.partido]; sfx.clique();
    if (E.demo) return toast('Demo: fanpage indisponível offline.');
    socket.emit('verFanpage', { id: b.dataset.xz }, fp => fp && j ? janelaFanpage(fp, { img: ret(j.avatar), partido: p ? `${p.sigla} ${p.numero}` : '' }) : toast('Fanpage indisponível.', 'erro')); });
}
// painel minimizável com as perguntas da mediação e dos adversários
function renderPerguntas() {
  const el = $('#h-perg'); if (!el) return;
  const s = E.sala, lista = s.fase === 'debate' ? (s.perguntas || []) : [];
  const aj = E.pergAjuda ||= new Set();
  const k = lista.length + '-' + (E.pergFechado ? 1 : 0) + '-' + (lista.at(-1)?.texto?.length || 0) + '-' + [...aj].join(',');
  if (k === E.pergKey) return; E.pergKey = k;
  if (!lista.length) { el.innerHTML = ''; return; }
  const rot = { proposta: 'Proposta', pergunta: 'Pergunta', resposta: 'Resposta', replica: 'Réplica', treplica: 'Tréplica', final: 'Considerações finais' };
  const itens = lista.slice().reverse().map(x => {
    const praMim = x.para === E.eu, para = jog(x.para)?.nome || '';
    const tit = x.mediador ? `🎙 ${esc(x.de)} → ${esc(para)} · ${rot[x.kind] || ''}` : `⚔ ${esc(x.de)} → ${esc(para)} · ${x.kind === 'replica' ? 'Réplica' : 'Pergunta'}`;
    const t = x.tema && TEMA[x.tema], id = x.n + x.kind + x.para, res = x.mediador && t?.resumo;
    const ajuda = res ? `<button class="perg-ajuda ${aj.has(id) ? 'on' : ''}" data-aj="${esc(id)}" title="Resumo do tema">?</button>` : '';
    return `<div class="perg ${praMim ? 'minha' : ''} ${x.mediador ? '' : 'adv'}">${ajuda}<small>${tit}${t ? ` · ${t.uf}` : ''}</small><div>${esc(x.texto)}</div>${res && aj.has(id) ? `<div class="perg-resumo"><b>${esc(t.titulo)}</b> ${esc(t.resumo)}</div>` : ''}</div>`;
  }).join('');
  const rol = $('.perg-lista', el)?.scrollTop || 0; // mantém a rolagem ao atualizar
  el.innerHTML = `<div class="hud-box"><button class="perg-tog" id="h-perg-t">📋 Perguntas (${lista.length}) <span>${E.pergFechado ? '▸' : '▾'}</span></button>${E.pergFechado ? '' : `<div class="perg-lista">${itens}</div>`}</div>`;
  const lst = $('.perg-lista', el); if (lst) { lst.scrollTop = rol; lst.onwheel = e => e.stopPropagation(); }
  $('#h-perg-t').onclick = () => { E.pergFechado = !E.pergFechado; E.pergKey = null; renderPerguntas(); };
  el.querySelectorAll('.perg-ajuda').forEach(b => b.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); const id = b.dataset.aj; aj.has(id) ? aj.delete(id) : aj.add(id); renderPerguntas(); });
}
function renderLateral() {
  const s = E.sala, p = s.passo, el = $('#h-lateral'); if (!el) return;
  let k = '', h = '';
  if (s.fase === 'debate' && p?.tipo === 'pesquisa' && p.poll) {
    k = 'poll' + s.i; const max = Math.max(...p.poll.map(x => x.pct));
    h = `<div class="hud-box"><h2 style="font-family:var(--titulo);font-weight:400;margin:4px 0 8px">📊 ${esc(p.titulo)}</h2>${p.poll.map(x => { const j = jog(x.id), pp = PARTIDO[j?.partido]; return `<div class="barra-p"><div class="l"><span style="display:flex;align-items:center;gap:6px"><img class="av" src="${ret(j.avatar)}">${esc(j.nome)}</span><b>${fmtP(x.pct)}</b></div><div class="b"><div data-w="${x.pct / max * 100}" style="width:0;background:${pp?.cor}"></div></div></div>`; }).join('')}<small class="mut">Votos válidos · margem de 2 p.p.</small></div>`;
  } else if (s.fase === 'debate' && p?.tipo === 'fala' && s.fala?.status === 'avaliado' && s.fala.res) {
    k = 'nota' + s.i; const r = s.fala.res, j = jog(p.falante), mine = p.falante === E.eu;
    const nv = v => v >= .67 ? 'verde' : v < .34 ? 'vermelho' : '';
    const dots = v => '●'.repeat(Math.round(v * 3)) + '○'.repeat(3 - Math.round(v * 3));
    const chips = [`<span class="chip">${r.wc} palavras</span>`, `<span class="chip ${nv(r.relevancia)}">Foco no tema ${dots(r.relevancia)}</span>`, `<span class="chip ${nv(r.concretude)}">Propostas ${dots(r.concretude)}</span>`,
      `<span class="chip ${nv(r.apelo)}">Apelo ${dots(r.apelo)}</span>`, `<span class="chip ${nv(r.extensao)}">Tempo ${dots(r.extensao)}</span>`];
    if (r.lean !== null) chips.push(`<span class="chip">Soou ${r.lean < -.6 ? 'à esquerda' : r.lean > .6 ? 'à direita' : 'ao centro'}</span>`);
    if (r.ataque) chips.push(`<span class="chip vermelho">Ataques: ${r.ataque}${r.danoEm.length ? ' → ' + r.danoEm.map(id => esc(jog(id)?.nome)).join(', ') : ''}</span>`);
    if (r.fugiu) chips.push('<span class="chip vermelho">Fugiu da pergunta</span>');
    if (r.xingamentos?.length) chips.push(`<span class="chip vermelho">Ofensa (nota reduzida): ${esc(r.xingamentos.join(', '))}</span>`);
    if (r.vaiado) chips.push(`<span class="chip vermelho">Vaiado(a) pela agressão (${ITEM[r.vaiado]?.emoji || ''} nota −0,4)</span>`);
    if (r.banido) chips.push('<span class="chip vermelho">🚫 Banido pela moderação</span>');
    if (r.rebateu) chips.push('<span class="chip verde">Rebateu bem</span>');
    if (r.vicios) chips.push(`<span class="chip vermelho">Vícios: ${r.vicios}</span>`);
    const dicas = [];
    if (mine) {
      if (r.wc < 5) dicas.push('Praticamente não houve fala.');
      else { if (r.extensao < .4) dicas.push('Aproveite melhor o tempo.'); if (r.relevancia < .34 && p.tema) dicas.push(TEMA[p.tema].uf === 'BR' ? 'Cite o problema do tema e um dado real.' : `Cite ${TEMA[p.tema].estado} e o problema do tema.`); if (r.concretude < .34) dicas.push('Traga metas e números: “vou criar…”.'); if (r.apelo < .34) dicas.push('Fale com o eleitor: famílias, futuro, “você”.'); }
    }
    h = `<div class="hud-box"><small class="mut">COMENTARISTAS · ${esc(j?.nome)}</small><div style="display:flex;align-items:baseline;gap:8px"><span class="nota-grande">${r.nota.toFixed(1)}</span><span class="mut">/ 10</span></div>
      <div class="chips">${chips.join('')}</div>${dicas.length ? `<small class="mut">${dicas.map(esc).join('<br>')}</small>` : ''}</div>`;
  }
  if (k === E.latKey) return; E.latKey = k; el.innerHTML = h;
  requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]', el).forEach(b => b.style.width = b.dataset.w + '%')));
}
function atualizarLegenda() {
  const el = $('#h-legenda'); if (!el || !E.sala) return;
  const s = E.sala, p = s.passo;
  if (s.fase !== 'debate') { el.innerHTML = ''; return; }
  let quem = s.jorn?.nome || JORN, txt = E.legAcao?.ate > Date.now() ? E.legAcao.t : s.textoJ, gc = '';
  if (p?.tipo === 'fala' && s.fala && s.fala.status !== 'pronto') { quem = jog(p.falante)?.nome || ''; txt = p.falante === E.eu ? E.meuTexto : (E.textoFala || s.fala.texto || ''); if (!txt) txt = '…';
    const pp = PARTIDO[jog(p.falante)?.partido];
    if (pp) gc = `<span class="gc" style="--c:${pp.cor};--c2:${pp.cor2}"><img src="${logoPartido(pp.sigla, 40)}"><span class="gc-num">${pp.numero}</span><b>${pp.sigla}</b> ${esc(pp.nome)} <i>${IDEO[pp.ideo].nome}</i></span>`; }
  const cauda = txt.length > 260 ? '…' + txt.slice(-260) : txt;
  el.innerHTML = `<span class="quem">${esc(quem)}</span>${gc}<div class="txt">${esc(cauda)}</div>`;
}
function renderAcao(forcar) {
  const el = $('#h-acao'); if (!el) return;
  const s = E.sala, p = s.passo, f = s.fala;
  const adv = eu()?.adv || 0, ba = $('#h-adv'); if (ba) { ba.textContent = adv ? ` · ⚠ ${adv}/${PUNICAO.advertencias}` : ''; ba.parentElement.classList.toggle('alerta', adv > 0); }
  let k = 'nada';
  if (s.fase === 'debate' && p) {
    if (p.tipo === 'escolha') k = p.falante === E.eu && !p.escolhido ? 'escolha' : 'escolha-outro' + !!p.escolhido;
    else if (p.tipo === 'fala' && f) k = p.falante === E.eu ? `meu-${f.status}-${E.micOn}-${E.confirmando}-${!!E.micErro}-${micLiberado()}` : `outro-${p.falante}-${f.status}`;
    else if (p.tipo === 'cumprimento') k = 'cumpr' + !!s.autoEm;
  }
  k += s.i;
  if (k === E.hudKey && !forcar) return; E.hudKey = k;
  const nome = id => esc(jog(id)?.nome || '');
  const podeDigitar = s.cfg.permitirTexto || !temReconhecimento || !contextoSeguro;
  if (eu()?.banido && s.fase === 'debate') { if (E.hudKey !== 'banido') { E.hudKey = 'banido'; el.innerHTML = '<div class="hud-box" style="text-align:center;border-color:var(--vermelho)">🚫 Você foi retirado do debate pela moderação. Acompanhe a disputa até o fim.</div>'; } return; }
  if (k.startsWith('nada')) { el.innerHTML = ''; return; }
  if (k.startsWith('cumprfalse')) { el.innerHTML = '<div class="hud-box" style="text-align:center">🎙️ A mediação está abrindo o debate…</div>'; return; }
  if (k.startsWith('cumpr')) { if (E.cumprAnun !== s.i) { E.cumprAnun = s.i; anunciar('CUMPRIMENTEM-SE!'); sfx.vez(); } el.innerHTML = `<div class="hud-box" style="text-align:center">🤝 <b>Cumprimentem-se!</b> Microfones abertos para todos. O debate começa em <b id="h-cump">${Math.max(0, Math.ceil(((s.autoEm || 0) - agora()) / 1000))}s</b></div>`; return; }
  if (k.startsWith('escolha-outro')) { el.innerHTML = `<div class="hud-box" style="text-align:center">⚔ <b>${nome(p.falante)}</b> ${p.escolhido ? `vai perguntar para <b>${nome(p.escolhido.alvo)}</b>` : 'está escolhendo o adversário…'}</div>`; return; }
  if (k.startsWith('escolha')) {
    el.innerHTML = `<div class="hud-box escolha" style="text-align:center"><b style="font-family:var(--titulo);font-weight:400;font-size:22px">⚔ ESCOLHA SEU ADVERSÁRIO</b><div class="mut" style="font-size:14px">Clique no púlpito dele (ele pisca em amarelo) ou escolha aqui:</div>
      <div class="alvos">${s.jogadores.filter(j => j.id !== E.eu && !j.banido && !j.saiu).map(j => { const ok = !p.elegiveis || p.elegiveis.includes(j.id); return `<button data-alvo="${j.id}" ${ok ? '' : 'disabled title="Já recebeu pergunta nesta rodada"'}><img class="av" src="${ret(j.avatar)}">${esc(j.nome)} · ${PARTIDO[j.partido]?.sigla}${ok ? '' : ' · já respondeu'}</button>`; }).join('')}</div></div>`;
    $$('[data-alvo]', el).forEach(b => b.onclick = () => escolherAlvo(b.dataset.alvo)); return;
  }
  if (k.startsWith('outro')) {
    const j = jog(p.falante);
    el.innerHTML = `<div class="hud-box" style="display:flex;align-items:center;gap:12px;justify-content:center"><img class="av" src="${ret(j.avatar)}"><span><b>${esc(j.nome)}</b> ${f.status === 'pronto' ? 'vai começar a falar…' : f.status === 'avaliado' ? 'terminou a fala.' : 'está falando. Ouça e prepare sua resposta!'}</span></div>`; return;
  }
  // minha vez
  if (f.status === 'avaliado') { el.innerHTML = `<div class="hud-box" style="text-align:center">🔒 Fala registrada. Veja ao lado a avaliação dos comentaristas.</div>`; return; }
  if (E.confirmando || f.status === 'encerrando') { el.innerHTML = `<div class="hud-box" style="text-align:center">⏳ Finalizando sua fala…</div>`; return; }
  const ativo = f.status === 'ativo';
  const status = !ativo ? (micLiberado() ? `🎤 <b>SUA VEZ!</b> O tempo começa quando você falar ou digitar. <span id="h-auto" class="mut"></span>` : `🎙 <b>SUA VEZ</b> — aguarde a mediação terminar de falar…`)
    : E.micOn ? `<span class="rec"></span><span id="h-micst">Ligando o microfone…</span><span class="vu"><div id="h-vu"></div></span>`
      : E.micErro ? `⚠ ${esc(E.micErro)}` : podeDigitar ? '⌨ Modo digitação: o tempo está correndo. Ligue o microfone quando quiser.' : '🎙 Ligue o microfone para falar.';
  el.innerHTML = `<div class="hud-box">
    <div class="status">${status}</div>
    <div class="acao-linha">
      <button class="mic ${E.micOn ? 'on' : 'off'}" id="h-mic" title="Microfone (V)" ${!ativo && !micLiberado() ? 'disabled' : ''}>${E.micOn ? '⏸' : '🎙'}</button>
      ${podeDigitar ? `<textarea id="h-ta" class="${E.micOn ? 'gravando' : ''}" ${E.micOn ? 'readonly' : ''} placeholder="${ativo ? 'Digite sua fala…' : 'Clique no microfone para falar, ou comece a digitar…'}">${esc(E.meuTexto)}</textarea>` : `<div style="flex:1" class="mut">${esc(E.meuTexto) || 'Sua fala aparece aqui…'}</div>`}
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn verde" id="h-ok" ${ativo ? '' : 'disabled'} title="Confirmar (Ctrl+Enter)">✔ CONFIRMAR</button>
        <button class="btn peq amarelo" id="h-dica-b" title="Consultar a assessoria">📝 Dica ${E.dicasGratis > 0 ? `(${E.dicasGratis} grátis)` : E.conta?.dicasExtra ? `(estoque ${E.conta.dicasExtra})` : '(🪙 40)'}</button>
      </div>
    </div>
    <small class="mut">Depois de confirmar, não é possível editar · ${CELULAR ? '' : 'Ctrl+Enter confirma · '}botões vermelho/verde do púlpito também funcionam</small></div>`;
  $('#h-mic').onclick = alternarMic; $('#h-ok').onclick = confirmarFala; $('#h-dica-b').onclick = () => pedirDica(false);
  const ta = $('#h-ta');
  if (ta) {
    ta.oninput = () => { if (ta.readOnly) return; if (!micLiberado() && E.sala.fala?.status === 'pronto') avisoBloqueado(); if (E.sala.fala?.status === 'pronto' && ta.value.length) comecarFala(false); enviarTexto(ta.value); socket.emit('nivel', .6); };
    ta.onkeydown = e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); confirmarFala(); } e.stopPropagation(); };
    // proibido colar texto pronto (Ctrl+V, menu do botão direito, arrastar)
    const bloq = e => { e.preventDefault(); toast('Colar texto não é permitido — escreva ou fale sua resposta.'); };
    ta.onpaste = bloq; ta.ondrop = bloq; ta.ondragover = e => e.preventDefault();
    ta.addEventListener('beforeinput', e => { if (/^insertFrom(Paste|Drop|Yank)/.test(e.inputType)) bloq(e); });
    if (ativo && !E.micOn) focarTexto();
  }
}
// ---------- dica da assessoria ----------
// a anotação fica aberta enquanto você fala/digita; só é guardada no fim da sua resposta (ou pelo botão "Guardar anotação")
aoLerDica(on => est.lerDica(on));
function fimDaResposta() { if (E.dicaFimI === E.sala?.i) return; E.dicaFimI = E.sala?.i; recolherDica(); }
function pedirDica(comprar) {
  if (E.pedindoDica) return; E.pedindoDica = true;
  const b = $('#h-dica-b'); if (b) b.textContent = '📝 Procurando nas anotações…';
  socket.emit('pedirDica', { comprar }, r => {
    E.pedindoDica = false;
    if (r?.semDicas) {
      renderAcao(true);
      return janela(`<h2>📝 Sem dicas disponíveis</h2><p>Você já usou a dica grátis deste debate. Comprar uma anotação da assessoria agora por <b>🪙 ${r.preco}</b>?</p>
        <p class="mut">Saldo: 🪙 ${fmtN(E.conta?.moedas || 0)} · Pacotes com desconto na Loja.</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn peq" id="cx">Agora não</button><button class="btn peq amarelo" id="ok">Comprar e ler</button></div>`,
      (el, fechar) => { $('#cx', el).onclick = fechar; $('#ok', el).onclick = () => { fechar(); pedirDica(true); }; });
    }
    if (r?.erro) { toast(r.erro, 'erro'); renderAcao(true); return; }
    E.dicasGratis = r.gratisRestantes; sfx.clique();
    // o candidato folheia as anotações por um instante antes de achar a certa
    const iDica = E.sala?.i; // resposta atrasada / passo já trocado: não abre a anotação (nem desce a câmera) no passo seguinte
    setTimeout(() => E.sala?.i === iDica && emJogo() && mostrarDica(r.dica, r.origem === 'gratis' ? `${r.gratisRestantes} dica(s) grátis restante(s)` : r.origem === 'compra' ? 'comprada por 🪙 40' : 'do seu estoque'), 300);
    renderAcao(true);
  });
}
// ---------- apuração ao vivo ----------
const apurando = r => !!r?.contagem && ((r.contagem.turno === 1 && !r.anunciado1) || (r.contagem.turno === 2 && !r.mostrar2));
/** Começa zerado e cresce até o fim (30 s); as proporções (e as viradas) seguem os quadros do servidor. */
function quadroApuracao(c, t) {
  const tau = Math.max(0, Math.min(1, (t - c.ini) / c.dur)), g = (Math.exp(2.2 * tau) - 1) / (Math.exp(2.2) - 1);
  const n = c.quadros.quadros.length - 1, x = tau * n;
  const a = c.quadros.quadros[Math.floor(x)], b = c.quadros.quadros[Math.min(n, Math.floor(x) + 1)], f = x - Math.floor(x);
  return { urnas: 100 * g, pct: a.pct.map((v, i) => (v + (b.pct[i] - v) * f) * g), fim: tau >= 1 };
}
function renderApuracao(el, s, r) {
  const c = r.contagem, q = quadroApuracao(c, agora());
  const itens = c.quadros.ids.map((id, i) => ({ id, pct: q.pct[i] })).sort((a, b) => b.pct - a.pct);
  const lider = itens[0].id;
  if (E.apuLider && E.apuLider !== lider && !q.fim && q.urnas > 5) { E.apuVirada = Date.now(); sfx.sorteio(); est.agitarPlateia(1, 2500); }
  E.apuLider = lider;
  const virada = E.apuVirada && Date.now() - E.apuVirada < 2500;
  const eleitores = 158000000 * .8;
  el.innerHTML = `<div class="apuracao p">
    <div class="apu-titulo"><span class="apu-vivo">● AO VIVO</span> Apuração ${c.turno === 2 ? 'do 2º turno' : 'do 1º turno'}</div>
    <div class="apu-urnas"><div style="display:flex;justify-content:space-between"><b>${q.urnas.toFixed(1).replace('.', ',')}% das urnas apuradas</b><span class="mut">votos válidos</span></div><div class="b"><div style="width:${q.urnas}%"></div></div></div>
    <div class="apu-lista">${itens.map((x, i) => { const j = jog(x.id), pp = PARTIDO[j?.partido]; return `<div class="apu-item ${i === 0 ? 'lider' : ''}"><img class="av" src="${ret(j.avatar)}" style="width:54px;height:54px">
      <div class="meio"><b style="font-size:18px">${esc(j.nome)}</b> <small class="mut">${pp?.sigla} ${pp?.numero} · ${fmtN(eleitores * x.pct / 100)} votos</small><div class="b"><div style="width:${x.pct}%;background:${pp?.cor}"></div></div></div>
      <span class="pct">${x.pct.toFixed(2).replace('.', ',')}%</span></div>`; }).join('')}</div>
    <div class="apu-virada">${q.fim ? '⏳ Apuração concluída: aguarde o anúncio…' : virada ? '🔥 VIRADA! Mudou a liderança!' : ''}</div></div>`;
  est.setLED({ modo: 'resultado', titulo: `APURAÇÃO AO VIVO · ${Math.floor(q.urnas)}% DAS URNAS`, lista: itens.map(x => ({ nome: jog(x.id)?.nome || '', partido: jog(x.id)?.partido, pct: x.pct })), rodape: q.fim ? 'AGUARDANDO O ANÚNCIO OFICIAL' : 'VOTOS VÁLIDOS · RESULTADO PARCIAL' });
  E.ledKey = 'apuracao';
}
/** Quem ficou fora do 2º turno escolhe: continuar assistindo da plateia ou voltar ao lobby. */
function avisoEliminado(s, r) {
  const eu = s.jogadores.find(j => j.id === E.eu);
  const fora = eu && !r.eleito1 && r.anunciado1 && !r.mostrar2 && r.r1.res.some(x => x.id === E.eu) && !r.r1.res.slice(0, 2).some(x => x.id === E.eu);
  if (!fora || E.elimOk) { $('#elimin')?.remove(); return; }
  if ($('#elimin')) return;
  const d = document.createElement('div'); d.id = 'elimin'; d.className = 'elimin p';
  const pos = r.r1.res.findIndex(x => x.id === E.eu) + 1;
  d.innerHTML = `<b style="font-size:20px">Você ficou fora do 2º turno</b><p class="mut" style="margin:6px 0 12px">Terminou em ${pos}º lugar, com ${fmtP(r.r1.res[pos - 1].pct)} dos votos válidos.</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn amarelo" id="el-ver">👀 Assistir da plateia</button><button class="btn" id="el-sair">🏠 Ir para o lobby</button></div>`;
  document.body.appendChild(d);
  $('#el-ver').onclick = () => { E.elimOk = true; E.naPlateia = true; d.remove(); ajustarCamera(); };
  $('#el-sair').onclick = () => { E.elimOk = true; d.remove(); sairSala(); };
}
function renderResultado() {
  const el = $('#h-result'); if (!el) return;
  const s = E.sala, r = s.resultado;
  const visivel = s.fase === 'resultado' && r;
  ['h-legenda', 'h-acao', 'h-lateral', 'h-perg'].forEach(id => { const x = $('#' + id); if (x) x.style.display = visivel ? 'none' : ''; });
  if (!visivel) { el.innerHTML = ''; E.resKey = ''; E.naPlateia = false; E.elimOk = false; $('#elimin')?.remove(); return; }
  if (E.revelando) { if (E.resKey !== 'rev') { E.resKey = 'rev'; el.innerHTML = ''; $('#elimin')?.remove(); } return; } // cinemática da revelação: tela limpa
  avisoEliminado(s, r);
  if (apurando(r)) { E.resKey = 'apu'; renderApuracao(el, s, r); return; }
  if (E.celebrar) { // vencedor dançando em 3D no centro da tela
    if (E.resKey === 'cel') return; E.resKey = 'cel';
    const v = jog(r.vencedor), pv = PARTIDO[v.partido], it = ITEM[r.dancas?.[r.vencedor]] || ITEM.comemorar;
    el.innerHTML = `<div class="celebra"><div><div class="faixa">${v.id === E.eu ? 'Você venceu!' : textoVitoria(v.avatar).faixa}</div><h1>👑 ${esc(v.nome)}</h1>
      <div class="chip"><img src="${logoPartido(pv.sigla, 40)}" style="width:20px;border-radius:5px"> ${pv.sigla} ${pv.numero} · ${it.emoji} ${esc(it.nome)}</div></div>
      <button class="btn amarelo grande" id="r-ver">Ver resultado completo ▸</button></div>`;
    $('#r-ver').onclick = () => celebrar(false); return;
  }
  const k = JSON.stringify([r.mostrar2, r.anunciado1, r.contagem?.turno, E.abaRes, s.hostId, s.jogadores.map(j => j.conectado)]);
  if (k === E.resKey) return; E.resKey = k;
  const decidido = (r.eleito1 && r.anunciado1) || r.mostrar2;
  const aba = r.eleito1 ? 1 : (r.mostrar2 ? E.abaRes : 1);
  const rd = aba === 2 ? r.r2 : r.r1;
  const venc = jog(r.vencedor);
  const pv = PARTIDO[venc.partido];
  const desempenho = r.desempenho.slice().sort((a, b) => b.nota - a.nota);
  const esq = decidido
    ? `<div class="moldura"><div class="coroa">👑</div><img src="${ret(venc.avatar)}"></div><div class="faixa">${venc.id === E.eu ? 'Você venceu!' : textoVitoria(venc.avatar).faixa}</div>
       <h1 style="font-family:var(--titulo);font-weight:400;font-size:38px;margin:14px 0 4px">${esc(venc.nome)}</h1><div class="chip"><img src="${logoPartido(pv.sigla, 40)}" style="width:20px;border-radius:5px"> ${pv.sigla} ${pv.numero} · ${IDEO[pv.ideo].nome}</div>
       <p class="mut">${r.r1.res.length <= 2 ? 'Eleito em turno único' : r.eleito1 ? 'Eleito no 1º turno' : 'Eleito no 2º turno'} com ${fmtP((r.eleito1 ? r.r1 : r.r2).res[0].pct)} dos votos válidos</p>`
    : `<div class="faixa" style="margin:0 0 20px">2º turno!</div><div style="display:flex;gap:20px;align-items:center">${r.r1.res.slice(0, 2).map(x => `<div style="text-align:center"><img class="av" style="width:120px;height:120px" src="${ret(jog(x.id).avatar)}"><br><b>${esc(jog(x.id).nome)}</b></div>`).join('<b style="font-family:var(--titulo);font-weight:400;font-size:40px">VS</b>')}</div>
       <p class="mut" style="max-width:340px">Nenhum candidato passou de 50% dos votos válidos. ${ehHost() ? 'Clique em Apurar 2º turno.' : 'Aguardando a apuração…'}</p>`;
  el.innerHTML = `<div class="result p">
    <div class="vencedor">${esq}</div>
    <div class="painel scroll">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><h2 style="margin:0;flex:1">Resultado do debate</h2>
        ${!r.eleito1 ? `<button class="aba ${aba === 1 ? 'on' : ''}" data-aba="1">1º turno</button>${r.mostrar2 ? `<button class="aba ${aba === 2 ? 'on' : ''}" data-aba="2">2º turno</button>` : ''}` : `<span class="chip verde">${r.r1.res.length <= 2 ? 'Turno único' : 'Decidido no 1º turno'}</span>`}</div>
      <div class="result-lista">${rd.res.map((x, i) => { const j = jog(x.id), pp = PARTIDO[j.partido]; return `<div class="item ${i === 0 ? 'top' : ''}"><span class="pos">${i + 1}</span><img class="av" src="${ret(j.avatar)}">
        <div class="meio"><b>${esc(j.nome)}</b> <small class="mut">${pp.sigla} ${pp.numero} · ${fmtN(x.votos)} votos</small><div class="b"><div data-w="${x.pct}" style="width:0;background:${pp.cor}"></div></div></div><span class="pct">${fmtP(x.pct)}</span></div>`; }).join('')}</div>
      <p class="mut" style="font-size:13px">Votos válidos (sem brancos e nulos), como no TSE · Comparecimento ${fmtN(rd.comparec)} · Abstenção ${fmtN(rd.abst)} · Brancos ${fmtN(rd.brancos)} · Nulos ${fmtN(rd.nulos)}</p>
      <details><summary><b>Desempenho no debate</b></summary><table class="tabela"><tr><th>Candidato</th><th>Nota</th><th>Visto como</th><th>Ataques</th><th>Fugas</th></tr>
        ${desempenho.map(d => `<tr><td>${esc(jog(d.id)?.nome)}${d.banido ? ` <span class="chip vermelho">🚫 banido: ${esc(d.banido)}</span>` : d.saiu ? ' <span class="chip vermelho">🚪 abandonou</span>' : ''}</td><td><b>${d.nota.toFixed(1)}</b></td><td>${d.percebida}</td><td>${d.ataques}</td><td>${d.fugas}</td></tr>`).join('')}</table></details>
      <details><summary><b>Melhores momentos</b></summary>${desempenho.filter(d => d.melhor?.texto).map(d => `<p><b>${esc(jog(d.id)?.nome)}</b> <small class="mut">(${KIND_NOME[d.melhor.kind]}, nota ${d.melhor.nota.toFixed(1)})</small><br>“${esc(d.melhor.texto.slice(0, 260))}${d.melhor.texto.length > 260 ? '…' : ''}”</p>`).join('') || '<p class="mut">Nenhuma fala registrada.</p>'}</details>
      <details><summary><b>Voto por segmento do eleitorado</b></summary><table class="tabela"><tr><th>Eleitor</th><th>Peso</th><th>Preferência</th></tr>
        ${rd.seg.map(g => `<tr><td>${IDEO[g.id].nome}</td><td>${Math.round(g.peso * 100)}%</td><td>${g.shares.slice(0, 2).map(x => `${esc(jog(x.id)?.nome)} ${Math.round(x.p * 100)}%`).join(' · ')}</td></tr>`).join('')}</table></details>
    </div>
    <div class="result-botoes">
      ${ehHost() ? `${!decidido ? (r.anunciado1 && !r.r2 ? '<button class="btn amarelo grande" id="r-2t">🎤 Iniciar debate do 2º turno</button>' : '') : ''}<button class="btn" id="r-lobby">Voltar ao lobby</button><button class="btn verde" id="r-novo">▶ Jogar novamente</button>`
      : '<span class="hud-box">Aguardando o anfitrião…</span>'}${decidido ? '<button class="btn peq" id="r-cel">🎉 Comemoração</button>' : ''}<button class="btn vermelho peq" id="r-sair">Sair</button>
    </div></div>`;
  $$('[data-aba]', el).forEach(b => b.onclick = () => { E.abaRes = +b.dataset.aba; renderResultado(); });
  $('#r-2t') && ($('#r-2t').onclick = () => socket.emit('revelar2'));
  $('#r-lobby') && ($('#r-lobby').onclick = () => socket.emit('lobby'));
  $('#r-novo') && ($('#r-novo').onclick = () => socket.emit('revanche'));
  $('#r-sair').onclick = sairSala;
  $('#r-cel') && ($('#r-cel').onclick = () => celebrar(true));
  requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]', el).forEach(b => b.style.width = b.dataset.w + '%')));
}

// ======================= telão e telas dos púlpitos =======================
function ledDoEstado() {
  const s = E.sala;
  if (!s) return { modo: 'titulo', sub: 'ELEIÇÕES 2026' };
  if (s.fase === 'lobby') return { modo: 'titulo', sub: `SALA #${s.code} · ${s.jogadores.length}/5 CANDIDATOS` };
  if (s.fase === 'resultado') {
    if (apurando(s.resultado)) return null; // durante a apuração ao vivo o telão é atualizado pela própria apuração
    const r = s.resultado, rd = r.mostrar2 ? r.r2 : r.r1, decidido = (r.eleito1 && r.anunciado1) || r.mostrar2;
    return { modo: 'resultado', titulo: r.mostrar2 ? 'RESULTADO · 2º TURNO' : 'RESULTADO · 1º TURNO', rodape: decidido ? '' : 'NINGUÉM PASSOU DE 50% DOS VÁLIDOS: HAVERÁ 2º TURNO',
      lista: rd.res.map(x => ({ nome: jog(x.id)?.nome || '', partido: jog(x.id)?.partido, pct: x.pct, eleito: decidido && x.id === r.vencedor ? textoVitoria(jog(x.id)?.avatar).tag : '' })) };
  }
  const p = s.passo, f = s.fala; if (!p) return { modo: 'titulo' };
  const nome = id => jog(id)?.nome || '';
  if (p.tipo === 'vinheta') return { modo: 'titulo', sub: `BLOCO ${p.bloco} · ${ETAPAS[p.etapa - 1].toUpperCase()}` };
  if (p.tipo === 'cumprimento') return { modo: 'texto', cabecalho: 'CUMPRIMENTOS', texto: 'Os candidatos se cumprimentam · o debate já vai começar' };
  if (p.tipo === 'intro') return { modo: 'titulo', sub: p.t2 ? `2º TURNO · ${p.etapa === 2 ? 'CONFRONTO DIRETO · TEMA LIVRE' : ETAPAS[p.etapa - 1].toUpperCase()}` : `BLOCO ${p.etapa} · ${ETAPAS[p.etapa - 1].toUpperCase()}` };
  if (p.tipo === 'pesquisa') return { modo: 'poll', titulo: p.titulo.toUpperCase(), lista: p.poll.map(x => ({ nome: nome(x.id), partido: jog(x.id)?.partido, pct: x.pct })), rodape: 'VOTOS VÁLIDOS · MARGEM DE ERRO DE 2 P.P.' };
  if (p.tipo === 'escolha') return s.temaAtual ? { modo: 'tema', tema: s.temaAtual, cabecalho: `${nome(p.falante).toUpperCase()} × ${nome(p.escolhido?.alvo).toUpperCase()}` } : { modo: 'texto', cabecalho: 'CONFRONTO DIRETO', texto: `${nome(p.falante)} escolhe o adversário` };
  if (p.tipo === 'fala' && f) {
    if (f.status === 'pronto') return p.tema ? { modo: 'tema', tema: p.tema, cabecalho: `${KIND_NOME[p.kind].toUpperCase()} · ${nome(p.falante).toUpperCase()}` } : { modo: 'texto', cabecalho: 'CONSIDERAÇÕES FINAIS', texto: nome(p.falante) };
    const rest = f.status === 'ativo' ? (f.fimEm - agora()) / 1000 : 0;
    const txt = p.falante === E.eu ? E.meuTexto : (E.textoFala || f.texto);
    return { modo: 'fala', nome: nome(p.falante), partido: jog(p.falante)?.partido, tempo: f.status === 'avaliado' ? `${f.res.nota.toFixed(1)}` : fmtT(rest), alerta: f.status === 'ativo' && rest <= 10,
      texto: txt || '…', rotulo: KIND_NOME[p.kind] + (p.tema ? ' · ' + TEMA[p.tema].uf + ' · ' + TEMA[p.tema].titulo : '') };
  }
  return { modo: 'titulo' };
}
function atualizarLED() {
  if (E.sala?.roleta) return;
  const d = ledDoEstado(); if (!d) return; const k = JSON.stringify(d);
  if (k !== E.ledKey) { E.ledKey = k; est.setLED(d); }
}
function atualizarTelasPodio() {
  const s = E.sala;
  for (const j of (s ? s.jogadores : bots())) {
    let d;
    if (!s) d = { titulo: j.nome, texto: PARTIDO[j.partido].sigla + ' ' + PARTIDO[j.partido].numero };
    else if (s.fase === 'lobby') d = { titulo: j.nome, texto: j.pronto || j.id === s.hostId ? 'PRONTO' : 'AGUARDE', cor: j.pronto || j.id === s.hostId ? '#14532d' : '#0b1640' };
    else if (j.banido) d = { titulo: j.nome, texto: 'BANIDO', alerta: true };
    else if (j.saiu || (j.ausenteAte && s.fase === 'debate')) d = { titulo: j.nome, texto: j.saiu ? 'SAIU' : 'AUSENTE', alerta: true };
    else if (s.fase === 'resultado' && apurando(s.resultado)) d = { titulo: j.nome, texto: 'APURANDO' };
    else if (s.fase === 'resultado') d = { titulo: j.nome, texto: j.id === s.resultado.vencedor && ((s.resultado.eleito1 && s.resultado.anunciado1) || s.resultado.mostrar2) ? textoVitoria(j.avatar).tag + '!' : (s.resultado.r1.res.find(x => x.id === j.id)?.pct || 0).toFixed(1) + '%', destaque: j.id === s.resultado.vencedor };
    else {
      const p = s.passo, f = s.fala;
      if (p?.tipo === 'fala' && p.falante === j.id && f) {
        if (f.status === 'pronto') d = { titulo: j.id === E.eu ? 'Sua resposta' : KIND_NOME[p.kind], texto: fmtT(p.segundos), destaque: true };
        else if (f.status === 'avaliado') d = { titulo: 'Nota', texto: f.res.nota.toFixed(1), destaque: true };
        else { const r = (f.fimEm - agora()) / 1000; d = { titulo: 'Tempo', texto: fmtT(r), alerta: r <= 10, destaque: true }; }
      } else if (p?.tipo === 'escolha' && p.falante === E.eu && j.id !== E.eu && !p.escolhido) d = !p.elegiveis || p.elegiveis.includes(j.id) ? { titulo: j.nome, texto: 'ESCOLHER?', destaque: true } : { titulo: j.nome, texto: 'JÁ FOI' };
      else d = { titulo: j.nome, texto: j.nota != null ? 'Nota ' + j.nota.toFixed(1) : PARTIDO[j.partido].sigla + ' ' + PARTIDO[j.partido].numero };
    }
    if (d.titulo === j.nome) d.num = PARTIDO[j.partido]?.numero || '';
    est.telaPodio(j.id, d);
  }
}
// aviso de jogador ausente (caiu/fechou o jogo): contagem regressiva do prazo de 1 min para voltar
function avisoAusencia() {
  const s = E.sala, aus = s?.fase === 'debate' ? s.jogadores.filter(j => j.ausenteAte && j.id !== E.eu) : [];
  let el = $('#aviso-ausente');
  if (!aus.length) return el?.remove();
  if (!el) { el = document.createElement('div'); el.id = 'aviso-ausente'; el.className = 'hud-box'; el.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:60;text-align:center;border-color:var(--vermelho);max-width:calc(100% - 32px);pointer-events:none'; document.body.appendChild(el); }
  const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${t / 60 | 0}:${String(t % 60).padStart(2, '0')}`; };
  el.innerHTML = aus.map(j => s.pausa ? `⏸ Aguardando <b>${esc(j.nome)}</b> voltar... ${mmss(j.ausenteAte - agora())}`
    : `📡 <b>${esc(j.nome)}</b> caiu — a vez dele(a) será pulada · ${mmss(j.ausenteAte - agora())} para voltar`).join('<br>');
}
function tick() {
  if (E.demo) return;
  const s = E.sala;
  atualizarTelasPodio(); atualizarLED(); avisoAusencia();
  // falou no microfone fora da hora (voz detectada com o chat de voz bloqueado): avisa
  E.vozBloq = s?.fase === 'debate' && !micLiberado() && !voip.mudo && voip.nivelLocal() > .25 ? (E.vozBloq || 0) + 1 : 0;
  if (E.vozBloq >= 3) { E.vozBloq = 0; avisoBloqueado(); }
  if (s?.fase === 'resultado' && apurando(s.resultado)) renderResultado(); // apuração ao vivo: atualiza os números
  if (!s || s.fase !== 'debate') return;
  const p = s.passo, f = s.fala, el = $('#h-tempo');
  if (el) {
    if (p?.tipo === 'fala' && f) {
      const r = f.status === 'ativo' ? (f.fimEm - agora()) / 1000 : f.status === 'pronto' ? p.segundos : 0;
      el.innerHTML = `<small>Tempo de resposta</small><b class="${f.status === 'ativo' && r > 10 ? 'ok' : f.status === 'pronto' ? 'ok' : ''}">${fmtT(r)}</b><small>${esc(jog(p.falante)?.nome || '')}</small>`;
      if (f.status === 'ativo' && p.falante === E.eu && r <= 10 && Math.ceil(r) !== E.ultBip && r > 0) { E.ultBip = Math.ceil(r); sfx.alerta(); }
    } else if (s.autoEm) el.innerHTML = `<small>Próxima etapa em</small><b class="ok">${fmtT((s.autoEm - agora()) / 1000)}</b>`;
    else el.innerHTML = `<small>Ao vivo</small><b class="ok">●</b>`;
  }
  const cp = $('#h-cump'); if (cp && p?.tipo === 'cumprimento' && s.autoEm) cp.textContent = Math.max(0, Math.ceil((s.autoEm - agora()) / 1000)) + 's';
  const au = $('#h-auto'); if (au && f?.status === 'pronto') au.textContent = `(começa sozinho em ${Math.max(0, Math.ceil((f.inicioAutoEm - agora()) / 1000))}s)`;
  if (p?.tipo === 'fala' && f?.status === 'ativo' && p.falante !== E.eu && !E.textoFala) est.setFalaNivel(p.falante, 0);
}
setInterval(tick, 200);

// teclado
addEventListener('keydown', e => {
  if (!emJogo() || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  if (e.key === 'v' || e.key === 'V') alternarMic();
  if (e.key === 'Enter' && e.ctrlKey) confirmarFala();
});

// ======================= início =======================
est.setJogadores(bots(), null);
renderUI();
(async () => {
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); await document.fonts.load('40px "Lilita One"').catch(() => {}); } catch { /* sem fontes */ }
  if (!E.demo) { est.chaveJog = ''; est.setJogadores(E.sala ? E.sala.jogadores : bots(), E.eu); E.ledKey = ''; atualizarLED(); }
  const tela = $('#carregando');
  const entrar = () => {
    tela.classList.add('sai'); setTimeout(() => tela.remove(), 700);
    // abertura de programa de TV: música (Lyria) -> volume abaixa -> locutor animado (Gemini) -> plateia -> música volta e some
    const aplaudir = () => { sfx.aplausos(2.8, .2); est.festejarPlateia(3500); };
    socket.emit('boasVindas', null, r => {
      configurarAmbiente(r || {}); // burburinho de fundo fixo + palmas reais
      let musica = null; const vm = Math.min(1, E.cfg.musica / .9); // volume da música (config) — 90% = original
      const rampa = (alvo, ms, depois) => { if (!musica) return; alvo *= vm; const ini = musica.volume, t0 = performance.now(); const p = () => { const k = Math.min(1, (performance.now() - t0) / ms); musica.volume = ini + (alvo - ini) * k; if (k < 1) requestAnimationFrame(p); else depois?.(); }; p(); };
      if (r?.vinheta) { musica = new Audio(r.vinheta); musica.volume = .9 * vm; musica.play().catch(() => { musica = null; sfx.vinheta(); }); }
      else sfx.vinheta();
      const fim = () => { aplaudir(); if (musica) setTimeout(() => { rampa(.75, 600); setTimeout(() => rampa(0, 3500, () => musica?.pause()), 3500); }, 300); };
      setTimeout(() => {
        rampa(.3, 400); // abaixa a música para a voz
        if (r?.url && E.cfg.voz) { const a = new Audio(r.url); a.volume = 1; a.onended = fim; a.play().catch(fim); }
        else setTimeout(fim, 1200); // sem locutor gravado: sem voz robótica
      }, r?.vinheta ? 2400 : 1100);
    });
  };
  if (new URLSearchParams(location.search).get('demo')) { tela.remove(); return; }
  tela.querySelector('p').outerHTML = '<button class="btn amarelo grande" id="entrar" style="margin-top:30px">▶ ENTRAR</button><p class="mut" style="margin-top:14px">Use fone ou caixa de som 🔊</p>';
  $('#entrar').onclick = () => { telaCheiaDeitado(); termosAceitos() ? entrar() : mostrarTermos(entrar); };
  if (new URLSearchParams(location.search).get('termos')) mostrarTermos(entrar);
})();
window.__debate = { E, est, socket };

// modo de demonstração visual: ?demo=fp | ?demo=lado | ?demo=vitrine
const demo = new URLSearchParams(location.search).get('demo');
if (demo) setTimeout(() => {
  if (demo === 'vitrine') { E.perfil.nome ||= 'Demo'; Object.defineProperty(E, 'conta', { get: () => ({ moedas: 100, dicasExtra: 0, itens: [], cadastro: { nome: 'Demo' } }), set() {} }); E.persAba = new URLSearchParams(location.search).get('aba') || E.persAba; ir('personalizar'); const pr = new URLSearchParams(location.search).get('provar'); if (pr) setAv(...pr.split(':')); return; } // ?demo=vitrine&aba=roupas[&provar=roupa:batina]
  if (demo === 'config') { E.perfil.nome ||= 'Demo'; Object.defineProperty(E, 'conta', { get: () => ({ moedas: 0, itens: [], cadastro: { nome: 'Demo' } }), set() {} }); ir('config'); return; } // ?demo=config
  if (demo === 'emote') { const q = new URLSearchParams(location.search), it = ITEM[q.get('item')]; E.perfil.nome ||= 'Demo'; if (it.av) E.perfil.avatar = { ...E.perfil.avatar, ...it.av, ...it.cores, genero: 'masculino', barba: q.get('barba') || E.perfil.avatar.barba }; ir('personalizar'); $('#ui').style.opacity = 0; if (it.tipo === 'acao') { setTimeout(() => { est.testarNaVitrine(it); est.adiantarDemo(Number(q.get('t')) || 0); }, 400); return; } est.testarNaVitrine({ ...it, tipo: 'danca' }); if (est.vitrine?.anim) est.vitrine.anim.ini = -(Number(q.get('t')) || 0); return; } // &t=1 começa a animação 1 s adiantada // ?demo=emote&item=chorao
  if (demo === 'sala') { E.perfil.nome ||= 'Demo'; const js = bots().slice(0, 3).map((j, i) => ({ ...j, bot: false, pronto: i === 1, nivel: i + 1 })); E.eu = js[0].id; // ?demo=sala (lobby com chat)
    E.sala = { code: 'AB12', publica: true, hostId: js[0].id, fase: 'lobby', cfg: { dur: 'normal', permitirTexto: true, reacoes: true }, jogadores: js, chat: [{ id: js[1].id, nome: js[1].nome, texto: 'Boa noite! Bora debater?' }, { id: js[0].id, nome: js[0].nome, texto: 'Bora! Só esperando o Alex.' }, { id: js[2].id, nome: js[2].nome, texto: 'Já vou ficar pronto, só ajustando o terno 😅' }] }; ir('sala'); return; }
  if (demo === 'ranking') { E.perfil.nome ||= 'Demo'; Object.defineProperty(E, 'conta', { get: () => ({ moedas: 100, dicasExtra: 0, itens: [], cadastro: { nome: 'Demo' } }), set() {} });E.rankPer = new URLSearchParams(location.search).get('per') || 'semana'; ir('ranking'); return; } // ?demo=ranking&per=geral
  if (demo === 'loja') { E.perfil.nome ||= 'Demo'; E.lojaAba = new URLSearchParams(location.search).get('aba') || 'moedas'; Object.defineProperty(E, 'conta', { get: () => ({ moedas: 100, dicasExtra: 0, itens: [], cadastro: { nome: 'Demo' } }), set() {} }); ir('loja'); return; } // ?demo=loja&aba=assessoria
  if (demo === 'promocao') { const c = CARGOS[(+new URLSearchParams(location.search).get('n') || 2) - 1]; E.perfil.nome ||= 'Demo'; ir('menu'); animarPromocao({ n: c.n, nome: c.nome, recompensa: c.recompensa, bonus: c.bonus }); return; } // ?demo=promocao&n=5
  if (demo === 'carreira') { E.perfil.nome ||= 'Demo'; Object.defineProperty(E, 'conta', { get: () => ({ moedas: 900, itens: [], xp: 8200, cargoMax: 5, cadastro: { nome: 'Demo', user: 'demo' } }), set() {} }); ir('menu'); janelaCarreira(); avisoGanhos({ total: 99, itens: [['Participação', 20], ['Bônus de cargo: Senador (×1,45)', 31]], xp: { ganho: 230, antes: 4, depois: 5, xp: 8200 } }); return; }
  if (demo === 'cadastro') { E.conta = { ...E.conta, cadastro: null }; renderUI(); return; }
  if (demo === 'menu' || demo === 'ranking') { E.perfil.nome ||= 'Demo'; if (demo === 'menu') { const fixo = (k, v) => Object.defineProperty(E, k, { get: () => v, set() {} }); fixo('topXzT', Date.now()); fixo('conta', { ...E.conta, cadastro: { nome: 'Demo' } }); fixo('campeao', { mes: '2026-10', nome: 'Ana Brasil', pts: 4200, vitorias: 5 }); fixo('topXz', [['Ana Presidente', 'ana_pres', 18420], ['Carlos Mendes 2026', 'carlosmendes', 9310], ['Bia do Povo', 'biadopovo', 4120], ['Rafa Souza', 'rafasouza', 1980], ['Lu Oliveira', 'lu_oli', 760]].map(([nome, user, seguidores]) => ({ nome, user, seguidores }))); } ir(demo); return; }
  if (demo === 'fanpage') { E.perfil.nome ||= 'Demo'; E.conta = { ...E.conta, partidas: 2, vitorias: 1, fanpage: { nome: 'Demo Presidente', user: 'demo_presidente', bio: 'Candidato(a) à Presidência. Trabalho, saúde e educação. 🇧🇷', seguidores: 388, titulos: { mensal: ['2026-10'], semanal: ['2026-11-02', '2026-10-26'] }, posts: [
    { t: Date.now() - 6e5, texto: 'Não sei, vamos ver isso aí.', tema: 'Saúde no interior', nota: 2.1, delta: -172, curtidas: 12, reposts: 1, respostas: 30 },
    { t: Date.now() - 9e7, texto: 'Vou criar um milhão de empregos até 2028 com obras de saneamento em todo o país.', tema: 'Emprego', nota: 8.4, delta: 560, curtidas: 1420, reposts: 210, respostas: 96 }] } };
    ir('fanpage'); avisoGanhos({ total: 54, itens: [['Participação', 20], ['Desempenho', 34]], seguidores: { delta: -172, total: 388 } }); return; }
  E.demo = true; E.eu = 'bot2'; $('#ui').innerHTML = '';
  est.setJogadores(bots(), 'bot2'); est.setModo('fp'); est.setFalante('bot1');
  est.olhar = demo === 'lado' ? { y: 1.0, p: -.15 } : demo === 'baixo' ? { y: 0, p: -.85 } : { y: 0, p: -.28 }; // ?demo=baixo (olhando o próprio corpo)
  est.setLED({ modo: 'fala', nome: 'Carlos Mendes', partido: 'MSD', tempo: '00:42', texto: 'Vou criar um programa nacional de mobilidade, com metrô e corredores de ônibus, e investir 20 bilhões no primeiro ano.', rotulo: 'Pergunta · SP · Mobilidade na metrópole' });
  setInterval(() => est.setFalaNivel('bot1', Math.random()), 120);
  est.reacao('bot3', '👏');
  if (demo === 'duelo') { // ?demo=duelo (1ª pessoa no confronto)
    est.setDuelo({ a: 'bot1', b: 'bot2', fase: 'no' }); est.olhar = { y: 0, p: -.1 };
  }
  // ?demo=acao&item=cadeirada&de=bot4&alvo=bot2[&eu=bot3][&duelo=1][&tv=1][&espera=0.5] — você é bot2 (o alvo) por padrão.
  // O print sai depois de --virtual-time-budget; a ação começa "espera" segundos após a cena abrir.
  if (demo === 'acao') {
    const q = new URLSearchParams(location.search), eu = q.get('eu') || 'bot2';
    est.setJogadores(bots(), eu); est.setModo(q.get('tv') ? 'tv' : 'fp'); est.setFalante(null); est.olhar = { y: 0, p: -.1 };
    if (q.get('duelo')) { est.setPulpito(true, true); est.setDuelo({ a: q.get('alvo') || 'bot2', b: q.get('de') || 'bot4', fase: 'no' }); }
    est.onAcao = (ev, d) => console.log('[acao]', ev, d?.item);
    setTimeout(() => est.acao({ n: 1, id: q.get('de') || 'bot4', alvo: q.get('alvo') || 'bot2', item: q.get('item') || 'cadeirada' }), (Number(q.get('espera')) || .5) * 1000);
    return;
  }
  if (demo === 'pulpito' || demo === 'caminhada') { // ?demo=pulpito&t=3[&sai=1][&tv=1] (produção empurrando) | ?demo=caminhada&t=1.5[&tv=1]
    const q = new URLSearchParams(location.search), adianta = Number(q.get('t')) || 0;
    if (q.get('tv')) est.setModo('tv');
    if (demo === 'pulpito') { if (q.get('sai')) est.setPulpito(true, true); est.setPulpito(!q.get('sai'), false); for (let k = 0; k < adianta * 30; k++) est.animarPulpito(1 / 30); }
    else { est.setPulpito(true, true); est.setDuelo({ a: 'bot1', b: 'bot2', fase: 'indo' }); for (const p of est.podios.values()) if (p.caminho) p.caminho.t = adianta; }
  }
  if (demo === 'jogadores' || demo === 'etiquetas') { // ?demo=jogadores (painel aberto) | ?demo=etiquetas (brasões sobre a cabeça)
    const niv = [1, 5, 8, 0, 3], fake = bots().map((j, i) => ({ ...j, bot: i === 3, nivel: niv[i], conectado: i !== 4, saiu: i === 4 && !!new URLSearchParams(location.search).get('saiu'), fanpage: i === 3 || i === 4 ? null : { nome: j.nome, user: 'u' + i, seguidores: 100 * (i + 1), nivel: niv[i] } }));
    est.setJogadores(fake, 'bot2');
    if (demo === 'etiquetas') { est.setFalante(null); est.olhar = { y: Number(new URLSearchParams(location.search).get('y')) || 1.0, p: -.12 };
      if (new URLSearchParams(location.search).get('cv')) { const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:10px;top:10px;display:flex;flex-direction:column;gap:8px;z-index:99;background:#333;padding:8px'; for (const p of est.podios.values()) box.appendChild(p.et.c); document.body.appendChild(box); }
      return; } // &y=-1 olha para o outro lado | &cv=1 mostra as texturas das etiquetas
    E.sala = { fase: 'debate', cfg: {}, i: 0, total: 1, perguntas: [], jogadores: fake };
    $('#hud').hidden = false; try { renderHUD(); } catch (e) { console.warn(e); }
    abrirJogadores(true);
  }
  if (demo.startsWith('regras') || demo === 'perguntas') { // ?demo=regras (painel aberto) | ?demo=regras-b (só o botão, com 2 advertências) | ?demo=perguntas (painel com resumo)
    const perguntas = demo !== 'perguntas' ? [] : [{ de: 'Ana', mediador: true, para: 'bot2', kind: 'pergunta', tema: 'SP1', n: 1, texto: TEMA.SP1.pergunta },
      { de: 'Carlos Mendes', deId: 'bot1', para: 'bot2', kind: 'pergunta', tema: 'SP1', n: 2, texto: 'E quem vai pagar por esse metrô?' }];
    if (demo === 'perguntas') E.pergAjuda = new Set(['1perguntabot2']);
    E.sala = { fase: 'debate', cfg: {}, i: 0, total: 1, perguntas, jogadores: bots().map(j => ({ ...j, adv: j.id === 'bot2' ? 2 : 0 })) };
    $('#hud').hidden = false; try { renderHUD(); } catch (e) { console.warn(e); }
    try { renderAcao(true); } catch (e) { console.warn(e); }
    if (demo === 'regras') $('#h-regras').hidden = false;
  }
}, 600);
