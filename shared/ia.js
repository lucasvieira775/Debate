// Candidatos controlados pela IA local: gera falas coerentes com a ideologia, o tema sorteado e a dificuldade.
// Roda inteiramente no servidor do jogo, sem internet e sem serviços externos.
import { TEMA, PARTIDO, pick, shuffle } from './regras.js';

const LADO = { 'esquerda': 'esq', 'centro-esquerda': 'esq', 'centro': 'cen', 'centro-direita': 'dir', 'direita': 'dir' };

const PROPOSTAS = {
  saude: {
    esq: ['vou ampliar o SUS, contratar 20 mil médicos e enfermeiros e zerar a fila de cirurgias em dois anos', 'vamos garantir remédio gratuito em todo posto de saúde do país'],
    cen: ['vou criar uma central nacional de regulação para reduzir pela metade a fila de atendimento', 'vamos fazer parceria com hospitais filantrópicos para ampliar as cirurgias e consultas com especialista'],
    dir: ['vou levar gestão eficiente ao SUS, com metas por hospital e parceria com a rede privada', 'vamos criar um voucher de saúde para o paciente ser atendido onde houver vaga, sem fila'],
  },
  educacao: {
    esq: ['vou valorizar o professor com piso salarial digno e escola em tempo integral para todos', 'vamos ampliar as vagas nas universidades públicas e manter as cotas'],
    cen: ['vou implantar escola em tempo integral com meta de alfabetização de toda criança até os sete anos', 'vamos premiar as escolas que mais melhorarem o aprendizado dos alunos'],
    dir: ['vou levar o ensino técnico para um milhão de jovens, em parceria com as empresas', 'vamos cobrar resultado de cada escola e ampliar as escolas cívico-militares'],
  },
  seguranca: {
    esq: ['vou investir em inteligência policial e em oportunidades para tirar o jovem do crime', 'vamos colocar câmeras corporais em todos os policiais e reduzir a violência'],
    cen: ['vou integrar as polícias em um sistema nacional de inteligência e dados', 'vamos reforçar a fronteira com tecnologia e com a Polícia Federal contra o tráfico'],
    dir: ['vou endurecer as penas, com tolerância zero contra as facções e o crime organizado', 'vamos dar apoio total à polícia e garantir o direito à legítima defesa'],
  },
  economia: {
    esq: ['vou valorizar o salário mínimo acima da inflação e baixar os juros para quem trabalha', 'vamos retomar as obras públicas para gerar dois milhões de empregos'],
    cen: ['vou equilibrar as contas e reduzir os juros com responsabilidade, para atrair investimento e emprego', 'vamos renegociar as dívidas das famílias com um grande programa de crédito'],
    dir: ['vou cortar gastos, reduzir impostos e destravar a livre iniciativa para gerar empregos', 'vamos privatizar estatais ineficientes e desburocratizar a abertura de empresas'],
  },
  ambiente: {
    esq: ['vou zerar o desmatamento ilegal e proteger as terras indígenas e a floresta', 'vamos pagar quem preserva e investir pesado em energia renovável'],
    cen: ['vou criar um mercado de carbono para que preservar a floresta dê renda', 'vamos fiscalizar com satélite e punir quem desmata ou provoca queimada ilegal'],
    dir: ['vou dar segurança jurídica ao produtor e combater o crime ambiental com firmeza', 'vamos destravar o licenciamento de energia conciliando desenvolvimento e preservação'],
  },
  corrupcao: {
    esq: ['vou fortalecer os órgãos de controle e acabar de vez com o orçamento secreto', 'vamos dar transparência total às emendas parlamentares, em tempo real'],
    cen: ['vou criar um portal único de transparência com todas as emendas e licitações', 'vamos fortalecer a auditoria e a fiscalização de cada gasto público'],
    dir: ['vou acabar com a impunidade, com prisão após condenação em segunda instância', 'vamos enxugar a máquina pública e fiscalizar cada centavo do contribuinte'],
  },
  previdencia: {
    esq: ['vou proteger a aposentadoria do trabalhador e zerar a fila do INSS', 'vamos cobrar os grandes devedores da Previdência'],
    cen: ['vou zerar a fila do INSS em um ano com perícia digital', 'vamos discutir as regras com diálogo, sem tirar direito de quem já contribuiu'],
    dir: ['vou garantir responsabilidade fiscal para a Previdência não quebrar', 'vamos combater as fraudes nos benefícios e modernizar o INSS'],
  },
  impostos: {
    esq: ['vou taxar as grandes fortunas e os dividendos e isentar do imposto de renda quem ganha até cinco mil reais', 'vamos fazer o super-rico pagar a sua parte'],
    cen: ['vou simplificar os impostos e acabar com a guerra fiscal entre os estados', 'vamos reduzir a carga sobre o consumo, com equilíbrio nas contas'],
    dir: ['vou reduzir impostos e simplificar a tributação de quem empreende', 'vamos cortar privilégios antes de pensar em aumentar qualquer imposto'],
  },
  moradia: {
    esq: ['vou construir dois milhões de casas populares e urbanizar as favelas', 'vamos levar saneamento básico a todas as periferias'],
    cen: ['vou retomar as obras de moradia paradas e garantir financiamento com juros baixos', 'vamos fazer parceria público-privada para universalizar o saneamento'],
    dir: ['vou facilitar o crédito imobiliário e a regularização dos terrenos', 'vamos abrir o saneamento para concessões e investimento privado'],
  },
  infra: {
    esq: ['vou retomar as obras paradas com investimento público e gerar empregos', 'vamos garantir transporte público de qualidade com tarifa justa'],
    cen: ['vou criar um plano nacional de infraestrutura com metas e parceria privada', 'vamos destravar ferrovias e portos para baratear o frete'],
    dir: ['vou fazer concessões de rodovias, ferrovias e portos para o setor privado investir', 'vamos desburocratizar as obras e entregar resultado já no primeiro ano'],
  },
  fome: {
    esq: ['vou ampliar o Bolsa Família e garantir comida no prato de cada família', 'vamos fortalecer a agricultura familiar e a merenda escolar'],
    cen: ['vou unificar os programas sociais com porta de saída pelo emprego', 'vamos criar uma rede de cozinhas comunitárias com estados e municípios'],
    dir: ['vou combater a pobreza com emprego e qualificação, e não com dependência do Estado', 'vamos fiscalizar os programas sociais para o dinheiro chegar a quem precisa'],
  },
  tecnologia: {
    esq: ['vou investir em ciência e pesquisa nas universidades públicas', 'vamos levar internet gratuita a todas as escolas públicas'],
    cen: ['vou criar um plano nacional de inteligência artificial com universidades e empresas', 'vamos conectar todas as escolas com internet de qualidade até o fim do mandato'],
    dir: ['vou reduzir impostos para startups e atrair investimento em tecnologia', 'vamos desburocratizar a inovação e levar o 5G a todo o país'],
  },
  agro: {
    esq: ['vou fazer a reforma agrária e apoiar a agricultura familiar', 'vamos garantir crédito barato para o pequeno produtor rural'],
    cen: ['vou conciliar o agro e a preservação com rastreabilidade e crédito verde', 'vamos ampliar o seguro rural para proteger o produtor das secas e enchentes'],
    dir: ['vou defender o agronegócio e o direito de propriedade no campo', 'vamos investir em ferrovias para escoar a safra e baixar o custo do produtor'],
  },
};
const VALORES = {
  esq: ['com justiça social e o Estado ao lado do trabalhador', 'porque o povo trabalhador não pode pagar a conta sozinho', 'combatendo a desigualdade, que é a raiz dos nossos problemas'],
  cen: ['com diálogo, equilíbrio e gestão eficiente', 'sem extremismos, com planejamento e responsabilidade', 'unindo o país em vez de dividir'],
  dir: ['com responsabilidade fiscal e liberdade econômica', 'com ordem, segurança e menos Estado na vida das pessoas', 'valorizando quem trabalha, quem empreende e a família'],
};
const APELOS = [
  'Você, que está em casa, merece dignidade e um futuro melhor para a sua família.',
  'Eu tenho compromisso com cada brasileiro e cada brasileira.',
  'Juntos, vamos construir um país de oportunidades para os nossos jovens.',
  'O povo brasileiro não aguenta mais promessa vazia, e por isso eu trago um plano.',
];
const ATAQUES = [
  '{alvo} fala bonito, mas o {sigla} é um fracasso nesse tema.',
  'Com todo o respeito, a proposta de {alvo} é pura demagogia.',
  'É uma vergonha o que o {sigla} fez nessa área quando teve a chance.',
  '{alvo} quer enganar o eleitor com promessas que não cabem no orçamento.',
];
const VICIOS = ['né', 'tipo assim', 'é…', 'sei lá'];

const minus = s => s.charAt(0).toLowerCase() + s.slice(1);
const maius = s => s.charAt(0).toUpperCase() + s.slice(1);
const numero = () => pick(['10 bilhões de reais', '5 bilhões de reais', '20 por cento a mais', '1 milhão de vagas', '50 mil profissionais']);

/**
 * Gera o texto de uma fala.
 * ctx: { passo, eu: {nome, partido}, alvo: {nome, partido}|null, dificuldade, alvoFugiu, temasUsados: [] }
 */
export function gerarFala(ctx) {
  const { passo, eu, alvo, dificuldade = 'medio' } = ctx;
  const p = PARTIDO[eu.partido]; const lado = LADO[p.ideo];
  const extremo = p.ideo === 'esquerda' || p.ideo === 'direita';
  const t = passo.tema ? TEMA[passo.tema] : null;
  const fac = dificuldade === 'facil', dif = dificuldade === 'dificil';
  // tema da fala: o fácil às vezes se perde e fala de outra coisa
  const base = t && !(fac && Math.random() < .4) ? t.base : pick(Object.keys(PROPOSTAS));
  const props = shuffle(PROPOSTAS[base][lado].slice());
  const frases = [];
  const ataque = alvo && (passo.kind === 'pergunta' || passo.kind === 'replica' || passo.kind === 'treplica') && Math.random() < (extremo ? .5 : .15) * (fac ? 1.3 : 1);
  const ataqueTxt = () => pick(ATAQUES).replace('{alvo}', alvo.nome).replace('{sigla}', PARTIDO[alvo.partido].sigla);
  const diag = () => t ? pick([`O povo ${t.de} espera respostas sobre ${minus(t.titulo)}.`, `Eu conheço a realidade ${t.de}, e ${minus(t.titulo)} é prioridade.`, `${maius(t.titulo)} é um desafio sério ${t.de}.`]) : '';
  const proposta = (i = 0) => maius(props[i % props.length]) + (dif && i === 0 ? `, com ${numero()} até o fim do primeiro ano` : '') + ` ${pick(VALORES[lado])}.`;

  switch (passo.kind) {
    case 'proposta':
      frases.push(pick(['Boa noite a todos.', 'Obrigado pela pergunta.', 'Boa noite, Brasil.']));
      if (!fac) frases.push(diag());
      frases.push(proposta(0));
      if (!fac) frases.push(maius(props[1]) + '.');
      if (dif) frases.push(pick(APELOS));
      break;
    case 'pergunta':
      if (ataque) frases.push(ataqueTxt());
      frases.push(t ? `${alvo.nome}, o tema é ${minus(t.titulo)}${t.titulo.includes(t.estado) ? '' : ', ' + t.de}.` : `${alvo.nome}, eu tenho uma pergunta.`);
      frases.push(pick(['Qual é a sua proposta concreta para resolver isso?', 'O que você vai fazer, na prática, nos primeiros cem dias?', 'Como você vai resolver esse problema, e com que dinheiro?']));
      if (dif) frases.push('O povo quer saber como, quando e com que dinheiro.');
      break;
    case 'resposta':
      frases.push(pick(['Agradeço a pergunta.', 'Essa é uma questão muito importante.', 'Vou responder com clareza.']));
      if (!fac) frases.push(diag());
      frases.push(proposta(0));
      if (dif) { frases.push(maius(props[1]) + '.'); frases.push(pick(APELOS)); }
      break;
    case 'replica':
      frases.push(ctx.alvoFugiu ? `${alvo.nome} não respondeu o que eu perguntei.` : pick(['A resposta não convenceu.', 'Falta dizer como pagar essa conta.']));
      if (ataque) frases.push(ataqueTxt());
      frases.push('Eu tenho um plano: ' + minus(proposta(0)));
      break;
    case 'treplica':
      frases.push(pick(['Eu respondi, sim, e repito.', 'Minha posição é muito clara.', 'Não vou entrar em ataque pessoal.']));
      frases.push(proposta(0));
      if (!fac) frases.push(pick(APELOS));
      break;
    case 'final': {
      frases.push(`Chegamos ao fim deste debate. Eu sou ${eu.nome}, do ${p.sigla}, número ${p.numero}.`);
      const outra = pick(Object.keys(PROPOSTAS));
      frases.push(maius(PROPOSTAS[outra][lado][0]) + '.');
      if (!fac) frases.push(maius(pick(VALORES[lado])) + ', esse é o meu compromisso.');
      frases.push(pick(APELOS));
      frases.push(`No dia da eleição, vote ${p.numero}.`);
      break;
    }
  }
  let texto = frases.filter(Boolean).join(' ');
  if (fac) { // vícios de linguagem
    const pal = texto.split(' '); for (let i = 3; i < pal.length; i += 9) pal.splice(i, 0, pick(VICIOS) + ','); texto = pal.join(' ');
  }
  // precisa caber no tempo: a fala é transmitida a ~2,7 palavras/s com pausas nas pontuações
  const max = Math.floor(passo.segundos * 1.9);
  const pal = texto.split(/\s+/);
  if (pal.length > max) { // corta no fim da última frase que cabe
    const corte = pal.slice(0, max).join(' '); const fimFrase = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('? '));
    texto = fimFrase > 20 ? corte.slice(0, fimFrase + 1) : corte.replace(/[,;]?$/, '.');
  }
  return texto;
}

const NOMES = {
  masculino: ['Rafael Souza', 'Carlos Mendes', 'Paulo Henrique Lima', 'Eduardo Ramos', 'Marcos Vieira', 'Roberto Azevedo', 'Fernando Lopes', 'Gustavo Almeida', 'André Barros', 'Sérgio Nogueira'],
  feminino: ['Ana Ribeiro', 'Joana Prado', 'Marta Lima', 'Beatriz Fonseca', 'Luciana Teixeira', 'Patrícia Moura', 'Renata Castro', 'Simone Araújo', 'Cláudia Pires', 'Helena Duarte'],
  nao_binario: ['Alex Moreira', 'Sam Duarte', 'Ariel Campos', 'Dani Rocha', 'Kim Santana', 'Jo Batista'],
};
export function nomeIA(genero, usados) {
  const livres = NOMES[genero].filter(n => !usados.has(n.toLowerCase()));
  return livres.length ? pick(livres) : pick(NOMES[genero]) + ' ' + (2 + Math.floor(Math.random() * 8));
}
