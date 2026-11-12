// Avatares 3D procedurais (estilo "bonecão" estilizado) com animação de cabeça, olhos, boca e braços.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { generoDe } from '/shared/regras.js';

const geos = new Map(), mats = new Map();
function rbox(w, h, d, r = .04) {
  const k = `b${w},${h},${d},${r}`;
  if (!geos.has(k)) geos.set(k, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)));
  return geos.get(k);
}
function geo(k, fn) { if (!geos.has(k)) geos.set(k, fn()); return geos.get(k); }
export function mat(cor, o = {}) {
  const k = cor + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: cor, roughness: o.r ?? .6, metalness: o.m ?? 0, transparent: o.op !== undefined, opacity: o.op ?? 1, emissive: o.em ?? '#000000', emissiveIntensity: o.ei ?? 1 }));
  return mats.get(k);
}
function m(g, mt, x = 0, y = 0, z = 0, parent) {
  const me = new THREE.Mesh(g, mt); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
  if (parent) parent.add(me); return me;
}
function tom(hex, f) { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl, THREE.SRGBColorSpace); c.setHSL(hsl.h, hsl.s, Math.max(Math.min(hsl.l, .06), Math.min(1, hsl.l + f)), THREE.SRGBColorSpace); return '#' + c.getHexString(); } // HSL em sRGB (em linear, tons escuros zeravam)
const _qA = new THREE.Quaternion(), _qB = new THREE.Quaternion();
const _qY = new THREE.Quaternion(), _eixoY = new THREE.Vector3(0, 1, 0);
const esfera = r => geo('s' + r, () => new THREE.SphereGeometry(r, 18, 14));
// texturas desenhadas para acessórios cômicos
let texFolha = null, texListras = null;
function texturaFolha() {
  if (texFolha) return texFolha;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#0b2e17'; x.beginPath(); x.arc(64, 64, 64, 0, 7); x.fill();
  x.fillStyle = '#4ade80'; x.translate(64, 84);
  [[0, 52], [-.5, 44], [.5, 44], [-1.05, 32], [1.05, 32], [-1.6, 18], [1.6, 18]].forEach(([a, len]) => { // 7 folíolos
    x.save(); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(-len * .22, -len * .5, 0, -len); x.quadraticCurveTo(len * .22, -len * .5, 0, 0); x.fill(); x.restore();
  });
  x.fillRect(-2, 0, 4, 22);
  texFolha = new THREE.CanvasTexture(c); texFolha.colorSpace = THREE.SRGBColorSpace; return texFolha;
}
let texPipoca = null;
function texturaPipoca() { // listras verticais vermelho/branco do balde de pipoca
  if (texPipoca) return texPipoca;
  const c = document.createElement('canvas'); c.width = 128; c.height = 8; const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#e11d2a'; x.fillRect(i * 16, 0, 16, 8); }
  texPipoca = new THREE.CanvasTexture(c); texPipoca.colorSpace = THREE.SRGBColorSpace; return texPipoca;
}
/** Balde de pipoca (estilo 🍿): copo listrado vermelho/branco, borda e pipocas transbordando. */
function baldePipoca() {
  const g = new THREE.Group();
  const copo = new THREE.Mesh(geo('pipCopo', () => new THREE.CylinderGeometry(.1, .072, .2, 24, 1, true)), new THREE.MeshStandardMaterial({ map: texturaPipoca(), roughness: .6, side: THREE.DoubleSide }));
  copo.position.y = .1; g.add(copo);
  m(geo('pipFundo', () => new THREE.CircleGeometry(.072, 24)), mat('#e11d2a'), 0, .002, 0, g).rotation.x = Math.PI / 2;
  m(geo('pipBorda', () => new THREE.TorusGeometry(.1, .008, 6, 28)), mat('#ffffff', { r: .5 }), 0, .2, 0, g).rotation.x = Math.PI / 2;
  const cores = ['#fff6d8', '#fdf0c2', '#ffe9a8', '#fffaf0', '#f9d77e'];
  for (let i = 0; i < 26; i++) { // pipocas: um monte arredondado saindo do copo
    const a = i * 2.4, rr = i < 10 ? .075 : i < 20 ? .045 : .012, y = .205 + (i < 10 ? .01 : i < 20 ? .045 : .075) + (i % 3) * .006;
    const p = m(esfera(.026 + (i % 4) * .003), mat(cores[i % cores.length], { r: .9 }), Math.cos(a) * rr, y, Math.sin(a) * rr, g);
    p.scale.set(1, .85 + (i % 3) * .1, 1.1);
  }
  return g;
}
function texturaListras() {
  if (texListras) return texListras;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  ['#ec4899', '#facc15', '#3b82f6', '#22c55e'].forEach((cor, i) => { x.fillStyle = cor; x.fillRect(0, i * 16, 64, 16); });
  texListras = new THREE.CanvasTexture(c); texListras.colorSpace = THREE.SRGBColorSpace; return texListras;
}

let texGravata;
function matGravata(cor) { // listras diagonais sutis (textura cinza multiplicada pela cor)
  return geo('mGrav' + cor, () => {
    if (!texGravata) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#9a9a9a'; x.lineWidth = 7;
      for (let i = -64; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); }
      texGravata = new THREE.CanvasTexture(cv); texGravata.colorSpace = THREE.SRGBColorSpace; texGravata.wrapS = texGravata.wrapT = THREE.RepeatWrapping; texGravata.repeat.set(9, 9);
    }
    return new THREE.MeshStandardMaterial({ color: cor, map: texGravata, roughness: .38, metalness: .05 });
  });
}

export class Avatar {
  constructor(cfg) {
    this.cfg = { expressao: 'simpatico', ...cfg };
    this.root = new THREE.Group();
    this.olhar = { y: 0, p: 0 }; this.olharAtual = { y: 0, p: 0 };
    this.fala = 0; this.falaAlvo = 0; this.gesticula = false; this.festa = false; this.ocioso = Math.random() * 10;
    this.proxPiscada = 1 + Math.random() * 3;
    this.construir();
  }
  construir() {
    const c = this.cfg, R = this.root;
    const gen = generoDe(c); this.genero = gen;
    const W = ({ magro: .54, medio: .62, largo: .74 }[c.corpo] || .62) + (gen === 'masculino' ? .05 : gen === 'feminino' ? -.05 : 0);
    const pele = mat(c.pele, { r: .55 }), peleEsc = mat(tom(c.pele, -.08));
    const batina = c.roupa === 'batina', pastor = c.roupa === 'pastor';
    const roupaCor = batina ? '#16161b' : c.corRoupa, camisaCor = batina ? '#b91c1c' : c.corCamisa;
    const temPalito = ['terno', 'terno_aberto', 'blazer', 'saia', 'colete', 'pastor'].includes(c.roupa);
    const saia = c.roupa === 'saia';
    const torsoCor = c.roupa === 'social' ? camisaCor : roupaCor;
    const bracoCor = c.roupa === 'social' || c.roupa === 'colete' ? camisaCor : roupaCor;
    const calca = mat(c.roupa === 'polo' || c.roupa === 'social' ? '#2b2f3a' : tom(roupaCor, -.04));
    const frente = .195;

    // pernas e sapatos
    // cada perna fica num pivô no quadril (para a caminhada automática)
    this.pernas = [];
    for (const s of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(s * W * .22, .88, 0); R.add(pv); this.pernas.push(pv);
      const jo = new THREE.Group(); jo.position.y = -.42; pv.add(jo); pv.userData = { lado: s, jo }; // joelho
      if (saia) { m(rbox(.18, .5, .2, .06), mat('#3a2e33', { r: .5 }), s * W * (.2 - .22), .33 - .46, 0, jo); }
      else { m(rbox(.22, .46, .24, .06), calca, 0, -.21, 0, pv); m(rbox(.215, .4, .235, .06), calca, 0, -.18, 0, jo); }
      m(rbox(.24, .1, .34, .04), mat(saia ? '#2a1418' : '#141414', { r: .35 }), 0, .05 - .46, .04, jo);
    }
    this.andar = 0; this.faseAndar = 0;
    if (saia) { const sa = m(geo('saia' + W, () => new THREE.CylinderGeometry(W * .5, W * .62, .5, 20)), mat(tom(roupaCor, -.03), { r: .7 }), 0, .63, 0, R); sa.scale.z = .68; }
    // tronco
    this.torso = new THREE.Group(); this.torso.position.y = .86; R.add(this.torso);
    m(rbox(W, .76, .38, .1), mat(torsoCor, { r: .7 }), 0, .38, 0, this.torso);
    const gravata = () => { // gravata 3D: colarinho, nó trapezoidal, lâmina com bisel e listras, prendedor
      const ext = (k, pts, o) => geo(k, () => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return new THREE.ExtrudeGeometry(s, { curveSegments: 1, ...o }); });
      const gm = matGravata(c.corGravata);
      const lam = m(ext('gravLam', [[-.024, .69], [.024, .69], [.052, .4], [0, .325], [-.052, .4]], { depth: .012, bevelEnabled: true, bevelThickness: .007, bevelSize: .006, bevelSegments: 3 }), gm, 0, 0, frente + .006, this.torso);
      lam.rotation.x = -.03;
      const no = m(ext('gravNo', [[-.044, .75], [.044, .75], [.027, .672], [-.027, .672]], { depth: .028, bevelEnabled: true, bevelThickness: .012, bevelSize: .009, bevelSegments: 4 }), mat(tom(c.corGravata, -.04), { r: .45 }), 0, 0, frente + .006, this.torso);
      no.castShadow = false;
      m(rbox(.075, .012, .012, .004), mat('#c9ccd3', { r: .25, m: .9 }), 0, .5, frente + .03, this.torso); // prendedor
    };
    if (batina) { // batina: saia longa até os pés, botões e friso vermelhos, faixa na cintura, crucifixo dourado
      const vm = mat('#b91c1c', { r: .5 }), ouro = mat('#e8b923', { r: .25, m: .7 });
      const sa = m(geo('batina' + W, () => new THREE.CylinderGeometry(W * .5, W * .66, .8, 22)), mat(roupaCor, { r: .75 }), 0, .46, 0, R); sa.scale.z = .66;
      m(rbox(.022, .76, .01, .005), vm, 0, .38, frente + .002, this.torso);
      for (let y = .1; y < .72; y += .1) m(esfera(.017), vm, 0, y, frente + .012, this.torso);
      for (let y = .78; y > .1; y -= .13) m(esfera(.017), vm, 0, y, W * .33 + (.86 - y) * .1, R); // botões descendo pela saia
      m(rbox(W + .04, .12, .42, .05), vm, 0, .05, 0, this.torso); // faixa
      for (const dx of [0, .05]) m(rbox(.08, .5 - dx * 2, .03, .01), vm, W * .26 + dx, -.2 - dx, frente + .03 + dx * .2, this.torso); // pontas da faixa
      m(rbox(.26, .05, .3, .02), vm, 0, .77, 0, this.torso); // gola com friso
      for (const s of [-1, 1]) { const ca = m(rbox(.016, .3, .01, .004), ouro, s * .07, .62, frente + .014, this.torso); ca.rotation.z = s * .22; }
      m(rbox(.035, .15, .016, .006), ouro, 0, .42, frente + .02, this.torso); m(rbox(.1, .035, .016, .006), ouro, 0, .45, frente + .02, this.torso);
    }
    if (c.roupa === 'terno' || c.roupa === 'social' || c.roupa === 'colete' || pastor) gravata();
    if (temPalito) { // lapelas e botões
      const lap = mat(tom(roupaCor, -.06));
      for (const s of [-1, 1]) { const l = m(rbox(.07, .36, .02, .01), lap, s * .1, .56, frente + .008, this.torso); l.rotation.z = s * .38; }
      for (const y of [.3, .18]) m(esfera(.018), mat('#222'), 0, y, frente + .01, this.torso);
    }
    if (c.roupa === 'polo') { for (const s of [-1, 1]) { const g = m(rbox(.12, .05, .03, .01), mat(tom(roupaCor, .05)), s * .07, .76, frente - .01, this.torso); g.rotation.z = s * .3; } }
    if (c.roupa === 'social') m(rbox(.1, .08, .01, .005), mat(tom(camisaCor, -.06)), -W * .25, .55, frente + .002, this.torso);
    if (c.broche === 'coxinha') { // broche de coxinha: gota dourado-alaranjada
      const g = new THREE.Group(); g.position.set(W * .24, .6, frente + .025); g.scale.setScalar(1.5); this.torso.add(g);
      const massa = mat('#c8741f', { r: .7, m: .05 }), emp = mat('#e9a54a', { r: .8 });
      m(geo('coxBase', () => new THREE.SphereGeometry(.026, 14, 10)), massa, 0, -.012, 0, g).scale.set(1.15, .85, .8);
      m(geo('coxPonta', () => new THREE.ConeGeometry(.026, .038, 14)), massa, 0, .016, 0, g);
      [[-.012, -.016], [.01, -.006], [.002, -.026], [-.004, .008], [.014, -.022]].forEach(([x, y]) => m(esfera(.0045), emp, x, y, .019, g)); // empanado
    } else if (c.broche === 'fritas') { // broche de batata frita: caixinha vermelha com palitos amarelos
      const g = new THREE.Group(); g.position.set(W * .24, .6, frente + .018); g.scale.setScalar(1.3); this.torso.add(g);
      m(rbox(.05, .045, .016, .005), mat('#dc2626', { r: .5 }), 0, -.012, 0, g);
      const bat = mat('#facc15', { r: .6 });
      [-.016, -.006, .004, .014].forEach((x, i) => { const p = m(rbox(.008, .045, .008, .002), bat, x, .018 + (i % 2) * .006, -.002, g); p.rotation.z = (i - 1.5) * .12; });
    } else if (c.broche) { // broche verde-amarelo
      m(rbox(.07, .05, .015, .008), mat('#16a34a', { r: .3, m: .3 }), W * .24, .6, frente + .01, this.torso);
      const d = m(rbox(.035, .035, .016, .004), mat('#facc15', { r: .3, m: .3 }), W * .24, .6, frente + .016, this.torso); d.rotation.z = Math.PI / 4;
    }
    // braços (pivô no ombro)
    this.bracos = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(s * (W / 2 + .07), .7, 0); this.torso.add(piv);
      const cot = new THREE.Group(); cot.position.y = -.3; piv.add(cot); // cotovelo
      if (c.roupa === 'polo') { m(rbox(.17, .24, .19, .06), mat(roupaCor), 0, -.12, 0, piv); m(rbox(.13, .12, .14, .05), pele, 0, -.26, 0, piv); m(esfera(.068), pele, 0, 0, 0, cot); m(rbox(.13, .28, .14, .05), pele, 0, -.13, 0, cot); }
      else {
        const mb = mat(bracoCor, { r: .7 });
        m(rbox(.17, .32, .19, .06), mb, 0, -.15, 0, piv); m(esfera(.088), mb, 0, 0, 0, cot); m(rbox(.16, .27, .18, .06), mb, 0, -.13, 0, cot);
        m(geo('punho', () => new THREE.CylinderGeometry(.072, .072, .05, 14)), mat(camisaCor), 0, -.25, 0, cot);
      }
      const mao = this.mao(pele, s); mao.position.y = -.28; cot.add(mao);
      // folha de papel (só aparece ao folhear): na esquerda apoiada na palma, na direita presa na pinça
      const folha = s > 0 ? m(rbox(.006, .24, .19, .002), mat('#f8fafc', { r: .9 }), -s * .032, -.1, 0, mao) : m(rbox(.006, .16, .13, .002), mat('#eef2f7', { r: .9 }), -s * .03, -.24, .07, mao);
      folha.visible = false;
      // pipoca (só no emote): balde na palma esquerda (eixo do balde = normal da palma), uma pipoca na pinça direita
      let pipoca;
      if (s > 0) { pipoca = baldePipoca(); pipoca.rotation.z = s * Math.PI / 2; pipoca.position.set(-s * .028, -.07, 0); mao.add(pipoca); }
      else pipoca = m(esfera(.024), mat('#fff6d8', { r: .9 }), -s * .025, -.19, .05, mao);
      pipoca.visible = false;
      if (pastor && s > 0) { // Bíblia Sagrada na mão esquerda (capa preta, páginas brancas, cruz dourada)
        const bi = new THREE.Group(); bi.position.set(-s * .075, -.13, .05); mao.add(bi);
        m(rbox(.1, .32, .24, .015), mat('#151210', { r: .5 }), 0, 0, 0, bi);
        m(rbox(.08, .3, .02, .004), mat('#f5efe0', { r: .9 }), 0, 0, .115, bi);
        const ouro = mat('#f2c230', { r: .3, m: .5, em: '#5a4205', ei: 1 });
        for (const fx of [-.051, .051]) { m(rbox(.008, .17, .035, .003), ouro, fx, 0, 0, bi); m(rbox(.008, .035, .12, .003), ouro, fx, .045, 0, bi); }
        m(rbox(.104, .3, .012, .004), ouro, 0, 0, -.118, bi); // lombada dourada
      }
      piv.userData = { lado: s, cot, mao, folha, pipoca, base: piv.position.clone() }; this.bracos.push(piv);
    }
    // pescoço e cabeça
    this.pescoco = m(geo('pesc', () => new THREE.CylinderGeometry(.085, .095, .14, 14)), peleEsc, 0, .8, 0, this.torso);
    this.cabeca = new THREE.Group(); this.cabeca.position.set(0, .84, 0); this.torso.add(this.cabeca);
    const H = this.cabeca;
    if (gen === 'masculino') { m(rbox(.52, .57, .48, .1), pele, 0, .28, 0, H); m(rbox(.4, .1, .4, .05), pele, 0, .04, .02, H); } // rosto mais quadrado, queixo marcado
    else if (gen === 'feminino') m(rbox(.48, .55, .47, .17), pele, 0, .285, 0, H);
    else m(rbox(.5, .56, .48, .14), pele, 0, .28, 0, H);
    for (const s of [-1, 1]) m(rbox(.06, .13, .09, .03), pele, s * .26, .28, 0, H);
    m(rbox(.075, .1, .08, .035), peleEsc, 0, .25, .255, H); // nariz
    // olhos
    this.olhos = new THREE.Group(); this.olhos.position.set(0, .33, .238); H.add(this.olhos);
    for (const s of [-1, 1]) {
      const o = m(esfera(.042), mat('#151515', { r: .2 }), s * .1, 0, 0, this.olhos); o.scale.set(1, 1.25, .5);
      m(esfera(.012), mat('#ffffff', { em: '#ffffff', ei: .6 }), s * .1 + .014, .02, .02, this.olhos);
      if (gen === 'feminino') for (const k of [0, 1]) { const c2 = m(rbox(.028, .01, .01, .004), mat('#151515'), s * (.125 + k * .012), .045 - k * .012, .012, this.olhos); c2.rotation.z = s * (.5 + k * .35); }
    }
    // sobrancelhas
    const corSob = c.corCabelo === '#e8e8e8' ? '#9a9a9a' : tom(c.corCabelo, -.05);
    this.sobr = [];
    for (const s of [-1, 1]) {
      const sb = m(gen === 'masculino' ? rbox(.14, .042, .03, .014) : gen === 'feminino' ? rbox(.12, .024, .03, .01) : rbox(.13, .032, .03, .012), mat(corSob), s * .1, .43, .243, H);
      const e = c.expressao;
      sb.rotation.z = e === 'bravo' ? s * .28 : e === 'serio' ? 0 : e === 'confiante' ? (s > 0 ? -.18 : 0) : s * -.12;
      if (e === 'confiante' && s > 0) sb.position.y += .025;
      if (c.sobrancelha === 'grossa') sb.scale.set(1.15, 1.9, 1.2); // opcional: sobrancelhas marcantes
      this.sobr.push(sb);
    }
    // boca
    this.boca = new THREE.Group(); this.boca.position.set(0, .14, .243); H.add(this.boca);
    this.bocaFechada = new THREE.Group(); this.boca.add(this.bocaFechada);
    const corBoca = gen === 'feminino' ? '#a3354f' : '#5a1f1f';
    if (c.expressao === 'simpatico' || c.expressao === 'confiante') {
      const t = new THREE.Mesh(geo('sorriso', () => new THREE.TorusGeometry(.065, .013, 6, 16, Math.PI)), mat(corBoca));
      t.rotation.z = Math.PI; t.position.y = .045; t.scale.set(1, c.expressao === 'confiante' ? .55 : .8, 1);
      if (c.expressao === 'confiante') { t.rotation.z = Math.PI + .2; t.position.x = .01; }
      if (c.sorriso === 'largo') t.scale.set(1.4, 1.1, 1); // opcional: sorriso largo
      this.bocaFechada.add(t);
    } else {
      const b = m(rbox(.13, .025, .02, .008), mat(corBoca), 0, 0, 0, this.bocaFechada);
      if (c.expressao === 'bravo') { b.scale.x = .85; }
    }
    this.bocaAberta = m(rbox(.12, .085, .02, .03), mat('#3a0f12'), 0, 0, 0, this.boca);
    m(rbox(.08, .02, .01, .008), mat('#f2f2f2'), 0, .03, .008, this.bocaAberta);
    this.bocaAberta.visible = false;
    // sorriso largo / gargalhada (emotes e danças): meia-lua aberta com dentes em cima e língua embaixo
    this.bocaSorriso = new THREE.Group(); this.boca.add(this.bocaSorriso); this.bocaSorriso.position.set(0, .03, .004);
    m(geo('meiaLua', () => new THREE.CircleGeometry(.075, 20, Math.PI, Math.PI)), mat('#3a0f12'), 0, 0, 0, this.bocaSorriso);
    m(rbox(.12, .024, .01, .008), mat('#f2f2f2'), 0, -.012, .004, this.bocaSorriso);
    m(geo('lingua', () => new THREE.CircleGeometry(.028, 12, 0, Math.PI)), mat('#c2455a'), 0, -.06, .003, this.bocaSorriso);
    this.bocaSorriso.visible = false;

    this.cabelo(H, c);
    this.barba(H, c);
    this.oculos(H, c);
    this.chapeu(H, c);
    this.extra(H, c);
    if (c.brinco) for (const s of [-1, 1]) m(esfera(.022), mat('#e8c15a', { r: .25, m: .8 }), s * .27, .2, .02, H);

    // pose inicial
    this.bracos.forEach(b => { const s = b.userData.lado; b.rotation.set(REP[0], s * REP[3], s * REP[1]); b.userData.cot.rotation.x = REP[2]; b.userData.mao.rotation.y = s * REP[4]; this.dedos(b, MAOS.relax, 1); });
    this.root.traverse(o => { if (o.isMesh) o.userData.avatar = this; });
  }
  /** Mão com palma, 4 dedos (2 falanges) e polegar; a palma fica voltada para o corpo. */
  mao(pele, s) {
    const g = new THREE.Group(), dedos = [];
    m(rbox(.05, .12, .125, .022), pele, 0, -.06, 0, g); // palma fina
    m(rbox(.046, .05, .1, .02), pele, 0, -.012, -.005, g); // pulso
    [.045, .015, -.015, -.045].forEach((z, i) => {
      const k = [.92, 1, .92, .78][i], c1 = .055 * k, c2 = .045 * k; // médio maior, mínimo menor
      const d1 = new THREE.Group(); d1.position.set(0, -.112 + (i === 3 ? .008 : 0), z); g.add(d1);
      m(rbox(.04, c1 + .01, .026, .012), pele, 0, -c1 / 2, 0, d1);
      const d2 = new THREE.Group(); d2.position.y = -c1; d1.add(d2);
      m(rbox(.037, c2 + .006, .024, .011), pele, 0, -c2 / 2, 0, d2);
      dedos.push([d1, d2]);
    });
    // polegar (2 segmentos), nasce perto do pulso, na lateral do indicador
    const pol = new THREE.Group(); pol.position.set(-s * .006, -.03, .055); g.add(pol);
    m(rbox(.042, .05, .04, .016), pele, 0, -.025, 0, pol);
    const pol2 = new THREE.Group(); pol2.position.y = -.048; pol.add(pol2);
    m(rbox(.038, .044, .036, .015), pele, 0, -.02, 0, pol2);
    g.userData = { dedos, pol, pol2 }; return g;
  }
  /** Aplica um formato de mão (MAOS) com suavização k. */
  dedos(b, f, k) {
    const s = b.userData.lado, { dedos, pol, pol2 } = b.userData.mao.userData, l = f.l ?? .5, lat = f.lat || 0, f2 = f.f2 ?? 1;
    const ap = (o, eixo, v) => { o.rotation[eixo] += (v - o.rotation[eixo]) * k; };
    dedos.forEach(([d1, d2], i) => {
      const c = f.c[i];
      ap(d1, 'z', -s * c); ap(d2, 'z', -s * c * f2);
      ap(d1, 'x', [-.09, -.03, .03, .09][i] * l - lat); ap(d2, 'x', -lat);
    });
    const [px, pz, pc = .2] = f.p;
    ap(pol, 'x', px); ap(pol, 'z', -s * pz); ap(pol2, 'z', -s * pc);
  }
  cabelo(H, c) {
    const mc = mat(c.corCabelo, { r: .8 });
    const topo = () => c.chapeu === 'bone' ? null : m(rbox(.54, .17, .52, .08), mc, 0, .55, -.005, H); // sob o boné o topo atravessaria o domo
    const nuca = (alt = .3) => m(rbox(.53, alt, .13, .06), mc, 0, .52 - alt / 2, -.2, H);
    const costeletas = () => { for (const s of [-1, 1]) m(rbox(.04, .14, .12, .015), mc, s * .255, .38, -.03, H); };
    switch (c.cabelo) {
      case 'curto': topo(); nuca(); costeletas(); break;
      case 'repartido': topo(); nuca(); costeletas(); { const p = m(rbox(.32, .09, .52, .045), mc, -.1, .63, 0, H); p.rotation.z = .18; } break;
      case 'topete': topo(); nuca(); costeletas(); { const t = m(rbox(.38, .16, .2, .07), mc, 0, .63, .16, H); t.rotation.x = -.35; } break;
      case 'careca': for (const s of [-1, 1]) m(rbox(.04, .11, .26, .02), mc, s * .255, .3, -.07, H); m(rbox(.44, .09, .05, .02), mc, 0, .24, -.235, H); break;
      case 'calvo': for (const s of [-1, 1]) m(rbox(.06, .2, .34, .025), mc, s * .255, .38, -.05, H); m(rbox(.48, .2, .08, .03), mc, 0, .38, -.23, H);
        m(rbox(.2, .05, .2, .02), mc, 0, .565, .05, H); break;
      case 'longo': topo(); m(rbox(.56, .78, .15, .07), mc, 0, .2, -.2, H); for (const s of [-1, 1]) m(rbox(.09, .6, .38, .04), mc, s * .27, .22, -.05, H);
        m(rbox(.5, .08, .1, .03), mc, 0, .51, .2, H); break;
      case 'chanel': topo(); m(rbox(.56, .44, .15, .07), mc, 0, .3, -.2, H); for (const s of [-1, 1]) m(rbox(.09, .42, .42, .04), mc, s * .275, .32, -.02, H);
        { const f = m(rbox(.32, .09, .1, .03), mc, -.07, .52, .2, H); f.rotation.z = .2; } break;
      case 'coque': topo(); nuca(.22); m(esfera(.12), mc, 0, .62, -.22, H); break;
      case 'cacheado': nuca(.34);
        for (let anel = 0; anel < 3; anel++) {
          const phi = .25 + anel * .42, n = 5 + anel * 4;
          for (let i = 0; i < n; i++) {
            const th = i / n * Math.PI * 2 + anel; const x = Math.sin(phi) * Math.cos(th) * .27, z = Math.sin(phi) * Math.sin(th) * .27 - .02, y = .5 + Math.cos(phi) * .12;
            if (z > .17 && y < .58) continue;
            m(esfera(.095), mc, x, y, z, H);
          }
        }
        m(esfera(.11), mc, 0, .6, 0, H); break;
      case 'afro': { const a = m(esfera(.37), mc, 0, .56, -.09, H); a.scale.set(1.05, .92, 1); } break;
    }
  }
  barba(H, c) {
    if (c.barba === 'nenhuma') return;
    const mb = mat(c.corCabelo, { r: .9, op: c.barba === 'rala' ? .65 : undefined });
    const bigode = (l = .17) => { const b = m(rbox(l, .045, .05, .02), mb, 0, .185, .245, H); return b; };
    if (c.barba === 'bigode') { bigode(.2); return; }
    if (c.barba === 'cavanhaque') { bigode(.15); m(rbox(.14, .11, .07, .03), mb, 0, .055, .225, H); return; }
    m(rbox(.5, .13, .22, .06), mb, 0, .04, .13, H);
    for (const s of [-1, 1]) m(rbox(.065, .26, .22, .03), mb, s * .225, .16, .1, H);
    bigode();
  }
  oculos(H, c) {
    if (c.oculos === 'nenhum') return;
    if (['aviador', 'pixel', 'folha', 'coracao', 'estrela'].includes(c.oculos)) return this.oculosComicos(H, c.oculos);
    const g = new THREE.Group(); g.position.set(0, .33, .262); H.add(g);
    const armacao = mat(c.oculos === 'escuro' ? '#0d0d0d' : '#1d1d1d', { r: .3, m: .4 });
    const lente = c.oculos === 'escuro' ? mat('#0b0b0b', { r: .1, m: .5 }) : mat('#cfe6ff', { r: .05, op: .25 });
    for (const s of [-1, 1]) {
      if (c.oculos === 'redondo') { const t = m(geo('aro', () => new THREE.TorusGeometry(.06, .009, 6, 20)), armacao, s * .1, 0, 0, g); t.castShadow = false;
        const l = m(geo('lenteR', () => new THREE.CircleGeometry(.058, 18)), lente, s * .1, 0, -.002, g); l.castShadow = false; }
      else { m(rbox(.15, .1, .012, .02), armacao, s * .1, 0, -.003, g); m(rbox(.13, .08, .014, .015), lente, s * .1, 0, 0, g); }
      m(rbox(.012, .012, .24, .004), armacao, s * .175, .01, -.12, g);
    }
    m(rbox(.06, .014, .014, .005), armacao, 0, .015, 0, g);
  }
  oculosComicos(H, tipo) {
    const g = new THREE.Group(); g.position.set(0, .33, .266); H.add(g);
    const preto = mat('#0d0d0d', { r: .3, m: .4 }), ouro = mat('#d4a63a', { r: .25, m: .9 });
    const haste = mt => { for (const s of [-1, 1]) m(rbox(.012, .012, .24, .004), mt, s * .18, .01, -.12, g); };
    const forma = (pts, cor, esc = 1, z = 0, op) => { // lente a partir de um contorno 2D
      const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x * esc, y * esc) : sh.moveTo(x * esc, y * esc)));
      return new THREE.Mesh(new THREE.ShapeGeometry(sh), mat(cor, { r: .2, m: .2, op })).translateZ(z);
    };
    if (tipo === 'pixel') { // óculos "pixelados" de meme
      m(rbox(.4, .03, .02, .002), preto, 0, .035, 0, g);
      for (const s of [-1, 1]) {
        [[.15, .015, 0], [.13, -.012, -.01 * s], [.09, -.038, -.03 * s]].forEach(([w, y, dx]) => m(rbox(w, .028, .02, .002), preto, s * .1 + dx, y, 0, g));
        m(rbox(.02, .02, .005, .001), mat('#ffffff'), s * .1 - .035, .015, .012, g); m(rbox(.02, .02, .005, .001), mat('#ffffff'), s * .1 - .012, -.012, .012, g);
      }
      haste(preto); return;
    }
    if (tipo === 'aviador') {
      for (const s of [-1, 1]) {
        const l = forma([[-.07, .045], [.07, .045], [.065, -.02], [.03, -.06], [-.03, -.06], [-.065, -.02]], '#3a2410', 1, 0, .88); l.position.x = s * .1; g.add(l);
        const a = new THREE.Mesh(geo('aroAv', () => new THREE.TorusGeometry(.068, .007, 6, 24)), ouro); a.position.set(s * .1, 0, .002); a.scale.y = .78; g.add(a);
      }
      m(rbox(.07, .01, .01, .003), ouro, 0, .03, 0, g); haste(ouro); return;
    }
    if (tipo === 'coracao' || tipo === 'estrela') {
      const pts = [];
      if (tipo === 'coracao') for (let k = 0; k <= 40; k++) { const t = k / 40 * Math.PI * 2; pts.push([16 * Math.sin(t) ** 3 / 16 * .075, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 * .075]); }
      else for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? .035 : .085; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      const cor = tipo === 'coracao' ? '#ff2d6f' : '#ffd23f', borda = tipo === 'coracao' ? '#9d0b3a' : '#b7791f';
      for (const s of [-1, 1]) { const b = forma(pts, borda, 1.18, -.002); b.position.x = s * .1; g.add(b); const l = forma(pts, cor, 1, .002, .85); l.position.x = s * .1; g.add(l); }
      m(rbox(.05, .012, .01, .004), mat(borda), 0, .02, 0, g); haste(mat(borda)); return;
    }
    if (tipo === 'folha') { // lente verde com folha desenhada
      const tex = texturaFolha();
      for (const s of [-1, 1]) {
        const l = new THREE.Mesh(geo('lenteF', () => new THREE.CircleGeometry(.065, 24)), new THREE.MeshStandardMaterial({ map: tex, roughness: .2, transparent: true })); l.position.set(s * .1, 0, .002); g.add(l);
        m(geo('aroF', () => new THREE.TorusGeometry(.066, .01, 6, 24)), mat('#14532d', { r: .3 }), s * .1, 0, .002, g);
      }
      m(rbox(.07, .012, .012, .004), mat('#14532d'), 0, .015, 0, g); haste(mat('#14532d'));
    }
  }
  extra(H, c) {
    const T = this.torso, fr = .2;
    switch (c.extra) {
      case 'faixa': { // faixa presidencial verde e amarela, do ombro ao quadril
        const f = new THREE.Group(); f.position.set(0, .42, fr + .012); f.rotation.z = -.82; T.add(f);
        m(rbox(.13, 1.0, .018, .006), mat('#15803d', { r: .6 }), 0, 0, 0, f);
        m(rbox(.045, 1.0, .02, .006), mat('#facc15', { r: .5 }), 0, 0, .002, f);
        m(geo('brasao', () => new THREE.CylinderGeometry(.05, .05, .02, 16)), mat('#facc15', { r: .3, m: .6 }), 0, -.36, .015, f).rotation.x = Math.PI / 2;
        break;
      }
      case 'corrente': {
        const ouro = mat('#e3b341', { r: .2, m: 1 });
        const t = m(geo('corr', () => new THREE.TorusGeometry(.15, .018, 8, 30)), ouro, 0, .66, .1, T); t.rotation.x = -1.15; t.scale.y = 1.3;
        m(rbox(.07, .09, .02, .01), ouro, 0, .46, fr + .02, T);
        break;
      }
      case 'charuto':
        m(geo('char', () => new THREE.CylinderGeometry(.019, .019, .17, 10)), mat('#6b3e1e', { r: .9 }), .1, .125, .3, H).rotation.set(.25, 0, 1.25);
        m(esfera(.021), mat('#ff6a00', { em: '#ff3d00', ei: 1.5 }), .18, .105, .33, H);
        break;
      case 'nariz': m(esfera(.055), mat('#e11d2e', { r: .3 }), 0, .25, .29, H); break;
    }
  }
  chapeu(H, c) {
    if (c.chapeu === 'nenhum') return;
    if (c.chapeu === 'cartola') {
      const preto = mat('#121212', { r: .5 });
      m(geo('cart', () => new THREE.CylinderGeometry(.21, .21, .36, 24)), preto, 0, .76, -.01, H);
      m(geo('abaC', () => new THREE.CylinderGeometry(.36, .36, .025, 28)), preto, 0, .58, -.01, H);
      m(geo('fitaC', () => new THREE.CylinderGeometry(.212, .212, .06, 24)), mat('#b91c1c'), 0, .62, -.01, H);
      return;
    }
    if (c.chapeu === 'coroa') {
      const ouro = mat('#f5c542', { r: .2, m: 1 });
      m(geo('coroa', () => new THREE.CylinderGeometry(.24, .23, .12, 24, 1, true)), ouro, 0, .63, -.01, H).material.side = THREE.DoubleSide;
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; m(geo('ponta', () => new THREE.ConeGeometry(.04, .1, 8)), ouro, Math.sin(a) * .23, .73, Math.cos(a) * .23 - .01, H); }
      [['#dc2626', 0], ['#2563eb', Math.PI / 2], ['#16a34a', -Math.PI / 2]].forEach(([cor, a]) => m(esfera(.025), mat(cor, { r: .1, m: .3 }), Math.sin(a) * .24, .63, Math.cos(a) * .24 - .01, H));
      return;
    }
    if (c.chapeu === 'festa') {
      const cone = m(geo('festa', () => new THREE.ConeGeometry(.17, .42, 24)), new THREE.MeshStandardMaterial({ map: texturaListras(), roughness: .6 }), .05, .78, 0, H); cone.rotation.z = -.2;
      m(esfera(.05), mat('#facc15'), .1, 1.0, 0, H);
      return;
    }
    if (c.chapeu === 'padre') { // saturno: copa redonda baixa e aba larga e chata, feltro preto
      const feltro = mat('#141418', { r: .85 });
      const copa = m(geo('satCopa', () => new THREE.SphereGeometry(.24, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2)), feltro, 0, .57, -.01, H); copa.scale.set(1, .78, 1);
      m(geo('satAba', () => new THREE.CylinderGeometry(.47, .47, .025, 32)), feltro, 0, .575, -.01, H);
      m(geo('satFita', () => new THREE.CylinderGeometry(.243, .243, .035, 22)), mat('#2a2a30', { r: .5 }), 0, .6, -.01, H);
      return;
    }
    if (c.chapeu === 'palhaco') { // peruca colorida
      const cores = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'];
      for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; const lado = Math.abs(Math.sin(a)) > .5 ? .34 : .26; m(esfera(.12), mat(cores[k % 6], { r: .9 }), Math.sin(a) * lado, .5 + Math.abs(Math.cos(a * 1.5)) * .12, Math.cos(a) * .22 - .05, H); }
      return;
    }
    if (c.chapeu === 'bone') {
      const cor = mat(c.corGravata, { r: .8 });
      const d = m(geo('domo', () => new THREE.SphereGeometry(.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), cor, 0, .52, -.01, H); d.scale.set(1.05, .7, 1.05);
      m(rbox(.32, .025, .22, .01), cor, 0, .53, .31, H);
    } else if (c.chapeu === 'chapeu') {
      const palha = mat('#d8b46a', { r: .9 });
      m(geo('copa', () => new THREE.CylinderGeometry(.22, .25, .22, 20)), palha, 0, .68, -.01, H);
      m(geo('aba', () => new THREE.CylinderGeometry(.46, .46, .025, 28)), palha, 0, .58, -.01, H);
      m(geo('fita', () => new THREE.CylinderGeometry(.252, .252, .05, 20)), mat('#3b2416'), 0, .6, -.01, H);
    } else if (c.chapeu === 'boina') {
      const b = m(esfera(.3), mat('#1f2937', { r: .9 }), .02, .6, -.02, H); b.scale.set(1.02, .34, 1); b.rotation.z = .18;
    }
  }

  setOlhar(y, p) { this.olhar.y = y; this.olhar.p = p; }
  setFala(v) { this.falaAlvo = Math.max(this.falaAlvo, v); }
  ocultarCabeca(v) { this.cabeca.visible = this.pescoco.visible = !v; }

  update(dt, t) {
    this.ocioso += dt;
    // cabeça segue o olhar (com limites) + leve balanço
    const ly = Math.max(-1.25, Math.min(1.25, this.olhar.y)), lp = Math.max(-.6, Math.min(.5, this.olhar.p));
    const k = 1 - Math.exp(-dt * 6);
    this.olharAtual.y += (ly - this.olharAtual.y) * k; this.olharAtual.p += (lp - this.olharAtual.p) * k;
    this.cabeca.rotation.order = 'YXZ';
    this.cabeca.rotation.y = this.olharAtual.y + Math.sin(this.ocioso * .7) * .03;
    this.cabeca.rotation.x = -this.olharAtual.p + Math.sin(this.ocioso * .9) * .015;
    this.cabeca.rotation.z = Math.sin(this.ocioso * .5) * .02;
    this.torso.rotation.y = this.olharAtual.y * .18;
    // respiração
    this.torso.scale.y = 1 + Math.sin(this.ocioso * 2.1) * .008;
    // piscar
    this.proxPiscada -= dt;
    let sy = 1;
    if (this.proxPiscada < 0) { sy = .1; if (this.proxPiscada < -.12) this.proxPiscada = 2 + Math.random() * 4; }
    this.olhos.scale.y = sy;
    // boca
    this.fala += (this.falaAlvo - this.fala) * (1 - Math.exp(-dt * 18));
    this.falaAlvo = Math.max(0, this.falaAlvo - dt * 2.5);
    const aberta = this.fala > .06;
    this.bocaAberta.visible = aberta; this.bocaFechada.visible = !aberta;
    if (aberta) this.bocaAberta.scale.y = .35 + this.fala * (.7 + .5 * Math.abs(Math.sin(t * 17)));
    // animação ativa: dança da vitória (contínua) ou emote/folhear (por alguns segundos)
    if (this.anim && this.anim.ini == null) this.anim.ini = t;
    if (this.anim && t - this.anim.ini > this.anim.dur) this.anim = null;
    const nomeAnim = this.festa ? (typeof this.festa === 'string' ? this.festa : 'festa') : this.anim?.nome;
    const u = this.festa ? t : t - (this.anim?.ini ?? t);
    const pose = nomeAnim ? POSES[nomeAnim]?.(u) : null;
    // expressão pedida pela pose: olhos fechados e/ou boca bem aberta (bocejo)
    if (pose?.olhosFechados) this.olhos.scale.y = .1;
    if (pose?.boca > .05) { this.bocaAberta.visible = true; this.bocaFechada.visible = false; this.bocaAberta.scale.set(1 - pose.boca * .2, 1 + pose.boca * 1.4, 1); this.bocaAberta.position.y = -pose.boca * .035; }
    else { this.bocaAberta.scale.x = 1; this.bocaAberta.position.y = 0; }
    // sorriso largo (emotes/danças) e gargalhada (abre e fecha rápido, olhos apertados)
    const sorr = pose?.boca > .05 ? 0 : pose?.riso ? .7 + .45 * abs(sen(t * 19)) : (pose?.sorriso || 0) * (aberta ? .55 + this.fala * .7 : 1);
    this.bocaSorriso.visible = sorr > .05;
    if (sorr > .05) { this.bocaAberta.visible = this.bocaFechada.visible = false; this.bocaSorriso.scale.set(1, sorr, 1); }
    if (pose?.riso) this.olhos.scale.y = Math.min(this.olhos.scale.y, .3);
    const kb = 1 - Math.exp(-dt * (pose ? 12 : 5));
    // corpo (pulos, ginga)
    // caminhada: pernas e braços balançam alternados, tronco sobe e desce a cada passo
    const an = this.andar; this.faseAndar += dt * 7.5 * an;
    const ph = this.faseAndar;
    const kp = 1 - Math.exp(-dt * 14);
    for (const pv of this.pernas) { // caminhada ou passos de dança (quadril x, joelho, abertura)
      const s = pv.userData.lado, pp = pose && (s > 0 ? pose.pernaE : pose.pernaD);
      const [hx, jx, hz] = pp || [Math.sin(ph) * .6 * s * an, Math.max(0, -Math.sin(ph) * s) * .85 * an, 0];
      pv.rotation.x += (hx - pv.rotation.x) * kp; pv.rotation.z += (s * hz - pv.rotation.z) * kp;
      pv.userData.jo.rotation.x += (jx - pv.userData.jo.rotation.x) * kp;
    }
    const alvoY = .86 + (pose?.pulo || 0) + Math.abs(Math.cos(ph)) * .035 * an, alvoRotY = this.olharAtual.y * .18 + (pose?.giro || 0), alvoRotZ = pose?.inclina || 0;
    this.torso.position.y += (alvoY - this.torso.position.y) * kb;
    this.torso.rotation.y += (alvoRotY - this.torso.rotation.y) * kb;
    this.torso.rotation.z += (alvoRotZ - this.torso.rotation.z) * kb;
    if (this.empurra !== undefined) this.torso.rotation.x += ((this.empurra ? .16 : 0) - this.torso.rotation.x) * kb; // inclina o tronco ao empurrar
    if (pose?.cabeca !== undefined) this.cabeca.rotation.x = pose.cabeca;
    if (pose?.cabecaZ !== undefined) this.cabeca.rotation.z = pose.cabecaZ;
    // braços
    for (const b of this.bracos) {
      const s = b.userData.lado;
      let [rx, rz, cot, ry, gm, mao, om = 0] = this.posePe ? REP_PE : REP;
      if (this.empurra && !pose) { rx = -.95; rz = .1; cot = -.3; ry = 0; gm = 0; mao = 'aberta'; } // empurrando algo (equipe de produção)
      else if (an > .05 && !pose) { rx = -.15 - Math.sin(ph) * .45 * s * an; rz = .06; cot = -.35; ry = 0; gm = 0; }
      else if (this.cruza && !pose) [rx, rz, cot, ry, gm, mao, om] = s > 0 ? Q.cruzaE : Q.cruzaD; // parada de braços cruzados
      else if (pose) { const p0 = s > 0 ? pose.esq : pose.dir, p = this.posePe && p0 === REP ? REP_PE : p0; if (p) [rx, rz, cot = -.25, ry = 0, gm = 0, mao = 'relax', om = 0] = p; }
      else if (this.gesticula && this.fala > .05) [rx, rz, cot, ry, gm, mao, om] = lerpQ(REP, lerpQ(Q.falaB, Q.falaA, (1 + Math.sin(t * 3.1 + s * 1.7)) / 2), Math.min(1, this.fala * 1.5));
      const bs = b.userData.base, ko = kb;
      b.position.x += (bs.x - s * .03 * om - b.position.x) * ko; b.position.y += (bs.y + .03 * om - b.position.y) * ko; b.position.z += (bs.z + .1 * om - b.position.z) * ko;
      // ângulos suavizados guardados à parte; nos emotes, o braço gira no eixo vertical para compensar a largura
      // do ombro (poses calculadas com ombro em x=.38), assim a mão cai no mesmo lugar em corpos magros/largos
      const ud = b.userData, r = ud.r ||= b.rotation.clone();
      r.x += (rx - r.x) * kb; r.z += (s * rz - r.z) * kb; r.y += (s * ry - r.y) * kb;
      ud.comp = (ud.comp || 0) + ((pose ? s * (.38 - Math.abs(bs.x)) / .45 : 0) - (ud.comp || 0)) * kb;
      b.quaternion.setFromEuler(r).premultiply(_qY.setFromAxisAngle(_eixoY, ud.comp));
      const { cot: c, mao: mo } = b.userData;
      c.rotation.x += (cot - c.rotation.x) * kb; mo.rotation.y += (s * gm - mo.rotation.y) * kb;
      this.dedos(b, MAOS[mao] || MAOS.relax, kb);
      b.userData.folha.visible = !!pose?.folha;
      const pip = b.userData.pipoca; pip.visible = !!pose?.pipoca && (s > 0 || (pose.pipoca > 1.25 && pose.pipoca < 1.95));
      if (s > 0 && pip.visible) pip.quaternion.copy(mo.getWorldQuaternion(_qA).invert().multiply(this.torso.getWorldQuaternion(_qB))); // balde sempre em pé // a pipoca da pinça aparece depois de pegar
    }
    if (pose?.coracoes || this.cors?.length) this.coracoes(dt, pose?.coracoes && t - (this.anim?.ini ?? t) > .4); // espera as mãos chegarem
  }
  /** Coraçõezinhos que saem das mãos no emote "coração": sobem, balançam e somem. */
  coracoes(dt, emitir) {
    this.cors ||= [];
    if (emitir && (this.tCor = (this.tCor || 0) - dt) <= 0) {
      this.tCor = .16;
      const [a, b] = this.bracos.map(br => br.userData.mao.getWorldPosition(new THREE.Vector3()));
      const p = this.root.worldToLocal(a.add(b).multiplyScalar(.5)); p.y += .11; p.z += .12; p.x += (Math.random() - .5) * .06; // centro das palmas, à frente
      const me = new THREE.Mesh(geo('coracao', () => {
        const s = new THREE.Shape(); s.moveTo(0, -.5); s.bezierCurveTo(-.15, -.3, -.6, -.1, -.5, .2); s.bezierCurveTo(-.4, .5, -.05, .5, 0, .25); s.bezierCurveTo(.05, .5, .4, .5, .5, .2); s.bezierCurveTo(.6, -.1, .15, -.3, 0, -.5);
        return new THREE.ShapeGeometry(s, 8);
      }), new THREE.MeshBasicMaterial({ color: Math.random() < .25 ? '#ff6fa8' : '#ff2d55', transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      me.position.copy(p); me.userData = { v: new THREE.Vector3((Math.random() - .5) * .35, .55 + Math.random() * .25, .25 + Math.random() * .15), vida: 0, tam: .09 + Math.random() * .06, fase: Math.random() * 6 };
      this.root.add(me); this.cors.push(me);
    }
    this.cors = this.cors.filter(c => {
      const u = c.userData; u.vida += dt; const k = u.vida / 1.5;
      if (k >= 1) { this.root.remove(c); c.material.dispose(); return false; }
      c.position.addScaledVector(u.v, dt); c.position.x += Math.sin(u.vida * 6 + u.fase) * .004;
      c.rotation.z = Math.sin(u.vida * 5 + u.fase) * .3; c.scale.setScalar(u.tam * Math.min(1, k * 6)); c.material.opacity = 1 - k * k;
      return true;
    });
  }
  /** Toca uma animação curta (emote, provocação, folhear anotações). */
  animar(nome, dur = 2.6) { if (POSES[nome]) this.anim = { nome, dur, ini: null }; }
}

// ---------- poses das animações ----------
// cada pose recebe u (segundos desde o início) e devolve:
// braço esq/dir [rot. x, abertura z, cotovelo, giro do braço, giro da mão, formato da mão (MAOS)],
// pernaE/pernaD [quadril x, joelho, abertura], pulo, giro (rot. y), inclina (rot. z) e cabeca.
// Ângulos de rosto (facepalm, continência, boca) calculados para a mão ficar À FRENTE do rosto, sem atravessar.
const sen = Math.sin, abs = Math.abs, pos = v => Math.max(0, v);
// formatos de mão: c = curvatura dos dedos (indicador→mínimo), f2 = fator da 2ª falange, l = leque (abertura),
// lat = curva lateral (para o lado do polegar), p = polegar [frente(-)/recolhe(+), para dentro, dobra da ponta]
const MAOS = {
  relax: { c: [.25, .35, .45, .55], p: [-.5, .3, .2], l: .6 },
  aberta: { c: [.03, .03, .05, .08], p: [-.95, -.15, 0], l: 1.4 },
  reta: { c: [.04, .04, .04, .04], p: [-.15, .35, 0], l: 0 },
  punho: { c: [1.6, 1.6, 1.6, 1.6], f2: 1.35, p: [-.35, 1, .5], l: 0 },
  joinha: { c: [1.6, 1.6, 1.6, 1.6], f2: 1.35, p: [-1.65, -.1, 0], l: 0 },
  aponta: { c: [0, 1.6, 1.6, 1.6], f2: 1.35, p: [-.35, 1, .5], l: 0 },
  paz: { c: [0, 0, 1.6, 1.6], f2: 1.35, p: [-.35, 1, .5], l: 1.6 },
  coracao: { c: [.05, .05, .05, .05], lat: .28, p: [-1.57, 0, .05], l: 0 },
  concha: { c: [.6, .65, .7, .75], p: [-.6, .2, .1], l: .3 },
  pinca: { c: [.75, .9, 1.1, 1.25], p: [-.9, .75, .3], l: .2 },
  cobre: { c: [.25, .25, .3, .3], p: [-.3, .2, 0], l: .15 }, // dedos juntos e levemente curvos (cobrir rosto/boca)
  apoio: { c: [.15, .22, .3, .38], p: [-.5, .3, .2], l: .5 }, // repouso no púlpito
  fala: { c: [.05, .06, .1, .15], p: [-.85, -.1, 0], l: .8 },
  solta: { c: [.12, .12, .15, .2], p: [-1.2, -.5, 0], l: 2.4 },
  faca: { c: [0, 0, 0, 0], p: [-.1, .5, 0], l: 0 },
};
// poses-chave resolvidas por IK (script de revisão) — mão sempre fora da cabeça/tronco.
// [rot x, abertura z, cotovelo, giro do braço, giro da mão, mão, avanço do ombro 0..1]
const Q = {
  rep: [-.9, .12, -.27, -.42, -1.12, 'apoio'],
  cruzaE: [-.18, .24, -1.62, -1.3, 0, 'relax', .1], cruzaD: [-.26, .24, -1.85, -1.4, 0, 'relax', .1],
  falaB: [-.34, .12, -1.31, -.19, 1.22, 'fala', .09], falaA: [-.48, .11, -1.73, .11, 1.06, 'fala', .13],
  joinha: [-.54, .69, -1.03, -.58, .84, 'joinha', .1],
  coracao: [-1.12, -.21, -1.46, -.61, -2, 'coracao', 1],
  continencia: [-1.08, 1.71, -1.06, -.93, 2, 'reta', .53],
  facepalm: [-1.4, -.58, -1.23, -.08, .99, 'cobre', .97],
  mic1: [-.27, 1.59, -.98, -1.33, 1.76, 'punho'], mic2: [-.78, .34, -.58, -.89, -.71, 'solta'],
  bocejoD: [-2.02, -.56, -1.21, -.57, 1.36, 'cobre', .74], bocejoE: [-.75, 2.39, -.28, -1.19, -.21, 'aberta'],
  pipE: [-.16, .59, -.91, -1.6, 2.39, 'concha', .81], pipBaixo: [-2.01, -.8, -.59, -.77, -.41, 'pinca', .27], pipBoca: [-1.4, -.61, -1.35, -.48, .99, 'pinca', .52],
  folE: [-1.1, -.41, -.71, -1.04, 2.11, 'reta', .83], folA: [-1.79, -.6, -.81, -1.59, -.21, 'pinca', 0], folB: [-1.6, -.77, -.45, -.8, -1.24, 'pinca', .61],
  relE: [-1.44, -.8, -.87, -1.29, -.91, 'relax', 1], relD: [-1.51, -.43, -1.2, -1.6, -.39, 'aponta', .15],
  festa: [-1.89, 1.33, -.3, -.65, .68, 'punho'], festaB: [-1.2, 1.5, -1.2, -.65, .68, 'punho'],
  carnaval: [-2.08, 1.12, -.3, -.71, -.84, 'aberta'],
  sambaA: [-1.83, 1.24, -.77, .07, -.96, 'aberta', .32], sambaB: [-1.17, .57, -1.62, 1.21, -.88, 'aberta', .38],
  disco: [-3.14, .81, 0, 0, .34, 'aponta'], discoB: [-.35, -.45, 0, 0, 0, 'aponta'],
  passA: [-.59, 1.19, -1.44, -.12, 1.1, 'punho'], passB: [-.4, .55, -.8, 0, 0, 'punho'],
};
const REP = Q.rep; // braço em repouso (palma para baixo, apoiada no púlpito)
const REP_PE = [-.08, .07, -.2, 0, 0, 'relax']; // em pé sem púlpito (posePe: vitrine, demo da loja): braços soltos ao lado do corpo
const nq = x => [x[0], x[1], x[2] ?? -.25, x[3] ?? 0, x[4] ?? 0, x[5] ?? 'relax', x[6] ?? 0];
function lerpQ(a, b, k) { const B = nq(b); return nq(a).map((v, i) => i === 5 ? (k < .5 ? v : B[i]) : v + (B[i] - v) * k); }
const onda = (u, f, fase = 0) => (1 - Math.cos(u * f + fase)) / 2; // 0..1 suave
const passo = (v, alt = 1) => [-.45 * pos(v) * alt, .9 * pos(v) * alt, 0]; // levanta o joelho quando v > 0
const ROBO = { A: [-.2, .1, -1.57, 0, 1.57, 'faca'], C: [-.1, 1.4, -1.57, 0, 1.57, 'faca'], B: [-1.57, .1, 0, 0, 1.57, 'faca'] };
const POSES = {
  festa: u => ({ esq: lerpQ(Q.festaB, Q.festa, onda(u, 6)), dir: lerpQ(Q.festaB, Q.festa, onda(u, 6, Math.PI)), pulo: abs(sen(u * 5)) * .06, pernaE: passo(sen(u * 6), .8), pernaD: passo(-sen(u * 6), .8) }),
  samba: u => ({ esq: lerpQ(Q.sambaB, Q.sambaA, onda(u, 9)), dir: lerpQ(Q.sambaB, Q.sambaA, onda(u, 9, Math.PI)), giro: sen(u * 9) * .25, pulo: abs(sen(u * 9)) * .05, inclina: sen(u * 4.5) * .06, pernaE: passo(sen(u * 9), .7), pernaD: passo(-sen(u * 9), .7) }),
  robo: u => {
    const q = Math.floor(u * 2.5) % 4, { A, B, C } = ROBO;
    return { esq: [A, C, B, A][q], dir: [B, C, A, A][q], giro: [0, .4, 0, -.4][q], pernaE: [[0, 0, 0], [-.6, .9, 0], [0, 0, 0], [0, 0, .2]][q], pernaD: [[0, 0, .2], [0, 0, 0], [-.6, .9, 0], [0, 0, 0]][q] };
  },
  passinho: u => ({ esq: lerpQ(Q.passB, Q.passA, abs(sen(u * 7))), dir: lerpQ(Q.passB, Q.passA, abs(sen(u * 7 + 1.5))), inclina: sen(u * 7) * .12, pulo: abs(sen(u * 7)) * .07, pernaE: [-.7 * pos(sen(u * 7)), .3 * pos(sen(u * 7)), .1 + pos(sen(u * 7)) * .3], pernaD: [-.7 * pos(-sen(u * 7)), .3 * pos(-sen(u * 7)), .1 + pos(-sen(u * 7)) * .3] }),
  disco: u => { const c = sen(u * 4) > -.55; return { esq: [-.4, .3, -1.4, 0, 0, 'punho'], dir: c ? Q.disco : Q.discoB, inclina: c ? -.12 : .12, pulo: abs(sen(u * 8)) * .03, pernaE: c ? [0, 0, .3] : [-.3, .6, 0], pernaD: c ? [-.3, .6, 0] : [0, 0, .3] }; },
  carnaval: u => { const w = sen(u * 10) * .18; return { esq: lerpQ(Q.carnaval, [-2.08, 1.12 + w, -.3, -.71, -.84, 'aberta'], 1), dir: [-2.08, 1.12 - w, -.3, -.71, -.84, 'aberta'], pulo: abs(sen(u * 6)) * .16, giro: sen(u * 3) * .3, pernaE: passo(abs(sen(u * 6)), .8), pernaD: passo(abs(sen(u * 6)), .8) }; },
  folhear: u => ({ esq: Q.folE, dir: lerpQ(Q.folA, Q.folB, onda(u, 5)), cabeca: .45, folha: true }),
  joinha: u => ({ dir: lerpQ(Q.joinha, [-.64, .69, -1.03, -.58, .84, 'joinha', .1], onda(u, 6)), esq: REP, cabeca: -.08 }),
  coracao: u => ({ esq: Q.coracao, dir: Q.coracao, coracoes: true, cabeca: -.1, inclina: sen(u * 3) * .05 }),
  continencia: u => ({ dir: Q.continencia, esq: [-.1, .05, -.05, 0, 0, 'reta'], cabecaZ: .08 }),
  facepalm: u => ({ dir: Q.facepalm, esq: REP, cabeca: .45, cabecaZ: .25 }),
  micdrop: u => (u < 1.2 ? { dir: Q.mic1, esq: REP } : { dir: Q.mic2, esq: REP, cabeca: -.15 }),
  aceno: u => ({ dir: [-2.42, .59 + sen(u * 12) * .18, -.19 - pos(sen(u * 12)) * .3, -.69, -.68 + sen(u * 12) * .25, 'aberta'], esq: REP }),
  apontar: u => ({ dir: [-1.57, -.15 + sen(u * 10) * .05, 0, 0, 0, 'aponta'], esq: REP, inclina: .05 }),
  // jornalista apresentando o telão: braço direito estendido para cima/para fora (ela fica de 3/4 para o telão)
  apontarTelao: u => ({ dir: [-2.1 + sen(u * 2.2) * .03, .75, -.05, 0, 0, 'aponta', .25], esq: REP, inclina: -.04, sorriso: .6 }),
  // "Chora mais": aponta para o adversário e gargalha, jogando a cabeça para trás
  gargalhada: u => ({ dir: [-1.57, -.15 + sen(u * 10) * .05, 0, 0, 0, 'aponta'], esq: REP, riso: true, cabeca: -.22 + abs(sen(u * 9.5)) * .1, inclina: .05 + sen(u * 4.7) * .04, pulo: abs(sen(u * 9.5)) * .02 }),
  // "Tá na hora": dá batidinhas com o indicador no pulso (levanta e encosta), sem esfregar
  relogio: u => { const v = (u * 2) % 1, k = v < .5 ? sen(v / .5 * Math.PI) : 0; return { esq: Q.relE, dir: lerpQ(Q.relD, [-1.62, -.43, -1.4, -1.6, -.75, 'aponta', .15], k), cabeca: .25, sorriso: .5 }; },
  bocejo: u => { // espreguiça de olhos fechados com a boca bem aberta; no fim cobre a boca com a mão
    const v = u % 3.2, abre = Math.min(1, v / .6), cobre = v > 1.7;
    return { esq: Q.bocejoE, dir: cobre ? Q.bocejoD : Q.bocejoE, cabeca: cobre ? -.15 : -.32, inclina: sen(u * 2) * .05, olhosFechados: true, boca: cobre ? Math.max(0, 1 - (v - 1.7) * 1.2) : abre };
  },
  pipoca: u => { const k = onda(u, 4); return { esq: Q.pipE, dir: lerpQ(Q.pipBaixo, Q.pipBoca, k), cabeca: k * .28, pipoca: 1 + k, boca: k > .8 ? (k - .8) * 2 : 0 }; },
};
// sorriso largo nas danças e nos emotes alegres
for (const [k, s] of Object.entries({ festa: 1, samba: 1, robo: .6, passinho: 1, disco: 1, carnaval: 1, joinha: .8, coracao: .8, aceno: .9, micdrop: .6 })) {
  const f = POSES[k]; POSES[k] = u => ({ sorriso: s, ...f(u) });
}
export const ANIMACOES = Object.keys(POSES);
/** Poses vindas de outros módulos (ex.: public/js/acoes/): fn(u) devolve o mesmo formato das POSES acima. */
export function registrarPose(nome, fn, sorriso = 0) { POSES[nome] = sorriso ? u => ({ sorriso, ...fn(u) }) : fn; }
/** Fórmulas-chave dos braços (Q) e repouso (REP), para quem cria poses fora deste arquivo. */
export const POSE_Q = Q;

// ---------- retratos (imagem 2D do rosto para a interface) ----------
let rRenderer = null, rScene = null, rCam = null;
const retratoCache = new Map();
export function retrato(cfg, fundo = null) {
  const k = JSON.stringify(cfg) + fundo;
  if (retratoCache.has(k)) return retratoCache.get(k);
  if (!rRenderer) {
    rRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    rRenderer.setSize(256, 256, false); rRenderer.outputColorSpace = THREE.SRGBColorSpace; rRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    rScene = new THREE.Scene();
    rScene.add(new THREE.HemisphereLight('#ffffff', '#5a4a80', 1.6));
    const d = new THREE.DirectionalLight('#ffffff', 2.2); d.position.set(1.5, 3, 4); rScene.add(d);
    const d2 = new THREE.DirectionalLight('#8fb3ff', 1.2); d2.position.set(-3, 1, 1); rScene.add(d2);
    rCam = new THREE.PerspectiveCamera(24, 1, .1, 20);
  }
  const av = new Avatar(cfg); rScene.add(av.root);
  av.root.updateMatrixWorld(true);
  const alto = cfg.chapeu === 'chapeu' || cfg.cabelo === 'afro';
  rCam.position.set(.32, 2.04 + (alto ? .06 : 0), 2.0); rCam.lookAt(0, 1.97 + (alto ? .06 : 0), 0);
  rScene.background = fundo ? new THREE.Color(fundo) : null;
  rRenderer.render(rScene, rCam);
  const url = rRenderer.domElement.toDataURL('image/png');
  rScene.remove(av.root);
  retratoCache.set(k, url);
  return url;
}
