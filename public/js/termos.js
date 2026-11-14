// Termos de Uso e Regras de Conduta — aceite único (por versão) guardado no navegador.
import { CADASTRO } from '/shared/cadastro.js';
import { REGRAS_DEBATE, PUNICAO } from '/shared/moderacao.js';

export const TERMOS_VERSAO = '1.2'; // 1.2: replays com voz das falas nota 10
const CHAVE = 'debate_termos';
export const CONTATO = 'contato@pantanalessence.com.br';
export const termosAceitos = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null')?.v === TERMOS_VERSAO; } catch { return false; } };
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ v: TERMOS_VERSAO, em: Date.now() })); } catch { /* sem armazenamento */ } };

const SECOES = [
  ['1. Sobre o jogo', `<p>O <b>Debate Presidencial Online</b> é um jogo de <b>entretenimento e ficção</b>. Partidos, candidatos, jornalistas, notícias, a rede social <b>Xzona</b>, pesquisas e resultados de votação são <b>inventados</b> e não representam pessoas, partidos, empresas ou eleições reais. Qualquer semelhança é coincidência.</p>
    <p>O jogo <b>não faz propaganda política</b>, não apoia nenhum candidato ou ideologia real e não deve ser usado para esse fim. As notas das falas são calculadas por regras automáticas do jogo e não são opinião da empresa criadora.</p>`],
  ['2. Quem pode jogar', `<ul><li>Idade mínima de <b>${CADASTRO.idadeMin} anos</b>. Menores de 18 anos devem jogar com o conhecimento e a autorização dos pais ou responsáveis.</li>
    <li>Compras com dinheiro real só podem ser feitas por maiores de 18 anos ou com autorização expressa do responsável.</li>
    <li>Você deve informar dados verdadeiros no cadastro (como a idade).</li></ul>`],
  ['3. Regras de conduta (respeito acima de tudo)', `<p>Debater ideias é o objetivo — atacar pessoas, não. Ao jogar, você se compromete a <b>não</b>:</p>
    <ul><li>Xingar, ofender, humilhar ou ameaçar outros jogadores, a(o) jornalista ou qualquer pessoa real;</li>
    <li>Fazer discurso de ódio, racismo, machismo, homofobia, transfobia, xenofobia, intolerância religiosa ou qualquer discriminação (lembrando que racismo e injúria são <b>crimes</b> no Brasil);</li>
    <li>Falar ou escrever conteúdo sexual, violento, de apologia a crimes, drogas ou automutilação;</li>
    <li>Divulgar dados pessoais seus ou de outras pessoas (endereço, telefone, documentos, redes sociais);</li>
    <li>Espalhar notícias falsas sobre pessoas ou eleições reais, ou usar o jogo para campanha política real;</li>
    <li>Usar nome, @ ou fanpage ofensivos ou que se passem por outra pessoa;</li>
    <li>Fazer spam, flood, trapaça, usar bugs de propósito, robôs ou programas para tirar vantagem;</li>
    <li>Atrapalhar a partida de propósito.</li></ul>`],
  ['4. Regras do debate', `<p>Durante a partida valem as regras abaixo (também disponíveis no botão <b>⚖ Regras do debate</b>, no canto inferior esquerdo da tela):</p>
    <ul>${REGRAS_DEBATE.map(([t, c]) => `<li><b>${t}:</b> ${c}</li>`).join('')}</ul>`],
  ['5. Advertências, banimentos e suspensões', `<ul><li>As falas passam por <b>moderação automática</b> (a mediação controlada pelo jogo).</li>
    <li><b>Chamada de atenção</b> (sem punição): falta de educação leve contra outro candidato, como “cala a boca”.</li>
    <li><b>1 advertência</b>: xingamento ou palavrão pesado contra candidato; falta de educação contra a mediação. <b>2 advertências</b>: xingamento contra a mediação.</li>
    <li><b>${PUNICAO.advertencias} advertências na mesma partida = banido da sala</b>: o candidato sai do debate e da votação, não ganha moedas e <b>perde seguidores na Xzona</b>.</li>
    <li><b>Expulsão imediata</b> (conta como banimento): racismo, machismo, LGBTfobia, ameaça, violência ou apologia ao nazismo.</li>
    <li><b>${PUNICAO.bansSemana} banimentos de sala em 7 dias</b> = conta <b>suspensa por ${PUNICAO.diasSemana} dias</b>.</li>
    <li><b>${PUNICAO.suspMes} suspensões de ${PUNICAO.diasSemana} dias em 30 dias</b> = conta <b>suspensa por ${PUNICAO.diasMes} dias</b>.</li>
    <li><b>${PUNICAO.susp30Perm} suspensões de ${PUNICAO.diasMes} dias</b> = conta <b>banida permanentemente</b>, com perda de moedas e itens, sem direito a reembolso.</li></ul>`],
  ['6. Denúncias e outras punições', `<ul>
    <li>Jogadores podem ser <b>denunciados</b>. As denúncias (com as últimas falas do denunciado) são analisadas pela administração.</li>
    <li>Conforme a gravidade, a conta pode ser <b>suspensa temporariamente</b> ou <b>banida permanentemente</b>, com perda de moedas e itens, sem direito a reembolso.</li>    <li>Denúncias falsas ou abusivas também são punidas.</li></ul>`],
  ['7. Microfone, voz e conversa por voz', `<ul><li>O jogo pode pedir acesso ao <b>microfone</b>. Sua fala é convertida em texto pelo reconhecimento de voz do seu navegador e esse texto é enviado ao servidor para a partida.</li>
    <li>Na conversa por voz entre jogadores, o áudio vai direto entre os participantes. Não gravamos essa conversa.</li>
    <li><b>Suas falas com nota 9 ou mais podem ser gravadas (voz) e publicadas na sua Xzona</b>, como replay. Você pode desligar isso em Configurações (“Publicar replays das minhas falas nota 9 ou mais”). Os replays ficam guardados por até 90 dias (máx. 5 por conta; o mais antigo sai quando chega um novo). O que você favoritar (⭐) fica fixado no topo da sua página e não expira.</li>
    <li>Você pode jogar <b>digitando</b>, sem usar o microfone.</li>
    <li>Use fone de ouvido e não deixe o microfone captar outras pessoas sem a permissão delas.</li></ul>`],
  ['8. Inteligência artificial', `<p>Candidatos-robô, vozes, dicas da assessoria e outros conteúdos são gerados por <b>inteligência artificial</b> (inclusive serviços de terceiros, como o Google Gemini). Esse conteúdo pode conter erros ou frases estranhas e <b>não representa a opinião da empresa criadora</b>. Os textos das falas podem ser enviados a esses serviços para gerar respostas e vozes.</p>`],
  ['9. Moedas, loja e compras', `<ul><li>Moedas 🪙 e itens são <b>virtuais</b>, valem só dentro do jogo, <b>não têm valor em dinheiro</b>, não podem ser trocados por dinheiro nem vendidos ou transferidos fora do jogo.</li>
    <li>Compras com dinheiro real (ex.: PIX) são definitivas depois que as moedas forem entregues, salvo o que a lei garantir (Código de Defesa do Consumidor).</li>
    <li>Preços, itens, recompensas e regras de pontuação podem mudar a qualquer momento para manter o equilíbrio do jogo.</li></ul>`],
  ['10. Seus dados (LGPD)', `<ul><li>Guardamos apenas o necessário para o jogo: nome do candidato, @, idade, moedas, itens, histórico de partidas, posts da Xzona, ranking e denúncias.</li>
    <li>Sua conta fica ligada a este navegador/aparelho. Se apagar os dados do navegador, você pode perder o acesso.</li>
    <li>Seu nome, @, fanpage, falas e pontuação podem aparecer para outros jogadores, no telão, na Xzona e nos rankings.</li>
    <li>Não vendemos seus dados. Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail <b>${CONTATO}</b>.</li></ul>`],
  ['11. Responsabilidades', `<ul><li>Você é o único responsável pelo que fala, escreve e faz no jogo.</li>
    <li>O jogo é oferecido “como está”: pode ter falhas, ficar fora do ar, perder progresso ou mudar sem aviso.</li>
    <li>A empresa criadora não se responsabiliza por conteúdo enviado por jogadores, mas pode removê-lo e punir quem violar estes termos, e colaborar com autoridades quando a lei exigir.</li></ul>`],
  ['12. Alterações', `<p>Estes termos podem ser atualizados. Quando isso acontecer, você precisará aceitá-los de novo para continuar jogando. Versão ${TERMOS_VERSAO}.</p>`],
  ['13. Contato', `<p>Dúvidas, denúncias graves, problemas com compras ou pedidos sobre seus dados: <a href="mailto:${CONTATO}" style="color:#ffd84a">${CONTATO}</a>.</p>`],
];

export function htmlTermos() { return SECOES.map(([t, c]) => `<h3>${t}</h3>${c}`).join(''); }

// mostra os termos por cima de tudo; com aoAceitar => modo aceite (checkbox obrigatório), sem => só leitura
export function mostrarTermos(aoAceitar) {
  const el = document.createElement('div'); el.className = 'termos-fundo';
  el.innerHTML = `<div class="painel termos"><h2>📜 Termos de Uso e Regras</h2>
    <p class="mut" style="margin-top:-6px">${aoAceitar ? 'Antes de jogar, leia e aceite. Você só precisa fazer isso uma vez.' : 'Versão ' + TERMOS_VERSAO}</p>
    <div class="termos-txt">${htmlTermos()}</div>
    ${aoAceitar ? `<label class="termos-ck"><input type="checkbox" id="tm-ck" disabled> <span>Li e aceito os Termos de Uso, as Regras do Debate e as punições por descumpri-las (advertências, banimento da sala, suspensão e banimento permanente da conta). Sou maior de 18 anos ou tenho autorização do meu responsável.</span></label>
    <p class="mut" id="tm-dica" style="font-size:13px;margin:4px 0 0">Role até o fim para liberar o aceite.</p>` : ''}
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px">${aoAceitar ? '<button class="btn amarelo" id="tm-ok" disabled>✔ Aceitar e jogar</button>' : '<button class="btn peq" id="tm-x">Fechar</button>'}</div></div>`;
  document.body.appendChild(el);
  const q = s => el.querySelector(s);
  if (!aoAceitar) { q('#tm-x').onclick = () => el.remove(); return; }
  const txt = q('.termos-txt'), ck = q('#tm-ck'), ok = q('#tm-ok');
  const fimRolagem = () => { if (txt.scrollTop + txt.clientHeight >= txt.scrollHeight - 30) { ck.disabled = false; q('#tm-dica').style.visibility = 'hidden'; } };
  txt.onscroll = fimRolagem; setTimeout(fimRolagem, 50);
  ck.onchange = () => { ok.disabled = !ck.checked; };
  ok.onclick = () => { gravar(); el.remove(); aoAceitar(); };
}
