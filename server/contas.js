// Contas dos jogadores (moedas, dicas extras, banimentos) e denúncias. Guardadas em dados/*.json.
import fs from 'node:fs';
import path from 'node:path';
import { ITEM, GRATIS, possui, nivelOk } from '../shared/loja.js';
import { revisarLocal } from '../shared/revisao.js';
import { moderar, nomeImproprio, PUNICAO } from '../shared/moderacao.js';
import { cargo, CARGOS, XP_PUNICAO, nivelMax } from '../shared/niveis.js';
import { CADASTRO, validarNome, validarUser, validarIdade, formatarNome, formatarUser, chaveNome } from '../shared/cadastro.js';

// Fanpage na Xzona: seguidores sobem quando o candidato vai bem e caem quando vai mal.
export const SEGUIDORES = {
  inicial: 0, maxPosts: 30,
  porNota: [[8, 250], [6.5, 100], [5, 30], [4, -20], [3, -60], [0, -120]], // nota de desempenho (0–10)
  segundoTurno: 60, eleito: 300, banido: -300, ataque: 5, fuga: -15,
  acao: { agressor: -80, vitima: 50, simpatia: 60 }, // × peso do item (agr/simp em shared/loja.js): cadeirada ≈ −64 / +40, tomate ≈ −20 / +12, flores ≈ +18
};
// banAtivo: suspensão por abandono DESATIVADA até o jogo ser hospedado — ao hospedar, trocar para true
export const ABANDONO = { banAtivo: false, limite: 2, janelaMs: 24 * 3600000, banMs: 3600000, seguidores: 200, votos: 5 }; // votos: denúncias de jogadores diferentes em 24 h (mais de 4) → 1 h de suspensão
// TESTES: todas as contas ficam com pelo menos 10 mil moedas. VOLTAR PARA null (e ECONOMIA.inicial = 100) AO FINALIZAR O JOGO.
export const MOEDAS_TESTE = 10000;
const limparTxt =(t, n) => String(t || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

export const ECONOMIA = {
  inicial: MOEDAS_TESTE || 100,
  participacao: 6, porPontoDeNota: 1, segundoTurno: 10, eleito: 25,
  dicasGratis: 1,
  pacotes: [
    { id: 'avulsa', nome: 'Anotação avulsa', descricao: '1 dica de assessoria', dicas: 1, preco: 400 },
    { id: 'kit', nome: 'Kit do Assessor', descricao: '3 dicas · economize 17%', dicas: 3, preco: 1000, destaque: true },
    { id: 'gabinete', nome: 'Gabinete Completo', descricao: '6 dicas · economize 25%', dicas: 6, preco: 1800 },
  ],
  campeaoMensal: 1000, campeaoSemanal: 250, // moedas para o 1º lugar dos rankings
};

export class Contas {
  constructor(raiz) {
    this.arq = path.join(raiz, 'dados', 'contas.json');
    this.arqDen = path.join(raiz, 'dados', 'denuncias.json');
    fs.mkdirSync(path.dirname(this.arq), { recursive: true });
    try { this.contas = JSON.parse(fs.readFileSync(this.arq, 'utf8')); } catch { this.contas = {}; }
    try { this.denuncias = JSON.parse(fs.readFileSync(this.arqDen, 'utf8')); } catch { this.denuncias = []; }
    if (MOEDAS_TESTE) { Object.values(this.contas).forEach(c => { if ((c.moedas || 0) < MOEDAS_TESTE) c.moedas = MOEDAS_TESTE; }); this.salvar(); }
  }
  salvar() { try { fs.writeFileSync(this.arq, JSON.stringify(this.contas, null, 1)); } catch (e) { console.error('contas:', e.message); } }
  salvarDen() { try { fs.writeFileSync(this.arqDen, JSON.stringify(this.denuncias, null, 1)); } catch (e) { console.error('denúncias:', e.message); } }
  static uidValido(uid) { return typeof uid === 'string' && /^[a-z0-9-]{16,40}$/i.test(uid); }
  conta(uid, nome) {
    if (!Contas.uidValido(uid)) return null;
    let c = this.contas[uid];
    if (!c) { c = this.contas[uid] = { uid, nome, moedas: ECONOMIA.inicial, dicasExtra: 0, partidas: 0, vitorias: 0, criadaEm: Date.now() }; this.salvar(); }
    if (nome && !c.cadastro) c.nome = nome;
    return c;
  }
  // ---------- cadastro (nome do candidato e @ da Xzona: únicos, trocar custa caro) ----------
  emUso(campo, valor, c) { const k = chaveNome(valor); return Object.values(this.contas).some(o => o !== c && o.cadastro && chaveNome(o.cadastro[campo]) === k); }
  cadastrar(c, d) {
    if (!c) return 'Conta inválida.';
    if (c.cadastro) return 'Você já tem cadastro.';
    const e = validarIdade(d?.idade) || validarNome(d?.nome) || validarUser(d?.user); if (e) return e;
    const nome = formatarNome(d.nome), user = formatarUser(d.user);
    if (this.emUso('nome', nome, c)) return `Já existe um candidato chamado "${nome}".`;
    if (this.emUso('user', user, c)) return `O @${user} já está em uso.`;
    c.cadastro = { idade: Number(d.idade), nome, user, criadoEm: Date.now() }; c.nome = nome;
    if (c.fanpage) c.fanpage.user = user;
    this.salvar(); return null;
  }
  trocar(c, campo, valor) {
    if (!c?.cadastro) return 'Faça o cadastro primeiro.';
    const preco = campo === 'nome' ? CADASTRO.precoNome : campo === 'user' ? CADASTRO.precoUser : null; if (!preco) return 'Campo inválido.';
    const e = campo === 'nome' ? validarNome(valor) : validarUser(valor); if (e) return e;
    const v = campo === 'nome' ? formatarNome(valor) : formatarUser(valor);
    if (chaveNome(v) === chaveNome(c.cadastro[campo]) && v === c.cadastro[campo]) return 'É igual ao atual.';
    if (this.emUso(campo, v, c)) return campo === 'nome' ? `Já existe um candidato chamado "${v}".` : `O @${v} já está em uso.`;
    if (c.moedas < preco) return `Moedas insuficientes: faltam ${preco - c.moedas}.`;
    c.moedas -= preco; c.cadastro[campo] = v;
    if (campo === 'nome') c.nome = v; else if (c.fanpage) c.fanpage.user = v;
    (c.extrato ||= []).push({ t: Date.now(), valor: -preco, motivo: campo === 'nome' ? 'Troca de nome do candidato' : 'Troca de @ na Xzona' });
    this.salvar(); return null;
  }
  publico(c) {
    if (!c) return null;
    return { cadastro: c.cadastro ? { nome: c.cadastro.nome, user: c.cadastro.user, idade: c.cadastro.idade } : null, moedas: c.moedas, dicasExtra: c.dicasExtra, banidoAte: c.banidoAte || 0, banPerm: !!c.banPerm, partidas: c.partidas, vitorias: c.vitorias, xp: c.xp || 0, cargo: cargo(c.xp || 0), cargoMax: Math.max(c.cargoMax || 1, cargo(c.xp || 0).n),
      itens: [...new Set([...GRATIS, ...(c.itens || [])])], danca: c.danca || 'comemorar', fanpage: this.fanpage(c) };
  }
  // ---------- fanpage (Xzona) ----------
  fanpage(c) { const f = c?.fanpage; return f ? { nome: f.nome, user: f.user, bio: f.bio, seguidores: f.seguidores, criadaEm: f.criadaEm, posts: f.posts, autor: c.nome, partidas: c.partidas || 0, vitorias: c.vitorias || 0, titulos: c.titulos || null, nivel: this.nivel(c) } : null; }
  nivel(c) { return c ? cargo(c.xp || 0).n : 0; }
  /** Soma/tira XP (nunca abaixo de 0). Retorna { antes, depois } (cargos) para avisar subida/queda. */
  mudarXp(c, valor) {
    if (!c) return null; const antes = cargo(c.xp || 0).n; c.xp = Math.max(0, (c.xp || 0) + Math.round(valor)); const depois = cargo(c.xp).n;
    // recompensa única por cargo: só na 1ª vez (cair por punição e voltar não paga de novo)
    const max = c.cargoMax || antes; let premio = 0; for (let n = max + 1; n <= depois; n++) premio += CARGOS[n - 1].recompensa || 0;
    if (depois > max) c.cargoMax = depois; if (premio) this.creditar(c, premio, 'Promoção a ' + CARGOS[depois - 1].nome);
    return { antes, depois, xp: c.xp, premio };
  }
  porUserFanpage(user) { const u = String(user || '').toLowerCase(); return u ? Object.values(this.contas).find(c => c.fanpage && !this.banido(c) && c.fanpage.user.toLowerCase() === u) : null; }
  topSeguidores(n = 5) { return Object.values(this.contas).filter(c => c.fanpage && !this.banido(c)).sort((a, b) => b.fanpage.seguidores - a.fanpage.seguidores).slice(0, n).map(c => this.resumoFanpage(c)); }
  resumoFanpage(c) { const f = c?.fanpage; return f ? { nome: f.nome, user: f.user, seguidores: f.seguidores, nivel: this.nivel(c) } : null; }
  criarFanpage(c, d) {
    if (!c) return 'Conta inválida.';
    if (!c.cadastro) return 'Faça o cadastro primeiro.';
    const nome = limparTxt(d?.nome, 30), bio = limparTxt(d?.bio, 140);
    if (nome.length < 3) return 'O nome da página precisa ter ao menos 3 letras.';
    if (nomeImproprio(nome) || moderar(bio).grave || moderar(bio).leves.length) return 'Nome ou bio com palavras impróprias.';
    const user = c.cadastro.user;
    if (c.fanpage) Object.assign(c.fanpage, { nome, bio, user });
    else c.fanpage = { nome, user, bio, seguidores: SEGUIDORES.inicial, criadaEm: Date.now(), posts: [] };
    this.salvar(); return null;
  }
  /** Fim de debate: ganha/perde seguidores e publica a melhor fala. Retorna { delta, total, itens } ou null. */
  registrarDebate(c, { nota, eleito, segundoTurno, banido, ataques = 0, fugas = 0, fala, tema, revisar }) {
    const f = c?.fanpage; if (!f) return null;
    const itens = [];
    if (banido) itens.push(['Banido ao vivo', SEGUIDORES.banido]);
    else {
      itens.push([`Desempenho (nota ${nota.toFixed(1)})`, SEGUIDORES.porNota.find(([min]) => nota >= min)[1]]);
      if (fugas) itens.push([`Fugiu de ${fugas} pergunta(s)`, fugas * SEGUIDORES.fuga]);
      if (ataques) itens.push(['Treta rende engajamento', Math.min(4, Math.round(ataques)) * SEGUIDORES.ataque]);
      if (segundoTurno) itens.push(['Foi ao 2º turno', SEGUIDORES.segundoTurno]);
      if (eleito) itens.push(['Eleito(a)!', SEGUIDORES.eleito]);
    }
    // um pouco de variação, como numa rede de verdade
    const bruto = itens.reduce((a, [, v]) => a + v, 0), delta = Math.max(-f.seguidores, Math.round(bruto * (.85 + Math.random() * .3)));
    f.seguidores += delta;
    if (fala) {
      const viral = Math.max(.2, nota / 5) * (eleito ? 3 : 1);
      const post = { t: Date.now(), texto: limparTxt(revisarLocal(fala), 400), tema: tema || '', nota: Math.round(nota * 10) / 10, delta,
        curtidas: Math.round((20 + Math.random() * 300) * viral), reposts: Math.round((2 + Math.random() * 60) * viral), respostas: Math.round(Math.random() * 40 * viral) };
      f.posts.unshift(post);
      if (f.posts.length > SEGUIDORES.maxPosts) f.posts.length = SEGUIDORES.maxPosts;
      revisar?.(fala).then(t => { if (t) { post.texto = limparTxt(t, 400); this.salvar(); } }).catch(() => {}); // refino (Gemini) chega depois
    }
    this.salvar();
    return { delta, total: f.seguidores, itens };
  }
  /** Ação da loja no debate: ajusta seguidores na hora (sem post). Retorna o delta ou null (sem fanpage). */
  seguidoresAcao(c, fator) {
    const f = c?.fanpage; if (!f || !fator) return null;
    const delta = Math.max(-f.seguidores, Math.round(fator * (.85 + Math.random() * .3)));
    f.seguidores += delta; this.salvar(); return delta;
  }
  tem(c, item) { return possui(item, c?.itens, nivelMax(c)); } // cargo mínimo (ex.: faixa = Presidente) validado aqui: o perfil vindo do cliente não veste o que não pode
  comprarItem(c, id) {
    const it = Object.hasOwn(ITEM, id) && ITEM[id]; if (!c || !it) return 'Item inválido.'; // hasOwn: '__proto__'/'constructor' zeravam as moedas (NaN)
    if (!nivelOk(id, nivelMax(c))) return `Disponível só a partir do nível ${CARGOS[it.nivel - 1].nome}.`;
    if (this.tem(c, id)) return 'Você já tem este item.';
    if (c.moedas < it.preco) return `Moedas insuficientes: faltam ${it.preco - c.moedas}.`;
    c.moedas -= it.preco; (c.itens ||= []).push(id);
    (c.extrato ||= []).push({ t: Date.now(), valor: -it.preco, motivo: 'Loja: ' + it.nome }); this.salvar();
    return null;
  }
  equiparDanca(c, id) { if (!c || ITEM[id]?.tipo !== 'danca' || !this.tem(c, id)) return 'Dança indisponível.'; c.danca = id; this.salvar(); return null; }
  creditar(c, valor, motivo) { if (!c) return; c.moedas = Math.max(0, (c.moedas || 0) + valor); (c.extrato ||= []).push({ t: Date.now(), valor, motivo }); if (c.extrato.length > 50) c.extrato.shift(); this.salvar(); }
  comprar(c, pacoteId) {
    const p = ECONOMIA.pacotes.find(x => x.id === pacoteId);
    if (!c || !p) return 'Pacote inválido.';
    if (c.moedas < p.preco) return `Moedas insuficientes: faltam ${p.preco - c.moedas}.`;
    c.moedas -= p.preco; c.dicasExtra = (c.dicasExtra || 0) + p.dicas;
    (c.extrato ||= []).push({ t: Date.now(), valor: -p.preco, motivo: 'Loja: ' + p.nome }); this.salvar();
    return null;
  }
  usarDicaExtra(c) { if (!c || !(c.dicasExtra > 0)) return false; c.dicasExtra--; this.salvar(); return true; }
  banido(c) { return !!(c && (c.banPerm || (c.banidoAte && c.banidoAte > Date.now() && (ABANDONO.banAtivo || (c.banidoAte !== c.banAbandono && c.banidoAte !== c.banVotos))))); } // ban por abandono desativado: ignora suspensões vindas de abandono
  /** Banido de uma sala: aplica a escada do PUNICAO. Retorna { salas, semanais, mensais, susp: null|7|30|'perm' }. */
  registrarBanSala(c, motivo) {
    if (!c) return null;
    const agora = Date.now(), DIA = 86400000, P = PUNICAO, p = c.puni ||= { salas: [], sem: [], mes: 0 };
    p.salas = p.salas.filter(t => agora - t < P.diasSemana * DIA); p.salas.push(agora);
    (p.hist ||= []).unshift({ t: agora, motivo }); p.hist.length = Math.min(p.hist.length, 30);
    let susp = null;
    if (p.salas.length >= P.bansSemana) {
      p.salas = []; p.sem = p.sem.filter(t => agora - t < P.diasMes * DIA); p.sem.push(agora);
      if (p.sem.length >= P.suspMes) {
        p.sem = []; p.mes++;
        if (p.mes >= P.susp30Perm) { c.banPerm = true; susp = 'perm'; } else { c.banidoAte = Math.max(c.banidoAte || 0, agora + P.diasMes * DIA); susp = P.diasMes; }
      } else { c.banidoAte = Math.max(c.banidoAte || 0, agora + P.diasSemana * DIA); susp = P.diasSemana; }
    }
    const xp = this.mudarXp(c, -(XP_PUNICAO.banSala + (susp === 'perm' ? 0 : susp === P.diasMes ? XP_PUNICAO.suspensao30 : susp ? XP_PUNICAO.suspensao7 : 0)));
    this.salvar(); return { salas: p.salas.length, semanais: p.sem.length, mensais: p.mes, susp, xp };
  }
  /** Abandonou uma partida (saiu, caiu ou fechou o jogo e não voltou). 2 abandonos em 24 h → 1 h de suspensão + perde seguidores na Xzona. */
  registrarAbandono(c) {
    if (!c) return null;
    const agora = Date.now(), A = ABANDONO; c.abandonos = (c.abandonos || []).filter(t => agora - t < A.janelaMs); c.abandonos.push(agora);
    let ban = false, perda = 0;
    if (A.banAtivo && c.abandonos.length >= A.limite) {
      ban = true; c.abandonos = []; c.banidoAte = Math.max(c.banidoAte || 0, agora + A.banMs); c.banAbandono = c.banidoAte;
      if (c.fanpage) { perda = Math.min(c.fanpage.seguidores, A.seguidores); c.fanpage.seguidores -= perda; }
    }
    const xp = this.mudarXp(c, -(XP_PUNICAO.abandono + (ban ? XP_PUNICAO.suspensaoAbandono : 0)));
    this.salvar(); return { n: c.abandonos.length, ban, perda, ate: ban ? c.banidoAte : 0, xp };
  }
  /** Voto de denúncia por abandono: mais de 4 jogadores diferentes em 24 h → suspensão de 1 h. Retorna { n, ban } ou erro (string). */
  votoAbandono(c, deUid) {
    if (!c) return 'Jogador inválido.';
    const agora = Date.now(), A = ABANDONO; c.votosAbandono = (c.votosAbandono || []).filter(v => agora - v.t < A.janelaMs);
    if (c.votosAbandono.some(v => v.de === deUid)) return 'Você já denunciou este jogador por abandono hoje.';
    c.votosAbandono.push({ t: agora, de: deUid });
    let ban = false;
    if (A.banAtivo && c.votosAbandono.length >= A.votos) { ban = true; c.votosAbandono = []; c.banidoAte = Math.max(c.banidoAte || 0, agora + A.banMs); c.banVotos = c.banidoAte; }
    this.salvar(); return { n: c.votosAbandono.length, ban };
  }
  denunciar(d) { this.denuncias.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), data: Date.now(), status: 'aberta', ...d }); this.salvarDen(); }
}
