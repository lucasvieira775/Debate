// "Anotação da assessoria": dica sobre o tema da vez, escrita pelo Gemini (texto) ou, sem ele, por modelos locais.
import { TEMA, PARTIDO, IDEO, pontosTema, pontosLado } from '../shared/regras.js';
import { FINAIS, CUIDADOS_FINAIS } from './dicas-finais.js';

const LADO = { 'esquerda': 'esq', 'centro-esquerda': 'esq', 'centro': 'cen', 'centro-direita': 'dir', 'direita': 'dir' };
const MODELOS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];

/** 10 ângulos de anotação por tema: `ctx.n` escolhe um (mod 10), para a mesma pessoa não receber a mesma dica duas vezes no mesmo tema. */
export const ANGULOS = ['meta com número e prazo', 'de onde vem o dinheiro e quanto custa', 'história de uma pessoa comum afetada pelo problema', 'crítica ao que não funcionou até hoje, seguida da solução', 'resultado prático na vida do eleitor em um ano',
  'exemplo que já deu certo em outro lugar e como trazer para cá', 'as três primeiras medidas no primeiro dia de governo', 'como o eleitor vai fiscalizar e cobrar a promessa', 'quem sai ganhando: famílias, trabalhadores e quem produz', 'parceria com estados, municípios e sociedade'];
const METAS = {
  esq: ['ampliar o investimento público', 'proteger quem mais precisa', 'cobrar mais de quem ganha mais', 'fortalecer o serviço público', 'ouvir os trabalhadores e os movimentos sociais', 'gerar emprego com obra pública', 'garantir direitos para os mais pobres', 'combater a desigualdade regional', 'participação popular nas decisões', 'valorizar o servidor público'],
  cen: ['metas com prazo e transparência', 'parceria entre governo e setor privado', 'gestão eficiente sem gastar a mais', 'diálogo com todos os lados', 'copiar o que já deu certo em outros estados', 'avaliar cada programa pelo resultado', 'equilibrar contas e social', 'técnicos nos cargos-chave', 'pacto com Congresso e governadores', 'tecnologia para cortar fila e papelada'],
  dir: ['menos burocracia', 'parceria com a iniciativa privada', 'responsabilidade com as contas', 'menos imposto para quem produz', 'cobrar resultado de cada real gasto', 'concessões com fiscalização', 'segurança jurídica para investir', 'cortar privilégios da máquina pública', 'liberdade para empreender', 'ordem e cumprimento da lei'],
};
const CUIDADOS = ['Evite ataques pessoais: o eleitor de centro não gosta.', 'Não prometa o impossível: promessa sem prazo vira meme na Xzona.', 'Fale o nome do tema logo no começo: fugir do assunto derruba a nota.', 'Nada de palavrão: advertência tira nota e voto.', 'Não gaste o tempo todo criticando: termine com a sua proposta.',
  'Não leia número demais: um dado forte basta.', 'Não fique na teoria: diga o que muda na rua, na casa, no bolso.', 'Cuidado com o tempo: guarde 10 segundos para a proposta final.', 'Não se defenda demais: responda e volte para a sua proposta.', 'Evite jargão técnico: fale como na mesa da cozinha.'];

function dicaLocal(ctx) {
  const t = ctx.tema ? TEMA[ctx.tema] : null; const p = PARTIDO[ctx.partido]; const lado = LADO[p.ideo], n = (ctx.n || 0) % 10;
  if (!t) { // considerações finais: 20 por espectro, com sorteio inicial por candidato (quase nunca repete)
    const lista = FINAIS[p.ideo] || FINAIS.centro, f = lista[(ctx.n || 0) % lista.length];
    const sub = s => s.replaceAll('{n}', p.numero).replaceAll('{s}', p.sigla).replaceAll('{l}', p.lema);
    return { titulo: 'Considerações finais', abertura: sub(f[0]), pontos: f.slice(1).map(sub), palavras: [p.sigla, p.numero, ...METAS[lado].slice(n % 5, n % 5 + 3)], cuidado: CUIDADOS_FINAIS[(ctx.n || 0) % CUIDADOS_FINAIS.length] };
  }
  const { ctx: prob, pontos: ps } = pontosLado(t.resumo, ctx.lado || 0);
  const todos = ps.concat(pontosTema(t.resumo).pontos.filter(x => !ps.includes(x))), pt = i => todos[(n + i) % todos.length];
  const onde = t.uf === 'BR' ? 'do Brasil' : t.de, nome = t.uf === 'BR' ? 'o Brasil' : t.estado, tit = t.titulo.toLowerCase(), meta = METAS[lado][n];
  const abertura = [
    t.uf === 'BR' ? 'Mostre que conhece o problema nacional: cite um dado ou um caso real.' : `Comece citando ${t.estado} pelo nome: mostre que conhece o problema.`,
    `Abra com a conta: diga quanto se perde hoje com "${tit}".`,
    `Comece com uma pessoa: "Conheci uma família ${onde} que…" e ligue ao tema.`,
    `Abra reconhecendo o problema: ${prob}`,
    `Comece pelo futuro: "Daqui a um ano, o povo ${onde} vai ver…"`,
    `Abra com um exemplo: "Em outros lugares, ${pt(0)} já funcionou — e vai funcionar aqui."`,
    `Comece forte: "No primeiro dia de governo, eu começo por ${pt(0)}."`,
    `Abra com compromisso: "Pode me cobrar: ${tit} vai ter meta, prazo e prestação de contas."`,
    `Comece dizendo quem ganha: "Quem mais sofre com ${tit} vai ser o primeiro a sentir a mudança."`,
    `Abra chamando para a união: "Ninguém resolve ${tit} sozinho — vou juntar governo, ${t.uf === 'BR' ? 'estados' : 'o governo estadual'} e prefeituras."`,
  ][n];
  const pontos = [
    [`Meta com número e prazo para: ${pt(0)}.`, `Segundo compromisso: ${pt(1)}, "até o fim do primeiro ano".`, `Linha do partido: ${meta}.`],
    [`Diga quanto custa e de onde vem o dinheiro para: ${pt(0)}.`, `Corte um gasto para pagar: ${pt(1)}.`, `Linha do partido: ${meta}.`],
    [`Conte quem sofre hoje e prometa: ${pt(0)}.`, `Mostre o que muda na vida dessa pessoa com: ${pt(1)}.`, `Linha do partido: ${meta}.`],
    [`Critique o que não funcionou em: ${pt(0)}.`, `Diga o que você faz diferente em: ${pt(1)}.`, `Linha do partido: ${meta}.`],
    [`Prometa um resultado visível em um ano em: ${pt(0)}.`, `Diga como o eleitor vai poder cobrar: ${pt(1)}.`, `Linha do partido: ${meta}.`],
    [`Cite um modelo que deu certo para: ${pt(0)}.`, `Explique como adaptar para ${nome}: ${pt(1)}.`, `Linha do partido: ${meta}.`],
    [`Medida 1, no primeiro dia: ${pt(0)}.`, `Medida 2, nos 100 dias: ${pt(1)}.`, `Medida 3, no primeiro ano — ${meta}.`],
    [`Prometa um painel público mostrando: ${pt(0)}.`, `Diga a data em que vai prestar contas de: ${pt(1)}.`, `Linha do partido: ${meta}.`],
    [`Diga quem ganha com: ${pt(0)}.`, `Mostre o emprego e a renda que vêm de: ${pt(1)}.`, `Linha do partido: ${meta}.`],
    [`Divida o trabalho: o governo federal cuida de ${pt(0)}.`, `Com estados e prefeituras: ${pt(1)}.`, `Linha do partido: ${meta}.`],
  ][n];
  return {
    titulo: `${t.uf} · ${t.titulo}`, abertura, pontos, palavras: Array.from({ length: Math.min(5, todos.length) }, (_, i) => pt(i)),
    cuidado: ctx.kind === 'resposta' && n % 3 === 0 ? 'Responda o que foi perguntado: fugir do tema derruba a nota.' : CUIDADOS[n],
  };
}

export async function gerarDica(chave, ctx) {
  const t = ctx.tema ? TEMA[ctx.tema] : null; const p = PARTIDO[ctx.partido];
  if (!chave) return dicaLocal(ctx);
  const foco = t ? pontosLado(t.resumo, (ctx.lado || 0) + (ctx.n || 0)).pontos : [];
  const prompt = `Você é assessor(a) de campanha de um candidato fictício num jogo de debate presidencial brasileiro.
Partido fictício: ${p.nome} (${p.sigla}), espectro: ${IDEO[p.ideo].nome}.
Momento do debate: ${ctx.kind}${ctx.alvo ? ` (o adversário é ${ctx.alvo.nome}, do ${PARTIDO[ctx.alvo.partido].sigla}, ${IDEO[PARTIDO[ctx.alvo.partido].ideo].nome})` : ''}.
${t ? `Tema: ${t.titulo} (${t.estado}). Pergunta da mediação: "${t.pergunta}"` : 'Tema livre: considerações finais.'}
Escreva uma anotação rápida, como um bilhete passado às pressas ao candidato, coerente com o espectro do partido.
${t ? `Ângulo desta anotação (siga à risca, para ela ser diferente das outras): ${ANGULOS[(ctx.n || 0) % 10]}.` : `Ideia-base desta anotação (desenvolva com palavras suas): ${dicaLocal(ctx).abertura}`}${foco.length ? `\nPriorize estes pontos do tema: ${foco.join('; ')}.` : ''}${ctx.evitar?.length ? `\nNÃO repita nem parafraseie estas ideias já entregues: ${ctx.evitar.map(s => `"${s}"`).join('; ')}.` : ''}
Não invente estatísticas reais; prefira metas e propostas. Português do Brasil, frases curtas.
Responda SOMENTE em JSON: {"abertura": "frase de abertura sugerida (até 20 palavras)", "pontos": ["3 propostas concretas com meta/prazo, até 18 palavras cada"], "palavras": ["5 palavras-chave do tema para citar"], "cuidado": "um alerta curto sobre o que evitar"}`;
  for (const modelo of MODELOS) {
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 7000);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: .9, responseMimeType: 'application/json' } }),
      });
      clearTimeout(to);
      if (!r.ok) continue;
      const j = await r.json();
      const d = JSON.parse((j.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join(''));
      if (!d.abertura || !Array.isArray(d.pontos)) continue;
      return {
        titulo: t ? `${t.uf} · ${t.titulo}` : 'Considerações finais',
        abertura: String(d.abertura).slice(0, 200), pontos: d.pontos.slice(0, 3).map(s => String(s).slice(0, 160)),
        palavras: (d.palavras || []).slice(0, 6).map(s => String(s).slice(0, 30)), cuidado: String(d.cuidado || '').slice(0, 160),
      };
    } catch { /* tenta o próximo */ }
  }
  return dicaLocal(ctx);
}
