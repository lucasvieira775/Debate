// Tutorial de primeira partida: roteiro da cinemática (public/js/tutorial.js) + narração em /audio/tutorial/<id>.wav.
// Regras citadas vêm do código: moderacao.js (PUNICAO/REGRAS_DEBATE), salas.js (finalizar/advertir/consequenciasAcao),
// loja.js (cadeirada adv:1), niveis.js (XP/CARGOS), regras.js (SEGUNDOS/analisar). ms = duração do áudio gerado.
export const TUTORIAL_VOZ = 'Puck';
export const TUTORIAL = [
  { id: 't01', ms: 4320, cena: 'abertura', fala: 'Bem-vindo ao Debate Presidencial, onde quem fala melhor leva a faixa!', legenda: 'Bem-vindo ao Debate Presidencial!' },
  { id: 't02', ms: 4880, cena: 'pergunta', fala: 'A jornalista pergunta e o relógio dispara: um minuto pra convencer o Brasil!', dica: '⏱ ATÉ 60 s' },
  { id: 't03', ms: 5218, cena: 'fala', fala: 'Fique no tema e traga propostas com números. Fugiu da pergunta? Perdeu nota!', dica: '📈 NOTA ALTA' },
  { id: 't04', ms: 4442, cena: 'confronto', fala: 'No confronto direto, você escolhe quem vai encarar, cara a cara!', legenda: 'Confronto direto: pergunta, resposta, réplica e tréplica', dica: '🥊 CONFRONTO' },
  { id: 't05', ms: 5602, cena: 'pode', fala: 'Crítica dura pode! "Sua proposta é tão vazia quanto o cofre que o senhor deixou!"', dica: '✅ PODE' },
  { id: 't06', ms: 2492, cena: 'pode', fala: '"Cala a boca"? Só um puxão de orelha.', legenda: '"Cala a boca", "idiota" = só chamada de atenção', dica: '🟡 CHAMADA DE ATENÇÃO' },
  { id: 't07', ms: 4398, cena: 'nao_pode', fala: 'Palavrão pesado? Advertência na hora, e a nota despenca!', legenda: '#@!% = advertência e nota lá embaixo', dica: '❌ NÃO PODE' },
  { id: 't08', ms: 7549, cena: 'advertencia', fala: 'Preconceito ou ameaça: duas advertências. Juntou três? Banido da sala, sem voto e sem moeda!', legenda: 'Preconceito/ameaça = 2 advertências (repetiu, expulsão) · 3 advertências = banido', dica: '⚠ 3 = BANIDO' },
  { id: 't09', ms: 6170, cena: 'caldeirada', fala: 'E a cadeirada? Tem na loja, mas custa advertência e votos, e a vítima ganha simpatia!', dica: '🪑 +1 ADVERTÊNCIA' },
  { id: 't10', ms: 5104, cena: 'plateia', fala: 'A plateia vaia, aplaude, e tudo vira meme na Xzona!', dica: '👏 PLATEIA' },
  { id: 't11', ms: 4803, cena: 'votacao', fala: 'No fim, o eleitor decide. Ninguém levou de primeira? Segundo turno!', dica: '🗳 APURAÇÃO' },
  { id: 't12', ms: 3518, cena: 'comemoracao', fala: 'Ganhou? Pode comemorar, que a faixa é sua!', dica: '🏆 ELEITO!' },
  { id: 't13', ms: 5578, cena: 'xp', fala: 'Cada debate dá XP e moedas: de vereador... até presidente!', legenda: 'XP e moedas a cada debate: Vereador → … → Presidente', dica: '+XP  +🪙' },
  { id: 't14', ms: 3784, cena: 'final', fala: 'Agora é com você. Ajeita a gravata, e bom debate!', legenda: 'Bom debate!' },
];
