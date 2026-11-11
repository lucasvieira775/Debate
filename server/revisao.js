// Revisão da fala para a Xzona: Gemini (plano gratuito) deixa coeso e corrige; se faltar chave, cota ou rede, usa a revisão local.
import { revisarLocal } from '../shared/revisao.js';

const MODELOS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];

export async function revisarFala(chave, texto) {
  const local = revisarLocal(texto);
  if (!chave || !local || local.split(/\s+/).length < 4) return local;
  const prompt = `Revise a fala transcrita (reconhecimento de voz) de um candidato num jogo de debate presidencial, para publicar numa rede social.
Corrija ortografia, acentuação, concordância e pontuação (vírgulas, pontos, maiúsculas), retire vícios de fala e repetições e deixe o texto coeso.
NÃO mude o sentido, a opinião, as propostas nem o tom; não acrescente ideias novas; mantenha a primeira pessoa e o tamanho parecido. Português do Brasil.
Responda SOMENTE em JSON: {"texto": "fala revisada"}
Fala: """${String(texto).slice(0, 1200)}"""`;
  for (const modelo of MODELOS) {
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: .2, responseMimeType: 'application/json' } }),
      });
      clearTimeout(to);
      if (!r.ok) continue;
      const j = await r.json();
      const d = JSON.parse((j.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join(''));
      const t = String(d.texto || '').trim();
      if (t && t.length < local.length * 2 + 40) return t; // descarta resposta que inventou demais
    } catch { /* tenta o próximo */ }
  }
  return local;
}
