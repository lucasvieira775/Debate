// Catálogo da loja de cosméticos (danças, emotes e provocações). Preços em moedas.
// "anim" é a animação do avatar 3D; "emoji"/"frase" aparecem num balão sobre o candidato.
export const ITENS = [
  // ---- danças (usadas na comemoração de vitória e como emote) ----
  { id: 'comemorar', som: 'Stadium crowd cheering and applauding with party horns and celebration whistles', seg: 4.5, tipo: 'danca', nome: 'Clássica', preco: 0, anim: 'festa', emoji: '🎉', descricao: 'Braços para o alto.' },
  { id: 'samba', som: 'Energetic Brazilian samba batucada with surdo, tamborim and whistle, carnival rhythm', seg: 4.5, tipo: 'danca', nome: 'Samba no pé', preco: 150, anim: 'samba', emoji: '🥁', descricao: 'Passos rápidos e muita ginga.' },
  { id: 'robo', som: '80s electro funk robot dance beat with robotic servo motor sounds and synth bleeps', seg: 4.5, tipo: 'danca', nome: 'Dança do robô', preco: 120, anim: 'robo', emoji: '🤖', descricao: 'Movimentos travados, estilo anos 80.' },
  { id: 'passinho', som: 'Brazilian funk carioca baile beat with heavy tamborzao drums', seg: 4.5, tipo: 'danca', nome: 'Passinho', preco: 200, anim: 'passinho', emoji: '🔥', descricao: 'O passinho do baile, com braços soltos.' },
  { id: 'disco', som: '70s disco groove with funky bass, hi-hat and strings', seg: 4.5, tipo: 'danca', nome: 'Febre da discoteca', preco: 180, anim: 'disco', emoji: '🪩', descricao: 'Dedo para o céu, dedo para o chão.' },
  { id: 'carnaval', som: 'Brazilian carnival street band with brass fanfare, drums, whistles and crowd singing', seg: 4.5, tipo: 'danca', nome: 'Bloco de carnaval', preco: 250, anim: 'carnaval', emoji: '🎊', descricao: 'Pulando e acenando para a plateia.' },
  // ---- emotes ----
  { id: 'joinha', som: 'Cheerful positive ding chime with a small crowd saying yeah', seg: 2, tipo: 'emote', nome: 'Joinha', preco: 40, anim: 'joinha', emoji: '👍', frase: '' },
  { id: 'coracao', som: 'Audience going awww sweetly with soft harp glissando', seg: 2.5, tipo: 'emote', nome: 'Coração para o eleitor', preco: 40, anim: 'coracao', emoji: '❤️', frase: '' },
  { id: 'continencia', som: 'Short military bugle salute call with a boot stomp', seg: 2.5, tipo: 'emote', nome: 'Continência', preco: 60, anim: 'continencia', emoji: '🫡', frase: '' },
  { id: 'facepalm', som: 'Hand slapping forehead followed by a long disappointed sigh', seg: 2, tipo: 'emote', nome: 'Mão na testa', preco: 60, anim: 'facepalm', emoji: '🤦', frase: '' },
  { id: 'micdrop', som: 'Microphone dropping on a wooden stage with loud thud and speaker feedback, crowd ooohs', seg: 3, tipo: 'emote', nome: 'Largar o microfone', preco: 120, anim: 'micdrop', emoji: '🎤', frase: 'Mic drop!' },
  { id: 'aceno', som: 'Friendly crowd cheering and clapping hello', seg: 2.5, tipo: 'emote', nome: 'Aceno ao povo', preco: 50, anim: 'aceno', emoji: '👋', frase: '' },
  // ---- provocações ----
  { id: 'chorao', som: 'Person laughing out loud hysterically, mocking belly laugh, ha ha ha', seg: 3, tipo: 'provocacao', nome: 'Chora mais', preco: 80, anim: 'gargalhada', emoji: '😭', frase: 'Chora mais!' },
  { id: 'relogio', som: 'Fast clock ticking followed by a loud alarm clock bell ring', seg: 3, tipo: 'provocacao', nome: 'Tá na hora', preco: 60, anim: 'relogio', emoji: '⏰', frase: 'Seu tempo acabou!' },
  { id: 'bocejo', som: 'Long exaggerated human yawn followed by a bored sigh', seg: 3, tipo: 'provocacao', nome: 'Que sono', preco: 60, anim: 'bocejo', emoji: '🥱', frase: 'Que discurso chato…' },
  { id: 'tchau', som: 'Mocking sing-song bye bye whistle with crowd ooh', seg: 2.5, tipo: 'provocacao', nome: 'Tchau, querido', preco: 80, anim: 'aceno', emoji: '👋', frase: 'Tchau, querido(a)!' },
  { id: 'pipoca', som: 'Popcorn popping and crunchy munching sounds', seg: 3, tipo: 'provocacao', nome: 'Pipoca', preco: 70, anim: 'pipoca', emoji: '🍿', frase: 'Isso vai ser bom…' },
  // ---- roupas (trajes exclusivos; "roupa" é o valor em avatar.roupa) ----
  { id: 'batina', tipo: 'roupa', roupa: 'batina', nome: 'Batina de padre', preco: 300, anim: 'aceno', emoji: '⛪', descricao: 'Batina preta com faixa vermelha e crucifixo dourado.' },
  { id: 'pastor', tipo: 'roupa', roupa: 'pastor', nome: 'Terno com Bíblia', preco: 250, anim: 'joinha', emoji: '📖', descricao: 'Terno escuro e a Bíblia Sagrada sempre na mão.' },];
/** Trajes vendidos na loja: valor de avatar.roupa → id do item. */
export const ROUPA_ITEM = Object.fromEntries(ITENS.filter(i => i.tipo === 'roupa').map(i => [i.roupa, i.id]));
// Pacotes de moedas pagos em reais (PIX). Referência: uma partida rende ~60–150 moedas e todos os
// cosméticos somam ~1.700 moedas. O pacote menor equivale a ~2 partidas; os maiores dão bônus crescente.
export const PACOTES_MOEDAS = [
  { id: 'trocado', nome: 'Dinheiro na cueca', emoji: '🩲', moedas: 120, bonus: 0, reais: 2.90 },
  { id: 'vaquinha', nome: 'Dinheiro na mala', emoji: '🧳', moedas: 350, bonus: 50, reais: 7.90 },
  { id: 'cofre', nome: 'Rachadinha', emoji: '💰', moedas: 800, bonus: 200, reais: 16.90, destaque: true },
  { id: 'fundo', nome: 'Desvio de Verba', emoji: '💼', moedas: 1600, bonus: 600, reais: 29.90 },
  { id: 'tesouro', nome: 'Desvio do Fundão', emoji: '🏦', moedas: 3500, bonus: 1500, reais: 59.90 },
];
export const ITEM = Object.fromEntries(ITENS.map(i => [i.id, i]));
export const GRATIS = ITENS.filter(i => i.preco === 0).map(i => i.id);
