// Carreira política: XP por debate → cargo (nível 1–8). Brasões em /img/niveis/<n>.png.
// Partida (~20 min): perdedor ≈ 150 XP, médio ≈ 200, bom ≈ 260. Presidente ≈ 190 partidas (~63 h) para o jogador médio.
export const XP = { participacao: 80, porPontoDeNota: 15, segundoTurno: 50, eleito: 120 };

// Punições tiram XP (pode cair de cargo; nunca abaixo de 0).
export const XP_PUNICAO = { abandono: 150, suspensaoAbandono: 400, banSala: 300, suspensao7: 1000, suspensao30: 3000 };

// bonus: multiplicador das moedas de participação + desempenho (não do 2º turno/vitória) — teto baixo para não inflacionar a loja.
// recompensa: moedas pagas UMA vez ao alcançar o cargo pela 1ª vez (total 3.900 ≈ 25% do que o jogador médio ganha até Presidente).
export const CARGOS = [
  { n: 1, nome: 'Candidato', xp: 0, bonus: 1, recompensa: 0 },
  { n: 2, nome: 'Vereador', xp: 600, bonus: 1.05, recompensa: 100 },
  { n: 3, nome: 'Deputado Estadual', xp: 1800, bonus: 1.1, recompensa: 150 },
  { n: 4, nome: 'Deputado Federal', xp: 4000, bonus: 1.15, recompensa: 250 },
  { n: 5, nome: 'Senador', xp: 7500, bonus: 1.2, recompensa: 400 },
  { n: 6, nome: 'Prefeito', xp: 13000, bonus: 1.3, recompensa: 600 },
  { n: 7, nome: 'Governador', xp: 22000, bonus: 1.4, recompensa: 900 },
  { n: 8, nome: 'Presidente', xp: 38000, bonus: 1.5, recompensa: 1500 },
];

/** { n, nome, bonus, xp, prox (xp do próximo cargo ou null), pct (0–100 até o próximo) } */
export function cargo(xp = 0) {
  const i = CARGOS.findLastIndex(c => xp >= c.xp), c = CARGOS[i], prox = CARGOS[i + 1];
  return { ...c, xp, prox: prox?.xp ?? null, pct: prox ? Math.min(100, (xp - c.xp) / (prox.xp - c.xp) * 100) : 100 };
}
/** Maior cargo já alcançado pela conta (libera itens com "nivel" na loja; não se perde ao cair de cargo). */
export const nivelMax = c => Math.max(c?.cargoMax || 1, cargo(c?.xp || 0).n);
export const brasao = n => `/img/niveis/${n}.png`;
/** <img> pequeno do brasão para pôr ao lado do nome. */
export const htmlBrasao = (n, tam = 22) => n ? `<img class="brasao" src="${brasao(n)}" width="${tam}" height="${tam}" title="${CARGOS[n - 1]?.nome}" alt="${CARGOS[n - 1]?.nome}">` : '';
