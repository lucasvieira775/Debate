// Ações da loja (cadeirada, paulada, torta, balde, tomate, flores): o "maestro" da cena 3D.
// Recebe o evento do servidor, cuida do atacante (objeto na mão, caminhada até o alvo, golpe, volta ao lugar)
// e chama props.js (objetos/efeitos) e vitima.js (reação do alvo + câmera em 3ª pessoa).
// Linha do tempo 'perto': 0 pega o objeto → 0,4 s anda (curva pela frente dos púlpitos) → chega ao lado do alvo e vira
// → golpe (0,6 s de preparo) → IMPACTO → 0,5 s o objeto some → volta pelo mesmo caminho → colocarAtor + aplicarDuelo.
// Linha do tempo 'longe': 0 pega e vira para o alvo → 0,7 s solta (voo ~0,55–0,85 s) → IMPACTO → 0,6 s volta a olhar para frente.
import * as THREE from 'three';
import { ITEM } from '/shared/loja.js';
import { Vitima } from './vitima.js';
import { limparTela } from './tela.js';
import { registrarPose } from '../avatar.js';

let PROPS = {}; // carregado à parte: um erro em props.js não derruba o estúdio
import('./props.js').then(m => { PROPS = m; }).catch(e => console.warn('props.js', e));

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const trap = (u, a = .2) => { u = clamp(u, 0, 1); const v = 1 / (1 - a); return u < a ? v * u * u / (2 * a) : u > 1 - a ? 1 - v * (1 - u) ** 2 / (2 * a) : v * (u - a / 2); };
const angDif = a => Math.atan2(Math.sin(a), Math.cos(a));
const CENTRO = V(0, 0, -3.2), R_ARCO = 5.3; // mesa da mediação (estudio.js) e raio do corredor em frente aos púlpitos
const VEL = 2.3;                             // m/s (passo apressado de quem vai brigar)
const T_PEGA = .4, T_PREP = .6, T_SOME = .5, T_SOLTA = .7;
// distância até o alvo (ao lado dele) e quem tem passos com barulho do objeto
const DIST = { cadeirada: 1.2, paulada: 1.0, torta: .8, balde: .64 };
const CARREGA = { cadeirada: 1, balde: 1 };
const COMP = { cadeirada: .88, paulada: .82 }; // comprimento do objeto a partir da pegada (para não atravessar a cabeça do alvo)
const AGARRA = { cadeirada: 1, paulada: 1, balde: 1 }; // posição calculada a cada quadro (o resto usa a PEGADA fixa)
const POSE_GOLPE = { cadeirada: 'golpeCadeira', paulada: 'golpePau', torta: 'tortada', balde: 'baldeada' };
const POSE_CARREGA = { cadeirada: 'carregaCadeira', paulada: 'carregaPau', torta: 'carregaTorta', balde: 'carregaBalde' };
const Q_DEBUG = new URLSearchParams(typeof location !== 'undefined' && location.search.includes('demo=') ? location.search : ''); // parâmetros de teste só com ?demo=
const CAM_DEBUG = Q_DEBUG.get('acaocam'), ADIANTA = Q_DEBUG.get('acaot'); // só para prints de teste

// ---------- poses do atacante ----------
// braço [rot x, abertura z, cotovelo, giro do braço, giro da mão, mão, avanço do ombro]
const nq = x => [x[0], x[1], x[2] ?? -.25, x[3] ?? 0, x[4] ?? 0, x[5] ?? 'relax', x[6] ?? 0];
const lq = (a, b, k) => { const A = nq(a), B = nq(b); return A.map((v, i) => i === 5 ? (k < .5 ? v : B[i]) : v + (B[i] - v) * k); };
/** Interpola uma sequência de chaves [tempo, valor] (valor = braço ou número) com suavização. */
const seq = (u, ch) => {
  if (u <= ch[0][0]) return ch[0][1];
  for (let i = 1; i < ch.length; i++) if (u < ch[i][0]) {
    const [t0, a] = ch[i - 1], [t1, b] = ch[i], k = sm((u - t0) / (t1 - t0));
    return typeof a === 'number' ? a + (b - a) * k : lq(a, b, k);
  }
  return ch[ch.length - 1][1];
};
const B = {
  // cadeira: as duas mãos no topo do encosto
  cadBaixo: [-.62, -.2, -.95, 0, 0, 'punho', .15], cadAlto: [-2.85, -.1, -.65, 0, 0, 'punho', .45], cadBate: [-2.25, -.12, -.15, 0, 0, 'punho', .8],
  // pau na mão direita
  pauLeva: [-.35, .12, -1.25, .5, 0, 'punho'], pauArma: [-2.35, 1.05, -1.55, -.4, 0, 'punho', .2], pauBate: [-1.85, -.4, -.1, -.9, 0, 'punho', .7],
  guarda: [-.7, .25, -1.5, -.6, 0, 'punho', .2],
  // torta: prato na palma da direita
  tortLeva: [-.5, .02, -1.45, 1.35, 0, 'aberta', .1], tortArma: [-.35, .45, -2.1, 1.35, 0, 'aberta'], tortBate: [-1.95, -.1, -.45, 1.35, 0, 'aberta', .9],
  // balde: alça na direita; para virar, a esquerda segura o fundo
  baldLeva: [-.12, .14, -.12, 0, 0, 'punho'], baldAlto: [-2.6, -.08, -.5, 0, 0, 'punho', .5], baldVira: [-2.5, -.1, -.3, 0, 0, 'punho', .8],
  // arremesso (direita)
  arrPega: [-.55, .2, -1.4, 0, 0, 'punho'], arrArma: [-2.55, .55, -1.55, 0, 0, 'punho', .1], arrSolta: [-1.95, -.05, -.15, 0, 0, 'aberta', .6], arrSegue: [-.85, -.25, -.3, 0, 0, 'aberta', .4],
  mira: [-1.35, .25, -.35, 0, 0, 'aberta', .2], solto: [-.2, .1, -.35, 0, 0, 'relax'],
};
registrarPose('carregaCadeira', () => ({ esq: B.cadBaixo, dir: B.cadBaixo }));
registrarPose('carregaPau', () => ({ dir: B.pauLeva, esq: B.solto }));
registrarPose('carregaTorta', () => ({ dir: B.tortLeva, esq: B.solto }));
registrarPose('carregaBalde', () => ({ dir: B.baldLeva, esq: B.solto, inclina: -.04 }));
// golpes: u = s desde o início; o impacto é em u = T_PREP (0,6 s)
registrarPose('golpeCadeira', u => {
  const br = seq(u, [[0, B.cadBaixo], [.38, B.cadAlto], [.47, B.cadAlto], [.6, B.cadBate], [1.05, B.cadBate], [1.5, B.cadBaixo]]);
  return { esq: br, dir: br, cabeca: seq(u, [[0, 0], [.38, -.18], [.6, .15], [1.5, 0]]), pulo: seq(u, [[.3, 0], [.45, .03], [.6, -.04], [1, 0]]), pernaE: [-.25, .3, 0], pernaD: [.15, .1, 0] };
});
registrarPose('golpePau', u => ({
  dir: seq(u, [[0, B.pauLeva], [.36, B.pauArma], [.46, B.pauArma], [.6, B.pauBate], [1.05, B.pauBate], [1.5, B.pauLeva]]),
  esq: seq(u, [[0, B.solto], [.36, B.guarda], [1.05, B.guarda], [1.5, B.solto]]),
  giro: seq(u, [[0, 0], [.36, -.55], [.46, -.6], [.6, .45], [1.05, .4], [1.5, 0]]), inclina: seq(u, [[.36, .08], [.6, -.06], [1.2, 0]]),
  pernaE: [-.22, .25, 0], pernaD: [.12, .1, 0],
}));
registrarPose('tortada', u => ({
  dir: seq(u, [[0, B.tortLeva], [.35, B.tortArma], [.47, B.tortArma], [.6, B.tortBate], [1.0, B.tortBate], [1.4, B.solto]]),
  esq: B.solto, giro: seq(u, [[0, 0], [.35, -.3], [.6, .25], [1.1, .15], [1.4, 0]]), sorriso: seq(u, [[0, .2], [.5, .8], [1.5, .9]]), pernaE: [-.25, .3, 0],
}));
registrarPose('baldeada', u => {
  const d = seq(u, [[0, B.baldLeva], [.4, B.baldAlto], [.48, B.baldAlto], [.62, B.baldVira], [1.1, B.baldVira], [1.5, B.solto]]);
  return { dir: d, esq: seq(u, [[0, B.solto], [.4, B.baldAlto], [.48, B.baldAlto], [.62, B.baldVira], [1.1, B.baldVira], [1.5, B.solto]]), cabeca: seq(u, [[0, 0], [.4, -.2], [.8, -.1], [1.5, 0]]), sorriso: .6 };
});
registrarPose('arremessar', u => ({
  dir: seq(u, [[0, B.arrPega], [.5, B.arrArma], [.6, B.arrArma], [T_SOLTA, B.arrSolta], [.95, B.arrSegue], [1.8, B.solto]]),
  esq: seq(u, [[0, B.solto], [.45, B.mira], [.75, B.mira], [1.1, B.solto]]),
  giro: seq(u, [[0, 0], [.5, -.45], [.6, -.5], [T_SOLTA, .3], [1, .25], [1.8, 0]]), inclina: seq(u, [[.5, .06], [T_SOLTA, -.05], [1.4, 0]]),
  pernaE: seq(u, [[0, [0, 0, 0]], [.5, [-.35, .35, 0]], [T_SOLTA, [.1, .05, 0]]]), sorriso: .5,
}));

// ---------- objeto na mão ----------
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _e = new THREE.Euler(), _s = V(1, 1, 1), _s2 = V();
const maoDe = (av, lado) => av.bracos.find(b => b.userData.lado === lado) || av.bracos[0];
const PEG_PADRAO = { pos: [.03, -.09, 0], rot: [Math.PI / 2, 0, 0] };
function propFalso(id) { // props.js ainda não carregou: um bloquinho no lugar
  const g = new THREE.Group(), cor = { tomate: '#d81e14', flores: '#ff5c9a', torta: '#fffaf0', balde: '#9aa3ad', paulada: '#8a5a2b', cadeirada: '#c0c4cc' }[id] || '#fff';
  const me = new THREE.Mesh(new THREE.BoxGeometry(.12, .5, .12), new THREE.MeshStandardMaterial({ color: cor })); me.position.y = .25; g.add(me); return g;
}

export class Acoes {
  constructor(est) { this.est = est; this.lista = []; this.efeitos = []; this.fila = []; this.vistos = new Set(); }
  /** d = { n, id: atacante, alvo, item } */
  iniciar(d) {
    if (!d || d.id === d.alvo) return;
    if (d.n != null) { if (this.vistos.has(d.n)) return; this.vistos.add(d.n); if (this.vistos.size > 200) this.vistos.delete(this.vistos.values().next().value); }
    const est = this.est, it = ITEM[d.item], atk = est.podios.get(d.id), alvo = est.podios.get(d.alvo);
    if (!it || !atk || !alvo) return;
    // alguém ainda ocupado com outra ação: espera a vez (no máximo 3 na fila, descarta as velhas)
    if (this.ocupado(d.id) || this.ocupado(d.alvo)) { if (this.fila.length < 3) this.fila.push({ d, t: est.t }); return; }
    // quem estava no meio da caminhada do confronto já aparece no destino
    for (const p of [atk, alvo]) if (p.caminho) est.colocarAtor(p, p.caminho.destino);
    this.comecar(d, it, atk, alvo, false);
    if (ADIANTA && !this.adiantou) { this.adiantou = true; this.adiantar(ADIANTA); }
  }
  /** Demonstração na vitrine da loja: atk/alvo = púlpitos "falsos" { id, ator (Group solto na cena), avatar }.
   *  Mesma coreografia, sem câmera, púlpitos nem mediadora; aoFim() quando atacante e vítima terminam. */
  demo(atk, alvo, item, aoFim) {
    const it = ITEM[item]; if (!it) return null;
    const a = this.comecar({ id: atk.id, alvo: alvo.id, item }, it, atk, alvo, true);
    if (a) a.aoFim = aoFim; return a;
  }
  pararDemo() {
    this.lista = this.lista.filter(a => { if (!a.demo) return true; this.soltar(a, false); try { a.vit.limpar?.(); } catch {} return false; });
    this.efeitos = this.efeitos.filter(e => { if (!e.demo) return true; try { e.limpar?.(); } catch {} return false; });
  }
  comecar(d, it, atk, alvo, demo) {
    const est = this.est, orig = atk.lugar === 'duelo' ? 'duelo' : 'podio';
    const a = { d, it, atk, alvo, orig, demo, t: 0, fase: 'pega', ft: 0, bateu: false, atkVivo: true, vitViva: true, perto: it.golpe === 'perto' };
    a.eu = !demo && atk.id === est.meuId;
    a.av = atk.avatar; a.av.festa = false; a.av.empurra = false;
    try { this.segurar(a); } catch (e) { console.warn(e); this.soltar(a, false); return; }
    a.vit = new Vitima(est, alvo, it, d); // depois do objeto: se ele falhar, a vítima não fica com o olhar travado
    if (demo) { a.vit.atk = () => atk; a.casa = { pos: atk.ator.position.clone(), yaw: atk.ator.rotation.y }; }
    this.som(a, 'pega', .8);
    if (a.perto) {
      a.av.animar(POSE_CARREGA[it.id] || 'carregaPau', 60);
      if (a.eu) this.olharFrente();
    } else {
      a.av.animar('arremessar', 2);
      a.yaw0 = atk.ator.rotation.y;
    }
    this.lista.push(a); return a;
  }
  /** Teste (?acaot=s): pula s segundos da ação de uma vez (o print headless renderiza poucos quadros). */
  adiantar(q) { // "3.5" = 3,5 s; "golpe:0.3" = 0,3 s depois de começar a fase golpe
    const est = this.est, dt = 1 / 30, a = this.lista[this.lista.length - 1], [f, s] = q.includes(':') ? q.split(':') : [null, q];
    const passo = () => { est.t += dt; this.update(dt, est.t); for (const p of est.podios.values()) p.avatar.update(dt, est.t); if (est.modo === 'fp') this.camera(dt, est.t); };
    if (f) for (let k = 0; k < 600 && a.fase !== f; k++) passo();
    for (let k = 0; k < Number(s) / dt; k++) passo();
  }

  // ---------- caminho: sai pela lateral do púlpito, passa pela frente (arco) e chega ao lado do alvo ----------
  /** Lugar (mundo) e direção de um candidato: no púlpito dele ou no púlpito central do 1x1. */
  ponta(p, lugar) {
    if (lugar === 'duelo') { const l = this.est.lugarDuelo(p.lado || 1); return { pos: l.pos.clone(), yaw: l.yaw, duelo: true, lado: p.lado || 1 }; }
    const c = this.est.casaAtor(p); return { pos: c.pos.setY(0), yaw: c.yaw, duelo: false };
  }
  loc(e, x, z) { const c = Math.cos(e.yaw), s = Math.sin(e.yaw); return V(e.pos.x + x * c + z * s, 0, e.pos.z - x * s + z * c); }
  ladoDe(e, w) { const dx = w.x - e.pos.x, dz = w.z - e.pos.z; return Math.sign(dx * Math.cos(e.yaw) - dz * Math.sin(e.yaw)) || 1; }
  saida(e, outro) {
    if (e.duelo) return [this.loc(e, e.lado * .95, 0)]; // pela frente do púlpito central
    const sd = this.ladoDe(e, outro.pos); return [this.loc(e, sd * .85, 0), this.loc(e, sd * .85, 1.37)];
  }
  chegada(e, de, D) {
    if (e.duelo) return [this.loc(e, e.lado * (D + .6), 0), this.loc(e, e.lado * D, 0)];
    const sx = this.ladoDe(e, de.pos); return [this.loc(e, sx * 1.05, 1.47), this.loc(e, sx * 1.05, .3), this.loc(e, sx * D, 0)];
  }
  arco(a, b) {
    const ang = v => Math.atan2(v.x - CENTRO.x, v.z - CENTRO.z), a0 = ang(a), a1 = ang(b), n = Math.ceil(Math.abs(a1 - a0) / .28) - 1, r = [];
    for (let i = 1; i <= n; i++) { const g = a0 + (a1 - a0) * i / (n + 1); r.push(V(CENTRO.x + Math.sin(g) * R_ARCO, 0, CENTRO.z + Math.cos(g) * R_ARCO)); }
    return r;
  }
  rota(a) {
    if (a.demo) { // vitrine: reto até o lado do alvo (ao lado, sem ficar entre a câmera e quem leva)
      const A = a.casa, Bp = a.alvo.ator.position.clone().setY(0), dir = A.pos.clone().sub(Bp).setY(0).normalize().add(V(0, 0, -.15)).normalize(); // lado a lado (quase na mesma profundidade): o atacante não tapa o alvo
      a.alvoPos = Bp; return [A.pos.clone(), Bp.clone().addScaledVector(dir, DIST[a.it.id] || 1)];
    }
    const A = this.ponta(a.atk, a.orig), Bp = this.ponta(a.alvo, a.alvo.lugar === 'duelo' ? 'duelo' : 'podio');
    const sai = this.saida(A, Bp), chega = this.chegada(Bp, A, DIST[a.it.id] || 1);
    const pts = [A.pos, ...sai, ...this.arco(sai[sai.length - 1], chega[0]), ...chega];
    a.casa = A; a.alvoPos = Bp.pos;
    return pts.filter((q, i) => i === 0 || q.distanceTo(pts[i - 1]) > .05);
  }
  /** Começa uma caminhada pelos pontos (o ator vai para a cena, como no confronto). */
  caminho(a, pts, yawFim) {
    const est = this.est, at = a.atk.ator;
    est.scene.attach(at); at.position.y = 0;
    at.rotation.set(0, new THREE.Euler().setFromQuaternion(at.quaternion, 'YXZ').y, 0);
    pts[0] = at.position.clone();
    const ok = pts.filter((q, i) => i === 0 || q.distanceTo(pts[i - 1]) > .05);
    if (ok.length < 2) ok.push(ok[0].clone().add(V(0, 0, .01)));
    const curva = new THREE.CatmullRomCurve3(ok, false, 'centripetal'), tot = curva.getLength();
    a.cam = { curva, dur: clamp(tot / VEL, 1, 4.6), t: 0, yawFim, yaw0: at.rotation.y, pts: ok };
    a.atk.lugar = 'andando';
  }
  /** Um passo da caminhada (mesma lógica de estudio.andarAtores). true = chegou e já virou. */
  andar(a, dt) {
    const c = a.cam, at = a.atk.ator, av = a.av; c.t += dt;
    const u = Math.min(1, c.t / c.dur), e = trap(u, .22);
    c.curva.getPointAt(e, at.position);
    const tg = c.curva.getTangentAt(Math.min(1, e + .04)), rumo = Math.atan2(tg.x, tg.z), fim = sm((u - .8) / .2);
    const dr = angDif(c.yawFim - rumo), d0 = angDif(rumo - c.yaw0);
    const alvo = c.yaw0 + d0 * sm(u / .2) + dr * fim;
    const dy = angDif(alvo - at.rotation.y);
    at.rotation.y += dy * (1 - Math.exp(-dt * (a.eu ? 4.5 : 7)));
    av.andar = u < .97 ? clamp(Math.min(u, 1 - u) * 8, .35, 1) : 0;
    if (CARREGA[a.it.id] && av.andar > .2) { // barulho do objeto a cada passo
      const n = Math.floor(av.faseAndar / Math.PI + .5);
      if (a.passoN !== undefined && n !== a.passoN) this.som(a, 'carrega', .5);
      a.passoN = n;
    }
    return u >= 1 && (Math.abs(dy) < .02 || c.t > c.dur + .5);
  }

  // ---------- objeto ----------
  segurar(a) {
    const id = a.it.id, obj = PROPS.criarProp?.(a.it) || propFalso(id);
    if (!obj.children.length && !obj.isMesh) obj.add(propFalso(id));
    a.prop = obj; a.mao = maoDe(a.av, -1).userData.mao; a.mao.add(obj);
    const pg = PROPS.PEGADA?.[id] || PEG_PADRAO;
    obj.position.fromArray(pg.pos); obj.rotation.fromArray(pg.rot);
    a.pegLocal = new THREE.Matrix4().compose(obj.position.clone(), obj.quaternion.clone(), _s);
    obj.scale.setScalar(.01); a.cresce = 0; // aparece crescendo rápido (0,15 s)
  }
  soltar(a, som = true) { if (!a.prop) return; if (som) this.som(a, 'some', .6); a.prop.removeFromParent(); a.prop = null; }
  /** Posição do objeto a cada quadro. Cadeira e balde seguem as duas mãos; o resto fica no encaixe da mão direita. */
  moverProp(a, dt) {
    const o = a.prop; if (!o) return;
    a.cresce = Math.min(1, a.cresce + dt / .15);
    const id = a.it.id, av = a.av, esc = .01 + .99 * sm(a.cresce);
    if (!AGARRA[id]) { o.scale.setScalar(esc); return; }
    av.root.updateWorldMatrix(true, true);
    const [mE, mD] = [maoDe(av, 1), maoDe(av, -1)].map(b => b.userData.mao.localToWorld(V(-b.userData.lado * .035, -.09, 0)));
    const qR = av.root.getWorldQuaternion(_q), R = (x, y, z) => V(x, y, z).normalize().applyQuaternion(qR);
    const golpe = a.fase === 'golpe' || a.fase === 'depois', u = golpe ? a.ft : 0;
    // k: 0 = carregando → 1 = erguido (preparo); kb: erguido → batendo; volta a carregar no fim
    const k = golpe ? sm(u / .35) * (1 - sm((u - 1.05) / .45)) : 0, kb = golpe ? sm((u - .45) / .15) * (1 - sm((u - 1.05) / .45)) : 0;
    if (golpe && !a.mira) { a.mira = this.cabecaAlvo(a); a.cabEl = this.caixaCabeca(a); } // mira na cabeça do alvo (onde ela estava no começo do golpe)
    let pos, quat;
    if (id === 'cadeirada' || id === 'paulada') {
      // erguido: o objeto continua a linha do braço; no golpe o punho dobra e ele desce sobre a cabeça do alvo
      const cad = id === 'cadeirada', m = cad ? mE.clone().add(mD).multiplyScalar(.5) : mD;
      const ombro = cad ? av.bracos[0].getWorldPosition(V()).add(av.bracos[1].getWorldPosition(V())).multiplyScalar(.5) : maoDe(av, -1).getWorldPosition(V());
      const leva = cad ? R(0, -1, .35) : R(.15, 1, -.45), bate = cad ? R(0, -.2, 1) : a.mira ? a.mira.clone().sub(m).normalize() : R(0, 0, 1);
      const Y = leva.clone().lerp(m.clone().sub(ombro).normalize(), k).normalize().lerp(bate, kb).normalize();
      if (golpe && a.cabEl) this.livrar(Y, m, COMP[id] * esc, a.cabEl, R(0, 1, 0)); // encosta na cabeça, sem atravessar
      const X = R(1, 0, 0), Z = X.clone().cross(Y).normalize(); X.crossVectors(Y, Z);
      pos = m; quat = _q3.setFromRotationMatrix(_m.makeBasis(X, Y, Z));
    } else { // balde: na direita pela alça (em pé); para virar, entre as duas mãos e inclinado para frente
      const vira = golpe ? sm((u - .45) / .2) * 2.6 * (1 - sm((u - 1.1) / .3)) : 0;
      pos = mD.clone().lerp(mE.clone().add(mD).multiplyScalar(.5), k);
      quat = _q3.copy(qR).multiply(_q2.setFromEuler(_e.set(vira, 0, 0)));
    }
    // converte para o espaço da mão direita (o objeto continua preso a ela)
    a.mao.updateWorldMatrix(true, false);
    _m.compose(pos, quat, _s2.setScalar(esc)).premultiply(_mi.copy(a.mao.matrixWorld).invert());
    _m.decompose(o.position, o.quaternion, o.scale);
  }


  // ---------- impacto ----------
  cabecaAlvo(a) { const c = a.alvo.avatar.cabeca; c.updateWorldMatrix(true, false); return c.localToWorld(V(0, .3, 0)); }
  /** Cabeça do alvo (com cabelo/chapéu) como caixa no espaço dela { inv: mundo → cabeça, box: caixa + folga da espessura do objeto }. */
  caixaCabeca(a) {
    const c = a.alvo.avatar.cabeca, box = new THREE.Box3(), bb = new THREE.Box3(); c.updateWorldMatrix(true, true);
    const inv = c.matrixWorld.clone().invert();
    c.traverse(o => { if (!o.isMesh || !o.visible || !o.geometry) return; o.geometry.boundingBox || o.geometry.computeBoundingBox(); box.union(bb.copy(o.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(inv, o.matrixWorld))); });
    return box.isEmpty() ? null : { inv, box: box.expandByScalar(.035) };
  }
  /** Objeto preso em m, na direção Y, com comprimento L: ergue Y (para "cima") até o segmento só encostar na cabeça do alvo. */
  livrar(Y, m, L, el, cima) {
    const p = V(), dentro = () => { for (let i = 0; i <= 16; i++) if (el.box.containsPoint(p.copy(m).addScaledVector(Y, L * i / 16).applyMatrix4(el.inv))) return true; return false; };
    for (let i = 0; i < 40 && dentro(); i++) Y.lerp(cima, .04).normalize();
  }
  impacto(a) {
    if (a.bateu) return; a.bateu = true;
    const est = this.est, id = a.it.id, pos = this.cabecaAlvo(a);
    a.vit.impacto?.();
    try { const ef = PROPS.impacto?.(est, id, a.alvo); if (ef) { ef.demo = a.demo; this.efeitos.push(ef); } } catch (e) { console.warn(e); }
    est.onSom?.('acaoImpacto', { item: id, ...est.somEm(pos) });
    est.onSom?.(a.it.reacao === 'amor' ? 'plateiaAww' : 'plateiaOh', { vol: .55, pan: 0 });
    if (!a.demo) est.onAcao?.('impacto', a.d); // na loja: sem plateia agitada nem mediadora
    if (id === 'torta') this.soltar(a, false); // o prato voa (props.impacto) e o creme fica no rosto
  }
  som(a, nome, base = .7) {
    const est = this.est; if (!est.onSom) return;
    const o = a.eu && est.modo === 'fp' ? { vol: base * .8, pan: 0 } : est.somEm(a.atk.ator.getWorldPosition(V()).setY(1.4), base);
    est.onSom(nome, { ...o, item: a.it.id });
  }
  olharFrente() { const est = this.est; if (!est.olhar) return; est.olhar.y = 0; est.olhar.p = -.05; est.suaveAte = est.t + 1.2; }

  // ---------- quadro a quadro ----------
  update(dt, t) {
    const est = this.est;
    this.efeitos = this.efeitos.filter(e => { try { if (e.update(dt, t)) return true; } catch (er) { console.warn(er); } e.limpar?.(); return false; });
    this.lista = this.lista.filter(a => {
      // púlpito sumiu/foi recriado: encerra sem travar ninguém
      if (!a.demo && (est.podios.get(a.d.id) !== a.atk || est.podios.get(a.d.alvo) !== a.alvo)) { this.abortar(a); return false; }
      a.t += dt;
      if (a.atkVivo) { try { this.passoAtk(a, dt); } catch (er) { console.warn(er); try { this.terminarAtk(a); } catch (e2) { console.warn(e2); a.atkVivo = false; } } }
      if (a.vitViva) {
        let viva = false; try { viva = a.vit.update(dt, t); } catch (er) { console.warn(er); }
        if (!viva && (a.bateu || !a.atkVivo)) { a.vitViva = false; try { a.vit.limpar?.(); } catch (er) { console.warn(er); } }
      }
      if (a.atkVivo || a.vitViva) return true;
      if (a.demo) { try { a.aoFim?.(); } catch (er) { console.warn(er); } return false; }
      try { est.aplicarDuelo(false); } catch (er) { console.warn(er); } return false;
    });
    // fila: ações que chegaram com alguém ocupado
    if (this.fila.length) {
      this.fila = this.fila.filter(f => est.t - f.t < 15);
      const i = this.fila.findIndex(f => !this.ocupado(f.d.id) && !this.ocupado(f.d.alvo));
      if (i >= 0) { const [f] = this.fila.splice(i, 1); this.vistos.delete(f.d.n); try { this.iniciar(f.d); } catch (er) { console.warn(er); } }
    }
  }
  irPara(a, fase) { a.fase = fase; a.ft = 0; if (ADIANTA) console.log('[atk]', fase, a.t.toFixed(2), a.cam ? 'dur ' + a.cam.dur.toFixed(2) : ''); }
  passoAtk(a, dt) {
    a.ft += dt; this.moverProp(a, dt);
    const av = a.av, at = a.atk.ator;
    if (!a.perto) { // ---------- arremesso ----------
      // vira o corpo para o alvo (no espaço do pai do ator: púlpito ou cena)
      const alvo = at.parent.worldToLocal(this.cabecaAlvo(a)), quer = Math.atan2(alvo.x - at.position.x, alvo.z - at.position.z);
      const k = a.fase === 'volta' ? sm(a.ft / .6) : sm(a.t / .45);
      at.rotation.y = a.fase === 'volta' ? a.yawVolta + angDif(a.yaw0 - a.yawVolta) * k : a.yaw0 + angDif(quer - a.yaw0) * k;
      if (a.fase === 'pega' && a.t >= T_SOLTA) {
        const de = a.mao.localToWorld(V(.05, -.1, 0)), ate = this.cabecaAlvo(a), dur = clamp(de.distanceTo(ate) / 9, .55, .85);
        this.soltar(a, false); this.som(a, 'arremesso', .8);
        const ef = PROPS.lancar?.(this.est, a.it.id, de, ate, dur, a.demo ? .3 : undefined); if (ef) { ef.demo = a.demo; this.efeitos.push(ef); }
        a.tImpacto = a.t + dur; this.irPara(a, 'voo');
      } else if (a.fase === 'voo' && a.t >= a.tImpacto) { this.impacto(a); this.irPara(a, 'depois'); }
      else if (a.fase === 'depois' && a.ft >= .6) { a.yawVolta = at.rotation.y; this.irPara(a, 'volta'); }
      else if (a.fase === 'volta' && a.ft >= .6) this.terminarAtk(a);
      return;
    }
    // ---------- golpe de perto ----------
    if (a.fase === 'pega' && a.ft >= T_PEGA) {
      const pts = this.rota(a), fim = pts[pts.length - 1];
      this.caminho(a, pts, Math.atan2(a.alvoPos.x - fim.x, a.alvoPos.z - fim.z));
      this.irPara(a, 'ida');
    } else if (a.fase === 'ida') {
      if (this.andar(a, dt)) { av.andar = 0; av.animar(POSE_GOLPE[a.it.id], 3); a.somGolpe = false; this.irPara(a, 'golpe'); }
    } else if (a.fase === 'golpe') {
      if (!a.somGolpe && a.ft >= T_PREP - .16) { a.somGolpe = true; this.som(a, 'golpe', .8); }
      av.empurra = a.ft > T_PREP - .12 && a.ft < T_PREP + .45; // inclina o tronco no golpe
      if (a.ft >= T_PREP) { this.impacto(a); this.irPara(a, 'depois'); a.ft = T_PREP; }
    } else if (a.fase === 'depois') {
      av.empurra = a.ft < T_PREP + .45;
      if (a.prop && a.ft >= T_PREP + T_SOME) this.soltar(a);
      if (a.ft >= T_PREP + .8) {
        av.empurra = false; av.anim = null;
        const casa = a.demo ? a.casa : this.ponta(a.atk, a.orig), pts = a.cam.pts.slice().reverse(); pts[pts.length - 1] = casa.pos;
        this.caminho(a, pts, casa.yaw); this.irPara(a, 'volta');
      }
    } else if (a.fase === 'volta') {
      if (this.andar(a, dt)) this.terminarAtk(a);
    }
  }
  /** Fim do atacante: de volta ao lugar de origem (ou ao que o confronto pedir agora). */
  terminarAtk(a) {
    if (!a.atkVivo) return; a.atkVivo = false;
    this.soltar(a, false);
    const av = a.av; av.andar = 0; av.empurra = false; if (av.anim && [...Object.values(POSE_GOLPE), ...Object.values(POSE_CARREGA), 'arremessar'].includes(av.anim.nome)) av.anim = null;
    if (a.demo) { a.atk.ator.position.copy(a.casa.pos); a.atk.ator.rotation.set(0, a.casa.yaw, 0); a.atk.lugar = 'podio'; return; }
    this.est.colocarAtor(a.atk, a.orig);
    if (a.eu && a.perto) this.olharFrente();
    this.est.aplicarDuelo(false);
    if (a.atk.id === this.est.meuId && this.est.lendo) av.animar('folhear', 9999); // estava lendo a pergunta: volta a folhear
  }
  abortar(a) {
    this.soltar(a, false); try { a.vit.limpar?.(); } catch {}
    a.vitViva = false;
    if (a.atkVivo && (a.demo || this.est.podios.get(a.d.id) === a.atk)) this.terminarAtk(a); else a.atkVivo = false;
  }

  /** true = a câmera foi posicionada aqui (você é o alvo e está em 3ª pessoa — tecla V; em 1ª pessoa a câmera não sai do olho). */
  camera(dt, t) {
    if (CAM_DEBUG && this.lista.length) return this.camDebug();
    return this.lista.some(a => { if (!a.vitViva || a.semCam) return false; try { return a.vit.camera?.(dt, t); } catch (er) { console.warn(er); a.semCam = true; a.vit.camFim = true; this.est.setModo('fp'); return false; } });
  }
  /** ?acaocam=1|2 (só para testes): enquadra atacante e alvo de fora. */
  camDebug() {
    const a = this.lista[0], est = this.est, p1 = a.atk.ator.getWorldPosition(V()), p2 = a.alvo.ator.getWorldPosition(V());
    const m = p1.clone().add(p2).multiplyScalar(.5), dir = CENTRO.clone().sub(m).setY(0).normalize();
    dir.applyAxisAngle(V(0, 1, 0), Number(CAM_DEBUG) || 0); const foco = Q_DEBUG.get('foco') === 'atk' ? p1 : Q_DEBUG.get('foco') === 'alvo' ? p2 : m;
    const dist = Number(Q_DEBUG.get('dist')) || 2.6 + p1.distanceTo(p2) * .45;
    const cp = foco.clone().addScaledVector(dir, dist).setY(Number(Q_DEBUG.get("alt")) || 2.1), cam = est.camera; cam.parent?.updateWorldMatrix(true, false);
    cam.position.copy(cam.parent ? cam.parent.worldToLocal(cp) : cp); cam.updateMatrixWorld(); cam.lookAt(foco.x, 1.4, foco.z);
    return true;
  }
  ocupado(id) { return this.lista.some(a => (a.atkVivo && a.atk.id === id) || (a.vitViva && a.alvo.id === id)); }
  /** Você está sendo levado(a) pela ação (caminhando com o objeto): o mouse não gira a câmera. */
  andando(id) { return this.lista.some(a => a.atkVivo && a.perto && a.atk.id === id); }
  limpar() {
    for (const a of this.lista) { this.soltar(a, false); try { a.vit.limpar?.(); } catch {} }
    for (const e of this.efeitos) try { e.limpar?.(); } catch {}
    limparTela();
    this.lista = []; this.efeitos = []; this.fila = [];
  }
}
