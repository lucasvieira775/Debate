// Tutorial de primeira partida: "vídeo" renderizado no próprio motor 3D (estúdio, avatares, telão, plateia), com narração,
// legenda, tarjas, selos e cortes de câmera. Roteiro em shared/tutorial.js ({ id, cena, fala, legenda?, dica?, ms? });
// áudio em /audio/tutorial/<id>.wav (sem ele: voz do navegador + duração estimada). CSS em css/extras.css (.tut*).
// tocarTutorial(est, { avatar, nome, partido, cena, t, congela }) → Promise ({ pulou }) ao terminar ou pular.
import * as THREE from 'three';
import { TUTORIAL } from '/shared/tutorial.js';
import { avatarAleatorio } from '/shared/regras.js';
import { CARGOS, brasao } from '/shared/niveis.js';
import { falar, calar, sfx, audioBase, abafarAmbiente } from './voz.js';
import { esc } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const mix = (a, b, k) => a.clone().lerp(b, k);
const lerp = (a, b, k) => a + (b - a) * k;
const RESPIRO = .25;
const ZE = 't0', DONA = 't1', VOCE = 't2', RIVAL = 't3', BIA = 't4';
const estimar = b => b.ms ? b.ms / 1000 : Math.max(2.6, b.fala.split(/\s+/).length / 2.6 + .5);
const COR_SELO = [['✅', 'verde'], ['❌', 'vermelho'], ['🟡', 'amarelo'], ['⚠', 'amarelo'], ['🪑', 'vermelho']];

/** Duração real do áudio (metadata); falhou/demorou: null + duração estimada. */
const medir = b => new Promise(res => {
  if (b.id[0] === '_') return res({ audio: null, d: estimar(b) }); // cena de teste (?demo=tutorial&cena=estudio): sem áudio
  const a = new Audio(); a.preload = 'auto'; let ok = false;
  if (b.ms) { a.src = `/audio/tutorial/${b.id}.wav?v=${b.ms}`; return res({ audio: a, d: b.ms / 1000 }); } // roteiro já traz a duração: não espera o download
  const fim = d => { if (ok) return; ok = true; res({ audio: d ? a : null, d: d || estimar(b) }); };
  a.onloadedmetadata = () => fim(isFinite(a.duration) ? a.duration : 0); a.onerror = () => fim(0); setTimeout(() => fim(0), 3500);
  a.src = `/audio/tutorial/${b.id}.wav?v=${b.ms || 1}`;
});
/** Bip de censura (palavrão). */
function bip(dur = .55) {
  try { const { c, volume } = audioBase(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = 'sine'; o.frequency.value = 1000;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09 * volume, t + .01); g.gain.setValueAtTime(.09 * volume, t + dur - .03); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05); } catch { /* sem áudio */ }
}

let atual = null;
export function tocarTutorial(est, op = {}) {
  if (atual) return atual.p;
  let resolver; const S = atual = { est, op, i: -1, sujo: false, fim: false, tremor: 0, mudo: false, ledT: 0 };
  S.p = new Promise(r => { resolver = r; });
  const salvo = { modo: est.modo, fov: est.camera.fov, jog: est.jogadores, meuId: est.meuId, led: est.ledDados, falante: est.falante, onAcao: est.onAcao };
  const ocultos = ['#ui', '#hud', '#xzona'].map(s => document.querySelector(s)).filter(Boolean); ocultos.forEach(e => { e.style.visibility = 'hidden'; });

  // ---------- overlay de transmissão ----------
  const el = S.el = document.createElement('div'); el.className = 'tut carregando';
  el.innerHTML = `<div class="tut-borda"></div><div class="tut-fx"></div><div class="tut-balao"></div><div class="tut-selo"></div><div class="tut-dica"></div><div class="tut-leg"></div>
    <div class="tut-flash"></div><div class="tut-barra cima"></div><div class="tut-barra baixo"></div><div class="tut-fade"></div>
    <div class="tut-bug"><i></i>TUTORIAL<b>DEBATE PRESIDENCIAL</b></div><div class="tut-prog"><i></i></div>
    <button class="tut-pular" title="Pular (Esc)">Pular tutorial ⏭</button>`;
  document.body.appendChild(el);
  const $ = s => el.querySelector(s), fx = $('.tut-fx'), leg = $('.tut-leg'), bal = $('.tut-balao');
  const reanima = (e, cls = 'on') => { e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); };
  const som = f => { if (!S.mudo) try { f(); } catch { /* sem áudio */ } };
  const selo = txt => { const s = $('.tut-selo'); s.className = 'tut-selo ' + (COR_SELO.find(([e]) => txt.startsWith(e))?.[1] || 'azul'); s.textContent = txt; reanima(s); };
  const chip = (txt, cor, x, y, atraso = 0) => fx.insertAdjacentHTML('beforeend', `<div class="tut-chip ${cor}" style="left:${x}%;top:${y}%;animation-delay:${atraso}s">${txt}</div>`);
  const balao = (id, txt, cor = '') => { S.bal = id ? { id } : null; bal.className = 'tut-balao ' + cor; bal.textContent = txt || ''; if (id) reanima(bal); };
  const logo = (sub, so) => fx.insertAdjacentHTML('beforeend', `<div class="tut-logo${so ? ' so' : ''}">${so ? '' : '<div class="logo-txt"><span>DEBATE</span><b>PRESIDENCIAL</b><i>ONLINE</i></div>'}<p>${esc(sub)}</p></div>`);
  const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); terminar(true); } };
  addEventListener('keydown', tecla, true);
  $('.tut-pular').onclick = () => terminar(true);

  // ---------- elenco e palco ----------
  const pd = id => est.podios.get(id);
  const W = (id, x, y, z) => { const a = pd(id).ator; a.updateWorldMatrix(true, false); return a.localToWorld(V(x, y, z)); };
  const G = (id, x, y, z) => { const g = pd(id).grupo; g.updateWorldMatrix(true, false); return g.localToWorld(V(x, y, z)); };
  const nome = String(op.nome || 'Você').slice(0, 18);
  function montarElenco() {
    const meu = op.partido || 'MSD', livres = ['PUN', 'FPB', 'ALB', 'POP', 'MSD'].filter(x => x !== meu); // ninguém repete o seu partido
    S.elenco ||= [['Zé Promessa', 'masculino', 'simpatico'], ['Dona Verdade', 'feminino', 'confiante'], [nome, 'feminino'], ['Rui Barraco', 'masculino', 'bravo'], ['Bia Polêmica', 'feminino', 'confiante']]
      .map(([n, g, ex], i) => ({ id: 't' + i, nome: n, avatar: i === 2 && op.avatar ? op.avatar : { ...avatarAleatorio(g), ...(ex ? { expressao: ex } : {}) }, partido: i === 2 ? meu : livres[i - (i > 2)], slot: i, conectado: true, bot: true }));
    est.chaveJog = ''; est.setJogadores(S.elenco, null);
    for (const p of est.podios.values()) p.etiqueta.visible = false;
  }
  const palco = ({ duelo = null, falante = null } = {}) => {
    if (S.sujo) { S.sujo = false; montarElenco(); }
    est.acoes.limpar(); est.confetes(false); est.setCampeao(null); est.mediadoraFalando(false); est.mediadora.anim = null; est.festa(null);
    if (duelo) { est.setPulpito(true, true); if (duelo === 'indo') { est.setDuelo(null); est.aplicarDuelo(true); } est.setDuelo({ a: VOCE, b: RIVAL, fase: duelo }); }
    else { est.setDuelo(null); est.aplicarDuelo(true); est.setPulpito(false, true); }
    est.setFalante(falante);
    for (const p of est.podios.values()) { p.avatar.anim = null; p.avatar.root.visible = true; }
  };
  /** Balão de grito num rosto da plateia que está no quadro. */
  const gritoVisivel = txt => {
    const cam = est.camera, ok = est.pessoas.filter(p => { const v = V(p.x, p.y + 1.5, p.z).project(cam); return v.z < 1 && Math.abs(v.x) < .55 && v.y > -.25 && v.y < .5; });
    const orig = est.pessoas; if (ok.length) est.pessoas = ok; try { est.gritoPlateia(txt); } finally { est.pessoas = orig; }
  };
  const cam = (pos, alvo, fov = 50) => {
    const c = est.camera; if (Math.abs(c.fov - fov) > .01) { c.fov = fov; c.updateProjectionMatrix(); }
    const t = est.t, tr = S.tremor; // câmera "na mão": respiração leve + tremor de impacto
    c.position.copy(pos).add(V((Math.random() - .5) * tr, (Math.random() - .5) * tr, 0));
    c.lookAt(alvo.x + Math.sin(t * .7) * .012, alvo.y + Math.sin(t * .9) * .008, alvo.z);
  };
  const ledVivo = (c, f, ms = 80) => { const a = performance.now(); if (a - S.ledT < ms) return; S.ledT = a; est.setLED(f(c)); };
  const falaNivel = id => est.setFalaNivel(id, .35 + Math.random() * .65);

  // ===================== CENAS =====================
  // ini(c) monta o palco; ev = [[k (0..1 do bloco), fn]]; quadro(c) a cada frame; cam(c) enquadramento. c.u = s no bloco, c.k = 0..1.
  const CENAS = {
    abertura: {
      ini: () => { palco(); est.setLED({ modo: 'texto', cabecalho: 'AO VIVO · ELEIÇÕES 2026', texto: 'Quem fala melhor leva a faixa!' }); logo('COMO JOGAR'); },
      ev: [[0, () => { som(sfx.vinheta); est.festejarPlateia(4500, 1); }], [.3, () => som(() => sfx.aplausos(3, .25))], [.72, () => fx.querySelector('.tut-logo')?.classList.add('sai')]],
      cam: c => { const k = sm(c.k / .95); cam(mix(V(0, 8.5, 15.5), V(.4, 2.7, 7.4), k), mix(V(0, 1, -2), V(0, 2.3, -6), k), 52); },
    },
    estudio: {
      ini: () => { palco({ falante: VOCE }); est.setLED({ modo: 'titulo', sub: 'AO VIVO DO ESTÚDIO' }); },
      ev: [[0, () => est.agitarPlateia(.7, 3000)]],
      cam: c => { const a = lerp(-.9, .9, sm(c.k)); cam(V(Math.sin(a) * 10.2, 6.2, -1.5 + Math.cos(a) * 10.2), V(0, 1.0, -2.5), 50); },
    },
    pergunta: {
      ini: () => { palco({ falante: VOCE }); est.setLED({ modo: 'texto', cabecalho: 'PERGUNTA DA JORNALISTA', texto: 'Como você vai acabar com o trânsito nas grandes cidades?' });
        est.mediadoraFalando(true); est.telaPodio(VOCE, { titulo: 'SUA VEZ', texto: '01:00', destaque: true }); S.seg = 61; },
      ev: [[.5, () => { est.mediadoraFalando(false); som(sfx.vez); }]],
      quadro: c => { if (c.k < .5) return; const s = Math.max(0, 60 - Math.floor(c.u - c.d * .5)); if (s !== S.seg) { S.seg = s; est.telaPodio(VOCE, { titulo: 'TEMPO', texto: `0${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`, destaque: true }); if (s < 60) som(sfx.tique); } },
      cam: c => {
        if (c.k < .5) { const k = sm(c.k / .5); return cam(mix(V(-3.0, 1.6, 1.6), V(-2.4, 1.7, .7), k), V(-.2, 2.75, -5.5), 50); }
        const k = sm((c.k - .5) / .5); cam(G(VOCE, lerp(.95, .8, k), lerp(2.6, 2.35, k), lerp(-.9, -.65, k)), G(VOCE, -.05, 1.26, .12), 30);
      },
    },
    fala: {
      ini: () => { palco({ falante: VOCE }); S.txt = 'Vou investir 20 bilhões em metrô e criar 500 km de corredores de ônibus até 2030!'; },
      ev: [[.5, () => { chip('NOTA 9,4 📈', 'verde', 64, 30); som(sfx.nota); }], [.72, () => { est.agitarPlateia(.8, 2000); som(() => sfx.aplausos(1.8, .18)); }]],
      quadro: c => { falaNivel(VOCE); ledVivo(c, c => ({ modo: 'fala', nome, partido: S.elenco[2].partido, tempo: '00:' + String(Math.max(0, 42 - Math.floor(c.u))).padStart(2, '0'), texto: S.txt.slice(0, Math.ceil(S.txt.length * Math.min(1, c.k / .7))) || '…', rotulo: 'Pergunta · Mobilidade nas cidades' })); },
      cam: c => { const k = sm(c.k); cam(W(VOCE, lerp(1.1, .35, k), lerp(2.0, 1.9, k), lerp(4.6, 3.4, k)), W(VOCE, 0, 1.6, 0), 36); },
    },
    confronto: {
      ini: c => { palco({ duelo: 'indo' }); est.setLED({ modo: 'texto', cabecalho: 'CONFRONTO DIRETO', texto: `${nome.toUpperCase()}  ×  RUI BARRACO` }); S.chegou = false;
        if (c.u > 0) for (const p of est.podios.values()) if (p.caminho) p.caminho.t = c.u; },
      ev: [[0, () => som(sfx.sorteio)]],
      quadro: () => { if (!S.chegou && !pd(VOCE).caminho && !pd(RIVAL).caminho) { S.chegou = true; est.setDuelo({ a: VOCE, b: RIVAL, fase: 'no' }); est.setFalante(VOCE); est.agitarPlateia(.8, 2000); som(() => sfx.aplausos(1.5, .15)); } },
      cam: c => { const k = sm(c.k); cam(mix(V(-1.5, 6.8, -7.2), V(3.0, 2.3, -2.4), k), mix(V(0, .8, 2.2), V(0, 1.35, .6), k), 48); },
    },
    pode: {
      selo: true,
      ini: c => { palco({ duelo: 'no' }); const am = S.amarelo = /^🟡/.test(c.b.dica || ''); S.quem = am ? RIVAL : VOCE; est.setFalante(S.quem);
        const q = (c.b.fala.match(/["“]([^"”]+)["”]/) || [])[1] || ''; S.frase = q && q[0].toUpperCase() + q.slice(1) + (am ? '!' : ''); },
      ev: [[.04, () => S.frase && balao(S.quem, S.frase, S.amarelo ? 'amarelo' : '')], [.36, c => { selo(c.b.dica || '✅ PODE'); som(S.amarelo ? sfx.alerta : sfx.nota); }],
        [.5, () => { if (S.amarelo) { est.gritarPlateia(.7, 2000); gritoVisivel('Ihhh!'); som(sfx.vaia); } else { est.festejarPlateia(2500, .8); som(() => sfx.aplausos(2.4, .26)); gritoVisivel('Isso aí!'); } }]],
      quadro: c => { if (c.k < .62) falaNivel(S.quem); },
      cam: c => { const k = sm(c.k), ouve = S.quem === VOCE ? RIVAL : VOCE; cam(W(ouve, 1.3, 2.25, lerp(-2.5, -2.05, k)), W(S.quem, -.25, 1.7, 0), 36); },
    },
    nao_pode: {
      selo: true,
      ini: () => { palco({ duelo: 'no', falante: RIVAL }); },
      ev: [[0, () => { balao(RIVAL, '#@!%&*!!', 'vermelho'); som(() => bip(.5)); S.tremor = .05; }], [.3, c => { selo(c.b.dica || '❌ NÃO PODE'); som(sfx.fim); }],
        [.45, () => { est.gritarPlateia(1, 2500); gritoVisivel('Que feio!'); som(sfx.vaia); setTimeout(() => som(sfx.vaia), 350); }], [.56, () => chip('NOTA 1,2 📉', 'vermelho', 8, 34)]],
      quadro: c => { if (c.k < .42) falaNivel(RIVAL); },
      cam: c => { const z = sm(c.u / .35); cam(W(RIVAL, .2, 1.95, lerp(2.9, 2.1, z)), W(RIVAL, 0, 1.75, 0), lerp(46, 34, z)); },
    },
    advertencia: {
      ini: () => { palco({ falante: BIA }); est.mediadoraFalando(true); est.mediadora.animar('apontar', 3.5);
        est.setLED({ modo: 'texto', cabecalho: 'MEDIAÇÃO', texto: 'Preconceito ou ameaça: duas advertências!' }); est.telaPodio(BIA, { titulo: 'ADVERTÊNCIAS', texto: '0/3' });
        fx.insertAdjacentHTML('beforeend', '<div class="tut-cartoes"><h4>ADVERTÊNCIAS</h4><div><i>1</i><i>2</i><i class="r">3</i></div><b>BANIDA!</b></div>'); },
      ev: [[0, () => som(sfx.martelo)], [.12, () => { fx.querySelector('.tut-cartoes i:nth-child(1)').classList.add('on'); est.telaPodio(BIA, { titulo: 'ADVERTÊNCIAS', texto: '1/3', alerta: true }); som(sfx.alerta); }],
        [.26, () => { fx.querySelector('.tut-cartoes i:nth-child(2)').classList.add('on'); est.telaPodio(BIA, { titulo: 'ADVERTÊNCIAS', texto: '2/3', alerta: true }); som(sfx.alerta); }],
        [.6, () => { fx.querySelector('.tut-cartoes i:nth-child(3)').classList.add('on'); fx.querySelector('.tut-cartoes').classList.add('ban'); est.mediadoraFalando(false); est.telaPodio(BIA, { titulo: 'ADVERTÊNCIAS', texto: '3/3', alerta: true }); som(sfx.fim); }],
        [.7, () => { pd(BIA).avatar.root.visible = false; S.sujo = true; est.telaPodio(BIA, { titulo: 'BANIDA', texto: 'FORA', alerta: true }); S.tremor = .03; est.gritarPlateia(1, 2500); gritoVisivel('Tchau, querida!'); som(sfx.vaia); }]],
      cam: c => {
        if (c.k < .58) { const k = sm(c.k / .58); return cam(mix(V(2.1, 1.35, -.2), V(1.6, 1.45, -.8), k), V(-.3, 1.95, -3.45), 38); }
        const k = sm((c.k - .58) / .42); cam(W(BIA, lerp(.7, .25, k), 1.95, lerp(3.1, 2.4, k)), W(BIA, 0, 1.5, 0), 40);
      },
    },
    caldeirada: { // a "cadeirada" da loja (shared/loja.js, adv: 1) com a coreografia real de public/js/acoes/
      selo: true,
      ini: c => { palco(); S.sujo = true; S.bateu = false; S.cc = null; est.setLED({ modo: 'texto', cabecalho: 'AO VIVO', texto: 'O CLIMA ESQUENTOU NO DEBATE!' });
        est.acao({ n: 'tut' + Date.now(), id: RIVAL, alvo: VOCE, item: 'cadeirada' }); if (c.u > .05) est.acoes.adiantar(String(c.u)); },
      impacto: c => { if (S.bateu) return; S.bateu = true; S.tremor = .08; selo(c.b.dica || '🪑 +1 ADVERTÊNCIA'); est.gritarPlateia(1, 3000); gritoVisivel('Cadeirada não é proposta!');
        chip('⏱ +15 s', 'azul', 12, 30, .5); chip('❤ +SIMPATIA', 'rosa', 12, 42, .8); chip('📉 −VOTOS', 'vermelho', 66, 30, 1.1); },
      ev: [[.66, c => CENAS.caldeirada.impacto(c)]],
      cam: c => {
        const a = W(RIVAL, 0, 0, 0), v = W(VOCE, 0, 0, 0), m = a.clone().add(v).multiplyScalar(.5), dir = V(0, 0, -3.2).sub(m).setY(0).normalize().applyAxisAngle(V(0, 1, 0), lerp(.35, -.2, sm(c.k)));
        const pos = m.clone().addScaledVector(dir, 5.2 + a.distanceTo(v) * .4).setY(2.6), alvo = m.clone().setY(1.25);
        if (!S.cc) S.cc = { pos: pos.clone(), alvo: alvo.clone() }; const q = 1 - Math.exp(-c.dt * 3); S.cc.pos.lerp(pos, q); S.cc.alvo.lerp(alvo, q);
        cam(S.cc.pos, S.cc.alvo, 44);
      },
    },
    plateia: {
      ini: () => { palco(); est.setLED({ modo: 'titulo', sub: 'A PLATEIA DECIDE O CLIMA' }); },
      ev: [[0, () => { est.festejarPlateia(3000, 1); som(() => sfx.aplausos(2.6, .3)); }], [.08, () => gritoVisivel('Uhuuul!')],
        [.36, () => { est.gritarPlateia(1, 2500); gritoVisivel('Fora!'); som(sfx.vaia); setTimeout(() => som(sfx.vaia), 350); }],
        [.48, () => fx.insertAdjacentHTML('beforeend', `<div class="tut-xz"><div class="tut-xz-top"><b>Xzona</b><small>Em alta 🔥</small></div><p><b>@zeca_memes</b> Tô vendo o replay da cadeirada em câmera lenta pela 47ª vez 🔁🪑</p><div class="tut-xz-tags">#CadeiraVoadora #DebateOuRinge</div><div class="tut-xz-n">❤ 12,4 mil · 🔁 3,1 mil</div></div>`)],
        [.7, () => { est.agitarPlateia(1, 2500); gritoVisivel('Já ganhou!'); }]],
      cam: c => { const k = sm(c.k); cam(mix(V(-1.6, 2.3, 5.6), V(1.6, 2.5, 5.6), k), mix(V(-7, 2.0, 10.5), V(7, 2.4, 10.5), k), 50); },
    },
    votacao: {
      ini: () => { palco(); S.lista = [[2, 41.3], [3, 37.9], [1, 11.2], [0, 6.1], [4, 3.5]].map(([i, pct]) => [S.elenco[i].nome, S.elenco[i].partido, pct]); S.ledT = 0; },
      ev: [[0, c => som(() => sfx.rufar(Math.max(1.5, c.d * .62)))], [.66, () => { som(sfx.impacto); est.festejarPlateia(3000, 1); S.tremor = .03; }]],
      quadro: c => ledVivo(c, c => { const kk = sm(c.k / .62), fim = c.k >= .66;
        return { modo: 'resultado', titulo: 'APURAÇÃO · 1º TURNO', lista: S.lista.map(([n, p, pct], i) => ({ nome: n, partido: p, pct: Math.max(.1, pct * kk), eleito: fim && i < 2 ? '2º TURNO' : undefined })),
          rodape: fim ? 'NINGUÉM PASSOU DE 50%: VAI TER 2º TURNO!' : `URNAS APURADAS: ${Math.round(kk * 100)}%` }; }, 70),
      cam: c => { const k = sm(c.k); cam(mix(V(-.7, 3.0, 2.6), V(0, 3.6, .3), k), V(0, 4.0, -10.4), 46); },
    },
    comemoracao: {
      ini: () => { palco(); campeao('festa'); est.confetes(true); est.setLED({ modo: 'texto', cabecalho: 'RESULTADO FINAL', texto: `${nome.toUpperCase()}: PRESIDENTE ELEITO(A)!` }); },
      ev: [[0, () => { som(sfx.vitoria); som(() => sfx.aplausos(4, .32)); est.festejarPlateia(6000, 1); }], [.5, () => { if (est.campeao) est.campeao.festa = 'samba'; }]],
      quadro: () => { if (est.campeao) est.campeao.root.visible = true; },
      cam: c => { const a = lerp(-.55, .45, sm(c.k)), r = lerp(3.9, 3.3, sm(c.k)); cam(V(Math.sin(a) * r, 1.1 + .45 * c.k, .4 - Math.cos(a) * r), V(0, 1.45, .4), 44); },
    },
    xp: {
      ini: () => { palco(); campeao('samba'); est.setLED({ modo: 'titulo', sub: 'SUBA NA CARREIRA POLÍTICA' }); S.nv = -1;
        fx.insertAdjacentHTML('beforeend', `<div class="tut-escuro"></div><div class="tut-xp"><img><div><small>CARGO ATUAL</small><b class="nm"></b><div class="bar"><i></i></div><span class="xpn"></span></div><em>SUBIU DE NÍVEL!</em></div>`); },
      ev: [[.03, () => { chip('+230 XP', 'amarelo', 7, 24); chip('+🪙 99', 'amarelo', 22, 24, .25); som(sfx.nota); }]],
      quadro: c => {
        if (est.campeao) est.campeao.root.visible = true;
        const q = Math.min(.999, Math.max(0, (c.k - .1) / .78)), n = CARGOS.length - 1, s = c.k >= .88 ? n : Math.floor(q * n), f = c.k >= .88 ? 1 : q * n - s, cg = CARGOS[s], prox = CARGOS[s + 1];
        const box = fx.querySelector('.tut-xp'); if (!box) return;
        if (s !== S.nv) { const subiu = S.nv >= 0; S.nv = s; box.querySelector('img').src = brasao(cg.n); box.querySelector('.nm').textContent = cg.nome; box.classList.toggle('topo', s === n);
          if (subiu) { reanima(box, 'pop'); som(s === n ? sfx.vitoria : sfx.nota); } }
        box.querySelector('.bar i').style.width = (s === n ? 100 : f * 100) + '%';
        box.querySelector('.xpn').textContent = (prox ? Math.round(cg.xp + f * (prox.xp - cg.xp)) : cg.xp).toLocaleString('pt-BR') + ' XP';
      },
      cam: c => { const a = lerp(.25, -.1, sm(c.k)); cam(V(Math.sin(a) * 3.3, 1.55, .4 - Math.cos(a) * 3.3), V(1.05, 1.35, .4), 50); },
    },
    final: {
      ini: () => { palco({ falante: VOCE }); est.setLED({ modo: 'titulo', sub: 'BOM DEBATE!' }); logo('AGORA É COM VOCÊ!', true); est.festejarPlateia(5000, 1); },
      ev: [[0, () => som(() => sfx.aplausos(3.5, .3))], [.12, () => som(sfx.vinheta)]],
      cam: c => { const k = sm(c.k); cam(mix(V(.7, 2.25, 5.3), V(0, 7.5, 14.5), k), mix(V(0, 1.9, -3), V(0, 2.2, -5), k), 52); },
    },
  };
  function campeao(danca) { // no centro do palco (onde fica o púlpito do confronto), de frente para a mesa da mediação
    est.setCampeao({ ...pd(VOCE).avatar.cfg }, danca); const R = est.campeao?.root; if (R) { R.position.set(0, 0, .4); R.rotation.y = Math.PI; R.visible = true; } pd(VOCE).avatar.root.visible = false; S.sujo = true; }

  // ---------- linha do tempo ----------
  function entrar(i, off) {
    const b = S.blocos[i], cena = CENAS[b.cena] || CENAS.estudio;
    S.i = i; S.audio?.pause(); calar(); fx.innerHTML = ''; balao(null); $('.tut-selo').className = 'tut-selo';
    const c = S.c = { b, d: b.d, u: off, k: off / b.d, dt: 0, cena, ev: (cena.ev || []).map(e => [...e]) };
    S.mudo = off > .05; cena.ini?.(c);
    for (const e of c.ev) if (c.k >= e[0] && off > .05) { e.f = true; e[1](c); }
    S.mudo = false;
    if (b.audio && !b.audio.error) { const a = S.audio = b.audio; try { a.currentTime = Math.min(off, Math.max(0, a.duration - .05)); } catch { /* */ } a.volume = 1; if (!S.congela) a.play().catch(() => {}); }
    else if (off < .3 && !S.congela) falar(b.fala);
    // legenda (palavra a palavra quando é a própria fala) + tarja da dica + flash do corte
    leg.innerHTML = b.legenda ? `<span class="lido">${esc(b.legenda)}</span>` : b.fala.split(/\s+/).map(w => `<span>${esc(w)}</span>`).join(' ');
    S.palavras = b.legenda ? [] : [...leg.children]; S.lidas = -1; reanima(leg);
    const dc = $('.tut-dica'); dc.textContent = b.dica || ''; dc.className = 'tut-dica'; if (b.dica && !cena.selo) reanima(dc);
    if (i > 0) reanima($('.tut-flash'));
  }
  function quadro(dt, t) {
    if (S.fim) return;
    const agora = S.congela ? S.off0 : S.off0 + (performance.now() - S.t0) / 1000;
    const i = S.blocos.findIndex(b => agora < b.ini + b.d); if (i < 0) return terminar(false);
    if (i !== S.i) entrar(i, agora - S.blocos[i].ini);
    const b = S.blocos[i], c = S.c; c.u = agora - b.ini; c.k = Math.min(1, c.u / b.d); c.dt = dt;
    for (const e of c.ev) if (!e.f && c.k >= e[0]) { e.f = true; e[1](c); }
    c.cena.quadro?.(c); c.cena.cam(c);
    S.tremor *= Math.exp(-dt * 5);
    // karaokê da legenda
    if (S.palavras.length) { const n = Math.floor(Math.min(1, c.u / Math.max(.5, b.d - RESPIRO)) * S.palavras.length * 1.04); if (n !== S.lidas) { S.lidas = n; S.palavras.forEach((w, j) => w.classList.toggle('lido', j < n)); } }
    $('.tut-prog i').style.width = (agora / S.total * 100).toFixed(2) + '%';
    // balão acompanha a cabeça de quem fala
    if (S.bal && pd(S.bal.id)) {
      const p = W(S.bal.id, 0, 2.45, 0); est.camera.updateMatrixWorld(); p.project(est.camera); const r = est.canvas.getBoundingClientRect();
      bal.style.left = Math.min(r.right - bal.offsetWidth / 2 - 20, Math.max(r.left + bal.offsetWidth / 2 + 20, r.left + (p.x + 1) / 2 * r.width)) + 'px';
      bal.style.top = Math.max(innerHeight * .08 + bal.offsetHeight + 34, r.top + (1 - p.y) / 2 * r.height) + 'px'; // nunca sai do quadro (barras de cinema) bal.style.visibility = p.z < 1 ? '' : 'hidden';
    }
  }
  function terminar(pulou) {
    if (S.fim) return; S.fim = true; atual = null;
    S.audio?.pause(); calar(); abafarAmbiente(1); removeEventListener('keydown', tecla, true);
    est.cine = null; est.onAcao = salvo.onAcao;
    try {
      est.acoes.limpar(); est.confetes(false); est.setCampeao(null); est.setDuelo(null); est.setPulpito(false, true); est.mediadoraFalando(false); est.mediadora.anim = null; est.festa(null);
      est.chaveJog = ''; est.setJogadores(salvo.jog || [], salvo.meuId); est.setFalante(salvo.falante); est.setLED(salvo.led);
      est.camera.fov = salvo.fov; est.camera.updateProjectionMatrix(); est.camTVok = false; est.setModo(salvo.modo === 'cine' ? 'menu' : salvo.modo);
    } catch (e) { console.warn('[tutorial] restaurar', e); }
    ocultos.forEach(e => { e.style.visibility = ''; });
    el.classList.add('sai'); setTimeout(() => el.remove(), 500);
    resolver({ pulou: !!pulou });
  }

  // ---------- partida: mede os áudios, monta o elenco e roda ----------
  (async () => {
    let roteiro = TUTORIAL;
    if (op.cena && !TUTORIAL.some(b => b.cena === op.cena)) roteiro = [{ id: '_' + op.cena, cena: op.cena, fala: 'Cena de teste: ' + op.cena, dica: '🎬 ' + op.cena.toUpperCase() }];
    const med = await Promise.all(roteiro.map(medir));
    if (S.fim) return;
    let ini = 0; S.blocos = roteiro.map((b, i) => { const x = { ...b, audio: med[i].audio, d: med[i].d + RESPIRO, ini }; ini += x.d; return x; }); S.total = ini;
    const ib = op.cena ? S.blocos.findIndex(b => b.cena === op.cena) : -1;
    S.off0 = Math.min(S.total - .05, Math.max(0, (ib >= 0 ? S.blocos[ib].ini : 0) + (+op.t || 0))); S.congela = !!op.congela; el.classList.toggle('congelado', S.congela); // print: animações CSS já no estado final
    abafarAmbiente(.35);
    montarElenco(); est.setModo('cine'); est.onAcao = (ev, d) => { salvo.onAcao?.(ev, d); if (ev === 'impacto' && S.c?.cena === CENAS.caldeirada) CENAS.caldeirada.impacto(S.c); };
    S.t0 = performance.now(); est.cine = quadro;
    el.classList.remove('carregando');
  })().catch(e => { console.warn('[tutorial]', e); terminar(true); });
  return S.p;
}
