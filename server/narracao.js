// Falas do jornalista divididas em trechos reaproveitáveis (nomes, temas e frases fixas),
// para a dublagem gerar cada trecho uma vez só e reutilizar entre partidas.
import { TEMAS, TEMA, pick } from '../shared/regras.js';

const n = nome => `${nome},`;
const abertura = jorn => `Boa noite, Brasil! Está começando o grande Debate Presidencial! Eu sou ${jorn.nome}, e vou mediar este debate.`;
const CUMPRIMENTEM = 'Candidatos, antes de começar, vocês podem se cumprimentar.', FRENTE = 'Esta noite, frente a frente, estão:';
export const ORDENS = [
  'Ordem, gente! Vamos manter a postura. Isso é um debate sério, não uma sala de aula de quinta série.',
  'Senhoras e senhores, vamos manter a compostura! Tem milhões de pessoas assistindo vocês agora.',
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
const SUSPENSE = 'E o novo presidente do país é…', VITORIA1 = 'Vitória já no primeiro turno, com a maioria absoluta dos votos válidos!', VITORIA2 = 'Vitória no segundo turno! Boa noite, Brasil, e até a próxima!';
const FIM_DUELO = 'Fim do confronto.', VOLTEM = 'muito bem. Podem voltar aos seus púlpitos.';
const SEGUNDO_TURNO = 'Começa agora o debate do segundo turno! Frente a frente:', REGRA_T2 = 'Confronto direto com tema livre. Cada um faz uma pergunta e o outro responde, sem réplica nem tréplica. Depois, as considerações finais. Tudo pode mudar!';
const BLOCO1 = 'No primeiro bloco, cada candidato apresenta propostas sobre um tema sorteado, que pode ser de um dos vinte e sete estados ou de alcance nacional.';
const TEMA_LIVRE = 'o tema é livre.', FINAL2 = 'Fim do confronto. Agora, as considerações finais do segundo turno. É a última chance de conquistar o eleitor.';
export const seg = s => `Você tem ${s} segundos.`;
const COBRANCAS = ['Vá direto ao ponto, por favor.', 'O eleitor quer propostas concretas.', 'E diga de onde vai sair o dinheiro.', 'Queremos ouvir números e prazos.'];
// cada tema vira poucos trechos fixos (gerados uma vez e guardados): a abertura e a abertura+pergunta
const aberturaTema = t => `e o tema é: ${t.titulo}.`; // só o título (sem "nacional"/estado)
const temaComPergunta = t => `${aberturaTema(t)} ${t.pergunta}`;
/** Todos os trechos de tema (estaduais + nacionais), para gerar em segundo plano. */
export const trechosTemas = () => TEMAS.flatMap(t => [temaComPergunta(t), aberturaTema(t)]);

// ações da loja (cadeirada, tomate, flores…): falas fixas, sem nome (ficam em cache na dublagem)
export const FALAS_ACAO = [
  'Calma, gente! Não foi nada, pode se levantar!',
  'Opa, opa, opa! Isso aqui é um debate, não um ringue! Está tudo bem aí? Levante, por favor!',
  'Pelo amor de Deus, gente! Produção, alguém ajuda aqui! Não foi nada, respira fundo e levanta!',
  'Senhoras e senhores, isso é inadmissível! Vamos voltar às propostas! Tá tudo bem aí?',
  'Gente, a audiência está lá em cima, mas vamos com calma! Levanta, sacode a poeira!',
  'Isso não estava no regulamento! Levante, por favor, a democracia precisa de você!',
  'Calma, calma! Ninguém se machucou de verdade. Vamos manter o nível, por favor!',
  'Que é isso, minha gente! Segura essa emoção aí! Pode levantar, o debate continua!',
  'Ai, meu Deus! Corta pro intervalo! Não, não, estamos ao vivo! Levanta, não foi nada!',
  'Vamos respeitar o adversário, por favor! Pode levantar, foi só um susto!',
];
// tomate, torta, balde: o alvo não cai (sem "levante")
export const FALAS_LEVE = [
  'Calma, gente! Não foi nada, pode se limpar aí!',
  'Opa, opa, opa! Isso aqui é um debate, não uma guerra de comida! Produção, uma toalha, por favor!',
  'Senhoras e senhores, isso é inadmissível! Vamos voltar às propostas! Tá tudo bem aí?',
  'Calma, calma! Ninguém se machucou de verdade. Vamos manter o nível, por favor!',
  'Que é isso, minha gente! Segura essa emoção aí! Respira fundo, o debate continua!',
  'Vamos respeitar o adversário, por favor! Foi só um susto, vamos seguir!',
];
export const FALAS_FLORES = [
  'Que lindo! Olha só, gente, finalmente um pouco de amor neste debate!',
  'Ah, que gesto bonito! É disso que o Brasil precisa: mais flores e menos cadeiradas!',
  'Que carinho! Até a bancada da mediação ficou emocionada!',
  'Flores no debate! A política brasileira tem jeito, sim, senhoras e senhores!',
  'Que coisa mais fofa! Guardem esse momento, porque não acontece todo dia!',
];

export const N = {
  abertura: jorn => [abertura(jorn), CUMPRIMENTEM],
  intro: nomes => [
    FRENTE,
    ...nomes.map(n),
    BLOCO1,
  ],
  bloco2: () => ['Segundo bloco: confronto direto. Cada candidato escolhe um adversário, e o tema é sorteado na hora. Teremos pergunta, resposta, réplica e tréplica.'],
  bloco3: () => ['Chegamos ao terceiro e último bloco: as considerações finais. A ordem foi sorteada. É a última chance de convencer o eleitor.'],
  pesquisa: () => [pick(['Vamos aos números. O instituto divulga agora uma pesquisa relâmpago de intenção de voto.', 'Atenção para a pesquisa relâmpago: veja como está a intenção de voto neste momento.'])],
  roleta: nome => [n(nome), 'vamos sortear o seu tema.'],
  // cob = índice de cobrança extra ou -1 (sorteado ao montar a partida)
  proposta: (nome, t, s, v = 0, cob = -1) => [n(nome), temaComPergunta(t), ...(cob >= 0 ? [COBRANCAS[cob]] : []), seg(s)],
  escolha: nome => [n(nome), 'é a sua vez de perguntar. Escolha quem você vai enfrentar. O tema será sorteado.'],
  escolhido: (nome, alvo) => [n(nome), 'escolheu quem vai enfrentar:', n(alvo), 'vamos sortear o tema!'],
  fimDuelo: (a, b) => [FIM_DUELO, n(a), n(b), VOLTEM],
  turno2: (a, b) => [SEGUNDO_TURNO, n(a), n(b), REGRA_T2],
  final2: () => [FINAL2],
  pergunta: (nome, alvo, t, s) => [n(nome), t ? aberturaTema(t) : TEMA_LIVRE, n(alvo), 'vai responder. Faça a sua pergunta.', seg(s)],
  resposta: (nome, s, v = 0) => [n(nome), ['a sua resposta.', 'agora é com você. A sua resposta.'][v % 2], seg(s)],
  replica: (nome, s) => [n(nome), 'a sua réplica.', seg(s)],
  treplica: (nome, s) => [n(nome), 'a sua tréplica.', seg(s)],
  final: (nome, s, v = 0) => [n(nome), ['suas considerações finais. Por que o eleitor deve votar em você?', 'suas considerações finais. O que o eleitor ganha votando em você?'][v % 2], seg(s)],
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
    abertura(jorn), CUMPRIMENTEM, FRENTE,
    ...N.bloco2(), ...N.bloco3(),
    BLOCO1,
    'Vamos aos números. O instituto divulga agora uma pesquisa relâmpago de intenção de voto.', 'Atenção para a pesquisa relâmpago: veja como está a intenção de voto neste momento.',
    'vamos sortear o seu tema.', 'é a sua vez de perguntar. Escolha quem você vai enfrentar. O tema será sorteado.', 'escolheu quem vai enfrentar:', 'vamos sortear o tema!',
    'vai responder. Faça a sua pergunta.', 'a sua resposta.', 'agora é com você. A sua resposta.', 'a sua réplica.', 'a sua tréplica.',
    'suas considerações finais. Por que o eleitor deve votar em você?', 'suas considerações finais. O que o eleitor ganha votando em você?',
    SUSPENSE, VITORIA1, VITORIA2,
    'Apuração encerrada. Nenhum candidato alcançou a maioria dos votos válidos. Vão para o segundo turno:', 'Em instantes, o debate do segundo turno.',
    FIM_DUELO, VOLTEM, SEGUNDO_TURNO, REGRA_T2, TEMA_LIVRE, FINAL2, ...COBRANCAS, ...segundos.map(seg), ...ORDENS, BANIDO, ADVERTENCIA, APURACAO, APURACAO2,
  ];
}
export const sortearVariacao = () => ({ v: Math.random() * 2 | 0, cob: Math.random() < .35 ? Math.random() * COBRANCAS.length | 0 : -1 });
