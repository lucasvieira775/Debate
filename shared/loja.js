// Catálogo da loja de cosméticos (danças, emotes e provocações). Preços em moedas.
// "anim" é a animação do avatar 3D; "emoji"/"frase" aparecem num balão sobre o candidato.
export const ITENS = [
  // ---- danças (usadas na comemoração de vitória e como emote) ----
  { id: 'comemorar', som: 'Stadium crowd cheering and applauding with party horns and celebration whistles', seg: 4.5, tipo: 'danca', nome: 'Clássica', preco: 0, anim: 'festa', emoji: '🎉', descricao: 'Braços para o alto.' },
  { id: 'samba', som: 'Energetic Brazilian samba batucada with surdo, tamborim and whistle, carnival rhythm', seg: 4.5, tipo: 'danca', nome: 'Samba no pé', preco: 380, anim: 'samba', emoji: '🥁', descricao: 'Passos rápidos e muita ginga.' },
  { id: 'robo', som: '80s electro funk robot dance beat with robotic servo motor sounds and synth bleeps', seg: 4.5, tipo: 'danca', nome: 'Dança do robô', preco: 300, anim: 'robo', emoji: '🤖', descricao: 'Movimentos travados, estilo anos 80.' },
  { id: 'passinho', som: 'Brazilian funk carioca baile beat with heavy tamborzao drums', seg: 4.5, tipo: 'danca', nome: 'Passinho', preco: 500, anim: 'passinho', emoji: '🔥', descricao: 'O passinho do baile, com braços soltos.' },
  { id: 'disco', som: '70s disco groove with funky bass, hi-hat and strings', seg: 4.5, tipo: 'danca', nome: 'Febre da discoteca', preco: 450, anim: 'disco', emoji: '🪩', descricao: 'Dedo para o céu, dedo para o chão.' },
  { id: 'carnaval', som: 'Brazilian carnival street band with brass fanfare, drums, whistles and crowd singing', seg: 4.5, tipo: 'danca', nome: 'Bloco de carnaval', preco: 630, anim: 'carnaval', emoji: '🎊', descricao: 'Pulando e acenando para a plateia.' },
  // ---- emotes ----
  { id: 'joinha', som: 'Cheerful positive ding chime with a small crowd saying yeah', seg: 2, tipo: 'emote', nome: 'Joinha', preco: 100, anim: 'joinha', emoji: '👍', frase: '' },
  { id: 'coracao', som: 'Audience going awww sweetly with soft harp glissando', seg: 2.5, tipo: 'emote', nome: 'Coração para o eleitor', preco: 100, anim: 'coracao', emoji: '❤️', frase: '' },
  { id: 'continencia', som: 'Short military bugle salute call with a boot stomp', seg: 2.5, tipo: 'emote', nome: 'Continência', preco: 150, anim: 'continencia', emoji: '🫡', frase: '' },
  { id: 'facepalm', som: 'Hand slapping forehead followed by a long disappointed sigh', seg: 2, tipo: 'emote', nome: 'Mão na testa', preco: 150, anim: 'facepalm', emoji: '🤦', frase: '' },
  { id: 'micdrop', som: 'Microphone dropping on a wooden stage with loud thud and speaker feedback, crowd ooohs', seg: 3, tipo: 'emote', nome: 'Largar o microfone', preco: 300, anim: 'micdrop', emoji: '🎤', frase: 'Mic drop!' },
  { id: 'aceno', som: 'Friendly crowd cheering and clapping hello', seg: 2.5, tipo: 'emote', nome: 'Aceno ao povo', preco: 130, anim: 'aceno', emoji: '👋', frase: '' },
  // ---- provocações ----
  { id: 'chorao', som: 'Person laughing out loud hysterically, mocking belly laugh, ha ha ha', seg: 3, tipo: 'provocacao', nome: 'Chora mais', preco: 200, anim: 'gargalhada', emoji: '😭', frase: 'Chora mais!' },
  { id: 'relogio', som: 'Fast clock ticking followed by a loud alarm clock bell ring', seg: 3, tipo: 'provocacao', nome: 'Tá na hora', preco: 150, anim: 'relogio', emoji: '⏰', frase: 'Seu tempo acabou!' },
  { id: 'bocejo', som: 'Long exaggerated human yawn followed by a bored sigh', seg: 3, tipo: 'provocacao', nome: 'Que sono', preco: 150, anim: 'bocejo', emoji: '🥱', frase: 'Que discurso chato…' },
  { id: 'tchau', som: 'Mocking sing-song bye bye whistle with crowd ooh', seg: 2.5, tipo: 'provocacao', nome: 'Tchau, querido', preco: 200, anim: 'aceno', emoji: '👋', frase: 'Tchau, querido(a)!' },
  { id: 'pipoca', som: 'Popcorn popping and crunchy munching sounds', seg: 3, tipo: 'provocacao', nome: 'Pipoca', preco: 180, anim: 'pipoca', emoji: '🍿', frase: 'Isso vai ser bom…' },
  // ---- ações contra (ou a favor de) outro candidato: animação 3D em public/js/acoes/ ----
  // golpe: 'longe' = arremessa do próprio púlpito; 'perto' = leva o objeto na mão, caminha até o alvo e volta.
  // reacao do alvo: 'sujo' (rosto sujo), 'nocaute' (cai zonzo, ZzZ e passarinhos), 'molhado', 'amor' (corações).
  // agr = peso da agressão no voto (custa ao agressor, sobretudo entre moderados; a vítima ganha solidariedade); simp = simpatia (flores);
  // adv = advertências da moderação no impacto (3 = fora). Consequências: regras.js registrarAcao + salas.js acao().
  // anim = pose do atacante (avatar.js) usada também no "▶ Ver" da loja.
  { id: 'tomate', tipo: 'acao', agr: .25, golpe: 'longe', reacao: 'sujo', nome: 'Tomatada', preco: 0, anim: 'arremessar', emoji: '🍅', descricao: 'Um tomate maduro voando direto na cara do adversário.', som: 'Ripe tomato splatting wetly on a face, squishy juicy splat', seg: 2 },
  { id: 'flores', tipo: 'acao', simp: .3, golpe: 'longe', reacao: 'amor', nome: 'Chuva de flores', preco: 750, anim: 'arremessar', emoji: '💐', descricao: 'Joga um buquê de flores com muito amor e carinho.', som: 'Romantic soft harp glissando with gentle sparkling chimes', seg: 3 },
  { id: 'torta', tipo: 'acao', agr: .5, golpe: 'perto', reacao: 'sujo', nome: 'Torta na cara', preco: 880, anim: 'tortada', emoji: '🥧', descricao: 'Caminha até o adversário e esfrega uma torta de chantilly na cara dele.', som: 'Cream pie smashed into a face, soft wet splat, comedic slide whistle', seg: 2.5 },
  { id: 'balde', tipo: 'acao', agr: .5, golpe: 'perto', reacao: 'molhado', nome: 'Balde de água gelada', preco: 1000, anim: 'baldeada', emoji: '🪣', descricao: 'Vira um balde de água com gelo na cabeça do adversário.', som: 'Bucket of ice water splashing over a person, big water splash and ice cubes clinking, person gasping', seg: 2.5 },
  { id: 'paulada', tipo: 'acao', agr: .7, adv: 1, golpe: 'perto', reacao: 'nocaute', nome: 'Paulada', preco: 1130, anim: 'golpePau', emoji: '🪵', descricao: 'Um pedaço de pau e uma pancada cômica na cabeça.', som: 'Cartoon wooden stick bonk on a head, hollow wooden thwack with cartoon boing', seg: 2 },
  { id: 'cadeirada', tipo: 'acao', agr: .8, adv: 1, golpe: 'perto', reacao: 'nocaute', nome: 'Cadeirada', preco: 1250, anim: 'golpeCadeira', emoji: '🪑', descricao: 'Pega a cadeira de metal do bar, caminha até o adversário e desfere a cadeirada.', som: 'Metal folding bar chair smashing on a person, loud metallic clang crash', seg: 2.5 },
  // ---- acessórios e conjuntos: "av" = valores do avatar que o item desbloqueia (e veste); "cores" só é aplicado ao vestir ----
  { id: 'oc_aviador', tipo: 'acessorio', av: { oculos: 'aviador' }, nome: 'Óculos aviador dourado', preco: 300, anim: 'joinha', emoji: '🕶️', descricao: 'Armação dourada de quem já nasceu no poder.' },
  { id: 'oc_pixel', tipo: 'acessorio', av: { oculos: 'pixel' }, nome: 'Óculos pixelado', preco: 380, anim: 'joinha', emoji: '😎', descricao: 'Deal with it. O clássico dos memes.' },
  { id: 'oc_folha', tipo: 'acessorio', av: { oculos: 'folha' }, nome: 'Óculos folha verde', preco: 500, anim: 'gargalhada', emoji: '🍃', descricao: 'Lentes em forma de folha. Tranquilidade total no debate.' },
  { id: 'oc_coracao', tipo: 'acessorio', av: { oculos: 'coracao' }, nome: 'Óculos coração', preco: 250, anim: 'coracao', emoji: '😍', descricao: 'Para conquistar o eleitor no olhar.' },
  { id: 'oc_estrela', tipo: 'acessorio', av: { oculos: 'estrela' }, nome: 'Óculos estrela', preco: 250, anim: 'aceno', emoji: '🤩', descricao: 'Celebridade da política.' },
  { id: 'ch_cartola', tipo: 'acessorio', av: { chapeu: 'cartola' }, nome: 'Cartola', preco: 380, anim: 'aceno', emoji: '🎩', descricao: 'Cartola preta com fita vermelha.' },
  { id: 'ch_coroa', tipo: 'acessorio', av: { chapeu: 'coroa' }, nome: 'Coroa', preco: 630, anim: 'aceno', emoji: '👑', descricao: 'Ouro e pedras preciosas. Monarquista?' },
  { id: 'ch_festa', tipo: 'acessorio', av: { chapeu: 'festa' }, nome: 'Chapéu de festa', preco: 200, anim: 'joinha', emoji: '🥳', descricao: 'Cone listrado para comemorar a vitória.' },
  { id: 'ch_palhaco', tipo: 'acessorio', av: { chapeu: 'palhaco' }, nome: 'Peruca de palhaço', preco: 300, anim: 'gargalhada', emoji: '🤡', descricao: 'Cachos coloridos para o circo do debate.' },
  { id: 'ex_faixa', tipo: 'acessorio', av: { extra: 'faixa' }, nome: 'Faixa presidencial', preco: 750, anim: 'continencia', emoji: '🎗️', descricao: 'Já se sente eleito(a)? Vista a faixa.' },
  { id: 'ex_corrente', tipo: 'acessorio', av: { extra: 'corrente' }, nome: 'Corrente de ouro', preco: 450, anim: 'joinha', emoji: '📿', descricao: 'Ostentação no pescoço.' },
  { id: 'ex_charuto', tipo: 'acessorio', av: { extra: 'charuto' }, nome: 'Charuto', preco: 300, anim: 'joinha', emoji: '🚬', descricao: 'Charuto cubano de quem fecha acordos.' },
  { id: 'ex_nariz', tipo: 'acessorio', av: { extra: 'nariz' }, nome: 'Nariz de palhaço', preco: 200, anim: 'gargalhada', emoji: '🔴', descricao: 'Bolinha vermelha no nariz.' },
  // conjuntos completos (ids 'batina'/'pastor' mantidos: quem já comprou o traje continua com ele)
  { id: 'batina', tipo: 'conjunto', av: { roupa: 'batina', chapeu: 'padre' }, nome: 'Conjunto Padre', preco: 1380, anim: 'aceno', emoji: '⛪', descricao: 'Batina preta com faixa vermelha, crucifixo dourado e chapéu de padre.' },
  { id: 'pastor', tipo: 'conjunto', av: { roupa: 'pastor' }, cores: { corRoupa: '#111111', corCamisa: '#ffffff', corGravata: '#1d4ed8' }, nome: 'Conjunto Pastor', preco: 1000, anim: 'joinha', emoji: '📖', descricao: 'Terno escuro, gravata azul e a Bíblia Sagrada sempre na mão.' },
  { id: 'cj_magnata', tipo: 'conjunto', av: { chapeu: 'cartola', oculos: 'aviador', extra: 'charuto' }, cores: { corRoupa: '#111111', corGravata: '#ca8a04' }, nome: 'Conjunto Magnata', preco: 830, anim: 'joinha', emoji: '💸', descricao: 'Cartola, óculos aviador e charuto (sai mais barato que separado).' },
  { id: 'cj_palhaco', tipo: 'conjunto', av: { chapeu: 'palhaco', extra: 'nariz' }, nome: 'Conjunto Palhaço', preco: 430, anim: 'gargalhada', emoji: '🎪', descricao: 'Peruca colorida e nariz vermelho: o circo está armado.' },
];
/** Valores bloqueados do avatar: campo → valor → ids dos itens que o liberam (basta ter um). */
export const AV_ITEM = Object.create(null); // sem protótipo: valores vindos do cliente ('constructor', '__proto__'…) não casam
for (const i of ITENS) for (const [c, v] of Object.entries(i.av || {})) ((AV_ITEM[c] ||= Object.create(null))[v] ||= []).push(i.id);
/** Itens que liberam avatar[campo] = valor (vazio = grátis). */
export const itensDe = (campo, valor) => AV_ITEM[campo]?.[valor] || [];
// Pacotes de moedas pagos em reais (PIX). Referência: uma partida rende ~15–60 moedas e todos os
// cosméticos somam ~17.000 moedas. O pacote menor equivale a ~2 partidas; os maiores dão bônus crescente.
export const PACOTES_MOEDAS = [
  { id: 'trocado', nome: 'Dinheiro na cueca', emoji: '🩲', moedas: 120, bonus: 0, reais: 2.90 },
  { id: 'vaquinha', nome: 'Dinheiro na mala', emoji: '🧳', moedas: 350, bonus: 50, reais: 7.90 },
  { id: 'cofre', nome: 'Rachadinha', emoji: '💰', moedas: 800, bonus: 200, reais: 16.90, destaque: true },
  { id: 'fundo', nome: 'Desvio de Verba', emoji: '💼', moedas: 1600, bonus: 600, reais: 29.90 },
  { id: 'tesouro', nome: 'Desvio do Fundão', emoji: '🏦', moedas: 3500, bonus: 1500, reais: 59.90 },
];
export const ITEM = Object.fromEntries(ITENS.map(i => [i.id, i]));
// TESTES: tudo liberado (ações, roupas, danças...). VOLTAR PARA false AO HOSPEDAR (junto com MOEDAS_TESTE em server/contas.js).
export const TUDO_LIBERADO = true;
export const GRATIS = ITENS.filter(i => TUDO_LIBERADO || i.preco === 0).map(i => i.id);
// Ações: depois de usar uma, espera 3 min para usar outra; cada ação só pode ser usada uma vez por debate.
export const ACAO_ESPERA_MS = 3 * 60000;
