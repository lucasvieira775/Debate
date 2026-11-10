// Moderação das falas: xingamentos leves (jornalista intervém, nota cai) e ofensas graves (candidato banido).
// As listas abaixo existem só para o filtro reconhecer as ofensas.
import { norm } from './regras.js';

const LEVES = ['burro', 'burra', 'idiota', 'imbecil', 'otario', 'otaria', 'babaca', 'palhaco', 'palhaca', 'vagabundo', 'canalha', 'safado', 'safada',
  'cretino', 'cretina', 'estupido', 'estupida', 'jumento', 'jumenta', 'anta', 'toupeira', 'retardado', 'retardada', 'bosta', 'merda', 'corno', 'corna',
  'asno', 'escroto', 'escrota', 'pilantra', 'trouxa', 'pateta', 'energumeno', 'lixo humano', 'nojento', 'nojenta', 'verme', 'parasita', 'mane', 'otaria'];

const GRAVES = {
  'racismo': ['macaco', 'macaca', 'crioulo', 'crioula', 'negrinho', 'negrinha', 'tiziu', 'picole de asfalto', 'cabelo ruim', 'senzala', 'volta pro tronco', 'escurinho', 'escurinha', 'raca inferior'],
  'LGBTfobia': ['viado', 'bicha', 'bichinha', 'sapatao', 'traveco', 'boiola', 'baitola', 'gayzinho'],
  'misoginia': ['puta', 'vadia', 'piranha', 'vagabunda', 'lugar de mulher e na cozinha'],
  'palavrões pesados': ['caralho', 'porra', 'foder', 'fode', 'fodido', 'fodida', 'foda se', 'fodase', 'fdp', 'filho da puta', 'filha da puta', 'arrombado', 'arrombada',
    'cuzao', 'buceta', 'xoxota', 'tomar no cu', 'pau no cu', 'cu', 'piroca', 'pica'],
  'ameaça ou violência': ['vou te matar', 'te mato', 'vou matar voce', 'tem que morrer', 'tomara que morra', 'merece morrer', 'vou te bater', 'te estuprar', 'estuprar voce',
    'degolar', 'decapitar', 'esquartejar', 'esquartejado', 'arrancar a cabeca', 'arrancar sua cabeca', 'vou te furar', 'fuzilar voce', 'sangue jorrando', 'tripas'],
  'apologia ao nazismo': ['heil hitler', 'sieg heil', 'viva hitler', 'hitler tinha razao'],
};

// falta de educação sem xingamento: contra candidato é só chamada de atenção; contra a mediação vale advertência
const BRANDAS = ['cala a boca', 'cala sua boca', 'cala essa boca', 'cala boca', 'cale a boca', 'cale se', 'fica quieto', 'fica quieta', 'fica calado', 'fica calada',
  'ninguem te perguntou', 'ninguem perguntou', 'vai se catar', 'vai catar coquinho', 'vai pastar', 'nao enche', 'para de encher', 'se enxerga', 'some daqui', 'sai fora', 'vai pro inferno'];
// categorias que expulsam na hora (sem passar pelas advertências)
export const EXPULSAO = ['racismo', 'LGBTfobia', 'misoginia', 'ameaça ou violência', 'apologia ao nazismo'];
const MEDIACAO = ['mediador', 'mediadora', 'mediacao', 'jornalista', 'moderador', 'moderadora', 'apresentador', 'apresentadora'];

const re = termo => new RegExp('(^|[^a-z0-9])' + termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s,.-]+') + '(?![a-z0-9])', 'g');
const RE_LEVES = LEVES.map(t => [t, re(t)]);
const RE_BRANDAS = BRANDAS.map(t => [t, re(t)]);
const RE_GRAVES = Object.entries(GRAVES).flatMap(([cat, l]) => l.map(t => [cat, t, re(t)]));
const achar = (lista, t) => lista.filter(([, r]) => { r.lastIndex = 0; return r.test(t); }).map(([termo]) => termo);

/** Analisa um texto. Retorna { grave: categoria|null, expulsa: bool, leves: ['burro', ...], brandas: ['cala a boca', ...], mediador: bool }
 *  mediador = o texto se dirige à mediação (cita "jornalista", "mediadora"... ou o nome dela, passado em nomeMediador). */
export function moderar(texto, nomeMediador = '') {
  const t = norm(texto).replace(/[^a-z0-9*\s]/g, ' ');
  const nomes = norm(nomeMediador).split(/\s+/).filter(x => x.length >= 3);
  const mediador = achar([...MEDIACAO, ...nomes].map(x => [x, re(x)]), t).length > 0;
  for (const [cat, , r] of RE_GRAVES) { r.lastIndex = 0; if (r.test(t)) return { grave: cat, expulsa: EXPULSAO.includes(cat), leves: [], brandas: [], mediador }; }
  // o reconhecimento de voz do Chrome às vezes troca palavrões por asteriscos ("p***")
  if (/[a-z]\*{2,}/.test(t)) return { grave: 'palavrões pesados', expulsa: false, leves: [], brandas: [], mediador };
  return { grave: null, expulsa: false, leves: achar(RE_LEVES, t), brandas: achar(RE_BRANDAS, t), mediador };
}

/** Escada de punições (servidor aplica; cliente e Termos exibem). */
export const PUNICAO = {
  advertencias: 3,          // 3 advertências na partida = banido da sala
  bansSemana: 3, diasSemana: 7,   // 3 banimentos de sala em 7 dias = conta suspensa por 7 dias
  suspMes: 3, diasMes: 30,        // 3 suspensões de 7 dias em 30 dias = conta suspensa por 30 dias
  susp30Perm: 3,                  // 3 suspensões de 30 dias = conta banida para sempre
};

/** Regras do debate (painel lateral do jogo e Termos de Uso). [título, texto] */
export const REGRAS_DEBATE = [
  ['🤝 Respeite os candidatos', 'Critique ideias e propostas, nunca a pessoa. Nada de xingamentos, apelidos ou deboche.'],
  ['🎤 Respeito máximo à mediação', 'A(o) jornalista conduz o debate. Qualquer falta de respeito com a mediação, mesmo um “cala a boca”, vale advertência.'],
  ['⏱ Fale na sua vez', 'Respeite o tempo e a ordem das falas. Não atrapalhe a fala dos outros.'],
  ['🚫 Tolerância zero', 'Racismo, machismo, LGBTfobia, ameaças, violência ou apologia ao nazismo: expulsão imediata da sala.'],
  ['🗣 Falta de educação', '“Cala a boca”, “fica quieto” e afins contra outro candidato: chamada de atenção, sem punição.'],
  ['⚠ Advertências', 'Xingamentos (“idiota”, “palhaço”...) e palavrões pesados geram advertência e derrubam a nota. Contra a mediação, o xingamento conta como 2 advertências.'],
  ['⛔ Banimentos', `${PUNICAO.advertencias} advertências = banido da sala (sai da votação, não ganha moedas e perde seguidores na Xzona). ${PUNICAO.bansSemana} banimentos na semana = conta suspensa por ${PUNICAO.diasSemana} dias. ${PUNICAO.suspMes} suspensões de ${PUNICAO.diasSemana} dias no mês = conta suspensa por ${PUNICAO.diasMes} dias. ${PUNICAO.susp30Perm} suspensões de ${PUNICAO.diasMes} dias = conta banida permanentemente.`],
];

/** Nomes/arrobas: além das palavras inteiras, procura termos (≥4 letras) escondidos dentro do nome ("lucasputa", "caraaalho"). */
const TERMOS_NOME = [...['idiota', 'imbecil', 'otario', 'babaca', 'vagabundo', 'cretino', 'merda', 'bosta', 'retardado', 'escroto'], ...Object.values(GRAVES).flat()]
  .map(t => t.replace(/[^a-z]/g, '')).filter(t => t.length >= 4 && !['pica', 'fode'].includes(t));
const PERMITIDOS = /deputad|computa|reputa|disputa|imputa|amputa|bichar/g; // palavras comuns que contêm um termo
export function nomeImproprio(s) {
  const m = moderar(s); if (m.grave || m.leves.length) return true;
  const leet = norm(s).replace(/[013457@$]/g, c => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' }[c]));
  if (leet !== norm(s) && moderar(leet).grave) return true;
  const t = leet.replace(/[^a-z]/g, '').replace(PERMITIDOS, ''), sem = t.replace(/(.)\1+/g, '$1');
  return TERMOS_NOME.some(x => t.includes(x) || sem.includes(x.replace(/(.)\1+/g, '$1')));
}

// gritos da plateia (curtos, gerados uma vez e reaproveitados)
export const GRITOS = {
  vaia: ['Burro!', 'Fora!', 'Que vergonha!', 'Volta pra escola!', 'Enrolação!', 'Responde a pergunta!', 'Sai daí!', 'Fraco!'],
  vibra: ['Já ganhou!', 'É isso aí!', 'Presidente!', 'Muito bem!', 'Arrasou!', 'Esse é o cara!'],
  ih: ['Ihhhh!', 'Uhhhh!', 'Toma!', 'Ui!'],
  confusao: ['Respeito!', 'Ordem!', 'Absurdo!', 'Que baixaria!'],
  duelo: ['Isso é fake news!', 'Vagabundo!', 'Mentiroso!', 'Mentira!', 'Cara de pau!', 'Conversa fiada!', 'Fake news!'], // confronto 1x1 do bloco 2
};
