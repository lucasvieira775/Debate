// "Anotação da assessoria": dica sobre o tema da vez, escrita pelo Gemini (texto) ou, sem ele, por modelos locais.
import { TEMA, PARTIDO, IDEO, TEMA_BASE, pick } from '../shared/regras.js';

const LADO = { 'esquerda': 'esq', 'centro-esquerda': 'esq', 'centro': 'cen', 'centro-direita': 'dir', 'direita': 'dir' };
const MODELOS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];

function dicaLocal(ctx) {
  const t = ctx.tema ? TEMA[ctx.tema] : null; const p = PARTIDO[ctx.partido]; const lado = LADO[p.ideo];
  const kw = t ? TEMA_BASE[t.base].filter(k => !k.startsWith('=')).slice(0, 5) : ['emprego', 'saúde', 'educação', 'segurança'];
  const metas = { esq: ['ampliar o investimento público', 'proteger quem mais precisa', 'cobrar mais de quem ganha mais'], cen: ['metas com prazo e transparência', 'parceria entre governo e setor privado', 'gestão eficiente sem gastar a mais'], dir: ['menos burocracia', 'parceria com a iniciativa privada', 'responsabilidade com as contas'] }[lado];
  return {
    titulo: t ? `${t.uf} · ${t.titulo}` : 'Considerações finais',
    abertura: t ? (t.uf === 'BR' ? 'Mostre que conhece o problema nacional: cite um dado ou um caso real.' : `Comece citando ${t.estado} pelo nome: mostre que conhece o problema.`) : 'Olhe para a câmera e fale direto com o eleitor.',
    pontos: [`Uma meta com número e prazo (ex.: "até o fim do primeiro ano").`, `Linha do partido: ${pick(metas)}.`, 'Diga de onde vem o dinheiro: isso conta pontos.'],
    palavras: kw,
    cuidado: ctx.kind === 'resposta' ? 'Responda o que foi perguntado: fugir do tema derruba a nota.' : 'Evite ataques pessoais: o eleitor de centro não gosta.',
  };
}

export async function gerarDica(chave, ctx) {
  const t = ctx.tema ? TEMA[ctx.tema] : null; const p = PARTIDO[ctx.partido];
  if (!chave) return dicaLocal(ctx);
  const prompt = `Você é assessor(a) de campanha de um candidato fictício num jogo de debate presidencial brasileiro.
Partido fictício: ${p.nome} (${p.sigla}), espectro: ${IDEO[p.ideo].nome}.
Momento do debate: ${ctx.kind}${ctx.alvo ? ` (o adversário é ${ctx.alvo.nome}, do ${PARTIDO[ctx.alvo.partido].sigla}, ${IDEO[PARTIDO[ctx.alvo.partido].ideo].nome})` : ''}.
${t ? `Tema: ${t.titulo} (${t.estado}). Pergunta da mediação: "${t.pergunta}"` : 'Tema livre: considerações finais.'}
Escreva uma anotação rápida, como um bilhete passado às pressas ao candidato, coerente com o espectro do partido.
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
