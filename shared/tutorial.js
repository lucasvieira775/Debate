// Tutorial "como jogar": roteiro da cinemática (public/js/tutorial.js) + narração em /audio/tutorial/<id>.wav.
// Áudio: `node server/tutorial-audio.js` gera os .wav que faltam (voz TUTORIAL_VOZ, direção TUTORIAL_DIR) e grava o `ms` real aqui;
// `node server/tutorial-audio.js <id> ...` regera só esses passos. Sem .wav o passo toca com a voz do navegador + legenda.
// Fatos citados vêm do código: loja.js (itens, ACAO_ESPERA_MS, cadeirada adv:1), contas.js ECONOMIA (dicasGratis, pacotes),
// moderacao.js (PUNICAO/REGRAS_DEBATE), regras.js (ETAPAS/SEGUNDOS/analisar), niveis.js (XP/CARGOS), main.js (nomes dos botões).
export const TUTORIAL_VOZ = 'Puck';
export const TUTORIAL_DIR = 'Narrador brasileiro de um vídeo tutorial de um jogo de humor sobre debate presidencial na TV. Voz animada, simpática e bem-humorada, ritmo ágil e claro, com sorriso na voz, como um apresentador de programa de auditório. Sotaque brasileiro.';
export const TUTORIAL = [
  { id: 'boasvindas', ms: 4320, cena: 'abertura', fala: 'Bem-vindo ao Debate Presidencial, onde quem fala melhor leva a faixa!', legenda: 'Bem-vindo ao Debate Presidencial!' },
  { id: 'personalizar', ms: 5996, cena: 'personalizar', fala: 'Comece em Personalizar: escolha o visual, a roupa e o partido, que define seu lado político!', dica: '👤 PERSONALIZAR' },
  { id: 'xzona', ms: 6515, cena: 'xzona', fala: 'Na Xzona, sua melhor fala vira post. Debateu bem? Ganha seguidores. Foi mal? Perde!', dica: '📱 MINHA FANPAGE' },
  { id: 'jogar', ms: 4720, cena: 'jogar', fala: 'Pra jogar: partida rápida, sala com os amigos, ou treino contra a IA!', dica: '▶ JOGAR' },
  { id: 'sala', ms: 6149, cena: 'sala', fala: 'Na sala cabem até cinco candidatos. Todo mundo pronto? O anfitrião inicia a partida!', dica: '🏛 SALA DE ESPERA' },
  { id: 'pergunta', ms: 7730, cena: 'pergunta', fala: 'São três blocos: propostas, confronto direto e considerações finais. A jornalista pergunta, e o relógio dispara!', dica: '🧱 3 BLOCOS' },
  { id: 'falar', ms: 4604, cena: 'falar', fala: 'Na sua vez, clique no microfone e fale. Ou digite, e aperte Confirmar!', dica: '🎙 SUA VEZ' },
  { id: 'nota', ms: 5218, cena: 'fala', fala: 'Fique no tema e traga propostas com números. Fugiu da pergunta? Perdeu nota!', dica: '📈 NOTA ALTA' },
  { id: 'ajuda', ms: 4435, cena: 'ajuda', fala: 'Deu branco? No painel de perguntas, a interrogação abre uma dica de fala!', dica: '❓ DICA DE FALA' },
  { id: 'dica', ms: 6529, cena: 'dica', fala: 'E o botão Dica chama a assessoria: uma anotação grátis por debate. Quer mais? Tem na loja!', dica: '📝 DICA DA ASSESSORIA' },
  { id: 'confronto', ms: 4442, cena: 'confronto', fala: 'No confronto direto, você escolhe quem vai encarar, cara a cara!', legenda: 'Confronto direto: pergunta, resposta, réplica e tréplica', dica: '🥊 CONFRONTO' },
  { id: 'pode', ms: 5602, cena: 'pode', fala: 'Crítica dura pode! "Sua proposta é tão vazia quanto o cofre que o senhor deixou!"', dica: '✅ PODE' },
  { id: 'atencao', ms: 2492, cena: 'pode', fala: '"Cala a boca"? Só um puxão de orelha.', legenda: '"Cala a boca", "idiota" = só chamada de atenção', dica: '🟡 CHAMADA DE ATENÇÃO' },
  { id: 'naopode', ms: 4398, cena: 'nao_pode', fala: 'Palavrão pesado? Advertência na hora, e a nota despenca!', legenda: '#@!% = advertência e nota lá embaixo', dica: '❌ NÃO PODE' },
  { id: 'advertencia', ms: 7549, cena: 'advertencia', fala: 'Preconceito ou ameaça: duas advertências. Juntou três? Banido da sala, sem voto e sem moeda!', legenda: 'Preconceito/ameaça = 2 advertências (repetiu, expulsão) · 3 advertências = banido', dica: '⚠ 3 = BANIDO' },
  { id: 'emotes', ms: 6949, cena: 'emotes', fala: 'Na carinha tem emojis grátis, emotes, danças, provocações e ações. Cada ação, só uma vez por debate!', dica: '😀 EMOTES E AÇÕES' },
  { id: 'cadeirada', ms: 6170, cena: 'caldeirada', fala: 'E a cadeirada? Tem na loja, mas custa advertência e votos, e a vítima ganha simpatia!', dica: '🪑 +1 ADVERTÊNCIA' },
  { id: 'plateia', ms: 4432, cena: 'plateia', fala: 'A plateia vaia, aplaude, e tudo vira meme na Xzona!', dica: '👏 PLATEIA' },
  { id: 'votacao', ms: 4803, cena: 'votacao', fala: 'No fim, o eleitor decide. Ninguém levou de primeira? Segundo turno!', dica: '🗳 APURAÇÃO' },
  { id: 'vitoria', ms: 3518, cena: 'comemoracao', fala: 'Ganhou? Pode comemorar, que a faixa é sua!', dica: '🏆 ELEITO!' },
  { id: 'carreira', ms: 5578, cena: 'xp', fala: 'Cada debate dá XP e moedas: de vereador... até presidente!', legenda: 'XP e moedas a cada debate: Vereador → … → Presidente', dica: '+XP  +🪙' },
  { id: 'loja', ms: 6100, cena: 'loja', fala: 'Na Loja, suas moedas viram mais dicas, emotes, danças, ações e roupas novas!', dica: '🛒 LOJA' },
  { id: 'final', ms: 3784, cena: 'final', fala: 'Agora é com você. Ajeita a gravata, e bom debate!', legenda: 'Bom debate!' },
];
