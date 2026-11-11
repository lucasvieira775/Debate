// Moderação das falas. Xingamento comum de debate ("idiota", "canalha", "cala a boca"...) NÃO é punido: no máximo chamada de atenção.
// Só punem: palavrões pesadíssimos (advertência) e discriminação/crimes — racismo, xenofobia, LGBTfobia, ameaça, nazismo (expulsão).
// As listas abaixo existem só para o filtro reconhecer as ofensas.
import { norm } from './regras.js';

// xingamentos comuns: sem punição (só chamada de atenção); ainda bloqueados em nomes/bios e mascarados no chat
const LEVES = ['burro', 'burra', 'idiota', 'imbecil', 'otario', 'otaria', 'babaca', 'palhaco', 'palhaca', 'vagabundo', 'vagabunda', 'canalha', 'safado', 'safada',
  'cretino', 'cretina', 'estupido', 'estupida', 'jumento', 'jumenta', 'anta', 'toupeira', 'retardado', 'retardada', 'bosta', 'merda', 'corno', 'corna',
  'asno', 'escroto', 'escrota', 'pilantra', 'trouxa', 'pateta', 'energumeno', 'lixo humano', 'nojento', 'nojenta', 'verme', 'parasita', 'mane',
  'drogado', 'drogada', 'cachaceiro', 'cachaceira', 'bebado', 'bebada', 'maconheiro', 'maconheira', 'ladrao', 'ladra', 'corrupto', 'corrupta', 'mentiroso', 'mentirosa',
  'caralho', 'porra', 'puta merda', 'puta que pariu', 'pqp', 'cu', 'pica', 'fode', 'fodido', 'fodida', 'foder'];

// xenofobia: origem/nacionalidade + ofensa ("nordestino preguiçoso", "baiano burro"...)
const ORIGENS = ['nordestino', 'nordestina', 'baiano', 'baiana', 'paraiba', 'paraibano', 'paraibana', 'cearense', 'pernambucano', 'maranhense', 'piauiense', 'nortista',
  'gaucho', 'paulista', 'carioca', 'mineiro', 'goiano', 'indio', 'india', 'boliviano', 'boliviana', 'haitiano', 'haitiana', 'venezuelano', 'venezuelana', 'judeu', 'judia',
  'chines', 'chinesa', 'japones', 'arabe', 'africano', 'africana', 'imigrante', 'estrangeiro', 'favelado', 'favelada', 'preto', 'preta', 'negro', 'negra'];
const INSULTOS_ORIGEM = ['burro', 'burra', 'preguicoso', 'preguicosa', 'vagabundo', 'vagabunda', 'sujo', 'suja', 'fedido', 'fedida', 'ignorante',
  'ladrao', 'ladra', 'inferior', 'imundo', 'imunda', 'nojento', 'nojenta', 'praga', 'lixo', 'tinha que ser'];
const COMBO_ORIGEM = ORIGENS.flatMap(o => INSULTOS_ORIGEM.map(i => i === 'tinha que ser' ? `tinha que ser ${o}` : `${o} ${i}`));

const GRAVES = {
  'racismo': ['macaco', 'macaca', 'crioulo', 'crioula', 'negrinho', 'negrinha', 'tiziu', 'picole de asfalto', 'cabelo ruim', 'senzala', 'volta pro tronco', 'escurinho', 'escurinha',
    'raca inferior', 'volta pra africa', 'cabelo de bombril', 'servico de preto', 'coisa de preto'],
  'xenofobia': [...COMBO_ORIGEM, 'cabeca chata', 'pau de arara', 'volta pro nordeste', 'volta pra sua terra', 'volta pro seu pais', 'nordeste so tem', 'baianada', 'morte aos judeus',
    'tinha que ser baiano', 'fora imigrante', 'fora estrangeiro'],
  'LGBTfobia': ['viado', 'bicha', 'bichinha', 'sapatao', 'traveco', 'boiola', 'baitola', 'gayzinho'],
  'misoginia': ['puta', 'vadia', 'piranha', 'lugar de mulher e na cozinha', 'mulher nao presta', 'vai lavar louca'],
  'palavrões pesados': ['fdp', 'filho da puta', 'filha da puta', 'filho de uma puta', 'filha de uma puta', 'arrombado', 'arrombada', 'cuzao', 'buceta', 'xoxota', 'piroca',
    'tomar no cu', 'toma no cu', 'pau no cu', 'enfia no cu', 'vai se foder', 'vai te foder', 'vai se fuder', 'foda se', 'fodase', 'chupa meu'],
  'ameaça ou violência': ['vou te matar', 'te mato', 'vou matar voce', 'tem que morrer', 'tomara que morra', 'merece morrer', 'vou te bater', 'te estuprar', 'estuprar voce',
    'degolar', 'decapitar', 'esquartejar', 'esquartejado', 'arrancar a cabeca', 'arrancar sua cabeca', 'vou te furar', 'fuzilar voce', 'sangue jorrando', 'tripas',
    'vou te pegar la fora', 'sei onde voce mora', 'vou atras da sua familia', 'vou explodir'],
  'apologia ao nazismo': ['heil hitler', 'sieg heil', 'viva hitler', 'hitler tinha razao', 'hitler estava certo'],
};

// falta de educação sem xingamento: só chamada de atenção, sem punição
const BRANDAS = ['cala a boca', 'cala sua boca', 'cala essa boca', 'cala boca', 'cale a boca', 'cale se', 'fica quieto', 'fica quieta', 'fica calado', 'fica calada',
  'ninguem te perguntou', 'ninguem perguntou', 'vai se catar', 'vai catar coquinho', 'vai pastar', 'nao enche', 'para de encher', 'se enxerga', 'some daqui', 'sai fora', 'vai pro inferno'];
// categorias que expulsam na hora (sem passar pelas advertências)
export const EXPULSAO = ['racismo', 'xenofobia', 'LGBTfobia', 'misoginia', 'ameaça ou violência', 'apologia ao nazismo'];
const MEDIACAO = ['mediador', 'mediadora', 'mediacao', 'jornalista', 'moderador', 'moderadora', 'apresentador', 'apresentadora'];

const re = termo => new RegExp('(^|[^a-z0-9])' + termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s,.-]+') + '(?![a-z0-9])', 'g');
const RE_LEVES = LEVES.map(t => [t, re(t)]);
const RE_BRANDAS = BRANDAS.map(t => [t, re(t)]);
const RE_GRAVES = Object.entries(GRAVES).flatMap(([cat, l]) => l.map(t => [cat, t, re(t)]));
const achar = (lista, t) => lista.filter(([, r]) => { r.lastIndex = 0; return r.test(t); }).map(([termo]) => termo);

/** Analisa um texto. Retorna { grave: categoria|null, expulsa: bool, leves: ['burro', ...], brandas: ['cala a boca', ...], mediador: bool }
 *  mediador = o texto se dirige à mediação (cita "jornalista", "mediadora"... ou o nome dela, passado em nomeMediador). */
export function moderar(texto, nomeMediador = '') {
  // "filho da puta" é palavrão (advertência), "puta merda"/"puta que pariu" são interjeições: não confundir com o "puta" da misoginia
  const t0 = norm(texto).replace(/[^a-z0-9*\s]/g, ' ');
  const t = t0.replace(/\b(filh[oa]) d(a|e uma) puta\b/g, 'fdp').replace(/\bputa (merda|que pariu|que o pariu)\b/g, 'pqp');
  const nomes = norm(nomeMediador).split(/\s+/).filter(x => x.length >= 3);
  const mediador = achar([...MEDIACAO, ...nomes].map(x => [x, re(x)]), t).length > 0;
  for (const [cat, , r] of RE_GRAVES) { r.lastIndex = 0; if (r.test(t)) return { grave: cat, expulsa: EXPULSAO.includes(cat), leves: [], brandas: [], mediador }; }
  // o reconhecimento de voz do Chrome às vezes troca palavrões por asteriscos ("p***")
  // — como não dá pra saber qual palavra era, não pune (só chamada de atenção)
  const leves = achar(RE_LEVES, t); if (/[a-z]\*{2,}/.test(t)) leves.push('palavrão');
  return { grave: null, expulsa: false, leves, brandas: achar(RE_BRANDAS, t), mediador };
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
  ['🎤 Respeite a mediação', 'A(o) jornalista conduz o debate. Palavrão pesado contra a mediação conta como 2 advertências.'],
  ['⏱ Fale na sua vez', 'Respeite o tempo e a ordem das falas. Não atrapalhe a fala dos outros.'],
  ['🚫 Tolerância zero', 'Racismo, xenofobia, machismo, LGBTfobia, ameaças, violência ou apologia ao nazismo: expulsão imediata da sala.'],
  ['🗣 Debate quente', '“Idiota”, “canalha”, “cala a boca”, “drogado” e afins: só chamada de atenção, sem punição.'],
  ['⚠ Advertências', 'Só palavrões pesadíssimos (“filho da puta”, “vai tomar no...”) geram advertência e derrubam a nota.'],
  ['⛔ Banimentos', `${PUNICAO.advertencias} advertências = banido da sala (sai da votação, não ganha moedas e perde seguidores na Xzona). ${PUNICAO.bansSemana} banimentos na semana = conta suspensa por ${PUNICAO.diasSemana} dias. ${PUNICAO.suspMes} suspensões de ${PUNICAO.diasSemana} dias no mês = conta suspensa por ${PUNICAO.diasMes} dias. ${PUNICAO.susp30Perm} suspensões de ${PUNICAO.diasMes} dias = conta banida permanentemente.`],
];

/** Nomes/arrobas: além das palavras inteiras, procura termos (≥4 letras) escondidos dentro do nome ("lucasputa", "caraaalho"). */
const TERMOS_NOME = [...['caralho', 'porra', 'idiota', 'imbecil', 'otario', 'babaca', 'vagabundo', 'cretino', 'merda', 'bosta', 'retardado', 'escroto'], ...Object.values(GRAVES).flat()]
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
// com gênero: 'masculino|feminino|neutro' — flexGrito escolhe pelo gênero de quem está sendo vaiado(a)
export const GRITOS = {
  vaia: ['Burro!|Burra!|Que burrice!', 'Fora!', 'Que vergonha!', 'Volta pra escola!', 'Enrolação!', 'Responde a pergunta!', 'Sai daí!', 'Fraco!|Fraca!|Fraquinho isso!',
    'Vagabundo!|Vagabunda!|Sem vergonha!', 'Ladrão!|Ladrona!|Devolve o dinheiro!', 'Safado!|Safada!|Safadeza!', 'Corrupto!|Corrupta!|Corrupção!', 'Pilantra!'],
  vibra: ['Já ganhou!', 'É isso aí!', 'Presidente!|Presidenta!|Presidência!', 'Muito bem!', 'Arrasou!', 'Esse é o cara!|Essa é a mulher!|É isso, candidatura!'],
  ih: ['Ihhhh!', 'Uhhhh!', 'Toma!', 'Ui!'],
  confusao: ['Respeito!', 'Ordem!', 'Absurdo!', 'Que baixaria!', 'Vagabundo!|Vagabunda!|Sem vergonha!', 'Mal-educado!|Mal-educada!|Falta de educação!'],
  duelo: ['Isso é fake news!', 'Vagabundo!|Vagabunda!|Sem vergonha!', 'Mentiroso!|Mentirosa!|Mentira!', 'Mentira!', 'Cara de pau!', 'Conversa fiada!', 'Fake news!', 'Ladrão!|Ladrona!|Devolve o dinheiro!', 'Corrupto!|Corrupta!|Corrupção!'], // confronto 1x1 do bloco 2
};
/** Grito no gênero de quem é vaiado(a): 'masc|fem|neutro' (sem neutro, usa o masculino). */
export const flexGrito = (t, g) => { if (!t.includes('|')) return t; const [m, f, n] = t.split('|'); return g === 'feminino' ? f : g === 'masculino' ? m : (n || m); };
/** Todas as formas de um grito (para pré-gerar o áudio). */
export const formasGrito = t => [...new Set(t.split('|'))];
