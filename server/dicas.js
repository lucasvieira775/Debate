// "Anotação da assessoria": dica sobre o tema da vez, escrita pelo Gemini (texto) ou, sem ele, por modelos locais.
import { TEMA, PARTIDO, IDEO, pontosTema, pontosLado } from '../shared/regras.js';

const LADO = { 'esquerda': 'esq', 'centro-esquerda': 'esq', 'centro': 'cen', 'centro-direita': 'dir', 'direita': 'dir' };
const MODELOS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];

/** 5 ângulos de anotação: `ctx.n` (0..4) escolhe um, para a mesma pessoa não receber a mesma dica duas vezes no mesmo tema. */
export const ANGULOS = ['meta com número e prazo', 'de onde vem o dinheiro e quanto custa', 'história de uma pessoa comum afetada pelo problema', 'crítica ao que não funcionou até hoje, seguida da solução', 'resultado prático na vida do eleitor em um ano'];
const METAS = { esq: ['ampliar o investimento público', 'proteger quem mais precisa', 'cobrar mais de quem ganha mais', 'fortalecer o serviço público', 'ouvir os trabalhadores e os movimentos sociais'], cen: ['metas com prazo e transparência', 'parceria entre governo e setor privado', 'gestão eficiente sem gastar a mais', 'diálogo com todos os lados', 'copiar o que já deu certo em outros estados'], dir: ['menos burocracia', 'parceria com a iniciativa privada', 'responsabilidade com as contas', 'menos imposto para quem produz', 'cobrar resultado de cada real gasto'] };
const CUIDADOS = ['Evite ataques pessoais: o eleitor de centro não gosta.', 'Não prometa o impossível: promessa sem prazo vira meme na Xzona.', 'Fale o nome do tema logo no começo: fugir do assunto derruba a nota.', 'Nada de palavrão: advertência tira nota e voto.', 'Não gaste o tempo todo criticando: termine com a sua proposta.'];

function dicaLocal(ctx) {
  const t = ctx.tema ? TEMA[ctx.tema] : null; const p = PARTIDO[ctx.partido]; const lado = LADO[p.ideo], n = (ctx.n || 0) % 5;
  const { ctx: prob, pontos: ps } = t ? pontosLado(t.resumo, ctx.lado || 0) : { ctx: '', pontos: [] };
  const todos = t ? ps.concat(pontosTema(t.resumo).pontos.filter(x => !ps.includes(x))) : ['emprego e renda', 'saúde', 'educação', 'segurança', 'combate à corrupção'], pt = i => todos[(n + i) % todos.length];
  const onde = t ? (t.uf === 'BR' ? 'do Brasil' : t.de) : '';
  const abertura = t ? [
    t.uf === 'BR' ? 'Mostre que conhece o problema nacional: cite um dado ou um caso real.' : `Comece citando ${t.estado} pelo nome: mostre que conhece o problema.`,
    `Abra com a conta: diga quanto se perde hoje com "${t.titulo.toLowerCase()}".`,
    `Comece com uma pessoa: "Conheci uma família ${onde} que…" e ligue ao tema.`,
    `Abra reconhecendo o problema: ${prob}`,
    `Comece pelo futuro: "Daqui a um ano, o povo ${onde} vai ver…"`,
  ][n] : ['Olhe para a câmera e fale direto com o eleitor.', 'Agradeça à plateia e resuma sua melhor proposta em uma frase.', 'Lembre o momento do debate em que você foi melhor.', 'Diga por que você, e não os outros: uma diferença clara.', 'Termine pedindo o voto, com o número do partido.'][n];
  const pontos = [
    [`Meta com número e prazo para: ${pt(0)}.`, `Segundo compromisso: ${pt(1)}, "até o fim do primeiro ano".`, `Linha do partido: ${METAS[lado][n]}.`],
    [`Diga quanto custa e de onde vem o dinheiro para: ${pt(0)}.`, `Corte um gasto para pagar: ${pt(1)}.`, `Linha do partido: ${METAS[lado][n]}.`],
    [`Conte quem sofre hoje e prometa: ${pt(0)}.`, `Mostre o que muda na vida dessa pessoa com: ${pt(1)}.`, `Linha do partido: ${METAS[lado][n]}.`],
    [`Critique o que não funcionou em: ${pt(0)}.`, `Diga o que você faz diferente em: ${pt(1)}.`, `Linha do partido: ${METAS[lado][n]}.`],
    [`Prometa um resultado visível em um ano em: ${pt(0)}.`, `Diga como o eleitor vai poder cobrar: ${pt(1)}.`, `Linha do partido: ${METAS[lado][n]}.`],
  ][n];
  return {
    titulo: t ? `${t.uf} · ${t.titulo}` : 'Considerações finais',
    abertura, pontos, palavras: Array.from({ length: Math.min(5, todos.length) }, (_, i) => pt(i)),
    cuidado: ctx.kind === 'resposta' && n % 2 === 0 ? 'Responda o que foi perguntado: fugir do tema derruba a nota.' : !t && n === 2 ? 'Não ataque ninguém agora: feche com proposta e peça o voto.' : CUIDADOS[n],
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
Ângulo desta anotação (siga à risca, para ela ser diferente das outras): ${ANGULOS[(ctx.n || 0) % 5]}.${foco.length ? `\nPriorize estes pontos do tema: ${foco.join('; ')}.` : ''}${ctx.evitar?.length ? `\nNÃO repita nem parafraseie estas ideias já entregues: ${ctx.evitar.map(s => `"${s}"`).join('; ')}.` : ''}
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
