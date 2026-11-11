// Objetos 3D das ações (cadeira de metal de bar, pedaço de pau, tomate, buquê de flores, torta, balde)
// e efeitos (voo do arremesso, respingos, pétalas, chantilly, água, estrelinhas, "POW!").
// Efeito = { update(dt, t) → bool (true = continua), limpar() }. Geometrias/materiais em cache (compartilhados);
// só os materiais que precisam desbotar são clonados por efeito (e descartados no limpar).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), PI = Math.PI, rnd = (a, b) => a + Math.random() * (b - a);
const geos = new Map(), mats = new Map();
const G = (k, fn) => { if (!geos.has(k)) geos.set(k, fn()); return geos.get(k); };
const rbox = (w, h, d, r = .02) => G(`b${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)));
const esf = (r, s = 12) => G(`e${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s * .7 | 0)));
const cil = (a, b, h, s = 12, aberto = false) => G(`c${a},${b},${h},${s},${aberto}`, () => new THREE.CylinderGeometry(a, b, h, s, 1, aberto));
const M = (cor, o = {}) => {
  const k = cor + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: cor, roughness: o.r ?? .6, metalness: o.m ?? 0, transparent: o.op !== undefined, opacity: o.op ?? 1, emissive: o.em ?? '#000000', emissiveIntensity: o.ei ?? 1, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, flatShading: !!o.fs, depthWrite: o.dw ?? true }));
  return mats.get(k);
};
const m = (g, mt, x = 0, y = 0, z = 0, pai) => { const me = new THREE.Mesh(g, mt); me.position.set(x, y, z); me.castShadow = true; if (pai) pai.add(me); return me; };
const Y = V(0, 1, 0);
/** tubo cilíndrico de a até b (geometria unitária em cache, escalada). */
const tubo = (a, b, r, mt, pai) => { const d = b.clone().sub(a), me = m(cil(1, 1, 1, 10), mt, 0, 0, 0, pai); me.scale.set(r, d.length(), r); me.position.copy(a).addScaledVector(d, .5); me.quaternion.setFromUnitVectors(Y, d.normalize()); return me; };
const forma = (k, fn) => G(k, () => { const s = new THREE.Shape(); fn(s); return new THREE.ShapeGeometry(s, 6); });
const geoCoracao = () => forma('coracao', s => { s.moveTo(0, -.5); s.bezierCurveTo(-.15, -.3, -.55, -.1, -.5, .2); s.bezierCurveTo(-.45, .5, -.08, .55, 0, .28); s.bezierCurveTo(.08, .55, .45, .5, .5, .2); s.bezierCurveTo(.55, -.1, .15, -.3, 0, -.5); });
const geoEstrela = () => forma('estrela', s => { for (let i = 0; i <= 10; i++) { const a = PI / 2 + i * PI / 5, r = i % 2 ? .22 : .5; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } });

// ===== MATERIAIS =====
const MT = {
  aluminio: () => M('#d6dbe2', { r: .28, m: .85 }), aluEsc: () => M('#9aa3ad', { r: .35, m: .8 }), borracha: () => M('#1f2328', { r: .8 }),
  casca: () => M('#6b4426', { r: .95, fs: true }), cascaEsc: () => M('#4a2e18', { r: 1, fs: true }), madeira: () => M('#d8b07a', { r: .85 }),
  tomate: () => M('#e3261c', { r: .28, em: '#3a0000', ei: .6 }), verde: () => M('#2f8a2f', { r: .6 }), verdeEsc: () => M('#1f6b24', { r: .7 }),
  creme: () => M('#fffaf0', { r: .55, em: '#2a2620', ei: .5 }), massa: () => M('#d99a4e', { r: .8 }), morango: () => M('#e01e37', { r: .3, em: '#300', ei: .5 }),
  zinco: () => M('#b3bac2', { r: .35, m: .75 }), agua: () => M('#4fb3ff', { r: .05, m: .1, op: .62, em: '#0a3d6b', ei: .6 }), gelo: () => M('#dff4ff', { r: .05, op: .72, em: '#5d8db0', ei: .35 }),
};

// ===== MODELOS =====
function cadeira() {
  // montada em pé (pés em y=0, assento para +Z) e depois virada: a pegada é o topo do encosto e o resto segue em +Y
  const g = new THREE.Group(), c = new THREE.Group(), al = MT.aluminio(), ae = MT.aluEsc(), bo = MT.borracha(); g.add(c);
  for (const s of [-1, 1]) {
    const x = s * .2;
    tubo(V(x, 0, -.2), V(x * .97, .86, -.25), .014, al, c);          // pé traseiro que vira montante do encosto
    tubo(V(x, 0, .2), V(x * .97, .46, -.02), .014, al, c);            // pé dianteiro (dobradiça em X com o traseiro)
    tubo(V(x * .98, .44, .19), V(x * .98, .44, -.21), .011, ae, c);   // trilho do assento
    m(cil(.018, .018, .03, 8), bo, x, .015, -.2, c); m(cil(.018, .018, .03, 8), bo, x, .015, .2, c); // ponteiras
    m(esf(.017, 8), ae, x * .99, .25, -.215, c);                      // rebite da dobradiça
  }
  tubo(V(-.2, .12, .2), V(.2, .12, .2), .009, ae, c); tubo(V(-.2, .12, -.2), V(.2, .12, -.2), .009, ae, c); // travessas
  const ass = m(rbox(.43, .035, .41, .03), al, 0, .47, .0, c);                // assento
  for (let i = -2; i <= 2; i++) m(rbox(.38, .006, .018, .003), ae, 0, .489, i * .07, c); // frisos do assento
  const enc = m(rbox(.41, .16, .025, .02), al, 0, .76, -.235, c); enc.rotation.x = -.06; // encosto
  m(rbox(.2, .03, .028, .012), ae, 0, .76, -.235, c);                         // furo/pegador do encosto (sugestão)
  m(cil(.012, .012, .42, 8), al, 0, .86, -.25, c).rotation.z = PI / 2;          // barra do topo
  c.rotation.x = PI; c.position.set(0, .86, -.25); // topo do encosto → origem; cadeira estende para +Y; costas do encosto para +Z
  ass.userData.parte = 'assento'; return g;
}
function pau() {
  const g = new THREE.Group(), ca = MT.casca(), ce = MT.cascaEsc(), md = MT.madeira();
  const a = m(cil(.034, .04, .5, 7), ca, 0, .12, 0, g);                      // trecho de baixo
  const b = m(cil(.028, .034, .42, 7), ca, .012, .57, 0, g); b.rotation.z = -.05; // trecho de cima, levemente torto
  m(cil(.035, .035, .006, 7), md, 0, -.133, 0, g);                             // ponta serrada (madeira clara)
  m(cil(.028, .028, .006, 7), md, .022, .785, 0, g);
  m(esf(.016, 6), md, .024, .787, 0, g).scale.set(1, .2, 1);                   // anéis no topo
  [[.034, .3, .01, 1], [-.03, .46, .015, 1.2], [.01, .66, -.03, .9], [-.02, .08, -.03, .8]].forEach(([x, y, z, s]) => m(esf(.016 * s, 6), ce, x, y, z, g).scale.set(1, 1.3, .7)); // nós
  const gal = m(cil(.008, .014, .09, 6), ca, .05, .4, 0, g); gal.rotation.z = -.9;  // toco de galho
  m(cil(.009, .009, .004, 6), md, .087, .427, 0, g).rotation.z = -.9;
  for (let i = 0; i < 5; i++) { const t = m(rbox(.012, .12, .006, .003), ce, Math.cos(i * 1.3) * .035, .05 + i * .14, Math.sin(i * 1.3) * .035, g); t.rotation.y = -i * 1.3; } // listras da casca
  a.userData.parte = 'cabo'; return g;
}
function tomate() {
  const g = new THREE.Group();
  const t = m(esf(.058, 14), MT.tomate(), 0, 0, 0, g); t.scale.set(1, .86, 1);
  for (let i = 0; i < 5; i++) { const s = m(rbox(.016, .004, .04, .002), MT.verde(), 0, .05, 0, g); s.rotation.y = i * PI * .4; s.translateZ(.018); s.rotation.x = .25; }
  m(cil(.005, .007, .03, 6), MT.verdeEsc(), 0, .065, 0, g);
  m(esf(.012, 6), M('#ffffff', { op: .35, r: .1 }), -.025, .022, .04, g).scale.set(1, .7, .4); // brilho
  return g;
}
function flor(tipo, cor, g, x, y, z, rx, rz) {
  const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.set(rx, 0, rz); g.add(f);
  if (tipo === 'rosa') {
    const mt = M(cor, { r: .5 });
    m(esf(.04, 10), mt, 0, .02, 0, f).scale.set(1, .85, 1);
    for (let i = 0; i < 5; i++) { const p = m(esf(.03, 8), mt, 0, .015, 0, f); p.rotation.y = i * 1.26; p.translateZ(.028); p.scale.set(1, .9, .45); p.rotation.x = -.35; }
    m(G('toroRosa', () => new THREE.TorusGeometry(.017, .007, 6, 12)), M(tom(cor), { r: .5 }), 0, .053, 0, f).rotation.x = PI / 2;
  } else {
    const pet = M(cor, { r: .6 });
    for (let i = 0; i < 9; i++) { const p = m(esf(.022, 6), pet, 0, .01, 0, f); p.rotation.y = i * PI * 2 / 9; p.translateZ(.033); p.scale.set(.55, .25, 1.15); }
    m(esf(.02, 8), M('#f5c518', { r: .7 }), 0, .016, 0, f).scale.set(1, .55, 1);
  }
  return f;
}
const tom = c => '#' + new THREE.Color(c).multiplyScalar(.7).getHexString();
function flores() {
  const g = new THREE.Group(), v = MT.verde();
  for (let i = 0; i < 7; i++) { const a = i * .9, r = .02; tubo(V(Math.cos(a) * .006, -.16, Math.sin(a) * .006), V(Math.cos(a) * r * 3, .34, Math.sin(a) * r * 3), .006, v, g); } // caules
  const pap = m(G('papel', () => new THREE.ConeGeometry(.19, .4, 14, 1, true)), M('#f7c8d8', { r: .8, ds: true }), 0, .17, 0, g); pap.rotation.x = PI; // papel em cone
  const pap2 = m(G('papel2', () => new THREE.ConeGeometry(.13, .34, 5, 1, true)), M('#fff4e6', { r: .85, ds: true, fs: true }), 0, .2, .02, g); pap2.rotation.set(PI, .4, 0); // segunda folha (kraft claro)
  m(G('laco', () => new THREE.TorusGeometry(.03, .012, 6, 14)), M('#d11d4a', { r: .4 }), 0, -.02, 0, g).rotation.x = PI / 2; // laço
  for (const s of [-1, 1]) {
    const l = m(G('alca', () => new THREE.TorusGeometry(.032, .01, 6, 12)), M('#d11d4a', { r: .4 }), s * .045, -.01, .035, g); l.rotation.set(0, 0, s * .4); l.scale.set(1, .6, 1);
    const fit = m(rbox(.022, .1, .006, .003), M('#d11d4a', { r: .4 }), s * .02, -.08, .04, g); fit.rotation.z = s * .3;
  }
  const lista = [['rosa', '#e8203c', 0, .4, 0], ['rosa', '#ff5c9a', .08, .37, .04], ['marg', '#ffffff', -.08, .37, .05], ['rosa', '#ff8c1a', -.06, .38, -.07], ['marg', '#c58cff', .07, .37, -.07], ['marg', '#ffe14d', .0, .36, .1], ['rosa', '#ff3d6e', -.11, .33, -.01], ['marg', '#ffffff', .12, .33, .0]];
  lista.forEach(([t, c, x, y, z]) => flor(t, c, g, x * 1.25, y + .06, z * 1.25, z * 4, -x * 4).scale.setScalar(1.35));
  for (const [x, z] of [[.1, .08], [-.12, .07], [.02, -.12], [-.03, .13]]) { const f = m(esf(.03, 6), MT.verdeEsc(), x * 1.3, .37, z * 1.3, g); f.scale.set(.6, .22, 1.6); f.rotation.y = Math.atan2(x, z); f.rotation.x = .4; } // folhas
  return g;
}
const geoPrato = () => cil(.17, .135, .03, 24);
function torta() {
  // montada deitada (creme para +Y) e virada para o creme ficar em +Z; origem = fundo do prato (apoio da mão)
  const g = new THREE.Group(), t = new THREE.Group(); g.add(t);
  m(geoPrato(), MT.aluminio(), 0, .015, 0, t);
  m(G('borda', () => new THREE.TorusGeometry(.168, .008, 6, 28)), MT.aluEsc(), 0, .03, 0, t).rotation.x = PI / 2;
  m(cil(.155, .145, .035, 24), MT.massa(), 0, .045, 0, t);
  const cr = m(esf(.15, 18), MT.creme(), 0, .06, 0, t); cr.scale.set(1, .36, 1);
  for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, d = m(G('bico', () => new THREE.ConeGeometry(.026, .05, 8)), MT.creme(), Math.cos(a) * .12, .09, Math.sin(a) * .12, t); m(esf(.024, 8), MT.creme(), 0, -.012, 0, d); }
  const mo = m(G('morango', () => new THREE.ConeGeometry(.032, .06, 10)), MT.morango(), 0, .14, 0, t); mo.rotation.x = PI; mo.scale.set(1, 1, .9);
  m(esf(.032, 10), MT.morango(), 0, .125, 0, t).scale.set(1, .5, .9);
  for (let i = 0; i < 4; i++) { const f = m(rbox(.012, .004, .03, .002), MT.verde(), 0, .17, 0, t); f.rotation.y = i * PI / 2; f.translateZ(.012); }
  t.rotation.x = PI / 2; // creme olhando +Z
  return g;
}
function balde() {
  // origem = meio da alça (pegada); o balde fica pendurado para -Y; a boca do balde aponta +Y
  const g = new THREE.Group(), z = MT.zinco(), b = new THREE.Group(); b.position.y = -.2; g.add(b);
  m(cil(.15, .12, .3, 22, true), M('#b3bac2', { r: .35, m: .75, ds: true }), 0, -.15, 0, b);
  m(cil(.12, .12, .01, 22), z, 0, -.3, 0, b);
  for (const [y, r] of [[0, .152], [-.07, .143], [-.2, .13]]) m(G('aro' + r, () => new THREE.TorusGeometry(r, .008, 6, 28)), MT.aluEsc(), 0, y, 0, b).rotation.x = PI / 2;
  m(cil(.146, .146, .006, 22), MT.agua(), 0, -.035, 0, b);                     // água
  [[.05, .02, .03, .4], [-.06, -.03, .02, 1.1], [.0, .07, .04, 2], [-.02, -.08, .02, .7]].forEach(([x, zz, dy, r]) => { const c = m(rbox(.05, .045, .05, .01), MT.gelo(), x, -.03 + dy * .3, zz, b); c.rotation.set(r, r * 2, r * .5); }); // gelo
  const al = m(G('alcaBalde', () => new THREE.TorusGeometry(.155, .006, 6, 18, PI)), MT.aluEsc(), 0, -.2 + 0, 0, g); al.scale.set(1, 1.3, 1);
  for (const s of [-1, 1]) m(cil(.016, .016, .02, 8), z, s * .153, -.2, 0, g).rotation.z = PI / 2; // orelhas da alça
  m(cil(.018, .018, .07, 8), M('#2b2f36', { r: .7 }), 0, 0, 0, g).rotation.z = PI / 2; // pegador da alça
  return g;
}
const FAB = { cadeirada: cadeira, paulada: pau, tomate, flores, torta, balde };

/** Objeto para a mão. Origem = ponto da pegada; comprimento ao longo de +Y; lado que bate para +Z. */
export function criarProp(item) { const id = item?.id ?? item, g = (FAB[id] || (() => new THREE.Group()))(); g.userData.item = id; g.name = 'prop-' + id; return g; }

/** Encaixe sugerido na mão do avatar (coords locais de avatar.bracos[k].userData.mao; a mão aponta para -Y e
 *  os dedos fecham em volta do eixo Z). 'dir' = braço com lado -1. A coreografia pode ajustar. */
export const PEGADA = {
  cadeirada: { pos: [.03, -.09, 0], rot: [PI / 2, 0, 0], mao: 'dir' },  // segura o topo do encosto; a cadeira sai pela frente da mão
  paulada: { pos: [.03, -.09, 0], rot: [PI / 2, 0, 0], mao: 'dir' },    // punho fechado no cabo; pau sai pela frente
  tomate: { pos: [.07, -.11, .01], rot: [0, 0, 0], mao: 'dir' },        // na palma
  flores: { pos: [.03, -.09, 0], rot: [PI / 2, 0, 0], mao: 'dir' },     // segura os caules abaixo do laço
  torta: { pos: [.06, -.1, 0], rot: [0, 0, -PI / 2], mao: 'ambas' },    // prato apoiado na palma, creme para fora da palma
  balde: { pos: [.03, -.09, 0], rot: [0, 0, PI / 2], mao: 'ambas' },    // pegador da alça no punho; balde pendurado
};

// ===== EFEITOS =====
const camQ = new THREE.Quaternion(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = V(), _v = V();
const camQuat = est => (est.camera.getWorldQuaternion(camQ), camQ);
/** Partículas num InstancedMesh. gerar(i) → { pos, vel, esc, vida, atraso?, cor?, giro?, rot? }. */
function particulas(est, geo, mat, n, gerar, o = {}) {
  const { grav = -9, arrasto = 0, chao = 0, quique = 0, billboard = false, oscila = 0, fadeMat = false } = o;
  const mt = fadeMat ? mat.clone() : mat, mesh = new THREE.InstancedMesh(geo, mt, n); mesh.frustumCulled = false; mesh.castShadow = false;
  const ps = [];
  for (let i = 0; i < n; i++) {
    const p = { idade: 0, atraso: 0, giro: V(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)), rot: V(rnd(0, 6), rnd(0, 6), rnd(0, 6)), fase: rnd(0, 6), parado: false, ...gerar(i) };
    if (p.cor) mesh.setColorAt(i, new THREE.Color(p.cor)); ps.push(p);
  }
  est.scene.add(mesh); let tt = 0;
  return {
    mesh,
    update(dt) {
      tt += dt; let vivo = false; const cq = billboard ? camQuat(est) : null;
      ps.forEach((p, i) => {
        p.idade += dt; const u = p.idade - p.atraso;
        if (u < 0 || u > p.vida) { _m.makeScale(0, 0, 0); mesh.setMatrixAt(i, _m); if (u < 0) vivo = true; return; }
        vivo = true; if (!p.nasceu) { p.nasceu = true; o.nascer?.(p); }
        if (!p.parado) {
          p.vel.y += grav * dt; if (arrasto) p.vel.multiplyScalar(Math.max(0, 1 - arrasto * dt));
          p.pos.addScaledVector(p.vel, dt); if (oscila) p.pos.x += Math.sin(u * 3 + p.fase) * oscila * dt, p.pos.z += Math.cos(u * 2.6 + p.fase) * oscila * dt;
          p.rot.addScaledVector(p.giro, dt);
          if (p.pos.y < chao + (p.raio ?? 0)) {
            p.pos.y = chao + (p.raio ?? 0);
            if (quique && Math.abs(p.vel.y) > .6) { p.vel.y *= -quique; p.vel.x *= .6; p.vel.z *= .6; p.giro.multiplyScalar(.5); }
            else { p.parado = true; p.rot.x = p.deitado ? 0 : p.rot.x; p.rot.z = p.deitado ? 0 : p.rot.z; }
          }
        }
        const k = u / p.vida, f = (k < .08 ? k / .08 : 1) * (k > .7 ? 1 - (k - .7) / .3 : 1);
        if (billboard) { _q.copy(cq); _q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), p.rot.z * .2)); } else _q.setFromEuler(_e.set(p.rot.x, p.rot.y, p.rot.z));
        const e = p.esc; _s.set(e.x ?? e, e.y ?? e, e.z ?? e).multiplyScalar(f);
        mesh.setMatrixAt(i, _m.compose(p.pos, _q, _s));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (fadeMat) mt.opacity = (o.opacidade ?? 1) * Math.min(1, Math.max(0, (o.dur ?? 3) - tt) / .8);
      return vivo;
    },
    limpar() { mesh.removeFromParent(); mesh.dispose(); if (fadeMat) mt.dispose(); },
  };
}
const juntar = lista => ({ update: (dt, t) => lista.reduce((v, f) => f.update(dt, t) || v, false), limpar: () => lista.forEach(f => f.limpar()) });
const cabecaDe = p => p?.avatar?.cabeca;
/** posição do rosto do alvo (mundo) e a direção para onde ele olha. */
function rosto(p) {
  const c = cabecaDe(p); if (!c) return { pos: p?.ator?.getWorldPosition(V()).setY(1.6) ?? V(0, 1.6, 0), frente: V(0, 0, 1) };
  c.updateWorldMatrix(true, false);
  return { pos: c.localToWorld(V(0, .3, .25)), topo: c.localToWorld(V(0, .62, 0)), centro: c.localToWorld(V(0, .3, 0)), frente: V(0, 0, 1).transformDirection(c.matrixWorld) };
}
const dirAleat = (frente, abre = 1, cima = .5) => V(rnd(-1, 1), rnd(-.2, 1) * cima, rnd(-1, 1)).multiplyScalar(abre).add(frente).normalize();

/** Sujeira presa no rosto (tomate / chantilly): blobs filhos da cabeça que escorrem e desbotam (~5 s). */
function sujeiraNoRosto(p, cor, blobs, dur = 5) {
  const c = cabecaDe(p); if (!c) return null;
  const mt = M(cor, { r: .4, em: cor === '#fffaf0' ? '#2a2620' : '#3a0000', ei: .5 }).clone(); mt.transparent = true;
  const g = new THREE.Group(); c.add(g); const lista = [];
  blobs.forEach(([x, y, z, r, sx = 1, sy = 1, sz = .35, cai = 0]) => { const b = m(esf(r, 10), mt, x, y, z, g); b.scale.set(sx, sy, sz); b.castShadow = false; lista.push({ b, y0: y, cai, sy }); });
  let t = 0;
  return {
    update(dt) {
      t += dt; const k = Math.min(1, t / .18);
      g.scale.setScalar(.6 + .4 * k);
      lista.forEach(o => { if (o.cai) { o.b.position.y = o.y0 - Math.min(o.cai, t * .03 * (1 + o.cai * 4)); o.b.scale.y = o.sy * (1 + Math.min(1.2, t * .25)); } });
      mt.opacity = t < dur - 1.5 ? 1 : Math.max(0, (dur - t) / 1.5); if (t > dur - 1.5) g.scale.setScalar(.85 + .15 * mt.opacity);
      return t < dur;
    },
    limpar() { g.removeFromParent(); mt.dispose(); },
  };
}

/** Estrelinhas amarelas girando em volta da cabeça. */
function estrelinhas(est, p, n = 5, dur = 1.8) {
  const c = cabecaDe(p), mt = M('#ffd21f', { r: .4, em: '#ffb800', ei: .9, ds: true }).clone(); mt.transparent = true;
  const mesh = new THREE.InstancedMesh(geoEstrela(), mt, n); mesh.frustumCulled = false; est.scene.add(mesh); let t = 0;
  return {
    update(dt) {
      t += dt; const r = rosto(p), ctr = r.topo ?? r.pos.clone().add(V(0, .3, 0)), cq = camQuat(est);
      for (let i = 0; i < n; i++) {
        const a = t * 4.5 + i * PI * 2 / n, s = .11 * Math.min(1, t * 5) * Math.min(1, (dur - t) / .4);
        _v.set(Math.cos(a) * .36, Math.sin(a * 2) * .04 + .04, Math.sin(a) * .36).add(ctr);
        _q.copy(cq).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), t * 6 + i));
        mesh.setMatrixAt(i, _m.compose(_v, _q, _s.setScalar(Math.max(0, s))));
      }
      mesh.instanceMatrix.needsUpdate = true; return t < dur;
    },
    limpar() { mesh.removeFromParent(); mesh.dispose(); mt.dispose(); },
  };
}

/** Balão de quadrinho ("POW!", "CRASH!") em sprite de canvas. */
const texBalao = palavra => G('tx' + palavra, () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  x.translate(128, 128); x.beginPath();
  for (let i = 0; i <= 28; i++) { const a = i / 28 * PI * 2, r = i % 2 ? 78 : 122 - (i % 4) * 6; x[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r * .8); }
  x.closePath(); x.fillStyle = '#ffe11a'; x.fill(); x.lineWidth = 8; x.strokeStyle = '#1a1a1a'; x.stroke();
  x.rotate(-.12); x.font = `900 ${palavra.length > 4 ? 52 : 66}px Impact, "Arial Black", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 10; x.strokeStyle = '#1a1a1a'; x.strokeText(palavra, 0, 4); x.fillStyle = '#e8182c'; x.fillText(palavra, 0, 4);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
});
function balao(est, pos, palavra, dur = 1.1) {
  const mt = new THREE.SpriteMaterial({ map: texBalao(palavra), transparent: true, depthTest: false }), sp = new THREE.Sprite(mt);
  sp.position.copy(pos); sp.renderOrder = 999; est.scene.add(sp); let t = 0;
  return {
    update(dt) { t += dt; const k = Math.min(1, t / .12), s = .75 * (k < 1 ? k * 1.25 : 1 + Math.sin(t * 30) * .02 * Math.max(0, 1 - t)); sp.scale.set(s, s, 1); sp.position.y = pos.y + t * .08; mt.opacity = Math.min(1, (dur - t) / .25); return t < dur; },
    limpar() { sp.removeFromParent(); mt.dispose(); },
  };
}

// ---------- voo (arremesso) ----------
/** Objeto voando em arco parabólico girando de `de` até `ate` em `dur` s. Some ao chegar (as flores soltam pétalas no caminho). */
export function lancar(est, item, de, ate, dur = .7) {
  const id = item?.id ?? item, obj = criarProp(id), dist = de.distanceTo(ate), h = .35 + dist * .18, giro = id === 'flores' ? 5 : id === 'tomate' ? 9 : 7;
  obj.position.copy(de); est.scene.add(obj); let t = 0;
  const extra = [];
  if (id === 'flores') extra.push(particulas(est, esf(.02, 6), M('#ffffff', { r: .6 }), 18, i => ({ atraso: i / 18 * dur, pos: V(), vel: V(rnd(-.3, .3), rnd(0, .3), rnd(-.3, .3)), esc: V(1, .25, 1.4), vida: 1.6, cor: CORES_PET[i % CORES_PET.length] }), { grav: -1.2, arrasto: 2, oscila: .4, nascer: p => p.pos.copy(obj.position) }));
  return {
    update(dt) {
      t += dt; const u = Math.min(1, t / dur);
      if (obj.parent) {
        obj.position.lerpVectors(de, ate, u); obj.position.y += Math.sin(u * PI) * h;
        obj.rotation.set(-u * giro, u * giro * .3, 0);
        if (u >= 1) obj.removeFromParent();
      }
      const vivo = extra.reduce((v, f) => f.update(dt) || v, false);
      return obj.parent ? true : vivo;
    },
    limpar() { obj.removeFromParent(); extra.forEach(f => f.limpar()); },
  };
}
const CORES_PET = ['#e8203c', '#ff5c9a', '#ffffff', '#ff8c1a', '#c58cff', '#ffe14d', '#ff3d6e'];

// ---------- impacto ----------
/** Efeito no alvo no momento do golpe. p = púlpito do alvo (usa p.avatar.cabeca). */
export function impacto(est, item, p) {
  const id = item?.id ?? item, r = rosto(p), F = r.frente, lista = [];
  const add = f => f && lista.push(f);
  if (id === 'tomate') {
    add(particulas(est, esf(.03, 6), M('#ffffff', { r: .35 }), 26, i => ({ pos: r.pos.clone().addScaledVector(F, .03), vel: dirAleat(F, 1.4, 1.2).multiplyScalar(rnd(1.2, 3.2)), esc: V(rnd(.6, 1.4), rnd(.4, .8), rnd(.6, 1.4)), vida: rnd(1.6, 2.6), cor: i % 7 === 0 ? '#e9d36a' : i % 3 ? '#e3261c' : '#a8120c', raio: .01, deitado: true }), { grav: -9.5 }));
    add(sujeiraNoRosto(p, '#d81e14', [[0, .28, .27, .12, 1.2, 1, .25], [.09, .36, .255, .07, 1, .8], [-.1, .2, .255, .065, 1, 1.1], [-.06, .38, .26, .05], [.07, .16, .25, .045, 1, 1, .35, .15], [-.13, .3, .245, .04, 1, 1, .35, .2], [.02, .2, .3, .04, 1, 1.4, .4, .12], [0, .26, .3, .06, 1, 1, .6]]));
  } else if (id === 'flores') {
    add(particulas(est, esf(.022, 6), M('#ffffff', { r: .6 }), 60, i => ({ pos: r.pos.clone().add(V(rnd(-.1, .1), rnd(-.1, .1), rnd(-.1, .1))), vel: dirAleat(F, 2, 1.6).multiplyScalar(rnd(1, 2.6)).add(V(0, 1.2, 0)), esc: V(rnd(.8, 1.2), .22, rnd(1.1, 1.6)), vida: rnd(2.6, 3.6), cor: CORES_PET[i % CORES_PET.length], giro: V(rnd(-3, 3), rnd(-3, 3), rnd(-3, 3)) }), { grav: -1.4, arrasto: 2.2, oscila: .5 }));
    add(particulas(est, geoCoracao(), M('#ff4d88', { r: .4, em: '#ff2a6d', ei: .6, ds: true }), 12, i => ({ atraso: i * .12, pos: r.pos.clone().add(V(rnd(-.35, .35), rnd(-.1, .25), rnd(-.35, .35))), vel: V(rnd(-.1, .1), rnd(.5, .8), rnd(-.1, .1)), esc: rnd(.09, .16), vida: rnd(1.6, 2.2), cor: i % 3 ? '#ffffff' : '#ff9ec4', rot: V(0, 0, rnd(-2, 2)) }), { grav: 0, billboard: true, oscila: .25 }));
  } else if (id === 'torta') {
    add(sujeiraNoRosto(p, '#fffaf0', [[0, .29, .26, .2, 1.25, 1.2, .38], [-.14, .4, .25, .1, 1, .9], [.15, .38, .25, .1], [.13, .16, .26, .09, 1, 1, .4, .1], [-.12, .15, .26, .09, 1, 1, .4, .16], [0, .1, .27, .08, 1.3, 1, .4, .2], [.04, .28, .34, .08, 1, 1, .7], [-.07, .44, .3, .06], [.2, .27, .2, .07, .6], [-.21, .29, .2, .07, .6], [.08, .05, .25, .04, 1, 1.5, .5, .2], [-.04, .48, .26, .07]]));
    add(particulas(est, esf(.035, 7), MT.creme(), 22, () => ({ pos: r.pos.clone().addScaledVector(F, .08), vel: dirAleat(F.clone().negate().multiplyScalar(.2), 2, 1.3).multiplyScalar(rnd(1.2, 2.8)), esc: rnd(.5, 1.3), vida: rnd(1.4, 2.4), raio: .015, deitado: true }), { grav: -9 }));
    const prato = new THREE.Group(); m(geoPrato(), MT.aluminio(), 0, 0, 0, prato); m(G('borda', () => new THREE.TorusGeometry(.168, .008, 6, 28)), MT.aluEsc(), 0, .015, 0, prato).rotation.x = PI / 2;
    add(corpoRigido(est, prato, r.pos.clone().addScaledVector(F, .14), F.clone().multiplyScalar(.5).add(V(0, .3, 0)), V(PI / 2, 0, 0), V(rnd(-3, -1.5), rnd(-1, 1), rnd(-3, 3)), 2.6));
  } else if (id === 'balde') {
    const topo = r.topo ?? r.pos.clone().add(V(0, .35, 0));
    add(particulas(est, esf(.03, 7), MT.agua(), 70, i => ({ atraso: i * .006, pos: topo.clone().add(V(rnd(-.12, .12), rnd(.05, .25), rnd(-.12, .12))).addScaledVector(F, .1), vel: V(rnd(-1.6, 1.6), rnd(-.5, 1.2), rnd(-1.6, 1.6)).addScaledVector(F, .5), esc: V(rnd(.6, 1.3), rnd(1, 1.8), rnd(.6, 1.3)), vida: rnd(.9, 1.5), raio: .01 }), { grav: -9.8, fadeMat: true, opacidade: .62, dur: 1.8 }));
    add(particulas(est, esf(.016, 6), MT.agua(), 34, i => ({ atraso: .2 + i * .07, pos: (r.centro ?? r.pos).clone().add(V(rnd(-.26, .26), rnd(-.3, .1), rnd(-.24, .24))), vel: V(0, -.3, 0), esc: V(1, 1.6, 1), vida: 1.2, raio: .005 }), { grav: -6 }));
    add(particulas(est, rbox(.055, .05, .055, .01), MT.gelo(), 8, () => ({ pos: topo.clone().add(V(rnd(-.15, .15), rnd(0, .15), rnd(-.15, .15))), vel: V(rnd(-1.4, 1.4), rnd(.5, 1.6), rnd(-1.4, 1.4)).addScaledVector(F, .8), esc: 1, vida: 3.2, raio: .027, deitado: true }), { grav: -9.8, quique: .5 }));
  } else if (id === 'paulada') {
    add(particulas(est, rbox(.05, .012, .018, .004), MT.madeira(), 16, i => ({ pos: (r.topo ?? r.pos).clone(), vel: V(rnd(-1, 1), rnd(.4, 1.6), rnd(-1, 1)).normalize().multiplyScalar(rnd(1.5, 3)), esc: rnd(.6, 1.5), vida: rnd(1.2, 2), cor: i % 3 ? '#d8b07a' : '#6b4426', raio: .006, deitado: true }), { grav: -9 }));
    add(particulas(est, geoEstrela(), M('#ffe14d', { r: .4, em: '#ffc400', ei: 1, ds: true }), 8, () => ({ pos: (r.topo ?? r.pos).clone(), vel: V(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(1, 1.8)), esc: rnd(.08, .13), vida: .6 }), { grav: 0, arrasto: 4, billboard: true }));
    add(estrelinhas(est, p, 5, 1.8));
  } else if (id === 'cadeirada') {
    const ctr = (r.topo ?? r.pos).clone();
    add(particulas(est, rbox(.012, .012, .06, .004), M('#ffffff', { em: '#ffb020', ei: 1.4, r: .3 }), 28, i => { const v = V(rnd(-1, 1), rnd(-.2, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(2.5, 4.5)); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), v.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q); return { pos: ctr.clone(), vel: v, esc: rnd(.7, 1.3), vida: rnd(.3, .55), cor: i % 2 ? '#ffe680' : '#ffb347', rot: V(e.x, e.y, e.z), giro: V() }; }, { grav: -6 }));
    add(particulas(est, geoEstrela(), M('#ffe14d', { r: .4, em: '#ffc400', ei: 1, ds: true }), 10, () => ({ pos: ctr.clone(), vel: V(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(1.2, 2.2)), esc: rnd(.08, .14), vida: .7 }), { grav: 0, arrasto: 4, billboard: true }));
    add(estrelinhas(est, p, 6, 2));
    add(balao(est, ctr.clone().add(V(0, .45, 0)).addScaledVector(F, .2), Math.random() < .5 ? 'POW!' : 'CRASH!', 1.1));
  }
  return juntar(lista);
}

/** Um objeto sólido caindo com giro e quicando no chão (prato da torta). */
function corpoRigido(est, obj, pos, vel, rot, giro, dur) {
  obj.position.copy(pos); obj.rotation.set(rot.x, rot.y, rot.z); est.scene.add(obj); let t = 0, noChao = false;
  return {
    update(dt) {
      t += dt;
      if (!noChao) {
        vel.y -= 9.8 * dt; obj.position.addScaledVector(vel, dt); obj.rotation.x += giro.x * dt; obj.rotation.y += giro.y * dt; obj.rotation.z += giro.z * dt;
        if (obj.position.y < .02) { obj.position.y = .02; if (Math.abs(vel.y) > 1.2) { vel.y *= -.3; vel.x *= .5; vel.z *= .5; giro.multiplyScalar(.3); } else { noChao = true; obj.rotation.set(0, obj.rotation.y, 0); } }
      }
      if (t > dur - .4) obj.scale.setScalar(Math.max(0, (dur - t) / .4));
      return t < dur;
    },
    limpar() { obj.removeFromParent(); },
  };
}
