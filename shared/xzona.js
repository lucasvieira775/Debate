// "Xzona": rede social fictícia e cômica. Depois de cada fala, perfis inventados comentam o candidato.
// {nome} = candidato · {partido} = sigla · {estado} = estado do tema · {tema} = título do tema · {num} = número do partido
import { pick, shuffle } from './regras.js';

export const PERFIS = [
  ['Tia do Zap', 'tiadozap_oficial'], ['Cidadão Indignado', 'indignado_24h'], ['Eleitor Raiz', 'eleitor_raiz'], ['Memes de Brasília', 'memesdebrasilia'],
  ['Nerd da Política', 'nerd_da_politica'], ['Vovó Conectada', 'vovo_conectada'], ['Economista de Bar', 'economista_de_bar'], ['Zé do Boteco', 'ze_do_boteco'],
  ['Influencer Fit', 'influ_fit_e_politica'], ['Jornalzinho 24h', 'jornalzinho24h'], ['Pão de Queijo News', 'paodequeijonews'], ['Cansado de Tudo', 'cansado_de_tudo'],
  ['Professora Rita', 'prof_rita_historia'], ['Motorista de App', 'motora_de_app'], ['Gamer Patriota', 'gamer_patriota'], ['Fiscal de Debate', 'fiscal_de_debate'],
  ['Dona Cida da Feira', 'cida_da_feira'], ['Estagiário do Mercado', 'estagiario_da_bolsa'], ['Biscoiteiro Político', 'biscoito_politico'], ['Sommelier de Promessa', 'sommelier_de_promessa'],
  ['Tio do Churrasco', 'tio_do_churras'], ['Concurseira Cansada', 'concurseira_zzz'], ['Seu Juca Aposentado', 'juca_aposentado'], ['Barbeiro Filósofo', 'barbeiro_filosofo'],
  ['Mãe de Pet', 'mae_de_3_gatos'], ['Fofoqueira Oficial', 'fofoca_da_vila'], ['Coach Quântico', 'coach_quantico'], ['Universitário Sem Grana', 'univ_sem_grana'],
  ['Caminhoneiro Raiz', 'caminhoneiro_br116'], ['Agro Sincero', 'agro_sincero'], ['Ciclista Revoltado', 'pedala_brasil'], ['Padeiro das 5h', 'padeiro_madrugador'],
  ['Checador de Fatos', 'checa_ai'], ['Vizinho Barulhento', 'vizinho_do_301'], ['Torcedor Sofredor', 'sofredor_fc'], ['Dona Neide do Bingo', 'neide_do_bingo'],
  ['Pastor de Memes', 'memes_abencoados'], ['Programador Insone', 'dev_as_3h'], ['Tia Professora', 'tia_do_pre'], ['Enfermeira Plantonista', 'plantao_12x36'],
  ['Sindicalista Raiz', 'sindicato_na_veia'], ['Empreendedor de Palco', 'ceo_de_mim_mesmo'], ['Gringo Confuso', 'gringo_no_brasil'], ['Bot Suspeito 3000', 'user8472913'],
  ['Analista de Sobrancelha', 'olho_no_gesto'], ['Cientista Política Exausta', 'cientista_politica'], ['Mototaxista Veloz', 'moto_taxi_zl'], ['Rádio Poste FM', 'radioposte_fm'],
  ['Sobrinho do Prefeito', 'sobrinho_do_prefeito'], ['Ex-BBB Engajada', 'exbbb_engajada'], ['Velho Desconfiado', 'nao_creio_em_nada'], ['Cozinheira de Marmita', 'marmita_da_lu'],
];
const VERIFICADOS = new Set(['memesdebrasilia', 'jornalzinho24h', 'paodequeijonews', 'nerd_da_politica', 'fiscal_de_debate', 'checa_ai', 'radioposte_fm', 'exbbb_engajada', 'cientista_politica']);
// palavrões censurados ao estilo gibi
const CENSURA = ['@#$%', '#@$%&', '$%#@!', '@#$!', '%$#@&'];
export const censurar = p => p ? p.split(' ').map(w => w[0] + pick(CENSURA).slice(0, Math.max(3, Math.min(5, w.length - 1)))).join(' ') : pick(CENSURA);
const TAGS = { geral: ['#DebateNaXzona', '#DebatePresidencial', '#Eleições', '#AoVivo', '#ForaEnrolação', '#Brasil'], ruim: ['#VergonhaAlheia', '#Desliguei', '#CadêAProposta'], bom: ['#{partido}', '#{num}NaUrna', '#VaiQueÉTua'] };

export const POSTS = {
  pessima: [
    'Que coisa ridícula esse candidato {nome}. Desliguei a TV.',
    '{nome} tá viajando na maionese, cara. Esse cara não pode ganhar.',
    'Eu tô passando vergonha alheia com o {nome} aqui em casa 😬',
    'O {nome} falou, falou e não disse nada. Impressionante.',
    'Minha avó de 92 anos responderia melhor que o {nome}.',
    'Alguém manda um resumo do plano do {nome}? Ah, não tem plano. 🤡',
    '{nome} confundiu debate com stand-up. Só que sem graça.',
    'Se o {partido} queria perder voto, conseguiu. Parabéns, {nome}.',
    'Acabei de ver o {nome} e agora tô considerando votar nulo 🗳️❌',
    'O assessor do {nome} deve estar procurando emprego agora 💀',
    'Que @#$% foi essa, {nome}?! Socorro.',
    'Mano do céu… o {nome} conseguiu piorar o que já tava ruim. #$%@!',
    'Se resposta ruim desse dinheiro, o {nome} pagava a dívida pública 💸',
    'Meu cachorro latiu pra TV quando o {nome} começou a falar. Ele sabe das coisas 🐶',
    'Votar no {nome}? Nem com a @#$% de um decreto.',
    'O {partido} vai ter reunião de emergência hoje à noite, certeza 🚨',
    'Tá, mas o {nome} ensaiou isso ou foi no improviso mesmo? Porque parece improviso.',
    'Eu: "não pode ser tão ruim". O {nome}: segura minha cerveja 🍺',
    'Fact-check: nada do que o {nome} disse faz sentido. Fim do fact-check.',
    'Print pra daqui 4 anos ninguém dizer que não avisei: o {nome} não sabe o que fala 📸',
  ],
  ruim: [
    'Fraquinho o {nome}… esperava mais.',
    '{nome} enrolou bonito, hein. Cadê a proposta?',
    'Nota 3 pro {nome}, e tô sendo generoso.',
    'O {nome} até começou bem, mas se perdeu no meio 😴',
    '{nome} precisa de um curso intensivo de oratória URGENTE.',
    'Faltou número, faltou meta, faltou tudo. Né, {nome}?',
    'Se esse é o plano pro {estado}, o {estado} que se cuide.',
    'O {nome} falou de {tema} como quem lê bula de remédio.',
    'Dormi no meio da resposta do {nome} e acordei sem perder nada 😴',
    'Enquete rápida: o {nome} respondeu a pergunta? 🅰️ Não 🅱️ Também não',
    'Parecia redação do Enem sem tema, {nome}. Nota 400.',
    'O {nome} usou 3 minutos pra dizer "vamos ver isso aí". Que @#$%...',
    'Promessa vaga detectada 🚨 Autor: {nome}. Tema: {tema}.',
    'Falou bonito, mas na prática? O {estado} quer saber, {nome}.',
    'Só eu achei que o {nome} tava lendo a cola do bolso? 👀',
  ],
  media: [
    'O {nome} foi ok. Nem amei nem odiei 🤷',
    'Resposta morna do {nome}. Dá pra melhorar no próximo bloco.',
    '{nome} tem umas ideias boas, mas faltou firmeza.',
    'Achei razoável o {nome}. Vou esperar as considerações finais.',
    'Metade do que o {nome} disse fez sentido. A outra metade… 🤔',
    'O {nome} pelo menos falou do {estado}. Já é alguma coisa.',
    'Nota 6 pro {nome}. Passou raspando.',
    'Nem fede nem cheira, {nome}. Arroz sem sal 🍚',
    'O {nome} jogou no seguro. Às vezes funciona, às vezes não.',
    'Resposta de quem quer agradar todo mundo e não agrada ninguém 😐',
    'Tô dividido sobre o {nome}. Vou pedir opinião no grupo da família.',
    'Sobre {tema}: o {nome} acertou no diagnóstico, errou no remédio.',
    'Até aqui o {nome} tá empatado com o meu interesse: morno ☕',
    'O {partido} esperava mais, mas não foi vexame.',
  ],
  boa: [
    'Mandou bem, {nome}! Finalmente alguém com proposta 👏',
    'O {nome} explicou direitinho o plano pra {tema}. Gostei.',
    'Sinceramente? {nome} me convenceu nessa resposta.',
    '{nome} falou com o povo, não com o espelho. Isso conta muito.',
    'Ponto pro {partido}! O {nome} tá crescendo no debate 📈',
    'Gente, o {nome} tem plano até pro {estado}. Respeito.',
    'Resposta firme do {nome}. Vou prestar mais atenção nesse candidato.',
    'Olha, não queria admitir, mas o {nome} mandou bem 😤👍',
    'Minha tia acabou de mudar o voto pro {nome} no grupo da família 📲',
    'Teve número, teve meta, teve prazo. Isso é raro, {nome}!',
    'O {nome} respondeu {tema} melhor que muito ministro por aí.',
    'Postura, clareza e proposta. O {partido} tá feliz hoje 😁',
    'Anota aí: o {nome} vai subir nas pesquisas depois dessa 📊',
    'Resposta limpa, sem enrolação. É disso que o {estado} precisa.',
  ],
  otima: [
    'QUE RESPOSTA, {nome}! Aplaudi de pé aqui na sala 👏👏👏',
    '{nome} PRESIDENTE! Falei e repito.',
    'O {nome} deu uma aula de {tema} agora. Sem condições.',
    'Print dessa resposta do {nome} vai rodar o país inteiro 🔥',
    'Esse {nome} chegou pra brigar pela vitória. Que debate!',
    'Votaria no {nome} só por essa resposta. {num} na urna! 🗳️',
    'Mitou! O {nome} acabou com a discussão sobre {tema}.',
    'PUTZ, que @#$% de resposta boa! {nome} jogou muito 🤯',
    'Os outros candidatos tão anotando a resposta do {nome} pra copiar 📝',
    'Arrepiei com o {nome} agora. Sério. 🥹',
    'Isso não foi resposta, foi PALESTRA. {nome} no topo 🏆',
    'Já virou meme o "{tema}" do {nome}. Em 5 minutos. Recorde 🚀',
    'Eu era indeciso. ERA. {num} confirma! ✅',
    'Se o debate acabasse agora, o {nome} levava fácil.',
  ],
  fugiu: [
    'Perguntaram de {tema} e o {nome} respondeu sobre o tempo, é isso?',
    'O {nome} FUGIU da pergunta descaradamente 🏃‍♂️💨',
    '"Responde a pergunta!" — eu gritando com a TV por causa do {nome}.',
    'Alguém avisa o {nome} que a pergunta era sobre {tema} 🙃',
    'Pergunta: {tema}. Resposta: qualquer @#$% menos {tema}. Clássico.',
    'O {nome} driblou a pergunta melhor que jogador de várzea ⚽',
    'GPS do {nome} recalculando rota… pergunta não encontrada 🗺️',
    'Fugir da pergunta deveria tirar ponto em dobro. Né, {nome}?',
  ],
  ataque: [
    'Eitaaa, o {nome} partiu pra cima! 🔥🍿',
    'Clima esquentou! O {nome} não deixou barato.',
    'Pipoca na mão: o {nome} resolveu atacar 🍿🍿',
    'Baixaria ou estratégia? O {nome} escolheu o ataque.',
    'Alguém chama os bombeiros que o {nome} botou fogo no estúdio 🚒',
    'O {nome} veio com sangue nos olhos hoje 😤',
    'Esse direito de resposta vai ser LINDO de ver 🍿👀',
    'Treta no debate é igual novela: ninguém admite, mas todo mundo assiste.',
  ],
  xingou: [
    'O {nome} xingou no debate?! Que falta de compostura.',
    'Gente, o {nome} esqueceu que tá na TV ao vivo 😳',
    'Perdeu meu voto aí, {nome}. Respeito é o mínimo.',
    'O {nome} mandou um "{xing}" ao vivo em rede nacional 😱',
    'Chamar adversário de {xing}?? Que @#$% é essa, {nome}?',
    '"{xing}" — {nome}, 2026. Vai pro livro de história (do jeito errado) 📚',
    'Minha mãe ouviu o {nome} falar "{xing}" e mandou eu tampar o ouvido do meu irmão 🙉',
    'Bipe! 📢 O {nome} soltou um "{xing}" e a emissora não segurou.',
    'O {nome} achou que tava no grupo da pelada falando "{xing}" 🤦',
  ],
  banido: [
    'O {nome} foi TIRADO do debate! Nunca vi isso 😱',
    'Moderação agiu e o {nome} rodou. Bem feito.',
    'Candidatura do {nome} acabou ao vivo. Histórico.',
    'Saiu escoltado do estúdio, hein {nome}? Tchau, querido(a) 👋',
    'Isso que dá falar @#$% na TV. Tchau, {nome}!',
    'O {partido} vai ter que trocar de candidato no meio do debate? 😂',
    'BANIDO. Nem o melhor advogado salva o {nome} dessa ⚖️',
  ],
  silencio: [
    'O {nome} travou? Cadê a resposta?? 😶',
    'Silêncio constrangedor do {nome}. Deu branco geral.',
    'Tela azul no {nome}. Alguém reinicia? 💻',
    'O {nome} tá ouvindo o som do silêncio… e nós também 🦗',
    'Microfone mudo ou ideia muda, {nome}? 🎤❌',
    'Vou fazer um café enquanto o {nome} pensa ☕',
  ],
  vitoria: [
    '{nome} ELEITO(A)! Que noite histórica 🎉🇧🇷',
    'Parabéns, {nome}! Agora é cobrar as promessas, hein 👀',
    'Festa no comitê do {partido}! {nome} venceu!',
    'Eu sabia que o {nome} ia ganhar desde o primeiro bloco 😎',
    'Respeita! {nome} levou essa. {num} venceu nas urnas 🗳️🏆',
    'Os outros candidatos tão procurando onde foi que erraram 😅',
    'Que @#$% de noite! {nome} ganhou e eu ganhei a aposta 💰',
    'Já tô cobrando: e aquela promessa sobre {tema}, {nome}? 📝',
  ],
  // comentários soltos, que aparecem no meio do feed
  geral: [
    'Alguém mais assistindo o debate comendo pipoca? 🍿',
    'O cenário desse debate tá mais bonito que muito programa de auditório.',
    'Quem tá ganhando até agora na opinião de vocês? 👇',
    'Debate bom é aquele que rende meme. Esse tá rendendo 😂',
    'Meu pai já brigou com a TV três vezes. Recorde da família.',
    'Grupo da família pegando fogo agora 🔥📱',
    'Plateia animada hoje, hein! Parece final de campeonato 🏟️',
    'Tô contando quantas vezes falam "povo". Já perdi a conta.',
    'Eu não entendi nada, mas tô adorando o caos 🌀',
    'Reloginho do tempo de resposta é o verdadeiro vilão do debate ⏱️',
    'Que @#$% de debate disputado, meu Deus.',
    'Hoje ninguém dorme cedo no Brasil 🌙',
  ],
};

/** Escolhe 2–4 posts para uma fala avaliada. res = resultado da análise da fala. */
export function postsDaFala({ nome, partido, num, estado, tema, genero }, res) {
  const nivel = res.wc < 5 ? 'silencio' : res.nota < 3 ? 'pessima' : res.nota < 4.5 ? 'ruim' : res.nota < 6.5 ? 'media' : res.nota < 8 ? 'boa' : 'otima';
  const grupos = [nivel, nivel];
  if (res.fugiu) grupos.unshift('fugiu');
  if (res.ataque) grupos.push('ataque');
  if (res.xingamentos?.length) grupos.unshift('xingou');
  if (Math.random() < .5) grupos.push(nivel);
  if (Math.random() < .3) grupos.splice(1 + Math.floor(Math.random() * (grupos.length - 1)), 0, 'geral');
  return montar(grupos, { nome, partido, num, genero, estado: estado || 'o país', tema: tema || 'esse assunto', xing: censurar(res.xingamentos?.[0]) }, nivel);
}
export function postsDe(grupo, dados, n = 3) { return montar(Array(n).fill(grupo), dados, grupo); }

// Concordância de gênero: os modelos estão no masculino; ajusta para candidata ou pessoa não binária.
const FEM = [[/Fraquinho o \{nome\}/g, 'Fraquinha a {nome}'], [/\bno \{nome\}/g, 'na {nome}'], [/\b([Oo]) \{nome\}/g, (_, o) => (o === 'O' ? 'A' : 'a') + ' {nome}'], [/\bdo \{nome\}/g, 'da {nome}'], [/\bpro \{nome\}/g, 'pra {nome}'],
  [/\b([Ee])sse \{nome\}/g, '$1ssa {nome}'], [/esse candidato/g, 'essa candidata'], [/nesse candidato/g, 'nessa candidata'], [/[Ee]sse cara/g, 'Essa mulher'], [/ELEITO\(A\)/g, 'ELEITA'], [/querido\(a\)/g, 'querida']];
const NB = [[/Fraquinho o \{nome\}/g, 'Fraquinha a resposta de {nome}'], [/\bno \{nome\}/g, 'em {nome}'], [/\b[Oo] \{nome\}/g, '{nome}'], [/\bdo \{nome\}/g, 'de {nome}'], [/\bpro \{nome\}/g, 'pra {nome}'], [/\b([Ee])sse \{nome\}/g, '{nome}'],
  [/esse candidato \{nome\}/g, '{nome}'], [/nesse candidato/g, 'nessa candidatura'], [/[Ee]sse cara/g, 'Essa pessoa'], [/ELEITO\(A\)/g, 'ELEITE'], [/querido\(a\)/g, 'queride']];
const MASC = [[/ELEITO\(A\)/g, 'ELEITO'], [/querido\(a\)/g, 'querido']];
export function concordar(txt, genero) {
  const regras = genero === 'feminino' ? FEM : genero === 'naobinario' || genero === 'nao_binario' || genero === 'nb' ? NB : MASC;
  const t = regras.reduce((s, [re, sub]) => s.replace(re, sub), txt);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function montar(grupos, dados, nivel) {
  const usados = new Set(), perfis = shuffle(PERFIS.slice());
  return grupos.slice(0, 4).map((g, k) => {
    let txt; do txt = pick(POSTS[g]); while (usados.has(txt) && POSTS[g].length > usados.size);
    usados.add(txt);
    const [nomeP, user] = perfis[k];
    const viral = ['pessima', 'otima', 'xingou', 'banido', 'vitoria'].includes(nivel) ? 6 : 1;
    if (Math.random() < .35) { // hashtag no fim, às vezes
      const t = pick(['pessima', 'ruim', 'xingou', 'banido', 'silencio'].includes(g) ? TAGS.ruim : ['boa', 'otima', 'vitoria'].includes(g) ? TAGS.bom : TAGS.geral);
      txt += ' ' + t;
    }
    const subst = (_, c) => dados[c] ?? '';
    return {
      nome: nomeP, user, verificado: VERIFICADOS.has(user),
      texto: concordar(txt, dados.genero).replace(/#\{(\w+)\}/g, (_, c) => '#' + String(dados[c] ?? '').replace(/\s+/g, '')).replace(/\{(\w+)\}/g, subst),
      curtidas: Math.round((50 + Math.random() * 900) * viral), reposts: Math.round((5 + Math.random() * 200) * viral), respostas: Math.round(Math.random() * 120 * viral),
    };
  });
}
