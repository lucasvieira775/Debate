// Falas do jornalista divididas em trechos reaproveitáveis (nomes, temas e frases fixas),
// para a dublagem gerar cada trecho uma vez só e reutilizar entre partidas.
import { TEMAS, TEMA, pick } from '../shared/regras.js';

const n = nome => `${nome},`;
const abertura = jorn => `Boa noite, Brasil! Está começando o grande Debate Presidencial! Eu sou ${jorn.nome}, e esta noite, frente a frente, estão:`;
export const ORDENS = [
  'Ordem, gente! Vamos manter a postura. Isso é um debate sério, não uma sala de aula de quinta série.',
  'Senhores, vamos manter a compostura! Tem milhões de pessoas assistindo vocês agora.',
  'Calma, calma! O eleitor quer ouvir propostas, não bate-boca.',
  'Por favor! Um de cada vez. Assim ninguém em casa consegue entender nada.',
  'Opa, opa! Vamos baixar a temperatura. Isso aqui é um debate presidencial, não uma briga de bar.',
  'Ordem no debate! O Brasil inteiro está de olho em vocês.',
  'Pessoal, respeito! Quem está em casa merece um debate à altura.',
  'Vamos com calma! Ataque pessoal não é proposta de governo.',
  'Atenção, candidatos! Mais respeito, por favor. Quem perde com isso é o eleitor.',
  'Chega! Vamos voltar ao debate de ideias. É isso que o país quer ver hoje.',
];
export const ORDEM = ORDENS[0];
export const BANIDO = 'esse tipo de ofensa não é tolerado neste debate. A sua candidatura está fora desta disputa.';
export const ADVERTENCIA = 'esta é uma advertência formal da mediação. Respeite as regras do debate. Na terceira advertência, a candidatura está fora.';
export const APURACAO ='Urnas fechadas! Começa agora a apuração, ao vivo. Acompanhe no telão os votos chegando de todo o Brasil!';
export const APURACAO2 = 'Começa agora a apuração do segundo turno! Quem vai levar? Acompanhe ao vivo!';
// frases neutras de gênero (não entregam o vencedor antes da hora)
const SUSPENSE = 'E o novo presidente do Brasil é…', VITORIA1 = 'Vitória já no primeiro turno, com a maioria absoluta dos votos válidos!', VITORIA2 = 'Vitória no segundo turno! Boa noite, Brasil, e até a próxima!';
const FIM_DUELO = 'Fim do confronto.', VOLTEM = 'muito bem. Podem voltar aos seus púlpitos.';
const SEGUNDO_TURNO = 'Começa agora o debate do segundo turno! Frente a frente:', REGRA_T2 = 'Confronto direto com tema livre. Cada um faz uma pergunta e o outro responde, sem réplica nem tréplica. Depois, as considerações finais. Tudo pode mudar!';
const TEMA_LIVRE = 'o tema é livre.', FINAL2 = 'Fim do confronto. Agora, as considerações finais do segundo turno. É a última chance de conquistar o eleitor.';
export const seg = s => `Você tem ${s} segundos.`;
const COBRANCAS = ['Seja objetivo, por favor.', 'O eleitor quer propostas concretas.', 'E diga de onde vai sair o dinheiro.', 'Queremos ouvir números e prazos.'];
// cada tema vira poucos trechos fixos (gerados uma vez e guardados): a abertura e a abertura+pergunta
const aberturaTema = t => `o tema sorteado vem ${t.de}: ${t.titulo}.`;
const temaComPergunta = t => `${aberturaTema(t)} ${t.pergunta}`;
/** Todos os trechos de tema (54 temas), para gerar em segundo plano. */
export const trechosTemas = () => TEMAS.flatMap(t => [temaComPergunta(t), aberturaTema(t)]);

export const N = {
  intro: (jorn, nomes) => [
    abertura(jorn),
    ...nomes.map(n),
    'No primeiro bloco, cada candidato apresenta propostas sobre um tema sorteado entre os vinte e sete estados brasileiros.',
  ],
  bloco2: () => ['Segundo bloco: confronto direto. Cada candidato escolhe um adversário, e o tema é sorteado na hora. Teremos pergunta, resposta, réplica e tréplica.'],
  bloco3: () => ['Chegamos ao terceiro e último bloco: as considerações finais. A ordem foi sorteada. É a última chance de convencer o eleitor.'],
  pesquisa: () => [pick(['Vamos aos números. O instituto divulga agora uma pesquisa relâmpago de intenção de voto.', 'Atenção para a pesquisa relâmpago: veja como está a intenção de voto neste momento.'])],
  roleta: nome => [n(nome), 'vamos sortear o estado e o seu tema.'],
  // cob = índice de cobrança extra ou -1 (sorteado ao montar a partida)
  proposta: (nome, t, s, v = 0, cob = -1) => [n(nome), temaComPergunta(t), ...(cob >= 0 ? [COBRANCAS[cob]] : []), seg(s)],
  escolha: nome => [n(nome), 'é a sua vez de perguntar. Escolha o seu adversário. O tema será sorteado.'],
  escolhido: (nome, alvo) => [n(nome), 'escolheu o adversário:', n(alvo), 'vamos sortear o tema!'],
  fimDuelo: (a, b) => [FIM_DUELO, n(a), n(b), VOLTEM],
  turno2: (a, b) => [SEGUNDO_TURNO, n(a), n(b), REGRA_T2],
  final2: () => [FINAL2],
  pergunta: (nome, alvo, t, s) => [n(nome), t ? aberturaTema(t) : TEMA_LIVRE, n(alvo), 'vai responder. Faça a sua pergunta.', seg(s)],
  resposta: (nome, s, v = 0) => [n(nome), ['a sua resposta.', 'agora é com você. A sua resposta.'][v % 2], seg(s)],
  replica: (nome, s) => [n(nome), 'a sua réplica.', seg(s)],
  treplica: (nome, s) => [n(nome), 'a sua tréplica.', seg(s)],
  final: (nome, s, v = 0) => [n(nome), ['suas considerações finais. Por que o eleitor deve confiar no seu voto?', 'suas considerações finais. O que o eleitor ganha votando em você?'][v % 2], seg(s)],
  ordem: () => [pick(ORDENS)],
  banido: nome => [n(nome), BANIDO],
  advertencia: nome => [n(nome), ADVERTENCIA],
  apuracao: () => [APURACAO],
  apuracao2: () => [APURACAO2],
  // revelação: suspense no close (sem nome) e, 3,5 s depois, o nome exclamado quando o telão mostra o vencedor
  suspense: () => [SUSPENSE],
  vence1: nome => [`${nome}!`, VITORIA1],
  segundoTurno: (a, b) => ['Apuração encerrada. Nenhum candidato alcançou a maioria dos votos válidos. Vão para o segundo turno:', n(a), n(b), 'Em instantes, o debate do segundo turno.'],
  vence2: nome => [`${nome}!`, VITORIA2],
};

/** Trechos fixos (sem nomes) para gerar com antecedência quando o servidor liga. */
export function trechosFixos(jorn) {
  const segundos = [30, 45, 60, 90, 15, 23, 68, 34];
  return [
    abertura(jorn),
    ...N.bloco2(), ...N.bloco3(),
    'No primeiro bloco, cada candidato apresenta propostas sobre um tema sorteado entre os vinte e sete estados brasileiros.',
    'Vamos aos números. O instituto divulga agora uma pesquisa relâmpago de intenção de voto.', 'Atenção para a pesquisa relâmpago: veja como está a intenção de voto neste momento.',
    'vamos sortear o estado e o seu tema.', 'é a sua vez de perguntar. Escolha o seu adversário. O tema será sorteado.', 'escolheu o adversário:', 'vamos sortear o tema!',
    'vai responder. Faça a sua pergunta.', 'a sua resposta.', 'agora é com você. A sua resposta.', 'a sua réplica.', 'a sua tréplica.',
    'suas considerações finais. Por que o eleitor deve confiar no seu voto?', 'suas considerações finais. O que o eleitor ganha votando em você?',
    SUSPENSE, VITORIA1, VITORIA2,
    'Apuração encerrada. Nenhum candidato alcançou a maioria dos votos válidos. Vão para o segundo turno:', 'Em instantes, o debate do segundo turno.',
    FIM_DUELO, VOLTEM, SEGUNDO_TURNO, REGRA_T2, TEMA_LIVRE, FINAL2, ...COBRANCAS, ...segundos.map(seg), ...ORDENS, BANIDO, ADVERTENCIA, APURACAO, APURACAO2,
  ];
}
export const sortearVariacao = () => ({ v: Math.random() * 2 | 0, cob: Math.random() < .35 ? Math.random() * COBRANCAS.length | 0 : -1 });
