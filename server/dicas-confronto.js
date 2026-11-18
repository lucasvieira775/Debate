// Dicas do confronto direto do 2º turno (tema livre): 20 perguntas para fazer ao adversário e 20 jeitos de desviar/responder.
// Cada item: [abertura, ponto1, ponto2]. {a} = nome do adversário, {s} = sigla dele, {m} = sigla do candidato, {n} = número do candidato.
export const PERGUNTAS = [
  ['"{a}, sua maior promessa custa quanto? E de onde sai esse dinheiro?"', 'Insista no valor: promessa sem conta é promessa vazia.', 'Feche com a sua: "Eu digo de onde vem cada real."'],
  ['"{a}, em que ano o eleitor vai ver sua principal promessa pronta?"', 'Cobre data, não intenção.', 'Mostre que você tem prazo: "No meu plano, é até o segundo ano."'],
  ['"{a}, qual é a primeira medida que você assina no primeiro dia de governo?"', 'Quem não sabe o primeiro passo não tem plano.', 'Diga a sua em uma frase antes de passar a palavra.'],
  ['"{a}, o {s} já defendeu uma coisa e hoje diz outra. Em qual versão o eleitor deve acreditar?"', 'Contradição pega bem com o eleitor indeciso.', 'Não acuse sem base: fale de posição, não de pessoa.'],
  ['"{a}, sem maioria no Congresso, como você vai aprovar alguma coisa?"', 'Mostra que o adversário promete sem combinar com ninguém.', 'Diga que você já conversa com todos os lados.'],
  ['"{a}, se faltar dinheiro, qual área você corta primeiro: saúde, educação ou segurança?"', 'Pergunta de escolha difícil: qualquer resposta custa voto a ele.', 'Fique em silêncio e deixe a resposta pesar.'],
  ['"{a}, o que muda no fim do mês de uma família que vive com um salário mínimo no seu governo?"', 'Leve o debate para o bolso do eleitor.', 'Peça um valor concreto, não um discurso.'],
  ['"{a}, quantos empregos seu plano cria? E em quanto tempo?"', 'Emprego é a preocupação número um do eleitor.', 'Se ele não der número, o eleitor percebe.'],
  ['"{a}, uma mãe espera meses por uma consulta no posto. O que você faz por ela no primeiro ano?"', 'Use a história de uma pessoa: emociona e encurrala.', 'Cobre prazo: "no primeiro ano".'],
  ['"{a}, qual é a sua meta para reduzir a violência até o fim do mandato? Com número."', 'Segurança mexe com todo eleitor.', 'Peça número e prazo, nada de "vamos combater".'],
  ['"{a}, em quatro anos, o que melhora na escola pública? E se não cumprir, o que acontece?"', 'Cobre meta e consequência.', 'Mostre que você aceita ser cobrado.'],
  ['"{a}, responda direto: você vai aumentar ou diminuir impostos? De quem?"', 'Pergunta de sim ou não: fugir dela pega mal.', 'Repita "de quem?" se ele enrolar.'],
  ['"{a}, como você garante que ninguém do seu governo vai desviar dinheiro público?"', 'Transparência é ponto sensível para qualquer candidato.', 'Cite a sua regra: painel público, contas abertas.'],
  ['"{a}, o que o seu plano tem de concreto para o Norte e o Nordeste?"', 'Testa se o adversário pensa no país inteiro.', 'Mostre que você tem proposta regional.'],
  ['"{a}, um jovem de 18 anos sem emprego e sem estudo está te assistindo. Por que ele deveria votar em você?"', 'Põe o adversário para falar com um público que ele costuma esquecer.', 'Depois, fale você com esse jovem.'],
  ['"{a}, como você vai produzir mais no campo sem destruir a floresta?"', 'Tema que divide eleitores: qualquer resposta extrema perde votos.', 'Defenda o equilíbrio no seu tempo.'],
  ['"{a}, você aceita publicar suas metas num painel para o eleitor cobrar todo mês?"', 'Se ele disser não, parece que esconde algo; se disser sim, vira compromisso.', 'Diga que você já aceita.'],
  ['"{a}, qual resultado concreto você já entregou na vida? Um só."', 'Testa experiência sem atacar a pessoa.', 'Tenha o seu exemplo pronto para usar depois.'],
  ['"{a}, sim ou não: você garante que não vai cortar nenhum programa social?"', 'Sim ou não deixa pouco espaço para enrolar.', 'Qualquer "depende" vira manchete na Xzona.'],
  ['"{a}, qual promessa sua você admite que não consegue cumprir em quatro anos?"', 'Pergunta-armadilha: admitir pega mal, negar parece arrogância.', 'Mantenha o tom educado: quem fica nervoso perde.'],
];

/** Ponto fraco típico de cada espectro do adversário (vira o 3º ponto da dica de pergunta). */
export const FRACOS = {
  esq: 'Contra a esquerda, funciona perguntar de onde vem o dinheiro e se vai aumentar imposto.',
  cen: 'Contra o centro, cobre uma posição clara: "Você é a favor ou contra? Sem ficar em cima do muro."',
  dir: 'Contra a direita, funciona perguntar quem fica sem proteção com os cortes.',
};

export const DESVIOS = [
  ['Faça a ponte: "Boa pergunta, mas o que o eleitor quer saber mesmo é…" e vá para a sua proposta.', 'Uma frase sobre a pergunta, o resto do tempo na sua proposta.', 'Termine com o número {n}.'],
  ['Reconheça e vire: "Concordo que é um problema sério. Por isso a minha proposta é…"', 'Concordar desarma o ataque.', 'Mude logo para a solução: o eleitor quer saída, não briga.'],
  ['Devolva com calma: "Curioso o {s} perguntar isso, logo quem nunca resolveu…"', 'Sem ofensa pessoal: critique o partido, não a pessoa.', 'Depois do contra-ataque, volte para a sua proposta.'],
  ['Reformule: "O que está por trás da sua pergunta é: como melhorar a vida das pessoas. E eu respondo…"', 'Você escolhe a parte da pergunta que quer responder.', 'Fale de resultado na vida do eleitor.'],
  ['Responda com uma meta sua: "Eu vou dizer o meu número: …"', 'Número e prazo passam firmeza, mesmo saindo do assunto.', 'Uma meta forte vale mais que três fracas.'],
  ['Conte uma história: "Conheci uma pessoa que passou por isso…"', 'História prende a atenção e tira o foco da pergunta.', 'Ligue a história à sua proposta.'],
  ['Fale de princípio: "Meu compromisso é com quem mais precisa, e isso não muda."', 'Valores firmes parecem resposta, mesmo sem detalhe.', 'Em seguida, uma proposta concreta.'],
  ['Fatie a pergunta: responda só a parte que te favorece, com segurança.', 'Fale com convicção: o eleitor nota hesitação, não o recorte.', 'Não volte para a parte difícil.'],
  ['Olhe para frente: "Não vou ficar olhando para trás. O que eu faço daqui para frente é…"', 'Bom para perguntas sobre passado ou erros.', 'Feche com o que o eleitor ganha.'],
  ['Fale com o eleitor, não com o adversário: "Você que está em casa…"', 'Ignore a provocação e converse com a câmera.', 'Peça a confiança dele no final.'],
  ['Mostre o contraste: "A diferença entre nós dois é simples: …"', 'Transforme a pergunta numa comparação a seu favor.', 'Uma diferença clara, sem lista.'],
  ['Corrija a pergunta: "A pergunta certa não é essa. A pergunta certa é…"', 'Use com firmeza e sem arrogância.', 'Responda a sua própria pergunta com uma proposta.'],
  ['Responda em três passos: "Primeiro… segundo… terceiro…"', 'Estrutura passa preparo, mesmo que o assunto mude.', 'Cada passo em uma frase curta.'],
  ['Seja humilde: "Ninguém tem todas as respostas, mas eu tenho um plano e uma equipe."', 'Humildade desarma pergunta-armadilha.', 'Depois, cite uma medida do plano.'],
  ['Divida a responsabilidade: "Isso se resolve com estados, prefeituras e Congresso juntos. E eu sei juntar."', 'Bom para promessas difíceis de cumprir sozinho.', 'Mostre capacidade de diálogo.'],
  ['Não morda a isca: respire, fale devagar e com tom calmo.', 'Quem perde a calma perde o debate.', 'Sorria e volte para a sua proposta.'],
  ['Sim, e…: "Sim, e vou além: …"', 'Aceite a premissa e acrescente uma proposta maior.', 'Funciona bem contra pergunta de sim ou não.'],
  ['Aponte uma contradição do adversário: "Você pergunta isso, mas o seu partido votou contra…"', 'Fale de posições, nunca da vida pessoal.', 'Uma frase só: não gaste o tempo todo atacando.'],
  ['Traga o assunto para o bolso: "O que importa é o preço do arroz, da luz e do gás. E aí eu proponho…"', 'Economia do dia a dia sempre interessa ao eleitor.', 'Diga o que muda no fim do mês.'],
  ['Feche forte: responda em 20 segundos e use o resto para pedir o voto.', 'Repita o seu número {n} e a sigla {m}.', 'A última frase é a que fica.'],
];

export const CUIDADOS_CONFRONTO = ['Não tem réplica: a pergunta precisa ser curta e fechada.', 'Pergunta longa vira discurso e dá tempo para o adversário pensar.', 'Ataque à pessoa gera advertência: critique ideias.', 'Desviar demais vira meme na Xzona: responda ao menos uma parte.',
  'Nada de palavrão: advertência tira nota e voto.', 'Guarde 10 segundos para fechar com a sua proposta.', 'Não ria do adversário: o eleitor de centro não gosta.', 'Fale com a câmera, não só com o adversário.'];
