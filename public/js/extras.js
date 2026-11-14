// Peças de interface: feed da Xzona, anotação da assessoria (papel), janelas (denúncia) e loja.
import { $, $$, esc, fmtN, toast } from './util.js';
import { ITENS, PACOTES_MOEDAS, GRATIS, possui, nivelOk } from '/shared/loja.js';
import { CARGOS, htmlBrasao, nivelMax } from '/shared/niveis.js';
import { abrirReplay } from './replay.js';

// ---------------- Xzona ----------------
const coresPerfil = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
export function postXzona(post) {
  let feed = $('#xzona');
  if (!feed) {
    feed = document.createElement('div'); feed.id = 'xzona'; feed.className = 'xzona p';
    feed.innerHTML = '<div class="xz-topo"><span class="xz-logo">Xzona</span><span class="xz-ao-vivo">● em alta agora</span><button class="xz-min" title="Minimizar">–</button></div><div class="xz-lista"></div>';
    $('#hud').appendChild(feed);
    feed.querySelector('.xz-min').onclick = () => feed.classList.toggle('min');
  }
  const cor = coresPerfil[[...post.user].reduce((a, c) => a + c.charCodeAt(0), 0) % coresPerfil.length];
  const el = document.createElement('div'); el.className = 'xz-post';
  el.innerHTML = `<div class="xz-av" style="background:${cor}">${esc(post.nome[0])}</div><div class="xz-corpo">
    <div class="xz-cab"><b>${esc(post.nome)}</b>${post.verificado ? '<span class="xz-verif">✔</span>' : ''} <span class="xz-user">@${esc(post.user)} · agora</span></div>
    <div class="xz-txt">${esc(post.texto).replace(/(#[\wÀ-ú]+)/g, '<span class="xz-tags">$1</span>')}</div>
    <div class="xz-acoes"><span>💬 ${fmtN(post.respostas)}</span><span>🔁 ${fmtN(post.reposts)}</span><span class="xz-like">♥ ${fmtN(post.curtidas)}</span></div></div>`;
  const lista = feed.querySelector('.xz-lista'), noTopo = lista.scrollTop < 20;
  lista.prepend(el); if (!noTopo) lista.scrollTop += el.offsetHeight; // não "pula" se o jogador estiver lendo posts antigos
  lista.onwheel = e => e.stopPropagation();
  while (lista.children.length > 40) lista.lastElementChild.remove();
  // curtidas sobem ao vivo por alguns segundos
  let n = post.curtidas; const like = el.querySelector('.xz-like');
  const iv = setInterval(() => { n += Math.round(Math.random() * 25); like.textContent = '♥ ' + fmtN(n); }, 700); setTimeout(() => clearInterval(iv), 8000);
}
export function limparXzona() { $('#xzona')?.remove(); }

// ---------------- fanpage do candidato na Xzona ----------------
const quando = t => { const d = (Date.now() - t) / 60000; return d < 60 ? Math.max(1, Math.round(d)) + ' min' : d < 1440 ? Math.round(d / 60) + ' h' : new Date(t).toLocaleDateString('pt-BR'); };
const fmtSeg = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
/** Miniatura do replay (estilo player de vídeo): quadro real da cena (/replays/id.jpg) ou, sem ele, cartão com o retrato; ▶ abre o player 3D.
 *  Todos veem e assistem; só o dono vê o ⭐ (favorito = fixado no topo, nunca expira). */
function htmlReplay(p, fp, img, dono) {
  if (!p.replay || !/^[a-f0-9]{16}$/.test(p.replay)) return '';
  return `<div class="rp-thumb rp-play" data-replay="${p.replay}" role="button" tabindex="0" title="Assistir o replay">
      <div class="rp-fb">${img ? `<img src="${img}" alt="">` : ''}<div><b>★ NOTA 10</b><span>${esc(fp.nome)}</span></div></div>
      ${p.thumb === false ? '' : `<img class="rp-img" src="/replays/${p.replay}.jpg" alt="" loading="lazy">`}
      <span class="rp-go">▶</span>${p.dur ? `<span class="rp-dur">${fmtSeg(p.dur)}</span>` : ''}</div>
      ${dono ? `<button class="rp-fav${p.fav ? ' on' : ''}" data-fav="${p.replay}" title="${p.fav ? 'Tirar dos favoritos' : 'Fixa este replay no topo da sua Xzona e ele nunca expira (1 por vez)'}">${p.fav ? '⭐ Favorito · desafixar' : '☆ Favoritar (fixar no topo)'}</button>` : ''}`;
}
// miniatura que não carregou (replays antigos sem .jpg): sobra o cartão com o retrato
document.addEventListener('error', e => { if (e.target?.classList?.contains('rp-img')) e.target.remove(); }, true);
export function htmlFanpage(fp, { img = '', partido = '', dono = false } = {}) {
  if (!fp) return '<p class="mut">Este candidato ainda não criou uma fanpage na Xzona.</p>';
  const av = img ? `<img class="xz-av" src="${img}">` : `<div class="xz-av" style="background:#1d9bf0">${esc(fp.nome[0])}</div>`;
  return `<div class="fp">
    <div class="fp-capa"><span class="xz-logo">Xzona</span></div>
    <div class="fp-cab">${av.replace('xz-av', 'xz-av fp-foto')}
      <div><b class="fp-nome">${htmlBrasao(fp.nivel, 30)}${esc(fp.nome)}</b><span class="xz-verif">✔</span><div class="xz-user">@${esc(fp.user)}${partido ? ' · ' + esc(partido) : ''}${fp.nivel ? ' · ' + CARGOS[fp.nivel - 1].nome : ''}</div></div></div>
    ${fp.bio ? `<p class="fp-bio">${esc(fp.bio)}</p>` : ''}
    ${fp.titulos?.mensal?.length || fp.titulos?.semanal?.length ? `<div class="fp-titulos">${fp.titulos.mensal?.length ? `<span class="fp-titulo ouro">🏆 Melhor candidato do mês${fp.titulos.mensal.length > 1 ? ` ×${fp.titulos.mensal.length}` : ''}</span>` : ''}${fp.titulos.semanal?.length ? `<span class="fp-titulo">🥇 Melhor candidato da semana${fp.titulos.semanal.length > 1 ? ` ×${fp.titulos.semanal.length}` : ''}</span>` : ''}</div>` : ''}
    <div class="fp-stats"><span><b>${fmtN(fp.seguidores)}</b> seguidores</span><span><b>${fp.partidas}</b> debates</span><span><b>${fp.vitorias}</b> vitórias</span></div>
    <div class="fp-posts">${fp.posts.length ? [...fp.posts].sort((a, b) => !!b.fav - !!a.fav).map(p => `<div class="xz-post${p.fav ? ' fixado' : ''}">${av}<div class="xz-corpo">
      ${p.fav ? '<div class="xz-fixado">📌 Fixado</div>' : ''}<div class="xz-cab">${htmlBrasao(fp.nivel, 18)}<b>${esc(fp.nome)}</b><span class="xz-verif">✔</span> <span class="xz-user">@${esc(fp.user)} · ${quando(p.t)}</span></div>
      ${p.titulo ? `<div class="xz-titulo">${esc(p.titulo)}</div>` : ''}<div class="xz-txt">“${esc(p.texto)}”${p.tema ? ` <span class="xz-tags">#${esc(p.tema.replace(/\s+/g, ''))}</span>` : ''} <span class="xz-tags">#DebateNaXzona</span></div>
      ${htmlReplay(p, fp, img, dono)}
      <div class="xz-acoes"><span>💬 ${fmtN(p.respostas)}</span><span>🔁 ${fmtN(p.reposts)}</span><span class="xz-like">♥ ${fmtN(p.curtidas)}</span><span class="${p.delta < 0 ? 'fp-neg' : 'fp-pos'}">${p.delta < 0 ? '' : '+'}${fmtN(p.delta)} seguidores</span></div></div></div>`).join('')
      : '<p class="mut" style="padding:14px">Nenhum post ainda. Sua melhor fala de cada debate será publicada aqui automaticamente.</p>'}</div></div>`;
}
// ▶ do replay (fanpage em janela ou em tela): delegação, abre o player 3D (replay.js)
const tocarReplay = e => { const b = e.target.closest?.('.rp-play'); if (b) { e.stopPropagation(); e.preventDefault(); abrirReplay(b.dataset.replay, janela); } };
document.addEventListener('click', tocarReplay); document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList?.contains('rp-play')) tocarReplay(e); });
export function janelaFanpage(fp, op) { janela(`${htmlFanpage(fp, op)}<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn peq" id="fx">Fechar</button></div>`, (el, fechar) => { $('#fx', el).onclick = fechar; }); }

// ---------------- anotação da assessoria (papel) ----------------
const RASCUNHOS = ['pesquisa sobe 2 pts?', 'NÃO falar do vice', 'ligar p/ marqueteiro', 'saúde → emprego', 'olhar p/ câmera!!', 'tempo: 1 min', 'citar dados do IBGE', 'evitar ataque pessoal', 'frase de efeito final', 'reunião 8h', 'checar números', 'segurança = prioridade', 'sorrir', 'respirar', 'educação??', 'rebater o adversário', 'promessa ok', 'agradecer eleitores'];
const rabiscos = () => {
  const r = (a, b) => a + Math.random() * (b - a), linhas = [], frases = [...RASCUNHOS].sort(() => Math.random() - .5);
  let y = 70;
  while (y < 470) {
    const t = frases.pop(), x = r(30, 120), risc = Math.random() < .25;
    linhas.push(`<text x="${x}" y="${y}" transform="rotate(${r(-3, 3).toFixed(1)} ${x} ${y})">${t}</text>${risc ? `<path d="M${x - 4} ${y - 7} q${t.length * 6} ${r(-4, 4)} ${t.length * 12 + 8} 0" class="r"/>` : ''}`);
    y += r(38, 70);
  }
  const cx = r(330, 430), cy = r(90, 420);
  return `<svg viewBox="0 0 520 560" preserveAspectRatio="none">${linhas.join('')}
    <ellipse cx="${cx}" cy="${cy}" rx="${r(35, 60)}" ry="${r(18, 28)}" class="r"/>
    <path d="M${r(300, 360)} ${r(440, 500)} c30 -20 60 10 90 -15 m-12 -8 l12 8 -10 10" class="r"/>
    <path d="M${r(40, 80)} 510 c20 -15 30 15 50 0 s30 15 50 0 s30 15 50 0" class="r"/></svg>`;
};
export function mostrarDica(dica, extra = '') {
  $('#papel-dica')?.remove(); $('#dica-icone')?.remove();
  const el = document.createElement('div'); el.id = 'papel-dica'; el.className = 'papel-cena p';
  el.innerHTML = `
    <div class="papel folha f3">${rabiscos()}</div><div class="papel folha f2">${rabiscos()}</div><div class="papel folha f1">${rabiscos()}</div>
    <div class="papel nota">
      <div class="clipe"></div><div class="mancha"></div>
      <div class="carimbo">CONFIDENCIAL</div>
      <div class="cab">Assessoria de campanha · anotação</div>
      <h3>${esc(dica.titulo)}</h3>
      <p class="mao">➜ ${esc(dica.abertura)}</p>
      <ul class="mao">${dica.pontos.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      ${dica.palavras?.length ? `<p class="mao destaque">Cite: ${dica.palavras.map(esc).join(' · ')}</p>` : ''}
      ${dica.cuidado ? `<p class="mao alerta">⚠ ${esc(dica.cuidado)}</p>` : ''}
      <div class="rodape">${esc(extra)}<button class="btn peq" id="papel-ok">Guardar anotação</button></div>
    </div>`;
  $('#hud').appendChild(el); el.dica = dica; lendo(true);
  $('#papel-ok').onclick = recolherDica;
}
let lendo = () => {};
/** Avisa a cena 3D quando a anotação abre/fecha (câmera desce até o papel do púlpito). */
export const aoLerDica = fn => { lendo = fn; };
/** Guarda a anotação aberta (vira o ícone 📝) e devolve a câmera. */
export function recolherDica() {
  const el = $('#papel-dica'); if (!el || el.classList.contains('sai')) return;
  el.classList.add('sai'); setTimeout(() => el.remove(), 500); mostrarIconeDica(el.dica); lendo(false);
}
function mostrarIconeDica(dica) {
  $('#dica-icone')?.remove();
  const b = document.createElement('button'); b.id = 'dica-icone'; b.className = 'redondo p dica-icone'; b.title = 'Ver anotação'; b.textContent = '📝';
  b.onclick = () => { b.remove(); mostrarDica(dica); }; $('#hud').appendChild(b);
}
export function esconderDica() { $('#papel-dica')?.remove(); $('#dica-icone')?.remove(); lendo(false); }

// ---------------- janela genérica ----------------
export function janela(html, aoMontar) {
  const fundo = document.createElement('div'); fundo.className = 'janela-fundo p';
  fundo.innerHTML = `<div class="painel janela">${html}</div>`;
  document.body.appendChild(fundo);
  const fechar = () => fundo.remove();
  fundo.addEventListener('click', e => { if (e.target === fundo) fechar(); });
  aoMontar?.(fundo, fechar);
  return fechar;
}
export function janelaDenuncia(jogadores, enviar) {
  const motivos = { ofensa: 'Ofensa / xingamento', discriminacao: 'Racismo / discriminação', ameaca: 'Ameaça / violência', trapaca: 'Trapaça', nome: 'Nome ou avatar impróprio', spam: 'Atrapalhando o debate', outro: 'Outro' };
  janela(`<h2>🚩 Denunciar jogador</h2><p class="mut" style="margin-top:-6px">A denúncia vai para os administradores com as últimas falas do jogador.</p>
    <label class="mut">Jogador</label><select id="den-alvo" class="campo" style="width:100%;margin:4px 0 12px">${jogadores.map(j => `<option value="${j.id}">${esc(j.nome)}</option>`).join('')}</select>
    <label class="mut">Motivo</label><div class="motivos">${Object.entries(motivos).map(([k, v], i) => `<label class="motivo"><input type="radio" name="den-m" value="${k}" ${i ? '' : 'checked'}> ${v}</label>`).join('')}</div>
    <textarea id="den-det" class="campo" style="width:100%;min-height:70px;margin-top:10px" maxlength="600" placeholder="Detalhes (opcional)"></textarea>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px"><button class="btn peq" id="den-x">Cancelar</button><button class="btn peq vermelho" id="den-ok">Enviar denúncia</button></div>`,
  (el, fechar) => {
    $('#den-x', el).onclick = fechar;
    $('#den-ok', el).onclick = () => { enviar({ alvo: $('#den-alvo', el).value, motivo: $('input[name=den-m]:checked', el).value, detalhe: $('#den-det', el).value }); fechar(); };
  });
}

// ---------------- loja ----------------
const TIPOS = { moedas: '🪙 Moedas', assessoria: '📝 Assessoria', danca: '💃 Danças', emote: '😀 Emotes', provocacao: '😈 Provocações', acao: '💥 Ações', acessorio: '👓 Acessórios', conjunto: '🎩 Conjuntos' };
export const reais = v => 'R$ ' + v.toFixed(2).replace('.', ',');
export function telaLoja(ui, { conta, info, aba, topo, comprarPacote, comprarItem, comprarMoedas, equipar, mudarAba, testar, avatar, vestir }) {
  const nv = nivelMax(conta), tem = id => possui(id, conta?.itens, nv);
  const usando = i => i.av && Object.entries(i.av).every(([c, v]) => avatar?.[c] === v);
  const acaoTem = i => i.tipo === 'danca' ? (conta?.danca === i.id ? '<span class="chip verde">Equipada</span>' : `<button class="btn peq verde" data-eq="${i.id}">Equipar</button>`)
    : i.av ? (usando(i) ? '<span class="chip verde">Usando</span>' : `<button class="btn peq verde" data-vestir="${i.id}">${i.tipo === 'conjunto' ? 'Vestir' : 'Usar'}</button>`) : '<span class="chip verde">✔ Seu</span>';
  const base = PACOTES_MOEDAS[0].reais / PACOTES_MOEDAS[0].moedas;
  const cards = aba === 'moedas'
    ? PACOTES_MOEDAS.map(p => { const tot = p.moedas + p.bonus, eco = Math.round((tot / p.reais * base - 1) * 100);
      return `<div class="loja-card ${p.destaque ? 'destaque' : ''}">
        ${p.destaque ? '<div class="selo-loja">MAIS VENDIDO</div>' : p === PACOTES_MOEDAS.at(-1) ? '<div class="selo-loja">MELHOR VALOR</div>' : ''}<div class="loja-ico">${p.emoji}</div>
        <h3>${esc(p.nome)}</h3><p style="font-size:1.3em;margin:4px 0"><b>🪙 ${fmtN(tot)}</b></p>
        <p class="mut">${p.bonus ? `${fmtN(p.moedas)} + <b style="color:#4ade80">${fmtN(p.bonus)} bônus</b>` : 'Para começar'}${eco > 0 ? ` · ${eco}% mais moedas por real` : ''}</p>
        <button class="btn amarelo peq" data-real="${p.id}">${reais(p.reais)}</button></div>`; }).join('')
    : aba === 'assessoria'
    ? (info?.pacotes || []).map(p => `<div class="loja-card ${p.destaque ? 'destaque' : ''}">
        ${p.destaque ? '<div class="selo-loja">MAIS VENDIDO</div>' : ''}<div class="loja-ico dicas">${'<span>📝</span>'.repeat(Math.min(3, p.dicas))}</div>
        <h3>${esc(p.nome)}</h3><p class="mut">${esc(p.descricao)}</p>
        <button class="btn amarelo peq" data-pac="${p.id}">🪙 ${fmtN(p.preco)}</button></div>`).join('')
    : ITENS.filter(i => i.tipo === aba).map(i => `<div class="loja-card ${conta?.danca === i.id || usando(i) ? 'equipado' : ''}">
        <div class="loja-ico">${i.emoji}</div><h3>${esc(i.nome)}</h3><p class="mut">${esc(i.descricao || i.frase || '')}</p>
        <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
          <button class="btn peq" data-testar="${i.id}" title="Ver o seu candidato ${i.av ? 'usando' : 'fazendo'}">▶ Ver</button>
          ${tem(i.id) ? acaoTem(i)
            : !nivelOk(i.id, nv) ? `<span class="chip" title="Liberado ao chegar a ${CARGOS[i.nivel - 1].nome}">🔒 Nível ${CARGOS[i.nivel - 1].nome}</span>`
            : `<button class="btn amarelo peq" data-item="${i.id}">🪙 ${fmtN(i.preco)}</button>`}</div></div>`).join('');
  ui.innerHTML = `<div class="tela vitrine">${topo}
    <div class="loja-saldo painel"><span>Seu saldo</span><b>🪙 ${fmtN(conta?.moedas || 0)}</b><span class="mut">· ${conta?.dicasExtra || 0} dica(s) extra no estoque · 1 dica grátis por debate</span></div>
    <div class="abas" style="justify-content:center">${Object.entries(TIPOS).map(([k, v]) => `<button class="aba ${aba === k ? 'on' : ''}" data-aba="${k}">${v}</button>`).join('')}</div>
    <div class="loja-grade">${cards}</div>
    ${aba === 'moedas' ? `<p class="mut" style="text-align:center">Pagamento via PIX · as moedas caem na hora após a confirmação.${info?.pixAtivo ? '' : ' <b>(pagamentos ainda não configurados neste servidor)</b>'} Itens da loja não dão vantagem no debate.</p>`
    : aba === 'assessoria' ? `<div class="painel loja-como"><h2>Como ganhar moedas</h2><table class="tabela">
      <tr><td>Participar de um debate</td><td>🪙 ${info?.economia?.participacao}</td></tr><tr><td>Desempenho (nota × ${info?.economia?.porPontoDeNota})</td><td>até 🪙 ${info?.economia?.porPontoDeNota * 10}</td></tr>
      <tr><td>Chegar ao 2º turno</td><td>🪙 ${info?.economia?.segundoTurno}</td></tr><tr><td>Ser eleito(a)</td><td>🪙 ${info?.economia?.eleito}</td></tr>
      <tr><td>Bônus de cargo (sobre participação + desempenho)</td><td>×1 (Candidato) até ×${String(CARGOS.at(-1).bonus).replace('.', ',')} (Presidente)</td></tr></table></div>` : aba === 'acessorio' || aba === 'conjunto' ? '<p class="mut" style="text-align:center">Depois de comprados, os itens também ficam liberados em Personalizar (Roupas e Acessórios). Conjuntos saem mais em conta que as peças separadas.</p>' : aba === 'acao' ? '<p class="mut" style="text-align:center">Use no botão 😀 durante o debate e escolha o adversário. Cada ação vale uma vez por debate, com 3 minutos de espera entre uma ação e outra. A Tomatada é grátis!</p>' : `<p class="mut" style="text-align:center">Danças tocam quando você vence. Emotes e provocações ficam no botão 😀 durante a partida (provocações tocam som a qualquer momento, com 3 min de espera).</p>`}
  </div>`;
  $$('[data-aba]', ui).forEach(b => b.onclick = () => mudarAba(b.dataset.aba));
  $$('[data-pac]', ui).forEach(b => b.onclick = () => comprarPacote(b.dataset.pac));
  $$('[data-real]', ui).forEach(b => b.onclick = () => comprarMoedas(b.dataset.real));
  $$('[data-item]', ui).forEach(b => b.onclick = () => comprarItem(b.dataset.item));
  $$('[data-eq]', ui).forEach(b => b.onclick = () => equipar(b.dataset.eq));
  $$('[data-vestir]', ui).forEach(b => b.onclick = () => vestir(b.dataset.vestir));
  $$('[data-testar]', ui).forEach(b => b.onclick = () => testar(b.dataset.testar));
}

export function avisoGanhos(g) {
  const el = document.createElement('div'); el.className = 'ganhos p';
  el.innerHTML = `<h3>🪙 +${fmtN(g.total)} moedas</h3>${g.itens.map(([t, v]) => `<div class="g-linha"><span>${esc(t)}</span><b>${v ? '+' + v : '0'}</b></div>`).join('')}
    ${g.xp ? `<h3 style="margin-top:10px">⭐ +${fmtN(g.xp.ganho)} XP</h3><div class="g-linha"><span>${htmlBrasao(g.xp.depois, 18)} ${esc(CARGOS[g.xp.depois - 1].nome)}</span><b>${fmtN(g.xp.xp)} XP</b></div>${g.xp.premio ? `<div class="g-linha"><span>🎖 Promoção a ${esc(CARGOS[g.xp.depois - 1].nome)}</span><b>+${fmtN(g.xp.premio)} 🪙</b></div>` : ''}` : ''}
    ${g.seguidores ? `<h3 style="margin-top:10px">📱 ${g.seguidores.delta < 0 ? '' : '+'}${fmtN(g.seguidores.delta)} seguidores na Xzona</h3><div class="g-linha"><span>Total na fanpage</span><b>${fmtN(g.seguidores.total)}</b></div>` : ''}`;
  document.body.appendChild(el); setTimeout(() => el.classList.add('sai'), 7000); setTimeout(() => el.remove(), 7600);
}
export { toast };
