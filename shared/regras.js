// Regras do jogo, compartilhadas entre servidor e cliente.
// Dados (partidos, temas dos 27 estados + nacionais), análise das falas e modelo eleitoral.

import { TEMAS_BR } from './temas-br.js';

export const JORN = 'Poliana Cabrita';
export const ELEITORADO = 158_000_000;

export const IDEO = {
  'esquerda':        { nome: 'Esquerda',        pos: -2, cor: '#dc2626' },
  'centro-esquerda': { nome: 'Centro-esquerda', pos: -1, cor: '#f97316' },
  'centro':          { nome: 'Centro',          pos:  0, cor: '#94a3b8' },
  'centro-direita':  { nome: 'Centro-direita',  pos:  1, cor: '#14b8a6' },
  'direita':         { nome: 'Direita',         pos:  2, cor: '#2563eb' },
};
const IDEO_POR_POS = Object.fromEntries(Object.entries(IDEO).map(([k, v]) => [v.pos, k]));

// Partidos fictícios
export const PARTIDOS = [
  { sigla: 'FPB', nome: 'Frente Popular Brasileira', ideo: 'esquerda', numero: '18', cor: '#c81e1e', cor2: '#ffd23f', simbolo: 'estrela', lema: 'Pelo povo que trabalha' },
  { sigla: 'CBI', nome: 'Coletivo Brasil Igualdade', ideo: 'esquerda', numero: '21', cor: '#9d174d', cor2: '#fbcfe8', simbolo: 'coracao', lema: 'Igualdade de verdade' },
  { sigla: 'MSD', nome: 'Movimento Social Democrata', ideo: 'centro-esquerda', numero: '31', cor: '#ea580c', cor2: '#fff7ed', simbolo: 'sol', lema: 'Crescer com justiça social' },
  { sigla: 'ATN', nome: 'Aliança Trabalhista Nacional', ideo: 'centro-esquerda', numero: '34', cor: '#b45309', cor2: '#fde68a', simbolo: 'engrenagem', lema: 'Emprego, renda e dignidade' },
  { sigla: 'PUN', nome: 'Partido da União Nacional', ideo: 'centro', numero: '41', cor: '#475569', cor2: '#e2e8f0', simbolo: 'ponte', lema: 'Unir o Brasil' },
  { sigla: 'MVB', nome: 'Movimento Verde Brasil', ideo: 'centro', numero: '43', cor: '#15803d', cor2: '#bbf7d0', simbolo: 'folha', lema: 'Desenvolver preservando' },
  { sigla: 'ALB', nome: 'Aliança Liberal Brasileira', ideo: 'centro-direita', numero: '52', cor: '#0d9488', cor2: '#ccfbf1', simbolo: 'seta', lema: 'Liberdade para empreender' },
  { sigla: 'PDE', nome: 'Partido do Desenvolvimento e Empreendedorismo', ideo: 'centro-direita', numero: '56', cor: '#0369a1', cor2: '#e0f2fe', simbolo: 'diamante', lema: 'Menos burocracia, mais Brasil' },
  { sigla: 'POP', nome: 'Partido Ordem e Progresso', ideo: 'direita', numero: '63', cor: '#1d4ed8', cor2: '#fde047', simbolo: 'escudo', lema: 'Ordem, segurança e progresso' },
  { sigla: 'CNB', nome: 'Coalizão Nacional Brasileira', ideo: 'direita', numero: '68', cor: '#1e3a8a', cor2: '#22c55e', simbolo: 'bandeira', lema: 'Família, pátria e liberdade' },
];
export const PARTIDO = Object.fromEntries(PARTIDOS.map(p => [p.sigla, p]));

export const SEGMENTOS = [
  { id: 'esquerda', pos: -2, peso: .18 }, { id: 'centro-esquerda', pos: -1, peso: .17 }, { id: 'centro', pos: 0, peso: .28 },
  { id: 'centro-direita', pos: 1, peso: .17 }, { id: 'direita', pos: 2, peso: .20 },
];

export const TEMA_BASE = {
  saude: ['saude', '=sus', 'hospita', 'medic', 'posto', 'fila', 'vacina', 'enfermeir', 'atendimento', 'doenca', 'remedio', '=upa', 'cirurgia', 'sanitari', 'especialista'],
  educacao: ['educa', 'escola', 'professor', 'ensino', 'aluno', 'universidade', 'creche', 'alfabetiz', 'tempo integral', '=enem', 'bolsa', 'tecnic', 'estudant', 'aprendiz'],
  seguranca: ['seguranca', 'policia', 'crime', 'violencia', 'facc', 'presidio', 'preso', '=arma', '=armas', 'droga', 'trafic', 'homicid', 'fronteira', 'inteligencia', 'delegacia', 'milicia'],
  economia: ['econom', 'emprego', 'desemprego', 'inflacao', 'juros', '=pib', 'salario', 'renda', 'industria', 'investiment', 'crescimento', 'empresa', 'trabalho', 'credito', 'divida'],
  ambiente: ['ambient', 'amazonia', 'desmatamento', 'clima', 'energia', 'sustentav', 'floresta', 'carbono', 'agua', 'queimada', 'renovav', 'solar', 'eolica', 'biodiversidade', 'indigena'],
  corrupcao: ['corrup', 'transparen', 'propina', 'desvio', 'lavagem', 'fiscaliz', 'controle', 'licitacao', 'etica', 'justica', 'impunidade', 'orcamento secreto', 'emenda', 'auditoria', 'denuncia'],
  previdencia: ['previdencia', 'aposent', '=inss', 'idoso', 'pensao', 'beneficio', 'contribui', 'deficit', 'expectativa de vida'],
  impostos: ['imposto', 'tribut', '=iva', 'icms', 'carga', 'taxa', 'sonega', 'arrecada', 'isencao', 'renda', 'fortuna', 'simplific', 'dividendo'],
  moradia: ['moradia', '=casa', '=casas', 'habita', 'aluguel', 'minha casa', 'favela', 'urbaniza', 'saneamento', 'terreno', 'financiamento', 'sem teto', 'periferia'],
  infra: ['infraestrutura', 'estrada', 'rodovia', 'ferrovia', 'porto', 'aeroporto', 'transporte', 'mobilidade', 'metro', 'onibus', 'obra', 'logistic', 'ponte', 'concess'],
  fome: ['fome', 'aliment', 'pobreza', 'miseria', 'cesta', 'bolsa familia', 'assistencia', 'vulnerav', 'renda basica', 'comida', 'cozinha', 'merenda', 'desigualdade'],
  tecnologia: ['tecnolog', 'inovacao', 'internet', 'digital', 'startup', 'ciencia', 'pesquisa', 'inteligencia artificial', '=5g', 'dados', 'conectividade', 'programacao', 'semicondut'],
  agro: ['agro', 'agricultura', 'campo', 'produtor', 'rural', 'terra', 'reforma agraria', 'safra', 'exporta', 'pecuaria', 'familiar', 'assentamento', 'fazend', 'alimento'],
};

const UFS = [
  ['AC', 'Acre', 'do Acre', [
    ['ambiente', 'Queimadas e proteção da floresta', 'O Acre convive com queimadas e com a pressão do desmatamento. Como proteger a floresta e gerar renda para quem vive dela?', 'acre,queimada,extrativis,seringueir,floresta'],
    ['seguranca', 'Fronteira com Bolívia e Peru', 'A fronteira do Acre é rota do tráfico de drogas. Como o governo federal vai controlar essa fronteira?', 'fronteira,bolivia,peru,trafico']]],
  ['AL', 'Alagoas', 'de Alagoas', [
    ['moradia', 'Afundamento de bairros em Maceió', 'O afundamento do solo em bairros de Maceió, causado pela mineração, desalojou milhares de famílias. O que o governo federal deve fazer?', 'maceio,afundamento,mineracao,indeniza,familias'],
    ['fome', 'Pobreza no sertão alagoano', 'Alagoas tem alguns dos piores indicadores sociais do país. Como tirar o sertão alagoano da pobreza?', 'sertao,pobreza,renda']]],
  ['AP', 'Amapá', 'do Amapá', [
    ['ambiente', 'Petróleo na Margem Equatorial', 'Explorar petróleo na costa do Amapá, perto da foz do Amazonas, pode gerar riqueza, mas preocupa ambientalistas. Qual é a sua posição?', 'petroleo,margem equatorial,foz do amazonas,licenciamento,royalties'],
    ['infra', 'Energia e o apagão no Amapá', 'O Amapá já ficou dias sem energia elétrica. Como garantir energia confiável para a região Norte?', 'apagao,energia,eletric,linha de transmissao']]],
  ['AM', 'Amazonas', 'do Amazonas', [
    ['impostos', 'Futuro da Zona Franca de Manaus', 'A Zona Franca de Manaus depende de incentivos fiscais. Ela deve ser mantida, ampliada ou revista?', 'zona franca,manaus,incentivo,industria,polo industrial'],
    ['ambiente', 'Seca dos rios amazônicos', 'Secas históricas isolaram comunidades ribeirinhas no Amazonas. Como enfrentar a crise climática na Amazônia?', 'seca,=rio,=rios,estiagem,ribeirinh,navegacao']]],
  ['BA', 'Bahia', 'da Bahia', [
    ['seguranca', 'Violência e letalidade policial', 'A Bahia está entre os estados com mais mortes violentas, inclusive em ações policiais. Como reduzir a violência sem aumentar as mortes?', 'salvador,letalidade,policia,faccao,camera'],
    ['tecnologia', 'Energia eólica e solar no sertão', 'O sertão baiano virou polo de energia eólica e solar. Como garantir que essa riqueza fique com a população local?', 'eolica,solar,sertao,renovav,parque eolico,comunidade']]],
  ['CE', 'Ceará', 'do Ceará', [
    ['infra', 'Seca e acesso à água no semiárido', 'Milhares de famílias cearenses ainda dependem de carro-pipa. Como garantir água no semiárido?', 'seca,agua,transposicao,cisterna,semiarido,carro-pipa,acude'],
    ['seguranca', 'Facções criminosas em Fortaleza', 'Facções disputam territórios em Fortaleza e no interior do Ceará. Qual é o seu plano?', 'faccao,fortaleza,territorio,crime organizado']]],
  ['DF', 'Distrito Federal', 'do Distrito Federal', [
    ['previdencia', 'Servidores públicos e Previdência', 'Brasília concentra o funcionalismo federal. Qual é a sua proposta para os servidores e para a Previdência do setor público?', 'servidor,funcionalismo,concurso,brasilia,reforma administrativa,aposentadoria'],
    ['corrupcao', 'Transparência das emendas parlamentares', 'Bilhões em emendas parlamentares são distribuídos com pouca transparência. Como mudar isso?', 'emenda,orcamento secreto,congresso,transparencia,rastreab']]],
  ['ES', 'Espírito Santo', 'do Espírito Santo', [
    ['ambiente', 'Rio Doce e a reparação da tragédia', 'Anos depois do rompimento da barragem de Mariana, o Rio Doce ainda sofre. Como garantir a reparação às famílias capixabas?', 'rio doce,mariana,barragem,reparacao,lama,pescador'],
    ['infra', 'Portos e logística capixaba', 'O Espírito Santo depende de portos e ferrovias. Como modernizar a logística do estado?', 'porto,vitoria,ferrovia,logistica,exportacao']]],
  ['GO', 'Goiás', 'de Goiás', [
    ['agro', 'Agronegócio no Centro-Oeste', 'Goiás é um dos motores do agro. Como manter o crescimento sem destruir o Cerrado?', 'soja,milho,cerrado,exportacao,produtor'],
    ['ambiente', 'Água e nascentes do Cerrado', 'O Cerrado é a caixa d’água do Brasil e está sendo desmatado. Como proteger as nascentes?', 'cerrado,nascente,irrigacao,agua,desmatamento']]],
  ['MA', 'Maranhão', 'do Maranhão', [
    ['fome', 'Pobreza e baixo IDH', 'O Maranhão tem um dos menores IDHs do país. Como mudar essa realidade?', '=idh,pobreza,renda,saneamento'],
    ['tecnologia', 'Base de Alcântara e programa espacial', 'A Base de Alcântara pode colocar o Brasil no mercado espacial, mas há conflitos com comunidades quilombolas. Qual é o seu plano?', 'alcantara,espacial,foguete,quilombola,satelite']]],
  ['MT', 'Mato Grosso', 'de Mato Grosso', [
    ['infra', 'Escoamento da safra', 'Mato Grosso produz muito, mas a safra roda milhares de quilômetros em estradas ruins. Como resolver?', 'ferrovia,br-163,safra,escoamento,rodovia,ferrograo'],
    ['ambiente', 'Pantanal em chamas', 'Incêndios destruíram grandes áreas do Pantanal. Como evitar novas tragédias?', 'pantanal,queimada,incendio,brigad,fogo']]],
  ['MS', 'Mato Grosso do Sul', 'de Mato Grosso do Sul', [
    ['agro', 'Conflitos por terras indígenas', 'Mato Grosso do Sul vive conflitos entre produtores e povos indígenas. Como resolver a questão da demarcação?', 'indigena,demarcacao,marco temporal,guarani,terra,conflito'],
    ['seguranca', 'Fronteira com o Paraguai', 'A fronteira com o Paraguai é porta de entrada de drogas e armas. Qual é a sua estratégia?', 'fronteira,paraguai,contrabando,trafico,arma']]],
  ['MG', 'Minas Gerais', 'de Minas Gerais', [
    ['ambiente', 'Segurança das barragens de mineração', 'Depois de Mariana e Brumadinho, ainda existem barragens de risco em Minas. Como evitar outra tragédia?', 'barragem,brumadinho,mineracao,fiscaliza,rejeito'],
    ['economia', 'Dívida de Minas com a União', 'Minas Gerais deve bilhões à União. Como ajudar o estado sem prejudicar as contas federais?', 'divida,=minas,renegocia,recuperacao fiscal,juros']]],
  ['PA', 'Pará', 'do Pará', [
    ['ambiente', 'Garimpo ilegal e desmatamento', 'O garimpo ilegal contamina rios do Pará com mercúrio. Como combater esse crime?', 'garimpo,mercurio,desmatamento,ilegal,=rio,=rios'],
    ['infra', 'Saneamento e o legado da COP30', 'Belém recebeu a COP30, mas grande parte da cidade não tem esgoto tratado. Como deixar um legado real?', 'cop30,cop 30,belem,saneamento,esgoto,obras,legado']]],
  ['PB', 'Paraíba', 'da Paraíba', [
    ['infra', 'Transposição do Rio São Francisco', 'A transposição chegou à Paraíba, mas a água ainda não alcança todos. Como concluir e manter a obra?', 'transposicao,sao francisco,agua,canal,adutora'],
    ['educacao', 'Educação no interior', 'Escolas do interior paraibano sofrem com falta de estrutura e de professores. O que fazer?', 'interior,escola,professor,ensino']]],
  ['PR', 'Paraná', 'do Paraná', [
    ['agro', 'Cooperativas e agroindústria', 'O Paraná é referência em cooperativas agrícolas. Como fortalecer a agroindústria nacional?', 'cooperativa,agroindustria,exportacao,frango,suino'],
    ['infra', 'Pedágios nas rodovias', 'Os pedágios do Paraná sempre geraram polêmica. Como ter estradas boas com tarifas justas?', 'pedagio,rodovia,concessao,tarifa,estrada']]],
  ['PE', 'Pernambuco', 'de Pernambuco', [
    ['infra', 'Transnordestina e Porto de Suape', 'A ferrovia Transnordestina se arrasta há anos. Como destravar obras estratégicas para o Nordeste?', 'transnordestina,ferrovia,suape,porto,obra parada'],
    ['moradia', 'Alagamentos e moradia no Recife', 'O Recife sofre com alagamentos e moradias em áreas de risco. Qual é a sua proposta?', 'recife,palafita,alagamento,area de risco,encosta,periferia']]],
  ['PI', 'Piauí', 'do Piauí', [
    ['economia', 'Hidrogênio verde e novas energias', 'O Piauí atrai investimentos em energia renovável e hidrogênio verde. Como transformar isso em emprego?', 'hidrogenio verde,eolica,solar,investimento,emprego'],
    ['fome', 'Fome no semiárido piauiense', 'Muitas famílias do semiárido piauiense ainda passam fome. Como acabar com isso?', 'semiarido,fome,cisterna,alimento']]],
  ['RJ', 'Rio de Janeiro', 'do Rio de Janeiro', [
    ['seguranca', 'Milícias e crime organizado', 'Milícias e facções dominam territórios no Rio de Janeiro. Como o governo federal deve agir?', 'milicia,faccao,territorio,operacao,comunidade'],
    ['economia', 'Royalties do petróleo e crise fiscal', 'O Rio depende dos royalties do petróleo e vive crises fiscais. Como equilibrar as contas do estado?', 'royalties,petroleo,crise fiscal,servidor,pre-sal']]],
  ['RN', 'Rio Grande do Norte', 'do Rio Grande do Norte', [
    ['economia', 'Turismo e energia potiguar', 'O Rio Grande do Norte vive do turismo e lidera a energia eólica. Como gerar mais empregos no estado?', 'turismo,=natal,eolica,emprego,litoral'],
    ['seguranca', 'Ataques do crime organizado', 'O estado já sofreu ondas de ataques comandadas de dentro dos presídios. Como retomar o controle?', 'ataque,presidio,faccao,penitenciari']]],
  ['RS', 'Rio Grande do Sul', 'do Rio Grande do Sul', [
    ['infra', 'Reconstrução após as enchentes', 'As enchentes devastaram o Rio Grande do Sul. Como reconstruir e evitar que aconteça de novo?', 'enchente,reconstru,dique,prevencao,clima,porto alegre,defesa civil'],
    ['agro', 'Estiagens e seguro rural', 'Produtores gaúchos alternam secas e enchentes. Como proteger quem produz?', 'estiagem,seguro rural,safra,produtor,clima']]],
  ['RO', 'Rondônia', 'de Rondônia', [
    ['ambiente', 'Desmatamento ao longo da BR-364', 'O desmatamento avança em Rondônia. Como conciliar pecuária e preservação?', 'br-364,desmatamento,pecuaria,floresta'],
    ['infra', 'Hidrelétricas do Rio Madeira', 'As usinas do Rio Madeira geraram energia, mas também impactos. Qual modelo de energia você defende?', 'hidreletrica,energia,madeira,usina,impacto']]],
  ['RR', 'Roraima', 'de Roraima', [
    ['fome', 'Crise migratória venezuelana', 'Roraima recebe milhares de migrantes venezuelanos. Como acolher sem sobrecarregar o estado?', 'migrante,venezuela,refugiado,acolhida,fronteira,interioriza'],
    ['saude', 'Garimpo e saúde Yanomami', 'O garimpo ilegal provocou uma crise de saúde na Terra Yanomami. Como proteger esses povos?', 'yanomami,garimpo,indigena,saude indigena,malaria,desnutricao']]],
  ['SC', 'Santa Catarina', 'de Santa Catarina', [
    ['tecnologia', 'Polo de tecnologia e inovação', 'Santa Catarina tem um forte polo de tecnologia. Como espalhar esse modelo pelo Brasil?', 'florianopolis,startup,software,inovacao,tecnologia'],
    ['infra', 'Chuvas e deslizamentos', 'Santa Catarina sofre com chuvas extremas e deslizamentos. Como prevenir desastres?', 'chuva,deslizamento,defesa civil,prevencao,encosta']]],
  ['SP', 'São Paulo', 'de São Paulo', [
    ['saude', 'Cracolândia e dependência química', 'A Cracolândia desafia governos há décadas. Qual é a sua proposta para a dependência química?', 'cracolandia,dependencia,droga,tratamento,acolhimento,internacao'],
    ['infra', 'Mobilidade na metrópole', 'Os paulistanos perdem horas no trânsito. Como melhorar a mobilidade nas grandes cidades?', 'metro,transito,onibus,=trem,mobilidade']]],
  ['SE', 'Sergipe', 'de Sergipe', [
    ['economia', 'Petróleo e gás em águas profundas', 'Novas descobertas de gás em Sergipe podem mudar a economia do estado. Como aproveitar essa chance?', '=gas,petroleo,aguas profundas,emprego,royalties'],
    ['moradia', 'Saneamento básico', 'Grande parte de Sergipe não tem esgoto tratado. Como universalizar o saneamento?', 'saneamento,esgoto,agua,aracaju,universaliz']]],
  ['TO', 'Tocantins', 'do Tocantins', [
    ['agro', 'Matopiba e a fronteira agrícola', 'O Tocantins está no Matopiba, a nova fronteira agrícola. Como crescer sem destruir o Cerrado?', 'matopiba,soja,cerrado,fronteira agricola'],
    ['saude', 'Saúde no interior', 'Moradores do interior do Tocantins viajam centenas de quilômetros por um atendimento especializado. O que fazer?', 'interior,hospital,especialista,distancia,regionaliz']]],
  ['BR', 'Brasil', 'do Brasil', TEMAS_BR.map(t => [t.base, t.titulo, t.pergunta, t.kw])], // 100 temas nacionais (shared/temas-br.js)
];

/** Resumo curto de cada tema (contexto para o jogador formular resposta/pergunta). Chave = UF + índice. */
const RESUMO = {
  AC0: 'Queimadas e desmatamento avançam sobre a floresta. Pontos: fiscalização, combate ao fogo, renda do extrativismo (borracha, castanha) e bioeconomia.',
  AC1: 'A fronteira extensa e pouco vigiada facilita o tráfico. Pontos: Polícia Federal, Forças Armadas, tecnologia de vigilância e cooperação com Bolívia e Peru.',
  AL0: 'A extração de sal-gema fez bairros de Maceió afundarem e milhares de famílias saírem de casa. Pontos: indenizações justas, responsabilizar a empresa, fiscalizar a mineração.',
  AL1: 'O sertão tem baixa renda e pouco emprego. Pontos: transferência de renda, água, educação, crédito para pequenos produtores e geração de empregos.',
  AP0: 'Pode haver petróleo perto da foz do Amazonas. Lado a favor: royalties e empregos. Lado contra: risco de vazamento em área sensível. Pontos: licenciamento e transição energética.',
  AP1: 'Em 2020 um apagão deixou o Amapá cerca de 20 dias sem luz. Pontos: linhas de transmissão de reserva, fiscalizar concessionárias e investir em fontes locais.',
  AM0: 'A Zona Franca dá isenção de impostos para manter fábricas em Manaus. Prós: empregos e floresta em pé. Contras: custo fiscal. Pontos: manter, ampliar ou mudar o modelo.',
  AM1: 'Secas recordes baixaram os rios e isolaram comunidades. Pontos: ajuda emergencial, clima, combate ao desmatamento e alternativas de transporte.',
  BA0: 'A Bahia tem muitas mortes violentas, inclusive em ações policiais. Pontos: inteligência, câmeras corporais, combate às facções e prevenção social.',
  BA1: 'Parques eólicos e solares crescem no sertão. Pontos: arrendamento justo das terras, empregos locais, impostos que fiquem na região e impacto nas comunidades.',
  CE0: 'O semiárido sofre com secas e ainda depende de carro-pipa. Pontos: transposição, cisternas, adutoras, açudes e reuso de água.',
  CE1: 'Facções disputam bairros e cidades. Pontos: inteligência policial, controle dos presídios, retomar territórios e oferecer oportunidades aos jovens.',
  DF0: 'O DF concentra servidores federais. Pontos: reforma administrativa, concursos, aposentadorias do setor público e equilíbrio das contas.',
  DF1: 'Emendas parlamentares distribuem bilhões, muitas vezes sem saber quem pediu ou onde foi gasto. Pontos: rastreabilidade, critérios técnicos e fiscalização.',
  ES0: 'O rompimento da barragem de Mariana (2015) levou lama ao Rio Doce até o mar capixaba. Pontos: indenizações, recuperar o rio, pescadores e punir as empresas.',
  ES1: 'A economia capixaba depende de portos e ferrovias. Pontos: novas ferrovias, ampliar portos, concessões e integrar a logística.',
  GO0: 'O agro cresce no Cerrado, que já perdeu metade da vegetação. Pontos: produtividade sem desmatar, crédito verde, tecnologia e rastreabilidade.',
  GO1: 'O Cerrado abriga nascentes de grandes rios do país. Pontos: proteger nascentes, controlar a irrigação, recuperar áreas e combater o desmatamento.',
  MA0: 'O Maranhão tem um dos menores IDHs do país. Pontos: saneamento, educação, saúde, transferência de renda e empregos.',
  MA1: 'Alcântara é ótima para lançar foguetes, mas a base removeu quilombolas. Pontos: acordos internacionais, programa espacial e direitos das comunidades.',
  MT0: 'A safra viaja longas distâncias de caminhão por estradas ruins. Pontos: ferrovias (Ferrogrão), asfaltar a BR-163, hidrovias e reduzir o custo do frete.',
  MT1: 'Incêndios recordes destruíram parte do Pantanal. Pontos: brigadas, prevenção, fiscalizar fogo criminoso e enfrentar as secas.',
  MS0: 'Há disputa entre produtores e indígenas por terras, e o marco temporal é polêmico. Pontos: demarcação, segurança jurídica, indenizações e diálogo.',
  MS1: 'Drogas e armas entram pela fronteira seca com o Paraguai. Pontos: Polícia Federal, tecnologia de vigilância, cooperação internacional e combate ao contrabando.',
  MG0: 'Mariana (2015) e Brumadinho (2019) mataram centenas de pessoas. Pontos: fiscalizar barragens, eliminar as de risco, punir empresas e apoiar as vítimas.',
  MG1: 'Minas deve bilhões à União e paga juros altos. Pontos: renegociar a dívida, regime de recuperação fiscal, contrapartidas e o impacto nas contas federais.',
  PA0: 'O garimpo ilegal desmata e contamina rios com mercúrio, afetando indígenas e ribeirinhos. Pontos: fiscalização, rastrear o ouro e alternativas de renda.',
  PA1: 'Belém sediou a COP30, mas grande parte da cidade não tem esgoto tratado. Pontos: saneamento, legado das obras e cidades preparadas para o clima.',
  PB0: 'A transposição do São Francisco levou água à Paraíba, mas falta concluir ramais. Pontos: terminar as obras, manutenção, adutoras e distribuição.',
  PB1: 'Escolas do interior têm pouca estrutura e faltam professores. Pontos: valorizar o professor, tempo integral, internet nas escolas e transporte escolar.',
  PR0: 'As cooperativas do Paraná são referência no agro. Pontos: crédito, exportação, industrializar alimentos e apoiar o pequeno produtor.',
  PR1: 'Os pedágios ficaram anos caros e polêmicos. Pontos: novas concessões, tarifas justas, obras garantidas e fiscalização dos contratos.',
  PE0: 'A ferrovia Transnordestina tem obras atrasadas há anos. Pontos: retomar obras paradas, ligar ao Porto de Suape, gestão e financiamento.',
  PE1: 'O Recife tem alagamentos e muitas casas em encostas e áreas de risco. Pontos: drenagem, moradia popular, urbanizar favelas e defesa civil.',
  PI0: 'O Piauí atrai energia eólica, solar e projetos de hidrogênio verde. Pontos: qualificar mão de obra, empregos locais e indústria verde.',
  PI1: 'Ainda há famílias passando fome no semiárido. Pontos: Bolsa Família, cisternas, agricultura familiar, merenda e cozinhas solidárias.',
  RJ0: 'Milícias e facções controlam territórios no Rio. Pontos: inteligência, asfixia financeira do crime, integração das polícias e presença do Estado nas comunidades.',
  RJ1: 'O Rio depende dos royalties do petróleo e vive crises fiscais. Pontos: diversificar a economia, controlar gastos e renegociar a dívida.',
  RN0: 'O RN lidera a energia eólica e vive do turismo. Pontos: atrair investimentos, qualificação, infraestrutura turística e empregos.',
  RN1: 'Facções já ordenaram ataques a partir dos presídios. Pontos: controle das prisões, bloqueio de celulares, inteligência e integração das forças.',
  RS0: 'As enchentes de 2024 devastaram o RS. Pontos: reconstrução, diques e prevenção, alerta de desastres, adaptação ao clima e apoio às famílias.',
  RS1: 'Produtores gaúchos alternam secas e enchentes. Pontos: seguro rural, irrigação, crédito emergencial e adaptação ao clima.',
  RO0: 'O desmatamento avança junto à BR-364, ligado à pecuária. Pontos: fiscalização, produzir mais na mesma área, recuperar pastagens e rastrear o gado.',
  RO1: 'As usinas do Rio Madeira geram energia, mas trouxeram impactos ambientais e sociais. Pontos: matriz energética, compensações e fontes alternativas.',
  RR0: 'Roraima recebe muitos venezuelanos fugindo da crise. Pontos: acolhimento, levar migrantes a outros estados, apoio ao estado e acesso a emprego.',
  RR1: 'O garimpo ilegal causou fome e doenças na Terra Yanomami. Pontos: retirar garimpeiros, saúde indígena, combater a malária e fiscalização permanente.',
  SC0: 'SC tem um forte polo de tecnologia e startups. Pontos: educação em tecnologia, crédito à inovação, internet de qualidade e pesquisa.',
  SC1: 'Chuvas extremas causam enchentes e deslizamentos em SC. Pontos: mapear áreas de risco, alertas, obras de contenção e moradia segura.',
  SP0: 'A Cracolândia concentra dependentes químicos há décadas. Pontos: tratamento de saúde, acolhimento, combate ao tráfico e o debate sobre internação.',
  SP1: 'Os paulistanos perdem horas no trânsito. Pontos: metrô e trens, corredores de ônibus, tarifa e integrar a região metropolitana.',
  SE0: 'Descobertas de gás em águas profundas podem transformar Sergipe. Pontos: royalties, indústria local, empregos e transição energética.',
  SE1: 'Boa parte de Sergipe não tem esgoto tratado. Pontos: marco do saneamento, investimento público e privado e metas de universalização.',
  TO0: 'O Matopiba é a nova fronteira agrícola, avançando sobre o Cerrado. Pontos: crescer sem desmatar, regularizar terras e infraestrutura.',
  TO1: 'Moradores do interior viajam centenas de km até um especialista. Pontos: hospitais regionais, telemedicina, médicos no interior e transporte de pacientes.',
};

export function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

export const TEMAS = [];
UFS.forEach(([uf, estado, de, lista]) => lista.forEach(([base, titulo, pergunta, kw], k) => TEMAS.push({
  key: uf + k, uf, estado, de, base, titulo, pergunta, resumo: RESUMO[uf + k] || (uf === 'BR' ? TEMAS_BR[k].resumo : ''), kw: kw.split(',').map(s => s.trim()).concat('=' + norm(estado)),
})));
export const TEMA = Object.fromEntries(TEMAS.map(t => [t.key, t]));
const temaKw = key => TEMA_BASE[TEMA[key].base].concat(TEMA[key].kw);
const TODAS_KW = Object.values(TEMA_BASE).flat();

const LEX = {
  esq: ['desigualdade', 'justica social', '=sus', 'public', 'estatal', 'trabalhador', 'direitos', 'sindica', 'reforma agraria', 'bolsa familia', 'taxar', 'grandes fortunas', 'distribuicao de renda', 'inclus', 'minoria', 'cotas', 'salario minimo', 'soberania', 'banqueiro', 'super ricos', 'super-ricos', '=ricos', 'estado forte', 'programa social', 'politicas sociais', 'diversidade', '=lgbt', 'feminis', 'racismo', 'classe trabalhadora', 'reestatiz', 'estatiza'],
  dir: ['privatiz', 'livre mercado', 'livre iniciativa', 'empreendedor', 'reduzir impostos', 'menos impostos', 'cortar impostos', 'estado minimo', 'estado menor', 'propriedade', 'familia tradicional', '=deus', '=ordem', 'armas', 'porte de arma', 'legitima defesa', 'liberdade economica', 'desburocrat', 'responsabilidade fiscal', 'teto de gastos', 'agronegocio', 'meritocra', 'maioridade penal', 'concess', 'enxugar', 'cortar gastos', 'bandido', 'tolerancia zero', 'valores cristaos', 'patria', 'conservador', '=liberal'],
  cen: ['dialogo', 'equilibrio', 'consenso', 'gestao', 'eficiencia', 'pacto', 'moderacao', 'pragmat', 'entendimento', 'nem esquerda nem direita', '=uniao', 'concilia', 'planejamento', 'parceria', 'publico-privad'],
};
const PROPOSTA_KW = ['=vou', 'vamos', 'proponho', 'proposta', 'criar', 'criarei', 'investir', 'investirei', 'ampliar', 'reduzir', 'garantir', 'implementar', 'construir', '=meta', 'programa', 'plano', 'dobrar', 'zerar', 'contratar', 'primeiro ano', 'bilho', 'milho', 'por cento', 'ate o fim', '=mil'];
const APELO_KW = ['=povo', 'brasileir', 'famil', 'juntos', 'esperanca', 'futuro', '=voce', '=gente', 'dignidade', 'oportunidade', 'orgulho', '=pais', 'nacao', 'coracao', 'compromisso', '=mae', '=maes', 'filho', 'filha', 'crianca', 'jovens', 'trabalhador'];
const VICIOS = ['=ne', 'tipo assim', '=ahn', '=hum', '=eh', 'sei la', '=hmm'];
const ATAQUE_KW = ['mentir', 'mentiroso', 'fracass', 'corrupt', 'incompeten', 'vergonh', 'escandalo', 'hipocri', 'falso', 'farsa', 'enganar', 'irresponsav', 'desastre', 'roubo', '=ladrao', 'demagog', 'populis', 'extremis', 'covard', 'omiss'];
const MENCAO_GENERICA = ['adversari', 'oponente', '=candidato', '=candidata', 'o senhor', 'a senhora'];

/** Dica de fala do "?": divide os "Pontos:" do resumo entre os candidatos que receberam o mesmo tema (lado 0 = pares, lado 1 = ímpares). */
export const dicaLado = (res, lado = 0) => {
  const m = /^(.*?)\s*Pontos:\s*(.+?)\.?\s*$/.exec(res || ''); if (!m) return res || '';
  const ps = m[2].split(/,\s*(?![^(]*\))/), u = ps.pop(), k = u.lastIndexOf(' e '); ps.push(...(k > 0 && !/^\p{Lu}/u.test(u.slice(k + 3)) ? [u.slice(0, k), u.slice(k + 3)] : [u]));
  if (ps.length < 2) return res;
  const meus = ps.filter((_, i) => i % 2 === lado % 2), lst = meus.length > 1 ? meus.slice(0, -1).join(', ') + ' e ' + meus.at(-1) : meus[0];
  return `${m[1]} Foque em: ${lst}.`;
};
export const SEGUNDOS ={ cumprimento: 10, proposta: 60, pergunta: 30, resposta: 60, replica: 45, treplica: 45, final: 60 };
export const DUR_MULT = { curto: .5, normal: 1, longo: 1.5 };
export const KIND_NOME = { proposta: 'Apresentação de proposta', pergunta: 'Pergunta', resposta: 'Resposta', replica: 'Réplica', treplica: 'Tréplica', final: 'Considerações finais' };
export const ETAPAS = ['Propostas', 'Confronto', 'Considerações finais'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pick = a => a[Math.random() * a.length | 0];
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- equilíbrio do confronto direto ----------
/** Quantas perguntas os próximos (perguntadores) ainda conseguem distribuir para quem não recebeu (livres), sem ninguém perguntar a si mesmo. */
const casar = (pergs, livres) => {
  if (!pergs.length || !livres.length) return 0;
  const [a, ...resto] = pergs; let m = casar(resto, livres); // (a pode ficar sem alvo livre)
  for (const r of livres) if (r !== a) { m = Math.max(m, 1 + casar(resto, livres.filter(x => x !== r))); if (m === Math.min(pergs.length, livres.length)) break; }
  return m;
};
/** Adversários que `eu` pode escolher nesta rodada: só quem ainda não recebeu pergunta e cuja escolha
 *  não impede que todos os demais também recebam uma. ativos = candidatos em jogo; recebeu = ids que já receberam;
 *  depois = quem ainda vai perguntar depois de mim nesta rodada. */
export function alvosValidos(eu, ativos, recebeu, depois) {
  const cand = ativos.filter(id => id !== eu); if (!cand.length) return [];
  const livres = cand.filter(id => !recebeu.includes(id)), pergs = depois.filter(id => ativos.includes(id) && id !== eu);
  const livresTodos = ativos.filter(id => !recebeu.includes(id));
  const nota = t => (livres.includes(t) ? 1 : 0) + casar(pergs, livresTodos.filter(x => x !== t));
  const notas = cand.map(nota), melhor = Math.max(...notas);
  return cand.filter((_, k) => notas[k] === melhor);
}
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const reCache = {};
function hits(t, list) {
  let n = 0;
  for (const term of list) {
    let re = reCache[term];
    if (!re) {
      const ex = term.startsWith('=');
      const w = (ex ? term.slice(1) : term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      re = reCache[term] = new RegExp('\\b' + w + (ex ? '\\b' : ''), 'g');
    }
    const m = t.match(re); if (m) n += m.length;
  }
  return n;
}

/** Analisa uma fala. cands: [{id, nome, sigla}] */
export function analisar(texto, passo, cands) {
  const t = norm(texto);
  const wc = (t.match(/[a-z0-9]+/g) || []).length;
  const extensao = Math.min(wc / Math.max(15, passo.segundos * 1.3), 1);
  const relevancia = passo.kind === 'final' || !passo.tema ?Math.min(hits(t, TODAS_KW) / 5, 1) : Math.min(hits(t, temaKw(passo.tema)) / 3, 1);
  const propHits = hits(t, PROPOSTA_KW) + (t.match(/\d+/g) || []).length * .5 + (t.split('%').length - 1) * .5;
  const concretude = Math.min(propHits / 4, 1);
  const apelo = Math.min(hits(t, APELO_KW) / 3, 1);
  const vicios = hits(t, VICIOS);
  const L = hits(t, LEX.esq), R = hits(t, LEX.dir), C = hits(t, LEX.cen);
  const forca = L + R + C;
  const lean = forca ? clamp((R - L) / forca * 2, -2, 2) : null;
  const outros = cands.filter(c => c.id !== passo.falante);
  const mencionados = outros.filter(c => norm(c.nome).split(/\s+/).filter(p => p.length >= 3).some(p => hits(t, ['=' + p]) > 0) || hits(t, ['=' + norm(c.sigla)]) > 0).map(c => c.id);
  if (passo.alvo && hits(t, MENCAO_GENERICA) > 0 && !mencionados.includes(passo.alvo)) mencionados.push(passo.alvo);
  const ataque = Math.min(hits(t, ATAQUE_KW), 3);
  const W = { proposta: [.25, .30, .30, .15], pergunta: [.30, .40, .10, .20], resposta: [.25, .45, .20, .10],
    replica: [.30, .30, .20, .20], treplica: [.30, .30, .20, .20], final: [.25, .10, .30, .35] }[passo.kind];
  let nota = 10 * (W[0] * extensao + W[1] * relevancia + W[2] * concretude + W[3] * apelo) - Math.min(vicios * .3, 2);
  const fugiu = passo.kind === 'resposta' && wc >= 5 && relevancia < .34;
  if (fugiu) nota -= 1.5;
  if (wc < 5) nota = Math.min(nota, 1);
  nota = clamp(nota, 0, 10);
  return { nota, wc, extensao, relevancia, concretude, apelo, vicios, lean, forca, ataque, mencionados, fugiu, danoEm: [], rebateu: false };
}

/** b2 = confrontos diretos do bloco 2, guardados à parte (n = nº de confrontos). Na apuração o bloco 2 vale
 *  sempre o mesmo para todos: a média das falas com peso fixo, e ideologia/dano/fugas divididos por n —
 *  quem debateu 2× não ganha (nem perde) por ter falado mais que quem debateu 1×. */
export const novoStats = () => ({ somaNotas: 0, somaPesos: 0, nFalas: 0, leanSum: 0, leanW: 0, ataques: 0, dano: 0, fugas: 0, melhor: null, agressao: 0, simpatia: 0, solid: 0,
  b2: { n: 0, s: 0, p: 0, ls: 0, lw: 0, fug: 0, dano: 0 } });
const B2_PESO = 2; // bloco 2 inteiro pesa como 1 confronto (2 falas de cada lado)
const nB2 = st => Math.max(1, st.b2?.n || 0);
/** Confronto registrado no bloco 2 (chamado ao escolher o adversário, para os dois). */
export const contarConfronto = st => { if (st.b2) st.b2.n++; };
export const danoEf = st => Math.min(3, st.dano + (st.b2?.dano || 0) / nB2(st));
export const fugasEf = st => st.fugas - (st.b2?.fug || 0) + (st.b2?.fug || 0) / nB2(st);
/** Ação da loja (cadeirada, tomate, flores…) contra outro candidato: it.agr pesa contra o agressor (sobretudo entre moderados)
 *  e rende um pequeno voto de solidariedade à vítima; it.simp (flores) é simpatia. Pesos ficam no item (shared/loja.js). */
export function registrarAcao(stAgr, stAlvo, it) {
  if (it.agr) { stAgr.agressao = Math.min(2, (stAgr.agressao || 0) + it.agr); if (stAlvo) stAlvo.solid = Math.min(.5, (stAlvo.solid || 0) + it.agr * .25); }
  if (it.simp) stAgr.simpatia = Math.min(.6, (stAgr.simpatia || 0) + it.simp);
}

/** Aplica o resultado de uma fala às estatísticas. porId: id -> {st, ideo} */
export function aplicar(passo, texto, r, porId) {
  const c = porId[passo.falante]; const st = c.st;
  const b2 = passo.etapa === 2 && !passo.t2 && st.b2 ? st.b2 : null; // confronto direto do bloco 2: vai para o acumulador à parte
  const peso = passo.t2 ? 2.5 : passo.etapa === 3 ? 1.4 : 1; // 2º turno pesa mais: o 2º colocado pode virar no duelo
  if (b2) { b2.s += r.nota; b2.p++; } else { st.somaNotas += r.nota * peso; st.somaPesos += peso; }
  st.nFalas++;
  if (r.lean !== null) { if (b2) { b2.ls += r.lean * r.forca; b2.lw += r.forca; } else { st.leanSum += r.lean * r.forca; st.leanW += r.forca; } }
  if (r.fugiu) { st.fugas++; if (b2) b2.fug++; }
  if (r.ataque > 0) {
    st.ataques += r.ataque;
    for (const id of r.mencionados) { const a = porId[id]; if (!a) continue; const ab = b2 && a.st.b2; if (ab) ab.dano = Math.min(3, ab.dano + r.ataque * .3); else a.st.dano = Math.min(3, a.st.dano + r.ataque * .3); r.danoEm.push(id); }
  }
  if ((passo.kind === 'resposta' || passo.kind === 'treplica') && r.nota >= 6.5 && danoEf(st) > 0) {
    if (b2 && b2.dano > 0) b2.dano = Math.max(0, b2.dano - .5 * nB2(st)); else st.dano = Math.max(0, st.dano - .5);
    r.rebateu = true;
  }
  if (texto && (!st.melhor || r.nota > st.melhor.nota)) st.melhor = { nota: r.nota, texto, kind: passo.kind, tema: passo.tema };
}

export const perf = st => {
  const b = st.b2, tem = b?.p > 0;
  const s = st.somaNotas + (tem ? B2_PESO * b.s / b.p : 0), p = st.somaPesos + (tem ? B2_PESO : 0);
  return p ? s / p : 5;
};
export const ideoDe = c => c.ideo || PARTIDO[c.partido]?.ideo || 'centro';
export function percebida(c) {
  const d = IDEO[ideoDe(c)].pos; const st = c.st, k = nB2(st);
  const ls = st.leanSum + (st.b2?.ls || 0) / k, lw = st.leanW + (st.b2?.lw || 0) / k;
  if (!lw) return d;
  return clamp(d + (ls / lw - d) * Math.min(lw / 8, .6), -2, 2);
}
export const rotuloPos = p => IDEO[IDEO_POR_POS[Math.round(p) || 0]].nome;

function utilidade(c, g) {
  const st = c.st;
  const d = Math.abs(g.pos - percebida(c));
  const agr = st.ataques / Math.max(1, st.nFalas);
  const tolerancia = [.15, .7, 1.3, .7, .15][g.pos + 2];
  const mobiliza = Math.abs(g.pos) === 2 ? agr * .25 : 0;
  const acoes = -.4 * (st.agressao || 0) * tolerancia + .25 * (st.simpatia || 0) + .3 * (st.solid || 0); // agressão física: centro rejeita, extremos pouco ligam
  return .6 * perf(st) - 1.5 * Math.pow(d, 1.25) - .7 * danoEf(st) - agr * tolerancia + mobiliza + acoes;
}

/** Brasil polarizado: o eleitorado é quase meio a meio. Mano a mano, a margem vem sobretudo do desempenho
 *  no debate (nota, dano, fugas) — empate técnico quando estão parecidos, 10–20 pts para quem foi bem melhor
 *  e lavada (70/30+) só quando um foi muito ruim. Esquerda × direita aperta ainda mais. Com 3+ candidatos,
 *  suaviza a dispersão (o 1º turno costuma ter dois polos fortes). */
const forcaCand = c => perf(c.st) - .6 * danoEf(c.st) - .2 * fugasEf(c.st) - .45 * (c.st.agressao || 0) + .3 * (c.st.simpatia || 0) + .3 * (c.st.solid || 0);
function equilibrar(lista, brutos) {
  if (lista.length < 2) return brutos;
  if (lista.length > 2) { const v = brutos.map(p => Math.pow(Math.max(p, .1), .8)), s = v.reduce((a, b) => a + b, 0); return v.map(x => x / s * 100); }
  const [a, b] = lista, pa = percebida(a), pb = percebida(b);
  const polar = pa * pb < 0 ? 1 : (Math.abs(pa) < .5 || Math.abs(pb) < .5) ? 1.15 : 1.3; // esq×dir é o mais apertado
  const d = forcaCand(a) - forcaCand(b), ad = Math.abs(d);
  let m = Math.sign(d) * (7 * Math.min(ad, 3.5) + 22 * Math.max(0, ad - 3.5)) * polar; // ~7 pts por ponto de nota; acima de 3,5 dispara
  m += (brutos[0] - brutos[1]) * .08 + gauss() * 3.2; // um pouco da afinidade ideológica + imprevisto
  m = clamp(m, -84, 84);
  return [50 + m / 2, 50 - m / 2];
}

/** Simula a votação. lista: [{id, ideo, st}] */
export function apurar(lista, ruido, segundo, abstBase) {
  const abst = Math.min(.35, abstBase + (segundo ? .015 : 0));
  const comparec = ELEITORADO * (1 - abst);
  const votos = new Map(lista.map(c => [c.id, 0])); let brancos = 0, nulos = 0; const seg = [];
  for (const g of SEGMENTOS) {
    const tot = comparec * g.peso;
    const us = lista.map(c => utilidade(c, g) + gauss() * ruido);
    const best = Math.max(...us);
    const bn = clamp(.03 + .045 * Math.max(0, 3.5 - best) + (segundo ? .02 : 0), .02, .45);
    const ex = us.map(u => Math.exp(u - best)); const sum = ex.reduce((a, b) => a + b, 0);
    lista.forEach((c, k) => votos.set(c.id, votos.get(c.id) + tot * (1 - bn) * ex[k] / sum));
    brancos += tot * bn * .4; nulos += tot * bn * .6;
    seg.push({ id: g.id, peso: g.peso, shares: lista.map((c, k) => ({ id: c.id, p: ex[k] / sum })).sort((a, b) => b.p - a.p) });
  }
  const validos = [...votos.values()].reduce((a, b) => a + b, 0);
  const pcts = equilibrar(lista, lista.map(c => votos.get(c.id) / validos * 100));
  const res = lista.map((c, k) => ({ id: c.id, votos: Math.round(validos * pcts[k] / 100), pct: pcts[k] })).sort((a, b) => b.pct - a.pct);
  return { res, brancos: Math.round(brancos), nulos: Math.round(nulos), abst: Math.round(ELEITORADO * abst), comparec: Math.round(comparec), validos: Math.round(validos), seg };
}

export function sortearTema(usados) {
  // metade das vezes um tema nacional (BR), senão um estado ainda não sorteado
  const ufsUsadas = new Set([...usados].map(k => TEMA[k].uf)); ufsUsadas.delete('BR');
  const nac = Math.random() < .5;
  let livres = TEMAS.filter(t => !usados.has(t.key) && (t.uf === 'BR') === nac && !ufsUsadas.has(t.uf));
  if (!livres.length) livres = TEMAS.filter(t => !usados.has(t.key) && !ufsUsadas.has(t.uf));
  if (!livres.length) livres = TEMAS.filter(t => !usados.has(t.key));
  if (!livres.length) livres = TEMAS;
  const t = pick(livres); usados.add(t.key); return t.key;
}

// Opções de avatar
export const AV = {
  peles: ['#f6d3b3', '#eab68c', '#d19a6a', '#a8714a', '#7a4b2c', '#4f2f1c'],
  cabelos: { curto: 'Curto', repartido: 'Repartido', topete: 'Topete', careca: 'Careca', calvo: 'Calvo lateral', longo: 'Longo', chanel: 'Chanel', coque: 'Coque', cacheado: 'Cacheado', afro: 'Black power' },
  coresCabelo: ['#151515', '#3b2416', '#6a4423', '#a0522d', '#d9b26f', '#8a8a8a', '#e8e8e8'],
  barbas: { nenhuma: 'Nenhuma', bigode: 'Bigode', cavanhaque: 'Cavanhaque', cheia: 'Barba cheia', rala: 'Barba rala' },
  oculos: { nenhum: 'Nenhum', redondo: 'Redondo', quadrado: 'Quadrado', escuro: 'Escuro', aviador: 'Aviador dourado', pixel: 'Pixelado 😎', folha: 'Folha verde 🍃', coracao: 'Coração', estrela: 'Estrela' },
  chapeus: { nenhum: 'Nenhum', bone: 'Boné', chapeu: 'Chapéu de palha', boina: 'Boina', cartola: 'Cartola', coroa: 'Coroa', festa: 'Chapéu de festa', palhaco: 'Peruca de palhaço', padre: 'Chapéu de padre' },
  extras: { nenhum: 'Nenhum', faixa: 'Faixa presidencial', corrente: 'Corrente de ouro', charuto: 'Charuto', nariz: 'Nariz de palhaço' },
  generos: { masculino: 'Masculino', feminino: 'Feminino', nao_binario: 'Não binário' },
  roupas: { terno: 'Terno e gravata', terno_aberto: 'Terno sem gravata', blazer: 'Blazer', saia: 'Blazer e saia', social: 'Camisa social e gravata', colete: 'Colete', polo: 'Camisa polo', batina: 'Batina de padre', pastor: 'Terno com Bíblia' },
  coresRoupa: ['#1e2a4a', '#2b2f36', '#111111', '#6b7280', '#7f1d1d', '#a8a29e', '#14532d', '#f5f5f4', '#1d4ed8', '#7c2d12'],
  coresCamisa: ['#ffffff', '#93c5fd', '#f9a8d4', '#fde68a', '#86efac', '#c4b5fd', '#fca5a5', '#fdba74', '#9ca3af', '#2563eb', '#b91c1c', '#15803d', '#7f1d1d', '#111827'],
  coresGravata: ['#b91c1c', '#1d4ed8', '#15803d', '#ca8a04', '#6b21a8', '#111827', '#f97316', '#0f766e'],
};
const CABELOS_GEN = {
  masculino: ['curto', 'curto', 'repartido', 'topete', 'careca', 'calvo', 'cacheado', 'afro'],
  feminino: ['longo', 'longo', 'chanel', 'coque', 'cacheado', 'afro', 'curto'],
  nao_binario: Object.keys(AV.cabelos),
};
const ROUPAS_GEN = {
  masculino: ['terno', 'terno', 'terno_aberto', 'social', 'colete'],
  feminino: ['blazer', 'saia', 'terno_aberto', 'terno'],
  nao_binario: ['terno_aberto', 'blazer', 'terno', 'colete', 'social'],
};
export function avatarAleatorio(genero) {
  genero = AV.generos[genero] ? genero : (Math.random() < .46 ? 'masculino' : Math.random() < .85 ? 'feminino' : 'nao_binario');
  const m = genero === 'masculino', f = genero === 'feminino';
  return {
    genero, pele: pick(AV.peles), cabelo: pick(CABELOS_GEN[genero]), corCabelo: pick(AV.coresCabelo.slice(0, 6)),
    barba: m && Math.random() < .4 ? pick(['bigode', 'cavanhaque', 'cheia', 'rala']) : (!f && !m && Math.random() < .15 ? 'rala' : 'nenhuma'),
    oculos: Math.random() < .3 ? pick(['redondo', 'quadrado']) : 'nenhum', chapeu: 'nenhum',
    roupa: pick(ROUPAS_GEN[genero]),
    corRoupa: pick(AV.coresRoupa.slice(0, 7)), corCamisa: pick(AV.coresCamisa.slice(0, 4)), corGravata: pick(AV.coresGravata),
    brinco: (f && Math.random() < .55) || (!f && !m && Math.random() < .35), broche: Math.random() < .5,
    corpo: pick(['magro', 'medio', 'medio', 'largo']), expressao: pick(['simpatico', 'simpatico', 'serio', 'confiante']),
  };
}
/** Gênero do avatar (perfis antigos sem o campo são deduzidos pelo cabelo). */
export function generoDe(av) {
  if (av && AV.generos[av.genero]) return av.genero;
  return av && ['longo', 'chanel', 'coque'].includes(av.cabelo) ? 'feminino' : 'masculino';
}
/** Textos de vitória respeitando o gênero escolhido. */
export function textoVitoria(av) {
  const g = generoDe(av);
  return g === 'feminino' ? { faixa: 'Presidente eleita', tag: 'ELEITA' } : g === 'masculino' ? { faixa: 'Presidente eleito', tag: 'ELEITO' } : { faixa: 'Venceu a eleição', tag: 'VENCEU' };
}
export const AV_MEDIADORA = { genero: 'feminino', pele: '#c98e62', cabelo: 'chanel', corCabelo: '#2b1a10', barba: 'nenhuma', oculos: 'nenhum', chapeu: 'nenhum', roupa: 'blazer', corRoupa: '#7f1d1d', corCamisa: '#f5f5f4', corGravata: '#b91c1c', brinco: true, broche: false, corpo: 'medio', expressao: 'simpatico' };
export const AV_MEDIADOR = { genero: 'masculino', pele: '#e0a98a', cabelo: 'repartido', corCabelo: '#8a8a8a', barba: 'nenhuma', oculos: 'quadrado', chapeu: 'nenhum', roupa: 'terno', corRoupa: '#1f2937', corCamisa: '#ffffff', corGravata: '#1d4ed8', brinco: false, broche: false, corpo: 'medio', expressao: 'serio' };
const AV_J = (o) => ({ barba: 'nenhuma', oculos: 'nenhum', chapeu: 'nenhum', corCamisa: '#ffffff', brinco: false, broche: false, corpo: 'medio', expressao: 'simpatico', ...o });
export const AV_MAJU = AV_J({ genero: 'feminino', pele: '#5a3420', cabelo: 'cacheado', corCabelo: '#151515', roupa: 'blazer', corRoupa: '#0e7490', corGravata: '#0e7490', brinco: true });
export const AV_SANDRA = AV_J({ genero: 'feminino', pele: '#f6d3b3', cabelo: 'chanel', corCabelo: '#d9b26f', roupa: 'blazer', corRoupa: '#111111', corCamisa: '#fce7f3', corGravata: '#111827', brinco: true, expressao: 'confiante' });
export const AV_FATIMA = AV_J({ genero: 'feminino', pele: '#eab68c', cabelo: 'chanel', corCabelo: '#5a3a26', oculos: 'redondo', roupa: 'blazer', corRoupa: '#6b21a8', corCamisa: '#f5f5f4', corGravata: '#6b21a8', brinco: true, expressao: 'confiante' });
export const AV_GLORIA = AV_J({ genero: 'feminino', pele: '#55311d', cabelo: 'curto', corCabelo: '#151515', roupa: 'saia', corRoupa: '#065f46', corCamisa: '#fef3c7', corGravata: '#ca8a04', brinco: true, corpo: 'largo', expressao: 'confiante' });
export const AV_WILLIAM = AV_J({ genero: 'masculino', pele: '#f0c8a8', cabelo: 'curto', corCabelo: '#8a8a8a', chapeu: 'bone', roupa: 'terno', corRoupa: '#2b2f36', corGravata: '#1e3a8a', expressao: 'serio' });
export const AV_EVARISTO = AV_J({ genero: 'masculino', pele: '#eab68c', cabelo: 'curto', corCabelo: '#6a4423', roupa: 'terno', corRoupa: '#6b7280', corCamisa: '#dbeafe', corGravata: '#f97316', broche: 'coxinha' });
export const AV_RODRIGO = AV_J({ genero: 'masculino', pele: '#f6d3b3', cabelo: 'curto', corCabelo: '#3b2416', roupa: 'terno', corRoupa: '#1e2a4a', corGravata: '#0f766e', sobrancelha: 'grossa', sorriso: 'largo' });
export const AV_CELSO = AV_J({ genero: 'masculino', pele: '#e6b28e', cabelo: 'calvo', corCabelo: '#e8e8e8', roupa: 'terno', corRoupa: '#111111', corGravata: '#b91c1c', corpo: 'largo', expressao: 'serio', broche: 'fritas' });
/** Jornalistas que mediam o debate (um é sorteado a cada partida). */
export const JORNALISTAS = [
  { id: 'helena', nome: 'Poliana Cabrita', genero: 'feminino', voz: 'jornalistaF', avatar: AV_MEDIADORA },
  { id: 'ricardo', nome: 'Cezinha Tralha', genero: 'masculino', voz: 'jornalistaM', avatar: AV_MEDIADOR },
  { id: 'maju', nome: 'Caju Caldinho', genero: 'feminino', voz: 'jornalistaF', avatar: AV_MAJU },
  { id: 'sandra', nome: 'Sandra AnenBrega', genero: 'feminino', voz: 'jornalistaF', avatar: AV_SANDRA },
  { id: 'fatima', nome: 'Fátima Berinjela', genero: 'feminino', voz: 'jornalistaF', avatar: AV_FATIMA },
  { id: 'gloria', nome: 'Graucia Maria', genero: 'feminino', voz: 'jornalistaF', avatar: AV_GLORIA },
  { id: 'william', nome: 'William Boné', genero: 'masculino', voz: 'jornalistaM', avatar: AV_WILLIAM },
  { id: 'evaristo', nome: 'Evaristo Coxinha', genero: 'masculino', voz: 'jornalistaM', avatar: AV_EVARISTO },
  { id: 'rodrigo', nome: 'Rodrigo Bocadinho', genero: 'masculino', voz: 'jornalistaM', avatar: AV_RODRIGO },
  { id: 'celso', nome: 'Bouris Coolzoi', genero: 'masculino', voz: 'jornalistaM', avatar: AV_CELSO },
];
export const DIFICULDADES ={ facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
