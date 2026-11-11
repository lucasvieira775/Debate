// Revisão local (sem custo) do texto falado antes de publicar na Xzona: ortografia comum, maiúsculas, vírgulas e pontuação.
// Usada como base; no servidor o Gemini pode refinar (server/revisao.js) e, se falhar, fica esta versão.

const TROCAS = [ // fala/digitação informal → português padrão (fronteira de palavra, sem diferenciar maiúsculas)
  ['vc', 'você'], ['vcs', 'vocês'], ['voce', 'você'], ['voces', 'vocês'], ['q', 'que'], ['tbm', 'também'], ['tb', 'também'], ['tambem', 'também'],
  ['nao', 'não'], ['entao', 'então'], ['pq', 'porque'], ['ta', 'está'], ['tá', 'está'], ['to', 'estou'], ['tô', 'estou'],
  ['pra', 'para'], ['pro', 'para o'], ['pros', 'para os'], ['pras', 'para as'], ['num', 'em um'], ['numa', 'em uma'], ['cê', 'você'],
  ['agente vai', 'a gente vai'], ['mais também', 'mas também'], ['saude', 'saúde'], ['educacao', 'educação'], ['seguranca', 'segurança'],
  ['governo federal', 'Governo Federal'], ['sus', 'SUS'], ['pib', 'PIB'], ['enem', 'Enem'], ['ibama', 'Ibama'], ['inss', 'INSS'], ['bolsa família', 'Bolsa Família'],
  ['brasil', 'Brasil'], ['brasília', 'Brasília'], ['amazônia', 'Amazônia'], ['nordeste', 'Nordeste'], ['sudeste', 'Sudeste'],
];
const ESTADOS = ['acre', 'alagoas', 'amapá', 'amazonas', 'bahia', 'ceará', 'distrito federal', 'espírito santo', 'goiás', 'maranhão', 'mato grosso do sul', 'mato grosso', 'minas gerais', 'pará', 'paraíba', 'paraná', 'pernambuco', 'piauí', 'rio de janeiro', 'rio grande do norte', 'rio grande do sul', 'rondônia', 'roraima', 'santa catarina', 'são paulo', 'sergipe', 'tocantins'];
const capital = s => s.replace(/(^|\s)(\p{Ll})/gu, (_, a, b) => a + (['de', 'do', 'da', 'dos'].includes(b) ? b : b.toUpperCase())).replace(/ (De|Do|Da|Dos) /g, m => m.toLowerCase());
const VICIOS = /\b(é+h+|ã+h+|hã+|hum+|ahn+|éé+|tipo assim|e aí|aí)\b,?\s*/giu; // muletas da fala
const ANTES = ['mas', 'porém', 'contudo', 'entretanto', 'todavia', 'pois', 'portanto', 'então', 'ou seja', 'por exemplo', 'no entanto', 'inclusive', 'ou melhor', 'isto é']; // vírgula antes
const INICIO = ['olha', 'veja', 'veja bem', 'gente', 'pessoal', 'minha gente', 'além disso', 'por isso', 'portanto', 'então', 'enfim', 'no entanto', 'por outro lado', 'em primeiro lugar', 'em segundo lugar', 'por fim', 'brasileiros', 'brasileiras', 'eleitores', 'meu povo', 'boa noite']; // vírgula depois, no início da frase
const P = '[\\p{L}\\p{N}]'; // letra/número (com acento)
const palavra = (w, flags = 'giu') => new RegExp(`(?<!${P})${w.replace(/ /g, '\\s+')}(?!${P})`, flags);

export function revisarLocal(texto) {
  let t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  t = t.replace(/(?<![\p{L}])é(\s+é)+(?![\p{L}])\s*/giu, ' ').replace(VICIOS, ' ').replace(/\s+/g, ' ').trim(); // "é é" = hesitação
  t = t.replace(/(?<![\p{L}\p{N}])([\p{L}]+)(\s+\1)+(?![\p{L}\p{N}])/giu, '$1'); // "é é", "que que"
  for (const [de, para] of TROCAS) t = t.replace(palavra(de), m => /^\p{Lu}/u.test(m) && /^\p{Ll}/u.test(para) ? para[0].toUpperCase() + para.slice(1) : para);
  for (const e of ESTADOS) t = t.replace(palavra(e), capital(e));
  for (const c of ANTES) t = t.replace(new RegExp(`(${P})\\s+(${c.replace(/ /g, '\\s+')})(?!${P})`, 'giu'), '$1, $2'); // "... mas" → "..., mas"
  for (const c of ANTES.filter(c => ['ou seja', 'por exemplo', 'isto é', 'no entanto'].includes(c))) t = t.replace(new RegExp(`(?<!${P})(${c.replace(/ /g, '\\s+')})\\s+(?=${P})`, 'giu'), '$1, '); // "ou seja, ..."
  t = t.replace(/(?<![\p{L}])(o|a|os|as|um|uma|do|da|no|na|ao|à|pelo|pela|outro|outra|cada|esse|essa|este|esta|nosso|nossa|meu|minha|seu|sua)\s+(candidat[oa]s?)(?=\s*([.!?]|$))/giu, '$1 \u0001$2')
    .replace(/([\p{L}\p{N}])\s+(candidat[oa]s?|senhor|senhora|senhores|eleitor|eleitora|eleitores|minha gente|pessoal)(?=\s*([.!?]|$))/giu, '$1, $2').replace(/\u0001/g, ''); // vocativo no fim: ", candidato?"
  // frases: separa por pontuação, põe vírgula após conectivos iniciais e maiúscula no começo
  t = t.split(/(?<=[.!?…])\s+/).map(f => {
    for (const c of INICIO.slice().sort((a, b) => b.length - a.length)) {
      const re = new RegExp(`^(${c.replace(/ /g, '\\s+')})\\s+(?=${P})`, 'iu');
      if (re.test(f) && f.split(/\s+/).length > c.split(' ').length + 2) { f = f.replace(re, '$1, '); break; }
    }
    return f.charAt(0).toUpperCase() + f.slice(1);
  }).join(' ');
  t = t.replace(/\s+([,.!?;:])/g, '$1').replace(/,{2,}/g, ',').replace(/,([.!?])/g, '$1').replace(/([,;:])(?=\p{L})/gu, '$1 ').replace(/(^|[.!?]\s+),\s*/g, '$1');
  t = t.replace(/(^|[.!?…]\s+)(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase());
  if (!/[.!?…]$/.test(t)) t += /^(como|por que|quem|qual|quais|quando|onde|o que|será que)(?!\p{L})/iu.test(t.split(/[.!]\s+/).pop()) && t.split(/\s+/).length < 25 ? '?' : '.';
  return t;
}
